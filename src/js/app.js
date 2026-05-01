// ============================================================
//  app.js — Punto de entrada y orquestador principal
// ============================================================

import { getGlobalData, getCoinsMarket, getCoinHistory, getSimplePrices } from './api.js'
import { renderGlobalStats, renderCoinList, renderPortfolio, renderConversion } from './ui.js'

// ------------------------------------------------------------
//  Estado de la app
// ------------------------------------------------------------
const state = {
    coins:        ['bitcoin', 'ethereum', 'solana', 'binancecoin'],
    chartCoin:    'bitcoin',
    chartDays:    7,
    holdings:     JSON.parse(localStorage.getItem('portfolio') || '[]'),
    prices:       {},
    chartInstance: null,
}

// ------------------------------------------------------------
//  Inicializar gráfico vacío con Chart.js
// ------------------------------------------------------------
function initChart() {
    const ctx = document.getElementById('price-chart').getContext('2d')

    state.chartInstance = new Chart(ctx, {
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
            ticks:  { color: '#4b5563', maxTicksLimit: 6, font: { size: 11 } },
            grid:   { color: '#1e1e3a' },
        },
        y: {
            ticks:  { color: '#4b5563', font: { size: 11 },
                    callback: v => `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}` },
            grid:   { color: '#1e1e3a' },
            position: 'right',
        }
        }
    }
    })
}

// ------------------------------------------------------------
//  Actualizar gráfico con datos reales
// ------------------------------------------------------------
async function updateChart() {
    const data = await getCoinHistory(state.chartCoin, state.chartDays)

    const labels = data.prices.map(([ts]) => {
    const d = new Date(ts)
    return state.chartDays <= 7
        ? d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' })
        : d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
    })

    const prices = data.prices.map(([, price]) => price)

    state.chartInstance.data.labels             = labels
    state.chartInstance.data.datasets[0].data   = prices
    state.chartInstance.data.datasets[0].label  = state.chartCoin
    state.chartInstance.update()
}

// ------------------------------------------------------------
//  Actualizar convertidor
// ------------------------------------------------------------
async function updateConverter() {
    const amount = parseFloat(document.getElementById('conv-amount').value) || 1
    const fromId = document.getElementById('conv-from').value
    const toId   = document.getElementById('conv-to').value

    const prices = await getSimplePrices([fromId], ['usd', 'eur', 'ars'])
    renderConversion(amount, fromId, toId, prices)
}

// ------------------------------------------------------------
//  Guardar portfolio en localStorage
// ------------------------------------------------------------
function savePortfolio() {
    localStorage.setItem('portfolio', JSON.stringify(state.holdings))
}

// ------------------------------------------------------------
//  Modal simple para agregar activo al portfolio
// ------------------------------------------------------------
function openAddAssetModal() {
    const existing = document.getElementById('add-asset-modal')
    if (existing) { existing.remove(); return }

    const modal = document.createElement('div')
    modal.id = 'add-asset-modal'
    modal.style.cssText = `
    position:fixed; inset:0; background:rgba(0,0,0,0.7);
    display:flex; align-items:center; justify-content:center; z-index:999;
    `
    modal.innerHTML = `
    <div style="background:#13132a; border:1px solid #2a2a4a; border-radius:14px;
                padding:28px; width:320px; display:flex; flex-direction:column; gap:14px;">
        <h3 style="color:#a78bfa; font-size:13px; text-transform:uppercase; letter-spacing:0.8px">
        Agregar activo
        </h3>
        <select id="modal-coin" style="background:#0a0a15; border:1px solid #2a2a4a;
                color:#f1f5f9; padding:10px; border-radius:6px; font-size:13px;">
        <option value="bitcoin|BTC">Bitcoin (BTC)</option>
        <option value="ethereum|ETH">Ethereum (ETH)</option>
        <option value="solana|SOL">Solana (SOL)</option>
        <option value="binancecoin|BNB">BNB</option>
        </select>
        <input id="modal-amount" type="number" placeholder="Cantidad (ej: 0.5)"
                min="0" step="any"
                style="background:#0a0a15; border:1px solid #2a2a4a; color:#f1f5f9;
                    padding:10px; border-radius:6px; font-size:13px;" />
        <div style="display:flex; gap:10px;">
        <button id="modal-cancel" style="flex:1; padding:10px; border-radius:6px;
                background:transparent; border:1px solid #2a2a4a; color:#9ca3af;
                cursor:pointer; font-size:13px;">Cancelar</button>
        <button id="modal-save" style="flex:1; padding:10px; border-radius:6px;
                background:#a78bfa; border:none; color:#0a0a15;
                cursor:pointer; font-size:13px; font-weight:600;">Agregar</button>
        </div>
    </div>
    `

    document.body.appendChild(modal)

    document.getElementById('modal-cancel').onclick = () => modal.remove()

    document.getElementById('modal-save').onclick = async () => {
    const [coinId, symbol] = document.getElementById('modal-coin').value.split('|')
    const amount = parseFloat(document.getElementById('modal-amount').value)

    if (!amount || amount <= 0) return

    // Buscar si ya existe
    const existing = state.holdings.find(h => h.coinId === coinId)
    if (existing) {
        existing.amount += amount
    } else {
        state.holdings.push({ coinId, symbol, amount })
    }

    savePortfolio()
    modal.remove()
    await refreshPortfolio()
    }
}

// ------------------------------------------------------------
//  Refresh portfolio (trae precios frescos)
// ------------------------------------------------------------
async function refreshPortfolio() {
    if (state.holdings.length === 0) {
    renderPortfolio([], {})
    return
    }
    const ids    = state.holdings.map(h => h.coinId)
    const prices = await getSimplePrices(ids, ['usd'])
    renderPortfolio(state.holdings, prices)
}

// ------------------------------------------------------------
//  Carga inicial de todos los datos
// ------------------------------------------------------------
async function loadAll() {
    try {
    const [globalData, coinsData] = await Promise.all([
        getGlobalData(),
        getCoinsMarket(state.coins),
    ])

    renderGlobalStats(globalData)
    renderCoinList(coinsData)
    await refreshPortfolio()
    await updateChart()
    await updateConverter()

    } catch (err) {
    console.error('Error cargando datos:', err)
    }
}

// ------------------------------------------------------------
//  Event listeners
// ------------------------------------------------------------
function bindEvents() {
  // Botones de período del gráfico
    document.querySelectorAll('.btn-period').forEach(btn => {
    btn.addEventListener('click', async () => {
        document.querySelectorAll('.btn-period').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        state.chartDays = Number(btn.dataset.days)
        await updateChart()
    })
    })

  // Selector de coin del gráfico
    document.getElementById('chart-coin-select').addEventListener('change', async (e) => {
    state.chartCoin = e.target.value
    await updateChart()
    })

  // Convertidor
    const convInputs = ['conv-amount', 'conv-from', 'conv-to']
    convInputs.forEach(id => {
    document.getElementById(id).addEventListener('change', updateConverter)
    })
    document.getElementById('conv-amount').addEventListener('input', updateConverter)

  // Botón agregar activo
    document.getElementById('btn-add-asset').addEventListener('click', openAddAssetModal)
}

// ------------------------------------------------------------
//  Arrancar la app
// ------------------------------------------------------------
async function init() {
    initChart()
    bindEvents()
    await loadAll()

  // Auto-refresh cada 60 segundos
    setInterval(loadAll, 60_000)
}

init()