// =============================================================================
// secrets.example.h
// Salin file ini menjadi `secrets.h` (di folder yang sama), lalu isi nilainya.
// `secrets.h` JANGAN di-commit. Tambahkan ke .gitignore:  firmware/**/secrets.h
// =============================================================================
#pragma once
#include <stdint.h>

struct WifiAp {
  const char* ssid;
  const char* pass;
};

// Urutan = prioritas. Tambah atau kurangi sesuai kebutuhan.
static const WifiAp WIFI_APS[] = {
  {"NAMA_WIFI_1", "PASSWORD_WIFI_1"},
  {"NAMA_WIFI_2", "PASSWORD_WIFI_2"},
};
static const uint8_t WIFI_AP_COUNT = sizeof(WIFI_APS) / sizeof(WIFI_APS[0]);

// Harus sama dengan Device.code di database (hasil seed)
static const char* DEVICE_ID = "esp32c3-01";

// Kunci perangkat yang dicetak sekali oleh `npm run db:seed`
static const char* DEVICE_KEY = "GANTI_DENGAN_KUNCI_DARI_SEED";

// Endpoint ingest.
//  - Uji lokal (laptop, jaringan yang sama): "http://192.168.1.10:3001/api/ingest"
//  - Produksi (VPS):                         "https://iot.domainmu.com/api/ingest"
static const char* API_URL = "http://192.168.1.10:3001/api/ingest";

// Sertifikat root (format PEM) untuk server HTTPS.
// Hanya dipakai kalau USE_INSECURE_TLS = 0 di iot_supercap.ino.
// Kalau Caddy dipaksa memakai Let's Encrypt (lihat Bagian 8F panduan), root-nya
// adalah "ISRG Root X1" dari letsencrypt.org/certificates. Tempel PEM-nya di sini.
static const char* ROOT_CA =
  "-----BEGIN CERTIFICATE-----\n"
  "TEMPEL_SERTIFIKAT_ROOT_DI_SINI\n"
  "-----END CERTIFICATE-----\n";
