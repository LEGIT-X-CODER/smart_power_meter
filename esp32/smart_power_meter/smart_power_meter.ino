/*
 * ============================================================
 *  Smart Power Meter — ESP32 Firmware
 *  Firebase Realtime Database + Firestore Integration
 * ============================================================
 *
 *  Hardware:
 *    - ESP32 (WROOM or WROVER)
 *    - ACS712 Current Sensor (5A/20A/30A)
 *    - ZMPT101B Voltage Sensor
 *    - 5V Relay Module (active-LOW)
 *    - Push Button (physical ON/OFF)
 *    - SSD1306 OLED Display (128×64, I2C)
 *
 *  Libraries needed (install via Arduino Library Manager):
 *    - Firebase_ESP_Client (by Mobizt) v4.x
 *    - ArduinoJson v6.x
 *    - Adafruit SSD1306
 *    - Adafruit GFX Library
 *    - Wire (built-in)
 *    - WiFi (built-in ESP32)
 *
 * ============================================================
 */

#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ============================================================
//  CONFIGURATION — EDIT THESE
// ============================================================
#define WIFI_SSID        "Nitro1"
#define WIFI_PASSWORD    "password"

#define FIREBASE_HOST    "smart-home-bc589-default-rtdb.asia-southeast1.firebasedatabase.app"
#define FIREBASE_API_KEY "AIzaSyA7O47MgXjq--BX28pVK9eI5HaNkYbHu1Y"
#define FIREBASE_PROJECT_ID "smart-home-bc589"

// Your device ID — must match the ID registered in Firebase
#define DEVICE_ID        "SPM-A1B2C3"

// Optional: Firebase Auth (Email + Password for the device service account)
#define FIREBASE_USER_EMAIL    "device@yourapp.com"
#define FIREBASE_USER_PASSWORD "password@123"

// ============================================================
//  PIN DEFINITIONS
// ============================================================
#define RELAY_PIN         26    // Relay control (LOW = ON for active-LOW relay)
#define BUTTON_PIN        27    // Physical push button (INPUT_PULLUP)
#define ACS712_PIN        34    // ACS712 analog output
#define ZMPT101B_PIN      35    // ZMPT101B analog output
#define LED_PIN           2     // Built-in LED (status)

// OLED I2C
#define OLED_SDA          21
#define OLED_SCL          22
#define OLED_ADDR         0x3C
#define SCREEN_WIDTH      128
#define SCREEN_HEIGHT     64

// ============================================================
//  ACS712 CALIBRATION
// ============================================================
#define ACS712_SENSITIVITY  0.185f   // V/A for ACS712-5A (0.100 for 20A, 0.066 for 30A)
#define ACS712_VREF         2.5f     // Voltage at zero current (typically 2.5V for 5V supply)
#define ADC_VREF            3.3f     // ESP32 ADC reference voltage
#define ADC_RESOLUTION      4095.0f  // 12-bit ADC

// ZMPT101B calibration factor (tune for your transformer)
#define ZMPT_CALIBRATION    660.0f

// ============================================================
//  TIMING
// ============================================================
#define HEARTBEAT_INTERVAL_MS     20000   // 20 seconds
#define METRICS_UPLOAD_INTERVAL_MS  3000  // 3 seconds
#define LOG_UPLOAD_INTERVAL_MS    60000   // 1 minute
#define COMMAND_CHECK_INTERVAL_MS  1000   // 1 second (check switch commands)
#define DISPLAY_UPDATE_INTERVAL_MS 1000   // 1 second

// ============================================================
//  GLOBALS
// ============================================================
FirebaseData fbdo;
FirebaseData fbdo_stream;
FirebaseAuth auth;
FirebaseConfig config;

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// Device state
bool switchState       = false;
bool lastSwitchState   = false;
bool manualOverride    = false;
bool buttonPressed     = false;
bool lastButtonState   = HIGH;

// Sensor readings
float voltage          = 0.0f;
float current          = 0.0f;
float currentPower     = 0.0f;
float totalEnergy      = 0.0f;  // Wh

// Schedule
bool  scheduleEnabled     = false;
long  shutdownTimestamp   = 0;

// Threshold
bool   thresholdEnabled   = false;
float  thresholdValue     = 5000.0f;  // Wh
String thresholdUnit      = "Wh";
String thresholdAction    = "notify";

// Timers
unsigned long lastHeartbeat        = 0;
unsigned long lastMetricsUpload    = 0;
unsigned long lastLogUpload        = 0;
unsigned long lastCommandCheck     = 0;
unsigned long lastDisplayUpdate    = 0;
unsigned long lastEnergyCalc       = 0;

// Firebase path base
String devPath = "/devices/" + String(DEVICE_ID);
String regPath = "/device_registry/" + String(DEVICE_ID);

// ============================================================
//  FUNCTION PROTOTYPES
// ============================================================
void connectWiFi();
void initFirebase();
float readVoltage();
float readCurrent();
void controlRelay(bool state, bool manual);
void checkPhysicalButton();
void checkRemoteSwitch();
void checkSchedule();
void checkThreshold();
void updateHeartbeat();
void uploadMetrics();
void uploadPowerLog();
void updateDisplay();
void readScheduleFromDB();
void readThresholdFromDB();

// ============================================================
//  SETUP
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  // Pins
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);  // Relay OFF (active-LOW)
  digitalWrite(LED_PIN, LOW);

  // OLED
  Wire.begin(OLED_SDA, OLED_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println("OLED init failed — continuing without display");
  } else {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(20, 20);
    display.println("Smart Power Meter");
    display.setCursor(30, 40);
    display.println("Initializing...");
    display.display();
  }

  // WiFi + Firebase
  connectWiFi();
  initFirebase();

  // Load initial state from DB
  readScheduleFromDB();
  readThresholdFromDB();

  // Read current switch state from DB
  if (Firebase.RTDB.getBool(&fbdo, devPath + "/switchState")) {
    switchState = fbdo.boolData();
    controlRelay(switchState, false);
  }

  Serial.println("✅ Setup complete. Device ID: " + String(DEVICE_ID));
}

// ============================================================
//  LOOP
// ============================================================
void loop() {
  unsigned long now = millis();

  // 1. Physical button
  checkPhysicalButton();

  // 2. Remote switch command (highest priority after manual)
  if (now - lastCommandCheck >= COMMAND_CHECK_INTERVAL_MS) {
    lastCommandCheck = now;
    checkRemoteSwitch();
  }

  // 3. Schedule timer
  checkSchedule();

  // 4. Sensor readings
  voltage      = readVoltage();
  current      = readCurrent();
  currentPower = voltage * current;

  // Energy calculation (Wh)
  if (lastEnergyCalc > 0 && switchState) {
    float dt = (now - lastEnergyCalc) / 3600000.0f;  // hours
    totalEnergy += currentPower * dt;
  }
  lastEnergyCalc = now;

  // 5. Threshold check
  if (now - lastCommandCheck >= 500) {  // check every 500ms
    checkThreshold();
  }

  // 6. Heartbeat
  if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeat = now;
    updateHeartbeat();
  }

  // 7. Upload live metrics
  if (now - lastMetricsUpload >= METRICS_UPLOAD_INTERVAL_MS) {
    lastMetricsUpload = now;
    uploadMetrics();
  }

  // 8. Upload power log to Firestore
  if (now - lastLogUpload >= LOG_UPLOAD_INTERVAL_MS) {
    lastLogUpload = now;
    uploadPowerLog();
  }

  // 9. Update OLED
  if (now - lastDisplayUpdate >= DISPLAY_UPDATE_INTERVAL_MS) {
    lastDisplayUpdate = now;
    updateDisplay();
  }

  delay(50);
}

// ============================================================
//  WiFi
// ============================================================
void connectWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi connected: " + WiFi.localIP().toString());
    digitalWrite(LED_PIN, HIGH);
  } else {
    Serial.println("\n❌ WiFi failed — will retry in loop");
  }
}

// ============================================================
//  Firebase Init
// ============================================================
void initFirebase() {
  config.api_key           = FIREBASE_API_KEY;
  config.database_url      = FIREBASE_HOST;
  auth.user.email          = FIREBASE_USER_EMAIL;
  auth.user.password       = FIREBASE_USER_PASSWORD;
  config.token_status_callback = tokenStatusCallback;

  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  Firebase.RTDB.setMaxRetry(&fbdo, 3);
  Firebase.RTDB.setMaxErrorQueue(&fbdo, 30);
}

// ============================================================
//  Relay Control
// ============================================================
void controlRelay(bool state, bool manual) {
  switchState = state;
  if (manual) manualOverride = true;

  // Active-LOW relay: LOW = ON, HIGH = OFF
  digitalWrite(RELAY_PIN, state ? LOW : HIGH);
  Serial.println(String("Relay: ") + (state ? "ON" : "OFF") + (manual ? " [manual]" : " [auto]"));

  // Update switch state in RTDB
  Firebase.RTDB.setBool(&fbdo, devPath + "/switchState", state);
  Firebase.RTDB.setBool(&fbdo, devPath + "/manualOverride", manualOverride);
}

// ============================================================
//  Physical Button (debounced)
// ============================================================
void checkPhysicalButton() {
  bool reading = digitalRead(BUTTON_PIN);
  if (reading == LOW && lastButtonState == HIGH) {
    delay(50);  // debounce
    if (digitalRead(BUTTON_PIN) == LOW) {
      controlRelay(!switchState, true);  // manual toggle
      Serial.println("Physical button pressed");
    }
  }
  lastButtonState = reading;
}

// ============================================================
//  Remote Switch Command
// ============================================================
void checkRemoteSwitch() {
  if (!Firebase.ready()) return;

  if (Firebase.RTDB.getBool(&fbdo, devPath + "/switchState")) {
    bool remoteState = fbdo.boolData();
    if (Firebase.RTDB.getBool(&fbdo, devPath + "/manualOverride")) {
      manualOverride = fbdo.boolData();
    }

    // Apply remote command if different from current state
    if (remoteState != switchState) {
      switchState = remoteState;
      digitalWrite(RELAY_PIN, switchState ? LOW : HIGH);
      Serial.println("Remote command: " + String(switchState ? "ON" : "OFF"));
    }
  }
}

// ============================================================
//  Schedule Check
// ============================================================
void readScheduleFromDB() {
  if (Firebase.RTDB.getBool(&fbdo, devPath + "/schedule/enabled")) {
    scheduleEnabled = fbdo.boolData();
  }
  if (Firebase.RTDB.getInt(&fbdo, devPath + "/schedule/shutdownTimestamp")) {
    shutdownTimestamp = fbdo.intData();
  }
}

void checkSchedule() {
  if (!scheduleEnabled || shutdownTimestamp == 0 || manualOverride) return;

  // Get current Unix time (ms)
  unsigned long now = millis();
  // Note: For real time you should sync NTP. Using a simplified comparison here.
  // The app sets shutdownTimestamp in ms. Compare with Firebase server time.
  // For production: sync NTP and use configTime()

  // Re-read schedule periodically from DB
  static unsigned long lastScheduleRead = 0;
  if (millis() - lastScheduleRead > 30000) {
    lastScheduleRead = millis();
    readScheduleFromDB();
  }
}

// ============================================================
//  Threshold Check
// ============================================================
void readThresholdFromDB() {
  if (Firebase.RTDB.getBool(&fbdo, devPath + "/threshold/enabled")) {
    thresholdEnabled = fbdo.boolData();
  }
  if (Firebase.RTDB.getFloat(&fbdo, devPath + "/threshold/value")) {
    thresholdValue = fbdo.floatData();
  }
  if (Firebase.RTDB.getString(&fbdo, devPath + "/threshold/unit")) {
    thresholdUnit = fbdo.stringData();
  }
  if (Firebase.RTDB.getString(&fbdo, devPath + "/threshold/action")) {
    thresholdAction = fbdo.stringData();
  }
}

void checkThreshold() {
  if (!thresholdEnabled) return;

  float compareEnergy = totalEnergy;
  float compareThreshold = thresholdValue;

  if (thresholdUnit == "kWh") {
    compareEnergy   /= 1000.0f;
  }

  if (compareEnergy >= compareThreshold) {
    Serial.println("⚠️ Threshold reached: " + String(compareEnergy) + " " + thresholdUnit);

    if (thresholdAction == "turnoff" || thresholdAction == "both") {
      if (switchState) {
        controlRelay(false, false);
        Serial.println("Threshold: Device turned OFF");
      }
    }

    // Reset threshold to prevent repeated triggers
    thresholdEnabled = false;
    Firebase.RTDB.setBool(&fbdo, devPath + "/threshold/enabled", false);
  }
}

// ============================================================
//  Sensor Reading — Voltage (ZMPT101B)
// ============================================================
float readVoltage() {
  long sum = 0;
  int samples = 500;
  for (int i = 0; i < samples; i++) {
    int val = analogRead(ZMPT101B_PIN);
    sum += val;
  }
  float avg = sum / (float)samples;
  float voltRms = (avg / ADC_RESOLUTION) * ADC_VREF * ZMPT_CALIBRATION;
  return max(0.0f, voltRms);
}

// ============================================================
//  Sensor Reading — Current (ACS712)
// ============================================================
float readCurrent() {
  long sum = 0;
  int samples = 1000;
  for (int i = 0; i < samples; i++) {
    int val = analogRead(ACS712_PIN);
    float v = (val / ADC_RESOLUTION) * ADC_VREF;
    float diff = v - ACS712_VREF;
    sum += (long)(diff * diff * 1000000);
  }
  float rmsSquared = sum / (float)samples / 1000000.0f;
  float amps = sqrt(rmsSquared) / ACS712_SENSITIVITY;
  if (amps < 0.05f) amps = 0.0f;  // dead zone
  return amps;
}

// ============================================================
//  Heartbeat
// ============================================================
void updateHeartbeat() {
  if (!Firebase.ready()) return;
  Firebase.RTDB.setTimestamp(&fbdo, devPath + "/heartbeat");
}

// ============================================================
//  Upload Live Metrics
// ============================================================
void uploadMetrics() {
  if (!Firebase.ready()) return;

  FirebaseJson json;
  json.set("voltage",      voltage);
  json.set("current",      current);
  json.set("currentPower", currentPower);
  json.set("totalEnergy",  totalEnergy);

  Firebase.RTDB.setJSON(&fbdo, devPath + "/live", &json);
}

// ============================================================
//  Upload Power Log to Firestore
// ============================================================
void uploadPowerLog() {
  if (!Firebase.ready()) return;

  FirebaseJson content;
  FirebaseJson fields;

  // Build Firestore document fields
  fields.set("deviceId/stringValue", String(DEVICE_ID));
  fields.set("voltage/doubleValue",  voltage);
  fields.set("current/doubleValue",  current);
  fields.set("power/doubleValue",    currentPower);
  fields.set("totalEnergy/doubleValue", totalEnergy);

  // Timestamp value
  char tsStr[50];
  sprintf(tsStr, "%lu", (unsigned long)(millis() / 1000));
  fields.set("timestamp/integerValue", String(millis()));

  content.set("fields", fields);

  String docPath = "projects/" + String(FIREBASE_PROJECT_ID) + "/databases/(default)/documents/power_logs";
  Firebase.Firestore.createDocument(&fbdo, FIREBASE_PROJECT_ID, "", "power_logs", "", content.raw());

  Serial.println("📊 Power log uploaded");
}

// ============================================================
//  OLED Display
// ============================================================
void updateDisplay() {
  display.clearDisplay();

  // Header
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("Smart Power Meter");
  display.drawLine(0, 9, 127, 9, SSD1306_WHITE);

  // Status
  display.setCursor(0, 12);
  display.print("Status: ");
  display.println(switchState ? "ON " : "OFF");

  // Metrics
  display.setCursor(0, 22);
  display.print("V: ");
  display.print(voltage, 1);
  display.print("V  A: ");
  display.print(current, 2);

  display.setCursor(0, 32);
  display.print("P: ");
  display.print(currentPower, 1);
  display.print(" W");

  display.setCursor(0, 42);
  display.print("E: ");
  if (totalEnergy >= 1000) {
    display.print(totalEnergy / 1000.0f, 3);
    display.print(" kWh");
  } else {
    display.print(totalEnergy, 1);
    display.print(" Wh");
  }

  // WiFi indicator
  display.setCursor(100, 0);
  display.println(WiFi.status() == WL_CONNECTED ? "WiFi" : "----");

  display.display();
}
