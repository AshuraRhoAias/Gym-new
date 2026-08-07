import { useLocation } from 'wouter'
import RegistroForm from '../components/RegistroForm'

export default function Inscripciones() {
  const [, navigate] = useLocation()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Inscripciones</h1>
        <p className="text-sm text-gray-400 mt-1">Registra una nueva inscripción en el sistema.</p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Nueva Inscripción</h2>
        <p className="text-sm text-gray-500 mb-4">Complete todos los campos para registrar una nueva inscripción.</p>
        <RegistroForm
          kind="inscripcion"
          inline
          onClose={() => {}}
          onSaved={() => navigate('/')}
        />
      </div>
    </div>
  )
}
