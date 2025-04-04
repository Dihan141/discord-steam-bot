const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js')
const { searchGame } = require('../services/steamAPI')

//send the selection option to user
//users can select a game from here
async function sendGameSelectionEmbed(interaction, topGames) {
    const embed = new EmbedBuilder()
        .setColor('#2f3136')
        .setTitle('🎮 Select a Game to Track')
        .setDescription('Choose a game from the list below to add to your tracked list.')
        .setFooter({ text: 'Powered by Steam API' });

    const buttonRows = topGames.map(game =>
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`game_${game.appid}`)
                .setLabel(game.name.substring(0, 80)) // Max 80 chars
                .setStyle(ButtonStyle.Secondary)
        )
    )

    const message = await interaction.editReply({
        embeds: [embed],
        components: buttonRows,
        ephemeral: true
    });

    const filter = (i) => i.user.id === interaction.user.id
    const collector = interaction.channel.createMessageComponentCollector({ filter })

    collector.on('collect', async (buttonInteraction) => {
        collector.stop()
        const gameAppId = buttonInteraction.customId.split('_')[1]
        const selectedGame = topGames.find(game => game.appid == gameAppId)

        if (!selectedGame) {
            await buttonInteraction.reply({ content: '❌ Error: Game not found.', ephemeral: true })
            return;
        }

        //disable buttons after interaction
        const disabledButtons = buttonRows.map(row => 
            new ActionRowBuilder().addComponents(
                row.components.map(button => button.setDisabled(true))
            )
        );
    
        await interaction.editReply({ components: disabledButtons });

        await sendGameDetailsEmbed(buttonInteraction, selectedGame, topGames);
    });

    // collector.on('end', async () => {
    //     // Delete message after timeout
    //     await message.delete().catch(() => {}); // Catch errors if already deleted
    // });
}

//send selected game details to user
//from here user can select 'yes', 'no' or 'back'
//pressing yes will add the game to wishlist
//pressing no/back will take user to initial selection
const sendGameDetailsEmbed = async (interaction, game, topGames) => {
    const embed = new EmbedBuilder()
                .setColor('#2f3136')
                .setTitle(`📌 ${game.name}`)
                .setDescription(`**Description:** ${game.description}\n\nDo you want to add this game to your saved list?`)
                .setImage(game.image)
                .setFooter({ text: 'Powered by Steam API' });

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`yes_${game.appid}`).setLabel('✅ Yes').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('no').setLabel('❌ No').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('back').setLabel('🔙 Back').setStyle(ButtonStyle.Secondary)
    );

    const message = await interaction.update({
        embeds: [embed],
        components: [buttons]
    })

    const filter = (i) => i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter });

    collector.on('collect', async (buttonInteraction) => {
        collector.stop()
        await buttonInteraction.deferReply()

        //disable buttons after interaction
        const disabledButtons = new ActionRowBuilder().addComponents(
            buttons.components.map(button => button.setDisabled(true))
        );
    
        await interaction.editReply({ components: [disabledButtons] });

        if (buttonInteraction.customId === 'no' || buttonInteraction.customId === 'back') {
            await sendGameSelectionEmbed(buttonInteraction, topGames); // Show the 5-game list again
        } else if (buttonInteraction.customId.startsWith('yes_')) {
            saveGameForUser(buttonInteraction.user.id, game);
            await buttonInteraction.editReply({
                content: `✅ **${game.name}** has been added to your saved list!`,
                embeds: [],
                components: []
            });
        }
    })

    // collector.on('end', async () => {
    //     // Delete message after timeout
    //     await message.delete().catch(() => {}); // Catch errors if already deleted
    // });
}

const saveGameForUser = (uid, game) => {
    console.log(`${game.name} was saved!`)
}

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

            sendGameSelectionEmbed(interaction, topGames)

            // const buttonRows = topGames.map(game =>
            //     new ActionRowBuilder().addComponents(
            //         new ButtonBuilder()
            //             .setCustomId(`game_${game.appid}`)
            //             .setLabel(game.name.substring(0, 80)) // Max 80 chars
            //             .setStyle(ButtonStyle.Secondary)
            //     )
            // )

            // const titleText = games.length > 1 ? 'Multiple games were found for this search, select a Game to Track 🎮'
            //                                     : 'This game was found based on your search, press for details'

            // const embed = new EmbedBuilder()
            // .setColor('#2f3136') // Dark color for background effect
            // .setTitle(titleText)
            // .setDescription('Choose a game from the list below to add to your tracked list.')
            // .setFooter({ text: 'Powered by Steam API' });

            // await interaction.editReply({
            //     embeds: [embed],
            //     components: buttonRows
            // })

            // const filter = (i) => i.user.id === interaction.user.id; // Make sure the user who clicked the button is the one who invoked the command
            // const collector = interaction.channel.createMessageComponentCollector({
            //     filter,
            //     time: 15000, // Time in ms for the collector to listen for interactions (e.g., 15 seconds)
            // });

            // collector.on('collect', async(buttonInteraction) => {
            //     collector.stop()
            //     const gameAppId = buttonInteraction.customId.split('_')[1] // Extract the appId from the button customId
            //     console.log(gameAppId)

            //     // Find the selected game based on the appId
            //     const selectedGame = games.find(game => game.appid == gameAppId)
            //     console.log(selectedGame)

            //     await sendGameDetailsEmbed(buttonInteraction, selectedGame, topGames)
            // })
        } catch (error) {
            console.log(error)
            await interaction.editReply(`❌ ${error.message}`)
        }
    }
}