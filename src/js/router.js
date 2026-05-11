// ============================================================
//  router.js — SPA navigation sin librerías
// ============================================================

const VIEWS = ['dashboard', 'portfolio', 'converter', 'comparator']

// Callbacks que se ejecutan cuando se entra a una vista
const onEnterCallbacks = {}

export function onEnter(view, callback) {
    onEnterCallbacks[view] = callback
}

function activateView(viewName) {
    if (!VIEWS.includes(viewName)) viewName = 'dashboard'

  // Mostrar/ocultar secciones
    VIEWS.forEach(v => {
    const section = document.getElementById(`view-${v}`)
    const link    = document.querySelector(`[data-view="${v}"]`)
    if (!section || !link) return

    if (v === viewName) {
        section.classList.add('active')
        link.classList.add('active')
    } else {
        section.classList.remove('active')
        link.classList.remove('active')
    }
    })

  // Actualizar URL sin recargar
    history.pushState({ view: viewName }, '', `/${viewName}`)
    document.title = `CryptoTrack — ${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`

  // Ejecutar callback de la vista si existe
    if (onEnterCallbacks[viewName]) {
    onEnterCallbacks[viewName]()
    }
}

export function initRouter() {
  // Delegación global en vez de bindear cada link
  document.addEventListener('click', e => {
    const link = e.target.closest('[data-view]')
    if (!link) return
    e.preventDefault()
    activateView(link.dataset.view)
  })

  document.getElementById('btn-go-portfolio')?.addEventListener('click', () => activateView('portfolio'))
  document.getElementById('btn-go-converter')?.addEventListener('click', () => activateView('converter'))

  window.addEventListener('popstate', e => {
    const view = e.state?.view || 'dashboard'
    activateView(view)
  })

  const initial = window.location.pathname.replace('/', '') || 'dashboard'
  activateView(initial)
}