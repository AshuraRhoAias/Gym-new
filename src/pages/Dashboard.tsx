import { useEffect, useMemo, useState } from 'react'
import { FileText, RefreshCw, Eye, Pencil, Loader2, Trash2, FolderOpen } from 'lucide-react'
import { usePeriod } from '../context/PeriodContext'
import { usePrivacy, tieneFolio } from '../context/PrivacyContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { decryptText } from '../lib/crypto'
import { canDelete } from '../lib/permissions'
import PeriodSelector from '../components/PeriodSelector'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import Modal from '../components/Modal'
import RegistroForm from '../components/RegistroForm'
import EncryptedPhotoViewer from '../components/EncryptedPhotoViewer'
import ExpedienteModal from '../components/ExpedienteModal'
import Masked from '../components/Masked'
import { useRegistros } from '../hooks/useRegistros'
import { PAGO_LABEL, type Registro, type RecordKind } from '../types/database'

function DecryptedField({
  label,
  cipher,
  masked,
}: {
  label: string
  cipher: string | null
  masked?: boolean
}) {
  const [value, setValue] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (masked) return <Field label={label} value="••••••••" />

  if (!cipher) return <Field label={label} value="—" />

  if (value !== null) return <Field label={label} value={value} />

  return (
    <div>
      <dt className="text-gray-500 text-xs mb-0.5">{label}</dt>
      <dd>
        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            setLoading(true)
            setValue(await decryptText(cipher))
            setLoading(false)
          }}
          className="flex items-center gap-1.5 text-xs bg-surface-2 border border-border rounded-md px-2 py-1 text-gray-300 hover:border-accent/50"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : null}
          {loading ? 'Descifrando…' : 'Mostrar'}
        </button>
      </dd>
    </div>
  )
}

const TABS: { key: RecordKind; label: string }[] = [
  { key: 'inscripcion', label: 'Inscripción' },
  { key: 'renovacion', label: 'Renovación' },
  { key: 'inscripcion_bacho', label: 'Inscripción Bacho' },
  { key: 'renovacion_bacho', label: 'Renovación Bacho' },
]

function useCount(kind: RecordKind, mes: string, anio: number) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let active = true
    supabase
      .from('registros')
      .select('id', { count: 'exact', head: true })
      .eq('kind', kind)
      .eq('mes', mes)
      .eq('anio', anio)
      .then(({ count: c }) => {
        if (active) setCount(c ?? 0)
      })
    return () => {
      active = false
    }
  }, [kind, mes, anio])
  return count
}

export default function Dashboard() {
  const { mes, anio } = usePeriod()
  const { role } = useAuth()
  const { hideSinFolio } = usePrivacy()
  const [tab, setTab] = useState<RecordKind>('inscripcion')
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState<Registro | null>(null)
  const [editing, setEditing] = useState<Registro | null>(null)
  const [expediente, setExpediente] = useState<Registro | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const { data, loading, refresh } = useRegistros(tab, mes, anio)

  const handleDelete = async (r: Registro) => {
    if (!confirm(`¿Borrar el registro de "${r.nombre}"? Esta acción no se puede deshacer.`)) return
    setDeleting(r.id)
    await supabase.from('registros').delete().eq('id', r.id)
    setDeleting(null)
    refresh()
  }

  const countInscripcion = useCount('inscripcion', mes, anio)
  const countRenovacion = useCount('renovacion', mes, anio)
  const countInscripcionBacho = useCount('inscripcion_bacho', mes, anio)
  const countRenovacionBacho = useCount('renovacion_bacho', mes, anio)

  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const q = search.toLowerCase()
    return data.filter(
      (r) => r.nombre.toLowerCase().includes(q) || (r.folio ?? '').toLowerCase().includes(q),
    )
  }, [data, search])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">Bienvenido. Gestiona inscripciones y renovaciones.</p>
        </div>
        <PeriodSelector />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Inscripciones" value={countInscripcion} hint={`en ${mes}`} icon={FileText} accent="text-accent" />
        <StatCard label="Renovaciones" value={countRenovacion} hint={`en ${mes}`} icon={RefreshCw} accent="text-info" />
        <StatCard label="Inscripciones Bacho" value={countInscripcionBacho} hint={`en ${mes}`} icon={FileText} accent="text-warning" />
        <StatCard label="Renovaciones Bacho" value={countRenovacionBacho} hint={`en ${mes}`} icon={RefreshCw} accent="text-danger" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border">
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
                tab === t.key
                  ? 'border-accent text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, folio…"
          className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:border-accent w-56"
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-1">
          {TABS.find((t) => t.key === tab)?.label}
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Listado de registros de {TABS.find((t) => t.key === tab)?.label.toLowerCase()} para {mes}
        </p>

        <div className="bg-surface border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-gray-400 border-b border-border">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Folio</th>
                <th className="px-4 py-3 font-medium">Estatus</th>
                <th className="px-4 py-3 font-medium">Forma de Pago</th>
                <th className="px-4 py-3 font-medium">Horario</th>
                <th className="px-4 py-3 font-medium">Atendido por</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Cargando…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Sin registros para este periodo.
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border/60 hover:bg-surface-2/60">
                  <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                    <Masked folio={r.folio} value={r.nombre} />
                  </td>
                  <td className="px-4 py-3 text-gray-300">{r.folio || '0'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.estatus} />
                  </td>
                  <td className="px-4 py-3 text-gray-300">{PAGO_LABEL[r.forma_pago]}</td>
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{r.horario || '—'}</td>
                  <td className="px-4 py-3 text-gray-300">
                    <Masked folio={r.folio} value={r.atendido_por || '—'} />
                  </td>
                  <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                    {r.fecha_ingreso ? new Date(r.fecha_ingreso).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setDetail(r)}
                        className="text-gray-400 hover:text-accent"
                        title="Ver detalle"
                      >
                        <Eye size={16} />
                      </button>
                      {role !== 'viewer' && (
                        <button
                          onClick={() => setEditing(r)}
                          className="text-gray-400 hover:text-accent"
                          title="Editar"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {role !== 'viewer' && (
                        <button
                          onClick={() => setExpediente(r)}
                          className="text-gray-400 hover:text-accent"
                          title="Expediente (documentos y firmas)"
                        >
                          <FolderOpen size={16} />
                        </button>
                      )}
                      {canDelete(role) && (
                        <button
                          onClick={() => handleDelete(r)}
                          disabled={deleting === r.id}
                          className="text-gray-400 hover:text-danger disabled:opacity-50"
                          title="Borrar"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detail && (
        <Modal title="Detalles del registro" onClose={() => setDetail(null)}>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Field label="Nombre" value={<Masked folio={detail.folio} value={detail.nombre} />} />
            <Field label="Folio" value={detail.folio || '0'} />
            <Field label="Mes" value={detail.mes} />
            <Field label="Estatus" value={<StatusBadge status={detail.estatus} />} />
            <Field label="Forma de pago" value={PAGO_LABEL[detail.forma_pago]} />
            <Field label="Monto" value={detail.monto === null ? 'Oculto para tu rol' : `$${detail.monto.toFixed(2)}`} />
            {detail.comision_tarjeta != null && detail.monto != null && (
              <>
                <Field label="Comisión tarjeta (4.06%)" value={`-$${detail.comision_tarjeta.toFixed(2)}`} />
                <Field label="Te llegó" value={`$${(detail.monto - detail.comision_tarjeta).toFixed(2)}`} />
              </>
            )}
            <Field label="Atendido por" value={detail.atendido_por || '—'} />
            <Field label="Horario" value={detail.horario || '—'} />
            <DecryptedField
              label="Teléfono"
              cipher={detail.telefono}
              masked={hideSinFolio && !tieneFolio(detail.folio)}
            />
            <Field
              label="Fecha de ingreso"
              value={detail.fecha_ingreso ? new Date(detail.fecha_ingreso).toLocaleString() : '—'}
            />
          </dl>
          {detail.comentarios && (
            <div className="mt-4 pt-4 border-t border-border text-sm text-gray-300">
              <span className="text-gray-500 block text-xs mb-1">Comentarios (cifrados):</span>
              {hideSinFolio && !tieneFolio(detail.folio) ? (
                <p>••••••••</p>
              ) : (
                <DecryptedComentarios cipher={detail.comentarios} />
              )}
            </div>
          )}
          {detail.foto_path && detail.foto_iv && detail.foto_salt && !(hideSinFolio && !tieneFolio(detail.folio)) && (
            <div className="mt-4 pt-4 border-t border-border">
              <span className="text-gray-500 block text-xs mb-2">Foto del alumno (cifrada):</span>
              <EncryptedPhotoViewer path={detail.foto_path} iv={detail.foto_iv} salt={detail.foto_salt} />
            </div>
          )}
        </Modal>
      )}

      {editing && (
        <RegistroForm
          kind={tab}
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            refresh()
          }}
        />
      )}

      {expediente && <ExpedienteModal registro={expediente} onClose={() => setExpediente(null)} />}
    </div>
  )
}

function DecryptedComentarios({ cipher }: { cipher: string }) {
  const [value, setValue] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (value !== null) return <p>{value}</p>

  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true)
        setValue(await decryptText(cipher))
        setLoading(false)
      }}
      className="flex items-center gap-1.5 text-xs bg-surface-2 border border-border rounded-md px-2 py-1 text-gray-300 hover:border-accent/50"
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : null}
      {loading ? 'Descifrando…' : 'Mostrar comentarios'}
    </button>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-gray-500 text-xs mb-0.5">{label}</dt>
      <dd className="text-white">{value}</dd>
    </div>
  )
}
