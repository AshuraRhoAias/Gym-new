import { useEffect, useMemo, useState } from 'react'
import { MessageCircle, Send, Loader2, CheckCircle2, Search } from 'lucide-react'
import { usePeriod } from '../context/PeriodContext'
import { usePeriodRegistros } from '../hooks/usePeriodRegistros'
import { decryptText } from '../lib/crypto'
import { buildQrToken, qrToDataUrl } from '../lib/qr'
import { checkWhatsAppNumber, sendQrByWhatsApp, WHATSAPP_ERROR_LABEL } from '../lib/whatsappService'
import PeriodSelector from '../components/PeriodSelector'
import StatusBadge from '../components/StatusBadge'
import { PAGO_LABEL } from '../types/database'

const MENSAJE_DEFAULT = 'Hola {nombre}, aquí está tu código QR de acceso al gimnasio.'

type EnvioEstado = 'idle' | 'validando' | 'enviando' | 'enviado' | 'error'

export default function Whats() {
  const { mes, anio } = usePeriod()
  const { data, loading } = usePeriodRegistros(mes, anio)
  const [telefonos, setTelefonos] = useState<Record<string, string>>({})
  const [decryptando, setDecryptando] = useState(false)
  const [mensaje, setMensaje] = useState(MENSAJE_DEFAULT)
  const [search, setSearch] = useState('')
  const [envios, setEnvios] = useState<Record<string, { estado: EnvioEstado; error?: string }>>({})

  useEffect(() => {
    let active = true
    if (data.length === 0) {
      setTelefonos({})
      return
    }
    setDecryptando(true)
    Promise.all(data.map(async (r) => [r.id, await decryptText(r.telefono)] as const))
      .then((pairs) => {
        if (!active) return
        setTelefonos(Object.fromEntries(pairs))
      })
      .finally(() => {
        if (active) setDecryptando(false)
      })
    return () => {
      active = false
    }
  }, [data])

  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const q = search.toLowerCase()
    return data.filter(
      (r) =>
        r.nombre.toLowerCase().includes(q) ||
        (r.folio ?? '').toLowerCase().includes(q) ||
        (telefonos[r.id] ?? '').includes(q),
    )
  }, [data, search, telefonos])

  const setEnvioEstado = (id: string, estado: EnvioEstado, error?: string) =>
    setEnvios((prev) => ({ ...prev, [id]: { estado, error } }))

  const handleEnviar = async (registroId: string, nombre: string) => {
    const telefono = telefonos[registroId]
    if (!telefono) {
      setEnvioEstado(registroId, 'error', 'Sin teléfono registrado')
      return
    }
    setEnvioEstado(registroId, 'validando')
    try {
      const { registered } = await checkWhatsAppNumber(telefono)
      if (!registered) {
        setEnvioEstado(registroId, 'error', WHATSAPP_ERROR_LABEL.numero_sin_whatsapp)
        return
      }
      setEnvioEstado(registroId, 'enviando')
      const token = await buildQrToken(registroId)
      const dataUrl = await qrToDataUrl(token)
      const caption = mensaje.replaceAll('{nombre}', nombre) || `Hola ${nombre}, aquí está tu código QR de acceso.`
      await sendQrByWhatsApp({ telefono, imagenBase64: dataUrl, caption })
      setEnvioEstado(registroId, 'enviado')
    } catch (err) {
      const key = err instanceof Error ? err.message : 'send_failed'
      setEnvioEstado(registroId, 'error', WHATSAPP_ERROR_LABEL[key] ?? WHATSAPP_ERROR_LABEL.send_failed)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="text-accent" size={22} />
          <div>
            <h1 className="text-2xl font-semibold text-white">Whats</h1>
            <p className="text-sm text-gray-400 mt-1">
              Envía el QR de acceso y un mensaje por WhatsApp a los socios del periodo. Visible solo para
              superadministrador y administrador.
            </p>
          </div>
        </div>
        <PeriodSelector />
      </div>

      <div className="bg-surface border border-border rounded-xl p-4">
        <label className="block text-xs text-gray-400 mb-1.5">
          Mensaje a enviar (usa <code className="bg-surface-2 px-1 rounded">{'{nombre}'}</code> para incluir el nombre
          de cada socio)
        </label>
        <textarea
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          rows={2}
          className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent resize-none"
        />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, folio o teléfono…"
          className="w-full sm:w-80 bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
        />
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-500 text-center py-8">Cargando…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Sin registros para este periodo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead>
                <tr className="text-left text-gray-500 border-b border-border">
                  <th className="px-4 py-2 font-normal">Nombre</th>
                  <th className="px-4 py-2 font-normal">Teléfono</th>
                  <th className="px-4 py-2 font-normal">Folio</th>
                  <th className="px-4 py-2 font-normal">Estatus</th>
                  <th className="px-4 py-2 font-normal">Atendido por</th>
                  <th className="px-4 py-2 font-normal">Fecha y hora</th>
                  <th className="px-4 py-2 font-normal">Método de pago</th>
                  <th className="px-4 py-2 font-normal">Monto</th>
                  <th className="px-4 py-2 font-normal text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const envio = envios[r.id] ?? { estado: 'idle' as EnvioEstado }
                  const telefono = telefonos[r.id]
                  return (
                    <tr key={r.id} className="border-b border-border/50">
                      <td className="px-4 py-2 text-white whitespace-nowrap">{r.nombre}</td>
                      <td className="px-4 py-2 text-gray-300 whitespace-nowrap">
                        {decryptando ? '…' : telefono || '—'}
                      </td>
                      <td className="px-4 py-2 text-gray-300">{r.folio || '0'}</td>
                      <td className="px-4 py-2">
                        <StatusBadge status={r.estatus} />
                      </td>
                      <td className="px-4 py-2 text-gray-400">{r.atendido_por || '—'}</td>
                      <td className="px-4 py-2 text-gray-400 whitespace-nowrap">
                        {r.fecha_ingreso ? new Date(r.fecha_ingreso).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-2 text-gray-300">{PAGO_LABEL[r.forma_pago]}</td>
                      <td className="px-4 py-2 text-gray-200">
                        {r.monto === null ? <span className="text-gray-600">Oculto</span> : `$${r.monto.toFixed(2)}`}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleEnviar(r.id, r.nombre)}
                            disabled={
                              !telefono ||
                              envio.estado === 'validando' ||
                              envio.estado === 'enviando' ||
                              envio.estado === 'enviado'
                            }
                            className="flex items-center gap-1.5 bg-accent hover:bg-accent-dark text-black rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-60"
                          >
                            {envio.estado === 'validando' || envio.estado === 'enviando' ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : envio.estado === 'enviado' ? (
                              <CheckCircle2 size={13} />
                            ) : (
                              <Send size={13} />
                            )}
                            {envio.estado === 'validando' && 'Validando…'}
                            {envio.estado === 'enviando' && 'Enviando…'}
                            {envio.estado === 'enviado' && 'Enviado'}
                            {(envio.estado === 'idle' || envio.estado === 'error') && 'Enviar QR'}
                          </button>
                          {envio.estado === 'error' && envio.error && (
                            <span className="text-xs text-danger max-w-[180px] text-right">{envio.error}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
