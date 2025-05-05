const { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType } = require('discord.js')
const GuildSettings = require('../models/guildSettings')

module.exports = {
    data: new SlashCommandBuilder()
    .setName('setchannel')
    .setDescription('set a channel for bot spamming.')
    .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('The channel to send notifications to')
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText)
    ),
    /**
     * Set bot spam channel
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction){
        try {
            const guildId = interaction.guildId
            const channel = interaction.options.getChannel('channel')

            await GuildSettings.findOneAndUpdate(
                { guildId },
                { notificationChannelId: channel.id },
                { upsert: true, new: true }
            )
    
            await interaction.reply(`✅ Notification channel set to <#${channel.id}>.`)
        } catch (error) {
            console.log('Setting channel error: ', error.message)
            await interaction.reply(`❌ An error occured while setting channel.`)
        }
    }
}