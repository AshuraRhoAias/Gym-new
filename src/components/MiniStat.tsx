import type { ReactNode } from 'react'

const COLORS: Record<string, string> = {
  purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  green: 'bg-accent/15 text-accent border-accent/30',
  violet: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  red: 'bg-danger/15 text-red-300 border-danger/30',
  amber: 'bg-warning/15 text-amber-300 border-warning/30',
  blue: 'bg-info/15 text-blue-300 border-info/30',
  orange: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
}

interface MiniStatProps {
  label: string
  value: ReactNode
  color?: keyof typeof COLORS
}

export default function MiniStat({ label, value, color = 'blue' }: MiniStatProps) {
  return (
    <div className={`rounded-lg border px-3 py-4 text-center ${COLORS[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-1 opacity-80">{label}</div>
    </div>
  )
}
