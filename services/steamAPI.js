const axios = require('axios')

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

const searchGame = async(gameName) => {
    try {
        const response = await axios.get(' http://api.steampowered.com/ISteamApps/GetAppList/v0002/?format=json')
        const allApps = response.data.applist.apps

        //filtering based on game name
        const games = allApps.filter(app => app.name.toLowerCase().includes(gameName.toLowerCase()))

        if(games.length > 50){
            throw new Error('Give more specific name')
        }

        const results = []
        // let id = 1091500
        // const gameResponse = await axios.get(`https://store.steampowered.com/api/appdetails?appids=${id}`)
        // console.log(gameResponse)
        // console.log(gameResponse.data[id])
        for(const game of games){
            console.log(`Fetching details for ${game.name} (ID: ${game.appid})...`)

            try {
                //await delay(500)

                const gameResponse = await axios.get(`https://store.steampowered.com/api/appdetails?appids=${game.appid}`)
                if(gameResponse.data[game.appid].success){
                    gameData = gameResponse.data[game.appid].data
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

module.exports = {
    searchGame
}