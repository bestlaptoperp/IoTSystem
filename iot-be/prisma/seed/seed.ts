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
    const rawKey = process.env.DEVICE_KEY || crypto.randomBytes(32).toString('hex')
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
