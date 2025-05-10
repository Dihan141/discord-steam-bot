const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require('discord.js');
const { searchGame } = require('../services/steamAPI');
const { saveGameForGuild } = require('../UtilityFunctions/saveGameForGuild');
const { createSession, isValidSession, clearSession } = require('../configs/sessionManager');

const COMMAND_NAME = 'addgame';

/**
 * Formats the game's price information.
 */
const getPrice = (game) => {
  if (game.is_free) return 'This game is free';
  if (game.price) {
    if (game.price.discount_percent > 0) {
      return `~~${game.price.initial_formatted}~~ ➜ **${game.price.final_formatted}**`;
    }
    return `${game.price.final_formatted}`;
  }
  return 'Price not available';
};

/**
 * Sends embed with a list of game options.
 */
async function sendGameSelectionEmbed(interaction, topGames, sessionId) {
  const embed = new EmbedBuilder()
    .setColor('#2f3136')
    .setTitle('🎮 Select a Game to Track')
    .setDescription('Choose a game from the list below to add to your tracked list.')
    .setFooter({ text: 'Powered by Steam API' });

  const buttonRows = topGames.map((game) =>
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`game_${game.appid}_${sessionId}`)
        .setLabel(game.name.substring(0, 80))
        .setStyle(ButtonStyle.Secondary)
    )
  );

  const message = await interaction.editReply({
    embeds: [embed],
    components: buttonRows,
    ephemeral: true,
  });

  const filter = (i) =>
    i.user.id === interaction.user.id &&
    i.customId.endsWith(sessionId);

  const collector = message.createMessageComponentCollector({ filter });

  collector.on('collect', async (buttonInteraction) => {
    collector.stop();
    const [_, gameAppId, btnSessionId] = buttonInteraction.customId.split('_');

    // Check if the session ID is still valid
    if (!isValidSession(buttonInteraction.user.id, btnSessionId)) {
      await buttonInteraction.reply({ content: '❌ Your session has expired. Please start again.', ephemeral: true });
      return;
    }

    const selectedGame = topGames.find((game) => game.appid == gameAppId);
    if (!selectedGame) {
      await buttonInteraction.reply({ content: '❌ Game not found.', ephemeral: true });
      return;
    }

    await sendGameDetailsEmbed(buttonInteraction, selectedGame, topGames, sessionId);
  });
}

/**
 * Sends embed with selected game details and confirmation buttons.
 */
async function sendGameDetailsEmbed(interaction, game, topGames, sessionId) {
  const embed = new EmbedBuilder()
    .setColor('#2f3136')
    .setTitle(`📌 ${game.name}`)
    .setDescription(`**Description:** ${game.description}\n\n**Price:** ${getPrice(game)}\n\nDo you want to add this game to your saved list?`)
    .setImage(game.image)
    .setFooter({ text: 'Powered by Steam API' });

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`yes_${game.appid}_${sessionId}`).setLabel('✅ Yes').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`no_${sessionId}`).setLabel('❌ No').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`back_${sessionId}`).setLabel('🔙 Back').setStyle(ButtonStyle.Secondary)
  );

  const message = await interaction.update({
    embeds: [embed],
    components: [buttons],
  });

  const filter = (i) =>
    i.user.id === interaction.user.id &&
    i.customId.endsWith(sessionId);

  const collector = message.createMessageComponentCollector({ filter, time: 60000 });

  collector.on('collect', async (buttonInteraction) => {
    collector.stop();
    await buttonInteraction.deferReply({ ephemeral: true });

    const disabledButtons = new ActionRowBuilder().addComponents(
      buttons.components.map((btn) => btn.setDisabled(true))
    );
    await message.edit({ components: [disabledButtons] });

    if (buttonInteraction.customId.startsWith('no')) {
      await buttonInteraction.editReply({
        content: `❌ Okay, no problem. See you later....`,
        embeds: [],
        components: [],
      });
      clearSession(buttonInteraction.user.id, sessionId);
    } else if (buttonInteraction.customId.startsWith('back')) {
      await sendGameSelectionEmbed(buttonInteraction, topGames, sessionId);
    } else if (buttonInteraction.customId.startsWith('yes')) {
      await saveGameForGuild(buttonInteraction, game);
      clearSession(buttonInteraction.user.id, sessionId);
    }
  });

  collector.on('end', async () => {
    const disabledButtons = new ActionRowBuilder().addComponents(
      buttons.components.map((btn) => btn.setDisabled(true))
    );
    await message.edit({ components: [disabledButtons] }).catch(() => {});
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName(COMMAND_NAME)
    .setDescription('Search and add a game to the tracked list.')
    .addStringOption((option) =>
      option.setName('name').setDescription('The game to add.').setRequired(true)
    ),

  /**
   * Executes the /addgamev2 command.
   */
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const gameName = interaction.options.getString('name');

    const sessionId = createSession(interaction.user.id); // Create new session for each user

    try {
      const games = await searchGame(gameName);

      if (games.length === 0) {
        await interaction.editReply('❌ No games found matching that name. Please try another search.');
        return;
      }

      games.sort((a, b) => b.recommendation - a.recommendation);
      const topGames = games.slice(0, 5);

      await sendGameSelectionEmbed(interaction, topGames, sessionId);
    } catch (error) {
      console.error(error);
      await interaction.editReply(`❌ ${error.message}`);
    }
  },
};
