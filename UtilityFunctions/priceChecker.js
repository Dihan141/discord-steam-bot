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
                if(gamePriceInfo.discount_percent > 0){
                    if(historyDetails.lows[0].cut <= gamePriceInfo.discount_percent){
                        console.log(`${game.name} is in historical sale now`)
                        let data = {
                            client,
                            guildId: game.guildId,
                            appid: game.appid,
                            gameData
                        }
                        notifyUsers(data, sendHistoricalLowEmbed)
                    }
                    else {
                        console.log('Not in historical low but in sale')
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

        const channel = await client.channels.fetch(guildSettings.notificationChannelId).catch(() => null);
        if (!channel) {
            throw new Error('❌ Set a channel to receive updates. Command: /setchannel')
        }
        
        callBack(channel, gameData)
    } catch (error) {
        console.log(error)
    }
}

const sendHistoricalLowEmbed = (channel, game) => {
    const embed = new EmbedBuilder()
                    .setTitle(`💸 ${game.name} is at historical low!`)
                    .setDescription(`\n**Price:**~~$${game.price_overview.initial_formatted}~~ → **$${game.price_overview.final_formatted}**\n
                                    **Discount:** ${game.price_overview.discount_percent}%\n
                                    [Open in Steam](https://store.steampowered.com/app/${game.appid}/)`)
                    .setImage(game.header_image)
                    .setColor(0x1b2838)
    channel.send({
        embeds: [embed]
    })
}

module.exports = {
    checkPrice
}