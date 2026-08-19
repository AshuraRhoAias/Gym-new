/**
 * Recomprime una imagen a JPEG antes de cifrarla/subirla: reduce el peso de
 * fotos tomadas con cámara de celular (a veces varios MB) sin perder
 * legibilidad para el uso que se le da aquí (credenciales, comprobantes).
 * Si algo falla (formato no soportado, navegador viejo), se devuelve el
 * archivo original tal cual — nunca bloquea la subida.
 */
export async function compressImage(file: File, maxDimension = 1600, quality = 0.82): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) return file

    // No comprimir si, por lo que sea, el resultado quedó más pesado.
    if (blob.size >= file.size) return file

    const name = file.name.replace(/\.\w+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg' })
  } catch {
    return file
  }
}
