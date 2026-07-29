import { Construction } from 'lucide-react'

export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <Construction className="text-gray-600" size={40} />
      <h1 className="text-xl font-semibold text-white">{title}</h1>
      <p className="text-sm text-gray-500 max-w-sm">
        Este módulo está planeado pero aún no implementado en esta versión inicial.
      </p>
    </div>
  )
}
