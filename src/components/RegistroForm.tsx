import { useEffect, useRef, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePeriod } from '../context/PeriodContext'
import { decryptText, encryptText } from '../lib/crypto'
import { buildQrToken, buildQrFlyerDataUrl } from '../lib/qr'
import { canSeeMoney } from '../lib/permissions'
import Modal from './Modal'
import EncryptedPhotoField, { type FotoRef } from './EncryptedPhotoField'
import DocumentoUploadField from './DocumentoUploadField'
import QrShareCard from './QrShareCard'
import {
  COMISION_TARJETA_PCT,
  DOCUMENTOS_REQUERIDOS,
  MESES,
  calcularComisionTarjeta,
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
  prefill?: Partial<Pick<Registro, 'nombre' | 'telefono' | 'folio' | 'folio_anterior'>>
  onClose: () => void
  onSaved: () => void
  /** Cuando es true se renderiza como tarjeta embebida en la página en vez de modal. */
  inline?: boolean
  /** Si se pasa, el panel de QR muestra un botón para volver a un formulario en blanco sin salir de la página. */
  onRegisterAnother?: () => void
  registerAnotherLabel?: string
}

interface FormState {
  nombre: string
  kind: RecordKind
  folio: string
  folioAnterior: string
  mes: string
  anio: number
  forma_pago: PaymentMethod
  monto: string
  pago1FormaPago: PaymentMethod
  pago1Monto: string
  pago2FormaPago: PaymentMethod
  pago2Monto: string
  saldoPendiente: string
  estatus: RecordStatus
  horario: string
  fecha_ingreso: string
  telefono: string
  bachillerato: boolean
  beca: boolean
  becaAutorizadoPor: string
  becaMonto: string
  comentarios: string
}

const emptyState = (mes: string, anio: number, kind: RecordKind): FormState => ({
  nombre: '',
  kind,
  folio: '',
  folioAnterior: '',
  mes,
  anio,
  forma_pago: 'efectivo',
  monto: '',
  pago1FormaPago: 'efectivo',
  pago1Monto: '',
  pago2FormaPago: 'efectivo',
  pago2Monto: '',
  saldoPendiente: '',
  estatus: 'pendiente',
  horario: '',
  fecha_ingreso: '',
  telefono: '',
  bachillerato: false,
  beca: false,
  becaAutorizadoPor: '',
  becaMonto: '',
  comentarios: '',
})

export default function RegistroForm({
  kind,
  initial,
  prefill,
  onClose,
  onSaved,
  inline,
  onRegisterAnother,
  registerAnotherLabel,
}: RegistroFormProps) {
  const { username, role } = useAuth()
  const moneyVisible = canSeeMoney(role)
  const { mes, anio } = usePeriod()
  const [form, setForm] = useState<FormState>(() => {
    if (initial) {
      return {
        nombre: initial.nombre,
        kind: initial.kind,
        folio: initial.folio ?? '',
        folioAnterior: initial.folio_anterior ?? '',
        mes: initial.mes,
        anio: initial.anio,
        forma_pago: initial.forma_pago,
        // El monto guardado ya tiene la beca descontada; se reconstruye el
        // monto "de lista" sumando la beca de vuelta para poder editarlo.
        monto:
          initial.beca && initial.monto != null
            ? String(initial.monto + (initial.beca_monto ?? 0))
            : String(initial.monto ?? ''),
        pago1FormaPago: initial.pago1_forma_pago ?? 'efectivo',
        pago1Monto: initial.pago1_monto != null ? String(initial.pago1_monto) : '',
        pago2FormaPago: initial.pago2_forma_pago ?? 'efectivo',
        pago2Monto: initial.pago2_monto != null ? String(initial.pago2_monto) : '',
        saldoPendiente: initial.saldo_pendiente != null ? String(initial.saldo_pendiente) : '',
        estatus: initial.estatus,
        horario: initial.horario ?? '',
        fecha_ingreso: initial.fecha_ingreso ? initial.fecha_ingreso.slice(0, 16) : '',
        // Se descifran de forma asíncrona en el useEffect de abajo.
        telefono: '',
        bachillerato: initial.bachillerato,
        beca: initial.beca,
        becaAutorizadoPor: initial.beca_autorizado_por ?? '',
        becaMonto: initial.beca_monto != null ? String(initial.beca_monto) : '',
        comentarios: '',
      }
    }
    return {
      ...emptyState(mes, anio, kind),
      nombre: prefill?.nombre ?? '',
      telefono: prefill?.telefono ?? '',
      folio: prefill?.folio ?? '',
      folioAnterior: prefill?.folio_anterior ?? prefill?.folio ?? '',
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
  const [qrPanel, setQrPanel] = useState<{
    nombre: string
    dataUrl: string
    telefono: string | null
    monto: number | null
    comisionTarjeta: number | null
  } | null>(null)

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

  const handleKindChange = (newKind: RecordKind) =>
    setForm((f) => ({ ...f, kind: newKind, bachillerato: newKind === 'inscripcion_bacho' || newKind === 'renovacion_bacho' }))

  const handleBachilleratoChange = (checked: boolean) =>
    setForm((f) => {
      const esRenovacion = f.kind === 'renovacion' || f.kind === 'renovacion_bacho'
      const newKind: RecordKind = checked
        ? esRenovacion
          ? 'renovacion_bacho'
          : 'inscripcion_bacho'
        : esRenovacion
          ? 'renovacion'
          : 'inscripcion'
      return { ...f, bachillerato: checked, kind: newKind }
    })

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
      kind: form.kind,
      nombre: form.nombre.trim(),
      folio: form.folio.trim() || '0',
      folio_anterior: form.folioAnterior.trim() || null,
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
      if (form.forma_pago === 'dos_pagos') {
        const pago1Monto = Number(form.pago1Monto) || 0
        const pago2Monto = Number(form.pago2Monto) || 0
        payload.monto = pago1Monto + pago2Monto
        payload.pago1_forma_pago = form.pago1FormaPago
        payload.pago1_monto = pago1Monto
        payload.pago2_forma_pago = form.pago2FormaPago
        payload.pago2_monto = pago2Monto
        payload.comision_tarjeta =
          (form.pago1FormaPago === 'tarjeta' && pago1Monto > 0 ? calcularComisionTarjeta(pago1Monto) : 0) +
          (form.pago2FormaPago === 'tarjeta' && pago2Monto > 0 ? calcularComisionTarjeta(pago2Monto) : 0) || null
        payload.beca = false
        payload.beca_autorizado_por = null
        payload.beca_monto = null
      } else {
        const montoLista = Number(form.monto) || 0
        const becaMonto = form.beca ? Number(form.becaMonto) || 0 : 0
        const monto = Math.max(0, montoLista - becaMonto)
        payload.monto = monto
        payload.comision_tarjeta = form.forma_pago === 'tarjeta' && monto > 0 ? calcularComisionTarjeta(monto) : null
        payload.pago1_forma_pago = null
        payload.pago1_monto = null
        payload.pago2_forma_pago = null
        payload.pago2_monto = null
        payload.beca = form.beca
        payload.beca_autorizado_por = form.beca ? form.becaAutorizadoPor.trim() || null : null
        payload.beca_monto = form.beca ? becaMonto : null
      }
      payload.saldo_pendiente = form.saldoPendiente.trim() ? Number(form.saldoPendiente) : null
    } else if (!initial) {
      payload.monto = 0
      payload.comision_tarjeta = null
      payload.saldo_pendiente = null
      payload.pago1_forma_pago = null
      payload.pago1_monto = null
      payload.pago2_forma_pago = null
      payload.pago2_monto = null
      payload.beca = false
      payload.beca_autorizado_por = null
      payload.beca_monto = null
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
        const dataUrl = await buildQrFlyerDataUrl(token)
        setQrPanel({
          nombre: form.nombre.trim(),
          dataUrl,
          telefono: form.telefono.trim() || null,
          monto: (payload.monto as number | undefined) ?? null,
          comisionTarjeta: (payload.comision_tarjeta as number | null) ?? null,
        })
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
        monto={qrPanel.monto}
        comisionTarjeta={qrPanel.comisionTarjeta}
        onContinue={() => {
          setQrPanel(null)
          onSaved()
        }}
        onRegisterAnother={
          onRegisterAnother
            ? () => {
                setQrPanel(null)
                onRegisterAnother()
              }
            : undefined
        }
        registerAnotherLabel={registerAnotherLabel}
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

        {initial && (
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Tipo de registro</label>
            <select
              value={form.kind}
              onChange={(e) => handleKindChange(e.target.value as RecordKind)}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            >
              <option value="inscripcion">Inscripción</option>
              <option value="renovacion">Renovación</option>
              <option value="inscripcion_bacho">Inscripción Bacho</option>
              <option value="renovacion_bacho">Renovación Bacho</option>
            </select>
          </div>
        )}

        {(form.kind === 'renovacion' || form.kind === 'renovacion_bacho') && (
          <TextField
            label="Folio anterior"
            value={form.folioAnterior}
            onChange={(v) => update('folioAnterior', v)}
            placeholder="Folio que tenía antes de renovar"
          />
        )}

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
            <option value="dos_pagos">2 Pagos</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        {moneyVisible && form.forma_pago !== 'dos_pagos' && (
          <div>
            <TextField label="Monto" type="number" value={form.monto} onChange={(v) => update('monto', v)} placeholder="Ingrese el monto" />
            <MontoPresets value={form.monto} onSelect={(v) => update('monto', v)} />
            {form.forma_pago === 'tarjeta' && Number(form.monto) > 0 && (
              <p className="text-xs text-warning mt-1.5">
                Comisión tarjeta ({COMISION_TARJETA_PCT}%): -${calcularComisionTarjeta(Number(form.monto)).toFixed(2)} ·{' '}
                <span className="text-accent">
                  Te llega: ${(Number(form.monto) - calcularComisionTarjeta(Number(form.monto))).toFixed(2)}
                </span>
              </p>
            )}
          </div>
        )}
        {moneyVisible && form.forma_pago !== 'dos_pagos' && (
          <div className="sm:col-span-2 bg-surface-2/50 border border-border rounded-lg p-3">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={form.beca}
                onChange={(e) => update('beca', e.target.checked)}
                className="accent-accent"
              />
              ¿Aplica beca?
            </label>
            {form.beca && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <TextField
                  label="Beca autorizada por"
                  value={form.becaAutorizadoPor}
                  onChange={(v) => update('becaAutorizadoPor', v)}
                  placeholder="Nombre de quien autorizó la beca"
                />
                <TextField
                  label="Monto de la beca ($)"
                  type="number"
                  value={form.becaMonto}
                  onChange={(v) => update('becaMonto', v)}
                  placeholder="0.00"
                />
              </div>
            )}
            {form.beca && Number(form.becaMonto) > 0 && (
              <p className="text-xs text-accent mt-2">
                Monto a cobrar con beca: ${Math.max(0, (Number(form.monto) || 0) - Number(form.becaMonto)).toFixed(2)}
              </p>
            )}
          </div>
        )}
        {moneyVisible && form.forma_pago === 'dos_pagos' && (
          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface-2/50 border border-border rounded-lg p-3">
            {(['pago1', 'pago2'] as const).map((pago, i) => {
              const formaKey = pago === 'pago1' ? 'pago1FormaPago' : 'pago2FormaPago'
              const montoKey = pago === 'pago1' ? 'pago1Monto' : 'pago2Monto'
              const formaValue = form[formaKey]
              const montoValue = form[montoKey]
              return (
                <div key={pago} className="flex flex-col gap-2">
                  <span className="text-xs text-gray-400">Pago {i + 1}</span>
                  <select
                    value={formaValue}
                    onChange={(e) => update(formaKey, e.target.value as PaymentMethod)}
                    className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="otro">Otro</option>
                  </select>
                  <TextField label="" value={montoValue} type="number" onChange={(v) => update(montoKey, v)} placeholder="Monto" />
                  <MontoPresets value={montoValue} onSelect={(v) => update(montoKey, v)} />
                  {formaValue === 'tarjeta' && Number(montoValue) > 0 && (
                    <p className="text-xs text-warning">
                      Comisión ({COMISION_TARJETA_PCT}%): -${calcularComisionTarjeta(Number(montoValue)).toFixed(2)}
                    </p>
                  )}
                </div>
              )
            })}
            <p className="sm:col-span-2 text-xs text-gray-400">
              Total: ${((Number(form.pago1Monto) || 0) + (Number(form.pago2Monto) || 0)).toFixed(2)}
            </p>
          </div>
        )}
        {moneyVisible && (
          <TextField
            label="Saldo pendiente"
            type="number"
            value={form.saldoPendiente}
            onChange={(v) => update('saldoPendiente', v)}
            placeholder={form.forma_pago === 'dos_pagos' ? 'Monto que falta por pagar' : 'Dejar vacío si no debe nada'}
          />
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
          onChange={(e) => handleBachilleratoChange(e.target.checked)}
          className="accent-accent"
        />
        ¿Es bachillerato? (mueve el registro a {form.kind === 'renovacion' || form.kind === 'renovacion_bacho' ? 'Renovación' : 'Inscripción'} Bacho)
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

/** Montos frecuentes para captura rápida; solo se muestran junto a un campo de Monto ya protegido por moneyVisible. */
const MONTO_PRESETS = [555, 389, 309, 300]

function MontoPresets({ value, onSelect }: { value: string; onSelect: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {MONTO_PRESETS.map((preset) => (
        <button
          key={preset}
          type="button"
          onClick={() => onSelect(String(preset))}
          className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
            value === String(preset)
              ? 'bg-accent text-black border-accent font-medium'
              : 'bg-surface-2 border-border text-gray-300 hover:border-accent/50'
          }`}
        >
          ${preset}
        </button>
      ))}
    </div>
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
