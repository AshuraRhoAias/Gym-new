import { useRef, useState } from 'react'
import { CheckCircle2, PenLine } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { encryptBytes } from '../lib/crypto'
import { useAuth } from '../context/AuthContext'
import SignaturePad, { type SignaturePadHandle } from './SignaturePad'
import EncryptedPhotoViewer from './EncryptedPhotoViewer'
import { DOCUMENTO_FIRMABLE_LABEL, type DocumentoFirmableTipo, type Firma } from '../types/database'

const TEMPLATES: Record<DocumentoFirmableTipo, string> = {
  cedula_inscripcion:
    'El/la suscrito(a) solicita su inscripción a las actividades del gimnasio GymTech, declarando ' +
    'que los datos proporcionados son verídicos y que ha sido informado(a) de las condiciones de ' +
    'la membresía contratada.',
  carta_responsiva:
    'Declaro bajo protesta de decir verdad que me encuentro en condiciones físicas adecuadas para ' +
    'realizar actividad física, exonerando al gimnasio GymTech de responsabilidad por lesiones o ' +
    'accidentes ocurridos durante el uso de sus instalaciones, salvo negligencia comprobada del ' +
    'personal.',
  reglamento:
    'El usuario se compromete a respetar el reglamento interno del gimnasio: uso adecuado del ' +
    'equipo, respeto al personal y demás usuarios, uso de toalla y calzado deportivo, y ' +
    'cumplimiento de los horarios establecidos. El incumplimiento podrá derivar en la suspensión ' +
    'temporal o definitiva de la membresía.',
}

const BUCKET = 'documentos'

interface DocumentoFirmableCardProps {
  registroId: string
  tipo: DocumentoFirmableTipo
  nombreSugerido: string
  firma: Firma | null
  onSaved: (firma: Firma) => void
}

export default function DocumentoFirmableCard({
  registroId,
  tipo,
  nombreSugerido,
  firma,
  onSaved,
}: DocumentoFirmableCardProps) {
  const { username } = useAuth()
  const padRef = useRef<SignaturePadHandle>(null)
  const [texto, setTexto] = useState(TEMPLATES[tipo])
  const [nombreFirmante, setNombreFirmante] = useState(firma?.nombre_firmante ?? nombreSugerido)
  const [hasSignature, setHasSignature] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refirmando, setRefirmando] = useState(!firma)

  const handleGuardar = async () => {
    setError(null)
    if (!nombreFirmante.trim()) {
      setError('Falta el nombre de quien firma')
      return
    }
    const blob = await padRef.current?.toBlob()
    if (!blob || padRef.current?.isEmpty()) {
      setError('Falta la firma')
      return
    }
    setSaving(true)
    try {
      const bytes = new Uint8Array(await blob.arrayBuffer())
      const { c, iv, s } = await encryptBytes(bytes)
      const cipherBytes = Uint8Array.from(atob(c), (ch) => ch.charCodeAt(0))
      const path = `${registroId}/${tipo}-${Date.now()}.enc`
      const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, cipherBytes, {
        contentType: 'application/octet-stream',
        upsert: true,
      })
      if (uploadErr) throw uploadErr

      const { data, error: dbErr } = await supabase
        .from('firmas')
        .upsert(
          {
            registro_id: registroId,
            tipo,
            nombre_firmante: nombreFirmante.trim(),
            firma_path: path,
            firma_iv: iv,
            firma_salt: s,
            firmado_por: username,
          },
          { onConflict: 'registro_id,tipo' },
        )
        .select('*')
        .single()
      if (dbErr || !data) throw dbErr ?? new Error('No se pudo guardar la firma')

      onSaved(data as Firma)
      setRefirmando(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la firma')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-surface-2 border border-border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">{DOCUMENTO_FIRMABLE_LABEL[tipo]}</h3>
        {firma && !refirmando && (
          <span className="flex items-center gap-1 text-xs text-accent">
            <CheckCircle2 size={13} /> Firmado
          </span>
        )}
      </div>

      {firma && !refirmando ? (
        <div className="flex flex-col gap-2 text-sm">
          <p className="text-gray-400 text-xs">
            Firmado por <span className="text-gray-200">{firma.nombre_firmante}</span> el{' '}
            {new Date(firma.created_at).toLocaleString()}
            {firma.firmado_por && <> · capturado por {firma.firmado_por}</>}
          </p>
          <EncryptedPhotoViewer path={firma.firma_path} iv={firma.firma_iv} salt={firma.firma_salt} />
          <button
            type="button"
            onClick={() => setRefirmando(true)}
            className="self-start flex items-center gap-1 text-xs text-gray-400 hover:text-white"
          >
            <PenLine size={12} /> Firmar de nuevo
          </button>
        </div>
      ) : (
        <>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={4}
            className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-accent resize-none"
          />
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Nombre de quien firma</label>
            <input
              value={nombreFirmante}
              onChange={(e) => setNombreFirmante(e.target.value)}
              placeholder="Nombre completo"
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Firma (dedo o mouse)</label>
            <SignaturePad ref={padRef} onChange={setHasSignature} />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2">
            {firma && (
              <button
                type="button"
                onClick={() => setRefirmando(false)}
                className="px-3 py-1.5 text-xs rounded-lg border border-border text-gray-300 hover:bg-surface"
              >
                Cancelar
              </button>
            )}
            <button
              type="button"
              onClick={handleGuardar}
              disabled={saving || !hasSignature}
              className="px-3 py-1.5 text-xs rounded-lg bg-accent hover:bg-accent-dark disabled:opacity-50 text-black font-medium"
            >
              {saving ? 'Guardando…' : 'Guardar firma'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
