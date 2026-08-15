# Pruebas de rendimiento (perf-tests)

Carpeta independiente de `src/` con 10 pruebas de rendimiento/carga para
GymTech: qué tan bien aguanta la app muchos datos, muchas peticiones
concurrentes y archivos grandes. No es un test suite de CI (no corre
automático en cada PR) — son scripts para correr a mano cuando quieras
diagnosticar o justificar una optimización.

> ⚠️ **Importante**: la mayoría de estas pruebas hablan con el proyecto de
> Supabase de **producción** (`gymtech`, el mismo que usa la app real) —
> no hay un ambiente de staging separado en este repo. Las de solo lectura
> son de bajo riesgo; las que **escriben** datos (01 y 10) exigen la
> variable `PERF_TEST_CONFIRM=I_UNDERSTAND` a propósito, marcan todo lo que
> insertan y traen su propia limpieza (`cleanup.mjs`). Aun así, mejor
> correrlas fuera de horario de uso real, y revisar `cleanup.mjs` después.

## Requisitos

1. `npm install` ya corrido en la raíz del repo (usa `@supabase/supabase-js`
   de `node_modules` de la raíz — no tiene `package.json` propio).
2. Un `.env` en la raíz del repo con `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_PUBLISHABLE_KEY` (el mismo que usa la app).
3. Para las pruebas marcadas 🔐 abajo: una **cuenta de prueba dedicada**
   (rol `editor` o `admin` en la tabla `profiles`) — nunca uses tu cuenta
   personal ni una de superadmin real. Exporta:
   ```bash
   export PERF_TEST_EMAIL=perf-tests@example.com
   export PERF_TEST_PASSWORD=...
   ```
   Ver `.env.example` para más detalle.

Todas se corren con `node` desde la **raíz del repo** (para que resuelva
`node_modules` correctamente):

```bash
node perf-tests/tests/04-client-filter-performance.mjs
```

## Las 10 pruebas

| # | Archivo | Qué mide | Escribe datos | Necesita auth |
|---|---|---|:---:|:---:|
| 01 | `01-bulk-insert-registros.mjs` | Throughput de inserción masiva en `registros` (temporada de inscripciones) | ⚠️ sí | 🔐 |
| 02 | `02-paginated-read-throughput.mjs` | Latencia de lectura paginada conforme crece el offset | no | 🔐 |
| 03 | `03-concurrent-dashboard-reads.mjs` | Varios "usuarios" abriendo el Reporte a la vez | no | 🔐 |
| 04 | `04-client-filter-performance.mjs` | Filtro de búsqueda en memoria (Whats/Gastos) con datasets grandes | no | no |
| 05 | `05-report-aggregation-performance.mjs` | Agregación de totales del Reporte con años de histórico | no | no |
| 06 | `06-crypto-vault-throughput.mjs` | Latencia/carga de la Edge Function de cifrado bajo concurrencia | no* | 🔐 |
| 07 | `07-large-file-encryption-stress.mjs` | Reproduce el bug de "Maximum call stack size exceeded" y prueba el fix con archivos de hasta 100MB | no | no |
| 08 | `08-whatsapp-service-status-load.mjs` | Carga sobre el servicio local de WhatsApp (`/status`, `/check`) | no | no |
| 09 | `09-concurrent-auth-login.mjs` | Logins concurrentes contra Supabase Auth | no | 🔐 |
| 10 | `10-storage-upload-download-throughput.mjs` | Subida/bajada de archivos grandes a Storage | ⚠️ sí (auto-limpia) | 🔐 |

\* 06 no escribe en tablas, pero sí genera carga real sobre la Edge Function del proyecto.

Cada script imprime min/avg/p50/p95/p99/max de latencia, throughput y
errores. Variables de entorno para ajustar tamaño/concurrencia están
documentadas al inicio de cada archivo (`PERF_INSERT_COUNT`,
`PERF_CONCURRENCY`, `PERF_PAGES`, etc.) — todas tienen un default razonable
si no las defines.

## Orden sugerido

1. Empieza por las que no tocan red ni DB: **04, 05, 07** (seguras, rápidas,
   sirven para afinar el frontend puro).
2. Sigue con las de solo lectura contra Supabase: **02, 03**.
3. Prueba el servicio local de WhatsApp: **08** (con `whatsapp-service`
   corriendo — `npm run dev` desde la raíz ya lo levanta).
4. Solo si de verdad necesitas medir escritura/Storage/auth, y estás
   consciente de que es contra producción: **01, 06, 09, 10** — y corre
   `node perf-tests/cleanup.mjs` después de 01.

## Limpieza

```bash
PERF_TEST_EMAIL=... PERF_TEST_PASSWORD=... node perf-tests/cleanup.mjs
```

Borra todo lo insertado por `01` (registros con
`atendido_por = "perf-test-suite"`) y cualquier archivo que haya quedado
bajo `perf-test/` en Storage (por si `10` no pudo autolimpiarse).

## ¿Por qué no hay un test runner tipo Jest/Vitest?

El proyecto no tiene un framework de tests instalado (`oxlint` es el único
linter, no hay suite de unit/integration tests). Estos scripts son
standalone (`node archivo.mjs`) a propósito, para no forzar una dependencia
nueva solo para pruebas de rendimiento manuales.
