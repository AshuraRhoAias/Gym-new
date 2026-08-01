import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePeriod } from '../context/PeriodContext'
import { decryptText, encryptText } from '../lib/crypto'
import { buildQrToken, qrToDataUrl } from '../lib/qr'
import { canSeeMoney } from '../lib/permissions'
import Modal from './Modal'
import EncryptedPhotoField, { type FotoRef } from './EncryptedPhotoField'
import DocumentoUploadField from './DocumentoUploadField'
import QrShareCard from './QrShareCard'
import {
  DOCUMENTOS_REQUERIDOS,
  MESES,
  type DocumentoArchivo,
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
  const { username, role } = useAuth()
  const moneyVisible = canSeeMoney(role)
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
        // Se descifran de forma asíncrona en el useEffect de abajo.
        telefono: '',
        bachillerato: initial.bachillerato,
        comentarios: '',
      }
    }
    return {
      ...emptyState(mes, anio),
      nombre: prefill?.nombre ?? '',
      telefono: prefill?.telefono ?? '',
      folio: prefill?.folio ?? '',
    }
  })
  // Id fijo desde el primer render: se usa como registro_id para los
  // documentos que se suban DURANTE la creación, antes de que la fila de
  // `registros` exista (se inserta con este mismo id al guardar).
  const registroIdRef = useRef(initial?.id ?? crypto.randomUUID())
  const [archivos, setArchivos] = useState<Record<string, DocumentoArchivo>>({})
  const [archivosLoading, setArchivosLoading] = useState(!!initial)
  const [fotoRef, setFotoRef] = useState<FotoRef | null>(
    initial?.foto_path && initial.foto_iv && initial.foto_salt
      ? { path: initial.foto_path, iv: initial.foto_iv, salt: initial.foto_salt }
      : null,
  )
  const [saving, setSaving] = useState(false)
  const [decrypting, setDecrypting] = useState(!!initial)
  const [error, setError] = useState<string | null>(null)
  const [qrPanel, setQrPanel] = useState<{ nombre: string; dataUrl: string; telefono: string | null } | null>(
    null,
  )

  useEffect(() => {
    if (!initial) return
    setArchivosLoading(true)
    supabase
      .from('documentos_archivos')
      .select('*')
      .eq('registro_id', initial.id)
      .then(({ data }) => {
        setArchivos(Object.fromEntries((data ?? []).map((d) => [d.documento, d as DocumentoArchivo])))
        setArchivosLoading(false)
      })
  }, [initial])

  useEffect(() => {
    if (!initial) return
    let active = true
    setDecrypting(true)
    Promise.all([decryptText(initial.telefono), decryptText(initial.comentarios)])
      .then(([telefono, comentarios]) => {
        if (!active) return
        setForm((f) => ({ ...f, telefono, comentarios }))
      })
      .catch(() => setError('No se pudieron descifrar algunos campos'))
      .finally(() => {
        if (active) setDecrypting(false)
      })
    return () => {
      active = false
    }
  }, [initial])

  const faltantes = DOCUMENTOS_REQUERIDOS.filter((d) => !archivos[d]).length

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

    let telefonoCifrado: string | null = null
    let comentariosCifrado: string | null = null
    try {
      ;[telefonoCifrado, comentariosCifrado] = await Promise.all([
        form.telefono.trim() ? encryptText(form.telefono.trim()) : Promise.resolve(null),
        form.comentarios.trim() ? encryptText(form.comentarios.trim()) : Promise.resolve(null),
      ])
    } catch {
      setError('No se pudieron cifrar los datos. Intenta de nuevo.')
      setSaving(false)
      return
    }

    const payload: Record<string, unknown> = {
      kind,
      nombre: form.nombre.trim(),
      folio: form.folio.trim() || '0',
      mes: form.mes,
      anio: form.anio,
      forma_pago: form.forma_pago,
      estatus: form.estatus,
      horario: form.horario.trim() || null,
      fecha_ingreso: form.fecha_ingreso ? new Date(form.fecha_ingreso).toISOString() : null,
      telefono: telefonoCifrado,
      bachillerato: form.bachillerato,
      comentarios: comentariosCifrado,
      foto_path: fotoRef?.path ?? null,
      foto_iv: fotoRef?.iv ?? null,
      foto_salt: fotoRef?.salt ?? null,
      atendido_por: initial?.atendido_por ?? username,
    }

    // Un rol sin permiso para ver montos tampoco los transmite: al editar se
    // omite la clave (se conserva el valor existente); al crear se guarda 0
    // y queda pendiente de que un admin/superadmin lo capture.
    if (moneyVisible) {
      payload.monto = Number(form.monto) || 0
    } else if (!initial) {
      payload.monto = 0
    }

    const registroId = registroIdRef.current
    if (initial) {
      const { error: updErr } = await supabase.from('registros').update(payload).eq('id', initial.id)
      if (updErr) {
        setError(updErr.message)
        setSaving(false)
        return
      }
    } else {
      // Se inserta con el id generado desde el primer render, para que
      // coincida con la carpeta de Storage donde ya se subieron (cifrados)
      // los documentos adjuntados mientras se llenaba el formulario.
      const { error: insErr } = await supabase.from('registros').insert({ id: registroId, ...payload })
      if (insErr) {
        setError(insErr.message)
        setSaving(false)
        return
      }
      // Los documentos subidos en modo diferido aún no existen en
      // documentos_archivos (la fila de registros no existía antes).
      const pendientes = Object.values(archivos).map(({ id: _id, created_at: _createdAt, ...rest }) => rest)
      if (pendientes.length > 0) {
        await supabase.from('documentos_archivos').upsert(pendientes, { onConflict: 'registro_id,documento' })
      }
    }

    const rows = DOCUMENTOS_REQUERIDOS.map((documento) => ({
      registro_id: registroId,
      documento,
      entregado: !!archivos[documento],
    }))
    await supabase.from('documentos_entregados').upsert(rows, { onConflict: 'registro_id,documento' })

    setSaving(false)

    // Al crear (no al editar) una inscripción/renovación se genera un QR de
    // acceso cifrado en vez de continuar de inmediato.
    if (!initial && registroId) {
      try {
        const token = await buildQrToken(registroId)
        const dataUrl = await qrToDataUrl(token)
        setQrPanel({ nombre: form.nombre.trim(), dataUrl, telefono: form.telefono.trim() || null })
        return
      } catch {
        // Si falla la generación del QR no bloqueamos el flujo de guardado.
      }
    }
    onSaved()
  }

  if (qrPanel) {
    const panel = (
      <QrShareCard
        nombre={qrPanel.nombre}
        dataUrl={qrPanel.dataUrl}
        telefono={qrPanel.telefono}
        onContinue={() => {
          setQrPanel(null)
          onSaved()
        }}
      />
    )
    return inline ? panel : (
      <Modal title="Código QR generado" onClose={() => { setQrPanel(null); onSaved() }} wide>
        {panel}
      </Modal>
    )
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
        {moneyVisible && (
          <TextField label="Monto" type="number" value={form.monto} onChange={(v) => update('monto', v)} placeholder="Ingrese el monto" />
        )}

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
          label="Número Telefónico (se cifra al guardar)"
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

      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Comentarios (se cifran al guardar)</label>
        <textarea
          value={form.comentarios}
          onChange={(e) => update('comentarios', e.target.value)}
          placeholder="Información adicional…"
          rows={3}
          className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent resize-none"
        />
      </div>

      <div className="bg-surface-2 border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-medium text-white">Documentos Entregados</h3>
          <span className="text-xs text-gray-400">
            {DOCUMENTOS_REQUERIDOS.length - faltantes}/{DOCUMENTOS_REQUERIDOS.length}
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Un documento solo cuenta como entregado cuando se le toma una foto o se sube el archivo
          (se cifra antes de subirse).
        </p>
        {archivosLoading ? (
          <p className="text-xs text-gray-500">Cargando documentos…</p>
        ) : (
          <div className="flex flex-col divide-y divide-border border border-border rounded-lg overflow-hidden">
            {DOCUMENTOS_REQUERIDOS.map((doc) => (
              <div key={doc} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-surface">
                <span className="text-xs text-gray-200 min-w-[150px]">{doc}</span>
                <DocumentoUploadField
                  registroId={registroIdRef.current}
                  documento={doc}
                  archivo={archivos[doc] ?? null}
                  deferred={!initial}
                  onUploaded={(archivo) => setArchivos((prev) => ({ ...prev, [doc]: archivo }))}
                />
              </div>
            ))}
          </div>
        )}
        {faltantes > 0 && (
          <p className="text-xs text-danger mt-3">Faltan {faltantes} documento(s)</p>
        )}
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Foto del alumno</label>
        <EncryptedPhotoField value={fotoRef} onChange={setFotoRef} />
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
          disabled={saving || decrypting || archivosLoading}
          className="px-4 py-2 text-sm rounded-lg bg-accent hover:bg-accent-dark disabled:opacity-60 text-black font-medium"
        >
          {decrypting ? 'Descifrando…' : saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Guardar Inscripción'}
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
