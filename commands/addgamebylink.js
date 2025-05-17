const { SlashCommandBuilder, 
    ChatInputCommandInteraction, 
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder } = require('discord.js')
const { createSession, isValidSession, clearSession } = require('../configs/sessionManager');
const { saveGameForGuild } = require('../UtilityFunctions/saveGameForGuild');
const { gameDetails } = require('../services/steamAPI');

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

async function sendGameDetailsEmbed(gameId, interaction, sessionId) {
    const gameResponse = await gameDetails(gameId);
    if (!gameResponse) {
        await interaction.editReply('❌ Game not found. Please try again.');
        return;
    }

    const game = gameResponse[gameId].data;
    game.appid = gameId;
    game.price = game.price_overview;
    game.image = game.header_image;
    game.description = game.short_description;


    const embed = new EmbedBuilder()
        .setColor('#2f3136')
        .setTitle(`📌 ${game.name}`)
        .setDescription(`**Description:** ${game.description}\n\n**Price:** ${getPrice(game)}\n\nDo you want to add this game to your saved list?`)
        .setImage(game.image)
        .setFooter({ text: 'Powered by Steam API' });

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`yes_${game.appid}_${sessionId}`).setLabel('✅ Yes').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`no_${sessionId}`).setLabel('❌ No').setStyle(ButtonStyle.Danger),
    );

    const message = await interaction.editReply({
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

        if (!isValidSession(buttonInteraction.user.id, sessionId)) {
            await buttonInteraction.editReply({
                content: '❌ This session has expired. Please try again.',
                embeds: [],
                components: [],
            });
            return;
        }

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
    .setName('addgamebylink')
    .setDescription('add a game to the tracked list with steam link.')
    .addStringOption((option) =>
      option.setName('link').setDescription('The game to add.').setRequired(true)
    ),
    /**
     * Set bot spam channel
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction){
        await interaction.deferReply()
        const sessionId = createSession(interaction.user.id);
        try {
            const gameLink = interaction.options.getString('link')
            const match = gameLink.match(/store\.steampowered\.com\/app\/(\d+)/)
            if (!match) {
                return interaction.editReply('❌ Invalid Steam game link. Please provide a valid link.');
            }

            const gameId = match[1]
            await sendGameDetailsEmbed(gameId, interaction, sessionId)
        } catch (error) {
            console.log('Setting channel error: ', error.message)
            await interaction.reply(`❌ An error occured while setting channel.`)
        }
    }
}