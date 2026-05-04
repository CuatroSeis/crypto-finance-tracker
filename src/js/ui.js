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
//  Skeletons — muestran mientras cargan los datos reales
// ------------------------------------------------------------
export function showStatCardSkeletons() {
    const ids = ['market-cap', 'volume', 'btc-dominance']
    ids.forEach(id => {
    const el = document.getElementById(id)
    if (!el) return
    el.innerHTML = `<div class="skeleton skeleton-value"></div>`
    })

    ;['market-cap-change', 'volume-change', 'dominance-change', 'portfolio-change'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.innerHTML = `<div class="skeleton skeleton-text short"></div>`
    })
}

export function showCoinListSkeleton() {
    const container = document.getElementById('coin-list')
    if (!container) return
    container.innerHTML = Array(4).fill('').map(() => `
    <div class="skeleton-coin-row">
        <div class="skeleton skeleton-circle"></div>
        <div style="flex:1;">
        <div class="skeleton skeleton-text mid"></div>
        <div class="skeleton skeleton-text short"></div>
        </div>
        <div style="text-align:right; width:80px;">
        <div class="skeleton skeleton-text wide"></div>
        <div class="skeleton skeleton-text mid"></div>
        </div>
    </div>
    `).join('')
}

export function showChartSkeleton() {
    const wrapper = document.querySelector('.chart-wrapper')
    if (!wrapper) return
    wrapper.innerHTML = `<div class="skeleton skeleton-chart"></div>`
}

export function restoreChart(canvasId = 'price-chart') {
    const wrapper = document.querySelector('.chart-wrapper')
    if (!wrapper) return
    if (!wrapper.querySelector('canvas')) {
    wrapper.innerHTML = `<canvas id="${canvasId}"></canvas>`
    }
}

export function showPortfolioSkeleton() {
    const container = document.getElementById('portfolio-summary')
    if (!container) return
    container.innerHTML = Array(2).fill('').map(() => `
    <div class="skeleton-coin-row">
        <div class="skeleton skeleton-circle"></div>
        <div style="flex:1;">
        <div class="skeleton skeleton-text mid"></div>
        </div>
        <div style="width:70px; text-align:right;">
        <div class="skeleton skeleton-text wide"></div>
        </div>
    </div>
    `).join('')
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

// ------------------------------------------------------------
//  Conversiones rápidas (vista Converter)
// ------------------------------------------------------------
export function renderQuickConversions(prices) {
    const container = document.getElementById('conv-reference-table')
    if (!container) return

    const pairs = [
    { from: 'bitcoin',  symbol: 'BTC', amount: 1    },
    { from: 'bitcoin',  symbol: 'BTC', amount: 0.01 },
    { from: 'ethereum', symbol: 'ETH', amount: 1    },
    { from: 'ethereum', symbol: 'ETH', amount: 10   },
    { from: 'solana',   symbol: 'SOL', amount: 1    },
    { from: 'solana',   symbol: 'SOL', amount: 100  },
    ]

    container.innerHTML = pairs.map(p => {
    const usd = (prices[p.from]?.usd || 0) * p.amount
    const ars = (prices[p.from]?.ars || 0) * p.amount
    return `
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr;
                    padding:10px 0; border-bottom:1px solid var(--border);
                    font-size:12px; align-items:center;">
        <span style="color:var(--text-secondary);">${p.amount} ${p.symbol}</span>
        <span style="color:var(--accent-blue);">${formatUSD(usd)}</span>
        <span style="color:var(--text-muted);">ARS ${ars.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
        </div>
    `
    }).join('')
}

// ------------------------------------------------------------
//  Grid de precios actuales (vista Converter)
// ------------------------------------------------------------
export function renderPricesGrid(prices) {
    const container = document.getElementById('conv-prices-grid')
    if (!container) return

    const coins = [
    { id: 'bitcoin',     symbol: 'BTC', name: 'Bitcoin'  },
    { id: 'ethereum',    symbol: 'ETH', name: 'Ethereum' },
    { id: 'solana',      symbol: 'SOL', name: 'Solana'   },
    { id: 'binancecoin', symbol: 'BNB', name: 'BNB'      },
    ]

    container.innerHTML = coins.map(c => {
    const usd = prices[c.id]?.usd || 0
    const eur = prices[c.id]?.eur || 0
    const meta = COIN_COLORS[c.id] || { color: '#9ca3af' }
    return `
        <div style="background:var(--bg-base); border:1px solid var(--border);
                    border-radius:var(--radius-sm); padding:14px;">
        <p style="font-size:11px; color:${meta.color}; font-weight:500; margin-bottom:8px;">
            ${c.symbol}
        </p>
        <p style="font-size:16px; font-weight:600; color:var(--text-primary); margin-bottom:4px;">
            ${formatUSD(usd)}
        </p>
        <p style="font-size:11px; color:var(--text-muted);">€${eur.toLocaleString('en-US', { maximumFractionDigits: 2 })}</p>
        </div>
    `
    }).join('')
}

export function renderPortfolioSummary(holdings, prices) {
    const container = document.getElementById('portfolio-summary')
    if (!container) return

    if (holdings.length === 0) {
    container.innerHTML = `
        <p style="font-size:12px; color:var(--text-muted); text-align:center; padding:16px 0;">
        Sin activos. Agregá uno en la vista Portfolio.
        </p>`
    document.getElementById('portfolio-total').textContent  = '$0.00'
    document.getElementById('portfolio-change').textContent = '—'
    return
    }

    let totalValue    = 0
    let totalInvested = 0

    holdings.forEach(h => {
    const price    = prices[h.coinId]?.usd || 0
    totalValue    += price * h.amount
    totalInvested += (h.buyPrice || 0) * h.amount
    })

    const pnl    = totalValue - totalInvested
    const pnlPct = totalInvested > 0 ? (pnl / totalInvested) * 100 : 0
    const isUp   = pnl >= 0

    document.getElementById('portfolio-total').textContent = formatUSD(totalValue)
    const changeEl = document.getElementById('portfolio-change')
    changeEl.textContent = `${isUp ? '▲' : '▼'} ${formatUSD(Math.abs(pnl))} (${Math.abs(pnlPct).toFixed(2)}%)`
    changeEl.className   = 'stat-change ' + (isUp ? 'up' : 'down')

    container.innerHTML = holdings.map(h => {
    const meta  = COIN_COLORS[h.coinId] || { color: '#9ca3af' }
    const price = prices[h.coinId]?.usd || 0
    const value = price * h.amount
    const pct   = totalValue > 0 ? (value / totalValue) * 100 : 0
    return `
        <div style="display:flex; justify-content:space-between; align-items:center;
                    padding:8px 0; border-bottom:1px solid var(--border);">
        <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:12px; font-weight:500; color:${meta.color};">${h.symbol}</span>
            <span style="font-size:11px; color:var(--text-muted);">${h.amount}</span>
        </div>
        <div style="text-align:right;">
            <p style="font-size:12px; font-weight:500; color:var(--text-primary);">${formatUSD(value)}</p>
            <p style="font-size:10px; color:var(--text-muted);">${pct.toFixed(1)}%</p>
        </div>
        </div>
    `
    }).join('')
}