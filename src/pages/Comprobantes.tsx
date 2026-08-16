import { useMemo, useState } from 'react'
import { FileText, Printer, Search, X } from 'lucide-react'
import { usePeriod } from '../context/PeriodContext'
import { usePeriodRegistros } from '../hooks/usePeriodRegistros'
import PeriodSelector from '../components/PeriodSelector'
import type { Registro } from '../types/database'

/**
 * Posiciones (en % del ancho/alto de la imagen, 1535×1024) de cada campo
 * sobre la plantilla `/comprobante-pago.png`, medidas contra los recuadros
 * reales de la plantilla. La plantilla final no tiene un recuadro para
 * "quien realiza el recibo" (se simplificó respecto al primer boceto), así
 * que ese dato no se imprime.
 */
const CAMPOS = {
  nombreUsuario: { top: '40.5%', left: '12.6%', width: '79.5%', fontSize: '2.3cqw' },
  fecha: { top: '53.6%', left: '12.3%', width: '19.9%', fontSize: '1.7cqw' },
  mes: { top: '53.6%', left: '43.3%', width: '17.9%', fontSize: '1.7cqw' },
  anio: { top: '53.6%', left: '72.3%', width: '20.4%', fontSize: '1.7cqw' },
  folio: { top: '26.9%', left: '83.6%', width: '11.7%', fontSize: '1.9cqw' },
} as const

export default function Comprobantes() {
  const { mes, anio } = usePeriod()
  // Siempre solo los que tienen folio, sin importar el toggle global de privacidad.
  const { data, loading } = usePeriodRegistros(mes, anio, true)
  const [search, setSearch] = useState('')
  const [imprimiendo, setImprimiendo] = useState<Registro | null>(null)
  const [fecha, setFecha] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return data
    const q = search.toLowerCase()
    return data.filter((r) => r.nombre.toLowerCase().includes(q) || (r.folio ?? '').toLowerCase().includes(q))
  }, [data, search])

  const abrirImpresion = (r: Registro) => {
    setImprimiendo(r)
    setFecha(new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <FileText className="text-accent" size={22} />
          <div>
            <h1 className="text-2xl font-semibold text-white">Comprobantes</h1>
            <p className="text-sm text-gray-400 mt-1">
              Imprime el comprobante de pago de los socios con folio del periodo.
            </p>
          </div>
        </div>
        <PeriodSelector />
      </div>

      <div className="relative print:hidden">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o folio…"
          className="w-full sm:w-80 bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
        />
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden print:hidden">
        {loading ? (
          <p className="text-sm text-gray-500 text-center py-8">Cargando…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Sin registros con folio para este periodo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="text-left text-gray-500 border-b border-border">
                  <th className="px-4 py-2 font-normal">Nombre</th>
                  <th className="px-4 py-2 font-normal">Folio</th>
                  <th className="px-4 py-2 font-normal">Mes</th>
                  <th className="px-4 py-2 font-normal">Año</th>
                  <th className="px-4 py-2 font-normal">Atendido por</th>
                  <th className="px-4 py-2 font-normal text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border/50">
                    <td className="px-4 py-2 text-white whitespace-nowrap">{r.nombre}</td>
                    <td className="px-4 py-2 text-gray-300">{r.folio}</td>
                    <td className="px-4 py-2 text-gray-300">{r.mes}</td>
                    <td className="px-4 py-2 text-gray-300">{r.anio}</td>
                    <td className="px-4 py-2 text-gray-400">{r.atendido_por || '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => abrirImpresion(r)}
                        className="flex items-center gap-1.5 ml-auto bg-accent hover:bg-accent-dark text-black rounded-lg px-3 py-1.5 text-xs font-medium"
                      >
                        <Printer size={13} /> Imprimir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {imprimiendo && (
        <div className="fixed inset-0 z-[70] bg-black/80 overflow-y-auto p-4 print:static print:inset-auto print:bg-transparent print:p-0 print:overflow-visible">
          <div className="max-w-2xl mx-auto flex flex-col gap-3">
            <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3 print:hidden">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-semibold">Vista previa del comprobante</h2>
                <button onClick={() => setImprimiendo(null)} className="text-gray-500 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <p className="text-xs text-gray-500">Puedes ajustar la fecha antes de imprimir.</p>
              <label className="flex flex-col gap-1 text-xs text-gray-400 max-w-xs">
                Fecha de elaboración
                <input
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                />
              </label>
              <button
                type="button"
                onClick={() => window.print()}
                className="self-start flex items-center gap-1.5 bg-accent hover:bg-accent-dark text-black rounded-lg px-4 py-2 text-sm font-medium"
              >
                <Printer size={14} /> Imprimir
              </button>
            </div>

            {/* Comprobante: se ve en la vista previa y es lo único que queda visible al imprimir. */}
            <div className="relative w-full bg-white rounded-lg overflow-hidden [container-type:inline-size]">
              <img src="/comprobante-pago.png" alt="Comprobante de pago" className="w-full h-auto block" />
              <span
                className="absolute text-black font-medium leading-tight"
                style={{
                  top: CAMPOS.nombreUsuario.top,
                  left: CAMPOS.nombreUsuario.left,
                  width: CAMPOS.nombreUsuario.width,
                  fontSize: CAMPOS.nombreUsuario.fontSize,
                }}
              >
                {imprimiendo.nombre}
              </span>
              <span
                className="absolute text-black font-medium leading-tight"
                style={{ top: CAMPOS.fecha.top, left: CAMPOS.fecha.left, width: CAMPOS.fecha.width, fontSize: CAMPOS.fecha.fontSize }}
              >
                {fecha}
              </span>
              <span
                className="absolute text-black font-medium leading-tight"
                style={{ top: CAMPOS.mes.top, left: CAMPOS.mes.left, width: CAMPOS.mes.width, fontSize: CAMPOS.mes.fontSize }}
              >
                {imprimiendo.mes}
              </span>
              <span
                className="absolute text-black font-medium leading-tight"
                style={{ top: CAMPOS.anio.top, left: CAMPOS.anio.left, width: CAMPOS.anio.width, fontSize: CAMPOS.anio.fontSize }}
              >
                {imprimiendo.anio}
              </span>
              <span
                className="absolute text-black font-medium leading-tight"
                style={{ top: CAMPOS.folio.top, left: CAMPOS.folio.left, width: CAMPOS.folio.width, fontSize: CAMPOS.folio.fontSize }}
              >
                {imprimiendo.folio}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
