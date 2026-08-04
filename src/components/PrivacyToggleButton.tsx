import { Eye, EyeOff } from 'lucide-react'
import { usePrivacy } from '../context/PrivacyContext'

/** Botón flotante equivalente al atajo AltGr+5: oculta/muestra datos de registros sin folio. */
export default function PrivacyToggleButton() {
  const { hideSinFolio, toggleHideSinFolio } = usePrivacy()

  return (
    <button
      type="button"
      onClick={toggleHideSinFolio}
      title={hideSinFolio ? 'Mostrar datos ocultos (AltGr+5)' : 'Ocultar datos sin folio (AltGr+5)'}
      aria-pressed={hideSinFolio}
      className={`fixed top-16 left-4 z-50 flex items-center justify-center w-10 h-10 rounded-full border shadow-lg transition-colors ${
        hideSinFolio
          ? 'bg-warning/20 border-warning/50 text-amber-300'
          : 'bg-surface border-border text-gray-400 hover:text-white hover:border-accent/50'
      }`}
    >
      {hideSinFolio ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  )
}
