import { usePrivacy, tieneFolio } from '../context/PrivacyContext'

/**
 * Oculta `value` cuando el modo privacidad está activo (AltGr+5) y el
 * registro no tiene folio asignado. Se usa en listas/tablas que muestran
 * datos personales de registros sin folio (prospectos aún no inscritos).
 */
export default function Masked({
  folio,
  value,
}: {
  folio: string | null | undefined
  value: string | number | null | undefined
}) {
  const { hideSinFolio } = usePrivacy()
  if (hideSinFolio && !tieneFolio(folio)) return <span className="select-none">••••••••</span>
  return <>{value ?? ''}</>
}
