const { SlashCommandBuilder } = require('discord.js')

module.exports = {
    data: new SlashCommandBuilder()
    .setName('removegame')
    .setDescription('Remove a game from list.')
    .addStringOption(option =>
        option.setName('name')
            .setDescription('The game to remove.')
            .setRequired(true)),
    async execute(interaction){
        await interaction.reply('remove game command')
    }
}