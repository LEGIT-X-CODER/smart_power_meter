#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <addons/TokenHelper.h>
#include <addons/RTDBHelper.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <math.h>

// ---------------- WIFI ----------------
#define WIFI_SSID "Nitro1"
#define WIFI_PASSWORD "password"

// ---------------- FIREBASE ----------------
#define FIREBASE_API_KEY "AIzaSyA7O47MgXjq--BX28pVK9eI5HaNkYbHu1Y"
#define FIREBASE_HOST "smart-home-bc589-default-rtdb.asia-southeast1.firebasedatabase.app"
#define FIREBASE_PROJECT_ID "smart-home-bc589"

#define FIREBASE_USER_EMAIL "device@yourapp.com"
#define FIREBASE_USER_PASSWORD "password@123"

// ---------------- DEVICE ----------------
#define DEVICE_ID "SPM-A1B2C3"

// ---------------- PINS ----------------
#define RELAY_PIN    26
#define BUTTON_ON    15
#define BUTTON_OFF   23
#define ACS712_PIN   25
#define ZMPT_PIN     33
#define LED_PIN      2

#define OLED_SDA     27
#define OLED_SCL     14
#define OLED_ADDR    0x3C

// ---------------- OLED ----------------
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// ---------------- ADC ----------------
#define ADC_VREF 3.3
#define ADC_RESOLUTION 4095.0

#define ACS712_VREF 2.24
#define ACS712_SENSITIVITY 0.185

#define ZMPT_CALIBRATION 330.0

// ---------------- TIMERS ----------------
#define HEARTBEAT_INTERVAL 20000
#define METRIC_UPLOAD_INTERVAL 3000
#define FIRESTORE_UPLOAD_INTERVAL 60000
#define DISPLAY_INTERVAL 1000
#define COMMAND_INTERVAL 1000

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

String devPath = "/devices/" + String(DEVICE_ID);

bool switchState = false;
bool manualOverride = false;

bool scheduleEnabled = false;
unsigned long shutdownTimestamp = 0;

bool thresholdEnabled = false;
float thresholdValue = 5000;
String thresholdAction = "notify";
String thresholdUnit = "Wh";

float voltage = 0;
float current = 0;
float currentPower = 0;
float totalEnergy = 0;

unsigned long lastHeartbeat = 0;
unsigned long lastMetrics = 0;
unsigned long lastFirestore = 0;
unsigned long lastDisplay = 0;
unsigned long lastCommand = 0;
unsigned long lastEnergyCalc = 0;

// ---------------- LED HELPERS ----------------
void blinkLED(int times,int onDelay,int offDelay){
  for(int i=0;i<times;i++){
    digitalWrite(LED_PIN,HIGH);
    delay(onDelay);
    digitalWrite(LED_PIN,LOW);
    delay(offDelay);
  }
}

void wifiBlink(){
  digitalWrite(LED_PIN,!digitalRead(LED_PIN));
}

void dataBlink(){
  blinkLED(2,100,100);
}

// ---------------- WIFI ----------------
void connectWiFi(){
  Serial.println("Connecting WiFi...");
  WiFi.begin(WIFI_SSID,WIFI_PASSWORD);

  while(WiFi.status()!=WL_CONNECTED){
    wifiBlink();
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Connected");
  Serial.println(WiFi.localIP());

  digitalWrite(LED_PIN,HIGH);
}

// ---------------- FIREBASE ----------------
void initFirebase(){
  blinkLED(3,300,300);

  config.api_key = FIREBASE_API_KEY;
  config.database_url = FIREBASE_HOST;

  auth.user.email = FIREBASE_USER_EMAIL;
  auth.user.password = FIREBASE_USER_PASSWORD;

  config.token_status_callback = tokenStatusCallback;

  Firebase.begin(&config,&auth);
  Firebase.reconnectWiFi(true);

  Serial.println("Firebase Connected");
}

// ---------------- RELAY ----------------
void controlRelay(bool state,bool manual){
  switchState = state;

  if(manual){
    manualOverride = true;
  }

  // Active LOW relay
  if(state){
    digitalWrite(RELAY_PIN,LOW);
  }
  else{
    digitalWrite(RELAY_PIN,HIGH);
  }

  Firebase.RTDB.setBool(&fbdo,devPath+"/switchState",state);
  Firebase.RTDB.setBool(&fbdo,devPath+"/manualOverride",manualOverride);

  Serial.println(state ? "Relay ON" : "Relay OFF");
}

// ---------------- BUTTONS ----------------
void checkButtons(){
  static bool lastOn = HIGH;
  static bool lastOff = HIGH;

  bool curOn = digitalRead(BUTTON_ON);
  bool curOff = digitalRead(BUTTON_OFF);

  if(curOn==LOW && lastOn==HIGH){
    delay(50);
    if(digitalRead(BUTTON_ON)==LOW){
      controlRelay(true,true);
      Serial.println("ON Button Pressed");
    }
  }

  if(curOff==LOW && lastOff==HIGH){
    delay(50);
    if(digitalRead(BUTTON_OFF)==LOW){
      controlRelay(false,true);
      Serial.println("OFF Button Pressed");
    }
  }

  lastOn = curOn;
  lastOff = curOff;
}

// ---------------- REMOTE CONTROL ----------------
void checkRemoteCommand(){
  if(!Firebase.ready()) return;

  if(Firebase.RTDB.getBool(&fbdo,devPath+"/switchState")){
    bool remoteState = fbdo.boolData();

    if(remoteState!=switchState){
      manualOverride=false;
      Firebase.RTDB.setBool(&fbdo,devPath+"/manualOverride",false);

      controlRelay(remoteState,false);

      Serial.println("Remote command executed");
    }
  }
}

// ---------------- VOLTAGE ----------------
float readVoltage(){
  long sumSq=0;
  int samples=1000;

  for(int i=0;i<samples;i++){
    int val=analogRead(ZMPT_PIN);

    float adcVoltage=(val/ADC_RESOLUTION)*ADC_VREF;
    float centered=adcVoltage-(ADC_VREF/2.0);

    sumSq+=(long)(centered*centered*1000000);

    delayMicroseconds(100);
  }

  float rms=sqrt((sumSq/(float)samples)/1000000.0);
  float actualVoltage=rms*ZMPT_CALIBRATION;

  if(actualVoltage<5) actualVoltage=0;

  return actualVoltage;
}

// ---------------- CURRENT ----------------
float readCurrent(){
  const int samples = 500;

  float sumSq = 0;

  for(int i=0;i<samples;i++){
    int raw = analogRead(ACS712_PIN);

    float sensorVoltage = (raw * ADC_VREF) / ADC_RESOLUTION;

    float diff = sensorVoltage - ACS712_VREF;

    sumSq += diff * diff;

    delayMicroseconds(200);
  }

  float rmsVoltage = sqrt(sumSq / samples);

  float amps = rmsVoltage / ACS712_SENSITIVITY;

  // remove noise floor
  if(amps < 0.15){
    amps = 0;
  }

  return amps;
}
// ---------------- HEARTBEAT ----------------
void updateHeartbeat(){
  if(!Firebase.ready()) return;

  dataBlink();
  Firebase.RTDB.setTimestamp(&fbdo,devPath+"/heartbeat");

  Serial.println("Heartbeat Updated");
}

// ---------------- METRICS ----------------
void uploadMetrics(){
  if(!Firebase.ready()) return;

  dataBlink();

  FirebaseJson json;
  json.set("voltage",voltage);
  json.set("current",current);
  json.set("currentPower",currentPower);
  json.set("totalEnergy",totalEnergy);

  Firebase.RTDB.setJSON(&fbdo,devPath+"/live",&json);

  Serial.println("Metrics Uploaded");
}

// ---------------- FIRESTORE ----------------
void uploadPowerLog(){
  if(!Firebase.ready()) return;

  dataBlink();

  FirebaseJson content;
  FirebaseJson fields;

  fields.set("deviceId/stringValue",String(DEVICE_ID));
  fields.set("voltage/doubleValue",voltage);
  fields.set("current/doubleValue",current);
  fields.set("power/doubleValue",currentPower);
  fields.set("totalEnergy/doubleValue",totalEnergy);
  fields.set("timestamp/integerValue",String(millis()/1000));

  content.set("fields",fields);

  String documentId = String(DEVICE_ID)+"_"+String(millis());

  bool success = Firebase.Firestore.createDocument(
    &fbdo,
    FIREBASE_PROJECT_ID,
    "",
    "power_logs",
    documentId.c_str(),
    content.raw(),
    ""
  );

  if(success){
    Serial.println("Firestore log uploaded");
  }else{
    Serial.println("Firestore upload failed");
    Serial.println(fbdo.errorReason());
  }
}

// ---------------- OLED ----------------
void updateDisplay(){
  display.clearDisplay();

  display.setTextSize(1);
  display.setTextColor(WHITE);

  display.setCursor(0,0);
  display.println("Smart Power Meter");

  display.setCursor(0,15);
  display.print("V:");
  display.print(voltage,1);

  display.setCursor(0,28);
  display.print("A:");
  display.print(current,2);

  display.setCursor(0,41);
  display.print("P:");
  display.print(currentPower,1);

  display.setCursor(0,54);
  display.print("E:");

  if(totalEnergy>=1000){
    display.print(totalEnergy/1000.0,2);
    display.print("kWh");
  }else{
    display.print(totalEnergy,1);
    display.print("Wh");
  }

  display.display();
}

// ---------------- SETUP ----------------
void setup(){
  Serial.begin(115200);

  analogSetAttenuation(ADC_11db);

  pinMode(RELAY_PIN,OUTPUT);
  pinMode(BUTTON_ON,INPUT_PULLUP);
  pinMode(BUTTON_OFF,INPUT_PULLUP);
  pinMode(LED_PIN,OUTPUT);

  digitalWrite(RELAY_PIN,HIGH);

  blinkLED(5,100,100);

  Wire.begin(OLED_SDA,OLED_SCL);

  if(display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)){
    display.clearDisplay();
    display.display();
  }

  connectWiFi();
  initFirebase();

  digitalWrite(LED_PIN,HIGH);

  Serial.println("System Ready");
}

// ---------------- LOOP ----------------
void loop(){

  if(WiFi.status()!=WL_CONNECTED){
    connectWiFi();
  }

  unsigned long now = millis();

  checkButtons();

  if(now-lastCommand>=COMMAND_INTERVAL){
    lastCommand=now;
    checkRemoteCommand();
  }

  voltage=readVoltage();
  current=readCurrent();
  currentPower=voltage*current;

  if(lastEnergyCalc>0 && switchState){
    float dt=(now-lastEnergyCalc)/3600000.0;
    totalEnergy += currentPower*dt;
  }

  lastEnergyCalc=now;

  if(now-lastHeartbeat>=HEARTBEAT_INTERVAL){
    lastHeartbeat=now;
    updateHeartbeat();
  }

  if(now-lastMetrics>=METRIC_UPLOAD_INTERVAL){
    lastMetrics=now;
    uploadMetrics();
  }

  if(now-lastFirestore>=FIRESTORE_UPLOAD_INTERVAL){
    lastFirestore=now;
    uploadPowerLog();
  }

  if(now-lastDisplay>=DISPLAY_INTERVAL){
    lastDisplay=now;
    updateDisplay();
  }

  delay(50);
}