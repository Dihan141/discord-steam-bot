const { SlashCommandBuilder } = require('discord.js')
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
        const gameName = interaction.options.getString('name')
        
        try {
            const games = await searchGame(gameName)

            if(games.length == 0){
                await interaction.reply('❌ No games found matching that name. Please try another search.')
                return
            }

            await interaction.reply(games[0].name)
        } catch (error) {
            console.log(error)
            await interaction.reply('❌ Error fetching game data. Please try again later.')
        }
    }
}