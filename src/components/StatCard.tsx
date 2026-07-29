import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  hint?: string
  icon: LucideIcon
  accent?: string
}

export default function StatCard({ label, value, hint, icon: Icon, accent }: StatCardProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between text-gray-400">
        <span className="text-sm">{label}</span>
        <Icon size={16} className={accent ?? 'text-gray-500'} />
      </div>
      <div className="text-3xl font-semibold text-white">{value}</div>
      {hint && <div className="text-xs text-gray-500">{hint}</div>}
    </div>
  )
}
