export interface ScanSource {
  id: string
  label: string
  kind: 'camera' | 'printer'
}

/**
 * Punto único de descubrimiento de fuentes de escaneo. Hoy solo expone las
 * cámaras disponibles (getUserMedia/enumerateDevices). Cuando se agregue
 * soporte a impresoras/escáneres físicos (driver TWAIN/WIA/SANE vía plugin
 * de Tauri o un microservicio local, como el de whatsapp-service), sus
 * fuentes deben agregarse aquí con kind: 'printer' para que los selectores
 * de cámara/documento las listen sin más cambios en la UI.
 */
export async function listScanSources(): Promise<ScanSource[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices
      .filter((d) => d.kind === 'videoinput')
      .map((d, i) => ({ id: d.deviceId, label: d.label || `Cámara ${i + 1}`, kind: 'camera' as const }))
  } catch {
    return []
  }
}
