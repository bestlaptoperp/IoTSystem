require('dotenv/config')
const crypto = require('node:crypto')
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL dan ADMIN_PASSWORD wajib diisi di environment variable / .env')
  }

  // 1. Buat atau perbarui akun Admin
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: 'ADMIN',
    },
  })
  console.log(`[Seed] Akun admin '${email}' siap.`)

  // 2. Buat perangkat esp32c3-01 jika belum ada
  const code = 'esp32c3-01'
  const existing = await prisma.device.findUnique({ where: { code } })
  if (!existing) {
    const rawKey = process.env.DEVICE_KEY || crypto.randomBytes(32).toString('hex')
    await prisma.device.create({
      data: {
        code,
        name: 'ESP32-C3 Kebun Cabai',
        keyHash: crypto.createHash('sha256').update(rawKey).digest('hex'),
      },
    })
    console.log('[Seed] Perangkat berhasil didaftarkan!')
    console.log('[Seed] KUNCI PERANGKAT (DEVICE_KEY):', rawKey)
  } else {
    console.log(`[Seed] Perangkat '${code}' sudah terdaftar di database.`)
  }
}

main()
  .catch((err) => {
    console.error('[Seed] Terjadi kesalahan saat seed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
