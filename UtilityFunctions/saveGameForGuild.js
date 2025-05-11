const { ChatInputCommandInteraction } = require('discord.js')
const SavedGame = require('../models/savedGames')

/**
 * save game in database given a guild id
 * @param {ChatInputCommandInteraction} interaction 
 * @param {Object} game 
 */
const saveGameForGuild = async (interaction, game) => {
    const guildId = interaction.guildId
    const userId = interaction.user.id

    try {
        const existing = await SavedGame.findOne({guildId, appid:game.appid})

        if(existing){
            await interaction.editReply({
                content: `⚠️ **${game.name}** is already in the list.`,
                components: [],
                embeds: []
            })

            return
        }

        const newGame = new SavedGame({
            guildId,
            userId,
            appid: game.appid,
            name: game.name,
            image: game.image,
            is_free: game.is_free,
            description: game.description,
            price: game.price,
            recommendation: game.recommendation
        })

        await newGame.save()

        await interaction.editReply({
            content: `✅ **${game.name}** has been added to the saved list.`,
            components: [],
            embeds: [],
        })

        await interaction.followUp({
            content: `📌 **${game.name}** was added to the tracked list by **${interaction.user.tag}**!`,
            ephemeral: false,
        });
        
    } catch (error) {
        console.error('MongoDB save error:', error)
        await interaction.editReply({
            content: '❌ An error occurred while saving the game. Please try again later.',
            components: [],
            embeds: [],
        })
    }

}

module.exports = {
    saveGameForGuild
}