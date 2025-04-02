const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js')
const { searchGame } = require('../services/steamAPI')

module.exports = {
    data: new SlashCommandBuilder()
    .setName('addgame')
    .setDescription('Search and add a game to the tracked list.')
    .addStringOption(option =>
        option.setName('name')
            .setDescription('The game to add.')
            .setRequired(true)),
    async execute(interaction){
        await interaction.deferReply()
        const gameName = interaction.options.getString('name')
        
        try {
            const games = await searchGame(gameName)
            console.log(games)

            if(games.length == 0){
                await interaction.editReply('❌ No games found matching that name. Please try another search.')
                return
            }

            //sort the game list based on recommendation count
            games.sort((a,b) => b.recommendation - a.recommendation)

            //show only top 5 games
            let topGames = []
            topGames = games.slice(0, 5)

            const buttonRows = topGames.map(game =>
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`game_${game.appid}`)
                        .setLabel(game.name.substring(0, 80)) // Max 80 chars
                        .setStyle(ButtonStyle.Secondary)
                )
            )

            const titleText = games.length > 1 ? 'Multiple games were found for this search, select a Game to Track 🎮'
                                                : 'This game was found based on your search, press for details'

            const embed = new EmbedBuilder()
            .setColor('#2f3136') // Dark color for background effect
            .setTitle(titleText)
            .setDescription('Choose a game from the list below to add to your tracked list.')
            .setFooter({ text: 'Powered by Steam API' });

            await interaction.editReply({
                embeds: [embed],
                components: buttonRows
            })

            const filter = (i) => i.user.id === interaction.user.id; // Make sure the user who clicked the button is the one who invoked the command
            const collector = interaction.channel.createMessageComponentCollector({
                filter,
                time: 15000, // Time in ms for the collector to listen for interactions (e.g., 15 seconds)
            });

            collector.on('collect', async(buttonInteraction) => {
                const gameAppId = buttonInteraction.customId.split('_')[1] // Extract the appId from the button customId
                console.log(gameAppId)

                // Find the selected game based on the appId
                const selectedGame = games.find(game => game.appid == gameAppId)
                console.log(selectedGame)

                await interaction.editReply(`Selected ${selectedGame.name}`)
            })
        } catch (error) {
            console.log(error)
            await interaction.editReply(`❌ ${error.message}`)
        }
    }
}