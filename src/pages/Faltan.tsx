import { useEffect, useMemo, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { usePeriod } from '../context/PeriodContext'
import { usePrivacy, tieneFolio } from '../context/PrivacyContext'
import { supabase } from '../lib/supabase'
import PeriodSelector from '../components/PeriodSelector'
import PhoneReveal from '../components/PhoneReveal'
import Masked from '../components/Masked'
import type { Registro } from '../types/database'

interface RegistroConFaltantes extends Registro {
  faltantes: string[]
}

export default function Faltan() {
  const { mes, anio } = usePeriod()
  const { hideSinFolio } = usePrivacy()
  const [registros, setRegistros] = useState<RegistroConFaltantes[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      let query = supabase
        .from('registros')
        .select('*')
        .eq('mes', mes)
        .eq('anio', anio)
        .eq('estatus', 'faltan_doc')
      if (hideSinFolio) query = query.not('folio', 'is', null).neq('folio', '0')
      const { data: rows } = await query.order('nombre', { ascending: true })

      if (!rows || rows.length === 0) {
        if (active) {
          setRegistros([])
          setLoading(false)
        }
        return
      }

      const { data: docs } = await supabase
        .from('documentos_entregados')
        .select('registro_id, documento, entregado')
        .in(
          'registro_id',
          rows.map((r) => r.id),
        )

      const withFaltantes = rows.map((r) => ({
        ...r,
        faltantes: (docs ?? [])
          .filter((d) => d.registro_id === r.id && !d.entregado)
          .map((d) => d.documento),
      }))

      if (active) {
        setRegistros(withFaltantes)
        setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [mes, anio, hideSinFolio])

  const totalTipos = useMemo(() => {
    const set = new Set<string>()
    registros.forEach((r) => r.faltantes.forEach((f) => set.add(f)))
    return set.size
  }, [registros])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="text-danger" size={22} />
          <div>
            <h1 className="text-2xl font-semibold text-white">Gestión de Documentos Faltantes</h1>
            <p className="text-sm text-gray-400">Seguimiento de documentos pendientes por persona</p>
          </div>
        </div>
        <PeriodSelector />
      </div>

      <div className="bg-surface border border-border rounded-xl px-5 py-4 flex flex-wrap items-center gap-8">
        <div>
          <div className="text-3xl font-bold text-white">{registros.length}</div>
          <div className="text-xs text-gray-500">Total con documentos faltantes</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-danger">{totalTipos}</div>
          <div className="text-xs text-gray-500">Tipos de documentos faltantes</div>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando…</p>}
      {!loading && registros.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-8">Sin documentos faltantes para este periodo. 🎉</p>
      )}

      <div className="flex flex-col gap-3">
        {registros.map((r) => (
          <div key={r.id} className="bg-surface border border-border rounded-xl p-4">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
              <div>
                <h3 className="text-white font-medium">
                  <Masked folio={r.folio} value={r.nombre} />
                </h3>
                <div className="text-xs text-gray-500 flex flex-wrap gap-3 mt-1">
                  <span className="flex items-center gap-1">
                    📞 <PhoneReveal cipher={r.telefono} masked={hideSinFolio && !tieneFolio(r.folio)} />
                  </span>
                  <span>{r.mes}</span>
                  <span>Folio: {r.folio || '0'}</span>
                </div>
              </div>
              <span className="text-xs px-2 py-1 rounded-md bg-danger/15 text-red-300 font-medium shrink-0">
                Faltan doc.
              </span>
            </div>
            {r.faltantes.length > 0 && (
              <div>
                <p className="text-xs text-danger mb-1.5">Documentos faltantes ({r.faltantes.length}):</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                  {r.faltantes.map((f) => (
                    <div key={f} className="bg-surface-2 border border-border rounded-md px-2.5 py-1.5 text-xs text-gray-300">
                      • {f}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
