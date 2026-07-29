import { useRef, useState } from 'react'
import jsQR from 'jsqr'
import { QrCode, Search, CheckCircle2, Upload, AlertTriangle, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { readQrToken } from '../lib/qr'
import EncryptedPhotoViewer from '../components/EncryptedPhotoViewer'
import { MESES, type Registro } from '../types/database'

interface ScanResult {
  registro: Registro
  faltanDocumentos: boolean
  pagoMesActual: boolean
}

function currentMonthYear() {
  const now = new Date()
  return { mes: MESES[now.getMonth()], anio: now.getFullYear() }
}

async function decodeQrFile(file: File): Promise<string | null> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(bitmap, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const code = jsQR(imageData.data, imageData.width, imageData.height)
  return code?.data ?? null
}

export default function Scanner() {
  const { username } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Registro[]>([])
  const [searching, setSearching] = useState(false)
  const [checkedIn, setCheckedIn] = useState<Registro | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  const search = async (q: string) => {
    setQuery(q)
    setCheckedIn(null)
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    const { data } = await supabase
      .from('registros')
      .select('*')
      .or(`nombre.ilike.%${q}%,folio.ilike.%${q}%`)
      .limit(6)
    setResults(data ?? [])
    setSearching(false)
  }

  const registrarVisita = async (r: Registro) => {
    setError(null)
    const { error: err } = await supabase.from('caja_movimientos').insert({
      kind: 'visita',
      usuario: username ?? 'desconocido',
      monto: 0,
      metodo_pago: 'sin_metodo',
      concepto: `Check-in: ${r.nombre} (folio ${r.folio || '0'})`,
      registro_id: r.id,
    })
    if (err) {
      setError(err.message)
      return
    }
    setCheckedIn(r)
    setResults([])
    setQuery('')
  }

  const handleQrFile = async (file: File) => {
    setScanning(true)
    setScanError(null)
    setScanResult(null)
    try {
      const token = await decodeQrFile(file)
      if (!token) throw new Error('No se detectó ningún código QR en la imagen')

      const registroId = await readQrToken(token)
      if (!registroId) throw new Error('El QR no es válido o no se pudo descifrar')

      const { data: registro, error: fetchErr } = await supabase
        .from('registros')
        .select('*')
        .eq('id', registroId)
        .single()
      if (fetchErr || !registro) throw new Error('El registro del QR ya no existe')

      const { mes, anio } = currentMonthYear()
      const { count } = await supabase
        .from('registros')
        .select('id', { count: 'exact', head: true })
        .ilike('nombre', registro.nombre)
        .eq('mes', mes)
        .eq('anio', anio)
        .gt('monto', 0)

      setScanResult({
        registro,
        faltanDocumentos: registro.estatus === 'faltan_doc',
        pagoMesActual: (count ?? 0) > 0,
      })
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'No se pudo leer el QR')
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      <div className="flex items-center gap-2 justify-center">
        <QrCode className="text-accent" size={22} />
        <h1 className="text-2xl font-semibold text-white">Scanner / Check-in</h1>
      </div>
      <p className="text-sm text-gray-400 text-center -mt-4">
        Sube la imagen del código QR de acceso (generado al inscribir/renovar) o busca manualmente
        por nombre o folio.
      </p>

      <div className="bg-surface border border-border rounded-xl p-5">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleQrFile(file)
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={scanning}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-border rounded-lg py-4 text-sm text-gray-300 hover:border-accent/50 disabled:opacity-60"
        >
          {scanning ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {scanning ? 'Leyendo QR…' : 'Subir imagen del código QR'}
        </button>

        {scanError && (
          <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2 mt-3">
            {scanError}
          </p>
        )}

        {scanResult && (
          <div className="mt-4 bg-surface-2 border border-border rounded-lg p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">{scanResult.registro.nombre}</p>
                <p className="text-xs text-gray-400">Folio: {scanResult.registro.folio || '0'}</p>
              </div>
              {scanResult.registro.foto_path && scanResult.registro.foto_iv && scanResult.registro.foto_salt && (
                <EncryptedPhotoViewer
                  path={scanResult.registro.foto_path}
                  iv={scanResult.registro.foto_iv}
                  salt={scanResult.registro.foto_salt}
                />
              )}
            </div>

            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex items-center gap-2">
                {scanResult.faltanDocumentos ? (
                  <AlertTriangle size={14} className="text-danger" />
                ) : (
                  <CheckCircle2 size={14} className="text-accent" />
                )}
                <span className={scanResult.faltanDocumentos ? 'text-red-300' : 'text-gray-300'}>
                  {scanResult.faltanDocumentos ? 'Le faltan documentos' : 'Documentos completos'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {scanResult.pagoMesActual ? (
                  <CheckCircle2 size={14} className="text-accent" />
                ) : (
                  <XCircle size={14} className="text-danger" />
                )}
                <span className={scanResult.pagoMesActual ? 'text-gray-300' : 'text-red-300'}>
                  {scanResult.pagoMesActual ? 'Mes actual pagado' : 'No ha pagado el mes actual'}
                </span>
              </div>
            </div>

            <button
              onClick={() => registrarVisita(scanResult.registro)}
              className="bg-accent hover:bg-accent-dark text-black font-medium rounded-lg py-2 text-sm"
            >
              Registrar check-in
            </button>
          </div>
        )}
      </div>

      <div className="bg-surface border border-border rounded-xl p-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
          <input
            value={query}
            onChange={(e) => search(e.target.value)}
            placeholder="Buscar por nombre o folio…"
            className="w-full bg-surface-2 border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-accent"
          />
        </div>

        {searching && <p className="text-sm text-gray-500 mt-3">Buscando…</p>}

        {results.length > 0 && (
          <div className="flex flex-col gap-2 mt-3">
            {results.map((r) => (
              <button
                key={r.id}
                onClick={() => registrarVisita(r)}
                className="text-left bg-surface-2 border border-border rounded-lg px-4 py-3 hover:border-accent/50"
              >
                <div className="font-medium text-white">{r.nombre}</div>
                <div className="text-xs text-gray-400 mt-0.5">Folio: {r.folio || '0'}</div>
              </button>
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2 mt-3">{error}</p>
        )}

        {checkedIn && (
          <div className="mt-4 bg-accent/10 border border-accent/30 rounded-lg px-4 py-3 flex items-center gap-3">
            <CheckCircle2 className="text-accent shrink-0" size={22} />
            <div>
              <p className="text-sm font-medium text-white">Check-in registrado</p>
              <p className="text-xs text-gray-400">{checkedIn.nombre} · Folio {checkedIn.folio || '0'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
