import { useState } from 'react'
import { QrCode, Search, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Registro } from '../types/database'

export default function Scanner() {
  const { username } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Registro[]>([])
  const [searching, setSearching] = useState(false)
  const [checkedIn, setCheckedIn] = useState<Registro | null>(null)
  const [error, setError] = useState<string | null>(null)

  const search = async (q: string) => {
    setQuery(q)
    setCheckedIn(null)
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    const { data } = await supabase
      .from('registros')
      .select('*')
      .or(`nombre.ilike.%${q}%,folio.ilike.%${q}%`)
      .limit(6)
    setResults(data ?? [])
    setSearching(false)
  }

  const registrarVisita = async (r: Registro) => {
    setError(null)
    const { error: err } = await supabase.from('caja_movimientos').insert({
      kind: 'visita',
      usuario: username ?? 'desconocido',
      monto: 0,
      metodo_pago: 'sin_metodo',
      concepto: `Check-in: ${r.nombre} (folio ${r.folio || '0'})`,
      registro_id: r.id,
    })
    if (err) {
      setError(err.message)
      return
    }
    setCheckedIn(r)
    setResults([])
    setQuery('')
  }

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-2 justify-center">
        <QrCode className="text-accent" size={22} />
        <h1 className="text-2xl font-semibold text-white">Scanner / Check-in</h1>
      </div>
      <p className="text-sm text-gray-400 text-center -mt-4">
        Busca por nombre o folio para registrar el ingreso del socio. El escaneo de código QR con
        cámara estará disponible próximamente; por ahora usa la búsqueda manual.
      </p>

      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            autoFocus
            value={query}
            onChange={(e) => search(e.target.value)}
            placeholder="Nombre o folio…"
            className="w-full bg-surface-2 border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
          />
        </div>

        {searching && <p className="text-sm text-gray-500 mt-3">Buscando…</p>}

        {results.length > 0 && (
          <div className="flex flex-col gap-2 mt-3">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => registrarVisita(r)}
                className="text-left bg-surface-2 border border-border rounded-lg px-4 py-3 hover:border-accent/50"
              >
                <div className="font-medium text-white">{r.nombre}</div>
                <div className="text-xs text-gray-400 mt-0.5">Folio: {r.folio || '0'}</div>
              </button>
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2 mt-3">{error}</p>
        )}

        {checkedIn && (
          <div className="mt-4 bg-accent/10 border border-accent/30 rounded-lg px-4 py-3 flex items-center gap-3">
            <CheckCircle2 className="text-accent shrink-0" size={22} />
            <div>
              <p className="text-sm font-medium text-white">Check-in registrado</p>
              <p className="text-xs text-gray-400">{checkedIn.nombre} · Folio {checkedIn.folio || '0'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
