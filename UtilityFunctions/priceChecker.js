const SavedGame = require('../models/savedGames')
const { getIsThereAnyDealGameId, getHistoricalLowCut } = require('../services/isThereAnyDealAPI')
const { gameDetails } = require('../services/steamAPI')

//check for historical low and send notification to users
const checkPrice = async () => {
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
            }
        })
    } catch (error) {
        console.log(error)
        throw new Error(error.message)
    }
}

module.exports = {
    checkPrice
}