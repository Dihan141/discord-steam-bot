const SavedGame = require('../models/savedGames')
const GuildSettings = require('../models/guildSettings')
const { getIsThereAnyDealGameId, getHistoricalLowCut } = require('../services/isThereAnyDealAPI')
const { gameDetails } = require('../services/steamAPI')
const { EmbedBuilder, Client } = require('discord.js')

/**
 * check for historical low and send notification to users
 * @param {Client} client 
 */
const checkPrice = async (client) => {
    try {
        const games = await SavedGame.find()
        
        games.map(async (game) => {
            const id = await getIsThereAnyDealGameId(game.name)
            const historyDetails = await getHistoricalLowCut(id)

            const gameResponseData = await gameDetails(game.appid)
            const gameData = gameResponseData[game.appid].data

            const gamePriceInfo = gameData.price_overview
            if(gamePriceInfo){
                let data = {
                    client,
                    guildId: game.guildId,
                    appid: game.appid,
                    gameData
                }

                if(gamePriceInfo.discount_percent > 0){
                    if(!game.notificationSent){
                        if(historyDetails.lows[0].cut <= gamePriceInfo.discount_percent){
                            console.log(`${game.name} is in historical sale now`)
    
                            notifyUsers(data, sendHistoricalLowEmbed)
                        }
                        else {
                            notifyUsers(data, sendSaleEmbed)
                        }

                        await SavedGame.findOneAndUpdate(game._id, { notificationSent: true })
                    }
                } else {
                    if(game.notificationSent){
                        await SavedGame.findOneAndUpdate(game._id, { notificationSent: false })
                    }
                }
            }
        })
    } catch (error) {
        console.log(error)
        throw new Error(error.message)
    }
}

/**
 * send notification to users
 * @param {Client} client 
 */
const notifyUsers = async (data, callBack) => {
    try {
        const {client, guildId, appid, gameData} = data
        gameData.appid = appid
        const guildSettings = await GuildSettings.findOne({guildId})
        const mentionRoleId = guildSettings.mentionRoleId
        const mentionText = mentionRoleId ? `<@&${mentionRoleId}>` : '@everyone'

        const channel = await client.channels.fetch(guildSettings.notificationChannelId).catch(() => null);
        if (!channel) {
            throw new Error('❌ Set a channel to receive updates. Command: /setchannel')
        }
        
        const callbackData = {
            channel,
            gameData,
            mentionRoleId,
            mentionText
        }
        callBack(callbackData)
    } catch (error) {
        console.log(error)
    }
}

const sendHistoricalLowEmbed = (data) => {
    const { channel, gameData, mentionRoleId, mentionText } = data
    const embed = new EmbedBuilder()
                    .setTitle(`💸 ${gameData.name} is at historical low!`)
                    .setDescription(`\n**Price:**~~${gameData.price_overview.initial_formatted}~~ → **${gameData.price_overview.final_formatted}**\n
                                    **Discount:** ${gameData.price_overview.discount_percent}%\n
                                    [Open in Steam](https://store.steampowered.com/app/${gameData.appid}/)`)
                    .setImage(gameData.header_image)
                    .setColor(0x1b2838)
    channel.send({
        content: mentionText,
        allowedMentions: mentionRoleId
        ? { roles: [mentionRoleId] }
        : { parse: ['everyone'] },
        embeds: [embed]
    })
}

const sendSaleEmbed = (data) => {
    const { channel, gameData, mentionRoleId, mentionText } = data
    const embed = new EmbedBuilder()
                    .setTitle(`💸 ${gameData.name} is on sale!`)
                    .setDescription(`\n**Price:**~~${gameData.price_overview.initial_formatted}~~ → **${gameData.price_overview.final_formatted}**\n
                                    **Discount:** ${gameData.price_overview.discount_percent}%\n
                                    (Not historical low but worth a check I think?)\n
                                    [Open in Steam](https://store.steampowered.com/app/${gameData.appid}/)`)
                    .setImage(gameData.header_image)
                    .setColor(0x1b2838)
    channel.send({
        content: mentionText,
        allowedMentions: mentionRoleId
        ? { roles: [mentionRoleId] }
        : { parse: ['everyone'] },
        embeds: [embed]
    })
}

module.exports = {
    checkPrice
}