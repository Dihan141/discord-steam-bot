const { EmbedBuilder } = require('discord.js')

const GuildSettings = require('../models/guildSettings')

const sendUpdateMessage = async (client) => {
    try {
        const guildSettings = await GuildSettings.find().lean()

        if (!guildSettings.length) {
            console.log('No guild settings found.')
            return
        }

        guildSettings.forEach(async (setting) => {
            const channel = client.channels.cache.get(setting.notificationChannelId)

            if (!channel) {
                console.log(`Channel not found for guild: ${setting.guildId}`)
                return
            }

            const embed = new EmbedBuilder()
                            .setColor('#3498db')
                            .setTitle('✨ New Command Added: `/addgamebylink` 🔗')
                            .setDescription('A faster way to track your favorite games — now by **pasting the Steam link directly**!')
                            .addFields(
                                {
                                name: '📘 Command',
                                value: '`/addgamebylink <steam_url>`',
                                },
                                {
                                name: '🔍 How It Works',
                                value:
                                    '1. Paste any valid Steam store link, like:\n' +
                                    '`https://store.steampowered.com/app/1145360/Hades/`\n' +
                                    '2. The bot instantly fetches game details:\n' +
                                    '   - ✅ Name & description\n' +
                                    '   - 💸 Current price & discounts\n' +
                                    '   - 📌 App ID auto-detected\n' +
                                    '3. Confirm to **add it to your tracked games list**.',
                                },
                                {
                                name: '🧪 Example',
                                value: '`/addgamebylink https://store.steampowered.com/app/1145360/Hades/`',
                                },
                                {
                                name: '💬 Why Use This?',
                                value:
                                    '🚀 **Quick Add** – No need to search\n' +
                                    '🎯 Perfect for pasting links from bundles or recommendations\n'
                                }
                            )
                            .setImage('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRr2mUgIOTXJgtAsUbkqRCIaoE26YLzMBz9rA&s')
                            .setTimestamp();

            await channel.send({
                content: `<@&${setting.mentionRoleId}>, 📢 New command drop!`, // Mention the role if it exists
                allowedMentions: setting.mentionRoleId
                ? { roles: [setting.mentionRoleId] }
                : { parse: ['everyone'] },
                 embeds: [embed] 
            })
        })
    } catch (error) {
        console.error('Error sending update message:', error)
    }
}

module.exports = {
    sendUpdateMessage
}