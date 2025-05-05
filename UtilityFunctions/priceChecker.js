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
            if(historyDetails.lows[0].cut <= gamePriceInfo.discount_percent){
                console.log(`${game.name} is in historical sale now`)
                notifyUsers(client, game.guildId)
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
const notifyUsers = async (client, guildId) => {
    const guildSettings = await GuildSettings.findOne({guildId})

    const channel = await client.channels.fetch(guildSettings.notificationChannelId).catch(() => null);
    if (channel) console.log('It is working');
}

module.exports = {
    checkPrice
}