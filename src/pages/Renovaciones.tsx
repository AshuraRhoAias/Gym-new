import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import RegistroForm from '../components/RegistroForm'
import type { Registro } from '../types/database'

export default function Renovaciones() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Registro[]>([])
  const [selected, setSelected] = useState<Registro | null>(null)
  const [skipped, setSkipped] = useState(false)
  const [searching, setSearching] = useState(false)

  const doSearch = useMemo(
    () => async (q: string) => {
      if (q.trim().length < 2) {
        setResults([])
        return
      }
      setSearching(true)
      const { data } = await supabase
        .from('registros')
        .select('*')
        .or(`nombre.ilike.%${q}%,folio.ilike.%${q}%,telefono.ilike.%${q}%`)
        .limit(8)
      setResults(data ?? [])
      setSearching(false)
    },
    [],
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Renovaciones</h1>
        <p className="text-sm text-gray-400 mt-1">
          Busque al usuario por nombre, folio o número telefónico para completar automáticamente los datos.
        </p>
      </div>

      {!selected && !skipped && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                doSearch(e.target.value)
              }}
              placeholder="Buscar por nombre, folio o teléfono…"
              className="w-full bg-surface-2 border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
            />
          </div>

          {searching && <p className="text-sm text-gray-500">Buscando…</p>}

          {results.length > 0 && (
            <div className="flex flex-col gap-2">
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="text-left bg-surface-2 border border-border rounded-lg px-4 py-3 hover:border-accent/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-white">{r.nombre}</span>
                    <span className="text-xs text-gray-400">Tel: {r.telefono || '—'}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Folio: {r.folio || '0'} · Monto: ${r.monto.toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          )}

          <button onClick={() => setSkipped(true)} className="mt-3 text-sm text-accent hover:underline">
            Continuar sin encontrar coincidencias →
          </button>
        </div>
      )}

      {(selected || skipped) && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Nueva Renovación</h2>
          <RegistroForm
            kind="renovacion"
            inline
            prefill={
              selected
                ? { nombre: selected.nombre, telefono: selected.telefono ?? undefined, folio: selected.folio ?? undefined }
                : undefined
            }
            onClose={() => {
              setSelected(null)
              setSkipped(false)
            }}
            onSaved={() => navigate('/')}
          />
        </div>
      )}
    </div>
  )
}
