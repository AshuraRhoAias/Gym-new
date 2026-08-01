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
  /** Null cuando el rol actual (editor/viewer) no tiene permiso de ver montos (ver registros_view). */
  monto: number | null
  autogenerado: number | null
  estatus: RecordStatus
  horario: string | null
  fecha_ingreso: string | null
  telefono: string | null
  bachillerato: boolean
  atendido_por: string | null
  comentarios: string | null
  foto_url: string | null
  foto_path: string | null
  foto_iv: string | null
  foto_salt: string | null
  created_at: string
  updated_at: string
}

export interface DocumentoEntregado {
  id: string
  registro_id: string
  documento: string
  entregado: boolean
}

export interface DocumentoArchivo {
  id: string
  registro_id: string
  documento: string
  file_path: string
  file_iv: string
  file_salt: string
  mime_type: string
  uploaded_by: string | null
  created_at: string
}

export type DocumentoFirmableTipo = 'cedula_inscripcion' | 'carta_responsiva' | 'reglamento'

export interface Firma {
  id: string
  registro_id: string
  tipo: DocumentoFirmableTipo
  nombre_firmante: string
  firma_path: string
  firma_iv: string
  firma_salt: string
  firmado_por: string | null
  created_at: string
}

export const DOCUMENTO_FIRMABLE_LABEL: Record<DocumentoFirmableTipo, string> = {
  cedula_inscripcion: 'Cédula de Inscripción',
  carta_responsiva: 'Carta Responsiva',
  reglamento: 'Reglamento',
}

export interface AuditLogEntry {
  id: string
  tabla: string
  registro_id: string
  accion: 'update' | 'delete'
  campo: string | null
  valor_anterior: string | null
  valor_nuevo: string | null
  usuario_id: string | null
  usuario: string | null
  created_at: string
}

export interface Profile {
  id: string
  username: string
  role: 'superadmin' | 'admin' | 'editor' | 'viewer'
  created_by: string | null
  created_at: string
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
