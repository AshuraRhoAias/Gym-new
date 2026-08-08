import { usePrivacy } from '../context/PrivacyContext'

/** Oculta un contador/total cuando el modo privacidad está activo (AltGr+5), igual que `Masked` con nombres. */
export default function MaskedCount({ value }: { value: number | string }) {
  const { hideSinFolio } = usePrivacy()
  if (hideSinFolio) return <span className="select-none">•••</span>
  return <>{value}</>
}
