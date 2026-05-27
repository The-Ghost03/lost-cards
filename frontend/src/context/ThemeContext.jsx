import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

const MODES = ['auto', 'light', 'dark']

/** Night = from 18h00 to 06:59 (local time) */
function isNightTime() {
  const h = new Date().getHours()
  return h >= 18 || h < 7
}

function readInitialMode() {
  try {
    const saved = localStorage.getItem('theme-mode')
    if (saved && MODES.includes(saved)) return saved

    // Migration from legacy "theme" key (light|dark)
    const legacy = localStorage.getItem('theme')
    if (legacy === 'dark')  return 'dark'
    if (legacy === 'light') return 'light'
  } catch {}
  return 'auto' // default: auto = follow time of day
}

function effectiveDark(mode) {
  if (mode === 'dark')  return true
  if (mode === 'light') return false
  return isNightTime()
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(readInitialMode)
  const [dark, setDark] = useState(() => effectiveDark(readInitialMode()))

  // Re-compute when mode changes, and persist
  useEffect(() => {
    setDark(effectiveDark(mode))
    try { localStorage.setItem('theme-mode', mode) } catch {}
  }, [mode])

  // Apply .dark class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  // Auto mode: re-check every minute to flip at 7h/18h
  useEffect(() => {
    if (mode !== 'auto') return
    const tick = () => setDark(isNightTime())
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [mode])

  // Click cycle: auto → light → dark → auto
  const toggle = () => {
    setMode(m => MODES[(MODES.indexOf(m) + 1) % MODES.length])
  }

  return (
    <ThemeContext.Provider value={{ dark, mode, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
