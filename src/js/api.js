//  api.js — Capa de acceso a CoinGecko API
//  Toda llamada HTTP vive acá. El resto del app consume esto.

const BASE_URL = 'https://api.coingecko.com/api/v3'
import { CG_API_KEY } from './config.js'

// Utilidad interna: fetch con manejo de errores centralizado
async function fetchJSON(endpoint) {
    const separator = endpoint.includes('?') ? '&' : '?'
    const response  = await fetch(`${BASE_URL}${endpoint}${separator}x_cg_demo_api_key=${CG_API_KEY}`)

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

// ------------------------------------------------------------
//  5. Búsqueda de coins por nombre o símbolo
//     @param {string} query — 'bitcoin' | 'sol' | 'eth'...
// ------------------------------------------------------------
export async function searchCoins(query) {
    if (!query || query.trim().length < 2) return []
    const data = await fetchJSON(`/search?query=${encodeURIComponent(query.trim())}`)
  // Devolver solo los primeros 6 resultados relevantes
    return data.coins?.slice(0, 6) || []
}

// ------------------------------------------------------------
//  6. Fear & Greed Index
//     No requiere API key — alternative.me
// ------------------------------------------------------------
export async function getFearGreedIndex() {
    const response = await fetch('https://api.alternative.me/fng/?limit=7')
    if (!response.ok) throw new Error('Fear & Greed API error')
    const data = await response.json()
  return data.data // array de 7 días, [0] es hoy
}

// ------------------------------------------------------------
//  7. Datos detallados de una coin para el comparador
//     @param {string} coinId — 'bitcoin' | 'ethereum' ...
// ------------------------------------------------------------
export async function getCoinDetails(coinId) {
    return fetchJSON(
    `/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`
    )
}