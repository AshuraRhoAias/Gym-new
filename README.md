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
- Roles y permisos (superadmin/admin/editor/viewer), auditoría de cambios y gestión de cuentas
  (ver sección dedicada abajo)

Pendiente: envío masivo de "Hoja Rosa" por WhatsApp (visto en las capturas de referencia) y
lectura de QR en vivo con cámara (por ahora es por imagen subida) — quedan fuera de este MVP.

## Roles, permisos y auditoría

Cuatro roles, todos gestionados desde la tabla `profiles` (1 fila por usuario de Auth):

| Rol | Ve | Edita/crea | Borra | Ve montos | Crea cuentas |
|---|---|---|---|---|---|
| **Superadministrador** (`bernal`) | Todo | Todo, incluida caja | Sí | Sí | Sí |
| **Administrador** | Todo | Todo | No | Sí | No |
| **Editor** | Todo excepto secciones de dinero (Registros Visitas, Caja Visitas, PaymentMonitor, `$ Día`, Enum) — Dashboard es la excepción | Sí (sin montos) | No | No (montos ocultos incluso en Dashboard) | No |
| **Visualizador** | Solo Dashboard y Enum (Enum solo nombre/folio) | No, solo lectura | No | No | No |

- Solo `bernal` (superadministrador) puede crear cuentas nuevas, desde **Usuarios** en la barra de
  navegación (solo visible para él). Internamente llama a la Edge Function
  `admin-create-user`, que verifica el rol del que llama antes de crear el usuario en Auth —
  no se puede crear otro superadministrador desde ahí a propósito.
- El enmascarado de montos es real a nivel de base de datos, no solo visual: el frontend lee los
  registros a través de la vista `registros_view`, que devuelve `monto`/`autogenerado` como
  `null` para editor/viewer (evaluado con una función `security definer` que consulta el rol del
  usuario autenticado). La tabla `caja_movimientos` tiene su propia política RLS que bloquea
  por completo a editor/viewer a nivel de base de datos (no solo se oculta en el menú).
- Solo el superadministrador puede borrar registros (política RLS `delete` restringida a su rol);
  el resto de roles no tiene ni el botón ni el permiso en la base de datos.
- **Auditoría**: cada `UPDATE`/`DELETE` en `registros` hecho por alguien que no sea
  superadministrador se registra campo por campo (valor anterior y nuevo) en la tabla
  `audit_log` vía trigger. Las acciones del superadministrador (incluida edición de fechas o
  borrado) **no dejan rastro**, por diseño explícito. Solo el superadministrador puede leer
  `audit_log`, desde **Auditoría** en la navegación. El nombre de quien atendió cada
  inscripción/renovación/movimiento de caja siempre queda en el propio registro (`atendido_por` /
  `usuario`), independientemente de la auditoría.

Limitación conocida: el enmascarado de montos protege el flujo normal de la app (vista +
políticas RLS de escritura), pero la tabla base `registros` mantiene `SELECT` abierto a
cualquier cuenta autenticada para que las operaciones de escritura (insert/update)
sigan funcionando; un usuario técnico que llame directamente a la API REST sobre `registros` (en
vez de `registros_view`) podría obtener el monto igualmente. Cerrar ese último resquicio requiere
revocar el `SELECT` de la tabla base para roles no elevados, lo cual no se hizo en esta pasada
para no arriesgar romper las operaciones de escritura sin poder probarlo en este entorno.

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
- Para desktop Windows: **Build Tools for Visual Studio** con el workload "Desktop development
  with C++" (instala el linker `link.exe` que Rust necesita). Sin esto, `npm run tauri:build`
  falla con `error: linker \`link.exe\` not found`. Descarga:
  https://visualstudio.microsoft.com/visual-cpp-build-tools/

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
