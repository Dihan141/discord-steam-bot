const { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js')
const SavedGame = require('../models/savedGames')

/**
 * 
 * @param {ChatInputCommandInteraction} interaction 
 * @returns 
 */
async function showSavedGames(interaction) {
    const games = await SavedGame.find({ guildId: interaction.guildId }).sort({ createdAt: -1 }).lean();

    // return if no games
    if (!games.length) {
        await interaction.editReply({ content: '📭 No games in the tracked list.', ephemeral: true });
        return
    }

    const itemsPerPage = 5;
    const totalPages = Math.ceil(games.length / itemsPerPage);
    let currentPage = 0;

    const formatGame = (game, index) => {
        const addedDate = new Date(game.createdAt).toLocaleDateString();
        return `**${index + 1}. ${game.name}**\n🗓️ Added: ${addedDate}\n👤 By: <@${game.userId || 'unknown'}>\n`;
    };

    const generateEmbed = (page) => {
        const start = page * itemsPerPage;
        const pageGames = games.slice(start, start + itemsPerPage);

        return new EmbedBuilder()
            .setTitle('🎮 Saved Games')
            .setDescription(pageGames.map((g, i) => formatGame(g, start + i)).join('\n\n') || '*No games found.*')
            .setFooter({ text: `Page ${page + 1} of ${totalPages}` })
            .setColor('Blue');
    };

    const getButtons = (page) => {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('prev')
                .setEmoji('◀️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId('next')
                .setEmoji('▶️')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === totalPages - 1)
        );
    };

    const message = await interaction.editReply({
        embeds: [generateEmbed(currentPage)],
        components: [getButtons(currentPage)],
        fetchReply: true,
        ephemeral: true
    });

    const collector = message.createMessageComponentCollector();

    collector.on('collect', async i => {
        // if (i.user.id !== interaction.user.id)
        //     return i.reply({ content: 'These buttons are not for you.', ephemeral: true });

        currentPage += i.customId === 'next' ? 1 : -1;

        await i.update({
            embeds: [generateEmbed(currentPage)],
            components: [getButtons(currentPage)]
        });
    });

    // collector.on('end', (_, reason) => {
    //     if (reason === 'time') {
    //         message.edit({ embeds:[], components:[] }).catch(() => {});
    //     }
    //     //message.edit({ components: [] }).catch(() => {});
    // });
}

// use per game embed
// async function showSavedGames(interaction) {
//     const games = await SavedGame.find({ guildId: interaction.guildId }).sort({ createdAt: -1 }).lean();

//     if (games.length === 0) {
//         return interaction.reply({ content: 'No saved games found.', ephemeral: true });
//     }

//     let currentPage = 0;
//     const totalPages = games.length;

//     const formatEmbed = (game, index) => {
//         const addedDate = new Date(game.createdAt).toLocaleDateString();

//         return new EmbedBuilder()
//             .setTitle(`🎮 ${game.name}`)
//             .setDescription(game.description || '*No description available.*')
//             .addFields(
//                 { name: '📅 Date Added', value: addedDate, inline: true },
//                 { name: '🙋‍♂️ Added By', value: `<@${game.userId || 'unknown'}>`, inline: true }
//             )
//             .setImage(game.image || null)
//             .setFooter({ text: `Game ${index + 1} of ${totalPages}` })
//             .setColor('DarkBlue');
//     };

//     const getButtons = (page) =>
//         new ActionRowBuilder().addComponents(
//             new ButtonBuilder()
//                 .setCustomId('prev')
//                 .setEmoji('◀️')
//                 .setStyle(ButtonStyle.Secondary)
//                 .setDisabled(page === 0),
//             new ButtonBuilder()
//                 .setCustomId('next')
//                 .setEmoji('▶️')
//                 .setStyle(ButtonStyle.Secondary)
//                 .setDisabled(page === totalPages - 1)
//         );

//     const message = await interaction.reply({
//         embeds: [formatEmbed(games[currentPage], currentPage)],
//         components: [getButtons(currentPage)],
//         fetchReply: true,
//         ephemeral: true
//     });

//     const collector = message.createMessageComponentCollector({ time: 120_000 });

//     collector.on('collect', async i => {
//         if (i.user.id !== interaction.user.id)
//             return i.reply({ content: 'These buttons are not for you.', ephemeral: true });

//         currentPage += i.customId === 'next' ? 1 : -1;

//         await i.update({
//             embeds: [formatEmbed(games[currentPage], currentPage)],
//             components: [getButtons(currentPage)]
//         });
//     });

//     collector.on('end', () => {
//         message.edit({ components: [] }).catch(() => {});
//     });
// }

module.exports = {
    data: new SlashCommandBuilder()
    .setName('showlist')
    .setDescription('show the list of games added to the tracked list.'),

    /**
     * Show the list of games added to the tracked list
     * @param {ChatInputCommandInteraction} interaction 
     */
    async execute(interaction){
        try {
            await interaction.deferReply();
            await showSavedGames(interaction);
        } catch (error) {
            console.log('Showing list error: ', error.message)
            await interaction.editReply(`❌ An error occured while fetching list.`)
        }
    }
}