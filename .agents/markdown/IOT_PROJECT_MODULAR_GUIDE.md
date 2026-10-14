# PANDUAN ARSITEKTUR PROYEK: IoT SUPERCAP MONITORING
## Modular-Based Fullstack (Next.js + Express.js + Prisma ORM + PostgreSQL)

> **Revisi dari `NEW_PROJECT_MODULAR_GUIDE.md`** untuk proyek *Energy-Aware Battery-Less LoRa IoT System*.
> Tech stack, alur modular bottom-up, dan gaya UI tetap mengikuti blueprint ERP-mu. Yang diganti: domain (transaksi menjadi data sensor), autentikasi perangkat, antrean perintah, grafik, dan deployment ke VPS.

---

## DAFTAR ISI
0. [Tujuan, Ruang Lingkup, dan Perubahan dari Blueprint Lama](#0-tujuan-ruang-lingkup-dan-perubahan-dari-blueprint-lama)
1. [Prinsip Utama & Tech Stack](#1-prinsip-utama--tech-stack)
2. [Inisialisasi Proyek Step-by-Step](#2-inisialisasi-proyek-step-by-step)
3. [Struktur Folder Modular](#3-struktur-folder-modular)
4. [Kontrak API & Skema Database](#4-kontrak-api--skema-database)
5. [Alur Pengerjaan Modular Bottom-Up (8 Langkah)](#5-alur-pengerjaan-modular-bottom-up-8-langkah)
6. [Standar Tampilan & Layouting UI/UX](#6-standar-tampilan--layouting-uiux)
7. [Best Practices Integritas Data IoT](#7-best-practices-integritas-data-iot)
8. [Deployment ke VPS](#8-deployment-ke-vps)
9. [Persiapan LoRa](#9-persiapan-lora)
10. [Checklist Production Readiness](#10-checklist-production-readiness)

---

## 0. TUJUAN, RUANG LINGKUP, DAN PERUBAHAN DARI BLUEPRINT LAMA

### Tujuan aplikasi
1. **Menerima data** dari ESP32 (tegangan supercap, status penjadwalan, diagnosis boot, durasi aktif).
2. **Menampilkan data** dalam **diagram garis** (tegangan terhadap waktu) dan **diagram lingkaran** (proporsi status Safe/Medium/Critical).
3. **Mereset ESP32 dari jarak jauh** lewat antrean perintah.

### Batasan penting fitur reset
ESP32 hampir selalu dalam deep sleep dengan WiFi mati, jadi server **tidak bisa menghubunginya**. Alurnya:

```
Admin klik "Reset"  ->  perintah disimpan (PENDING, punya masa berlaku)
ESP32 bangun & POST data  ->  server membalas {"cmd":"restart"}  ->  perintah ditandai DELIVERED
ESP32 menjalankan esp_restart()
```

- Tidak ada koneksi tambahan, jadi **tidak ada energi tambahan**.
- Reset dari web **tidak bisa menghidupkan alat yang mati atau gagal boot**, karena alat yang mati tidak membaca balasan apa pun.

### Perubahan dari blueprint lama

| Blueprint lama | Revisi ini | Alasan |
|---|---|---|
| `Transaction`, `TransactionItem` | `Device`, `Reading`, `Command`, `User` | Domain IoT |
| `PermissionMiddleware` (RBAC granular) | `requireRole('ADMIN')` dengan dua peran | Cukup untuk dashboard penelitian |
| Hanya auth JWT user | Ditambah `DeviceMiddleware` (`X-Device-Key`) | ESP32 bukan user |
| Token di `localStorage` | Cookie `httpOnly` | Aplikasi di VPS publik |
| UUID di semua tabel | `Reading.id` bertipe `Int` autoincrement | Tabel time-series, dan hindari error serialisasi `BigInt` |
| Prisma versi terbaru | **Prisma di-pin ke 6.x** | Prisma 7 mengubah setup (ESM, driver adapter, `prisma.config.ts`). Upgrade jadi pekerjaan terpisah |
| Alias `@/*` tanpa `tsc-alias` | Ditambah `tsc-alias` | Tanpa itu build gagal runtime (`Cannot find module '@/...'`) |
| `rootDir: ./src` tetapi `include: prisma/**` | `include` hanya `src/**` | Konflik ini membuat `tsc` error TS6059 |
| `tailwind.config.ts` gaya v3 dengan kelas v4 | Tailwind v4 konsisten (tanpa file config) | `create-next-app@latest` membuat proyek v4 |
| Hanya paket Radix yang di-install | `npx shadcn@latest init` | Komponen `components/ui/*` dan `cn.ts` dibuat oleh shadcn |
| Satu `createApi` per fitur | Satu `api.ts` + `injectEndpoints` | Satu reducer dan satu middleware |
| Bagian 6 (nominal, DP/pelunasan, double-entry) | Bagian 7 (integritas data IoT) | Aturan ERP tidak relevan |
| Tidak ada deployment | Bagian 8 (Docker Compose + Caddy) | Aplikasi akan di VPS |

---

## 1. PRINSIP UTAMA & TECH STACK

```
                  ┌──────────────────────┐        ┌────────────────────┐
                  │  ESP32-C3 (WiFi/LoRa) │        │  Browser (Admin)   │
                  └──────────┬───────────┘        └─────────┬──────────┘
        POST /api/ingest     │  X-Device-Key                 │ cookie httpOnly
        (JSON kecil)         ▼                               ▼
                  ┌──────────────────────────────────────────────────┐
                  │                     Caddy (HTTPS)                 │
                  │   /api/*  ──►  Express.js        /*  ──►  Next.js │
                  └──────────────────────┬───────────────────────────┘
                                         │ Prisma
                                         ▼
                                  ┌──────────────┐
                                  │  PostgreSQL  │
                                  └──────────────┘
```

### Tech Stack Frontend
- **Framework**: Next.js (App Router), TypeScript strict
- **State & fetching**: Redux Toolkit + RTK Query
- **Styling**: Tailwind CSS v4, Lucide React
- **UI primitives**: shadcn/ui (`Button`, `Card`, `Dialog`, `Badge`, `Input`, `Table`, `Select`, `Sonner`)
- **Grafik**: Recharts (dipakai langsung, tanpa komponen `chart` shadcn, supaya tidak bergantung pada variabel warna tema)
- **Notifikasi**: Sonner
- **Waktu**: `Intl.DateTimeFormat` dengan zona `Asia/Jakarta` (tanpa dependensi tambahan)

### Tech Stack Backend
- **Framework**: Node.js + Express.js (v5), TypeScript (CommonJS)
- **ORM & DB**: Prisma 6.x + PostgreSQL 16
- **Validasi**: Zod
- **Keamanan**: Helmet, CORS, `express-rate-limit`, JWT (cookie `httpOnly`), bcryptjs
- **Dev runner**: `tsx` (mendukung path alias `@/*`)
- **Build**: `tsc` + `tsc-alias`
- **Response util**: `Send.success` dan `Send.error`

### Keputusan arsitektur yang perlu diingat
1. **ESP32 hanya memanggil satu endpoint.** Tidak ada Blynk, Google Sheets, atau OpenWeatherMap dari ESP32. Kalau data cuaca dibutuhkan, server yang mengambilnya.
2. **Endpoint ingest harus tipis dan cepat.** Setiap detik ESP32 menunggu balasan adalah energi supercap.
3. **Waktu dicatat oleh server (UTC).** Alat tidak perlu NTP.
4. **Realtime cukup dengan polling.** Alat mengirim tiap 15-60 menit, jadi WebSocket tidak diperlukan.

---

## 2. INISIALISASI PROYEK STEP-BY-STEP

### A. Root directory dan Git
```bash
mkdir iot-supercap && cd iot-supercap
git init -b main
mkdir deploy firmware
```

`.gitignore` di root:
```
node_modules
dist
.next
.env
.env.*
!.env.example
```

> **Jangan commit `.env`.** Token Blynk, API key OpenWeatherMap, dan URL Apps Script lama sudah pernah terlihat di percakapan, jadi anggap semuanya bocor. Buat yang baru kalau masih dipakai.

### B. Database development
`deploy/docker-compose.dev.yml`:
```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: iot
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: iot
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
volumes:
  pgdata:
```
```bash
docker compose -f deploy/docker-compose.dev.yml up -d
```

### C. Inisialisasi Backend
```bash
mkdir iot-supercap-be && cd iot-supercap-be
npm init -y
npm install express cors helmet cookie-parser express-rate-limit dotenv zod jsonwebtoken bcryptjs
npm install @prisma/client@6 prisma@6
npm install -D typescript tsx tsc-alias @types/node @types/express @types/cors @types/cookie-parser @types/jsonwebtoken @types/bcryptjs
npx prisma init --datasource-provider postgresql
cd ..
```

> `prisma` sengaja ada di `dependencies` (bukan `devDependencies`), supaya `npx prisma migrate deploy` jalan di container produksi dengan versi yang sama. Tanpa itu `npx` mengunduh versi terbaru (v7) dan setup-nya bentrok.

`iot-supercap-be/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src/**/*"]
}
```

`package.json` (bagian `scripts` dan `prisma`):
```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json && tsc-alias -p tsconfig.json",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:seed": "prisma db seed"
  },
  "prisma": { "seed": "tsx prisma/seed/seed.ts" }
}
```

`iot-supercap-be/.env.example` (salin ke `.env` dan isi):
```
DATABASE_URL=postgresql://iot:devpass@localhost:5432/iot?schema=public
JWT_SECRET=
CORS_ORIGIN=http://localhost:3000
PORT=3001
ADMIN_EMAIL=
ADMIN_PASSWORD=
```
Buat `JWT_SECRET` dengan `openssl rand -hex 32`.

### D. Inisialisasi Frontend
```bash
npx create-next-app@latest iot-supercap-fe --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
cd iot-supercap-fe
npm install @reduxjs/toolkit react-redux recharts lucide-react sonner
npx shadcn@latest init
npx shadcn@latest add button card badge dialog input label table select sonner
cd ..
```

`iot-supercap-fe/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

`next.config.ts` (untuk Docker nanti):
```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
}

export default nextConfig
```

**Font di Tailwind v4.** Tidak ada `tailwind.config.ts`. Pasang font lewat `next/font` di `src/app/layout.tsx`, lalu daftarkan di `src/app/globals.css`:
```css
@import "tailwindcss";

@theme inline {
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
}
```
```tsx
// src/app/layout.tsx
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
// ...<html lang="id" className={inter.variable}>
```
Kalau `create-next-app` sudah membuat blok `@theme inline` dengan font Geist, ganti isinya sesuai di atas. Kalau proyek yang dihasilkan ternyata masih Tailwind v3, kelas `bg-linear-to-br` diganti `bg-gradient-to-br` dan `shadow-xs` menjadi `shadow-sm`.

---

## 3. STRUKTUR FOLDER MODULAR

```
iot-supercap/
├── deploy/
│   ├── docker-compose.dev.yml
│   ├── docker-compose.prod.yml
│   └── Caddyfile
├── firmware/                         # Kode ESP32
├── iot-supercap-be/                  # BACKEND
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/               # Di-commit ke Git
│   │   └── seed/seed.ts
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts                # Validasi .env dengan Zod
│   │   │   └── database.ts           # PrismaClient
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts    # JWT cookie + requireRole
│   │   │   ├── device.middleware.ts  # X-Device-Key
│   │   │   ├── rate-limit.ts
│   │   │   └── error.middleware.ts
│   │   ├── utils/response.util.ts    # Send.success / Send.error
│   │   ├── types/express.d.ts        # Tambahan tipe req.user / req.device
│   │   ├── modules/
│   │   │   ├── auth/                 # login, me, logout
│   │   │   ├── devices/
│   │   │   ├── ingest/               # Endpoint untuk ESP32
│   │   │   ├── readings/
│   │   │   ├── stats/
│   │   │   └── commands/
│   │   │       ├── commands.module.ts
│   │   │       ├── controller/commands.controller.ts
│   │   │       └── dto/commands.dto.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── Dockerfile
│   ├── .env
│   ├── package.json
│   └── tsconfig.json
│
└── iot-supercap-fe/                  # FRONTEND
    ├── public/
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx            # StoreProvider + Toaster
    │   │   ├── page.tsx              # PageGuard + DashboardPage
    │   │   └── login/page.tsx
    │   ├── modules/
    │   │   └── dashboard/
    │   │       ├── DashboardPage.tsx
    │   │       └── components/
    │   │           ├── DeviceStatusCards.tsx
    │   │           ├── VoltageLineChart.tsx
    │   │           ├── StatusPieChart.tsx
    │   │           ├── ReadingsTable.tsx
    │   │           └── ResetDeviceDialog.tsx
    │   ├── components/
    │   │   ├── ui/                   # Dibuat oleh shadcn
    │   │   ├── auth/PageGuard.tsx
    │   │   └── providers/StoreProvider.tsx
    │   ├── services/
    │   │   ├── api.ts                # Base API (satu-satunya createApi)
    │   │   ├── auth.ts
    │   │   ├── device.ts
    │   │   ├── reading.ts
    │   │   └── command.ts
    │   ├── store/index.ts
    │   ├── types/                    # auth.ts, device.ts, reading.ts, command.ts
    │   └── utils/
    │       ├── format.ts             # Format waktu WIB & tegangan
    │       └── device-state.ts
    ├── Dockerfile
    ├── .env.local
    └── package.json
```

---

## 4. KONTRAK API & SKEMA DATABASE

### Endpoint

| Method | Path | Auth | Fungsi |
|---|---|---|---|
| POST | `/api/ingest` | Device key | Dipanggil ESP32 |
| POST | `/api/auth/login` | Publik (rate limit) | Login, set cookie `token` |
| GET | `/api/auth/me` | Cookie | Profil user |
| POST | `/api/auth/logout` | Cookie | Hapus cookie |
| GET | `/api/devices` | Cookie | Daftar perangkat + data terakhir |
| GET | `/api/readings` | Cookie | Data untuk diagram garis dan tabel |
| GET | `/api/stats/status` | Cookie | Data diagram lingkaran |
| GET | `/api/stats/summary` | Cookie | Ringkasan (jumlah, rata-rata, min/maks) |
| GET | `/api/commands` | Cookie | Riwayat perintah |
| POST | `/api/commands` | Cookie (ADMIN) | Buat perintah (reset, ubah interval tidur) |
| PATCH | `/api/commands/:id/cancel` | Cookie (ADMIN) | Batalkan perintah PENDING |

### Kontrak ESP32 <-> server

**Request** (`POST /api/ingest`, header `X-Device-Key: <kunci>`, `Content-Type: application/json`):
```json
{
  "device_id": "esp32c3-01",
  "vcap": 4.02,
  "status": "medium",
  "predicted_v": 4.07,
  "sleep_s": 1800,
  "reset_reason": "poweron",
  "boot_count": 42,
  "wifi_ms": 1450,
  "active_ms": 3100
}
```

**Response** (sengaja kecil dan tanpa envelope):
```json
{ "ok": true, "cmd": "none" }
{ "ok": true, "cmd": "restart" }
{ "ok": true, "cmd": "sleep", "sleep_s": 3600 }
```

Catatan untuk firmware:
- Pakai **`https://` langsung**. Jangan mengandalkan redirect dari port 80, karena itu menambah satu request.
- `reset_reason`, `boot_count`, `wifi_ms`, dan `active_ms` dipakai untuk mendiagnosis boot dan mengukur energi per bangun, jadi tetap dikirim.
- Tidak ada timestamp dari alat. Server memakai `receivedAt`.

### Skema database (ringkas)

| Tabel | Kolom utama |
|---|---|
| `User` | id (uuid), email (unik), passwordHash, role (ADMIN/VIEWER) |
| `Device` | id (uuid), code (unik, mis. `esp32c3-01`), name, transport (WIFI/LORA), keyHash, lastSeenAt |
| `Reading` | id (int autoincrement), deviceId, receivedAt, vcap, status, predictedV, sleepS, resetReason, bootCount, wifiMs, activeMs |
| `Command` | id (uuid), deviceId, type (RESTART/SET_SLEEP), payload (json), status, expiresAt, createdById, createdAt, deliveredAt |

---

## 5. ALUR PENGERJAAN MODULAR BOTTOM-UP (8 LANGKAH)

Alurnya sama seperti blueprint lama, tapi contoh yang dikerjakan adalah modul **ingest, readings, stats, dan commands**.

```
[1. Prisma DB] ➔ [2. Zod DTO] ➔ [3. Types] ➔ [4. Controller] ➔ [5. Module/Route]
                                                                      │
[8. Page Assembly] ◄── [7. UI & Chart] ◄── [6. RTK Query Service] ◄───┘
```

---

### Langkah 1: Skema Database (Prisma)

`iot-supercap-be/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  VIEWER
}

enum Transport {
  WIFI
  LORA
}

enum PowerStatus {
  SAFE
  MEDIUM
  CRITICAL
}

enum CommandType {
  RESTART
  SET_SLEEP
}

enum CommandStatus {
  PENDING
  DELIVERED
  EXPIRED
  CANCELLED
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  role         Role     @default(VIEWER)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Device {
  id         String    @id @default(uuid())
  code       String    @unique // Contoh: esp32c3-01
  name       String
  transport  Transport @default(WIFI)
  keyHash    String // SHA-256 dari kunci perangkat (hex)
  lastSeenAt DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  readings Reading[]
  commands Command[]
}

model Reading {
  id          Int         @id @default(autoincrement())
  deviceId    String
  device      Device      @relation(fields: [deviceId], references: [id], onDelete: Cascade)
  receivedAt  DateTime    @default(now())
  vcap        Float
  status      PowerStatus
  predictedV  Float?
  sleepS      Int?
  resetReason String?
  bootCount   Int?
  wifiMs      Int?
  activeMs    Int?

  @@index([deviceId, receivedAt])
}

model Command {
  id          String        @id @default(uuid())
  deviceId    String
  device      Device        @relation(fields: [deviceId], references: [id], onDelete: Cascade)
  type        CommandType
  payload     Json?
  status      CommandStatus @default(PENDING)
  expiresAt   DateTime
  createdById String?
  createdAt   DateTime      @default(now())
  deliveredAt DateTime?

  @@index([deviceId, status])
}
```

> `Reading.id` memakai `Int`, bukan `BigInt`. `BigInt` tidak bisa diserialisasi oleh `JSON.stringify` dan akan membuat response error.

Migrasi dan seed:
```bash
cd iot-supercap-be
npx prisma migrate dev --name init
npm run db:seed
```
Folder `prisma/migrations` **di-commit ke Git**, karena produksi memakai `migrate deploy`.

`prisma/seed/seed.ts` (membuat admin dan satu perangkat, dan **mencetak kunci perangkat sekali saja**):
```ts
import 'dotenv/config'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) throw new Error('ADMIN_EMAIL dan ADMIN_PASSWORD wajib diisi di .env')

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash: await bcrypt.hash(password, 12), role: 'ADMIN' },
  })

  const code = 'esp32c3-01'
  const existing = await prisma.device.findUnique({ where: { code } })
  if (!existing) {
    const rawKey = crypto.randomBytes(32).toString('hex')
    await prisma.device.create({
      data: {
        code,
        name: 'ESP32-C3 Kebun Cabai',
        keyHash: crypto.createHash('sha256').update(rawKey).digest('hex'),
      },
    })
    console.log('KUNCI PERANGKAT (simpan sekarang, tidak ditampilkan lagi):', rawKey)
  }
}

main().finally(() => prisma.$disconnect())
```
Kunci itu dimasukkan ke firmware sebagai header `X-Device-Key`. Di database hanya hash-nya yang tersimpan.

---

### Langkah 2: DTO & Validasi Zod

`src/modules/ingest/dto/ingest.dto.ts`:
```ts
import { z } from 'zod'

export const IngestSchema = z.object({
  device_id: z.string().min(1).max(64),
  vcap: z.number().min(0).max(6, 'vcap di luar rentang wajar'),
  status: z.enum(['safe', 'medium', 'critical']),
  predicted_v: z.number().min(0).max(6).optional(),
  sleep_s: z.number().int().min(0).max(86400).optional(),
  reset_reason: z.string().max(32).optional(),
  boot_count: z.number().int().min(0).optional(),
  wifi_ms: z.number().int().min(0).max(120000).optional(),
  active_ms: z.number().int().min(0).max(600000).optional(),
})

export type IngestDTO = z.infer<typeof IngestSchema>
```

`src/modules/readings/dto/readings.dto.ts`:
```ts
import { z } from 'zod'

export const QueryReadingsSchema = z.object({
  deviceId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(5000).default(500),
  bucket: z.enum(['raw', 'hour', 'day']).default('raw'),
})

export type QueryReadingsDTO = z.infer<typeof QueryReadingsSchema>
```

`src/modules/commands/dto/commands.dto.ts`:
```ts
import { z } from 'zod'

export const CreateCommandSchema = z
  .object({
    deviceId: z.string().uuid(),
    type: z.enum(['RESTART', 'SET_SLEEP']),
    sleepS: z.number().int().min(60).max(86400).optional(),
    ttlMinutes: z.number().int().min(5).max(1440).default(120),
  })
  .refine((v) => v.type !== 'SET_SLEEP' || v.sleepS !== undefined, {
    message: 'sleepS wajib diisi untuk SET_SLEEP',
    path: ['sleepS'],
  })

export type CreateCommandDTO = z.infer<typeof CreateCommandSchema>
```

`src/modules/auth/dto/auth.dto.ts`:
```ts
import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
```

Alasan `ttlMinutes`: kalau admin menekan Reset malam hari saat alat mati, perintah itu tidak boleh terlaksana berjam-jam kemudian tanpa disadari. Perintah yang lewat masa berlakunya ditandai `EXPIRED`.

---

### Langkah 3: Custom Types (Frontend)

`iot-supercap-fe/src/types/reading.ts`:
```ts
export type PowerStatus = 'SAFE' | 'MEDIUM' | 'CRITICAL'

export interface ApiEnvelope<T> {
  success: boolean
  message?: string
  data: T
}

export interface Reading {
  id: number
  deviceId: string
  receivedAt: string
  vcap: number
  status: PowerStatus
  predictedV: number | null
  sleepS: number | null
  resetReason: string | null
  bootCount: number | null
  wifiMs: number | null
  activeMs: number | null
}

export interface ReadingBucket {
  t: string
  avgVcap: number
  minVcap: number
  maxVcap: number
  n: number
}

export interface ReadingQuery {
  deviceId?: string
  from?: string
  to?: string
  limit?: number
  bucket?: 'raw' | 'hour' | 'day'
}

export interface StatusStat {
  status: PowerStatus
  count: number
}

export interface SummaryStat {
  count: number
  avgVcap: number | null
  minVcap: number | null
  maxVcap: number | null
  avgWifiMs: number | null
  avgActiveMs: number | null
}
```

`src/types/device.ts`:
```ts
import type { Reading } from './reading'

export interface Device {
  id: string
  code: string
  name: string
  transport: 'WIFI' | 'LORA'
  lastSeenAt: string | null
  latestReading: Reading | null
}
```

`src/types/command.ts`:
```ts
export type CommandType = 'RESTART' | 'SET_SLEEP'
export type CommandStatus = 'PENDING' | 'DELIVERED' | 'EXPIRED' | 'CANCELLED'

export interface Command {
  id: string
  deviceId: string
  type: CommandType
  status: CommandStatus
  expiresAt: string
  createdAt: string
  deliveredAt: string | null
}

export interface CreateCommandPayload {
  deviceId: string
  type: CommandType
  sleepS?: number
  ttlMinutes?: number
}
```

`src/types/auth.ts`:
```ts
export interface AuthUser {
  id: string
  email: string
  role: 'ADMIN' | 'VIEWER'
}
```

---

### Langkah 4: Backend Controller & Business Logic

Fondasi yang dipakai semua controller.

`src/config/env.ts`:
```ts
import 'dotenv/config'
import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET minimal 32 karakter'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
})

export const env = EnvSchema.parse(process.env)
```

`src/config/database.ts`:
```ts
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()
```

`src/utils/response.util.ts`:
```ts
import { Response } from 'express'

export class Send {
  static success<T>(res: Response, data: T, status = 200, message?: string) {
    return res.status(status).json({ success: true, message, data })
  }

  static error(res: Response, message: string, status = 400, errors?: unknown) {
    return res.status(status).json({ success: false, message, errors })
  }
}
```

`src/types/express.d.ts`:
```ts
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: 'ADMIN' | 'VIEWER' }
      device?: { id: string; code: string }
    }
  }
}

export {}
```

`src/middleware/auth.middleware.ts`:
```ts
import { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '@/config/env'
import { Send } from '@/utils/response.util'

type Role = 'ADMIN' | 'VIEWER'

export class AuthMiddleware {
  static authenticate(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.token
    if (!token) return Send.error(res, 'Tidak terautentikasi', 401)

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string; role: Role }
      req.user = { id: payload.sub, role: payload.role }
      next()
    } catch {
      return Send.error(res, 'Sesi tidak valid atau kedaluwarsa', 401)
    }
  }

  static requireRole(...roles: Role[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return Send.error(res, 'Akses ditolak', 403)
      }
      next()
    }
  }
}
```

`src/middleware/device.middleware.ts`:
```ts
import crypto from 'node:crypto'
import { NextFunction, Request, Response } from 'express'
import { prisma } from '@/config/database'
import { Send } from '@/utils/response.util'

export class DeviceMiddleware {
  static async authenticate(req: Request, res: Response, next: NextFunction) {
    try {
      const key = req.header('x-device-key')
      const code = typeof req.body?.device_id === 'string' ? req.body.device_id : undefined
      if (!key || !code) return Send.error(res, 'Unauthorized', 401)

      const device = await prisma.device.findUnique({ where: { code } })

      // Bandingkan hash dengan waktu konstan. Kunci perangkat acak 32 byte,
      // jadi SHA-256 sudah cukup dan jauh lebih cepat daripada bcrypt.
      const incoming = crypto.createHash('sha256').update(key).digest()
      const stored = device ? Buffer.from(device.keyHash, 'hex') : Buffer.alloc(32)
      const valid = incoming.length === stored.length && crypto.timingSafeEqual(incoming, stored)

      if (!device || !valid) return Send.error(res, 'Unauthorized', 401)

      req.device = { id: device.id, code: device.code }
      next()
    } catch (error) {
      next(error)
    }
  }
}
```

`src/middleware/rate-limit.ts`:
```ts
import rateLimit from 'express-rate-limit'

export const ingestLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30, // Alat mengirim tiap 15-60 menit, jadi ini sangat longgar
  standardHeaders: true,
  legacyHeaders: false,
})

export const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
})
```

`src/middleware/error.middleware.ts`:
```ts
import { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { Send } from '@/utils/response.util'

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return Send.error(res, 'Validasi gagal', 400, err.issues)
  }

  // Error dari body-parser (JSON rusak, payload terlalu besar, dll.)
  const status = (err as { status?: number })?.status
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return Send.error(res, 'Permintaan tidak valid', status)
  }

  console.error(err)
  return Send.error(res, 'Terjadi kesalahan pada server', 500)
}
```

Controller memakai pola `try { ... } catch (error) { next(error) }`, sehingga semua error mengalir ke `errorHandler` dengan format `Send.error`.

#### Auth

`src/modules/auth/controller/auth.controller.ts`:
```ts
import { NextFunction, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '@/config/database'
import { env } from '@/config/env'
import { Send } from '@/utils/response.util'
import { LoginSchema } from '../dto/auth.dto'

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = LoginSchema.parse(req.body)
      const user = await prisma.user.findUnique({ where: { email } })
      const ok = user ? await bcrypt.compare(password, user.passwordHash) : false
      if (!user || !ok) return Send.error(res, 'Email atau password salah', 401)

      const token = jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: '7d' })
      res.cookie('token', token, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      })
      return Send.success(res, { id: user.id, email: user.email, role: user.role })
    } catch (error) {
      next(error)
    }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { id: true, email: true, role: true },
      })
      if (!user) return Send.error(res, 'User tidak ditemukan', 401)
      return Send.success(res, user)
    } catch (error) {
      next(error)
    }
  }

  static logout(_req: Request, res: Response) {
    res.clearCookie('token', { path: '/' })
    return Send.success(res, null, 200, 'Berhasil keluar')
  }
}
```

#### Ingest (endpoint untuk ESP32)

`src/modules/ingest/controller/ingest.controller.ts`:
```ts
import { NextFunction, Request, Response } from 'express'
import type { Command, PowerStatus } from '@prisma/client'
import { prisma } from '@/config/database'
import { IngestSchema } from '../dto/ingest.dto'

function toDeviceReply(cmd: Command | null) {
  if (!cmd) return { ok: true, cmd: 'none' }
  if (cmd.type === 'RESTART') return { ok: true, cmd: 'restart' }
  if (cmd.type === 'SET_SLEEP') {
    const sleepS = (cmd.payload as { sleepS?: number } | null)?.sleepS ?? 900
    return { ok: true, cmd: 'sleep', sleep_s: sleepS }
  }
  return { ok: true, cmd: 'none' }
}

export class IngestController {
  // Dibuat tipis: validasi, simpan, ambil perintah, balas. Tidak ada kerja berat,
  // karena setiap detik ESP32 menunggu adalah energi supercap.
  static async receive(req: Request, res: Response, next: NextFunction) {
    try {
      const body = IngestSchema.parse(req.body)
      const device = req.device!
      const now = new Date()

      const cmd = await prisma.$transaction(async (tx) => {
        await tx.reading.create({
          data: {
            deviceId: device.id,
            receivedAt: now,
            vcap: body.vcap,
            status: body.status.toUpperCase() as PowerStatus,
            predictedV: body.predicted_v,
            sleepS: body.sleep_s,
            resetReason: body.reset_reason,
            bootCount: body.boot_count,
            wifiMs: body.wifi_ms,
            activeMs: body.active_ms,
          },
        })

        await tx.device.update({ where: { id: device.id }, data: { lastSeenAt: now } })

        // Perintah yang sudah lewat masa berlakunya tidak boleh terkirim
        await tx.command.updateMany({
          where: { deviceId: device.id, status: 'PENDING', expiresAt: { lte: now } },
          data: { status: 'EXPIRED' },
        })

        const pending = await tx.command.findFirst({
          where: { deviceId: device.id, status: 'PENDING' },
          orderBy: { createdAt: 'asc' },
        })

        if (pending) {
          await tx.command.update({
            where: { id: pending.id },
            data: { status: 'DELIVERED', deliveredAt: now },
          })
        }
        return pending
      })

      return res.status(200).json(toDeviceReply(cmd))
    } catch (error) {
      next(error)
    }
  }
}
```

Balasan ingest sengaja **tidak** memakai `Send.success`, supaya payload yang dibaca ESP32 sekecil mungkin.

#### Devices

`src/modules/devices/controller/devices.controller.ts`:
```ts
import { NextFunction, Request, Response } from 'express'
import { prisma } from '@/config/database'
import { Send } from '@/utils/response.util'

export class DevicesController {
  static async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const devices = await prisma.device.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          transport: true,
          lastSeenAt: true,
          readings: { orderBy: { receivedAt: 'desc' }, take: 1 },
        },
        orderBy: { code: 'asc' },
      })

      const data = devices.map(({ readings, ...d }) => ({ ...d, latestReading: readings[0] ?? null }))
      return Send.success(res, data)
    } catch (error) {
      next(error)
    }
  }
}
```
`keyHash` tidak ikut di `select`, jadi tidak pernah keluar ke klien.

#### Readings

`src/modules/readings/controller/readings.controller.ts`:
```ts
import { NextFunction, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '@/config/database'
import { Send } from '@/utils/response.util'
import { QueryReadingsSchema } from '../dto/readings.dto'

export class ReadingsController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { deviceId, from, to, limit, bucket } = QueryReadingsSchema.parse(req.query)

      if (bucket === 'raw') {
        const where: Prisma.ReadingWhereInput = {
          ...(deviceId ? { deviceId } : {}),
          ...((from || to) && {
            receivedAt: { ...(from && { gte: from }), ...(to && { lte: to }) },
          }),
        }
        // Ambil N data TERBARU, lalu urutkan naik untuk grafik
        const rows = await prisma.reading.findMany({
          where,
          orderBy: { receivedAt: 'desc' },
          take: limit,
        })
        return Send.success(res, rows.reverse())
      }

      // Agregasi per jam / per hari, dikelompokkan dalam WIB (UTC+7)
      const end = to ?? new Date()
      const start = from ?? new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000)
      const unit = bucket === 'day' ? Prisma.sql`'day'` : Prisma.sql`'hour'`
      const deviceFilter = deviceId ? Prisma.sql`AND "deviceId" = ${deviceId}` : Prisma.empty

      const rows = await prisma.$queryRaw<
        Array<{ t: Date; avgVcap: number; minVcap: number; maxVcap: number; n: number }>
      >(Prisma.sql`
        SELECT date_trunc(${unit}, "receivedAt" + interval '7 hours') - interval '7 hours' AS t,
               AVG(vcap)::float8 AS "avgVcap",
               MIN(vcap)::float8 AS "minVcap",
               MAX(vcap)::float8 AS "maxVcap",
               COUNT(*)::int AS n
        FROM "Reading"
        WHERE "receivedAt" BETWEEN ${start} AND ${end} ${deviceFilter}
        GROUP BY 1
        ORDER BY 1
      `)
      return Send.success(res, rows)
    } catch (error) {
      next(error)
    }
  }
}
```
Pakai `$queryRaw` dengan `Prisma.sql` (berparameter), **bukan** `$queryRawUnsafe` dengan string interpolasi. `COUNT(*)` di-cast `::int` karena tipe `bigint` bermasalah saat diserialisasi ke JSON.

#### Stats

`src/modules/stats/dto/stats.dto.ts`:
```ts
import { z } from 'zod'

export const QueryStatsSchema = z.object({
  deviceId: z.string().uuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
})
```

`src/modules/stats/controller/stats.controller.ts`:
```ts
import { NextFunction, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '@/config/database'
import { Send } from '@/utils/response.util'
import { QueryStatsSchema } from '../dto/stats.dto'

function buildWhere(q: { deviceId?: string; from?: Date; to?: Date }): Prisma.ReadingWhereInput {
  return {
    ...(q.deviceId ? { deviceId: q.deviceId } : {}),
    ...((q.from || q.to) && {
      receivedAt: { ...(q.from && { gte: q.from }), ...(q.to && { lte: q.to }) },
    }),
  }
}

export class StatsController {
  // Data diagram lingkaran: proporsi Safe / Medium / Critical
  static async status(req: Request, res: Response, next: NextFunction) {
    try {
      const where = buildWhere(QueryStatsSchema.parse(req.query))
      const rows = await prisma.reading.groupBy({ by: ['status'], where, _count: { _all: true } })
      return Send.success(res, rows.map((r) => ({ status: r.status, count: r._count._all })))
    } catch (error) {
      next(error)
    }
  }

  // Ringkasan untuk kartu statistik dan metrik penelitian
  static async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const where = buildWhere(QueryStatsSchema.parse(req.query))
      const agg = await prisma.reading.aggregate({
        where,
        _count: { _all: true },
        _avg: { vcap: true, wifiMs: true, activeMs: true },
        _min: { vcap: true },
        _max: { vcap: true },
      })
      return Send.success(res, {
        count: agg._count._all,
        avgVcap: agg._avg.vcap,
        minVcap: agg._min.vcap,
        maxVcap: agg._max.vcap,
        avgWifiMs: agg._avg.wifiMs,
        avgActiveMs: agg._avg.activeMs,
      })
    } catch (error) {
      next(error)
    }
  }
}
```

#### Commands (antrean perintah reset)

`src/modules/commands/controller/commands.controller.ts`:
```ts
import { NextFunction, Request, Response } from 'express'
import { prisma } from '@/config/database'
import { Send } from '@/utils/response.util'
import { CreateCommandSchema } from '../dto/commands.dto'

export class CommandsController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : undefined

      await prisma.command.updateMany({
        where: { status: 'PENDING', expiresAt: { lte: new Date() } },
        data: { status: 'EXPIRED' },
      })

      const rows = await prisma.command.findMany({
        where: deviceId ? { deviceId } : {},
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      return Send.success(res, rows)
    } catch (error) {
      next(error)
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = CreateCommandSchema.parse(req.body)

      const device = await prisma.device.findUnique({ where: { id: dto.deviceId }, select: { id: true } })
      if (!device) return Send.error(res, 'Perangkat tidak ditemukan', 404)

      const expiresAt = new Date(Date.now() + dto.ttlMinutes * 60_000)

      const command = await prisma.$transaction(async (tx) => {
        // Hanya satu perintah PENDING per tipe per perangkat
        await tx.command.updateMany({
          where: { deviceId: dto.deviceId, type: dto.type, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        })
        return tx.command.create({
          data: {
            deviceId: dto.deviceId,
            type: dto.type,
            payload: dto.sleepS ? { sleepS: dto.sleepS } : undefined,
            expiresAt,
            createdById: req.user!.id,
          },
        })
      })

      return Send.success(res, command, 201, 'Perintah diantrekan, dijalankan saat alat bangun berikutnya')
    } catch (error) {
      next(error)
    }
  }

  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await prisma.command.updateMany({
        where: { id: req.params.id, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      })
      if (result.count === 0) return Send.error(res, 'Perintah tidak ditemukan atau sudah diproses', 404)
      return Send.success(res, null, 200, 'Perintah dibatalkan')
    } catch (error) {
      next(error)
    }
  }
}
```

---

### Langkah 5: Backend Module & Router

Setiap modul membungkus rute dan middleware-nya.

`src/modules/ingest/ingest.module.ts`:
```ts
import { Router } from 'express'
import { IngestController } from './controller/ingest.controller'
import { DeviceMiddleware } from '@/middleware/device.middleware'
import { ingestLimiter } from '@/middleware/rate-limit'

const router = Router()
router.post('/', ingestLimiter, DeviceMiddleware.authenticate, IngestController.receive)

export default router
```

`src/modules/auth/auth.module.ts`:
```ts
import { Router } from 'express'
import { AuthController } from './controller/auth.controller'
import { AuthMiddleware } from '@/middleware/auth.middleware'
import { loginLimiter } from '@/middleware/rate-limit'

const router = Router()
router.post('/login', loginLimiter, AuthController.login)
router.get('/me', AuthMiddleware.authenticate, AuthController.me)
router.post('/logout', AuthController.logout)

export default router
```

`src/modules/devices/devices.module.ts`:
```ts
import { Router } from 'express'
import { DevicesController } from './controller/devices.controller'
import { AuthMiddleware } from '@/middleware/auth.middleware'

const router = Router()
router.use(AuthMiddleware.authenticate)
router.get('/', DevicesController.getAll)

export default router
```

`src/modules/readings/readings.module.ts`:
```ts
import { Router } from 'express'
import { ReadingsController } from './controller/readings.controller'
import { AuthMiddleware } from '@/middleware/auth.middleware'

const router = Router()
router.use(AuthMiddleware.authenticate)
router.get('/', ReadingsController.getAll)

export default router
```

`src/modules/stats/stats.module.ts`:
```ts
import { Router } from 'express'
import { StatsController } from './controller/stats.controller'
import { AuthMiddleware } from '@/middleware/auth.middleware'

const router = Router()
router.use(AuthMiddleware.authenticate)
router.get('/status', StatsController.status)
router.get('/summary', StatsController.summary)

export default router
```

`src/modules/commands/commands.module.ts`:
```ts
import { Router } from 'express'
import { CommandsController } from './controller/commands.controller'
import { AuthMiddleware } from '@/middleware/auth.middleware'

const router = Router()
router.use(AuthMiddleware.authenticate)
router.get('/', CommandsController.getAll)
router.post('/', AuthMiddleware.requireRole('ADMIN'), CommandsController.create)
router.patch('/:id/cancel', AuthMiddleware.requireRole('ADMIN'), CommandsController.cancel)

export default router
```

`src/app.ts`:
```ts
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { env } from '@/config/env'
import { errorHandler } from '@/middleware/error.middleware'
import authModule from '@/modules/auth/auth.module'
import devicesModule from '@/modules/devices/devices.module'
import ingestModule from '@/modules/ingest/ingest.module'
import readingsModule from '@/modules/readings/readings.module'
import statsModule from '@/modules/stats/stats.module'
import commandsModule from '@/modules/commands/commands.module'

const app = express()

app.set('trust proxy', 1) // Di belakang Caddy: rate limit membaca IP asli
app.use(helmet())
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))
app.use(express.json({ limit: '10kb' }))
app.use(cookieParser())

app.get('/api/health', (_req, res) => res.json({ ok: true }))
app.use('/api/auth', authModule)
app.use('/api/devices', devicesModule)
app.use('/api/ingest', ingestModule)
app.use('/api/readings', readingsModule)
app.use('/api/stats', statsModule)
app.use('/api/commands', commandsModule)

app.use(errorHandler) // Selalu paling akhir

export default app
```

`src/server.ts`:
```ts
import app from './app'
import { env } from '@/config/env'

app.listen(env.PORT, () => {
  console.log(`API berjalan di port ${env.PORT}`)
})
```

#### Uji backend dengan curl sebelum lanjut ke frontend

```bash
cd iot-supercap-be && npm run dev
```

```bash
# 1. Simulasi ESP32 (ganti KUNCI dengan kunci dari seed)
curl -X POST http://localhost:3001/api/ingest \
  -H "X-Device-Key: KUNCI" -H "Content-Type: application/json" \
  -d '{"device_id":"esp32c3-01","vcap":4.02,"status":"medium","predicted_v":4.07,"sleep_s":1800,"reset_reason":"poweron","boot_count":1,"wifi_ms":1450,"active_ms":3100}'
# Harapan: {"ok":true,"cmd":"none"}

# 2. Login admin (simpan cookie)
curl -c cookies.txt -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" -d '{"email":"EMAIL_ADMIN","password":"PASSWORD_ADMIN"}'

# 3. Ambil data dan statistik
curl -b cookies.txt http://localhost:3001/api/readings
curl -b cookies.txt http://localhost:3001/api/stats/status

# 4. Antrekan reset, lalu simulasikan ESP32 bangun lagi
curl -b cookies.txt -X POST http://localhost:3001/api/commands \
  -H "Content-Type: application/json" -d '{"deviceId":"ID_DEVICE","type":"RESTART"}'
# Ulangi perintah nomor 1. Harapan: {"ok":true,"cmd":"restart"}
# Ulangi sekali lagi. Harapan: {"ok":true,"cmd":"none"} (perintah sudah DELIVERED)
```

`ID_DEVICE` didapat dari `GET /api/devices`.

---

### Langkah 6: Frontend API Service (RTK Query) & Redux Store

Satu `createApi` saja. Setiap fitur menambah endpoint lewat `injectEndpoints`.

`src/services/api.ts`:
```ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api',
    credentials: 'include', // Kirim cookie httpOnly
  }),
  tagTypes: ['Me', 'Device', 'Reading', 'Stats', 'Command'],
  endpoints: () => ({}),
})
```

`src/services/auth.ts`:
```ts
import { api } from './api'
import type { ApiEnvelope } from '@/types/reading'
import type { AuthUser } from '@/types/auth'

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query<ApiEnvelope<AuthUser>, void>({
      query: () => '/auth/me',
      providesTags: ['Me'],
    }),
    login: builder.mutation<ApiEnvelope<AuthUser>, { email: string; password: string }>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      invalidatesTags: ['Me'],
    }),
    logout: builder.mutation<ApiEnvelope<null>, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      invalidatesTags: ['Me'],
    }),
  }),
})

export const { useGetMeQuery, useLoginMutation, useLogoutMutation } = authApi
```

`src/services/device.ts`:
```ts
import { api } from './api'
import type { ApiEnvelope } from '@/types/reading'
import type { Device } from '@/types/device'

export const deviceApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getDevices: builder.query<ApiEnvelope<Device[]>, void>({
      query: () => '/devices',
      providesTags: [{ type: 'Device', id: 'LIST' }],
    }),
  }),
})

export const { useGetDevicesQuery } = deviceApi
```

`src/services/reading.ts`:
```ts
import { api } from './api'
import type { ApiEnvelope, Reading, ReadingBucket, ReadingQuery, StatusStat, SummaryStat } from '@/types/reading'

interface StatsQuery {
  deviceId?: string
  from?: string
  to?: string
}

export const readingApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getReadings: builder.query<ApiEnvelope<Reading[]>, ReadingQuery>({
      query: (params) => ({ url: '/readings', params }),
      providesTags: [{ type: 'Reading', id: 'LIST' }],
    }),
    getReadingBuckets: builder.query<ApiEnvelope<ReadingBucket[]>, ReadingQuery>({
      query: (params) => ({ url: '/readings', params }),
      providesTags: [{ type: 'Reading', id: 'BUCKET' }],
    }),
    getStatusStats: builder.query<ApiEnvelope<StatusStat[]>, StatsQuery>({
      query: (params) => ({ url: '/stats/status', params }),
      providesTags: [{ type: 'Stats', id: 'STATUS' }],
    }),
    getSummary: builder.query<ApiEnvelope<SummaryStat>, StatsQuery>({
      query: (params) => ({ url: '/stats/summary', params }),
      providesTags: [{ type: 'Stats', id: 'SUMMARY' }],
    }),
  }),
})

export const {
  useGetReadingsQuery,
  useGetReadingBucketsQuery,
  useGetStatusStatsQuery,
  useGetSummaryQuery,
} = readingApi
```

Data masuk dari alat, bukan dari mutasi di browser, jadi tidak ada `invalidatesTags` untuk `Reading`. Penyegaran data dilakukan dengan **polling** (`pollingInterval`) di halaman.

`src/services/command.ts`:
```ts
import { api } from './api'
import type { ApiEnvelope } from '@/types/reading'
import type { Command, CreateCommandPayload } from '@/types/command'

export const commandApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getCommands: builder.query<ApiEnvelope<Command[]>, { deviceId?: string }>({
      query: (params) => ({ url: '/commands', params }),
      providesTags: [{ type: 'Command', id: 'LIST' }],
    }),
    createCommand: builder.mutation<ApiEnvelope<Command>, CreateCommandPayload>({
      query: (body) => ({ url: '/commands', method: 'POST', body }),
      invalidatesTags: [{ type: 'Command', id: 'LIST' }],
    }),
  }),
})

export const { useGetCommandsQuery, useCreateCommandMutation } = commandApi
```

`src/store/index.ts`:
```ts
import { configureStore } from '@reduxjs/toolkit'
import { api } from '@/services/api'

export const store = configureStore({
  reducer: { [api.reducerPath]: api.reducer },
  middleware: (getDefault) => getDefault().concat(api.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
```

`src/components/providers/StoreProvider.tsx`:
```tsx
'use client'

import { Provider } from 'react-redux'
import { store } from '@/store'

export function StoreProvider({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>
}
```

`src/app/layout.tsx` (ringkas, tambahkan provider dan toaster):
```tsx
import { Inter } from 'next/font/google'
import { StoreProvider } from '@/components/providers/StoreProvider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata = { title: 'IoT Supercap Monitoring' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="font-sans bg-slate-50 text-slate-800 antialiased">
        <StoreProvider>
          {children}
          <Toaster richColors position="top-right" />
        </StoreProvider>
      </body>
    </html>
  )
}
```

---

### Langkah 7: Komponen UI, Grafik, dan Dialog

#### Utilitas

`src/utils/format.ts` (semua waktu ditampilkan dalam WIB):
```ts
const TZ = 'Asia/Jakarta'

const fmtDateTime = new Intl.DateTimeFormat('id-ID', {
  timeZone: TZ, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
})
const fmtDate = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' })
const fmtTime = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })

export const formatDateTime = (v: string | number | Date) => fmtDateTime.format(new Date(v))
export const formatDateOnly = (v: string | number | Date) => fmtDate.format(new Date(v))
export const formatTimeOnly = (v: string | number | Date) => fmtTime.format(new Date(v))

export const formatVolt = (v: number | null | undefined) => (v == null ? '-' : `${v.toFixed(2)} V`)

export const formatMs = (ms: number | null | undefined) => {
  if (ms == null) return '-'
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} dtk` : `${Math.round(ms)} ms`
}
```

`src/utils/device-state.ts`:
```ts
// Alat batteryless mati tiap malam. "Tidak aktif" itu normal, bukan error.
export function deriveDeviceState(lastSeenAt: string | null, lastSleepS: number | null, now = Date.now()) {
  if (!lastSeenAt) return { label: 'Belum pernah terhubung', tone: 'slate' as const }
  const age = now - new Date(lastSeenAt).getTime()
  const expectedMs = (lastSleepS ?? 3600) * 1000
  if (age <= expectedMs * 1.5 + 5 * 60_000) return { label: 'Aktif', tone: 'emerald' as const }
  return { label: 'Tidak aktif (tidur atau daya habis)', tone: 'amber' as const }
}
```

#### Diagram garis: tegangan terhadap waktu

`src/modules/dashboard/components/VoltageLineChart.tsx`:
```tsx
'use client'

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatDateTime } from '@/utils/format'
import type { Reading } from '@/types/reading'

type Point = { t: number; vcap: number | null }
const GAP_MS = 2 * 60 * 60 * 1000 // Celah > 2 jam dianggap alat mati (malam), garis diputus

function withGaps(readings: Reading[]): Point[] {
  const out: Point[] = []
  readings.forEach((r, i) => {
    const t = new Date(r.receivedAt).getTime()
    const prev = out[out.length - 1]
    if (i > 0 && prev && t - prev.t > GAP_MS) out.push({ t: prev.t + 1, vcap: null })
    out.push({ t, vcap: r.vcap })
  })
  return out
}

export default function VoltageLineChart({ readings }: { readings: Reading[] }) {
  if (readings.length === 0) {
    return <div className="h-72 flex items-center justify-center text-xs text-slate-400">Belum ada data.</div>
  }
  const data = withGaps(readings)

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v) => formatDateTime(Number(v))}
            tick={{ fontSize: 11 }}
          />
          <YAxis domain={[3.4, 4.4]} tick={{ fontSize: 11 }} width={40} />
          <Tooltip
            labelFormatter={(v) => formatDateTime(Number(v))}
            formatter={(v) => `${Number(v).toFixed(2)} V`}
          />
          <ReferenceLine
            y={3.8}
            stroke="#ef4444"
            strokeDasharray="4 4"
            label={{ value: 'Batas WiFi 3.80 V', fontSize: 10, fill: '#ef4444', position: 'insideBottomRight' }}
          />
          <Line type="monotone" dataKey="vcap" name="Vcap" stroke="#2563eb" strokeWidth={2} dot={false} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```
`withGaps` membuat grafik memperlihatkan celah malam hari, bukan garis lurus yang menyesatkan.

#### Diagram lingkaran: proporsi status

`src/modules/dashboard/components/StatusPieChart.tsx`:
```tsx
'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { PowerStatus, StatusStat } from '@/types/reading'

const COLORS: Record<PowerStatus, string> = { SAFE: '#10b981', MEDIUM: '#f59e0b', CRITICAL: '#ef4444' }
const LABELS: Record<PowerStatus, string> = { SAFE: 'Safe', MEDIUM: 'Medium', CRITICAL: 'Critical' }

export default function StatusPieChart({ data }: { data: StatusStat[] }) {
  const total = data.reduce((acc, d) => acc + d.count, 0)
  if (total === 0) {
    return <div className="h-64 flex items-center justify-center text-xs text-slate-400">Belum ada data.</div>
  }

  const chartData = data.map((d) => ({ name: LABELS[d.status], value: d.count, status: d.status }))

  return (
    <div className="flex flex-col xl:flex-row items-center justify-center gap-4">
      <div className="h-64 w-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
              {chartData.map((d) => (
                <Cell key={d.status} fill={COLORS[d.status]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-2 text-xs">
        {chartData.map((d) => (
          <li key={d.status} className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[d.status] }} />
            <span className="font-semibold text-slate-700">{d.name}</span>
            <span className="text-slate-500">
              {d.value} ({((d.value / total) * 100).toFixed(1)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

#### Kartu status perangkat

`src/modules/dashboard/components/DeviceStatusCards.tsx`:
```tsx
'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { deriveDeviceState } from '@/utils/device-state'
import { formatDateTime, formatVolt } from '@/utils/format'
import type { Device } from '@/types/device'

const TONE = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
} as const

export default function DeviceStatusCards({ device }: { device: Device | undefined }) {
  const latest = device?.latestReading ?? null
  const state = deriveDeviceState(device?.lastSeenAt ?? null, latest?.sleepS ?? null)

  const items = [
    { label: 'Tegangan terakhir', value: formatVolt(latest?.vcap) },
    { label: 'Status penjadwalan', value: latest?.status ?? '-' },
    { label: 'Terakhir terlihat', value: device?.lastSeenAt ? formatDateTime(device.lastSeenAt) : '-' },
    { label: 'Boot ke / alasan reset', value: latest ? `${latest.bootCount ?? '-'} / ${latest.resetReason ?? '-'}` : '-' },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((it) => (
        <Card key={it.label} className="p-4 rounded-2xl border-slate-200 shadow-xs">
          <p className="text-[11px] font-normal text-slate-400">{it.label}</p>
          <p className="text-sm sm:text-base font-semibold text-slate-900 mt-1">{it.value}</p>
        </Card>
      ))}
      <div className="sm:col-span-2 lg:col-span-4">
        <Badge variant="outline" className={`text-[10px] ${TONE[state.tone]}`}>
          {state.label}
        </Badge>
      </div>
    </div>
  )
}
```

#### Tabel data terbaru

`src/modules/dashboard/components/ReadingsTable.tsx`:
```tsx
'use client'

import { Badge } from '@/components/ui/badge'
import { formatDateTime, formatMs, formatVolt } from '@/utils/format'
import type { Reading } from '@/types/reading'

const BADGE = {
  SAFE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  CRITICAL: 'bg-red-50 text-red-700 border-red-200',
} as const

export default function ReadingsTable({ readings }: { readings: Reading[] }) {
  const rows = [...readings].reverse().slice(0, 20) // 20 data terbaru

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase">
            <th className="p-3.5 pl-5">Waktu</th>
            <th className="p-3.5">Vcap</th>
            <th className="p-3.5 text-center">Status</th>
            <th className="p-3.5">Prediksi</th>
            <th className="p-3.5">Tidur</th>
            <th className="p-3.5">Reset</th>
            <th className="p-3.5">WiFi</th>
            <th className="p-3.5 pr-5">Aktif</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} className="p-8 text-center text-slate-400">Belum ada data.</td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.id} className="hover:bg-blue-50/60 transition-colors text-slate-700 font-medium">
                <td className="p-3.5 pl-5">{formatDateTime(r.receivedAt)}</td>
                <td className="p-3.5 font-semibold">{formatVolt(r.vcap)}</td>
                <td className="p-3.5 text-center">
                  <Badge variant="outline" className={`text-[10px] ${BADGE[r.status]}`}>{r.status}</Badge>
                </td>
                <td className="p-3.5">{formatVolt(r.predictedV)}</td>
                <td className="p-3.5">{r.sleepS != null ? `${Math.round(r.sleepS / 60)} mnt` : '-'}</td>
                <td className="p-3.5">{r.resetReason ?? '-'}</td>
                <td className="p-3.5">{formatMs(r.wifiMs)}</td>
                <td className="p-3.5 pr-5">{formatMs(r.activeMs)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
```

#### Dialog konfirmasi reset

`src/modules/dashboard/components/ResetDeviceDialog.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { useCreateCommandMutation } from '@/services/command'

const TTL_MINUTES = 120

export default function ResetDeviceDialog({ deviceId, deviceName }: { deviceId: string; deviceName: string }) {
  const [open, setOpen] = useState(false)
  const [createCommand, { isLoading }] = useCreateCommandMutation()

  const handleConfirm = async () => {
    try {
      await createCommand({ deviceId, type: 'RESTART', ttlMinutes: TTL_MINUTES }).unwrap()
      toast.success('Perintah reset diantrekan. Dijalankan saat alat bangun berikutnya.')
      setOpen(false)
    } catch {
      toast.error('Gagal mengantrekan perintah reset.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-4 h-10 rounded-xl gap-2 cursor-pointer">
          <RotateCcw className="w-4 h-4" />
          Reset Perangkat
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] sm:max-w-md font-sans bg-white rounded-2xl border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900">Reset {deviceName}?</DialogTitle>
          <DialogDescription className="text-xs text-slate-500 leading-relaxed">
            Perintah disimpan di server dan dijalankan saat alat bangun berikutnya (15-60 menit). Jika alat tidak
            terhubung dalam {TTL_MINUTES} menit, perintah kedaluwarsa dan tidak dijalankan. Reset tidak bisa
            menghidupkan alat yang sedang mati.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
          <Button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs px-5 h-9 rounded-xl cursor-pointer"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-semibold text-xs px-5 h-9 rounded-xl cursor-pointer"
          >
            {isLoading ? 'Mengantrekan...' : 'Ya, Antrekan Reset'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

---

### Langkah 8: Assembly Halaman & PageGuard

`src/components/auth/PageGuard.tsx`:
```tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGetMeQuery } from '@/services/auth'

export function PageGuard({ children, role }: { children: React.ReactNode; role?: 'ADMIN' }) {
  const router = useRouter()
  const { data, isLoading, isError } = useGetMeQuery()

  useEffect(() => {
    if (isError) router.replace('/login')
  }, [isError, router])

  if (isLoading) return <div className="p-8 text-xs text-slate-400">Memuat...</div>
  if (!data) return null
  if (role && data.data.role !== role) return <div className="p-8 text-xs text-red-600">Akses ditolak.</div>

  return <>{children}</>
}
```

`src/modules/dashboard/DashboardPage.tsx`:
```tsx
'use client'

import { useMemo, useState } from 'react'
import { Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useGetMeQuery, useLogoutMutation } from '@/services/auth'
import { useGetDevicesQuery } from '@/services/device'
import { useGetReadingsQuery, useGetStatusStatsQuery } from '@/services/reading'
import DeviceStatusCards from './components/DeviceStatusCards'
import VoltageLineChart from './components/VoltageLineChart'
import StatusPieChart from './components/StatusPieChart'
import ReadingsTable from './components/ReadingsTable'
import ResetDeviceDialog from './components/ResetDeviceDialog'

const RANGES = [
  { label: '1 hari', days: 1 },
  { label: '3 hari', days: 3 },
  { label: '7 hari', days: 7 },
]

export default function DashboardPage() {
  const [rangeDays, setRangeDays] = useState(3)
  const { data: me } = useGetMeQuery()
  const [logout] = useLogoutMutation()

  const { data: devicesRes } = useGetDevicesQuery(undefined, { pollingInterval: 60_000 })
  const device = devicesRes?.data?.[0]

  const from = useMemo(() => new Date(Date.now() - rangeDays * 86_400_000).toISOString(), [rangeDays])

  const { data: readingsRes } = useGetReadingsQuery(
    { deviceId: device?.id, from, limit: 1000 },
    { skip: !device, pollingInterval: 60_000 },
  )
  const { data: statusRes } = useGetStatusStatsQuery(
    { deviceId: device?.id, from },
    { skip: !device, pollingInterval: 60_000 },
  )

  const readings = readingsRes?.data ?? []

  return (
    <div className="p-4 sm:p-6 space-y-6 font-sans">
      {/* Header dengan Signature Icon Wrapper */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-linear-to-br from-red-600 to-red-900 text-white rounded-2xl shadow-md shadow-red-500/20 flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">Monitoring IoT Supercap</h1>
            <p className="text-xs sm:text-sm text-slate-500">
              {device ? `${device.name} (${device.code})` : 'Memuat perangkat...'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {RANGES.map((r) => (
            <Button
              key={r.days}
              onClick={() => setRangeDays(r.days)}
              className={`h-9 px-4 text-xs rounded-xl cursor-pointer ${
                rangeDays === r.days ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {r.label}
            </Button>
          ))}
          {me?.data.role === 'ADMIN' && device && <ResetDeviceDialog deviceId={device.id} deviceName={device.name} />}
          <Button
            onClick={() => logout()}
            className="h-9 px-4 text-xs rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
          >
            Keluar
          </Button>
        </div>
      </div>

      <DeviceStatusCards device={device} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-3">Tegangan Supercap</h2>
          <VoltageLineChart readings={readings} />
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 mb-3">Proporsi Status</h2>
          <StatusPieChart data={statusRes?.data ?? []} />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-slate-900">Data Terbaru</h2>
        <ReadingsTable readings={readings} />
      </div>
    </div>
  )
}
```

`src/app/page.tsx`:
```tsx
'use client'

import { PageGuard } from '@/components/auth/PageGuard'
import DashboardPage from '@/modules/dashboard/DashboardPage'

export default function Page() {
  return (
    <PageGuard>
      <DashboardPage />
    </PageGuard>
  )
}
```

`src/app/login/page.tsx`:
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useLoginMutation } from '@/services/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [login, { isLoading }] = useLoginMutation()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password }).unwrap()
      router.replace('/')
    } catch {
      toast.error('Email atau password salah.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h1 className="text-lg font-bold text-slate-900">Masuk</h1>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="h-9 text-xs rounded-xl" required />
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="h-9 text-xs rounded-xl" required />
        <Button type="submit" disabled={isLoading} className="w-full h-9 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer">
          {isLoading ? 'Memproses...' : 'Masuk'}
        </Button>
      </form>
    </div>
  )
}
```

Uji: jalankan `npm run dev` di frontend (port 3000), login dengan akun seed, dan pastikan data dari curl tadi muncul di grafik, diagram lingkaran, dan tabel. Tekan **Reset Perangkat**, lalu jalankan curl `ingest` sekali lagi. Balasannya harus `{"ok":true,"cmd":"restart"}`.

---

## 6. STANDAR TAMPILAN & LAYOUTING UI/UX

Mengikuti gaya blueprint ERP-mu, disesuaikan untuk dashboard (kartu dan grafik, bukan tabel CRUD).

### A. Tipografi

| Elemen | Kelas |
|---|---|
| Judul halaman | `text-lg sm:text-xl font-bold tracking-tight text-slate-900` |
| Judul seksi/kartu | `text-base sm:text-lg font-bold text-slate-900` |
| Nilai kartu statistik | `text-sm sm:text-base font-semibold text-slate-900` |
| Label kecil | `text-[11px] font-normal text-slate-400` |
| Isi tabel | `text-xs font-medium text-slate-700` |
| Header tabel | `text-xs font-semibold uppercase text-slate-700` |
| Badge | `text-[10px]` |

### B. Icon wrapper (opsional, identitas visual blueprint lama)
```tsx
<div className="p-3 bg-linear-to-br from-red-600 to-red-900 text-white rounded-2xl shadow-md shadow-red-500/20 flex items-center justify-center shrink-0">
  <Activity className="w-6 h-6 text-white" />
</div>
```
Boleh diganti warnanya kalau aplikasi ini ingin punya identitas sendiri.

### C. Kartu
`rounded-2xl border border-slate-200 bg-white shadow-xs` dengan `p-4` (kartu statistik) atau `p-5` (kartu grafik).

### D. Dialog
- **Dialog konfirmasi kecil** (Reset): `w-[95vw] sm:max-w-md rounded-2xl`, tombol Batal abu-abu dan tombol aksi merah (`bg-red-600`) karena aksinya merusak.
- **Dialog besar 85vh dua kolom**: hanya untuk form panjang. Dashboard ini belum membutuhkannya.

### E. Responsif
- Kartu statistik: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
- Baris grafik: `grid-cols-1 xl:grid-cols-3`, grafik garis `xl:col-span-2`
- Header: `flex-col xl:flex-row`
- Tabel: pembungkus `overflow-x-auto`

### F. Warna grafik
| Elemen | Warna |
|---|---|
| Safe | `#10b981` |
| Medium | `#f59e0b` |
| Critical | `#ef4444` |
| Garis tegangan | `#2563eb` |
| Garis batas WiFi (3.80 V) | `#ef4444` putus-putus |

### G. Catatan Tailwind v4
Kelas `bg-linear-to-br` dan `shadow-xs` adalah sintaks v4. Kalau proyekmu ternyata v3: `bg-gradient-to-br` dan `shadow-sm`.

### H. Polesan grafik yang disarankan
- Tentukan tick sumbu Y supaya angkanya rapi: `<YAxis domain={[3.4, 4.4]} ticks={[3.4, 3.6, 3.8, 4.0, 4.2, 4.4]} />`
- Beri `whitespace-nowrap` pada teks legenda diagram lingkaran supaya persentase tidak terpotong ke baris baru.
- Kalau data mencakup beberapa hari, format label sumbu X yang memuat tanggal dan jam sudah cukup.

---

## 7. BEST PRACTICES INTEGRITAS DATA IoT

Pengganti Bagian 6 blueprint lama (aturan transaksional ERP).

1. **Waktu.** Server mencatat `receivedAt` dalam UTC. UI menampilkan WIB (`Asia/Jakarta`). Agregasi harian di backend digeser +7 jam (sudah ada di query `bucket`).
2. **Validasi rentang.** Zod menolak nilai tak wajar (`vcap` di luar 0-6 V, durasi negatif). Data sensor rusak lebih baik ditolak daripada tersimpan.
3. **Duplikat dan retry.** Kalau ESP32 timeout lalu mengirim ulang, server bisa menyimpan dua baris. Jangan memakai constraint unik pada `bootCount`, karena nilainya kembali ke 0 setiap daya habis. Kalau duplikat mengganggu, tolak data dengan `deviceId` dan `bootCount` sama dalam jendela 2 menit.
4. **Ingest harus tipis.** Satu transaksi, tanpa kerja berat, balasan kecil. Setiap detik ESP32 menunggu adalah energi supercap.
5. **Perintah.**
   - Setiap perintah punya masa berlaku (`ttlMinutes`) dan ditandai `EXPIRED` kalau lewat.
   - Hanya satu perintah `PENDING` per tipe per perangkat.
   - `createdById` mencatat siapa yang membuatnya.
6. **Raw SQL.** Pakai `Prisma.sql` (berparameter), bukan `$queryRawUnsafe` dengan string interpolasi. Cast `COUNT(*)::int` agar tidak menghasilkan `BigInt`. Satu statement per query.
7. **Serialisasi.** Jangan pakai `BigInt` untuk kolom yang dikirim ke JSON.
8. **Keamanan.**
   - Kunci perangkat disimpan sebagai hash SHA-256, dibandingkan dengan `timingSafeEqual`.
   - Rate limit di `/ingest` dan `/auth/login`, dan `trust proxy` aktif di belakang Caddy.
   - Cookie `httpOnly`, `secure` di produksi, `sameSite: lax`.
   - `.env` tidak pernah di-commit, dan hanya port 80/443 yang terbuka ke internet.
9. **Backup.** Data ini adalah data penelitianmu. Jadwalkan `pg_dump` harian (lihat Bagian 8).
10. **"Tidak aktif" bukan error.** Alat batteryless mati tiap malam. UI menampilkannya netral (amber), bukan merah.
11. **Metrik untuk penelitian.** `wifi_ms` dan `active_ms` menunjukkan durasi radio dan durasi aktif per bangun, yang bisa dikonversi jadi energi per bangun. `GET /stats/summary` memberi rata-ratanya. Rasio data terkirim bisa dihitung dari jumlah baris per hari dibanding jumlah bangun yang diharapkan.

---

## 8. DEPLOYMENT KE VPS

### A. Persiapan VPS
1. Arahkan **A record** subdomain (mis. `iot.domainmu.com`) ke IP VPS.
2. Buat user non-root, login SSH dengan key, dan nonaktifkan login password.
3. Firewall:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```
4. Pasang Docker dan Docker Compose plugin.

> Docker mempublikasikan port langsung lewat iptables dan bisa melewati `ufw`. Karena itu **hanya `caddy` yang boleh memakai `ports:`**. Database, API, dan web tidak dipublikasikan.

### B. Pindahkan `tsx` ke dependencies (untuk seed di produksi)
Container produksi memasang dependensi tanpa devDependencies. Agar `prisma db seed` bisa jalan di sana:
```bash
cd iot-supercap-be
npm install tsx   # memindahkannya dari devDependencies ke dependencies
```

### C. `iot-supercap-be/Dockerfile`
```dockerfile
FROM node:22-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY --from=build /app/dist ./dist
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
```
Migrasi dijalankan otomatis setiap container start. Karena itu folder `prisma/migrations` harus sudah di-commit.

### D. `iot-supercap-fe/Dockerfile`
```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```
`NEXT_PUBLIC_*` **tertanam saat build**, bukan saat container berjalan. Itu sebabnya nilainya dikirim lewat `ARG`.

### E. `deploy/docker-compose.prod.yml`
```yaml
services:
  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build: ../iot-supercap-be
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?schema=public
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: https://${DOMAIN}
      ADMIN_EMAIL: ${ADMIN_EMAIL}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
    depends_on:
      db:
        condition: service_healthy

  web:
    build:
      context: ../iot-supercap-fe
      args:
        NEXT_PUBLIC_API_URL: /api
    restart: unless-stopped

  caddy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    environment:
      DOMAIN: ${DOMAIN}
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - api
      - web

volumes:
  pgdata:
  caddy_data:
  caddy_config:
```

### F. `deploy/Caddyfile`
```
{$DOMAIN} {
  handle /api/* {
    reverse_proxy api:3001
  }
  handle {
    reverse_proxy web:3000
  }
}
```
Caddy mengurus sertifikat HTTPS otomatis. Kalau di firmware kamu memakai `setCACert()` (menyematkan sertifikat root), paksa Caddy memakai Let's Encrypt supaya akar sertifikatnya konsisten (ISRG Root X1), dengan menambahkan blok global di paling atas Caddyfile:
```
{
  acme_ca https://acme-v02.api.letsencrypt.org/directory
}
```

### G. `deploy/.env` (di VPS, tidak di-commit)
```
DOMAIN=iot.domainmu.com
POSTGRES_USER=iot
POSTGRES_PASSWORD=<acak-panjang>
POSTGRES_DB=iot
JWT_SECRET=<acak-minimal-32-karakter>
ADMIN_EMAIL=<email-admin>
ADMIN_PASSWORD=<password-kuat>
```

### H. Menjalankan
```bash
git clone <url-repo> iot-supercap && cd iot-supercap
nano deploy/.env   # isi sesuai bagian G
docker compose --env-file deploy/.env -f deploy/docker-compose.prod.yml up -d --build

# Sekali saja: buat admin dan perangkat, lalu CATAT kunci perangkat yang tercetak
docker compose --env-file deploy/.env -f deploy/docker-compose.prod.yml exec api npx prisma db seed
```
Kunci perangkat produksi berbeda dari kunci di lingkungan dev. Pakai yang baru di firmware.

### I. Update dan backup
```bash
# Update
git pull && docker compose --env-file deploy/.env -f deploy/docker-compose.prod.yml up -d --build

# Backup harian (contoh crontab, jam 02:00)
0 2 * * * cd /home/<user>/iot-supercap && docker compose --env-file deploy/.env -f deploy/docker-compose.prod.yml exec -T db pg_dump -U iot iot | gzip > /home/<user>/backup/iot_$(date +\%F).sql.gz
```
Salin file backup ke tempat lain secara berkala. Backup di VPS yang sama tidak melindungi dari kerusakan VPS.

### J. Verifikasi
```bash
curl https://iot.domainmu.com/api/health                  # {"ok":true}
curl -X POST https://iot.domainmu.com/api/ingest \
  -H "X-Device-Key: KUNCI_PRODUKSI" -H "Content-Type: application/json" \
  -d '{"device_id":"esp32c3-01","vcap":4.0,"status":"safe"}'  # {"ok":true,"cmd":"none"}
```
Lalu buka `https://iot.domainmu.com` di browser, login, dan pastikan data muncul.

---

## 9. PERSIAPAN LoRa

Belum diimplementasikan, tapi beberapa keputusan sebaiknya disiapkan dari sekarang.

- **`Device.transport`** (`WIFI`/`LORA`) sudah ada di skema, jadi perangkat LoRa nanti tidak perlu migrasi besar.
- **Gateway.** Node LoRa tidak berbicara HTTPS. Gateway menerima paket LoRa lalu meneruskannya ke endpoint `/api/ingest`. Putuskan nanti apakah gateway memakai satu kunci sendiri (membawa `device_id` node di payload) atau setiap node punya kunci.
- **Payload kecil.** Paket LoRa hanya puluhan byte. Nama field JSON panjang tidak realistis, jadi format biner atau singkatan perlu dibuat di sisi gateway, lalu dikonversi ke kontrak JSON yang sama.
- **Perintah reset tetap cocok.** Model antrean ("perintah dikirim sebagai balasan setelah alat mengirim data") sejalan dengan sifat LoRaWAN Class A, yang hanya menerima downlink sesaat setelah uplink.
- **Kalau memakai LoRaWAN network server** (mis. TTN atau ChirpStack), uplink datang sebagai webhook dengan format JSON mereka sendiri. Tambahkan endpoint adaptor terpisah (mis. `/api/ingest/lorawan`) yang menerjemahkannya ke `IngestSchema`, tanpa mengubah endpoint yang dipakai ESP32.

---

## 10. CHECKLIST PRODUCTION READINESS

### Backend
- [ ] `.env` divalidasi Zod saat start dan tidak ada di Git.
- [ ] `JWT_SECRET` minimal 32 karakter, acak.
- [ ] Semua controller memakai `try/catch` dengan `next(error)`, dan `errorHandler` paling akhir.
- [ ] Payload `/ingest` divalidasi Zod dengan rentang wajar.
- [ ] Kunci perangkat disimpan sebagai hash, dibandingkan dengan `timingSafeEqual`.
- [ ] Rate limit aktif di `/ingest` dan `/auth/login`, dan `trust proxy` diset.
- [ ] Tidak ada `BigInt` di response JSON.
- [ ] Query `$queryRaw` memakai `Prisma.sql`.
- [ ] `prisma/migrations` di-commit.
- [ ] Perintah punya TTL dan hanya satu `PENDING` per tipe.

### Frontend
- [ ] Semua halaman terproteksi `PageGuard`, dan tombol Reset hanya untuk ADMIN.
- [ ] Satu `createApi`, dan data disegarkan dengan `pollingInterval`.
- [ ] Waktu ditampilkan dalam WIB.
- [ ] Grafik garis memutus garis pada celah malam hari.
- [ ] Status "Tidak aktif" ditampilkan netral.
- [ ] Layout responsif di HP.

### Firmware
- [ ] Memakai `https://` langsung ke `/api/ingest`, dengan header `X-Device-Key`.
- [ ] Mengirim `reset_reason`, `boot_count`, `wifi_ms`, `active_ms`.
- [ ] Membaca `cmd` dari balasan (`restart`, `sleep`) dan menjalankannya.
- [ ] Ada batas waktu (timeout) untuk koneksi WiFi dan HTTP.

### Deployment
- [ ] Domain mengarah ke VPS, HTTPS aktif (gembok di browser).
- [ ] Hanya port 22, 80, 443 yang terbuka, dan Postgres tidak dipublikasikan.
- [ ] `.env` produksi hanya ada di VPS.
- [ ] Backup `pg_dump` terjadwal dan disalin ke luar VPS.
- [ ] Seed sudah dijalankan, dan kunci perangkat produksi sudah dicatat.
