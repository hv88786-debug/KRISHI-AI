/*
 * ╔══════════════════════════════════════════════════╗
 * ║   AgroGuardian AI — ESP32 FIXED Firmware         ║
 * ║   Alpha Coders · GEC Ajmer                       ║
 * ╠══════════════════════════════════════════════════╣
 * ║  HARDWARE:                                       ║
 * ║    DHT11        → GPIO4  (Temp + Humidity)       ║
 * ║    Soil Sensor  → GPIO34 (4-wire: AOUT pin)      ║
 * ║    NTC Thermistor → GPIO35 (10K, 4.7K series R)  ║
 * ║    Relay Module → GPIO23 (Pump ON/OFF)           ║
 * ║    LED Status   → GPIO2  (onboard)               ║
 * ╠══════════════════════════════════════════════════╣
 * ║  LED BEHAVIOUR (UPDATED):                        ║
 * ║    Pump ON  → LED continuously ON  🟢            ║
 * ║    Pump OFF → LED continuously OFF               ║
 * ╚══════════════════════════════════════════════════╝
 *
 * LIBRARIES needed (install from Arduino Library Manager):
 *   → DHT sensor library  (by Adafruit)
 *   → Adafruit Unified Sensor
 *   → ArduinoJson  (by Benoit Blanchon, v6.x)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ════════════════════════════════════════════
//  ⚙️  CONFIG — APNI DETAILS DAALO
// ════════════════════════════════════════════
const char* WIFI_SSID     = "Harsh lohar";
const char* WIFI_PASSWORD = "1234567890";
const char* SERVER_URL    = "http://10.88.14.121:5000";
const char* DEVICE_ID     = "ESP32_FARM_001";

// ════════════════════════════════════════════
//  📌  PINS
// ════════════════════════════════════════════
#define DHTPIN      4     // DHT11 data pin
#define DHTTYPE     DHT11
#define SOIL_PIN    34    // Soil sensor AOUT (analog)
#define NTC_PIN     35    // NTC thermistor (analog)
#define RELAY_PIN   23    // Relay IN pin
#define LED_PIN     2     // Status LED (onboard) — Pump indicator

DHT dht(DHTPIN, DHTTYPE);

// ════════════════════════════════════════════
//  📐  SOIL SENSOR CALIBRATION
// ════════════════════════════════════════════
#define SOIL_DRY    3000
#define SOIL_WET    1500

// ════════════════════════════════════════════
//  📐  NTC THERMISTOR CONSTANTS (10K NTC)
// ════════════════════════════════════════════
#define NTC_SERIES_R  4700.0f
#define NTC_NOMINAL   10000.0f
#define NTC_BCOEFF    3950.0f
#define NTC_TEMP_NOM  25.0f

// ════════════════════════════════════════════
//  🌱  CROP THRESHOLDS
// ════════════════════════════════════════════
struct CropProfile { const char* name; float minMoist; float maxMoist; float maxTemp; };
const CropProfile CROPS[] = {
  { "Wheat",   35.0f, 65.0f, 35.0f },
  { "Maize",   40.0f, 70.0f, 38.0f },
  { "Onion",   45.0f, 75.0f, 35.0f },
  { "Tomato",  50.0f, 80.0f, 36.0f },
};
int SELECTED_CROP = 0;  // 0=Wheat, 1=Maize, 2=Onion, 3=Tomato

// ════════════════════════════════════════════
//  🔧  GLOBALS
// ════════════════════════════════════════════
bool pumpState  = false;
bool manualMode = false;

unsigned long lastSendTime = 0;
#define SEND_INTERVAL  10000

// ════════════════════════════════════════════
//  💡  RELAY LOGIC
// ════════════════════════════════════════════
#define PUMP_ON_SIGNAL  LOW
#define PUMP_OFF_SIGNAL HIGH

// ════════════════════════════════════════════
//  💡  LED — Pump se linked
//  Pump ON  → LED ON  (green light jale)
//  Pump OFF → LED OFF (light band)
// ════════════════════════════════════════════
void updateLED() {
  digitalWrite(LED_PIN, pumpState ? HIGH : LOW);
}

// ════════════════════════════════════════════
//  🔌  SETUP
// ════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n🌱 AgroGuardian ESP32 Starting...");

  pinMode(RELAY_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  setPump(false, "Boot");   // Pump OFF, LED OFF at start

  dht.begin();
  Serial.println("✅ DHT11 initialized (GPIO4)");
  Serial.println("✅ Soil Sensor on GPIO34");
  Serial.println("✅ NTC Thermistor on GPIO35");
  Serial.println("✅ Relay on GPIO23");
  Serial.println("✅ LED on GPIO2 — Pump indicator (ON = pump chal raha hai)");

  // Connect WiFi — LED blink nahi karega, sirf Serial log
  Serial.printf("📶 Connecting to %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 40) {
    delay(500); Serial.print(".");
    tries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" ✅ Connected!");
    Serial.printf("   IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println(" ❌ WiFi failed — check SSID/password");
  }

  Serial.printf("🌾 Crop: %s | Pump ON < %.0f%% | OFF > %.0f%%\n",
    CROPS[SELECTED_CROP].name,
    CROPS[SELECTED_CROP].minMoist,
    CROPS[SELECTED_CROP].maxMoist);
}

// ════════════════════════════════════════════
//  📡  READ SENSORS
// ════════════════════════════════════════════
float readSoilMoisture() {
  int raw = analogRead(SOIL_PIN);
  long mapped = map(raw, SOIL_DRY, SOIL_WET, 0, 100);
  float pct = constrain((float)mapped, 0.0f, 100.0f);
  Serial.printf("  💧 Soil raw=%d → %.1f%%\n", raw, pct);
  return pct;
}

float readNTC() {
  int raw = analogRead(NTC_PIN);
  if (raw <= 10 || raw >= 4090) {
    Serial.println("  ⚠️  NTC: no reading (check wiring)");
    return 25.0f;
  }
  float voltage    = raw * (3.3f / 4095.0f);
  float resistance = NTC_SERIES_R * voltage / (3.3f - voltage);
  float steinhart  = resistance / NTC_NOMINAL;
  steinhart        = log(steinhart);
  steinhart       /= NTC_BCOEFF;
  steinhart       += 1.0f / (NTC_TEMP_NOM + 273.15f);
  float tempC      = (1.0f / steinhart) - 273.15f;
  Serial.printf("  🌡️  NTC raw=%d R=%.0fΩ → %.1f°C\n", raw, resistance, tempC);
  return tempC;
}

// ════════════════════════════════════════════
//  💧  PUMP CONTROL
//  ✅ LED pump ke saath hi ON/OFF hogi
// ════════════════════════════════════════════
void setPump(bool state, const char* reason) {
  pumpState = state;
  digitalWrite(RELAY_PIN, state ? PUMP_ON_SIGNAL : PUMP_OFF_SIGNAL);

  // LED = Pump indicator
  // Pump ON  → LED ON  🟢
  // Pump OFF → LED OFF
  updateLED();

  Serial.printf("💧 Pump %s — [%s] | LED %s\n",
    state ? "ON" : "OFF",
    reason,
    state ? "ON 🟢" : "OFF ⚫");
}

// ════════════════════════════════════════════
//  🤖  AUTO IRRIGATION LOGIC
// ════════════════════════════════════════════
void autoIrrigation(float moisture) {
  if (manualMode) return;
  const CropProfile& crop = CROPS[SELECTED_CROP];
  if (moisture < crop.minMoist && !pumpState) {
    setPump(true, "Auto: low moisture");
  } else if (moisture > crop.maxMoist && pumpState) {
    setPump(false, "Auto: target reached");
  }
}

// ════════════════════════════════════════════
//  📤  SEND DATA → BACKEND
// ════════════════════════════════════════════
void sendData() {
  if (WiFi.status() != WL_CONNECTED) return;

  float moisture = readSoilMoisture();
  float ntcTemp  = readNTC();
  float dhtTemp  = dht.readTemperature();
  float dhtHum   = dht.readHumidity();

  float finalTemp = (!isnan(dhtTemp)) ? dhtTemp : ntcTemp;
  float finalHum  = (!isnan(dhtHum))  ? dhtHum  : 60.0f;

  autoIrrigation(moisture);

  StaticJsonDocument<512> doc;
  doc["deviceId"]     = DEVICE_ID;
  doc["zone"]         = "Zone-1";
  doc["cropType"]     = CROPS[SELECTED_CROP].name;
  doc["soilMoisture"] = round(moisture * 10) / 10.0;
  doc["temperature"]  = round(finalTemp  * 10) / 10.0;
  doc["humidity"]     = round(finalHum   * 10) / 10.0;
  doc["pumpStatus"]   = pumpState;
  doc["soilPH"]       = 6.8;
  doc["soilEC"]       = 1.2;
  doc["nitrogen"]     = "Medium";
  doc["phosphorus"]   = "Medium";
  doc["potassium"]    = "Medium";
  doc["manualMode"]   = manualMode;
  doc["ntcTemp"]      = round(ntcTemp * 10) / 10.0;

  String payload;
  serializeJson(doc, payload);

  Serial.println("\n📤 Sending to backend...");
  Serial.println("   Payload: " + payload);

  HTTPClient http;
  http.begin(String(SERVER_URL) + "/api/sensor/data");
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(8000);

  int httpCode = http.POST(payload);
  Serial.printf("   HTTP: %d\n", httpCode);

  if (httpCode == 200 || httpCode == 201) {
    String response = http.getString();
    Serial.println("   Response: " + response);

    StaticJsonDocument<512> resp;
    if (!deserializeJson(resp, response)) {

      // CHECK 1: Backend AI irrigation command
      bool backendIrrigate = resp["command"]["irrigate"] | false;
      if (!manualMode && backendIrrigate != pumpState) {
        setPump(backendIrrigate, "Backend AI decision");
      }

      // CHECK 2: Website dashboard pump command
      if (!resp["command"]["pumpOverride"].isNull()) {
        String action = resp["command"]["pumpOverride"]["action"] | "auto";

        Serial.printf("   🖥️  Website pump command: %s\n", action.c_str());

        if (action == "on") {
          manualMode = true;
          setPump(true, "Website: ON");           // LED ON 🟢
        } else if (action == "off") {
          manualMode = true;
          setPump(false, "Website: OFF");         // LED OFF ⚫
        } else if (action == "auto") {
          manualMode = false;
          Serial.println("   🔄 Switched to AUTO mode");
          updateLED(); // Pump state ke hisaab se LED set karo
        }
      }
    }

  } else {
    Serial.printf("   ❌ Error: HTTP %d\n", httpCode);
  }
  http.end();
}

// ════════════════════════════════════════════
//  🔄  PRINT STATUS
// ════════════════════════════════════════════
void printStatus(float moisture, float temp, float hum) {
  const CropProfile& crop = CROPS[SELECTED_CROP];
  Serial.println("╔══════════════════════════════════════╗");
  Serial.printf( "║  Crop    : %-26s║\n", crop.name);
  Serial.printf( "║  Moisture: %5.1f%%  (need %.0f–%.0f%%)     ║\n",
    moisture, crop.minMoist, crop.maxMoist);
  Serial.printf( "║  Temp    : %5.1f°C  (max %.0f°C)       ║\n",
    temp, crop.maxTemp);
  Serial.printf( "║  Humidity: %5.1f%%                    ║\n", hum);
  Serial.printf( "║  Pump    : %-10s Mode: %-8s║\n",
    pumpState ? "ON 🟢" : "OFF ⚫", manualMode ? "MANUAL" : "AUTO");
  Serial.println("╚══════════════════════════════════════╝");
}

// ════════════════════════════════════════════
//  🔁  LOOP
// ════════════════════════════════════════════
void loop() {
  unsigned long now = millis();

  if (now - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = now;
    sendData();
  }

  // WiFi reconnect — LED affect nahi hogi (pump state maintain rahegi)
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("📶 Reconnecting WiFi...");
    WiFi.reconnect();
    unsigned long ws = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - ws < 10000) {
      delay(500); Serial.print(".");
    }
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("✅ Reconnected");
      updateLED(); // Reconnect ke baad pump state ke hisaab se LED restore
    }
  }

  delay(100);
}
