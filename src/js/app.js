// ============================================================
//  app.js — Punto de entrada y orquestador principal
// ============================================================

import { getGlobalData, getCoinsMarket, getCoinHistory, getSimplePrices } from './api.js'
import { initRouter, onEnter } from './router.js'
// Agregar al import de ui.js
import { renderGlobalStats, renderCoinList, renderPortfolio, renderPortfolioSummary, renderConversion, renderQuickConversions, renderPricesGrid } from './ui.js'

// ------------------------------------------------------------
//  Estado de la app
// ------------------------------------------------------------
const state = {
    coins:         ['bitcoin', 'ethereum', 'solana', 'binancecoin'],
    chartCoin:     'bitcoin',
    chartDays:     7,
    holdings:      JSON.parse(localStorage.getItem('portfolio') || '[]'),
    prices:        {},
    chartInstance: null,
    chartReady:    false,
}

// ------------------------------------------------------------
//  Chart.js — se inicializa solo cuando el canvas es visible
// ------------------------------------------------------------
function initChart() {
    if (state.chartReady) return
    const canvas = document.getElementById('price-chart')
    if (!canvas) return

    state.chartInstance = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
        labels:   [],
        datasets: [{
        label:           'Precio USD',
        data:            [],
        borderColor:     '#a78bfa',
        backgroundColor: 'rgba(167,139,250,0.08)',
        borderWidth:     2,
        pointRadius:     0,
        fill:            true,
        tension:         0.4,
        }]
    },
    options: {
        responsive:          true,
        maintainAspectRatio: false,
        plugins: {
        legend: { display: false },
        tooltip: {
            callbacks: {
            label: ctx => `$${ctx.parsed.y.toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
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
            callback: v => `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
            },
            grid:     { color: '#1e1e3a' },
            position: 'right',
        }
        } 
    }
    })

    state.chartReady = true
}

// ------------------------------------------------------------
//  Gráfico
// ------------------------------------------------------------
function updateChartWithData(data) {
    if (!state.chartInstance) return

    const labels = data.prices.map(([ts]) => {
    const d = new Date(ts)
    return state.chartDays <= 7
        ? d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' })
        : d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
    })

    state.chartInstance.data.labels           = labels
    state.chartInstance.data.datasets[0].data = data.prices.map(([, p]) => p)
    state.chartInstance.update()
}

async function updateChart() {
    const data = await getCoinHistory(state.chartCoin, state.chartDays)
    updateChartWithData(data)
}

// ------------------------------------------------------------
//  Convertidor rápido (widget del dashboard)
// ------------------------------------------------------------
async function updateConverter() {
    const amountEl = document.getElementById('conv-amount')
    const fromEl   = document.getElementById('conv-from')
    const toEl     = document.getElementById('conv-to')
    if (!amountEl || !fromEl || !toEl) return

    const amount = parseFloat(amountEl.value) || 1
    const fromId = fromEl.value
    const toId   = toEl.value

    const prices = await getSimplePrices([fromId], ['usd', 'eur', 'ars'])
    renderConversion(amount, fromId, toId, prices)
}

// ------------------------------------------------------------
//  Convertidor completo (vista Converter)
// ------------------------------------------------------------
async function updateFullConverter() {
    const amountEl = document.getElementById('conv-full-amount')
    const fromEl   = document.getElementById('conv-full-from')
    const toEl     = document.getElementById('conv-full-to')
    if (!amountEl || !fromEl || !toEl) return

    const amount   = parseFloat(amountEl.value) || 1
    const fromId   = fromEl.value
    const toId     = toEl.value
    const isCrypto = id => ['bitcoin', 'ethereum', 'solana', 'binancecoin'].includes(id)

    const coinIds    = [fromId, toId].filter(isCrypto)
    const currencies = [fromId, toId].filter(id => !isCrypto(id))
    if (!currencies.length) currencies.push('usd')

    const prices = await getSimplePrices(coinIds, currencies)

    let result
    if (isCrypto(fromId) && !isCrypto(toId)) {
    result = amount * (prices[fromId]?.[toId] || 0)
    } else if (!isCrypto(fromId) && isCrypto(toId)) {
    result = amount / (prices[toId]?.usd || 1)
    } else if (isCrypto(fromId) && isCrypto(toId)) {
    result = amount * ((prices[fromId]?.usd || 0) / (prices[toId]?.usd || 1))
    } else {
    result = amount
    }

    const resultEl = document.getElementById('conv-full-result')
    const rateEl   = document.getElementById('conv-full-rate')
    if (resultEl) resultEl.textContent = result.toLocaleString('en-US', { maximumFractionDigits: 6 })
    if (rateEl)   rateEl.textContent   = `1 ${fromId} = ${(result / amount).toLocaleString('en-US', { maximumFractionDigits: 6 })} ${toId}`
}

// ------------------------------------------------------------
//  Portfolio
// ------------------------------------------------------------
function savePortfolio() {
    localStorage.setItem('portfolio', JSON.stringify(state.holdings))
}

async function refreshPortfolio() {
    if (state.holdings.length === 0) {
    renderPortfolio([], {}, state)
    renderPortfolioSummary([], {})
    return
    }
    const ids    = state.holdings.map(h => h.coinId)
    const prices = await getSimplePrices(ids, ['usd'])
    state.prices = { ...state.prices, ...prices }
    renderPortfolio(state.holdings, prices, state)
    renderPortfolioSummary(state.holdings, prices)
}

function openAddAssetModal() {
    const existing = document.getElementById('add-asset-modal')
    if (existing) { existing.remove(); return }

    const modal = document.createElement('div')
    modal.id = 'add-asset-modal'
    modal.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.75);
    display:flex; align-items:center; justify-content:center; z-index:999;
    `
    modal.innerHTML = `
    <div style="background:#13132a; border:1px solid #2a2a4a; border-radius:14px;
                padding:28px; width:340px; display:flex; flex-direction:column; gap:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="color:#a78bfa; font-size:13px; text-transform:uppercase; letter-spacing:0.8px">
            Agregar activo
        </h3>
        <span id="modal-close" style="color:#4b5563; cursor:pointer; font-size:18px; line-height:1;">✕</span>
        </div>
        <select id="modal-coin"
        style="background:#0a0a15; border:1px solid #2a2a4a; color:#f1f5f9;
                padding:10px; border-radius:6px; font-size:13px;">
        <option value="bitcoin|BTC">Bitcoin (BTC)</option>
        <option value="ethereum|ETH">Ethereum (ETH)</option>
        <option value="solana|SOL">Solana (SOL)</option>
        <option value="binancecoin|BNB">BNB</option>
        </select>
        <input id="modal-amount" type="number" placeholder="Cantidad (ej: 0.5)"
                min="0" step="any"
                style="background:#0a0a15; border:1px solid #2a2a4a; color:#f1f5f9;
                    padding:10px; border-radius:6px; font-size:13px;" />
        <input id="modal-buy-price" type="number" placeholder="Precio de compra en USD (ej: 40000)"
                min="0" step="any"
                style="background:#0a0a15; border:1px solid #2a2a4a; color:#f1f5f9;
                    padding:10px; border-radius:6px; font-size:13px;" />
        <p id="modal-error" style="color:#f87171; font-size:12px; display:none;">
        Completá todos los campos correctamente.
        </p>
        <div style="display:flex; gap:10px;">
        <button id="modal-cancel"
            style="flex:1; padding:10px; border-radius:6px; background:transparent;
                    border:1px solid #2a2a4a; color:#9ca3af; cursor:pointer; font-size:13px;">
            Cancelar
        </button>
        <button id="modal-save"
            style="flex:1; padding:10px; border-radius:6px; background:#a78bfa;
                    border:none; color:#0a0a15; cursor:pointer; font-size:13px; font-weight:600;">
            Agregar
        </button>
        </div>
    </div>
    `

    document.body.appendChild(modal)

    const close = () => modal.remove()
    document.getElementById('modal-close').onclick  = close
    document.getElementById('modal-cancel').onclick = close
    modal.addEventListener('click', e => { if (e.target === modal) close() })

    document.getElementById('modal-save').onclick = async () => {
    const [coinId, symbol] = document.getElementById('modal-coin').value.split('|')
    const amount    = parseFloat(document.getElementById('modal-amount').value)
    const buyPrice  = parseFloat(document.getElementById('modal-buy-price').value)
    const errorEl   = document.getElementById('modal-error')

    if (!amount || amount <= 0 || !buyPrice || buyPrice <= 0) {
        errorEl.style.display = 'block'
        return
    }

    const existing = state.holdings.find(h => h.coinId === coinId)
    if (existing) {
        const total        = existing.amount + amount
      existing.buyPrice  = (existing.buyPrice * existing.amount + buyPrice * amount) / total
        existing.amount    = total
    } else {
        state.holdings.push({ coinId, symbol, amount, buyPrice })
    }

    savePortfolio()
    close()
    await refreshPortfolio()
    } 
}

// ------------------------------------------------------------
//  Vista Dashboard — carga datos globales
// ------------------------------------------------------------
async function loadDashboard() {
    try {
    // Inicializar chart acá, cuando el canvas YA es visible
    initChart()

    const [globalData, coinsData, historyData] = await Promise.all([
        getGlobalData(),
        getCoinsMarket(state.coins),
        getCoinHistory(state.chartCoin, state.chartDays),
    ])

    renderGlobalStats(globalData)
    renderCoinList(coinsData)
    updateChartWithData(historyData)

    await Promise.all([
        renderPortfolioSummary(state.holdings, prices),
        updateConverter(),
    ])

    } catch (err) {
    console.error('Error cargando dashboard:', err)
    }
}

// ------------------------------------------------------------
//  Vista Converter — carga precios y tabla de referencia
// ------------------------------------------------------------
async function loadConverterView() {
    try {
    const prices = await getSimplePrices(
        ['bitcoin', 'ethereum', 'solana', 'binancecoin'],
        ['usd', 'eur', 'ars']
    )
    renderQuickConversions(prices)
    renderPricesGrid(prices)
    await updateFullConverter()
    } catch (err) {
    console.error('Error cargando converter:', err)
    }
}

// ------------------------------------------------------------
//  Event listeners — se bindean una sola vez al inicio
// ------------------------------------------------------------
function bindEvents() {
  // Delegación global para botones de período del chart
    document.addEventListener('click', async e => {
    const btn = e.target.closest('.btn-period')
    if (!btn) return
    document.querySelectorAll('.btn-period').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    state.chartDays = Number(btn.dataset.days)
    await updateChart()
    })

  // Selector de coin del chart
    document.addEventListener('change', async e => {
    if (e.target.id === 'chart-coin-select') {
        state.chartCoin = e.target.value
        await updateChart()
    }
    })

  // Convertidor rápido (dashboard)
    document.addEventListener('input',  e => { if (['conv-amount'].includes(e.target.id)) updateConverter() })
    document.addEventListener('change', e => { if (['conv-from', 'conv-to'].includes(e.target.id)) updateConverter() })

  // Convertidor completo (vista converter)
    document.addEventListener('input',  e => { if (e.target.id === 'conv-full-amount') updateFullConverter() })
    document.addEventListener('change', e => {
    if (['conv-full-from', 'conv-full-to'].includes(e.target.id)) updateFullConverter() })   
}



  // Swap button
    document.addEventListener('click', e => {
    if (!e.target.closest('#btn-swap')) return
    const fromEl = document.getElementById('conv-full-from')
    const toEl   = document.getElementById('conv-full-to')
    const temp   = fromEl.value
    fromEl.value = toEl.value
    toEl.value   = temp
    updateFullConverter()
    })

  // Agregar activo — delegación porque el botón está en vista oculta al inicio
    document.addEventListener('click', e => {
    if (e.target.closest('#btn-add-asset')) openAddAssetModal()
    })

  // Eliminar activo del portfolio
    document.addEventListener('click', async e => {
    const btn = e.target.closest('.btn-remove-asset')
    if (!btn) return
    state.holdings = state.holdings.filter(h => h.coinId !== btn.dataset.coin)
    savePortfolio()
    await refreshPortfolio()
    })


// ------------------------------------------------------------
//  Init
// ------------------------------------------------------------
async function init() {
  // 1. Bindear eventos primero (delegación global, no dependen del DOM visible)
    bindEvents()

  // 2. Iniciar router — define qué vista se muestra
    initRouter()

  // 3. Callbacks por vista
    onEnter('dashboard', loadDashboard)
    onEnter('portfolio', refreshPortfolio)
    onEnter('converter', loadConverterView)

  // 4. Auto-refresh cada 60s solo en dashboard
    setInterval(() => {
    const active = document.querySelector('.view.active')?.id
    if (active === 'view-dashboard') loadDashboard()
    }, 60_000)
}

init()