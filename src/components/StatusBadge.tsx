import { ESTATUS_LABEL, type RecordStatus } from '../types/database'

const STYLES: Record<RecordStatus, string> = {
  pendiente: 'bg-gray-500/15 text-gray-300',
  faltan_doc: 'bg-danger/15 text-red-300',
  tramitar_hoja: 'bg-warning/15 text-amber-300',
  completo: 'bg-info/15 text-blue-300',
  entregado: 'bg-accent/15 text-accent',
}

export default function StatusBadge({ status }: { status: RecordStatus }) {
  return (
    <span className={`text-xs px-2 py-1 rounded-md font-medium ${STYLES[status]}`}>
      {ESTATUS_LABEL[status]}
    </span>
  )
}
