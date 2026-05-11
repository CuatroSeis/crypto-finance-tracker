// ============================================================
//  app.js — Punto de entrada y orquestador principal
// ============================================================

import { initRouter, onEnter } from './router.js'

import { renderGlobalStats, renderCoinList, renderPortfolio, renderPortfolioSummary,renderConversion, renderQuickConversions, renderPricesGrid, renderDonutChart,
renderFearGreed, renderComparatorChart, renderComparatorMetrics,
showStatCardSkeletons, showCoinListSkeleton, showChartSkeleton,
showPortfolioSkeleton, showToast, showErrorState, showComparatorPlaceholder,
} from './ui.js'

import { createCoinSearch } from './search.js'

import {
    getGlobalData, getCoinsMarket, getCoinHistory, getSimplePrices,
    getFearGreedIndex, getCoinDetails,
} from './api.js'

// ------------------------------------------------------------
//  Estado
// ------------------------------------------------------------
const state = {
    coins:         ['bitcoin', 'ethereum', 'solana', 'binancecoin'],
    chartCoin:     'bitcoin',
    chartDays:     7,
    compDays:      7,
    compCoinA:     null,
    compCoinB:     null,
    holdings:      JSON.parse(localStorage.getItem('portfolio') || '[]'),
    prices:        {},
    chartInstance: null,
    chartReady:    false,
}

// ------------------------------------------------------------
//  Chart principal
// ------------------------------------------------------------
function initChart() {
    if (state.chartReady) return
    const canvas = document.getElementById('price-chart')
    if (!canvas) return

    state.chartInstance = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Precio USD', data: [],
        borderColor: '#a78bfa', backgroundColor: 'rgba(167,139,250,0.08)',
        borderWidth: 2, pointRadius: 0, fill: true, tension: 0.4 }] },
    options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: {
        label: ctx => `$${ctx.parsed.y.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
        }}},
        scales: {
        x: { ticks: { color: '#4b5563', maxTicksLimit: 6, font: { size: 11 } }, grid: { color: '#1e1e3a' } },
        y: { ticks: { color: '#4b5563', font: { size: 11 },
            callback: v => `$${Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}` },
            grid: { color: '#1e1e3a' }, position: 'right' }
        }
    }
    })
    state.chartReady = true
}

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
//  Convertidor rápido
// ------------------------------------------------------------
async function updateConverter() {
    const amountEl = document.getElementById('conv-amount')
    const fromEl   = document.getElementById('conv-from')
    const toEl     = document.getElementById('conv-to')
    if (!amountEl || !fromEl || !toEl) return
    const prices = await getSimplePrices([fromEl.value], ['usd', 'eur', 'ars'])
    renderConversion(parseFloat(amountEl.value) || 1, fromEl.value, toEl.value, prices)
}

// ------------------------------------------------------------
//  Convertidor completo
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
  if (isCrypto(fromId) && !isCrypto(toId))       result = amount * (prices[fromId]?.[toId] || 0)
    else if (!isCrypto(fromId) && isCrypto(toId))  result = amount / (prices[toId]?.usd || 1)
  else if (isCrypto(fromId) && isCrypto(toId))   result = amount * ((prices[fromId]?.usd || 0) / (prices[toId]?.usd || 1))
    else                                            result = amount

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
    renderDonutChart([], {})
    const totalEl  = document.getElementById('portfolio-total')
    const changeEl = document.getElementById('portfolio-change')
    if (totalEl)  totalEl.textContent  = '$0.00'
    if (changeEl) changeEl.textContent = '—'
    return
    }
    const ids    = state.holdings.map(h => h.coinId)
    const prices = await getSimplePrices(ids, ['usd'])
    state.prices = prices
    renderPortfolio(state.holdings, prices, state)
    renderPortfolioSummary(state.holdings, prices)
    renderDonutChart(state.holdings, prices)
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
                padding:28px; width:360px; display:flex; flex-direction:column; gap:14px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3 style="color:#a78bfa; font-size:13px; text-transform:uppercase; letter-spacing:0.8px;">
            Agregar activo
        </h3>
        <span id="modal-close" style="color:#4b5563; cursor:pointer; font-size:18px; line-height:1;">✕</span>
        </div>
        <div id="coin-search-container"></div>
        <div id="coin-preview" style="display:none; background:#0a0a15; border:1px solid #2a2a4a;
            border-radius:6px; padding:10px 12px; align-items:center; gap:10px;">
        <img id="preview-thumb" src="" alt="" style="width:24px; height:24px; border-radius:50%;" />
        <span id="preview-name" style="font-size:13px; color:#f1f5f9; flex:1;"></span>
        <span id="preview-symbol" style="font-size:11px; color:#6b7280;"></span>
        </div>
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

    const coinSearch = createCoinSearch({
    container:   document.getElementById('coin-search-container'),
    placeholder: 'Buscar coin... (ej: bitcoin, sol, eth)',
    onSelect: coin => {
        const preview = document.getElementById('coin-preview')
        preview.style.display = 'flex'
        document.getElementById('preview-thumb').src            = coin.thumb || ''
        document.getElementById('preview-thumb').style.display  = coin.thumb ? 'block' : 'none'
        document.getElementById('preview-name').textContent     = coin.name
        document.getElementById('preview-symbol').textContent   = coin.symbol
    }
    })

    const close = () => modal.remove()
    document.getElementById('modal-close').onclick  = close
    document.getElementById('modal-cancel').onclick = close
    modal.addEventListener('click', e => { if (e.target === modal) close() })

    document.getElementById('modal-save').onclick = async () => {
    const selected = coinSearch.getSelected()
    const amount   = parseFloat(document.getElementById('modal-amount').value)
    const buyPrice = parseFloat(document.getElementById('modal-buy-price').value)
    const errorEl  = document.getElementById('modal-error')

    if (!selected) {
        errorEl.textContent = 'Seleccioná una coin de la búsqueda.'
        errorEl.style.display = 'block'; return
    }
    if (!amount || amount <= 0 || !buyPrice || buyPrice <= 0) {
        errorEl.textContent = 'Completá todos los campos correctamente.'
        errorEl.style.display = 'block'; return
    }

    errorEl.style.display = 'none'

    const existing = state.holdings.find(h => h.coinId === selected.id)
    if (existing) {
        const total       = existing.amount + amount
      existing.buyPrice = (existing.buyPrice * existing.amount + buyPrice * amount) / total
        existing.amount   = total
    } else {
        state.holdings.push({ coinId: selected.id, symbol: selected.symbol,
        name: selected.name, thumb: selected.thumb, amount, buyPrice })
    }

    if (!state.coins.includes(selected.id)) state.coins.push(selected.id)

    savePortfolio()
    close()
    showToast(`${selected.symbol} agregado al portfolio`, 'success')
    await refreshPortfolio()
    }

    setTimeout(() => coinSearch.focus(), 50)
}

// ------------------------------------------------------------
//  Vista Dashboard
// ------------------------------------------------------------
async function loadDashboard() {
    try {
    showStatCardSkeletons()
    showCoinListSkeleton()
    showChartSkeleton()

    const wrapper = document.querySelector('.chart-wrapper')
    if (wrapper && !wrapper.querySelector('canvas')) {
        wrapper.innerHTML = '<canvas id="price-chart"></canvas>'
    }
    initChart()

    const [results] = await Promise.all([
        Promise.all([
        getGlobalData(),
        getCoinsMarket(state.coins),
        getCoinHistory(state.chartCoin, state.chartDays),
        getSimplePrices(['bitcoin', 'ethereum', 'solana', 'binancecoin'], ['usd', 'eur', 'ars']),
        getFearGreedIndex(),
        ]),
        new Promise(r => setTimeout(r, 800))
    ])

    const [globalData, coinsData, historyData, prices, fearGreedData] = results
    state.prices = prices

    renderGlobalStats(globalData)
    renderCoinList(coinsData)
    updateChartWithData(historyData)
    renderFearGreed(fearGreedData)

    } catch (err) {
    console.error('Error cargando dashboard:', err)
    showErrorState('coin-list', 'No se pudieron cargar los precios.', loadDashboard)
    showErrorState('fg-history-list', 'No se pudo cargar el índice.', null)
    showToast('Error al conectar con la API', 'error')
    }
}
// ------------------------------------------------------------
//  Vista Converter
// ------------------------------------------------------------
async function loadConverterView() {
    try {
    const prices = await getSimplePrices(
        ['bitcoin', 'ethereum', 'solana', 'binancecoin'], ['usd', 'eur', 'ars']
    )
    renderQuickConversions(prices)
    renderPricesGrid(prices)
    await updateFullConverter()
    } catch (err) {
    console.error('Error cargando converter:', err)
    showErrorState('conv-reference-table', 'No se pudieron cargar los precios.', loadConverterView)
    showToast('Error al cargar el convertidor', 'error')
    }
}
// ------------------------------------------------------------
//  Vista Comparador
// ------------------------------------------------------------
async function loadComparatorView() {
  // Mostrar placeholder inicial
    showComparatorPlaceholder()

    const containerA = document.getElementById('comp-search-a')
    const containerB = document.getElementById('comp-search-b')

    if (containerA && !containerA.dataset.mounted) {
    containerA.dataset.mounted = 'true'
    createCoinSearch({
        container:   containerA,
        placeholder: 'Buscar coin A...',
        onSelect: coin => {
        state.compCoinA = coin
        updateCompPreview('a', coin)
        tryLoadComparison()
        }
    })
    }

    if (containerB && !containerB.dataset.mounted) {
    containerB.dataset.mounted = 'true'
    createCoinSearch({
        container:   containerB,
        placeholder: 'Buscar coin B...',
        onSelect: coin => {
        state.compCoinB = coin
        updateCompPreview('b', coin)
        tryLoadComparison()
        }
    })
    }
}

async function tryLoadComparison() {
    const { compCoinA, compCoinB, compDays } = state
    if (!compCoinA || !compCoinB) return

  // Skeleton en el chart wrapper
    const wrapper = document.querySelector('#view-comparator .chart-wrapper')
    if (wrapper) {
    wrapper.innerHTML = `
        <div class="skeleton skeleton-chart" style="height:250px;"></div>
    `
    }

    try {
    showToast(`Comparando ${compCoinA.symbol} vs ${compCoinB.symbol}...`, 'info', 2000)

    const [histA, histB, detailsA, detailsB] = await Promise.all([
        getCoinHistory(compCoinA.id, compDays),
        getCoinHistory(compCoinB.id, compDays),
        getCoinDetails(compCoinA.id),
        getCoinDetails(compCoinB.id),
    ])

    // Restaurar canvas antes de renderizar
    if (wrapper) wrapper.innerHTML = '<canvas id="comp-chart"></canvas>'

    renderComparatorChart(histA, histB, compCoinA, compCoinB, compDays)
    renderComparatorMetrics(detailsA, detailsB)

    } catch (err) {
    console.error('Error en comparador:', err)
    if (wrapper) {
        wrapper.innerHTML = ''
        showErrorState('comp-metrics', 'No se pudo cargar la comparación.', tryLoadComparison)
    }
    showToast('Error al cargar la comparación', 'error')
    }
}

// ------------------------------------------------------------
//  Event listeners
// ------------------------------------------------------------
function bindEvents() {
  // Períodos chart principal
    document.addEventListener('click', async e => {
    const btn = e.target.closest('.btn-period')
    if (!btn) return
    document.querySelectorAll('.btn-period').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    state.chartDays = Number(btn.dataset.days)
    await updateChart()
    })

  // Períodos comparador
    document.addEventListener('click', async e => {
    const btn = e.target.closest('[data-comp-days]')
    if (!btn) return
    document.querySelectorAll('[data-comp-days]').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    state.compDays = Number(btn.dataset.compDays)
    await tryLoadComparison()
    })

  // Selector coin chart
    document.addEventListener('change', async e => {
    if (e.target.id === 'chart-coin-select') {
        state.chartCoin = e.target.value
        await updateChart()
    }
    })

  // Convertidor rápido
    document.addEventListener('input',  e => { if (e.target.id === 'conv-amount') updateConverter() })
    document.addEventListener('change', e => { if (['conv-from','conv-to'].includes(e.target.id)) updateConverter() })

  // Convertidor completo
    document.addEventListener('input',  e => { if (e.target.id === 'conv-full-amount') updateFullConverter() })
    document.addEventListener('change', e => { if (['conv-full-from','conv-full-to'].includes(e.target.id)) updateFullConverter() })

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

  // Agregar activo
    document.addEventListener('click', e => {
    if (e.target.closest('#btn-add-asset')) openAddAssetModal()
    })

  // Eliminar activo
    document.addEventListener('click', async e => {
    const btn = e.target.closest('.btn-remove-asset')
    if (!btn) return
    const coinId     = btn.dataset.coin
    const coinSymbol = btn.dataset.symbol || coinId
    state.holdings   = state.holdings.filter(h => h.coinId !== coinId)
    state.prices     = {}
    savePortfolio()
    showToast(`${coinSymbol} eliminado del portfolio`, 'info')
    await refreshPortfolio()
    })
}

// ------------------------------------------------------------
//  Init
// ------------------------------------------------------------
async function init() {
    onEnter('dashboard',  loadDashboard)
    onEnter('portfolio',  refreshPortfolio)
    onEnter('converter',  loadConverterView)
    onEnter('comparator', loadComparatorView)

    bindEvents()
    initRouter()

    setInterval(() => {
    const active = document.querySelector('.view.active')?.id
    if (active === 'view-dashboard') loadDashboard()
    }, 60_000)
}

init()