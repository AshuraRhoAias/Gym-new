import { useEffect, useState } from 'react'
import { FolderOpen } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Modal from './Modal'
import DocumentoUploadField from './DocumentoUploadField'
import DocumentoFirmableCard from './DocumentoFirmableCard'
import {
  DOCUMENTOS_REQUERIDOS,
  type DocumentoArchivo,
  type DocumentoFirmableTipo,
  type Firma,
  type Registro,
} from '../types/database'

const FIRMABLES: DocumentoFirmableTipo[] = ['cedula_inscripcion', 'carta_responsiva', 'reglamento']

export default function ExpedienteModal({ registro, onClose }: { registro: Registro; onClose: () => void }) {
  const [archivos, setArchivos] = useState<Record<string, DocumentoArchivo>>({})
  const [entregados, setEntregados] = useState<Record<string, boolean>>({})
  const [firmas, setFirmas] = useState<Record<string, Firma>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const [{ data: docs }, { data: ents }, { data: firmasData }] = await Promise.all([
        supabase.from('documentos_archivos').select('*').eq('registro_id', registro.id),
        supabase.from('documentos_entregados').select('*').eq('registro_id', registro.id),
        supabase.from('firmas').select('*').eq('registro_id', registro.id),
      ])
      if (!active) return
      setArchivos(Object.fromEntries((docs ?? []).map((d) => [d.documento, d])))
      setEntregados(Object.fromEntries((ents ?? []).map((e) => [e.documento, e.entregado])))
      setFirmas(Object.fromEntries((firmasData ?? []).map((f) => [f.tipo, f])))
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [registro.id])

  const toggleEntregado = async (documento: string, value: boolean) => {
    setEntregados((prev) => ({ ...prev, [documento]: value }))
    await supabase
      .from('documentos_entregados')
      .upsert({ registro_id: registro.id, documento, entregado: value }, { onConflict: 'registro_id,documento' })
  }

  return (
    <Modal
      title="Expediente"
      subtitle={`${registro.nombre} · Folio ${registro.folio || '0'}`}
      onClose={onClose}
      wide
    >
      {loading ? (
        <p className="text-sm text-gray-500 text-center py-8">Cargando…</p>
      ) : (
        <div className="flex flex-col gap-6">
          <section>
            <h3 className="text-sm font-semibold text-white flex items-center gap-1.5 mb-1">
              <FolderOpen size={15} /> Documentos
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Adjunta una foto o archivo por cada documento; se cifra antes de subirse.
            </p>
            <div className="flex flex-col divide-y divide-border border border-border rounded-lg overflow-hidden">
              {DOCUMENTOS_REQUERIDOS.map((doc) => (
                <div key={doc} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 bg-surface-2">
                  <label className="flex items-center gap-2 text-sm text-gray-200 min-w-[180px]">
                    <input
                      type="checkbox"
                      checked={!!entregados[doc]}
                      onChange={(e) => toggleEntregado(doc, e.target.checked)}
                      className="accent-accent"
                    />
                    {doc}
                  </label>
                  <DocumentoUploadField
                    registroId={registro.id}
                    documento={doc}
                    archivo={archivos[doc] ?? null}
                    onUploaded={(archivo) => {
                      setArchivos((prev) => ({ ...prev, [doc]: archivo }))
                      setEntregados((prev) => ({ ...prev, [doc]: true }))
                    }}
                  />
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-white mb-1">Documentos por firmar en recepción</h3>
            <p className="text-xs text-gray-500 mb-3">
              Cédula de Inscripción, Carta Responsiva y Reglamento — se llenan y firman aquí mismo (funciona
              con el dedo desde un celular).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {FIRMABLES.map((tipo) => (
                <DocumentoFirmableCard
                  key={tipo}
                  registroId={registro.id}
                  tipo={tipo}
                  nombreSugerido={registro.nombre}
                  firma={firmas[tipo] ?? null}
                  onSaved={(firma) => setFirmas((prev) => ({ ...prev, [tipo]: firma }))}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </Modal>
  )
}
