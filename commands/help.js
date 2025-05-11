// commands/help.js
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js')

const commands = [
    {
        name: 'addgame',
        description: `🎮 Add a Steam game to your server's watchlist. More precise name, more better.\n`,
    },
    {
        name: 'removegame',
        description: `🗑️ Remove a tracked game from your server's watch list.\n`,
    },
    {
        name: 'historicallow',
        description: '📋 View historical low of a game.\n',
    },
    {
        name: 'setchannel',
        description: '🔔 Set the notification channel.\n',
    },
    {
        name: 'setrole',
        description: '📢 Set the role to mention in alerts.\n',
    },
    {
        name: 'showlist',
        description: '📋 View all tracked games in this server.\n',
    },
]

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows a list of all available commands'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🛠️ Bot Command List')
            .setDescription('Here are all the available commands:')
            .setColor(0x3498db)

        commands.forEach((cmd, index) => {
            embed.addFields({
                name: `</${cmd.name}:>`,
                value: cmd.description,
                inline: false,
            })

            if (index !== commands.length - 1) {
                embed.addFields({ name: '\u200B', value: '' })
            }
        })

        embed.setFooter({ text: 'Use these commands with a forward slash (/) in Discord.' })

        return interaction.reply({ embeds: [embed] })
    }
}
