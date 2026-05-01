// ============================================================
//  ui.js — Capa de presentación
//  Recibe datos ya procesados y los vuelca al DOM.
// ============================================================

// Colores por coin (para íconos y barras del portfolio)
const COIN_COLORS = {
    bitcoin:     { bg: '#2a1a00', color: '#f59e0b', symbol: '₿' },
    ethereum:    { bg: '#1a1a2e', color: '#818cf8', symbol: 'Ξ' },
    solana:      { bg: '#0d1a1a', color: '#34d399', symbol: '◎' },
    binancecoin: { bg: '#1a1500', color: '#eab308', symbol: 'B' },
}

// ------------------------------------------------------------
//  Helpers
// ------------------------------------------------------------
function formatUSD(n) {
    return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: n > 1_000_000_000 ? 'compact' : 'standard',
    maximumFractionDigits: n > 1000 ? 0 : 2,
    }).format(n)
}

function formatPct(n) {
    const sign = n >= 0 ? '▲' : '▼'
    return `${sign} ${Math.abs(n).toFixed(2)}%`
}

function setChange(el, value) {
    if (!el) return
    el.textContent = formatPct(value)
    el.className = 'stat-change ' + (value >= 0 ? 'up' : 'down')
}

// ------------------------------------------------------------
//  1. Stat cards superiores
// ------------------------------------------------------------
export function renderGlobalStats(data) {
    const marketCap = data.total_market_cap.usd
    const volume    = data.total_volume.usd
    const dominance = data.market_cap_percentage.btc

    document.getElementById('market-cap').textContent = formatUSD(marketCap)
    document.getElementById('volume').textContent      = formatUSD(volume)
    document.getElementById('btc-dominance').textContent = `${dominance.toFixed(1)}%`

    setChange(document.getElementById('market-cap-change'), data.market_cap_change_percentage_24h_usd)
}

// ------------------------------------------------------------
//  2. Lista de coins
// ------------------------------------------------------------
export function renderCoinList(coins) {
    const container = document.getElementById('coin-list')
    container.innerHTML = ''

    coins.forEach(coin => {
    const meta   = COIN_COLORS[coin.id] || { bg: '#1a1a2e', color: '#9ca3af', symbol: '?' }
    const change = coin.price_change_percentage_24h
    const isUp   = change >= 0

    const row = document.createElement('div')
    row.className = 'coin-row'
    row.innerHTML = `
        <div class="coin-icon" style="background:${meta.bg}; color:${meta.color}">
        ${meta.symbol}
        </div>
        <div class="coin-info">
        <p class="coin-name">${coin.name}</p>
        <p class="coin-symbol">${coin.symbol.toUpperCase()}</p>
        </div>
        <div class="coin-right">
        <p class="coin-price">${formatUSD(coin.current_price)}</p>
        <p class="coin-change ${isUp ? 'up' : 'down'}">${formatPct(change)}</p>
        </div>
    `
    container.appendChild(row)
    })
}

// ------------------------------------------------------------
//  3. Portfolio
// ------------------------------------------------------------
export function renderPortfolio(holdings, prices) {
    const container = document.getElementById('portfolio-list')
    container.innerHTML = ''

    if (holdings.length === 0) {
    container.innerHTML = `<p style="font-size:12px; color:var(--text-muted); text-align:center; padding: 16px 0">
        Sin activos. Agregá uno con el botón de abajo.
    </p>`
    document.getElementById('portfolio-total').textContent = '$0.00'
    return
    }

  // Calcular valor total
    const totalValue = holdings.reduce((acc, h) => {
    const price = prices[h.coinId]?.usd || 0
    return acc + price * h.amount
    }, 0)

    document.getElementById('portfolio-total').textContent = formatUSD(totalValue)

    holdings.forEach(h => {
    const meta  = COIN_COLORS[h.coinId] || { color: '#9ca3af' }
    const price = prices[h.coinId]?.usd || 0
    const value = price * h.amount
    const pct   = totalValue > 0 ? (value / totalValue) * 100 : 0

    const item = document.createElement('div')
    item.className = 'portfolio-item'
    item.innerHTML = `
        <div class="portfolio-item-header">
        <span class="portfolio-item-name">${h.symbol} · ${h.amount}</span>
        <span class="portfolio-item-value">${formatUSD(value)}</span>
        </div>
        <div class="portfolio-bar-track">
        <div class="portfolio-bar-fill"
                style="width:${pct.toFixed(1)}%; background:${meta.color}">
        </div>
        </div>
    `
    container.appendChild(item)
    })
}

// ------------------------------------------------------------
//  4. Convertidor
// ------------------------------------------------------------
export function renderConversion(amount, fromId, toCurrency, prices) {
    const price  = prices[fromId]?.[toCurrency] || 0
  const result = amount * price

    const symbols = { usd: '$', eur: '€', ars: '$' }
    const prefix  = symbols[toCurrency] || ''

    document.getElementById('conv-result').textContent =
    `${prefix}${result.toLocaleString('en-US', { maximumFractionDigits: 2 })}`

    document.getElementById('conv-rate').textContent =
    `1 ${fromId.toUpperCase().slice(0,3)} = ${prefix}${price.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${toCurrency.toUpperCase()}`
}