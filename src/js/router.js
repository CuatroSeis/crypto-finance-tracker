// ============================================================
//  router.js — SPA navigation sin librerías
// ============================================================

const VIEWS = ['dashboard', 'portfolio', 'converter', 'comparator']

const onEnterCallbacks = {}

export function onEnter(view, callback) {
  onEnterCallbacks[view] = callback
}

function activateView(viewName) {
  if (!VIEWS.includes(viewName)) viewName = 'dashboard'

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

  // Hash routing — funciona en local y en deploy
  window.location.hash = viewName
  document.title = `CryptoTrack — ${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`

  if (onEnterCallbacks[viewName]) {
    onEnterCallbacks[viewName]()
  }
}

export function initRouter() {
  // Clicks en navbar
  document.addEventListener('click', e => {
    const link = e.target.closest('[data-view]')
    if (!link) return
    e.preventDefault()
    activateView(link.dataset.view)
  })

  // Botones internos
  document.getElementById('btn-go-portfolio')?.addEventListener('click', () => activateView('portfolio'))
  document.getElementById('btn-go-converter')?.addEventListener('click', () => activateView('converter'))

  // Botón atrás del browser
  window.addEventListener('hashchange', () => {
    const view = window.location.hash.replace('#', '') || 'dashboard'
    activateView(view)
  })

  // Vista inicial desde el hash
  const initial = window.location.hash.replace('#', '') || 'dashboard'
  activateView(initial)
}