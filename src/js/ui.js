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
export function renderPortfolio(holdings, prices, state) {
    const container = document.getElementById('portfolio-list')
    const emptyEl   = document.getElementById('portfolio-empty')
    if (!container) return

    if (holdings.length === 0) {
    if (emptyEl) emptyEl.style.display = 'block'
    document.getElementById('pf-total-value')?.setAttribute('textContent', '$0.00')
    return
    }

    if (emptyEl) emptyEl.style.display = 'none'

    let totalValue    = 0
    let totalInvested = 0
    let bestCoin      = null
    let worstCoin     = null
    let bestPnlPct    = -Infinity
    let worstPnlPct   = Infinity

  // Primera pasada — calcular totales
    const rows = holdings.map(h => {
    const currentPrice = prices[h.coinId]?.usd || 0
    const value        = currentPrice * h.amount
    const invested     = (h.buyPrice || 0) * h.amount
    const pnl          = value - invested
    const pnlPct       = invested > 0 ? (pnl / invested) * 100 : 0

    totalValue    += value
    totalInvested += invested

    if (pnlPct > bestPnlPct)  { bestPnlPct  = pnlPct;  bestCoin  = h }
    if (pnlPct < worstPnlPct) { worstPnlPct = pnlPct;  worstCoin = h }

    return { ...h, currentPrice, value, invested, pnl, pnlPct }
    })

  // Actualizar stat cards de la vista portfolio
    const totalPnl    = totalValue - totalInvested
  const totalPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0
    const isUp        = totalPnl >= 0

    const setEl = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text }

    setEl('pf-total-value',    formatUSD(totalValue))
    setEl('pf-total-invested', formatUSD(totalInvested))
    setEl('pf-assets-count',   `${holdings.length} activo${holdings.length !== 1 ? 's' : ''}`)
    setEl('pf-best-asset',     bestCoin?.symbol  || '—')
    setEl('pf-worst-asset',    worstCoin?.symbol || '—')

    const pnlEl = document.getElementById('pf-total-pnl')
    if (pnlEl) {
    pnlEl.textContent = `${isUp ? '▲' : '▼'} ${formatUSD(Math.abs(totalPnl))} (${Math.abs(totalPnlPct).toFixed(2)}%)`
    pnlEl.className   = 'stat-change ' + (isUp ? 'up' : 'down')
    }

    const bestEl = document.getElementById('pf-best-pnl')
    if (bestEl && bestCoin) {
    bestEl.textContent = `▲ ${Math.abs(bestPnlPct).toFixed(2)}%`
    bestEl.className   = 'stat-change up'
    }

    const worstEl = document.getElementById('pf-worst-pnl')
    if (worstEl && worstCoin) {
    worstEl.textContent = `${worstPnlPct >= 0 ? '▲' : '▼'} ${Math.abs(worstPnlPct).toFixed(2)}%`
    worstEl.className   = 'stat-change ' + (worstPnlPct >= 0 ? 'up' : 'down')
    }

  // Renderizar filas
    container.innerHTML = rows.map(r => {
    const color = COIN_COLORS[r.coinId]?.color || getCoinColor(r.coinId, rows.indexOf(r))
    const meta  = { color }
    const isUp  = r.pnl >= 0
    const pct   = totalValue > 0 ? (r.value / totalValue) * 100 : 0

    return `
    <div class="portfolio-row">
    <div style="display:flex; align-items:center; gap:8px;">
        ${r.thumb
        ? `<img src="${r.thumb}" alt="${r.symbol}"
                style="width:24px; height:24px; border-radius:50%; flex-shrink:0;" />`
        : `<div style="width:24px; height:24px; border-radius:50%; flex-shrink:0;
                        background:${color}22; border:1px solid ${color};"></div>`
        }
        <div>
        <span style="font-size:13px; font-weight:500; color:${color};">${r.symbol}</span>
        <div class="portfolio-bar-track" style="width:50px; margin-top:3px;">
            <div class="portfolio-bar-fill"
                style="width:${pct.toFixed(1)}%; background:${color};"></div>
        </div>
        </div>
    </div>
    <span style="color:var(--text-secondary);">${r.amount}</span>
    ...
        <span style="color:var(--text-secondary);">${formatUSD(r.buyPrice || 0)}</span>
        <span style="color:var(--text-primary);">${formatUSD(r.currentPrice)}</span>
        <span style="color:var(--text-primary); font-weight:500;">${formatUSD(r.value)}</span>
        <div>
            <p style="font-size:13px; color:${isUp ? 'var(--accent-green)' : 'var(--accent-red)'};">
            ${isUp ? '▲' : '▼'} ${formatUSD(Math.abs(r.pnl))}
            </p>
            <p style="font-size:11px; color:${isUp ? 'var(--accent-green)' : 'var(--accent-red)'};">
            ${Math.abs(r.pnlPct).toFixed(2)}%
            </p>
        </div>
        <button class="btn-remove-asset"
                data-coin="${r.coinId}"
                data-symbol="${r.symbol}"
                style="background:transparent; border:none; color:var(--text-muted);
                        cursor:pointer; font-size:16px; padding:4px; line-height:1;"
                title="Eliminar">✕</button>
        </div>
    `
    }).join('')
}


// ------------------------------------------------------------
//  4. Convertidor
// ------------------------------------------------------------
export function renderConversion(amount, fromId, toCurrency, prices) {
    if (!prices[fromId]) return

    const price  = prices[fromId][toCurrency] || 0
  const result = amount * price

    const currencySymbols = { usd: '$', eur: '€', ars: '$' }
    const currencyNames   = { usd: 'USD', eur: 'EUR', ars: 'ARS' }
    const prefix          = currencySymbols[toCurrency] || ''
    const suffix          = currencyNames[toCurrency]   || toCurrency.toUpperCase()

    const resultEl = document.getElementById('conv-result')
    const rateEl   = document.getElementById('conv-rate')

  // Salir silenciosamente si los elementos no existen en el DOM actual
    if (!resultEl || !rateEl) return

    resultEl.textContent = `${prefix}${result.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
    })}`

    rateEl.textContent = `1 ${fromId.charAt(0).toUpperCase() + fromId.slice(1)} = ${prefix}${price.toLocaleString('en-US', {
    maximumFractionDigits: 2
    })} ${suffix}`
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

// ------------------------------------------------------------
//  Skeletons
// ------------------------------------------------------------
export function showStatCardSkeletons() {
    const ids = ['market-cap', 'volume', 'btc-dominance', 'portfolio-total']
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
//  Toast notifications
// ------------------------------------------------------------
function getToastContainer() {
    let container = document.getElementById('toast-container')
    if (!container) {
    container = document.createElement('div')
    container.id = 'toast-container'
    container.className = 'toast-container'
    document.body.appendChild(container)
    }
    return container
}

const TOAST_ICONS = { success: '✓', error: '✕', info: 'i' }

export function showToast(message, type = 'info', duration = 3500) {
    const container = getToastContainer()
    const toast     = document.createElement('div')
    toast.className = `toast ${type}`
    toast.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || 'i'}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" aria-label="Cerrar">✕</button>
    `
    const remove = () => {
    toast.classList.add('toast-out')
    toast.addEventListener('animationend', () => toast.remove(), { once: true })
    }
    toast.querySelector('.toast-close').addEventListener('click', remove)
    container.appendChild(toast)
    setTimeout(remove, duration)
}

// ------------------------------------------------------------
//  Donut chart del portfolio
// ------------------------------------------------------------
let donutInstance = null

const DONUT_COLORS = {
    bitcoin:     '#f59e0b',
    ethereum:    '#818cf8',
    solana:      '#34d399',
    binancecoin: '#eab308',
}

// Color de fallback para coins no conocidas
function getCoinColor(coinId, index) {
    const fallbacks = ['#a78bfa', '#60a5fa', '#f87171', '#34d399', '#fb923c']
    return DONUT_COLORS[coinId] || fallbacks[index % fallbacks.length]
}

export function renderDonutChart(holdings, prices) {
    const canvas = document.getElementById('portfolio-chart')
    if (!canvas) return

  // Estado vacío
    if (holdings.length === 0) {
    if (donutInstance) {
        donutInstance.destroy()
        donutInstance = null
    }
    const centerValue = document.getElementById('donut-total')
    const legend      = document.getElementById('donut-legend')
    if (centerValue) centerValue.textContent = '$0.00'
    if (legend)      legend.innerHTML = `
        <p style="font-size:12px; color:var(--text-muted); text-align:center;">
        Sin activos en el portfolio.
        </p>`
    return
    }

  // Calcular valores
    const data = holdings.map((h, i) => {
    const price = prices[h.coinId]?.usd || 0
    const value = price * h.amount
    return {
        coinId: h.coinId,
        symbol: h.symbol,
        value,
        color: getCoinColor(h.coinId, i),
    }
    })

    const total = data.reduce((acc, d) => acc + d.value, 0)

  // Actualizar valor central
    const centerValue = document.getElementById('donut-total')
    if (centerValue) centerValue.textContent = formatUSD(total)

  // Destruir instancia anterior si existe
    if (donutInstance) {
    donutInstance.destroy()
    donutInstance = null
    }

  // Crear chart
    donutInstance = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
        labels:   data.map(d => d.symbol),
        datasets: [{
        data:             data.map(d => d.value),
        backgroundColor: data.map(d => d.color),
        borderColor:     '#0a0a15',
        borderWidth:     3,
        hoverOffset:     6,
        }]
    },
    options: {
        responsive:          false,
        maintainAspectRatio: false,
        cutout:              '72%',
        plugins: {
        legend: { display: false },
        tooltip: {
            callbacks: {
            label: ctx => {
              const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0
                return ` ${ctx.label}: ${formatUSD(ctx.parsed)} (${pct}%)`
            }
            }
        }
        }
    }
    })

  // Leyenda personalizada
    const legend = document.getElementById('donut-legend')
    if (!legend) return

    legend.innerHTML = data.map(d => {
    const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : 0
    return `
        <div class="legend-item">
        <div class="legend-dot" style="background:${d.color};"></div>
        <span class="legend-name">${d.symbol}</span>
        <span class="legend-pct">${pct}%</span>
        <span class="legend-value">${formatUSD(d.value)}</span>
        </div>
    `
    }).join('')
}