# Godplaces.

Plataforma de alquiler temporal tipo Airbnb para Venezuela, operada por una empresa central.

Desarrollado y operado por Trends172Tech.com.

## Stack

- Next.js (App Router) + TypeScript estricto
- UI: Tailwind CSS + shadcn/ui + lucide-react + framer-motion
- ORM: Prisma
- DB: Postgres (Neon)
- Deploy: Vercel
- Imágenes/documentos: Vercel Blob (`BLOB_READ_WRITE_TOKEN`)
- SEO técnico: metadata por página, `robots.ts`, `sitemap.ts`
- Accesibilidad: labels, aria, foco visible, navegación por teclado

## Roles (RBAC)

- `ROOT`: control absoluto + capa crítica (usuarios críticos, settings globales, integraciones, seguridad)
  - El primer `ROOT` se crea solo por seed inicial.
  - Luego, solo `ROOT` puede crear más `ROOT`/`ADMIN` desde `/root/usuarios`.
- `ADMIN`: operación completa (catálogo, reservas, reportes, KYC)
- `ALIADO`: registro, KYC, carga de propiedades (publicación requiere aprobación)
- `CLIENTE`: explora y reserva

## Requisitos

- Node.js 20+ (probado con Node 22)
- Una base de datos Postgres (Neon recomendado)
- Un store/token de Vercel Blob

## Configuración (.env)

1. Crea un `.env` basado en `.env.example`.
2. Variables obligatorias:
   - `DATABASE_URL`
   - `DIRECT_URL` (conexión directa sin pooler; Prisma la usa para migrations/introspection)
   - `AUTH_SECRET`
   - `BLOB_READ_WRITE_TOKEN` (si vas a subir imágenes/documentos)
   - `SEED_ROOT_EMAIL` y `SEED_ROOT_PASSWORD` (para el seed inicial)

## Base de datos (Prisma)

1. Instalar dependencias:

```bash
npm install
```

2. Crear tablas:

```bash
npm run prisma:migrate
```

3. Correr seeds (crea roles, settings base, amenidades, ROOT inicial e inventario interno):

```bash
npm run db:seed
```

Notas:
- El seed crea un usuario de inventario interno (un `ALIADO` con `isInternal=true`) para cargar propiedades internas.
- Si no defines `SEED_INTERNAL_PASSWORD`, el seed generará una contraseña y la imprimirá en consola.

## Desarrollo

```bash
npm run dev
```

Abrir `http://localhost:3000`.

## Deploy (Vercel)

1. Configura las variables de entorno en Vercel (las de `.env.example` que apliquen).
2. Conecta Neon:
   - `DATABASE_URL` debe apuntar a tu Postgres de Neon con `sslmode=require` (recomendado: string del pooler en serverless).
   - `DIRECT_URL` debe apuntar al string directo (sin pooler) para que `prisma migrate deploy` funcione bien.
3. Vercel Blob:
   - define `BLOB_READ_WRITE_TOKEN`.
4. Migrations + seed (primer deploy con DB):
   - `npm run vercel-build` corre `prisma migrate deploy` automáticamente si existe `prisma/migrations` y `DATABASE_URL`.
   - Para correr el seed una sola vez, define `RUN_SEED=1` temporalmente en Vercel y redeploy; luego elimínala.

## IA: asistente “God” (MVP)

- UI obligatoria implementada:
  - Burbuja flotante abajo a la derecha con etiqueta “God” (abre un panel lateral).
  - En Home: búsqueda en lenguaje natural + CTA “Buscar con Inteligencia Artificial”.
  - Modal en Home: “Reservar con IA” (inicia con God).
- Backend:
  - `POST /api/chat/session` existe y usa el usuario autenticado (placeholder listo para integrar ChatKit).
  - Tools (fuente de verdad backend):
    - `POST /api/tools/search_properties`
    - `POST /api/tools/get_property`
    - `POST /api/tools/quote_booking`
    - `POST /api/tools/create_booking_draft`
    - `POST /api/tools/get_policies`

Importante:
- El MVP no integra ChatKit embebido ni OpenAI todavía. Está preparada la arquitectura para function calling.
- God no debe inventar propiedades ni precios: siempre consultar backend (tools).

## Vercel Blob (imágenes y documentos)

Rutas:
- `POST /api/blob/upload` (ADMIN/ROOT y ALIADO en su propio KYC y propiedades propias)
- `POST /api/blob/delete` (ADMIN/ROOT)

DB:
- Se guarda `url` y `pathname` para borrado.

Limitación MVP:
- Vercel Blob es público por URL. Para KYC se muestra solo en interfaces privadas (aliado/admin/root), pero se recomienda implementar URLs firmadas o una capa de proxy/descarga autenticada.

## Páginas principales

- Público:
  - `/` Home (búsqueda IA, destacados, cómo funciona, verificación/seguridad)
  - `/search` listado con filtros
  - `/property/[id]` detalle y reserva
  - `/aliado` iniciar proceso aliado
  - `/aliado/kyc` carga de documentos
  - `/aliado/propiedades` CRUD básico del aliado (pendiente aprobación)
- Auth:
  - `/login`, `/registro`
- Backoffice:
  - `/admin` (ADMIN/ROOT)
  - `/root` (solo ROOT)

## Checklist MVP (SEO/A11y/Perf)

- SEO:
  - `metadata` por página (base + por rutas clave)
  - `robots.ts` y `sitemap.ts`
- A11y:
  - labels explícitos en formularios
  - foco visible consistente
  - navegación por teclado en menús/diálogos

## TODO recomendado (siguiente iteración)

1. ChatKit embed real + OpenAI (tools conectadas desde el agente).
2. Acceso privado/firmado para documentos KYC en Blob.
3. Disponibilidad real por fechas (bloqueos) y validación contra reservas.
4. Pagos y payouts reales (actualmente placeholders).
5. Flujo de aprobación de propiedades con notas y notificaciones.
