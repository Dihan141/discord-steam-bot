const axios = require('axios')

const getIsThereAnyDealGameId = async (gameName) => {
    const response = await axios.get(`https://api.isthereanydeal.com/games/search/v1?title=${gameName}&key=${process.env.ISTHEREANYDEAL_APIKEY}`)
    return response.data[0].id
}

const getHistoricalLowCut = async (gameId) => {
    const response = await axios.post(`https://api.isthereanydeal.com/games/storelow/v2?shops=61&key=${process.env.ISTHEREANYDEAL_APIKEY}&country=BD`, [gameId])
    return response.data[0]
}

module.exports = {
    getIsThereAnyDealGameId,
    getHistoricalLowCut
}