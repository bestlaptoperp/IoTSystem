# Panduan Deployment IoT-Project ke VPS

Panduan lengkap langkah-demi-langkah untuk mendeploy sistem IoT (Frontend Next.js, Backend Express/Prisma, Database PostgreSQL, dan Reverse Proxy Caddy dengan otomatisasi HTTPS/SSL) ke Virtual Private Server (VPS).

---

## Arsitektur Sistem Produksi

Sistem berjalan secara terisolasi menggunakan Docker Compose:
- **`caddy`**: Reverse proxy publik (Port 80 & 443). Mengurus sertifikat SSL Let's Encrypt secara otomatis.
- **`web`**: Next.js Standalone container (Frontend Dashboard, port internal 3000).
- **`api`**: Node.js Express REST API (port internal 3001), otomatis menjalankan migrasi Prisma saat start.
- **`db`**: PostgreSQL 16 database server (data tersimpan persisten di Docker volume `pgdata`).

---

## 1. Prasyarat (Prerequisites)

Sebelum mulai, siapkan:
1. **Server VPS**: Sistem operasi Ubuntu 22.04 / 24.04 LTS (disarankan minimal 1 vCPU, 1 GB RAM).
2. **Alamat Akses**:
   - **Opsi A (Menggunakan IP VPS langsung - Tanpa Domain)**: Cukup gunakan IP Publik VPS Anda (misal `103.xxx.xxx.xxx`).
   - **Opsi B (Menggunakan Domain / Subdomain)**: Arahkan DNS A-Record ke IP Publik VPS Anda.
3. **Port Terbuka (Firewall)**:
   - Port `22` (SSH)
   - Port `80` (HTTP web & reverse proxy)
   - Port `443` (HTTPS - opsional jika pakai domain)

---

## 2. Persiapan Server VPS

Hubungi VPS via SSH:
```bash
ssh root@<IP_VPS_ANDA>
```

### 2.1 Update Paket Sistem
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw
```

### 2.2 Setup Swap Memory (Sangat Direkomendasikan)
Jika VPS memiliki RAM 1GB atau 2GB, build Next.js dan TypeScript dapat menyebabkan *Out of Memory* (OOM). Siapkan Swap 2GB:
```bash
# Cek apakah swap sudah aktif
free -h

# Jika swap masih 0B, buat 2GB swap:
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Tambahkan ke fstab agar permanen setelah reboot
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 2.3 Konfigurasi Firewall (UFW)
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2.4 Instalasi Docker & Docker Compose Plugin
Gunakan skrip resmi Docker:
```bash
# Instal Docker Engine & Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Verifikasi instalasi
docker --version
docker compose version
```

---

## 3. Clone Repository & Konfigurasi Lingkungan

### 3.1 Clone Repository
```bash
# Buat direktori aplikasi atau clone ke home directory
mkdir -p /opt
cd /opt
git clone <URL_REPOSITORY_ANDA> iot-project
cd iot-project/deploy
```

### 3.2 Buat File Lingkungan `.env`
Salin template konfigurasi:
```bash
cp .env.example .env
nano .env
```

Sesuaikan nilai-nilainya:
```env
# Domain yang sudah dipointing ke IP VPS (Caddy otomatis mengurus HTTPS)
DOMAIN=iot.domainkamu.com

# Kredensial Database PostgreSQL
POSTGRES_USER=iot_admin
POSTGRES_PASSWORD=BuatPasswordDatabaseKuat123!
POSTGRES_DB=iot_supercap

# JWT Secret untuk token otentikasi login (Generate dengan: openssl rand -hex 32)
JWT_SECRET=f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8

# Akun Administrator Awal untuk Dashboard Web
ADMIN_EMAIL=admin@domainkamu.com
ADMIN_PASSWORD=BuatPasswordAdminKuat123!

# Kunci Perangkat ESP32 (32-byte hex, samakan dengan secrets.h firmware ESP32)
DEVICE_KEY=64e4a398d94d4e417493211ae4d87d3389bde95d57532d0459c113233cae61e3

# Set false jika menggunakan IP VPS / HTTP biasa (tanpa SSL)
COOKIE_SECURE=false
```
> **Tips:** Untuk membuat `JWT_SECRET` atau `DEVICE_KEY` baru yang aman, jalankan:
> ```bash
> openssl rand -hex 32
> ```

Simpan perubahan (`Ctrl + O`, `Enter`, lalu `Ctrl + X`).

---

## 4. Build dan Jalankan Container

Pastikan Anda berada di dalam folder `/opt/iot-project/deploy`. Jalankan:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 4.1 Pantau Proses Build & Status Container
```bash
# Cek apakah semua container berstatus Up (healthy)
docker compose -f docker-compose.prod.yml ps

# Cek log aplikasi jika ada error
docker compose -f docker-compose.prod.yml logs -f
```

### 4.2 Cek Sertifikat SSL Caddy
Pastikan Caddy berhasil menerbitkan sertifikat Let's Encrypt untuk domain Anda:
```bash
docker compose -f docker-compose.prod.yml logs caddy
```
Jika berhasil, akan muncul log seperti `certificate obtained successfully` untuk domain Anda.

---

## 5. Inisialisasi / Seeding Database

Saat container `api` pertama kali berjalan, Prisma otomatis mengeksekusi migrasi tabel database (`prisma migrate deploy`).

Untuk memasukkan akun Administrator awal (`ADMIN_EMAIL` & `ADMIN_PASSWORD`) serta mendaftarkan `DEVICE_KEY` perangkat pertama (`esp32c3-01`), jalankan seeder:

```bash
docker compose -f docker-compose.prod.yml exec api npm run db:seed
```

Hasil yang diharapkan:
```text
[Seed] Akun admin 'admin@domainkamu.com' siap.
[Seed] Perangkat berhasil didaftarkan!
[Seed] KUNCI PERANGKAT (DEVICE_KEY): 64e4a398d94d4e417493211ae4d87d3389bde95d57532d0459c113233cae61e3
```

---

## 6. Uji Akses Dashboard Web

1. Buka browser dan kunjungi alamat IP VPS Anda:
   ```
   http://<IP_VPS_ANDA>
   ```
   *(Atau `https://domainkamu.com` jika Anda menggunakan domain)*
2. Anda akan melihat halaman Login Dashboard.
3. Masukkan `ADMIN_EMAIL` dan `ADMIN_PASSWORD` yang telah di-seed.
4. Anda akan masuk ke halaman Dashboard dan melihat status perangkat `esp32c3-01`.

Uji endpoint API secara manual dari terminal:
```bash
curl -i http://localhost/api/health
# Respon: {"ok":true}
```

---

## 7. Konfigurasi Firmware ESP32

Setelah server aktif di VPS, sesuaikan konfigurasi firmware di laptop sebelum di-flash ke ESP32.

1. Buka file konfigurasi di folder `firmware/iot_supercap/secrets.h` (atau `firmware/secrets.h`).
2. Perbarui nilai `API_URL` ke IP VPS Anda:
   ```cpp
   // Ubah ke IP VPS Anda menggunakan protokol HTTP biasa
   static const char* API_URL = "http://<IP_VPS_ANDA>/api/ingest";

   // Samakan dengan DEVICE_ID dan DEVICE_KEY di .env VPS
   static const char* DEVICE_ID = "esp32c3-01";
   static const char* DEVICE_KEY = "64e4a398d94d4e417493211ae4d87d3389bde95d57532d0459c113233cae61e3";
   ```

3. **Pengaturan TLS/HTTPS pada ESP32**:
   Di file `iot_supercap.ino`, terdapat opsi `#define USE_INSECURE_TLS`:
   - **Mode Cepat (`#define USE_INSECURE_TLS 1`)**:
     ESP32 tetap terhubung lewat HTTPS terenkripsi (Port 443), namun melewati validasi sertifikat root CA lokal di chip ESP32. Sangat praktis dan langsung bekerja tanpa repot memperbarui CA cert jika Let's Encrypt berganti root.
   - **Mode Strict (`#define USE_INSECURE_TLS 0`)**:
     Wajib mengisi konstanta `ROOT_CA` di `secrets.h` dengan sertifikat *ISRG Root X1* dari Let's Encrypt.

4. Flash sketch ke ESP32.
5. Buka Serial Monitor (baud rate 115200). Setelah ESP32 terhubung ke Wi-Fi, Anda akan melihat log HTTP POST berhasil dengan respon kode `200` dan data telemetri akan langsung muncul di Dashboard Web VPS.

---

## 8. Pemeliharaan & Operasional Harian

### Memperbarui Kode (Update / Re-deploy)
Jika Anda melakukan perubahan kode di repo:
```bash
cd /opt/iot-project/deploy
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
```

### Melihat Log Layanan Spesifik
```bash
# Log Backend API
docker compose -f docker-compose.prod.yml logs -f api

# Log Frontend Web
docker compose -f docker-compose.prod.yml logs -f web

# Log Reverse Proxy Caddy
docker compose -f docker-compose.prod.yml logs -f caddy

# Log Database PostgreSQL
docker compose -f docker-compose.prod.yml logs -f db
```

### Backup Database PostgreSQL
Untuk membuat backup database ke file `.sql`:
```bash
docker compose -f docker-compose.prod.yml exec -T db pg_dump -U iot_admin iot_supercap > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Database PostgreSQL
```bash
cat backup_nama_file.sql | docker compose -f docker-compose.prod.yml exec -T db psql -U iot_admin -d iot_supercap
```

---

## 9. Troubleshooting Masalah Umum

| Masalah | Penyebab Umum | Solusi |
|---|---|---|
| **Sertifikat SSL gagal terbit** | DNS A-Record belum propagasi atau port 80/443 terblokir firewall | Pastikan `ping domainkamu.com` sudah mengarah ke IP VPS. Pastikan port 80 dan 443 tidak diblokir security group cloud provider. Cek log via `docker compose -f docker-compose.prod.yml logs caddy`. |
| **Build Next.js gagal (Exit Code 137)** | RAM VPS habis (Out of Memory) | Aktifkan Swap Memory minimal 2GB (ikuti panduan Bagian 2.2). |
| **Tidak bisa login admin di web** | Seeder database belum dieksekusi | Jalankan `docker compose -f docker-compose.prod.yml exec api npm run db:seed`. |
| **ESP32 kirim data error 401 Unauthorized** | `DEVICE_KEY` tidak cocok dengan database | Pastikan `DEVICE_KEY` di `secrets.h` ESP32 persis sama dengan yang ada di file `.env` VPS saat database di-seed. |
| **ESP32 gagal koneksi HTTPS (-1 / connect failed)** | Server HTTPS belum siap atau masalah TLS handshake | Pastikan URL diawali `https://`, uji URL di browser/curl terlebih dahulu. Pastikan `USE_INSECURE_TLS 1` jika tidak menempelkan sertifikat CA. |
