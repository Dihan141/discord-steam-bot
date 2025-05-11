const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ChannelType } = require('discord.js')
const { searchGame } = require('../services/steamAPI');
const { createSession, isValidSession, clearSession } = require('../configs/sessionManager');
const { getIsThereAnyDealGameId, getHistoricalLowCut } = require('../services/isThereAnyDealAPI');
const e = require('express');

async function sendGameSelectionEmbed(interaction, topGames, sessionId) {
  const embed = new EmbedBuilder()
    .setColor('#2f3136')
    .setTitle('🎮 Select a Game to check')
    .setDescription('Choose a game from the list below to check historical low.')
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

  const collector = message.createMessageComponentCollector({ filter, time: 60000 });

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

    await sendGameDetailsEmbed(buttonInteraction, selectedGame, sessionId);
  });
}

async function sendGameDetailsEmbed(interaction, game, sessionId) {
    const id = await getIsThereAnyDealGameId(game.name)
    const historyDetails = await getHistoricalLowCut(id)
    console.log(historyDetails)

    let msg = 'No historical low data available for this game.'

    if(!game.is_free) {
        const originalPrice = game.price.initial
        let formattedPrice = (originalPrice / 100).toFixed(2)
        if(historyDetails) {
            const cut = historyDetails.lows[0].cut
            console.log('cut', cut)
            if(cut > 0) {
                const finalPrice = originalPrice - (originalPrice * cut / 100)
                const flooredPrice = Math.floor(finalPrice)
                formattedPrice = (flooredPrice / 100).toFixed(2)
                msg = `**Historical low price:** $${formattedPrice}\n **Historical discount:** ${cut}%`
            }
        }
    } else {
        msg = 'This game is free'
    }

    const embed = new EmbedBuilder()
        .setColor('#2f3136')
        .setTitle(`📌 ${game.name}`)
        .setDescription(`**Description:** ${game.description}\n\n${msg}`)
        .setImage(game.image)
        .setFooter({ text: 'Powered by IsThereAnyDeal API' });

    clearSession(interaction.user.id, sessionId); // Clear the session after use
    const message = await interaction.update({
        content: `Fetching historical low data for **${game.name}**`,
        embeds: [],
        components: [],
        ephemeral: false,
    });

    await interaction.followUp({
        embeds: [embed],
        ephemeral: false,
    });
}

module.exports = {
    data: new SlashCommandBuilder()
    .setName('historicallow')
    .setDescription('get historical low price of a game.')
    .addStringOption((option) =>
      option.setName('name').setDescription('The game to check.').setRequired(true)
    ),
    /**
     * Set bot spam channel
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction){
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
    }
}