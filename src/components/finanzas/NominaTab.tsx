import { useState, type FormEvent } from 'react'
import { UserPlus, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import ComprobanteCfdiField from '../ComprobanteCfdiField'
import { TURNO_LABEL, type NominaMensual, type Trabajador, type Turno } from '../../types/database'

export default function NominaTab({
  mes,
  anio,
  trabajadores,
  nominaDelPeriodo,
  onChanged,
}: {
  mes: string
  anio: number
  trabajadores: Trabajador[]
  nominaDelPeriodo: NominaMensual[]
  onChanged: () => void
}) {
  const { username } = useAuth()
  const [nombre, setNombre] = useState('')
  const [puesto, setPuesto] = useState('')
  const [turno, setTurno] = useState<Turno>('manana')
  const [sueldo, setSueldo] = useState('')
  const [horario, setHorario] = useState('')
  const [saving, setSaving] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activos = trabajadores.filter((t) => t.activo)
  const totalSueldos = activos.reduce((s, t) => s + (t.sueldo_mensual ?? 0), 0)
  const nominaPorTrabajador = new Map(nominaDelPeriodo.map((n) => [n.trabajador_id, n]))

  const handleCrear = async (e: FormEvent) => {
    e.preventDefault()
    if (!nombre.trim()) return
    setSaving(true)
    setError(null)
    const { error: err } = await supabase.from('trabajadores').insert({
      nombre: nombre.trim(),
      puesto: puesto.trim() || null,
      turno,
      sueldo_mensual: sueldo ? Number(sueldo) : null,
      horario: horario.trim() || null,
      created_by: username,
    })
    setSaving(false)
    if (err) {
      setError(err.message)
      return
    }
    setNombre('')
    setPuesto('')
    setSueldo('')
    setHorario('')
    onChanged()
  }

  const handleGenerarNomina = async () => {
    setGenerando(true)
    setError(null)
    const faltantes = activos.filter((t) => !nominaPorTrabajador.has(t.id))
    if (faltantes.length > 0) {
      const { error: err } = await supabase.from('nomina_mensual').insert(
        faltantes.map((t) => ({
          trabajador_id: t.id,
          mes,
          anio,
          monto: t.sueldo_mensual ?? 0,
          timbrado: false,
          created_by: username,
        })),
      )
      if (err) {
        setError(err.message)
        setGenerando(false)
        return
      }
    }
    setGenerando(false)
    onChanged()
  }

  const updateEmpleado = async (id: string, patch: Partial<Trabajador>) => {
    await supabase.from('trabajadores').update(patch).eq('id', id)
    onChanged()
  }

  const updateNomina = async (id: string, patch: Partial<NominaMensual>) => {
    await supabase.from('nomina_mensual').update(patch).eq('id', id)
    onChanged()
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleCrear} className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
          <UserPlus size={15} /> Nuevo empleado
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre completo"
            className="col-span-2 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
          />
          <input
            value={puesto}
            onChange={(e) => setPuesto(e.target.value)}
            placeholder="Puesto"
            className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
          />
          <select
            value={turno}
            onChange={(e) => setTurno(e.target.value as Turno)}
            className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          >
            {Object.entries(TURNO_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            value={sueldo}
            onChange={(e) => setSueldo(e.target.value)}
            placeholder="Sueldo mensual"
            className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
          />
          <input
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
            placeholder="Horario (ej. 8am-3pm)"
            className="col-span-2 bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="self-start px-3 py-1.5 text-xs rounded-lg bg-accent hover:bg-accent-dark text-black font-medium disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Agregar empleado'}
        </button>
      </form>

      {error && <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">{error}</p>}

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-semibold text-white">Plantilla de empleados</span>
          <span className="text-xs text-gray-400">Total sueldos mensuales: ${totalSueldos.toFixed(2)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-left text-gray-500 border-b border-border">
                <th className="px-4 py-2 font-normal">Nombre</th>
                <th className="px-4 py-2 font-normal">Turno</th>
                <th className="px-4 py-2 font-normal">Sueldo mensual</th>
                <th className="px-4 py-2 font-normal">Horario</th>
                <th className="px-4 py-2 font-normal">Activo</th>
              </tr>
            </thead>
            <tbody>
              {trabajadores.map((t) => (
                <tr key={t.id} className="border-b border-border/50">
                  <td className="px-4 py-2 text-white whitespace-nowrap">{t.nombre}</td>
                  <td className="px-4 py-2">
                    <select
                      value={t.turno ?? ''}
                      onChange={(e) => updateEmpleado(t.id, { turno: (e.target.value || null) as Turno | null })}
                      className="bg-surface-2 border border-border rounded-md px-2 py-1 text-xs text-white"
                    >
                      <option value="">—</option>
                      {Object.entries(TURNO_LABEL).map(([v, l]) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={t.sueldo_mensual ?? ''}
                      onBlur={(e) => updateEmpleado(t.id, { sueldo_mensual: e.target.value ? Number(e.target.value) : null })}
                      className="w-28 bg-surface-2 border border-border rounded-md px-2 py-1 text-xs text-white"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      defaultValue={t.horario ?? ''}
                      onBlur={(e) => updateEmpleado(t.id, { horario: e.target.value || null })}
                      className="w-32 bg-surface-2 border border-border rounded-md px-2 py-1 text-xs text-white"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={t.activo}
                      onChange={(e) => updateEmpleado(t.id, { activo: e.target.checked })}
                    />
                  </td>
                </tr>
              ))}
              {trabajadores.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    Sin empleados registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-semibold text-white">
            Nómina del periodo — {mes} {anio}
          </span>
          <button
            onClick={handleGenerarNomina}
            disabled={generando}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-surface-2 border border-border text-gray-200 hover:border-accent/50 disabled:opacity-60"
          >
            <RefreshCw size={13} /> {generando ? 'Generando…' : 'Generar nómina del mes'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[750px]">
            <thead>
              <tr className="text-left text-gray-500 border-b border-border">
                <th className="px-4 py-2 font-normal">Empleado</th>
                <th className="px-4 py-2 font-normal">Monto</th>
                <th className="px-4 py-2 font-normal">Timbrado / comprobante (para el SAT)</th>
              </tr>
            </thead>
            <tbody>
              {nominaDelPeriodo.map((n) => {
                const emp = trabajadores.find((t) => t.id === n.trabajador_id)
                return (
                  <tr key={n.id} className="border-b border-border/50">
                    <td className="px-4 py-2 text-white">{emp?.nombre ?? '—'}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={n.monto}
                        onBlur={(e) => updateNomina(n.id, { monto: Number(e.target.value) })}
                        className="w-28 bg-surface-2 border border-border rounded-md px-2 py-1 text-xs text-white"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <label className="flex items-center gap-1.5 text-xs text-gray-300 mb-1.5">
                        <input
                          type="checkbox"
                          checked={n.timbrado}
                          onChange={(e) => updateNomina(n.id, { timbrado: e.target.checked })}
                        />
                        {n.timbrado ? 'Sí' : 'No'}
                      </label>
                      {n.timbrado && (
                        <ComprobanteCfdiField
                          folio={n.folio_comprobante ?? ''}
                          onFolioChange={(v) => updateNomina(n.id, { folio_comprobante: v || null })}
                          comprobante={{
                            comprobante_path: n.comprobante_path,
                            comprobante_iv: n.comprobante_iv,
                            comprobante_salt: n.comprobante_salt,
                            comprobante_mime: n.comprobante_mime,
                          }}
                          onComprobanteChange={(v) => updateNomina(n.id, v)}
                        />
                      )}
                    </td>
                  </tr>
                )
              })}
              {nominaDelPeriodo.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                    Sin nómina generada para este periodo. Usa "Generar nómina del mes".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
