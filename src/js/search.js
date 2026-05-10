// ============================================================
//  search.js — Componente de búsqueda de coins reutilizable
// ============================================================

import { searchCoins } from './api.js'

// Debounce — espera que el usuario deje de escribir antes de buscar
function debounce(fn, delay = 350) {
    let timer
    return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
    }
}

// ------------------------------------------------------------
//  createCoinSearch
//  @param {object} options
//    - container   {HTMLElement} — donde se monta el componente
//    - placeholder {string}      — texto del input
//    - onSelect    {function}    — callback cuando el usuario elige una coin
//      recibe: { id, name, symbol, thumb, market_cap_rank }
// ------------------------------------------------------------
export function createCoinSearch({ container, placeholder = 'Buscar coin...', onSelect }) {
  // Estructura del componente
    container.innerHTML = `
    <div class="search-wrapper">
        <input
        type="text"
        class="search-input"
        placeholder="${placeholder}"
        autocomplete="off"
        spellcheck="false"
        />
        <div class="search-dropdown" style="display:none;"></div>
    </div>
    `

    const input    = container.querySelector('.search-input')
    const dropdown = container.querySelector('.search-dropdown')

    let selectedCoin = null

  // Mostrar dropdown
    function showDropdown(html) {
    dropdown.innerHTML    = html
    dropdown.style.display = 'block'
    }

  // Ocultar dropdown
    function hideDropdown() {
    dropdown.style.display = 'none'
    dropdown.innerHTML     = ''
    }

  // Renderizar resultados
    function renderResults(coins) {
    if (!coins.length) {
        showDropdown(`<p class="search-empty">Sin resultados para "${input.value}"</p>`)
        return
    }

    const html = coins.map(coin => `
        <div class="search-result-item" data-id="${coin.id}" data-name="${coin.name}"
            data-symbol="${coin.symbol}" data-thumb="${coin.thumb || ''}"
            data-rank="${coin.market_cap_rank || ''}">
        ${coin.thumb
            ? `<img class="search-result-thumb" src="${coin.thumb}" alt="${coin.symbol}" />`
            : `<div class="search-result-thumb-placeholder"></div>`
        }
        <span class="search-result-name">${coin.name}</span>
        <span class="search-result-symbol">${coin.symbol.toUpperCase()}</span>
        ${coin.market_cap_rank
            ? `<span class="search-result-rank">#${coin.market_cap_rank}</span>`
            : ''
        }
        </div>
    `).join('')

    showDropdown(html)

    // Click en resultado
    dropdown.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
        selectedCoin = {
            id:              item.dataset.id,
            name:            item.dataset.name,
            symbol:          item.dataset.symbol.toUpperCase(),
            thumb:           item.dataset.thumb,
            market_cap_rank: item.dataset.rank,
        }

        input.value = `${selectedCoin.name} (${selectedCoin.symbol})`
        hideDropdown()

        if (onSelect) onSelect(selectedCoin)
        })
    })
    }

  // Búsqueda con debounce
    const doSearch = debounce(async (query) => {
    if (query.length < 2) { hideDropdown(); return }

    showDropdown(`<p class="search-loading">Buscando...</p>`)

    try {
        const results = await searchCoins(query)
        renderResults(results)
    } catch {
        showDropdown(`<p class="search-empty">Error al buscar. Intentá de nuevo.</p>`)
    }
    }, 350)

  // Eventos
    input.addEventListener('input', e => {
    selectedCoin = null
    doSearch(e.target.value.trim())
    })

  // Cerrar dropdown al clickear afuera
    document.addEventListener('click', e => {
    if (!container.contains(e.target)) hideDropdown()
    })

  // API pública del componente
    return {
    getSelected: () => selectedCoin,
    clear:       () => { input.value = ''; selectedCoin = null; hideDropdown() },
    focus:       () => input.focus(),
    }
}