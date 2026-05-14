# Kimeku

[![npm version](https://img.shields.io/npm/v/@devitzperu/kimeku.svg)](https://www.npmjs.com/package/@devitzperu/kimeku)
[![npm downloads](https://img.shields.io/npm/dm/@devitzperu/kimeku.svg)](https://www.npmjs.com/package/@devitzperu/kimeku)
[![license](https://img.shields.io/badge/license-Sustainable%20Use-blue.svg)](./LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/devitzperu/kimeku.svg?style=social)](https://github.com/devitzperu/kimeku)

Plataforma de documentación de procesos con versionado y flujos de equipo. Documenta, versiona y automatiza la memoria operativa de tu organización.

## Instalación

```bash
npm install -g @devitzperu/kimeku
```

Requiere Postgres 14+ accesible.

## Inicio rápido

```bash
kimeku init      # genera .env con secretos
# edita .env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, AUTH_URL)
kimeku doctor    # valida conexión Postgres
kimeku start     # arranca servidor en :3000
```

## Features

- **Procesos**: documentación versionada con bloques de código y binding a repos Git (GitHub/GitLab).
- **Todos**: tareas con recurrencia (RRULE), alarmas push (Web Push/VAPID) y visibilidad granular.
- **Historial**: timeline de cambios por entidad.
- **Portal cliente**: rol `CLIENT` con vista filtrada en `/portal`, realtime vía SSE.
- **Auth**: next-auth v5 con Credentials + OAuth (GitHub/GitLab), roles ADMIN/EDITOR/VIEWER/CLIENT.
- **API pública**: `/api/v1/*` con API keys, OpenAPI spec en `/api/openapi.json`.
- **Webhooks**: disparadores de flujos y push Git con HMAC.
- **Cron interno**: scheduler embebido para alarmas (sin crontab externo).
- **Uploads**: gestor de archivos con límite configurable.
- **Jerarquía organizacional**: árbol de usuarios para vistas líder/equipo.

## Stack

Next.js 16 · Prisma 6 · next-auth v5 · shadcn/ui · Tailwind v4 · TypeScript · pnpm

## Configuración

`.env` requiere: `DB_*`, `AUTH_SECRET`, `AUTH_URL`, `CRON_SECRET`. VAPID opcional para push notifications.

Genera VAPID keys:

```bash
npx web-push generate-vapid-keys
```

## Comandos CLI

```
kimeku init      Crea .env con secretos generados
kimeku doctor    Diagnostica conexión Postgres
kimeku start     Aplica schema y arranca servidor
kimeku help      Muestra ayuda
```

## Actualizar

```bash
npm install -g @devitzperu/kimeku@latest
```

## Enlaces

- **npm**: https://www.npmjs.com/package/@devitzperu/kimeku
- **Issues**: https://github.com/devitzperu/kimeku/issues
- **Releases**: https://github.com/devitzperu/kimeku/releases

## Licencia

Distribuido bajo la **Kimeku Sustainable Use License**.
Self-host gratuito para uso interno y no comercial.
Para uso comercial o enterprise, contacta a devitzperu.
