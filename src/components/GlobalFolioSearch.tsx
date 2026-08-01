import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Registro } from '../types/database'

/**
 * Buscador rápido global: Alt+Espacio lo abre desde cualquier pantalla y
 * lista solo registros (de cualquier tipo: inscripción, renovación, bacho)
 * que tengan folio asignado.
 */
export default function GlobalFolioSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Registro[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.code === 'Space') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    let active = true
    setSearching(true)
    const timeout = setTimeout(async () => {
      let req = supabase
        .from('registros_view')
        .select('*')
        .not('folio', 'is', null)
        .neq('folio', '0')
        .order('nombre')
        .limit(25)
      if (query.trim()) req = req.ilike('nombre', `%${query.trim()}%`)
      const { data } = await req
      if (active) {
        setResults(data ?? [])
        setSearching(false)
      }
    }, 200)
    return () => {
      active = false
      clearTimeout(timeout)
    }
  }, [open, query])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-start justify-center pt-24 px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-lg bg-surface border border-accent/40 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre… (solo con folio, todas las cuentas)"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none"
          />
          <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {searching && <p className="text-sm text-gray-500 text-center py-6">Buscando…</p>}
          {!searching && results.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-6">Sin coincidencias con folio.</p>
          )}
          {!searching &&
            results.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm text-white">{r.nombre}</p>
                  <p className="text-xs text-gray-500">
                    {r.kind} · {r.mes} {r.anio}
                  </p>
                </div>
                <span className="text-xs bg-accent/15 text-accent rounded-md px-2 py-1">Folio {r.folio}</span>
              </div>
            ))}
        </div>
        <div className="px-4 py-2 border-t border-border text-[10px] text-gray-500">
          Alt+Espacio para abrir/cerrar · Esc para cerrar
        </div>
      </div>
    </div>
  )
}
