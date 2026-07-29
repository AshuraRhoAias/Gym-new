import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { PAGO_LABEL, type Registro } from '../types/database'

function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

export default function ReporteDia() {
  const [fecha, setFecha] = useState(todayInput())
  const [registros, setRegistros] = useState<Registro[]>([])
  const [loading, setLoading] = useState(false)

  const consultar = async (dia: string) => {
    setLoading(true)
    const start = `${dia}T00:00:00.000Z`
    const end = `${dia}T23:59:59.999Z`
    const { data } = await supabase
      .from('registros')
      .select('*')
      .gte('fecha_ingreso', start)
      .lte('fecha_ingreso', end)
      .order('fecha_ingreso', { ascending: true })
    setRegistros(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    consultar(fecha)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stats = useMemo(() => {
    const inscripciones = registros.filter((r) => r.kind === 'inscripcion' || r.kind === 'inscripcion_bacho')
    const renovaciones = registros.filter((r) => r.kind === 'renovacion' || r.kind === 'renovacion_bacho')
    const usuarios = new Set(registros.map((r) => r.atendido_por).filter(Boolean))
    const byMethod: Record<string, number> = { efectivo: 0, tarjeta: 0, transferencia: 0, otro: 0, sin_metodo: 0 }
    for (const r of registros) byMethod[r.forma_pago] = (byMethod[r.forma_pago] ?? 0) + r.monto
    const total = Object.values(byMethod).reduce((s, v) => s + v, 0)
    return { inscripciones, renovaciones, usuarios: usuarios.size, byMethod, total }
  }, [registros])

  const fechaLegible = new Date(`${fecha}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <CalendarDays className="text-accent" size={22} />
        <h1 className="text-2xl font-semibold text-white">Reporte de Ingresos por Fecha</h1>
      </div>

      <div className="bg-gradient-to-r from-accent/20 to-info/20 border border-accent/30 rounded-xl p-5">
        <label className="block text-xs text-gray-300 mb-1.5">Fecha:</label>
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          />
          <button
            onClick={() => consultar(fecha)}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-dark text-black rounded-lg px-4 py-2 text-sm font-medium"
          >
            <Search size={14} /> Consultar
          </button>
          <span className="text-sm text-gray-300 capitalize">{fechaLegible}</span>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface border border-border rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white">{registros.length}</div>
              <div className="text-xs text-gray-500 mt-1">Total Registros</div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-accent">{stats.inscripciones.length}</div>
              <div className="text-xs text-gray-500 mt-1">Inscripciones</div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-info">{stats.renovaciones.length}</div>
              <div className="text-xs text-gray-500 mt-1">Renovaciones</div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white">{stats.usuarios}</div>
              <div className="text-xs text-gray-500 mt-1">Usuarios Atendieron</div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MoneyCard label="Total Efectivo" value={stats.byMethod.efectivo} color="text-accent" />
            <MoneyCard label="Total Tarjeta" value={stats.byMethod.tarjeta} color="text-info" />
            <MoneyCard label="Total Transferencia" value={stats.byMethod.transferencia} color="text-purple-300" />
            <MoneyCard label="Total General" value={stats.total} color="text-white" strong />
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border text-sm font-semibold text-white">
              Registros Detallados
            </div>
            {registros.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">Sin registros para esta fecha.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-border">
                      <th className="px-4 py-2 font-normal">Tipo</th>
                      <th className="px-4 py-2 font-normal">Nombre</th>
                      <th className="px-4 py-2 font-normal">Método</th>
                      <th className="px-4 py-2 font-normal">Monto</th>
                      <th className="px-4 py-2 font-normal">Atendido por</th>
                      <th className="px-4 py-2 font-normal">Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registros.map((r) => (
                      <tr key={r.id} className="border-b border-border/50">
                        <td className="px-4 py-2">
                          <span className="text-xs px-2 py-0.5 rounded-md bg-accent/15 text-accent">
                            {r.kind.startsWith('inscripcion') ? 'Inscripción' : 'Renovación'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-white">{r.nombre}</td>
                        <td className="px-4 py-2 text-gray-300">{PAGO_LABEL[r.forma_pago]}</td>
                        <td className="px-4 py-2 text-gray-200">${r.monto.toFixed(2)}</td>
                        <td className="px-4 py-2 text-gray-400">{r.atendido_por || '—'}</td>
                        <td className="px-4 py-2 text-gray-400 whitespace-nowrap">
                          {r.fecha_ingreso ? new Date(r.fecha_ingreso).toLocaleTimeString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function MoneyCard({
  label,
  value,
  color,
  strong,
}: {
  label: string
  value: number
  color: string
  strong?: boolean
}) {
  return (
    <div className={`bg-surface border rounded-xl p-4 text-center ${strong ? 'border-accent' : 'border-border'}`}>
      <div className={`text-2xl font-bold ${color}`}>${value.toFixed(2)}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  )
}
