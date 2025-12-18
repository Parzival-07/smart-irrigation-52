# Smart Irrigation Dashboard

A real-time IoT-based smart irrigation monitoring and control system with a modern web dashboard.  This project connects to ESP32 devices via MQTT to monitor soil conditions and automatically manage irrigation systems based on crop-specific requirements.

## Features

### Real-Time Monitoring
- **Soil Moisture Monitoring** - Track soil moisture levels with analog sensor readings (0-4095)
- **Soil Temperature Tracking** - Monitor soil temperature in real-time
- **Air Humidity Measurement** - Keep track of ambient humidity levels
- **Live Data Visualization** - Interactive charts showing historical sensor data

### Smart Controls
- **Manual Irrigation Control** - Manually trigger the water pump when needed
- **Cooling System** - Activate cooling systems during high temperature conditions
- **Humidifier Control** - Toggle humidifier on/off with visual feedback

### Crop-Specific Settings
Pre-configured thresholds for different crops and seasons:
- **Crops**: Wheat, Corn, Rice, Sugarcane, Cotton
- **Seasons**: Summer, Monsoon, Winter, Autumn
- Automatic threshold adjustment based on selected crop and season

### Intelligent Alerts
- Low soil moisture warnings
- High temperature alerts
- Low humidity notifications
- Critical condition indicators

### Data Visualization
- Real-time sensor history charts
- Separate graphs for moisture, temperature, and humidity
- Visual gauge indicators for quick status checks
- Color-coded status indicators (green for optimal, red for action needed)

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Charting**: Chart.js
- **Communication**: MQTT over WebSocket
- **Broker**: HiveMQ Cloud
- **IoT Device**: ESP32 microcontroller
- **Sensors**: 
  - Capacitive soil moisture sensor
  - Soil temperature sensor
  - DHT humidity sensor

## Prerequisites

- Modern web browser with WebSocket support
- ESP32 device with appropriate sensors
- HiveMQ Cloud account (or any MQTT broker)
- Internet connection for MQTT communication

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/Parzival-07/smart-irrigation-52.git
cd smart-irrigation-52
```

### 2. Configure MQTT Settings
Edit `script.js` and update the MQTT connection settings: 

```javascript
const options = {
  clean: true,
  connectTimeout:  4000,
  clientId: 'web_dashboard_' + Math.random().toString(16).substr(2, 8),
  username: 'YOUR_MQTT_USERNAME',
  password: 'YOUR_MQTT_PASSWORD',
};

const host = 'wss://YOUR_BROKER_URL: 8884/mqtt';
```

### 3. Open the Dashboard
Simply open `index.html` in your web browser, or serve it using a local web server: 

```bash
# Using Python 3
python -m http.server 8000

# Using Node. js http-server
npx http-server
```

Then navigate to `http://localhost:8000`

## MQTT Topics

The dashboard uses the following MQTT topics: 

| Topic | Direction | Description |
|-------|-----------|-------------|
| `esp32/smart-irrigation/data` | Subscribe | Receives sensor data from ESP32 |
| `esp32/control` | Publish | Sends control commands (water, cool) |
| `esp32/config` | Publish | Sends threshold configurations |

### Data Format

**Sensor Data** (from ESP32):
```json
{
  "moisture": 2500,
  "temperature": 28.5,
  "humidity":  65.2
}
```

**Configuration Data** (to ESP32):
```json
{
  "moisture":  2500,
  "temperature": 28,
  "humidity": 45,
  "season": "summer",
  "crop": "wheat"
}
```

## Crop Thresholds

The system includes pre-configured thresholds optimized for different crops and seasons: 

| Crop | Summer | Monsoon | Winter | Autumn |
|------|--------|---------|--------|--------|
| **Wheat** | 2500/28°C/45% | 2300/26°C/60% | 2600/22°C/50% | 2500/25°C/55% |
| **Corn** | 2700/32°C/50% | 2500/29°C/65% | 2800/24°C/45% | 2700/28°C/50% |
| **Rice** | 2900/30°C/60% | 2800/28°C/75% | 3000/26°C/55% | 2900/27°C/60% |
| **Sugarcane** | 2800/33°C/65% | 2600/30°C/70% | 2700/27°C/60% | 2650/29°C/65% |
| **Cotton** | 2600/35°C/40% | 2400/31°C/55% | 2650/25°C/35% | 2550/30°C/45% |

*Format:  Moisture threshold / Temperature threshold / Humidity threshold*

## Features Breakdown

### Connection Status Indicator
- **Green**: Connected to MQTT broker
- **Yellow**: Connecting... 
- **Red**: Disconnected

### Sensor Cards
Each sensor card displays:
- Current value
- Visual gauge bar
- Status indicator (Optimal/Action needed)
- Real-time updates

### Control Buttons
- **Water Now**: Triggers immediate irrigation
- **Cool Now**: Activates cooling system
- **Humidifier Toggle**: Turns humidifier on/off with persistent state

## Responsive Design

The dashboard features a modern, responsive design with:
- Clean, professional UI
- Smooth animations and transitions
- Color-coded alerts and status indicators
- Mobile-friendly layout

date the MQTT credentials in `script.js` before deploying to production. Never commit sensitive credentials to public repositories. 
