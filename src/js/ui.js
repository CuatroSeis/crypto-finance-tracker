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

// ------------------------------------------------------------
//  Fear & Greed Index
// ------------------------------------------------------------

// Color según el valor 0-100
function getFGColor(value) {
  if (value <= 24)  return '#f87171' // Extreme Fear — rojo
  if (value <= 44)  return '#fb923c' // Fear — naranja
  if (value <= 55)  return '#facc15' // Neutral — amarillo
  if (value <= 74)  return '#4ade80' // Greed — verde claro
  return '#34d399'                   // Extreme Greed — verde
}

function getFGLabel(classification) {
    const map = {
    'Extreme Fear':  'Miedo extremo',
    'Fear':          'Miedo',
    'Neutral':       'Neutral',
    'Greed':         'Codicia',
    'Extreme Greed': 'Codicia extrema',
    }
    return map[classification] || classification
}

export function renderFearGreed(data) {
    if (!data || !data.length) return

    const today   = data[0]
    const value   = parseInt(today.value)
    const color   = getFGColor(value)

  // Actualizar valor y label
    const valueEl = document.getElementById('fg-value')
    const labelEl = document.getElementById('fg-label')
    if (valueEl) { valueEl.textContent = value; valueEl.style.color = color }
    if (labelEl)   labelEl.textContent = getFGLabel(today.value_classification)

  // Dibujar gauge (semicírculo)
    const canvas = document.getElementById('fg-gauge')
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const cx  = 100
    const cy  = 100
    const r   = 80

    ctx.clearRect(0, 0, 200, 110)

  // Track gris
    ctx.beginPath()
    ctx.arc(cx, cy, r, Math.PI, 0)
    ctx.lineWidth   = 14
    ctx.strokeStyle = '#1e1e3a'
    ctx.stroke()

  // Arco de valor
  const angle = Math.PI + (value / 100) * Math.PI
    ctx.beginPath()
    ctx.arc(cx, cy, r, Math.PI, angle)
    ctx.lineWidth   = 14
    ctx.strokeStyle = color
    ctx.lineCap     = 'round'
    ctx.stroke()

  // Aguja
  const needleAngle = Math.PI + (value / 100) * Math.PI
  const nx = cx + (r - 20) * Math.cos(needleAngle)
  const ny = cy + (r - 20) * Math.sin(needleAngle)
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(nx, ny)
    ctx.lineWidth   = 2
    ctx.strokeStyle = '#f1f5f9'
    ctx.lineCap     = 'round'
    ctx.stroke()

  // Punto central
    ctx.beginPath()
  ctx.arc(cx, cy, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#f1f5f9'
    ctx.fill()

  // Historial 7 días
    const historyEl = document.getElementById('fg-history-list')
    if (!historyEl) return

    historyEl.innerHTML = data.map(d => {
    const v     = parseInt(d.value)
    const c     = getFGColor(v)
    const date  = new Date(d.timestamp * 1000)
    const label = date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })

    return `
        <div class="fg-history-item">
        <span class="fg-history-date">${label}</span>
        <div class="fg-history-bar-wrap">
            <div class="fg-history-bar" style="width:${v}%; background:${c};"></div>
        </div>
        <span class="fg-history-score" style="color:${c};">${v}</span>
        <span class="fg-history-tag" style="color:${c};">
            ${getFGLabel(d.value_classification)}
        </span>
        </div>
    `
    }).join('')
}

// ------------------------------------------------------------
//  Comparador de coins
// ------------------------------------------------------------
let compChartInstance = null

export function renderComparatorChart(dataA, dataB, coinA, coinB, days) {
    const canvas = document.getElementById('comp-chart')
    if (!canvas) return

    if (compChartInstance) { compChartInstance.destroy(); compChartInstance = null }

    const format = ts => {
    const d = new Date(ts)
    return days <= 7
        ? d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' })
        : d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
    }

  // Normalizar a % de cambio desde el inicio para comparar en la misma escala
    const normalize = prices => {
    const base = prices[0][1]
    return prices.map(([, p]) => parseFloat(((p - base) / base * 100).toFixed(2)))
    }

    const labelsA  = dataA.prices.map(([ts]) => format(ts))
    const valuesA  = normalize(dataA.prices)
    const valuesB  = normalize(dataB.prices)

    compChartInstance = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
        labels: labelsA,
        datasets: [
        {
            label:           coinA.symbol.toUpperCase(),
            data:            valuesA,
            borderColor:     '#a78bfa',
            backgroundColor: 'rgba(167,139,250,0.06)',
            borderWidth:     2,
            pointRadius:     0,
            fill:            true,
            tension:         0.4,
        },
        {
            label:           coinB.symbol.toUpperCase(),
            data:            valuesB,
            borderColor:     '#60a5fa',
            backgroundColor: 'rgba(96,165,250,0.06)',
            borderWidth:     2,
            pointRadius:     0,
            fill:            true,
            tension:         0.4,
        }
        ]
    },
    options: {
        responsive:          true,
        maintainAspectRatio: false,
        plugins: {
        legend: {
            display:  true,
            position: 'top',
            labels:   { color: '#9ca3af', font: { size: 12 }, boxWidth: 12 }
        },
        tooltip: {
            callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y > 0 ? '+' : ''}${ctx.parsed.y}%`
            }
        }
        },
        scales: {
        x: {
            ticks: { color: '#4b5563', maxTicksLimit: 6, font: { size: 11 } },
            grid:  { color: '#1e1e3a' },
        },
        y: {
            ticks: {
            color: '#4b5563',
            font:  { size: 11 },
            callback: v => `${v > 0 ? '+' : ''}${v}%`
            },
            grid:     { color: '#1e1e3a' },
            position: 'right',
        }
        }
    }
    })

  // Título del chart
    const titleEl = document.getElementById('comp-chart-title')
    if (titleEl) {
    titleEl.textContent = `${coinA.name} vs ${coinB.name} — variación %`
    }
}

export function renderComparatorMetrics(detailsA, detailsB) {
    const container = document.getElementById('comp-metrics')
    if (!container) return

    const md = d => d?.market_data || {}

    const formatVal = (n, isCurrency = true) => {
    if (!n && n !== 0) return '—'
    return isCurrency ? formatUSD(n) : n.toLocaleString('en-US', { maximumFractionDigits: 2 })
    }

    const pctClass = n => n >= 0 ? 'up' : 'down'
    const pctText  = n => n == null ? '—' : `${n >= 0 ? '▲' : '▼'} ${Math.abs(n).toFixed(2)}%`

    const renderCard = (details, color) => {
    const m = md(details)
    return `
        <div class="comp-metric-card" style="border-top: 2px solid ${color};">
        <div class="comp-metric-header">
            ${details.image?.small
            ? `<img src="${details.image.small}" alt="${details.symbol}" />`
            : ''
            }
            <div>
            <p class="comp-metric-name">${details.name}</p>
            <p class="comp-metric-symbol">${details.symbol?.toUpperCase()}</p>
            </div>
        </div>

        <div class="comp-metric-row">
            <span class="comp-metric-key">Precio actual</span>
            <span class="comp-metric-value">${formatVal(m.current_price?.usd)}</span>
        </div>
        <div class="comp-metric-row">
            <span class="comp-metric-key">Variación 24h</span>
            <span class="comp-metric-value ${pctClass(m.price_change_percentage_24h)}">
            ${pctText(m.price_change_percentage_24h)}
            </span>
        </div>
        <div class="comp-metric-row">
            <span class="comp-metric-key">Variación 7d</span>
            <span class="comp-metric-value ${pctClass(m.price_change_percentage_7d)}">
            ${pctText(m.price_change_percentage_7d)}
            </span>
        </div>
        <div class="comp-metric-row">
            <span class="comp-metric-key">Variación 30d</span>
            <span class="comp-metric-value ${pctClass(m.price_change_percentage_30d)}">
            ${pctText(m.price_change_percentage_30d)}
            </span>
        </div>
        <div class="comp-metric-row">
            <span class="comp-metric-key">Market Cap</span>
            <span class="comp-metric-value">${formatVal(m.market_cap?.usd)}</span>
        </div>
        <div class="comp-metric-row">
            <span class="comp-metric-key">Volumen 24h</span>
            <span class="comp-metric-value">${formatVal(m.total_volume?.usd)}</span>
        </div>
        <div class="comp-metric-row">
            <span class="comp-metric-key">Máx. histórico</span>
            <span class="comp-metric-value">${formatVal(m.ath?.usd)}</span>
        </div>
        <div class="comp-metric-row">
            <span class="comp-metric-key">Ranking</span>
            <span class="comp-metric-value">#${details.market_cap_rank || '—'}</span>
        </div>
        </div>
    `
    }

    container.innerHTML =
    renderCard(detailsA, '#a78bfa') +
    renderCard(detailsB, '#60a5fa')
}

// ------------------------------------------------------------
//  Error states
// ------------------------------------------------------------
export function showErrorState(containerId, message, onRetry) {
    const container = document.getElementById(containerId)
    if (!container) return

    container.innerHTML = `
    <div class="error-state">
        <div class="error-state-icon">⚠️</div>
        <p class="error-state-title">Algo salió mal</p>
        <p class="error-state-desc">${message}</p>
        ${onRetry
        ? `<button class="error-state-btn" id="retry-${containerId}">
                Reintentar
            </button>`
        : ''
        } 
    </div>
    `

    if (onRetry) {
    document.getElementById(`retry-${containerId}`)
        ?.addEventListener('click', onRetry)
    }
}

export function showComparatorPlaceholder() {
    const canvas = document.getElementById('comp-chart')
    if (!canvas) return

    const wrapper = canvas.closest('.chart-wrapper')
    if (!wrapper) return

    wrapper.innerHTML = `
    <div class="comp-placeholder">
        <div class="comp-placeholder-icon">📊</div>
        <p class="comp-placeholder-title">Seleccioná dos coins para comparar</p>
        <p class="comp-placeholder-desc">Usá los buscadores de arriba para elegir Coin A y Coin B</p>
    </div>
    `
}