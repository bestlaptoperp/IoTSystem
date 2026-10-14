/*
 * =================================================================
 * FIRMWARE IOT BATTERYLESS SOLAR & SUPERCAPACITOR
 * Board        : ESP32-C3 Super Mini
 * LDO Regulator: HT7333 (3.3V Direct)
 * Sensor       : Soil Moisture (GPIO 1, switched via GPIO 3)
 * ADC Voltage  : Supercap Vsys via 100k + 100k Divider (GPIO 0)
 * =================================================================
 */

#define BLYNK_TEMPLATE_ID "TMPL6_AuoG8Iz"
#define BLYNK_TEMPLATE_NAME "testing solar panel dan supercapasitor"
#define BLYNK_AUTH_TOKEN "7sHYb4UEmETC-t0nXGmB3LayDbc7ONKO"
#define BLYNK_PRINT Serial

// --- LIBRARY UTAMA ---
#include <ArduinoJson.h>
#include <BlynkSimpleEsp32.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WiFiMulti.h>

WiFiMulti wifiMulti;

// --- KONFIGURASI CLOUD & API ---
const String GAS_URL = "https://script.google.com/macros/s/"
                       "AKfycbwrWPH7UjAHjCwxnJb2kt2V68bjCvW9to0z9QsTrjRlxvbtH8Y"
                       "DJxFCTlRIyCBwTO4o/exec";
const String city = "Sukabumi";
const String apiKey = "1f9127ad2063e43377e6ec85b58a4e7a";

// --- KONFIGURASI PIN ESP32-C3 SUPER MINI ---
const int pinLED =
    8; // Onboard LED Super Mini (ACTIVE-LOW: LOW=Nyala, HIGH=Mati)
const int pinVoltase = 0; // GPIO 0 (ADC1_CH0) - Membaca Tegangan Vsys
const int pinSoil = 1;    // GPIO 1 (ADC1_CH1) - Sensor Kelembaban Tanah
const int pinPowerSensor =
    3; // GPIO 3 - Switch transistor power sensor tanah (3.3V)

// --- VARIABEL DATA GLOBAL ---
float voltage = 0.0;
String teksStatusARIMA = "";
int durasiTidurGlobal = 900;
int soilPercent = 0;
int lightIntensityAPI = 0;

// --- DEKLARASI FUNGSI ---
float prediksiTeganganARIMA(float teganganSekarang);
void fetchWeatherAPI();
void sendToGoogleSheets();
void indikatorLED(int mode);

void setup() {
  // 1. Inisialisasi Hardware & Pin
  pinMode(pinPowerSensor, OUTPUT);
  digitalWrite(pinPowerSensor, LOW); // Sensor tanah mati di awal

  pinMode(pinLED, OUTPUT);
  digitalWrite(pinLED, HIGH); // HIGH = MATI (Onboard LED Super Mini Active-LOW)

  WiFi.mode(WIFI_OFF); // Matikan radio Wi-Fi di awal untuk hemat daya

  Serial.begin(115200);
  delay(200); // Jeda singkat stabilisasi Serial
  Serial.println("\n\n==============================================");
  Serial.println("[SISTEM] ESP32-C3 Bangun - Booting Batteryless IoT System");
  Serial.println("==============================================");

  // 2. CEK TEGANGAN SUPERKAPASITOR (GPIO 0)
  int mv = analogReadMilliVolts(pinVoltase);
  voltage = (mv / 1000.0) * 2.0; // Divider 100k + 100k (Rasio = 2.0)

  Serial.print("[SENSOR] Tegangan Superkapasitor: ");
  Serial.print(voltage, 2);
  Serial.println(" V");

  // 3. PENGAMANAN TEGANGAN KRITIS (Pencegah Brownout / Crash)
  if (voltage < 3.80) {
    Serial.println(
        "[WARNING] Tegangan dibawah 3.80V (Kritis)! Batalkan transmisi Wi-Fi.");
    indikatorLED(3); // Kedip cepat 5x

    // Tidur 1 jam (3600 detik) agar superkapasitor terisi daya oleh panel surya
    Serial.println("[SISTEM] Masuk Deep Sleep 1 Jam untuk Pengisian Daya...");
    Serial.flush();
    esp_sleep_enable_timer_wakeup(3600ULL * 1000000ULL);
    esp_deep_sleep_start();
  }

  indikatorLED(2); // Indikator daya aman (Kedip 3x)

  // 4. BACA SENSOR KELEMBABAN TANAH (GPIO 1)
  Serial.println("[PROSES] Membaca Sensor Kelembaban Tanah...");
  digitalWrite(pinPowerSensor, HIGH); // Nyalakan daya sensor
  delay(200);                         // Jeda stabilisasi pembacaan sensor

  int rawSoil = analogRead(pinSoil);
  digitalWrite(pinPowerSensor,
               LOW); // Matikan sensor secepat mungkin demi efisiensi

  soilPercent = map(rawSoil, 3200, 1600, 0, 100);
  soilPercent = constrain(soilPercent, 0, 100);

  Serial.print("[SENSOR] Kelembaban Tanah: ");
  Serial.print(soilPercent);
  Serial.println("%");

  // 5. EVALUASI PREDIKSI MODEL ARIMA & PENETAPAN DURASI DEEP SLEEP
  float prediksi = prediksiTeganganARIMA(voltage);

  if (prediksi > 4.10) {
    durasiTidurGlobal = 900; // 15 Menit (Kondisi Ideal)
    teksStatusARIMA = "is Safe (15 min) | Pred: " + String(prediksi, 2) + "V";
  } else if (prediksi >= 4.00 && prediksi <= 4.10) {
    durasiTidurGlobal = 1800; // 30 Menit (Kondisi Sedang)
    teksStatusARIMA = "is Medium (30 min) | Pred: " + String(prediksi, 2) + "V";
  } else {
    durasiTidurGlobal = 3600; // 60 Menit (Kondisi Kritis)
    teksStatusARIMA =
        "is Critical (60 min) | Pred: " + String(prediksi, 2) + "V";
  }

  Serial.println("[ARIMA] " + teksStatusARIMA);

  // 6. BANGUNKAN RADIO WI-FI
  Serial.println("[WIFI] Mengaktifkan Wi-Fi...");
  WiFi.mode(WIFI_STA);
  wifiMulti.addAP("ruang sempit", "ruangsempit135790");
  wifiMulti.addAP("Bestservice.id", "bestservice");

  // Ditolak ke +2 dBm agar puncak arus (current spike) saat transmisi tidak
  // menekan tegangan supercap
  WiFi.setTxPower(WIFI_POWER_2dBm);

  indikatorLED(4); // LED menyala tanda mencari koneksi

  int timeout = 0;
  while (wifiMulti.run() != WL_CONNECTED && timeout < 16) {
    delay(500);
    Serial.print(".");
    yield();
    timeout++;
  }

  digitalWrite(pinLED, HIGH); // Matikan LED indikator koneksi

  // 7. EKSEKUSI TRANSMISI DATA CLOUD
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Terhubung ke Jaringan!");

    // A. Ambil Data Cuaca OpenWeatherMap
    fetchWeatherAPI();

    // B. Kirim ke Blynk IoT Cloud
    Blynk.config(BLYNK_AUTH_TOKEN);
    if (Blynk.connect(3000)) { // Timeout 3 detik
      Blynk.virtualWrite(V1, voltage);
      Blynk.virtualWrite(V2, soilPercent);
      Blynk.virtualWrite(V5, lightIntensityAPI);
      Blynk.virtualWrite(V6, teksStatusARIMA);
      Blynk.run();
      Serial.println("[BLYNK] Data berhasil terkirim.");
    } else {
      Serial.println("[BLYNK] Gagal terhubung ke Server Blynk.");
    }

    // C. Kirim ke Google Sheets via Google Apps Script (GAS)
    sendToGoogleSheets();

    indikatorLED(1); // Indikator sukses kirim data (Nyala 0.5 detik)
  } else {
    Serial.println(
        "\n[WIFI] Timeout! Koneksi Wi-Fi gagal, transmisi dibatalkan.");
    indikatorLED(3); // Kedip cepat tanda gagal koneksi
  }

  // 8. MATIKAN SISTEM & MASUK MODE DEEP SLEEP
  digitalWrite(pinLED, HIGH); // Pastikan LED mati sebelum tidur

  Serial.printf(
      "[SISTEM] Proses selesai. Masuk Deep Sleep selama %d Detik...\n",
      durasiTidurGlobal);
  Serial.flush();

  WiFi.disconnect(true);
  delay(100);

  esp_sleep_enable_timer_wakeup((uint64_t)durasiTidurGlobal * 1000000ULL);
  esp_deep_sleep_start();
}

void loop() {
  // Kosong (Seluruh logika dijalankan satu kali di setup() lalu masuk deep
  // sleep)
}

// =========================================================
// FUNGSI PENDUKUNG & HELPER
// =========================================================

// Standarisasi Kontrol LED Onboard Active-LOW ESP32-C3 Super Mini
void indikatorLED(int mode) {
  switch (mode) {
  case 1: // Berhasil & Data Terkirim (Nyala 0.5 detik)
    digitalWrite(pinLED, LOW);
    delay(500);
    digitalWrite(pinLED, HIGH);
    break;

  case 2: // Tegangan Aman (Kedip 3x)
    for (int i = 0; i < 3; i++) {
      digitalWrite(pinLED, LOW);
      delay(100);
      digitalWrite(pinLED, HIGH);
      delay(100);
    }
    break;

  case 3: // Tegangan Kritis / Gagal (Kedip cepat 5x)
    for (int i = 0; i < 5; i++) {
      digitalWrite(pinLED, LOW);
      delay(80);
      digitalWrite(pinLED, HIGH);
      delay(80);
    }
    break;

  case 4: // Mencari Wi-Fi (Nyala kontinu)
    digitalWrite(pinLED, LOW);
    break;
  }
}

// Ambil data tutupan awan dari OpenWeatherMap & konversi ke perkiraan
// intensitas cahaya
void fetchWeatherAPI() {
  WiFiClientSecure client;
  client.setInsecure(); // Bypass verifikasi sertifikat SSL demi menghemat
                        // memori & waktu
  HTTPClient http;

  String url = "https://api.openweathermap.org/data/2.5/weather?q=" + city +
               "&appid=" + apiKey;

  if (http.begin(client, url)) {
    int httpCode = http.GET();
    if (httpCode > 0) {
      String payload = http.getString();
      StaticJsonDocument<1024> doc;
      DeserializationError error = deserializeJson(doc, payload);

      if (!error) {
        int cloudCover = doc["clouds"]["all"];
        lightIntensityAPI =
            100 - cloudCover; // Estimasi persentase intensitas cahaya matahari
        Serial.print("[WEATHER API] Tutupan Awan: ");
        Serial.print(cloudCover);
        Serial.print("%, Estimasi Intensitas Cahaya: ");
        Serial.print(lightIntensityAPI);
        Serial.println("%");
      }
    }
    http.end();
  }
}

// Pengiriman data ke Google Sheets via Google Apps Script (GAS) Web App
void sendToGoogleSheets() {
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  String teksUrl = teksStatusARIMA;
  teksUrl.replace(" ", "%20");

  String url = GAS_URL + "?v=" + String(voltage, 2) +
               "&l=" + String(lightIntensityAPI) + "&s=" + String(soilPercent) +
               "&info=" + teksUrl;

  if (http.begin(client, url)) {
    http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
    int httpCode = http.GET();
    if (httpCode > 0) {
      String payload = http.getString();
      if (payload == "SUCCESS_SAVED") {
        Serial.println("[SHEETS] Data berhasil tersimpan di Google Sheets!");
      }
    }
    http.end();
  }
}

// Formula Prediksi Model ARIMA AR(1) untuk Proyeksi Tegangan
float prediksiTeganganARIMA(float teganganSekarang) {
  float const_val = 4.3387;
  float ar_L1_val = 0.8297;
  return const_val + (ar_L1_val * (teganganSekarang - const_val));
}