import { useMemo } from 'react'
import { ShieldAlert, CheckCircle2, XCircle } from 'lucide-react'
import { CATEGORIA_GASTO_LABEL } from '../../types/database'
import type { AlcaldiaTicket, GastoOperativo, NominaMensual, PagoAlcaldia, Trabajador } from '../../types/database'

export default function DeclaracionesTab({
  mes,
  anio,
  trabajadores,
  nominaDelPeriodo,
  pagoAlcaldia,
  ticketsDelPago,
  gastosDelPeriodo,
}: {
  mes: string
  anio: number
  trabajadores: Trabajador[]
  nominaDelPeriodo: NominaMensual[]
  pagoAlcaldia: PagoAlcaldia | undefined
  ticketsDelPago: AlcaldiaTicket[]
  gastosDelPeriodo: GastoOperativo[]
}) {
  const nombrePorId = useMemo(() => Object.fromEntries(trabajadores.map((t) => [t.id, t.nombre])), [trabajadores])

  const nominaDeducible = nominaDelPeriodo.filter((n) => n.timbrado)
  const nominaNoDeducible = nominaDelPeriodo.filter((n) => !n.timbrado)
  const gastosDeducibles = gastosDelPeriodo.filter((g) => g.tiene_cfdi)
  const gastosNoDeducibles = gastosDelPeriodo.filter((g) => !g.tiene_cfdi)
  const alcaldiaDeducible = pagoAlcaldia?.cfdi_recibido ?? false
  const totalTicketsAlcaldia = ticketsDelPago.reduce((s, t) => s + t.monto, 0)

  const totalDeducible =
    nominaDeducible.reduce((s, n) => s + n.monto, 0) +
    gastosDeducibles.reduce((s, g) => s + g.monto, 0) +
    (alcaldiaDeducible ? (pagoAlcaldia?.monto_convenio ?? 0) + (pagoAlcaldia?.monto_renta ?? 0) : 0)

  const totalNoDeducible =
    nominaNoDeducible.reduce((s, n) => s + n.monto, 0) +
    gastosNoDeducibles.reduce((s, g) => s + g.monto, 0) +
    (!alcaldiaDeducible ? (pagoAlcaldia?.monto_convenio ?? 0) + (pagoAlcaldia?.monto_renta ?? 0) : 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex gap-3">
        <ShieldAlert className="text-warning shrink-0" size={20} />
        <p className="text-xs text-amber-200 leading-relaxed">
          Esta sección es una guía general para organizar tu información antes de entregarla al contador. No
          sustituye asesoría fiscal profesional: tasas, regímenes y montos vigentes pueden cambiar — confirma
          siempre las cifras exactas y el régimen fiscal aplicable con tu contador antes de declarar.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Qué declarar mensualmente ante el SAT</h3>
        <ul className="flex flex-col gap-2 text-sm text-gray-300">
          <li>• <strong className="text-white">Pago provisional de ISR</strong> del mes (persona física o moral, según tu régimen).</li>
          <li>• <strong className="text-white">IVA mensual</strong> (si tu régimen causa IVA): IVA cobrado en tarjeta/transferencia menos IVA acreditable de tus gastos con CFDI.</li>
          <li>• <strong className="text-white">DIOT</strong> (Declaración Informativa de Operaciones con Terceros) si tienes proveedores con CFDI de gastos.</li>
          <li>• <strong className="text-white">Nómina</strong>: el CFDI de nómina debe timbrarse a más tardar el mismo día del pago a cada trabajador.</li>
          <li>• <strong className="text-white">Cuotas IMSS/Infonavit</strong> de los trabajadores registrados formalmente (si aplica).</li>
          <li>• <strong className="text-white">Retenciones</strong> de ISR sobre sueldos y, si aplica, de honorarios a terceros.</li>
        </ul>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Documentos que debes reunir para el contador</h3>
        <ul className="flex flex-col gap-2 text-sm text-gray-300">
          <li>• CFDIs de ingresos (o el reporte de cobros con tarjeta/transferencia de este módulo).</li>
          <li>• CFDIs de gastos deducibles (papelería, limpieza, internet, mantenimiento, renta y convenio a alcaldía).</li>
          <li>• Recibos de nómina (CFDI) timbrados de cada empleado.</li>
          <li>• Estados de cuenta bancarios del periodo.</li>
          <li>• Comprobante de pago a alcaldía/convenio (CFDI o, en su defecto, los tickets registrados abajo).</li>
        </ul>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">
          Deducciones del periodo — {mes} {anio}
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Regla general: solo es deducible lo que tiene CFDI (factura fiscal) y, si el pago supera los montos que
          exige la ley, se pagó por medios electrónicos (tarjeta o transferencia) — confírmalo con tu contador.
          Los pagos en efectivo sin comprobante normalmente no son deducibles.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-surface-2 border border-accent/30 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-accent text-sm font-semibold mb-2">
              <CheckCircle2 size={15} /> Deducible: ${totalDeducible.toFixed(2)}
            </div>
            <ul className="text-xs text-gray-400 flex flex-col gap-1">
              <li>Nómina timbrada: {nominaDeducible.length} recibo(s) — ${nominaDeducible.reduce((s, n) => s + n.monto, 0).toFixed(2)}</li>
              <li>Gastos con CFDI: {gastosDeducibles.length} — ${gastosDeducibles.reduce((s, g) => s + g.monto, 0).toFixed(2)}</li>
              <li>Alcaldía con CFDI: {alcaldiaDeducible ? 'Sí' : 'No'}</li>
            </ul>
          </div>
          <div className="bg-surface-2 border border-danger/30 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-danger text-sm font-semibold mb-2">
              <XCircle size={15} /> No deducible: ${totalNoDeducible.toFixed(2)}
            </div>
            <ul className="text-xs text-gray-400 flex flex-col gap-1">
              <li>
                Nómina sin timbrar: {nominaNoDeducible.length} —{' '}
                {nominaNoDeducible.map((n) => nombrePorId[n.trabajador_id]).join(', ') || '—'}
              </li>
              <li>Gastos sin CFDI: {gastosNoDeducibles.length} — ${gastosNoDeducibles.reduce((s, g) => s + g.monto, 0).toFixed(2)}</li>
              <li>Alcaldía sin CFDI: {!alcaldiaDeducible && pagoAlcaldia ? `Sí (${totalTicketsAlcaldia.toFixed(2)} en tickets)` : 'No aplica'}</li>
            </ul>
          </div>
        </div>
      </div>

      {gastosNoDeducibles.length > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border text-sm font-semibold text-white">
            Gastos sin comprobante fiscal — pide el CFDI o considera no deducirlos
          </div>
          <div className="divide-y divide-border/50">
            {gastosNoDeducibles.map((g) => (
              <div key={g.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-gray-300">
                  {CATEGORIA_GASTO_LABEL[g.categoria]}
                  {g.descripcion ? ` · ${g.descripcion}` : ''}
                </span>
                <span className="text-white">${g.monto.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
