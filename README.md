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
  inscripción/renovación nueva, con envío automático por WhatsApp validando primero que el
  número (+52 o +521) tenga cuenta activa — ver `whatsapp-service/README.md`
- Roles y permisos (superadmin/admin/editor/viewer), auditoría de cambios y gestión de cuentas
  (ver sección dedicada abajo)
- Expediente por registro (botón 📁 en el Dashboard): adjuntar foto/archivo cifrado por cada
  documento requerido, y llenar/firmar en recepción la Cédula de Inscripción, Carta Responsiva y
  Reglamento con firma capturada en pantalla (funciona con el dedo desde el celular)
- Nómina: alta de trabajadores y registro de sus pagos, con reporte mensual (total, por
  trabajador, por método de pago) — exclusiva de superadministrador y administrador
- Buscador global de folios (**Alt+Espacio** en cualquier pantalla): lista solo registros
  (de cualquier tipo) que ya tengan folio asignado, buscable por nombre

Pendiente: envío masivo de "Hoja Rosa" por WhatsApp (visto en las capturas de referencia) y
lectura de QR en vivo con cámara (por ahora es por imagen subida) — quedan fuera de este MVP.

## Envío de QR por WhatsApp (`whatsapp-service/`)

Servicio Node.js aparte (no forma parte del build de Vite/Tauri) que mantiene una sesión de
WhatsApp Web vinculada de forma persistente (librería no oficial
[Baileys](https://github.com/WhiskeySockets/Baileys)) para:

- Validar si un número mexicano tiene cuenta de WhatsApp activa (acepta `+52` o `+521`).
- Enviar el QR de acceso directamente al chat, sin adjuntarlo a mano.

Debe correr siempre en paralelo a la app (`cd whatsapp-service && npm install && npm start`).
La primera vez pide escanear un QR desde la terminal; la sesión queda guardada y se reconecta
sola. Si se llega a desconectar, la app web muestra un modal con el QR actualizado para
revincular. Detalles, riesgos (no es la API oficial de Meta) y endpoints en
`whatsapp-service/README.md`.

## Expediente: documentos adjuntos y firmas digitales

En **Inscripciones** y **Renovaciones**, y también desde el ícono 📁 (Expediente) en la fila de
cada registro del Dashboard:

- **Documentos**: cada uno de los 8 documentos requeridos (Cédula, Certificado Médico, CURP,
  INE, Acta, Comprobante de Domicilio, Fotos, Donativo) ya **no** se marca con un checkbox
  manual — solo cuenta como entregado cuando se le toma una foto o se sube el archivo (botón
  "Adjuntar foto/archivo", con `capture="environment"` para abrir la cámara directamente en
  celular). El archivo se cifra (AES-256-GCM, igual que la foto del alumno) y se sube al bucket
  privado `documentos`; subirlo marca automáticamente `documentos_entregados.entregado = true`.
  - Al **crear** una inscripción/renovación nueva, el registro aún no existe en la base cuando
    se empiezan a subir documentos: el formulario genera un id de cliente desde el primer render
    y sube los archivos cifrados a Storage con ese id por adelantado, pero difiere la escritura
    en `documentos_archivos` (violaría la FK contra una fila que no existe todavía) hasta
    insertar el registro con ese mismo id al final. Verificado end-to-end contra el proyecto
    real, incluyendo que el insert directo en `documentos_archivos` antes de crear el registro
    efectivamente falla por la foreign key, como se espera.
  - Al **editar** un registro existente, la subida escribe de inmediato (no hay nada que
    diferir).
- **Cédula de Inscripción, Carta Responsiva y Reglamento**: se llenan directamente en recepción
  — texto editable (con una plantilla estándar precargada), nombre de quien firma, y un lienzo de
  firma táctil (`SignaturePad`, usa Pointer Events: funciona igual con mouse que con el dedo en un
  celular o tablet). Al guardar, la firma se cifra y se sube igual que los documentos; se puede
  volver a firmar en cualquier momento (queda la versión más reciente).
- Los textos de la Carta Responsiva y el Reglamento en `DocumentoFirmableCard.tsx` son una
  plantilla genérica de ejemplo — revísalos y ajústalos a lo que tu gimnasio necesite legalmente
  antes de usarlos en producción; no son asesoría legal.

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

## Nómina (pagos a trabajadores)

Página `/nomina`, exclusiva de superadministrador y administrador — bloqueada a nivel de base de
datos para editor/viewer (mismo patrón que `caja_movimientos`: sus políticas RLS de
`select`/`insert`/`update` solo permiten `superadmin`/`admin`, `delete` solo `superadmin`), no
solo oculta en el menú.

- **Trabajadores** (`trabajadores`): alta simple (nombre, puesto).
- **Pagos** (`pagos_trabajadores`): concepto, monto, forma de pago, fecha y mes/año al que
  corresponde, ligados a un trabajador.
- **Reporte mensual**: se recalcula automáticamente según el mes/año seleccionado en la barra
  superior — total pagado, número de pagos, trabajadores pagados ese mes, desglose por trabajador
  y por método de pago.

## Buscador global de folios (Alt+Espacio)

Desde cualquier pantalla autenticada, `Alt+Espacio` abre un buscador rápido
(`GlobalFolioSearch`) que consulta `registros_view` filtrando solo registros con folio asignado
(`folio is not null and folio != '0'`), sin restringir por tipo de cuenta/kind — busca por
nombre en inscripciones, renovaciones y sus variantes "Bacho" a la vez. `Esc` o click fuera lo
cierra.

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
