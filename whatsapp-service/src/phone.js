/**
 * Genera los candidatos de número mexicano en formato E.164 sin "+" que
 * WhatsApp puede reconocer. México usa el prefijo 52 para todos los
 * números desde 2019, pero muchas cuentas de WhatsApp más antiguas (y
 * algunas integraciones) todavía registran el JID con el "1" extra de
 * celular (521XXXXXXXXXX), así que probamos ambas variantes.
 */
export function candidatosMexico(telefonoCrudo) {
  const digits = String(telefonoCrudo || '').replace(/\D/g, '')
  if (!digits) return []

  let base10 = null
  if (digits.startsWith('521') && digits.length === 13) base10 = digits.slice(3)
  else if (digits.startsWith('52') && digits.length === 12) base10 = digits.slice(2)
  else if (digits.length === 10) base10 = digits
  else if (digits.startsWith('1') && digits.length === 11) base10 = digits.slice(1)

  if (!base10) return [digits]

  return [`52${base10}`, `521${base10}`]
}
