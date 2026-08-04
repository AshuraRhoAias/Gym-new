import type { AlcaldiaTicket, GastoOperativo, NominaMensual, PagoAlcaldia } from '../types/database'
import type { IngresoPeriodo } from '../hooks/useFinanzas'

export interface ResumenPeriodo {
  ingresos: number
  nomina: number
  convenio: number
  renta: number
  gastos: number
  comisionTarjeta: number
  utilidadBruta: number
  utilidadNeta: number
  sinComprobante: number
}

export function calcularResumen(params: {
  ingreso: IngresoPeriodo | undefined
  nominaDelPeriodo: NominaMensual[]
  pagoAlcaldia: PagoAlcaldia | undefined
  ticketsDelPago: AlcaldiaTicket[]
  gastosDelPeriodo: GastoOperativo[]
}): ResumenPeriodo {
  const { ingreso, nominaDelPeriodo, pagoAlcaldia, gastosDelPeriodo, ticketsDelPago } = params

  const ingresos = (ingreso?.tarjeta ?? 0) + (ingreso?.transferencia ?? 0)
  const nomina = nominaDelPeriodo.reduce((s, n) => s + n.monto, 0)
  const convenio = pagoAlcaldia?.monto_convenio ?? 0
  const renta = pagoAlcaldia?.monto_renta ?? 0
  const gastos = gastosDelPeriodo.reduce((s, g) => s + g.monto, 0)
  // La comisión de tarjeta se genera en Inscripciones/Renovaciones (Dashboard), no aquí.
  const comisionTarjeta = ingreso?.comisionTarjeta ?? 0

  const utilidadBruta = ingresos - nomina - convenio - renta - gastos
  const utilidadNeta = utilidadBruta - comisionTarjeta

  const nominaSinTimbrar = nominaDelPeriodo.filter((n) => !n.timbrado).length
  const gastosSinCfdi = gastosDelPeriodo.filter((g) => !g.tiene_cfdi).length
  const alcaldiaSinCfdi = pagoAlcaldia && !pagoAlcaldia.cfdi_recibido && ticketsDelPago.length === 0 ? 1 : 0
  const sinComprobante = nominaSinTimbrar + gastosSinCfdi + alcaldiaSinCfdi

  return { ingresos, nomina, convenio, renta, gastos, comisionTarjeta, utilidadBruta, utilidadNeta, sinComprobante }
}

/** Exporta filas de un reporte a un archivo .xlsx descargable. */
export async function exportarExcel(nombreArchivo: string, hojas: { nombre: string; filas: Record<string, unknown>[] }[]) {
  const { Workbook } = await import('exceljs')
  const wb = new Workbook()
  for (const hoja of hojas) {
    const ws = wb.addWorksheet(hoja.nombre.slice(0, 31))
    if (hoja.filas.length > 0) {
      ws.columns = Object.keys(hoja.filas[0]).map((key) => ({ header: key, key }))
      ws.addRows(hoja.filas)
    }
  }
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  a.click()
  URL.revokeObjectURL(url)
}
