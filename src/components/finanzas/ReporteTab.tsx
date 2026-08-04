import { useMemo } from 'react'
import { Download, FileSpreadsheet, Printer } from 'lucide-react'
import { MESES, CATEGORIA_GASTO_LABEL } from '../../types/database'
import type {
  AlcaldiaTicket,
  ConvenioPago,
  GastoOperativo,
  NominaMensual,
  PagoAlcaldia,
  Trabajador,
} from '../../types/database'
import type { IngresoPeriodo } from '../../hooks/useFinanzas'
import { calcularResumen, exportarExcel, type ResumenPeriodo } from '../../lib/finanzas'

interface Props {
  mes: string
  anio: number
  resumen: ResumenPeriodo
  trabajadores: Trabajador[]
  nominaMensual: NominaMensual[]
  pagosAlcaldia: PagoAlcaldia[]
  alcaldiaTickets: AlcaldiaTicket[]
  convenioPagos: ConvenioPago[]
  gastosOperativos: GastoOperativo[]
  ingresosPorPeriodo: Map<string, IngresoPeriodo>
}

function periodoOrden(mes: string, anio: number) {
  return anio * 100 + MESES.indexOf(mes)
}

export default function ReporteTab({
  mes,
  anio,
  resumen,
  trabajadores,
  nominaMensual,
  pagosAlcaldia,
  alcaldiaTickets,
  convenioPagos,
  gastosOperativos,
  ingresosPorPeriodo,
}: Props) {
  const historico = useMemo(() => {
    const claves = new Set<string>()
    for (const n of nominaMensual) claves.add(`${n.mes}-${n.anio}`)
    for (const p of pagosAlcaldia) claves.add(`${p.mes}-${p.anio}`)
    for (const g of gastosOperativos) claves.add(`${g.mes}-${g.anio}`)
    for (const key of ingresosPorPeriodo.keys()) claves.add(key)

    const periodos = Array.from(claves).map((key) => {
      const [m, a] = key.split('-')
      return { mes: m, anio: Number(a) }
    })
    periodos.sort((a, b) => periodoOrden(a.mes, a.anio) - periodoOrden(b.mes, b.anio))

    return periodos.map((p) => {
      const pago = pagosAlcaldia.find((x) => x.mes === p.mes && x.anio === p.anio)
      const r = calcularResumen({
        ingreso: ingresosPorPeriodo.get(`${p.mes}-${p.anio}`),
        nominaDelPeriodo: nominaMensual.filter((x) => x.mes === p.mes && x.anio === p.anio),
        pagoAlcaldia: pago,
        ticketsDelPago: alcaldiaTickets.filter((t) => t.pago_alcaldia_id === pago?.id),
        gastosDelPeriodo: gastosOperativos.filter((x) => x.mes === p.mes && x.anio === p.anio),
      })
      return { ...p, ...r }
    })
  }, [nominaMensual, pagosAlcaldia, alcaldiaTickets, gastosOperativos, ingresosPorPeriodo])

  const maxUtilidad = Math.max(1, ...historico.map((h) => Math.abs(h.utilidadNeta)))

  const gastosPorCategoria = useMemo(() => {
    const map = new Map<string, number>()
    for (const g of gastosOperativos.filter((g) => g.mes === mes && g.anio === anio)) {
      map.set(g.categoria, (map.get(g.categoria) ?? 0) + g.monto)
    }
    return map
  }, [gastosOperativos, mes, anio])

  const nombrePorId = useMemo(() => Object.fromEntries(trabajadores.map((t) => [t.id, t.nombre])), [trabajadores])

  const handleExportarExcel = () => {
    const nominaFilas = nominaMensual
      .filter((n) => n.mes === mes && n.anio === anio)
      .map((n) => ({ Empleado: nombrePorId[n.trabajador_id] ?? '—', Monto: n.monto, Timbrado: n.timbrado ? 'Sí' : 'No' }))

    const gastosFilas = gastosOperativos
      .filter((g) => g.mes === mes && g.anio === anio)
      .map((g) => ({
        Categoría: CATEGORIA_GASTO_LABEL[g.categoria],
        Descripción: g.descripcion ?? '',
        Monto: g.monto,
        Folio: g.folio_comprobante ?? '',
        CFDI: g.tiene_cfdi ? 'Sí' : 'No',
      }))

    const convenioFilas = convenioPagos
      .filter((c) => c.mes === mes && c.anio === anio)
      .map((c) => ({ Mes: c.mes, Monto: c.monto, Folio: c.folio_comprobante ?? '' }))

    const resumenFilas = [
      { Concepto: 'Ingresos (tarjeta/transferencia)', Monto: resumen.ingresos },
      { Concepto: 'Nómina', Monto: -resumen.nomina },
      { Concepto: 'Convenio Alcaldía', Monto: -resumen.convenio },
      { Concepto: 'Renta Alcaldía', Monto: -resumen.renta },
      { Concepto: 'Gastos operativos', Monto: -resumen.gastos },
      { Concepto: 'Comisión tarjeta (Inscripciones/Renovaciones)', Monto: -resumen.comisionTarjeta },
      { Concepto: 'Utilidad bruta', Monto: resumen.utilidadBruta },
      { Concepto: 'Utilidad neta', Monto: resumen.utilidadNeta },
    ]

    exportarExcel(`control-financiero-${mes}-${anio}.xlsx`, [
      { nombre: 'Resumen', filas: resumenFilas },
      { nombre: 'Nómina', filas: nominaFilas },
      { nombre: 'Gastos', filas: gastosFilas },
      { nombre: 'Pagos de convenio', filas: convenioFilas },
    ])
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-white">
          Reporte mensual — {mes} {anio}
        </h3>
        <div className="flex gap-2 print:hidden">
          <button
            onClick={handleExportarExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-surface-2 border border-border text-gray-200 hover:border-accent/50"
          >
            <FileSpreadsheet size={13} /> Exportar Excel
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-surface-2 border border-border text-gray-200 hover:border-accent/50"
          >
            <Printer size={13} /> Exportar PDF (imprimir)
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4">
        <h4 className="text-sm font-semibold text-white mb-3">Desglose de gastos por categoría</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {Object.entries(CATEGORIA_GASTO_LABEL).map(([v, l]) => (
            <div key={v} className="bg-surface-2 border border-border rounded-lg p-3 text-center">
              <div className="text-white font-semibold">${(gastosPorCategoria.get(v) ?? 0).toFixed(2)}</div>
              <div className="text-xs text-gray-500">{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Download size={15} className="text-accent" />
          <h4 className="text-sm font-semibold text-white">Histórico comparativo mes a mes</h4>
        </div>
        {historico.length === 0 ? (
          <p className="text-xs text-gray-500">Aún no hay datos históricos suficientes.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {historico.map((h) => {
              const pct = Math.min(100, (Math.abs(h.utilidadNeta) / maxUtilidad) * 100)
              const esActual = h.mes === mes && h.anio === anio
              return (
                <div key={`${h.mes}-${h.anio}`} className="flex items-center gap-3 text-xs">
                  <span className={`w-24 shrink-0 ${esActual ? 'text-accent font-semibold' : 'text-gray-400'}`}>
                    {h.mes} {h.anio}
                  </span>
                  <div className="flex-1 bg-surface-2 rounded-full h-4 overflow-hidden">
                    <div
                      className={`h-full ${h.utilidadNeta < 0 ? 'bg-danger' : 'bg-accent'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className={`w-24 text-right ${h.utilidadNeta < 0 ? 'text-danger' : 'text-white'}`}>
                    ${h.utilidadNeta.toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
        <table className="w-full text-xs mt-4 min-w-[700px]">
          <thead>
            <tr className="text-left text-gray-500 border-b border-border">
              <th className="px-2 py-1.5 font-normal">Periodo</th>
              <th className="px-2 py-1.5 font-normal">Ingresos</th>
              <th className="px-2 py-1.5 font-normal">Nómina</th>
              <th className="px-2 py-1.5 font-normal">Alcaldía</th>
              <th className="px-2 py-1.5 font-normal">Gastos</th>
              <th className="px-2 py-1.5 font-normal">Comisión tarjeta</th>
              <th className="px-2 py-1.5 font-normal">Utilidad neta</th>
              <th className="px-2 py-1.5 font-normal">Sin comprobante</th>
            </tr>
          </thead>
          <tbody>
            {historico.map((h) => (
              <tr key={`row-${h.mes}-${h.anio}`} className="border-b border-border/50">
                <td className="px-2 py-1.5 text-white whitespace-nowrap">
                  {h.mes} {h.anio}
                </td>
                <td className="px-2 py-1.5 text-gray-300">${h.ingresos.toFixed(2)}</td>
                <td className="px-2 py-1.5 text-gray-300">${h.nomina.toFixed(2)}</td>
                <td className="px-2 py-1.5 text-gray-300">${(h.convenio + h.renta).toFixed(2)}</td>
                <td className="px-2 py-1.5 text-gray-300">${h.gastos.toFixed(2)}</td>
                <td className="px-2 py-1.5 text-gray-300">${h.comisionTarjeta.toFixed(2)}</td>
                <td className={`px-2 py-1.5 ${h.utilidadNeta < 0 ? 'text-danger' : 'text-accent'}`}>
                  ${h.utilidadNeta.toFixed(2)}
                </td>
                <td className="px-2 py-1.5 text-warning">{h.sinComprobante}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
