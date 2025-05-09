const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js')
const { searchGame } = require('../services/steamAPI')
const { saveGameForGuild } = require('../UtilityFunctions/saveGameForGuild')

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
    const collector = interaction.channel.createMessageComponentCollector({ filter, time:15000 })

    collector.on('collect', async (buttonInteraction) => {
        collector.stop()
        const gameAppId = buttonInteraction.customId.split('_')[1]
        const selectedGame = topGames.find(game => game.appid == gameAppId)

        if (!selectedGame) {
            await buttonInteraction.reply({ content: '❌ Game not found.', ephemeral: true })
            return;
        }

        //disable buttons after interaction
        const disabledButtons = buttonRows.map(row => 
            new ActionRowBuilder().addComponents(
                row.components.map(button => button.setDisabled(true))
            )
        );
    
        await interaction.editReply({ components: disabledButtons, ephemeral: true });

        await sendGameDetailsEmbed(buttonInteraction, selectedGame, topGames);
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            const disabledButtons = buttonRows.map(row =>
                new ActionRowBuilder().addComponents(
                    row.components.map(button => button.setDisabled(true))
                )
            );
    
            await interaction.editReply({
                components: disabledButtons,
                ephemeral: true
            }).catch(() => {}); // In case already deleted or updated
        }
    })
}

//send selected game details to user
//from here user can select 'yes', 'no' or 'back'
//pressing yes will add the game to wishlist
//pressing no/back will take user to initial selection
const sendGameDetailsEmbed = async (interaction, game, topGames) => {
    const embed = new EmbedBuilder()
                .setColor('#2f3136')
                .setTitle(`📌 ${game.name}`)
                .setDescription(`**Description:** ${game.description}\n\n**Price:** ${getPrice(game)}\n\nDo you want to add this game to your saved list?`)
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

        if (buttonInteraction.customId === 'no') {
            // End interaction if user presses "No"
            await buttonInteraction.editReply({
                content: `❌ Okay, no problem. You know what to do if you want to add a new game`,
                embeds: [],
                components: [],
                ephemeral: true
            });
            return; 
        }
    

        if (buttonInteraction.customId === 'back') {
            await sendGameSelectionEmbed(buttonInteraction, topGames); // Show the 5-game list again
        } else if (buttonInteraction.customId.startsWith('yes_')) {

            await saveGameForGuild(buttonInteraction, game)
        }
    })

    // collector.on('end', async () => {
    //     // Delete message after timeout
    //     await message.delete().catch(() => {}); // Catch errors if already deleted
    // });
}

/**
 * Format price
 * @param {Object} game 
 */
const getPrice = (game) => {
    if(game.is_free){
        return 'This game is free'
    }
    if(game.price.discount_percent > 0){
        return `~~$${game.price.initial_formatted}~~ ➜ **$${game.price.final_formatted}**`
    }

    return game.price.final_formatted
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
        } catch (error) {
            console.log(error)
            await interaction.editReply(`❌ ${error.message}`)
        }
    }
}