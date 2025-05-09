const { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType } = require('discord.js')
const GuildSettings = require('../models/guildSettings')

module.exports = {
    data: new SlashCommandBuilder()
                .setName('setrole')
                .setDescription('Set a role to mention when sending notifications.')
                .addRoleOption(option => option.setName('role')
                                                .setDescription('The role to mention')
                                                .setRequired(true)
                                ),
    /**
     * 
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction){
        try {
            const role = interaction.options.getRole('role')
            const guildId = interaction.guildId

            await GuildSettings.findOneAndUpdate(
                {guildId},
                {mentionRoleId: role.id},
                {upsert: true, new: true}
            )

            await interaction.reply(`✅ Notification role set to <@&${role.id}>.`)
        } catch (error) {
            console.log('Setting role error: ', error.message)
            await interaction.reply(`❌ An error occured while setting role.`)
        }
    }
}