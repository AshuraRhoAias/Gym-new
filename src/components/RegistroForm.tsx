import { useEffect, useState, type FormEvent } from 'react'
import { Camera } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePeriod } from '../context/PeriodContext'
import Modal from './Modal'
import {
  DOCUMENTOS_REQUERIDOS,
  MESES,
  type PaymentMethod,
  type RecordKind,
  type RecordStatus,
  type Registro,
} from '../types/database'

interface RegistroFormProps {
  kind: RecordKind
  /** Registro existente a editar (actualiza en vez de insertar). */
  initial?: Registro
  /** Datos para precargar un registro NUEVO (ej. nombre/teléfono encontrados al buscar). */
  prefill?: Partial<Pick<Registro, 'nombre' | 'telefono' | 'folio'>>
  onClose: () => void
  onSaved: () => void
  /** Cuando es true se renderiza como tarjeta embebida en la página en vez de modal. */
  inline?: boolean
}

interface FormState {
  nombre: string
  folio: string
  mes: string
  anio: number
  forma_pago: PaymentMethod
  monto: string
  estatus: RecordStatus
  horario: string
  fecha_ingreso: string
  telefono: string
  bachillerato: boolean
  comentarios: string
}

const emptyState = (mes: string, anio: number): FormState => ({
  nombre: '',
  folio: '',
  mes,
  anio,
  forma_pago: 'efectivo',
  monto: '',
  estatus: 'pendiente',
  horario: '',
  fecha_ingreso: '',
  telefono: '',
  bachillerato: false,
  comentarios: '',
})

export default function RegistroForm({ kind, initial, prefill, onClose, onSaved, inline }: RegistroFormProps) {
  const { username } = useAuth()
  const { mes, anio } = usePeriod()
  const [form, setForm] = useState<FormState>(() => {
    if (initial) {
      return {
        nombre: initial.nombre,
        folio: initial.folio ?? '',
        mes: initial.mes,
        anio: initial.anio,
        forma_pago: initial.forma_pago,
        monto: String(initial.monto ?? ''),
        estatus: initial.estatus,
        horario: initial.horario ?? '',
        fecha_ingreso: initial.fecha_ingreso ? initial.fecha_ingreso.slice(0, 16) : '',
        telefono: initial.telefono ?? '',
        bachillerato: initial.bachillerato,
        comentarios: initial.comentarios ?? '',
      }
    }
    return {
      ...emptyState(mes, anio),
      nombre: prefill?.nombre ?? '',
      telefono: prefill?.telefono ?? '',
      folio: prefill?.folio ?? '',
    }
  })
  const [docs, setDocs] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(DOCUMENTOS_REQUERIDOS.map((d) => [d, false])),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!initial) return
    supabase
      .from('documentos_entregados')
      .select('documento, entregado')
      .eq('registro_id', initial.id)
      .then(({ data }) => {
        if (!data) return
        setDocs((prev) => {
          const next = { ...prev }
          for (const row of data) next[row.documento] = row.entregado
          return next
        })
      })
  }, [initial])

  const faltantes = DOCUMENTOS_REQUERIDOS.filter((d) => !docs[d]).length

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio')
      return
    }
    setSaving(true)
    setError(null)

    const payload = {
      kind,
      nombre: form.nombre.trim(),
      folio: form.folio.trim() || '0',
      mes: form.mes,
      anio: form.anio,
      forma_pago: form.forma_pago,
      monto: Number(form.monto) || 0,
      estatus: form.estatus,
      horario: form.horario.trim() || null,
      fecha_ingreso: form.fecha_ingreso ? new Date(form.fecha_ingreso).toISOString() : null,
      telefono: form.telefono.trim() || null,
      bachillerato: form.bachillerato,
      comentarios: form.comentarios.trim() || null,
      atendido_por: initial?.atendido_por ?? username,
    }

    let registroId = initial?.id
    if (initial) {
      const { error: updErr } = await supabase.from('registros').update(payload).eq('id', initial.id)
      if (updErr) {
        setError(updErr.message)
        setSaving(false)
        return
      }
    } else {
      const { data, error: insErr } = await supabase.from('registros').insert(payload).select('id').single()
      if (insErr || !data) {
        setError(insErr?.message ?? 'No se pudo guardar')
        setSaving(false)
        return
      }
      registroId = data.id
    }

    if (registroId) {
      const rows = DOCUMENTOS_REQUERIDOS.map((documento) => ({
        registro_id: registroId!,
        documento,
        entregado: docs[documento],
      }))
      await supabase.from('documentos_entregados').upsert(rows, { onConflict: 'registro_id,documento' })
    }

    setSaving(false)
    onSaved()
  }

  const content = (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField label="Nombre *" value={form.nombre} onChange={(v) => update('nombre', v)} required />
        <TextField label="Folio" value={form.folio} onChange={(v) => update('folio', v)} />

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Mes</label>
          <select
            value={form.mes}
            onChange={(e) => update('mes', e.target.value)}
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          >
            {MESES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <TextField
          label="Año"
          type="number"
          value={String(form.anio)}
          onChange={(v) => update('anio', Number(v) || form.anio)}
        />

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Forma de Pago</label>
          <select
            value={form.forma_pago}
            onChange={(e) => update('forma_pago', e.target.value as PaymentMethod)}
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          >
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="transferencia">Transferencia</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <TextField label="Monto" type="number" value={form.monto} onChange={(v) => update('monto', v)} placeholder="Ingrese el monto" />

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Estatus</label>
          <select
            value={form.estatus}
            onChange={(e) => update('estatus', e.target.value as RecordStatus)}
            className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          >
            <option value="pendiente">Pendiente</option>
            <option value="faltan_doc">Faltan doc.</option>
            <option value="tramitar_hoja">Tramitar hoja</option>
            <option value="completo">Completo</option>
            <option value="entregado">Entregado</option>
          </select>
        </div>
        <TextField label="Horario" value={form.horario} onChange={(v) => update('horario', v)} placeholder="Ej: 9:00 - 12:00" />

        <TextField
          label="Fecha y Hora de Ingreso"
          type="datetime-local"
          value={form.fecha_ingreso}
          onChange={(v) => update('fecha_ingreso', v)}
        />
        <TextField
          label="Número Telefónico"
          value={form.telefono}
          onChange={(v) => update('telefono', v)}
          placeholder="Ej: +52 123 456 7890"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-300">
        <input
          type="checkbox"
          checked={form.bachillerato}
          onChange={(e) => update('bachillerato', e.target.checked)}
          className="accent-accent"
        />
        ¿Es bachillerato?
      </label>

      <div className="bg-surface-2 border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-medium text-white">Documentos Entregados</h3>
          <span className="text-xs text-gray-400">
            {DOCUMENTOS_REQUERIDOS.length - faltantes}/{DOCUMENTOS_REQUERIDOS.length}
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-3">Marca los documentos que YA han sido entregados</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DOCUMENTOS_REQUERIDOS.map((doc) => (
            <label
              key={doc}
              className="flex items-center gap-2 bg-surface border border-border rounded-md px-2.5 py-2 text-xs text-gray-200 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={docs[doc]}
                onChange={(e) => setDocs((d) => ({ ...d, [doc]: e.target.checked }))}
                className="accent-accent"
              />
              {doc}
            </label>
          ))}
        </div>
        {faltantes > 0 && (
          <p className="text-xs text-danger mt-3">Faltan {faltantes} documento(s)</p>
        )}
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Foto del alumno</label>
        <div className="w-24 h-24 border border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 text-gray-500 cursor-pointer hover:border-accent/50">
          <Camera size={18} />
          <span className="text-[10px] text-center leading-tight px-1">Haz clic para subir foto</span>
        </div>
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex justify-end gap-2">
        {!inline && (
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-border text-gray-300 hover:bg-surface-2"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm rounded-lg bg-accent hover:bg-accent-dark disabled:opacity-60 text-black font-medium"
        >
          {saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Guardar Inscripción'}
        </button>
      </div>
    </form>
  )

  if (inline) {
    return <div className="bg-surface border border-border rounded-xl p-5">{content}</div>
  }

  return (
    <Modal
      title={initial ? 'Editar registro' : 'Nuevo registro'}
      subtitle={initial ? 'Modifica los datos del registro.' : undefined}
      onClose={onClose}
      wide
    >
      {content}
    </Modal>
  )
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
      />
    </div>
  )
}
