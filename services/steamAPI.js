const axios = require('axios')
const Fuse = require('fuse.js')
const redisClient = require('../configs/redisClient')

// const delay = (ms) => {
//     return new Promise(resolve => setTimeout(resolve, ms))
// }

//remove games with same ID
const removeDuplicateGames = (games) => {
    const uniqueGames = new Map();
    
    games.forEach(game => {
        uniqueGames.set(game.appid, game); // Map ensures only one entry per appid
    });

    return Array.from(uniqueGames.values());
}

const getAllApps = async () => {
    const cacheKey = 'steam:app_list'

    const cachedApp = await redisClient.get(cacheKey)
    if(cachedApp){
        console.log('returning cached value')
        return JSON.parse(cachedApp)
    }

    const response = await axios.get(' http://api.steampowered.com/ISteamApps/GetAppList/v0002/?format=json')
    const allApps = response.data.applist.apps

    await redisClient.setEx(cacheKey, 300, JSON.stringify(allApps))

    return allApps
}

const searchGame = async(gameName) => {
    try {
        const allApps = await getAllApps()

        const fuse = new Fuse(allApps, {
            keys: ['name'],
            threshold: 0.2, // Lower is stricter, try 0.3–0.4
            distance: 100,
            minMatchCharLength: 2,
        })

        //filtering based on game name
        const fuseResults = fuse.search(gameName)
        console.log(fuseResults)

        if(fuseResults.length > 100){
            throw new Error('Give more specific name')
        }

        const results = []
        // let id = 1091500
        // const gameResponse = await axios.get(`https://store.steampowered.com/api/appdetails?appids=${id}`)
        // console.log(gameResponse)
        // console.log(gameResponse.data[id])
        for(const result of fuseResults){
            let game = result.item
            console.log(`Fetching details for ${game.name} (ID: ${game.appid})...`)

            try {
                //await delay(500)

                const gameResponseData = await gameDetails(game.appid)
                if(gameResponseData[game.appid].success){
                    gameData = gameResponseData[game.appid].data
                    results.push({
                        appid: game.appid,
                        name: gameData.name,
                        image: gameData.header_image,
                        is_free: gameData.is_free,
                        price: gameData.price_overview,
                        description: gameData.short_description || 'No description available',
                        recommendation: gameData.recommendations ? gameData.recommendations.total : 0
                    })
                }
            } catch (error) {
                console.log('Failed to fetch', error)
            }
        }

        return removeDuplicateGames(results)
    } catch (error) {
        console.log(error)
        throw new Error(error.message)
    }
}

const gameDetails = async (appId) => {
    const response = await axios.get(`https://store.steampowered.com/api/appdetails?appids=${appId}`)
    return response.data
}

module.exports = {
    searchGame,
    gameDetails
}