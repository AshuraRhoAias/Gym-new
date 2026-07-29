import { Calendar } from 'lucide-react'
import { usePeriod } from '../context/PeriodContext'
import { MESES } from '../types/database'

export default function PeriodSelector() {
  const { mes, anio, setMes, setAnio } = usePeriod()

  return (
    <div className="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-gray-200">
      <Calendar size={15} className="text-gray-400" />
      <select
        value={anio}
        onChange={(e) => setAnio(Number(e.target.value))}
        className="bg-transparent focus:outline-none cursor-pointer"
      >
        {Array.from({ length: 6 }, (_, i) => anio - 2 + i).map((y) => (
          <option key={y} value={y} className="bg-surface">
            {y}
          </option>
        ))}
      </select>
      <select
        value={mes}
        onChange={(e) => setMes(e.target.value)}
        className="bg-transparent focus:outline-none cursor-pointer"
      >
        {MESES.map((m) => (
          <option key={m} value={m} className="bg-surface">
            {m}
          </option>
        ))}
      </select>
    </div>
  )
}
