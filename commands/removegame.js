const { SlashCommandBuilder } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder().setName('removegame').setDescription('Remove a game from list.'),
    async execute(interaction){
        await interaction.reply('remove game command')
    }
}