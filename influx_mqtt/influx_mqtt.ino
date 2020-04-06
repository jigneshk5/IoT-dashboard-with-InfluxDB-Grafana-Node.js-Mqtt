#include <ESP8266WiFi.h>
#include <MQTT.h>
#include <Servo.h>

WiFiClient net;
MQTTClient client;
Servo myservo;  // create servo object to control a servo

String ssid="Redmi";
String pass="12345678";
String authId="nfphf0k8ohkydj";
unsigned long lastMillis = 0;

const int red= D5;
const int green= D6;
const int trigPin = D3;
const int echoPin = D4;

void connect() {
  Serial.print("checking wifi...");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(1000);
  }

  Serial.print("\nconnecting...");
  while (!client.connect("nodemcu_client")) {
    Serial.print(".");
    delay(1000);
  }
  Serial.println("\nconnected!");

  client.subscribe(authId+"/red_led");
  client.subscribe(authId+"/servo");
  client.subscribe(authId+"/green_led");
}

void messageReceived(String &topic, String &payload) {
  Serial.println("incoming: " + topic + " - " + payload);
  if(topic==authId+"/red_led"){
    if(payload=="ON")
      digitalWrite(red,HIGH);
    else
      digitalWrite(red,LOW);
  }
  if(topic==authId+"/green_led"){
    if(payload=="ON")
      digitalWrite(green,HIGH);
    else
      digitalWrite(green,LOW);
  }
  if(topic==authId+"/servo"){
        int pos = payload.toInt();
        Serial.println("SERVO POSITION: "+String(pos));
        myservo.write(pos);              // tell servo to go to position in variable 'pos'
  }

  // Note: Do not use the client in the callback to publish, subscribe or
  // unsubscribe as it may cause deadlocks when other things arrive while
  // sending and receiving acknowledgments. Instead, change a global variable,
  // or push to a queue and handle it in the loop after calling `client.loop()`.
}

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, pass);
  pinMode(A0, INPUT); 
  pinMode(red, OUTPUT);
  pinMode(green, OUTPUT);
  pinMode(trigPin, OUTPUT);  // Sets the trigPin as an Output
  pinMode(echoPin, INPUT);  // Sets the echoPin as an Input

  myservo.attach(D8);  // attaches the servo on D8 to the servo object
  
  // Note: Local domain names (e.g. "Computer.local" on OSX) are not supported
  // by Arduino. You need to set the IP address directly.
  client.begin("192.168.43.125", net);
  client.onMessage(messageReceived);

  connect();
}

void loop() {
  client.loop();
  delay(5000);  // <- fixes some issues with WiFi stability

  if (!client.connected()) {
    connect();
  }

  // publish a message roughly every second.
  if (millis() - lastMillis > 1000) {
    lastMillis = millis();
    int ldr = analogRead(A0);   // read the ldr input on analog pin 0
    int dist = triggerRadar(trigPin, echoPin);
    Serial.println("LDR: "+String(ldr)+" || Dist: "+String(dist));

    client.publish(authId+"/nodemcu","{\"ldr\":"+String(ldr)+", \"dist\":"+String(dist)+"}");           //{"ldr":514, "dist":99}
//    client.publish("ldr",String(ldr));
//    client.publish("ultrasonic",String(dist));
  
  }
}

int triggerRadar(int trigPin, int echoPin){
  String dist;
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH);
  int d = duration*0.0343/2;
  return d;
}
