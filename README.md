# GymTech

Sistema de gestión de gimnasio (inscripciones, renovaciones, caja de visitas) construido con
React + TypeScript + Vite, Supabase como backend, y Tauri v2 para empaquetar la misma app
como aplicación de escritorio, Android e iOS además de la web.

Diseño basado en las capturas de referencia en `docs/design-reference/`.

## Estado actual (MVP)

Implementado y funcional:

- Login con usuario y contraseña (Supabase Auth)
- Dashboard con tarjetas de estadísticas, tabs (Inscripción / Renovación / Bacho) y tabla con
  búsqueda, detalle y edición
- Inscripciones: alta de nuevo registro con checklist de documentos
- Renovaciones: búsqueda de socio existente y alta de renovación
- Registro de Visitas + Caja de Visitas (historial e ingresos)
- Scanner / Check-in: sube la imagen de un QR de acceso (o busca por nombre/folio) para ver
  documentos faltantes, si pagó el mes en curso, su foto, y registrar el ingreso
- Reportes: estadísticas generales del periodo (bachilleres, faltan doc, tramitar hoja,
  completados, entregados, pendientes) con listados
- PaymentMonitor: total recaudado del periodo desglosado por método de pago
- Reporte por Día (`$ Día`): totales e ingresos detallados de una fecha específica
- Completos: listado filtrable de registros completados/entregados
- Faltan: gestión de documentos faltantes por persona
- Enum: reportes con folio/sin folio y cálculo de saldo (monto − autogenerado)
- Cifrado de campos sensibles (ver sección dedicada abajo) y QR de acceso cifrado por cada
  inscripción/renovación nueva, con botón para compartirlo por WhatsApp

Pendiente: envío masivo de "Hoja Rosa" por WhatsApp (visto en las capturas de referencia) y
lectura de QR en vivo con cámara (por ahora es por imagen subida) — quedan fuera de este MVP.

## Cifrado de datos sensibles

Teléfono, comentarios y la foto del alumno se cifran con **AES-256-GCM** antes de guardarse:

- Cada valor cifrado tiene su propio **salt** (16 bytes) e **IV** (12 bytes) aleatorios — ningún
  valor comparte clave efectiva con otro, ni siquiera dos teléfonos iguales producen el mismo
  ciphertext.
- La clave maestra se deriva vía HKDF-SHA256 del `SUPABASE_SERVICE_ROLE_KEY` del proyecto (nunca
  se expone al cliente ni se configura a mano) dentro de la Edge Function `crypto-vault`
  (`supabase/functions/crypto-vault`). El cliente nunca ve la clave, solo envía/recibe
  texto plano y ciphertext a través de la función.
- La función exige explícitamente un usuario autenticado real (`auth.getUser()`), no solo
  cualquier JWT válido — la publishable key pública por sí sola no autoriza.
- Teléfono/comentarios se listan como "Mostrar" (descifrado bajo demanda) en vez de mostrarse
  automáticamente, para no disparar una llamada a la función por cada fila de una tabla.
- La foto se sube cifrada al bucket privado `fotos` de Supabase Storage; solo se descifra al
  pulsar "Ver foto" en el detalle del registro o en el Scanner.

**QR de acceso**: al crear una inscripción o renovación se genera un QR que codifica el UUID del
registro cifrado con el mismo esquema. El Scanner lo descifra al leer la imagen, resuelve el
registro y muestra si le faltan documentos, si pagó el mes en curso y su foto. El botón "Enviar
por WhatsApp" abre un chat de WhatsApp (`wa.me`) con el número del socio — WhatsApp no permite
adjuntar imágenes automáticamente desde un enlace, así que el QR se descarga y se adjunta a mano;
integrar el envío automático (imagen + plantilla) requeriría credenciales de WhatsApp Business
Cloud API, que no están configuradas en este proyecto.

## Requisitos

- Node.js 20+
- Rust + Cargo (para compilar con Tauri)
- Para Android: Android Studio, SDK/NDK, `ANDROID_HOME` configurado
- Para iOS: macOS con Xcode y una cuenta de desarrollador Apple
- Para desktop Linux: `webkit2gtk`, `libayatana-appindicator3` (ver
  [prerequisitos de Tauri](https://tauri.app/start/prerequisites/))

## Configuración

```bash
cp .env.example .env
npm install
```

`.env` ya trae la URL y publishable key del proyecto Supabase creado para este sistema
(`gymtech`). El esquema (tablas `registros`, `documentos_entregados`, `caja_movimientos`) se
aplicó por migración; RLS está activo y requiere usuario autenticado.

Los usuarios inician sesión con un "usuario" corto (ej. `bernal`) y contraseña; internamente se
mapea a `usuario@gymtech.local` en Supabase Auth. Para crear un usuario nuevo, insertarlo en
Supabase Auth (tabla `auth.users`) con ese formato de correo.

## Desarrollo

```bash
npm run dev              # solo web, http://localhost:1420
npm run tauri:dev        # app de escritorio (requiere deps nativas)
npm run tauri:android:init && npm run tauri:android:dev   # Android
npm run tauri:ios:init && npm run tauri:ios:dev           # iOS (solo macOS)
```

## Build

```bash
npm run build             # build web (dist/)
npm run tauri:build       # instalador de escritorio
npm run tauri:android:build
npm run tauri:ios:build
```
