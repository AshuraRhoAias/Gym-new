import { useState } from 'react'
import { Wallet2, Landmark, Receipt, CreditCard, FileBarChart2, ShieldCheck } from 'lucide-react'
import { usePeriod } from '../context/PeriodContext'
import { useAuth } from '../context/AuthContext'
import { useFinanzas, periodoKey } from '../hooks/useFinanzas'
import { calcularResumen } from '../lib/finanzas'
import PeriodSelector from '../components/PeriodSelector'
import ResumenCards from '../components/finanzas/ResumenCards'
import NominaTab from '../components/finanzas/NominaTab'
import AlcaldiaTab from '../components/finanzas/AlcaldiaTab'
import GastosTab from '../components/finanzas/GastosTab'
import MercadoPagoTab from '../components/finanzas/MercadoPagoTab'
import ReporteTab from '../components/finanzas/ReporteTab'
import DeclaracionesTab from '../components/finanzas/DeclaracionesTab'

type TabKey = 'nomina' | 'alcaldia' | 'gastos' | 'mercadopago' | 'reporte' | 'declaraciones'

export default function Finanzas() {
  const { mes, anio } = usePeriod()
  const { role } = useAuth()
  const esSuperadmin = role === 'superadmin'
  const [tab, setTab] = useState<TabKey>('nomina')

  const {
    trabajadores,
    nominaMensual,
    pagosAlcaldia,
    alcaldiaTickets,
    gastosOperativos,
    mercadoPagoCobros,
    ingresosPorPeriodo,
    loading,
    refresh,
  } = useFinanzas()

  const nominaDelPeriodo = nominaMensual.filter((n) => n.mes === mes && n.anio === anio)
  const pagoAlcaldiaDelPeriodo = pagosAlcaldia.find((p) => p.mes === mes && p.anio === anio)
  const ticketsDelPago = alcaldiaTickets.filter((t) => t.pago_alcaldia_id === pagoAlcaldiaDelPeriodo?.id)
  const gastosDelPeriodo = gastosOperativos.filter((g) => g.mes === mes && g.anio === anio)
  const cobrosMpDelPeriodo = mercadoPagoCobros.filter((c) => c.mes === mes && c.anio === anio)
  const ingreso = ingresosPorPeriodo.get(periodoKey(mes, anio))

  const resumen = calcularResumen({
    ingreso,
    nominaDelPeriodo,
    pagoAlcaldia: pagoAlcaldiaDelPeriodo,
    ticketsDelPago,
    gastosDelPeriodo,
    cobrosMpDelPeriodo,
  })

  const TABS: { key: TabKey; label: string; icon: typeof Wallet2 }[] = [
    { key: 'nomina', label: 'Nómina', icon: Wallet2 },
    { key: 'alcaldia', label: 'Alcaldía / Convenio', icon: Landmark },
    { key: 'gastos', label: 'Gastos Operativos', icon: Receipt },
    { key: 'mercadopago', label: 'Mercado Pago', icon: CreditCard },
    { key: 'reporte', label: 'Reporte', icon: FileBarChart2 },
    ...(esSuperadmin ? [{ key: 'declaraciones' as TabKey, label: 'Declaraciones SAT', icon: ShieldCheck }] : []),
  ]

  return (
    <div className="flex flex-col gap-6 print:text-black">
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-white">Control Financiero — Deportivo Morelos</h1>
          <p className="text-sm text-gray-400 mt-1">
            Nómina, pagos a alcaldía, gastos operativos y utilidad mensual. Visible solo para superadministrador y
            administrador.
          </p>
        </div>
        <PeriodSelector />
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando…</p>
      ) : (
        <>
          <ResumenCards resumen={resumen} />

          <div className="flex flex-wrap gap-1 border-b border-border print:hidden">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px transition-colors ${
                  tab === t.key ? 'border-accent text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </div>

          {tab === 'nomina' && (
            <NominaTab
              mes={mes}
              anio={anio}
              trabajadores={trabajadores}
              nominaDelPeriodo={nominaDelPeriodo}
              onChanged={refresh}
            />
          )}
          {tab === 'alcaldia' && (
            <AlcaldiaTab
              mes={mes}
              anio={anio}
              pago={pagoAlcaldiaDelPeriodo}
              tickets={ticketsDelPago}
              ingreso={ingreso}
              onChanged={refresh}
            />
          )}
          {tab === 'gastos' && <GastosTab mes={mes} anio={anio} gastos={gastosDelPeriodo} onChanged={refresh} />}
          {tab === 'mercadopago' && (
            <MercadoPagoTab mes={mes} anio={anio} cobros={cobrosMpDelPeriodo} onChanged={refresh} />
          )}
          {tab === 'reporte' && (
            <ReporteTab
              mes={mes}
              anio={anio}
              resumen={resumen}
              trabajadores={trabajadores}
              nominaMensual={nominaMensual}
              pagosAlcaldia={pagosAlcaldia}
              alcaldiaTickets={alcaldiaTickets}
              gastosOperativos={gastosOperativos}
              mercadoPagoCobros={mercadoPagoCobros}
              ingresosPorPeriodo={ingresosPorPeriodo}
            />
          )}
          {tab === 'declaraciones' && esSuperadmin && (
            <DeclaracionesTab
              mes={mes}
              anio={anio}
              trabajadores={trabajadores}
              nominaDelPeriodo={nominaDelPeriodo}
              pagoAlcaldia={pagoAlcaldiaDelPeriodo}
              ticketsDelPago={ticketsDelPago}
              gastosDelPeriodo={gastosDelPeriodo}
            />
          )}
        </>
      )}
    </div>
  )
}
