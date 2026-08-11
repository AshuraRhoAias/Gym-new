import { useState, type FormEvent } from 'react'
import { Landmark, Wallet, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import ComprobanteCfdiField from '../ComprobanteCfdiField'
import {
  MESES,
  PRECIO_MENSUALIDAD_CONVENIO,
  PRECIO_INSCRIPCION_CONVENIO,
  calcularMontoConvenio,
  type AlcaldiaTicket,
  type ConvenioPago,
  type PagoAlcaldia,
} from '../../types/database'

export default function AlcaldiaTab({
  mes,
  anio,
  pago,
  tickets,
  convenioPagos,
  onChanged,
}: {
  mes: string
  anio: number
  pago: PagoAlcaldia | undefined
  tickets: AlcaldiaTicket[]
  convenioPagos: ConvenioPago[]
  onChanged: () => void
}) {
  const { username } = useAuth()

  // Calculadora de convenio (mensualidades + inscripciones)
  const [mensualidadesUsuarios, setMensualidadesUsuarios] = useState(String(pago?.mensualidades_usuarios ?? 0))
  const [inscripcionesUsuarios, setInscripcionesUsuarios] = useState(String(pago?.inscripciones_usuarios ?? 0))
  const [folioConvenio, setFolioConvenio] = useState(pago?.folio_calculo_convenio ?? '')
  const [savingConvenio, setSavingConvenio] = useState(false)
  const [errorConvenio, setErrorConvenio] = useState<string | null>(null)

  // Renta de espacio
  const [renta, setRenta] = useState(String(pago?.monto_renta ?? 10000))
  const [cfdiRenta, setCfdiRenta] = useState(pago?.cfdi_recibido ?? false)
  const [savingRenta, setSavingRenta] = useState(false)
  const [folioTicket, setFolioTicket] = useState('')
  const [montoTicket, setMontoTicket] = useState('')
  const [errorRenta, setErrorRenta] = useState<string | null>(null)

  // Pago de convenio (ledger)
  const [pagoConvenioMonto, setPagoConvenioMonto] = useState('')
  const [pagoConvenioMes, setPagoConvenioMes] = useState(mes)
  const [folioPagoConvenio, setFolioPagoConvenio] = useState('')
  const [savingPago, setSavingPago] = useState(false)
  const [errorPago, setErrorPago] = useState<string | null>(null)

  const mensUsr = Number(mensualidadesUsuarios) || 0
  const inscUsr = Number(inscripcionesUsuarios) || 0
  const totalMensualidades = mensUsr * PRECIO_MENSUALIDAD_CONVENIO
  const totalInscripciones = inscUsr * PRECIO_INSCRIPCION_CONVENIO
  const totalConvenio = calcularMontoConvenio(mensUsr, inscUsr)
  const totalPagadoConvenio = convenioPagos.reduce((s, c) => s + c.monto, 0)
  const totalTickets = tickets.reduce((s, t) => s + t.monto, 0)

  const handleGuardarConvenio = async (e: FormEvent) => {
    e.preventDefault()
    setSavingConvenio(true)
    setErrorConvenio(null)
    const payload = {
      mes,
      anio,
      mensualidades_usuarios: mensUsr,
      inscripciones_usuarios: inscUsr,
      monto_convenio: totalConvenio,
      folio_calculo_convenio: folioConvenio.trim() || null,
      monto_renta: pago?.monto_renta ?? (Number(renta) || 0),
      cfdi_recibido: pago?.cfdi_recibido ?? false,
      created_by: username,
    }
    const { error: err } = pago
      ? await supabase.from('pagos_alcaldia').update(payload).eq('id', pago.id)
      : await supabase.from('pagos_alcaldia').insert(payload)
    setSavingConvenio(false)
    if (err) {
      setErrorConvenio(err.message)
      return
    }
    onChanged()
  }

  const updateConvenioComprobante = async (patch: Partial<PagoAlcaldia>) => {
    if (!pago) return
    await supabase.from('pagos_alcaldia').update(patch).eq('id', pago.id)
    onChanged()
  }

  const handleGuardarRenta = async (e: FormEvent) => {
    e.preventDefault()
    setSavingRenta(true)
    setErrorRenta(null)
    const payload = {
      mes,
      anio,
      mensualidades_usuarios: pago?.mensualidades_usuarios ?? 0,
      inscripciones_usuarios: pago?.inscripciones_usuarios ?? 0,
      monto_convenio: pago?.monto_convenio ?? 0,
      monto_renta: Number(renta) || 0,
      cfdi_recibido: cfdiRenta,
      created_by: username,
    }
    const { error: err } = pago
      ? await supabase.from('pagos_alcaldia').update(payload).eq('id', pago.id)
      : await supabase.from('pagos_alcaldia').insert(payload)
    setSavingRenta(false)
    if (err) {
      setErrorRenta(err.message)
      return
    }
    onChanged()
  }

  const updateRentaComprobante = async (patch: Partial<PagoAlcaldia>) => {
    if (!pago) return
    await supabase.from('pagos_alcaldia').update(patch).eq('id', pago.id)
    onChanged()
  }

  const handleAgregarTicket = async (e: FormEvent) => {
    e.preventDefault()
    if (!pago) {
      setErrorRenta('Guarda primero la renta del periodo antes de agregar tickets.')
      return
    }
    const montoNum = Number(montoTicket)
    if (!montoNum || montoNum <= 0) return
    const { error: err } = await supabase.from('alcaldia_tickets').insert({
      pago_alcaldia_id: pago.id,
      folio: folioTicket.trim() || null,
      monto: montoNum,
    })
    if (err) {
      setErrorRenta(err.message)
      return
    }
    setFolioTicket('')
    setMontoTicket('')
    onChanged()
  }

  const handleBorrarTicket = async (id: string) => {
    await supabase.from('alcaldia_tickets').delete().eq('id', id)
    onChanged()
  }

  const updateTicketComprobante = async (id: string, patch: Partial<AlcaldiaTicket>) => {
    await supabase.from('alcaldia_tickets').update(patch).eq('id', id)
    onChanged()
  }

  const handleGuardarPagoConvenio = async (e: FormEvent) => {
    e.preventDefault()
    const montoNum = Number(pagoConvenioMonto)
    if (!montoNum || montoNum <= 0) {
      setErrorPago('Ingresa un monto válido')
      return
    }
    setSavingPago(true)
    setErrorPago(null)
    const { error: err } = await supabase.from('convenio_pagos').insert({
      mes: pagoConvenioMes,
      anio,
      monto: montoNum,
      folio_comprobante: folioPagoConvenio.trim() || null,
      created_by: username,
    })
    setSavingPago(false)
    if (err) {
      setErrorPago(err.message)
      return
    }
    setPagoConvenioMonto('')
    setFolioPagoConvenio('')
    onChanged()
  }

  const updatePagoConvenioComprobante = async (id: string, patch: Partial<ConvenioPago>) => {
    await supabase.from('convenio_pagos').update(patch).eq('id', id)
    onChanged()
  }

  const handleBorrarPagoConvenio = async (id: string) => {
    if (!confirm('¿Borrar este pago de convenio?')) return
    await supabase.from('convenio_pagos').delete().eq('id', id)
    onChanged()
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleGuardarConvenio} className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
          <Landmark size={15} /> Convenio (Gaceta DPM Cuajimalpa) — {mes} {anio}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Mensualidades (usuarios) × ${PRECIO_MENSUALIDAD_CONVENIO}
            <input
              type="number"
              min={0}
              value={mensualidadesUsuarios}
              onChange={(e) => setMensualidadesUsuarios(e.target.value)}
              className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            />
            <span className="text-gray-500">= ${totalMensualidades.toFixed(2)}</span>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Inscripciones (usuarios) × ${PRECIO_INSCRIPCION_CONVENIO}
            <input
              type="number"
              min={0}
              value={inscripcionesUsuarios}
              onChange={(e) => setInscripcionesUsuarios(e.target.value)}
              className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            />
            <span className="text-gray-500">= ${totalInscripciones.toFixed(2)}</span>
          </label>
        </div>
        <p className="text-sm text-white">
          Total a pagar a Alcaldía por convenio: <span className="text-accent font-semibold">${totalConvenio.toFixed(2)}</span>
        </p>
        <input
          value={folioConvenio}
          onChange={(e) => setFolioConvenio(e.target.value)}
          placeholder="Folio / referencia / CFDI de ticket o factura"
          className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
        />
        {pago && (
          <ComprobanteCfdiField
            folio={pago.folio_calculo_convenio ?? ''}
            onFolioChange={(v) => updateConvenioComprobante({ folio_calculo_convenio: v || null })}
            comprobante={{
              comprobante_path: pago.convenio_comprobante_path,
              comprobante_iv: pago.convenio_comprobante_iv,
              comprobante_salt: pago.convenio_comprobante_salt,
              comprobante_mime: pago.convenio_comprobante_mime,
            }}
            onComprobanteChange={(v) =>
              updateConvenioComprobante({
                convenio_comprobante_path: v.comprobante_path,
                convenio_comprobante_iv: v.comprobante_iv,
                convenio_comprobante_salt: v.comprobante_salt,
                convenio_comprobante_mime: v.comprobante_mime,
              })
            }
          />
        )}
        <button
          type="submit"
          disabled={savingConvenio}
          className="self-start px-3 py-1.5 text-xs rounded-lg bg-accent hover:bg-accent-dark text-black font-medium disabled:opacity-60"
        >
          {savingConvenio ? 'Guardando…' : 'Guardar'}
        </button>
        {errorConvenio && <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">{errorConvenio}</p>}
      </form>

      <form onSubmit={handleGuardarPagoConvenio} className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
          <Wallet size={15} /> Pago de convenio
        </h3>
        <p className="text-xs text-gray-500">
          Registra cada pago de convenio realmente efectuado (puede haber más de uno). Total pagado este periodo: $
          {totalPagadoConvenio.toFixed(2)}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Pago de convenio
            <input
              type="number"
              step="0.01"
              value={pagoConvenioMonto}
              onChange={(e) => setPagoConvenioMonto(e.target.value)}
              placeholder="Monto"
              className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Mes
            <select
              value={pagoConvenioMes}
              onChange={(e) => setPagoConvenioMes(e.target.value)}
              className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
            >
              {MESES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Folio / referencia / CFDI
            <input
              value={folioPagoConvenio}
              onChange={(e) => setFolioPagoConvenio(e.target.value)}
              placeholder="Ticket o factura"
              className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={savingPago}
          className="self-start px-3 py-1.5 text-xs rounded-lg bg-accent hover:bg-accent-dark text-black font-medium disabled:opacity-60"
        >
          {savingPago ? 'Guardando…' : 'Guardar'}
        </button>
        {errorPago && <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">{errorPago}</p>}

        {convenioPagos.length > 0 && (
          <div className="divide-y divide-border/50 border border-border rounded-lg mt-1">
            {convenioPagos.map((c) => (
              <div key={c.id} className="flex flex-col gap-2 px-3 py-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">
                    {c.mes} — {c.folio_comprobante || 'Sin folio'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-white">${c.monto.toFixed(2)}</span>
                    <button onClick={() => handleBorrarPagoConvenio(c.id)} className="text-gray-500 hover:text-danger">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <ComprobanteCfdiField
                  folio={c.folio_comprobante ?? ''}
                  onFolioChange={(v) => updatePagoConvenioComprobante(c.id, { folio_comprobante: v || null })}
                  comprobante={{
                    comprobante_path: c.comprobante_path,
                    comprobante_iv: c.comprobante_iv,
                    comprobante_salt: c.comprobante_salt,
                    comprobante_mime: c.comprobante_mime,
                  }}
                  onComprobanteChange={(v) => updatePagoConvenioComprobante(c.id, v)}
                />
              </div>
            ))}
          </div>
        )}
      </form>

      <form onSubmit={handleGuardarRenta} className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
          <Landmark size={15} /> Renta / uso de espacio a Alcaldía
        </h3>
        <label className="flex flex-col gap-1 text-xs text-gray-400 max-w-xs">
          Monto de renta
          <input
            type="number"
            step="0.01"
            value={renta}
            onChange={(e) => setRenta(e.target.value)}
            className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={cfdiRenta} onChange={(e) => setCfdiRenta(e.target.checked)} />
          ¿Se recibió CFDI de la renta?
        </label>
        {pago && (
          <ComprobanteCfdiField
            folio={pago.folio_comprobante ?? ''}
            onFolioChange={(v) => updateRentaComprobante({ folio_comprobante: v || null })}
            comprobante={{
              comprobante_path: pago.comprobante_path,
              comprobante_iv: pago.comprobante_iv,
              comprobante_salt: pago.comprobante_salt,
              comprobante_mime: pago.comprobante_mime,
            }}
            onComprobanteChange={(v) => updateRentaComprobante(v)}
          />
        )}
        <button
          type="submit"
          disabled={savingRenta}
          className="self-start px-3 py-1.5 text-xs rounded-lg bg-accent hover:bg-accent-dark text-black font-medium disabled:opacity-60"
        >
          {savingRenta ? 'Guardando…' : 'Guardar'}
        </button>
        {errorRenta && <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">{errorRenta}</p>}

        {pago && !cfdiRenta && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-border text-xs font-semibold text-white">
              Tickets de renta (sin CFDI) — total: ${totalTickets.toFixed(2)}
            </div>
            <form onSubmit={handleAgregarTicket} className="flex flex-wrap gap-2 p-3 border-b border-border">
              <input
                value={folioTicket}
                onChange={(e) => setFolioTicket(e.target.value)}
                placeholder="Folio del ticket (opcional)"
                className="bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
              />
              <input
                type="number"
                step="0.01"
                value={montoTicket}
                onChange={(e) => setMontoTicket(e.target.value)}
                placeholder="Monto"
                className="w-28 bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-surface-2 border border-border text-gray-200 hover:border-accent/50"
              >
                <Plus size={13} /> Agregar ticket
              </button>
            </form>
            <div className="divide-y divide-border/50">
              {tickets.map((t) => (
                <div key={t.id} className="flex flex-col gap-2 px-3 py-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-300">{t.folio || 'Sin folio'}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white">${t.monto.toFixed(2)}</span>
                      <button onClick={() => handleBorrarTicket(t.id)} className="text-gray-500 hover:text-danger">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <ComprobanteCfdiField
                    folio={t.folio ?? ''}
                    onFolioChange={(v) => updateTicketComprobante(t.id, { folio: v || null })}
                    comprobante={{
                      comprobante_path: t.comprobante_path,
                      comprobante_iv: t.comprobante_iv,
                      comprobante_salt: t.comprobante_salt,
                      comprobante_mime: t.comprobante_mime,
                    }}
                    onComprobanteChange={(v) => updateTicketComprobante(t.id, v)}
                  />
                </div>
              ))}
              {tickets.length === 0 && <p className="text-xs text-gray-500 text-center py-3">Sin tickets registrados.</p>}
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
