import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Wallet, UserPlus, Plus } from 'lucide-react'
import { usePeriod } from '../context/PeriodContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import PeriodSelector from '../components/PeriodSelector'
import { PAGO_LABEL, type PagoTrabajador, type PaymentMethod, type Trabajador } from '../types/database'

export default function Nomina() {
  const { mes, anio } = usePeriod()
  const { username } = useAuth()

  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([])
  const [pagos, setPagos] = useState<PagoTrabajador[]>([])
  const [loading, setLoading] = useState(true)

  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoPuesto, setNuevoPuesto] = useState('')
  const [creandoTrabajador, setCreandoTrabajador] = useState(false)

  const [trabajadorId, setTrabajadorId] = useState('')
  const [concepto, setConcepto] = useState('Sueldo')
  const [monto, setMonto] = useState('')
  const [formaPago, setFormaPago] = useState<PaymentMethod>('efectivo')
  const [fechaPago, setFechaPago] = useState(() => new Date().toISOString().slice(0, 10))
  const [registrandoPago, setRegistrandoPago] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const [{ data: trab }, { data: pag }] = await Promise.all([
      supabase.from('trabajadores').select('*').order('nombre'),
      supabase
        .from('pagos_trabajadores')
        .select('*')
        .eq('mes', mes)
        .eq('anio', anio)
        .order('fecha_pago', { ascending: false }),
    ])
    setTrabajadores(trab ?? [])
    setPagos(pag ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, anio])

  const nombrePorId = useMemo(
    () => Object.fromEntries(trabajadores.map((t) => [t.id, t.nombre])),
    [trabajadores],
  )

  const reporteMensual = useMemo(() => {
    const total = pagos.reduce((s, p) => s + p.monto, 0)
    const porTrabajador = new Map<string, number>()
    for (const p of pagos) porTrabajador.set(p.trabajador_id, (porTrabajador.get(p.trabajador_id) ?? 0) + p.monto)
    const porMetodo: Record<string, number> = { efectivo: 0, tarjeta: 0, transferencia: 0, otro: 0, sin_metodo: 0 }
    for (const p of pagos) porMetodo[p.forma_pago] = (porMetodo[p.forma_pago] ?? 0) + p.monto
    return { total, porTrabajador, porMetodo }
  }, [pagos])

  const handleCrearTrabajador = async (e: FormEvent) => {
    e.preventDefault()
    if (!nuevoNombre.trim()) return
    setCreandoTrabajador(true)
    setError(null)
    const { error: err } = await supabase.from('trabajadores').insert({
      nombre: nuevoNombre.trim(),
      puesto: nuevoPuesto.trim() || null,
      created_by: username,
    })
    setCreandoTrabajador(false)
    if (err) {
      setError(err.message)
      return
    }
    setNuevoNombre('')
    setNuevoPuesto('')
    load()
  }

  const handleRegistrarPago = async (e: FormEvent) => {
    e.preventDefault()
    if (!trabajadorId) {
      setError('Selecciona un trabajador')
      return
    }
    const montoNum = Number(monto)
    if (!montoNum || montoNum <= 0) {
      setError('Ingresa un monto válido')
      return
    }
    setRegistrandoPago(true)
    setError(null)
    const { error: err } = await supabase.from('pagos_trabajadores').insert({
      trabajador_id: trabajadorId,
      concepto: concepto.trim() || 'Sueldo',
      monto: montoNum,
      forma_pago: formaPago,
      mes,
      anio,
      fecha_pago: fechaPago,
      registrado_por: username,
    })
    setRegistrandoPago(false)
    if (err) {
      setError(err.message)
      return
    }
    setMonto('')
    setConcepto('Sueldo')
    load()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <Wallet className="text-accent" size={22} />
          <div>
            <h1 className="text-2xl font-semibold text-white">Nómina</h1>
            <p className="text-sm text-gray-400">
              Pagos a trabajadores del gimnasio. Visible solo para superadministrador y administrador.
            </p>
          </div>
        </div>
        <PeriodSelector />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <form
          onSubmit={handleCrearTrabajador}
          className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3"
        >
          <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <UserPlus size={15} /> Nuevo trabajador
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              required
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Nombre completo"
              className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
            />
            <input
              value={nuevoPuesto}
              onChange={(e) => setNuevoPuesto(e.target.value)}
              placeholder="Puesto (opcional)"
              className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
            />
          </div>
          <button
            type="submit"
            disabled={creandoTrabajador}
            className="self-start px-3 py-1.5 text-xs rounded-lg bg-surface-2 border border-border text-gray-200 hover:border-accent/50 disabled:opacity-60"
          >
            {creandoTrabajador ? 'Guardando…' : 'Agregar trabajador'}
          </button>
        </form>

        <form
          onSubmit={handleRegistrarPago}
          className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3"
        >
          <h2 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <Plus size={15} /> Registrar pago
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <select
              required
              value={trabajadorId}
              onChange={(e) => setTrabajadorId(e.target.value)}
              className="col-span-2 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            >
              <option value="">Selecciona trabajador…</option>
              {trabajadores.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                  {t.puesto ? ` · ${t.puesto}` : ''}
                </option>
              ))}
            </select>
            <input
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Concepto"
              className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
            />
            <input
              required
              type="number"
              step="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="Monto"
              className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
            />
            <select
              value={formaPago}
              onChange={(e) => setFormaPago(e.target.value as PaymentMethod)}
              className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            >
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
              <option value="otro">Otro</option>
            </select>
            <input
              type="date"
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
              className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            />
          </div>
          <button
            type="submit"
            disabled={registrandoPago}
            className="self-start px-3 py-1.5 text-xs rounded-lg bg-accent hover:bg-accent-dark text-black font-medium disabled:opacity-60"
          >
            {registrandoPago ? 'Guardando…' : 'Registrar pago'}
          </button>
        </form>
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : (
        <>
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">Reporte mensual — {mes} {anio}</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-surface border border-accent/40 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-accent">${reporteMensual.total.toFixed(2)}</div>
                <div className="text-xs text-gray-500 mt-1">Total pagado</div>
              </div>
              <div className="bg-surface border border-border rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">{pagos.length}</div>
                <div className="text-xs text-gray-500 mt-1">Pagos registrados</div>
              </div>
              <div className="bg-surface border border-border rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">{reporteMensual.porTrabajador.size}</div>
                <div className="text-xs text-gray-500 mt-1">Trabajadores pagados</div>
              </div>
              <div className="bg-surface border border-border rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  $
                  {reporteMensual.porTrabajador.size > 0
                    ? (reporteMensual.total / reporteMensual.porTrabajador.size).toFixed(2)
                    : '0.00'}
                </div>
                <div className="text-xs text-gray-500 mt-1">Promedio por trabajador pagado</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="bg-surface border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-2">Por trabajador</h3>
                {reporteMensual.porTrabajador.size === 0 ? (
                  <p className="text-xs text-gray-500">Sin pagos este mes.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5 text-sm">
                    {Array.from(reporteMensual.porTrabajador.entries()).map(([id, total]) => (
                      <li key={id} className="flex justify-between text-gray-300">
                        <span>{nombrePorId[id] ?? id.slice(0, 8)}</span>
                        <span className="text-white">${total.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="bg-surface border border-border rounded-xl p-4">
                <h3 className="text-sm font-semibold text-white mb-2">Por método de pago</h3>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {Object.entries(reporteMensual.porMetodo)
                    .filter(([, total]) => total > 0)
                    .map(([metodo, total]) => (
                      <li key={metodo} className="flex justify-between text-gray-300">
                        <span>{PAGO_LABEL[metodo as PaymentMethod]}</span>
                        <span className="text-white">${total.toFixed(2)}</span>
                      </li>
                    ))}
                  {reporteMensual.total === 0 && <p className="text-xs text-gray-500">Sin pagos este mes.</p>}
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border text-sm font-semibold text-white">
              Historial de pagos — {mes} {anio}
            </div>
            {pagos.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">Sin pagos registrados este mes.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-border">
                      <th className="px-4 py-2 font-normal">Trabajador</th>
                      <th className="px-4 py-2 font-normal">Concepto</th>
                      <th className="px-4 py-2 font-normal">Monto</th>
                      <th className="px-4 py-2 font-normal">Método</th>
                      <th className="px-4 py-2 font-normal">Fecha</th>
                      <th className="px-4 py-2 font-normal">Registrado por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagos.map((p) => (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="px-4 py-2 text-white">{nombrePorId[p.trabajador_id] ?? '—'}</td>
                        <td className="px-4 py-2 text-gray-300">{p.concepto}</td>
                        <td className="px-4 py-2 text-gray-200">${p.monto.toFixed(2)}</td>
                        <td className="px-4 py-2 text-gray-400">{PAGO_LABEL[p.forma_pago]}</td>
                        <td className="px-4 py-2 text-gray-400">{new Date(p.fecha_pago).toLocaleDateString()}</td>
                        <td className="px-4 py-2 text-gray-400">{p.registrado_por || '—'}</td>
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
