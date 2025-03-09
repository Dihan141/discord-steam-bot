const { SlashCommandBuilder } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder().setName('addgame').setDescription('Search and add a game to the tracked list.'),
    async execute(interaction){
        await interaction.reply('Add game command')
    }
}