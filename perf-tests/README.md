# Pruebas de rendimiento (perf-tests)

Carpeta independiente de `src/` con 10 pruebas de rendimiento/carga para
GymTech: qué tan bien aguanta la app muchos datos, muchas peticiones
concurrentes y archivos grandes. No es un test suite de CI (no corre
automático en cada PR) — son scripts para correr a mano cuando quieras
diagnosticar o justificar una optimización.

> ✅ **Corren contra una base de datos de PRUEBA**, no contra producción.
> Usan [Supabase local](https://supabase.com/docs/guides/local-development)
> (Postgres + Auth + Storage + Edge Functions en Docker, en tu propia
> máquina) con el mismo esquema que producción, gracias a los migrations en
> `supabase/migrations/`. Cero riesgo para los datos reales del gimnasio, y
> sin costo — puedes correr las 10 pruebas (incluidas las que escriben o
> tronarían límites) sin preocuparte por nada.

## Setup (una sola vez)

1. Ten [Docker](https://www.docker.com/) corriendo.
2. Desde la raíz del repo, levanta el stack local de Supabase (usa
   `supabase/migrations/` + `supabase/functions/` de este mismo repo):
   ```bash
   npx supabase start
   ```
   La primera vez descarga las imágenes de Docker (Postgres, Auth, Storage,
   Studio, Edge Runtime...) — tarda unos minutos. Cuando termina, imprime las
   URLs y llaves locales (siempre las mismas si no tocas `supabase/config.toml`).
3. Copia las credenciales de prueba:
   ```bash
   cp perf-tests/.env.local.example perf-tests/.env.local
   ```
4. Crea la cuenta de prueba (rol `admin`) en la base local:
   ```bash
   node perf-tests/setup-local-db.mjs
   ```

Con eso, **todas** las pruebas de esta carpeta ya apuntan a local
automáticamente (`perf-tests/.env.local` tiene prioridad sobre el `.env` de
la raíz — ver `lib/env.mjs`), sin exportar nada más.

Para apagar el stack local cuando termines: `npx supabase stop`. Para
resetear la base local a un estado limpio (reaplica todos los migrations):
`npx supabase db reset`.

## Correr las pruebas

Todas se corren con `node` desde la **raíz del repo** (para que resuelva
`node_modules` correctamente):

```bash
node perf-tests/tests/04-client-filter-performance.mjs
```

## Las 10 pruebas

| # | Archivo | Qué mide | Escribe datos | Necesita auth |
|---|---|---|:---:|:---:|
| 01 | `01-bulk-insert-registros.mjs` | Throughput de inserción masiva en `registros` (temporada de inscripciones) | sí | 🔐 |
| 02 | `02-paginated-read-throughput.mjs` | Latencia de lectura paginada conforme crece el offset | no | 🔐 |
| 03 | `03-concurrent-dashboard-reads.mjs` | Varios "usuarios" abriendo el Reporte a la vez | no | 🔐 |
| 04 | `04-client-filter-performance.mjs` | Filtro de búsqueda en memoria (Whats/Gastos) con datasets grandes | no | no |
| 05 | `05-report-aggregation-performance.mjs` | Agregación de totales del Reporte con años de histórico | no | no |
| 06 | `06-crypto-vault-throughput.mjs` | Latencia/carga de la Edge Function de cifrado bajo concurrencia | no | 🔐 |
| 07 | `07-large-file-encryption-stress.mjs` | Reproduce el bug de "Maximum call stack size exceeded" y prueba el fix con archivos de hasta 100MB | no | no |
| 08 | `08-whatsapp-service-status-load.mjs` | Carga sobre el servicio local de WhatsApp (`/status`, `/check`) | no | no |
| 09 | `09-concurrent-auth-login.mjs` | Logins concurrentes contra Supabase Auth | no | 🔐 |
| 10 | `10-storage-upload-download-throughput.mjs` | Subida/bajada de archivos grandes a Storage | sí (auto-limpia) | 🔐 |

Cada script imprime min/avg/p50/p95/p99/max de latencia, throughput y
errores. Variables de entorno para ajustar tamaño/concurrencia están
documentadas al inicio de cada archivo (`PERF_INSERT_COUNT`,
`PERF_CONCURRENCY`, `PERF_PAGES`, etc.) — todas tienen un default razonable
si no las defines.

## Orden sugerido

1. Empieza por las que no tocan red ni DB: **04, 05, 07** (no necesitan
   Supabase local corriendo, son instantáneas).
2. Con `supabase start` + `setup-local-db.mjs` ya hechos, el resto (**01,
   02, 03, 06, 08, 09, 10**) corren sin fricción — no piden confirmación
   extra porque `perf-tests/.env.local.example` ya trae
   `PERF_TEST_CONFIRM=I_UNDERSTAND`.
3. `08` además necesita `whatsapp-service` corriendo (`npm run dev` desde
   la raíz ya lo levanta).

Después de correr `01` puedes limpiar los datos sintéticos con
`node perf-tests/cleanup.mjs`, aunque contra la base local también puedes
simplemente `npx supabase db reset` para empezar de cero.

## ¿Y si de verdad necesito medir contra producción?

Se puede — usando el `.env` normal de la raíz (sin `perf-tests/.env.local`)
en vez del local. Las pruebas que escriben datos (01, 10) exigen entonces
`PERF_TEST_CONFIRM=I_UNDERSTAND` a propósito, marcan todo lo insertado con
un tag identificable y **no lo hacen por defecto**: hace falta que borres o
no tengas `perf-tests/.env.local`, y definas `PERF_TEST_EMAIL`/
`PERF_TEST_PASSWORD` de una cuenta de prueba dedicada (nunca tu cuenta
personal ni una de superadmin real) contra el proyecto real. Solo tiene
sentido si necesitas medir contra el volumen de datos real del gimnasio;
para todo lo demás, usa Supabase local.

## Limpieza

```bash
node perf-tests/cleanup.mjs
```

Borra todo lo insertado por `01` (registros con
`atendido_por = "perf-test-suite"`) y cualquier archivo que haya quedado
bajo `perf-test/` en Storage (por si `10` no pudo autolimpiarse). Usa las
credenciales de `perf-tests/.env.local` si existe, si no las de producción.

## ¿Por qué no hay un test runner tipo Jest/Vitest?

El proyecto no tiene un framework de tests instalado (`oxlint` es el único
linter, no hay suite de unit/integration tests). Estos scripts son
standalone (`node archivo.mjs`) a propósito, para no forzar una dependencia
nueva solo para pruebas de rendimiento manuales.
