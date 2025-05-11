const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChatInputCommandInteraction
} = require('discord.js');
const SavedGame = require('../models/savedGames')
const Fuse = require('fuse.js')
const { createSession, isValidSession, clearSession } = require('../configs/sessionManager');

const searchGameFromDB = async (guildId, gameName) => {
    const games = await SavedGame.find({ guildId }).lean();

    if (!games.length) {
        return [];
    }

    const options = {
        keys: ['name'],
        threshold: 0.2,
        includeScore: true,
    };

    const fuse = new Fuse(games, options);
    const result = fuse.search(gameName);

    console.log(result)

    return result.map((item) => item.item);
}

async function sendGameSelectionEmbed(interaction, topGames, sessionId) {
  const embed = new EmbedBuilder()
    .setColor('#2f3136')
    .setTitle('🎮 Select a Game to remove')
    .setDescription('Choose a game from the list below to remove from your tracked list.')

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

async function sendGameDetailsEmbed(interaction, game, topGames, sessionId) {
  const embed = new EmbedBuilder()
    .setColor('#2f3136')
    .setTitle(`📌 ${game.name}`)
    .setDescription(`**Description:** ${game.description}\n\nDo you want to remove this game from your saved list?`)
    .setImage(game.image)

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

  const collector = message.createMessageComponentCollector({ filter });

  collector.on('collect', async (buttonInteraction) => {
    collector.stop();
    await buttonInteraction.deferReply({ ephemeral: true });

    const disabledButtons = new ActionRowBuilder().addComponents(
      buttons.components.map((btn) => btn.setDisabled(true))
    );
    await message.edit({ components: [disabledButtons] });

    if (buttonInteraction.customId.startsWith('no')) {
      await buttonInteraction.editReply({
        content: `❌ Huh, changed your mind?`,
        embeds: [],
        components: [],
      });
      clearSession(buttonInteraction.user.id, sessionId);
    } else if (buttonInteraction.customId.startsWith('back')) {
      await sendGameSelectionEmbed(buttonInteraction, topGames, sessionId);
    } else if (buttonInteraction.customId.startsWith('yes')) {
      await removeGameFromGuild(buttonInteraction, game);
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

const removeGameFromGuild = async (interaction, game) => {
    const guildId = interaction.guildId

    try {
        await SavedGame.deleteOne({ guildId, appid: game.appid })

        await interaction.editReply({
            content: `✅ **${game.name}** has been removed from the saved list.`,
            components: [],
            embeds: [],
        })

        await interaction.followUp({
            content: `📌 **${game.name}** was removed from the tracked list by **${interaction.user.tag}**!`,
            ephemeral: false,
        });
        
    } catch (error) {
        console.error('MongoDB remove error:', error)
        await interaction.editReply({
            content: '❌ An error occurred while removing the game. Please try again later.',
            components: [],
            embeds: [],
        })
    }

}

module.exports = {
    data: new SlashCommandBuilder()
    .setName('removegame')
    .setDescription('Remove a game from list.')
    .addStringOption(option =>
        option.setName('name')
            .setDescription('The game to remove.')
            .setRequired(true)),
    /**
     * Remove game from the list
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction){

    await interaction.deferReply({ ephemeral: true });
    const gameName = interaction.options.getString('name');
    const guildId = interaction.guildId

    const sessionId = createSession(interaction.user.id); // Create new session for each user

        try {
            const games = await searchGameFromDB(guildId, gameName);

            if (games.length === 0) {
                await interaction.editReply('❌ No games found matching that name. Please try another search.');
                return;
            }


            await sendGameSelectionEmbed(interaction, games, sessionId);
        } catch (error) {
            console.error('MongoDB remove error:', error)
            await interaction.editReply({
                content: '❌ An error occurred while removing the game. Please try again later.',
                ephemeral: true,
            })
            
        }
    }
}