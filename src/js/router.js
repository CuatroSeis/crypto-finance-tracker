// ============================================================
//  router.js — SPA navigation sin librerías
// ============================================================

const VIEWS = ['dashboard', 'portfolio', 'converter']

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
  // Clicks en la navbar
    document.querySelectorAll('[data-view]').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault()
        const view = link.dataset.view
        activateView(view)
    })
    })

  // Botones "Ver completo" del dashboard
    document.getElementById('btn-go-portfolio')?.addEventListener('click', () => activateView('portfolio'))
    document.getElementById('btn-go-converter')?.addEventListener('click', () => activateView('converter'))

  // Manejar el botón atrás del browser
    window.addEventListener('popstate', e => {
    const view = e.state?.view || 'dashboard'
    activateView(view)
    })

  // Vista inicial según la URL
    const initial = window.location.pathname.replace('/', '') || 'dashboard'
    activateView(initial)
}