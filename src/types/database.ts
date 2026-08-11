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
  | 'dos_pagos'
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
  /** Folio que tenía el socio antes de esta renovación (referencia histórica, se llena al buscar en Renovaciones). */
  folio_anterior: string | null
  mes: string
  anio: number
  forma_pago: PaymentMethod
  /** Null cuando el rol actual (editor/viewer) no tiene permiso de ver montos (ver registros_view). */
  monto: number | null
  autogenerado: number | null
  /** Comisión automática (4.06%) cuando forma_pago = 'tarjeta'; null en otros métodos o sin permiso de ver montos. */
  comision_tarjeta: number | null
  /** Monto que aún debe el socio (ej. con forma_pago = 'dos_pagos'); null si no aplica o sin permiso de ver montos. */
  saldo_pendiente: number | null
  /** Detalle de cada pago cuando forma_pago = 'dos_pagos'; null si no aplica o sin permiso de ver montos. */
  pago1_forma_pago: PaymentMethod | null
  pago1_monto: number | null
  pago2_forma_pago: PaymentMethod | null
  pago2_monto: number | null
  /** true cuando al socio se le autorizó una beca que descuenta del monto a cobrar. */
  beca: boolean
  /** Quién autorizó la beca; null si no aplica o sin permiso de ver montos. */
  beca_autorizado_por: string | null
  /** Monto ($) autorizado de la beca, ya descontado del `monto` guardado; null si no aplica o sin permiso de ver montos. */
  beca_monto: number | null
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

export type Turno = 'manana' | 'tarde' | 'fin_semana'

export interface Trabajador {
  id: string
  nombre: string
  puesto: string | null
  activo: boolean
  turno: Turno | null
  sueldo_mensual: number | null
  horario: string | null
  created_by: string | null
  created_at: string
}

export interface PagoTrabajador {
  id: string
  trabajador_id: string
  concepto: string
  monto: number
  forma_pago: PaymentMethod
  mes: string
  anio: number
  fecha_pago: string
  registrado_por: string | null
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

/** Folio del ticket/CFDI y comprobante (foto/PDF cifrado) para validar ante el SAT. */
export interface ComprobanteCfdi {
  folio_comprobante: string | null
  comprobante_path: string | null
  comprobante_iv: string | null
  comprobante_salt: string | null
  comprobante_mime: string | null
}

export interface NominaMensual extends ComprobanteCfdi {
  id: string
  trabajador_id: string
  mes: string
  anio: number
  monto: number
  timbrado: boolean
  created_by: string | null
  created_at: string
}

/** Precios fijos del convenio con la Alcaldía (Gaceta DPM Cuajimalpa) por usuario. */
export const PRECIO_MENSUALIDAD_CONVENIO = 129
export const PRECIO_INSCRIPCION_CONVENIO = 299

export function calcularMontoConvenio(mensualidadesUsuarios: number, inscripcionesUsuarios: number) {
  return mensualidadesUsuarios * PRECIO_MENSUALIDAD_CONVENIO + inscripcionesUsuarios * PRECIO_INSCRIPCION_CONVENIO
}

/** folio_comprobante/comprobante_* (heredados de ComprobanteCfdi) son del CFDI de la RENTA. */
export interface PagoAlcaldia extends ComprobanteCfdi {
  id: string
  mes: string
  anio: number
  mensualidades_usuarios: number
  inscripciones_usuarios: number
  monto_convenio: number
  monto_renta: number
  cfdi_recibido: boolean
  folio_calculo_convenio: string | null
  convenio_comprobante_path: string | null
  convenio_comprobante_iv: string | null
  convenio_comprobante_salt: string | null
  convenio_comprobante_mime: string | null
  created_by: string | null
  created_at: string
}

/** Ledger de pagos de convenio realmente efectuados (puede haber varios por periodo). */
export interface ConvenioPago extends ComprobanteCfdi {
  id: string
  mes: string
  anio: number
  monto: number
  created_by: string | null
  created_at: string
}

export interface AlcaldiaTicket {
  id: string
  pago_alcaldia_id: string
  folio: string | null
  monto: number
  created_at: string
  comprobante_path: string | null
  comprobante_iv: string | null
  comprobante_salt: string | null
  comprobante_mime: string | null
}

export type CategoriaGasto =
  | 'papeleria'
  | 'limpieza'
  | 'internet'
  | 'mantenimiento'
  | 'renta_equipo'
  | 'servicios_basicos'
  | 'honorarios'
  | 'publicidad'
  | 'seguros'
  | 'equipo_menor'
  | 'combustibles'
  | 'capacitacion'
  | 'software'
  | 'otros'

/** Categorías de gasto operativo típicamente deducibles ante el SAT. */
export const CATEGORIA_GASTO_LABEL: Record<CategoriaGasto, string> = {
  papeleria: 'Papelería y oficina',
  limpieza: 'Limpieza',
  internet: 'Internet y telefonía',
  mantenimiento: 'Mantenimiento y reparaciones',
  renta_equipo: 'Renta (espacio/equipo)',
  servicios_basicos: 'Servicios básicos (luz, agua, gas)',
  honorarios: 'Honorarios profesionales',
  publicidad: 'Publicidad y marketing',
  seguros: 'Seguros',
  equipo_menor: 'Equipo y herramienta menor',
  combustibles: 'Combustibles y lubricantes',
  capacitacion: 'Capacitación',
  software: 'Software y suscripciones',
  otros: 'Otros',
}

export interface GastoOperativo extends ComprobanteCfdi {
  id: string
  mes: string
  anio: number
  categoria: CategoriaGasto
  descripcion: string | null
  monto: number
  tiene_cfdi: boolean
  created_by: string | null
  created_at: string
}

export const TURNO_LABEL: Record<Turno, string> = {
  manana: 'Mañana',
  tarde: 'Tarde',
  fin_semana: 'Fin de semana',
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
  dos_pagos: '2 Pagos',
  otro: 'Otro',
  sin_metodo: 'Sin método',
}

/** % que se descuenta automáticamente en pagos con tarjeta (inscripciones/renovaciones). */
export const COMISION_TARJETA_PCT = 4.06

export function calcularComisionTarjeta(monto: number) {
  return Math.round(monto * (COMISION_TARJETA_PCT / 100) * 100) / 100
}

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
