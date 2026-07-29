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

Pendientes (placeholders "Próximamente" en la navegación): Scanner QR, Reportes, Payment
Monitor, Enum, Reporte por día, Completos, Documentos faltantes.

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
