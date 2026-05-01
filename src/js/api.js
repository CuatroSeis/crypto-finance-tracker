//  api.js — Capa de acceso a CoinGecko API
//  Toda llamada HTTP vive acá. El resto del app consume esto.

const BASE_URL = 'https://api.coingecko.com/api/v3'

// Utilidad interna: fetch con manejo de errores centralizado
async function fetchJSON(endpoint) {
    const response = await fetch(`${BASE_URL}${endpoint}`)

    if (!response.ok) {
    throw new Error(`API error ${response.status}: ${endpoint}`)
    }

    return response.json()
}

//  1. Datos globales del mercado
//     → market cap total, volumen 24h, dominancia BTC
export async function getGlobalData() {
    const data = await fetchJSON('/global')
    return data.data
}

//  Lista de coins con precio actual y cambio 24h
//     @param {string[]} ids  — ['bitcoin', 'ethereum', ...]
//     @param {string}   vs   — moneda base, default 'usd'

export async function getCoinsMarket(ids = ['bitcoin', 'ethereum', 'solana', 'binancecoin'], vs = 'usd') {
    const idsParam = ids.join(',')
    return fetchJSON(
    `/coins/markets?vs_currency=${vs}&ids=${idsParam}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
    )
}

//  3. Historial de precios para el gráfico
//     @param {string} coinId — 'bitcoin' | 'ethereum' | ...
//     @param {number} days   — 7 | 30 | 90

export async function getCoinHistory(coinId, days = 7) {
    return fetchJSON(
    `/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
    )
}


//  4. Precio simple — usado por el convertidor
//     @param {string[]} coinIds    — ['bitcoin', 'ethereum']
//     @param {string[]} currencies — ['usd', 'eur', 'ars']

export async function getSimplePrices(coinIds, currencies) {
    const ids  = coinIds.join(',')
    const curr = currencies.join(',')
    return fetchJSON(`/simple/price?ids=${ids}&vs_currencies=${curr}`)
}