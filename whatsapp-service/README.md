# Servicio de WhatsApp (envío de QR)

Mantiene una sesión de WhatsApp Web vinculada de forma persistente para:

1. Validar si un número mexicano (`+52` o `+521`) tiene cuenta de WhatsApp.
2. Enviar el QR de acceso del gimnasio directamente al chat, sin que el
   administrador tenga que adjuntarlo manualmente.

> ⚠️ Usa [Baileys](https://github.com/WhiskeySockets/Baileys), una librería
> **no oficial** que reimplementa el protocolo de WhatsApp Web. No es la API
> de negocios de Meta: existe riesgo real de que el número quede baneado si
> WhatsApp detecta un patrón de uso automatizado. Úsalo con un número que no
> sea crítico o acepta ese riesgo de forma consciente.

## Se activa junto con la app

Ya no hace falta iniciarlo a mano en casos comunes:

- **App de escritorio (Tauri)**: al abrir GymTech (`npm run tauri:dev` o el `.exe`/`.app`
  instalado), el backend de Rust lanza automáticamente `whatsapp-service` como proceso hijo y lo
  cierra cuando cierras la app. Solo necesita tener `node` instalado y accesible en el `PATH`.
- **Solo navegador, sin Tauri**: usa `npm run dev:web` en vez de `npm run dev` — levanta Vite y
  este servicio juntos (con `concurrently`).

Si por algo el arranque automático falla (Node no instalado, etc.), la app no se cae: el modal de
WhatsApp de la web simplemente queda en "desconectado" hasta iniciarlo a mano con los pasos de
abajo.

## Cómo vincularlo (primera vez)

Requiere `node` instalado y, la primera vez, instalar dependencias:

```bash
cd whatsapp-service
npm install
```

Después, cualquiera de los métodos de arriba lo inicia solo. Para iniciarlo manualmente (por
ejemplo si el arranque automático falló, o para probarlo aislado):

```bash
npm start
```

En la terminal aparecerá un código QR. Ábrelo desde el celular del gimnasio:

`WhatsApp → Ajustes → Dispositivos vinculados → Vincular un dispositivo` y
escanea el QR de la terminal.

La sesión queda guardada en `whatsapp-service/auth/` (nunca se sube a git).
Mientras ese proceso siga corriendo, la sesión permanece activa: se
reconecta solo ante cortes de red o reinicios de WhatsApp, sin pedir un QR
nuevo. Solo se vuelve a pedir QR si la sesión se cierra desde el celular
(cerrar sesión del dispositivo vinculado) o se borra `auth/` manualmente.

### Limitación en builds instalados (producción)

El instalador de escritorio (`tauri:build`) empaqueta el código de `whatsapp-service/` (sin
`node_modules`, para no inflar el instalador) y lo lanza igual al abrir la app. Pero como
`node_modules` no viaja en el paquete, la primera vez en una máquina nueva hay que entrar a la
carpeta `whatsapp-service` que quedó junto al ejecutable instalado y correr `npm install` una
sola vez ahí (además de tener Node.js instalado en esa máquina). Mientras tanto, la app funciona
normal y el envío de QR simplemente cae al enlace manual de WhatsApp.

## Dejarlo siempre corriendo

Este proceso debe quedar activo de forma continua (no es parte del build de
Vite/Tauri). Opciones recomendadas:

- Dejar la terminal abierta con `npm start` mientras se usa el sistema.
- Usar un gestor de procesos como [pm2](https://pm2.keymetrics.io/):
  `pm2 start src/index.js --name whatsapp-gymtech`.

## Si se desconecta

La app web (Finanzas/Inscripciones) muestra automáticamente un modal con el
QR actualizado cuando este servicio reporta `connected: false` en
`GET /status` — solo hay que volver a escanearlo desde el celular.

## Variables de entorno

- `WHATSAPP_SERVICE_PORT` (opcional, default `3900`).

En el proyecto principal, `VITE_WHATSAPP_SERVICE_URL` apunta a este
servicio (default `http://localhost:3900`).

## Endpoints

- `GET /status` → `{ connected, qr }` (`qr` es un data URL o `null`).
- `GET /check/:telefono` → `{ registered, jid }`.
- `POST /send-qr` con `{ telefono, imagenBase64, caption }` → valida el
  número y envía la imagen del QR.
- `DELETE /session` → cierra y borra la sesión actual para forzar un QR
  nuevo (útil si hay que vincular otro número).
