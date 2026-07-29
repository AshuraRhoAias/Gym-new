export type RecordKind =
  | 'inscripcion'
  | 'renovacion'
  | 'inscripcion_bacho'
  | 'renovacion_bacho'

export type RecordStatus =
  | 'pendiente'
  | 'faltan_doc'
  | 'tramitar_hoja'
  | 'completo'
  | 'entregado'

export type PaymentMethod =
  | 'efectivo'
  | 'tarjeta'
  | 'transferencia'
  | 'otro'
  | 'sin_metodo'

export type MovementKind = 'visita' | 'gasto' | 'tomado_caja'

export const DOCUMENTOS_REQUERIDOS = [
  'Cédula',
  'Certificado Médico',
  'CURP',
  'INE',
  'Acta de Nacimiento',
  'Comprobante de Domicilio',
  'Fotos',
  'Donativo',
] as const

export interface Registro {
  id: string
  member_id: string | null
  kind: RecordKind
  nombre: string
  folio: string | null
  mes: string
  anio: number
  forma_pago: PaymentMethod
  monto: number
  autogenerado: number
  estatus: RecordStatus
  horario: string | null
  fecha_ingreso: string | null
  telefono: string | null
  bachillerato: boolean
  atendido_por: string | null
  comentarios: string | null
  foto_url: string | null
  created_at: string
  updated_at: string
}

export interface DocumentoEntregado {
  id: string
  registro_id: string
  documento: string
  entregado: boolean
}

export interface CajaMovimiento {
  id: string
  kind: MovementKind
  usuario: string
  monto: number
  metodo_pago: PaymentMethod
  concepto: string | null
  registro_id: string | null
  fecha: string
}

export interface Database {
  public: {
    Tables: {
      registros: {
        Row: Registro
        Insert: Partial<Registro> & { nombre: string; mes: string; anio: number }
        Update: Partial<Registro>
      }
      documentos_entregados: {
        Row: DocumentoEntregado
        Insert: Partial<DocumentoEntregado> & { registro_id: string; documento: string }
        Update: Partial<DocumentoEntregado>
      }
      caja_movimientos: {
        Row: CajaMovimiento
        Insert: Partial<CajaMovimiento> & { usuario: string }
        Update: Partial<CajaMovimiento>
      }
    }
  }
}

export const ESTATUS_LABEL: Record<RecordStatus, string> = {
  pendiente: 'Pendiente',
  faltan_doc: 'Faltan doc.',
  tramitar_hoja: 'Tramitar hoja',
  completo: 'Completo',
  entregado: 'Entregado',
}

export const PAGO_LABEL: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  otro: 'Otro',
  sin_metodo: 'Sin método',
}

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
