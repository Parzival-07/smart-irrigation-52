// MQTT connection settings
const options = {
  clean: true,
  connectTimeout: 4000,
  clientId: 'web_dashboard_' + Math.random().toString(16).substr(2, 8),
  username: 'Parzival-07',
  password: 'Kavish@0',
};

const host = 'wss://eb650229e04e466e9b336512be1cbfa4.s1.eu.hivemq.cloud:8884/mqtt';
const client = mqtt.connect(host, options);

// Global variables
let humidifierOn = false;
let sensorHistory = {
  moisture: [],
  temperature: [],
  humidity: [],
  labels: []
};
let chart;
const MAX_HISTORY_POINTS = 10;

// Crop and season specific thresholds
const thresholds = {
  summer: {
    wheat: { moisture: 2500, temperature: 28, humidity: 45 },
    corn: { moisture: 2700, temperature: 32, humidity: 50 },
    rice: { moisture: 2900, temperature: 30, humidity: 60 },
    sugarcane: { moisture: 2800, temperature: 33, humidity: 65 },
    cotton: { moisture: 2600, temperature: 35, humidity: 40 }
  },
  monsoon: {
    wheat: { moisture: 2300, temperature: 26, humidity: 60 },
    corn: { moisture: 2500, temperature: 29, humidity: 65 },
    rice: { moisture: 2800, temperature: 28, humidity: 75 },
    sugarcane: { moisture: 2600, temperature: 30, humidity: 70 },
    cotton: { moisture: 2400, temperature: 31, humidity: 55 }
  },
  winter: {
    wheat: { moisture: 2600, temperature: 22, humidity: 50 },
    corn: { moisture: 2800, temperature: 24, humidity: 45 },
    rice: { moisture: 3000, temperature: 26, humidity: 55 },
    sugarcane: { moisture: 2700, temperature: 27, humidity: 60 },
    cotton: { moisture: 2650, temperature: 25, humidity: 35 }
  },
  autumn: {
    wheat: { moisture: 2500, temperature: 25, humidity: 55 },
    corn: { moisture: 2700, temperature: 28, humidity: 50 },
    rice: { moisture: 2900, temperature: 27, humidity: 60 },
    sugarcane: { moisture: 2650, temperature: 29, humidity: 65 },
    cotton: { moisture: 2550, temperature: 30, humidity: 45 }
  }
};

// Initialize the chart when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeChart();
  updateThresholds();
});

// MQTT client events
client.on('connect', () => {
  console.log('Connected to HiveMQ WebSocket');
  updateConnectionStatus('connected', 'Connected to MQTT broker');
  client.subscribe('esp32/smart-irrigation/data', (err) => {
    if (!err) console.log('Subscribed to data topic');
  });
});

client.on('message', (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    console.log('Received data:', data);
    
    // Update the UI with the received data
    updateSensorValues(data);
    
    // Check for alerts
    checkAlerts(data);
    
    // Update history and chart
    updateHistory(data);
    
  } catch (e) {
    console.error('Invalid JSON:', e);
  }
});

client.on('error', err => {
  console.error('Connection error:', err);
  updateConnectionStatus('disconnected', 'Connection error: ' + err.message);
});

client.on('offline', () => {
  console.log('Client went offline');
  updateConnectionStatus('disconnected', 'Disconnected');
});

// Update connection status indicator
function updateConnectionStatus(status, message) {
  const indicator = document.getElementById('status-indicator');
  const text = document.getElementById('status-text');
  
  indicator.className = 'status-dot ' + status;
  text.textContent = message;
}

// Send command to ESP32
function sendCommand(command) {
  client.publish('esp32/control', command);
  console.log('Sent command:', command);
  
  // Show temporary feedback for the button
  const buttons = {
    'water': document.querySelector('.water-btn'),
    'cool': document.querySelector('.cool-btn')
  };
  
  if (buttons[command]) {
    const btn = buttons[command];
    const originalText = btn.innerHTML;
    
    btn.innerHTML = 'Sending...';
    btn.disabled = true;
    
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }, 2000);
  }
}

// Toggle humidifier state
function toggleHumidifier() {
  humidifierOn = !humidifierOn;
  const btn = document.getElementById('humidifier-btn');
  
  if (humidifierOn) {
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg> Turn Off';
    btn.classList.add('active');
    console.log('Humidifier turned ON');
  } else {
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" /></svg> Turn On';
    btn.classList.remove('active');
    console.log('Humidifier turned OFF');
  }
}

// Update the updateThresholds function to send new thresholds to ESP32
function updateThresholds() {
  const season = document.getElementById('season').value;
  const crop = document.getElementById('crop').value;
  
  const newThresholds = thresholds[season][crop];
  
  // Update UI with new thresholds
  document.getElementById('moisture-threshold').textContent = newThresholds.moisture;
  document.getElementById('temp-threshold').textContent = newThresholds.temperature + '°C';
  document.getElementById('humidity-threshold').textContent = newThresholds.humidity + '%';
  
  // Send thresholds to ESP32 via MQTT
  const configPayload = JSON.stringify({
    moisture: newThresholds.moisture,
    temperature: newThresholds.temperature,
    humidity: newThresholds.humidity,
    season: season,
    crop: crop
  });
  
  // Only send if connected
  if (client.connected) {
    client.publish('esp32/config', configPayload);
    console.log('Sent new thresholds to ESP32:', configPayload);
    
    // Show temporary notification
    showNotification('Thresholds updated and sent to device');
  } else {
    console.error('Cannot send thresholds - MQTT not connected');
    showNotification('Failed to send thresholds - not connected', true);
  }
}

// Add this helper function to show notifications
function showNotification(message, isError = false) {
  // Create a notification element
  const notification = document.createElement('div');
  notification.className = 'notification ' + (isError ? 'error' : 'success');
  notification.innerHTML = `
    <div class="notification-icon">${isError ? '❌' : '✅'}</div>
    <div class="notification-message">${message}</div>
  `;
  
  // Add to the page
  document.body.appendChild(notification);
  
  // Slide in animation
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Remove after a delay
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Updated checkAlerts function
function checkAlerts(data) {
  const alertsContainer = document.getElementById('alerts-container');
  const season = document.getElementById('season').value;
  const crop = document.getElementById('crop').value;
  const currentThresholds = thresholds[season][crop];
  
  // Clear existing alerts
  alertsContainer.innerHTML = '';
  
  // Check humidity for humidifier warning
  if (data.humidity < currentThresholds.humidity) {
    const alert = document.createElement('div');
    alert.className = 'alert';
    alert.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
      <span>Low humidity detected! Consider turning on the humidifier.</span>
    `;
    alertsContainer.appendChild(alert);
  }
  
  // Check for soil moisture issues - Only show alert for dry soil
  // For moisture, HIGHER values mean DRIER soil
  if (data.moisture > currentThresholds.moisture + 300) {
    // When moisture value is high (soil is dry)
    const alert = document.createElement('div');
    alert.className = 'alert critical';
    alert.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
      </svg>
      <span>Critical soil moisture level! Soil too dry - plant may be at risk.</span>
    `;
    alertsContainer.appendChild(alert);
  }
  // Removed the "soil moisture is very high" alert section
  
  // Check for high temperature alert
  if (data.temperature > currentThresholds.temperature + 5) {
    const alert = document.createElement('div');
    alert.className = 'alert critical';
    alert.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
      </svg>
      <span>Extremely high soil temperature detected! Cooling recommended.</span>
    `;
    alertsContainer.appendChild(alert);
  }
}

// Update sensor values on the dashboard
function updateSensorValues(data) {
  const season = document.getElementById('season').value;
  const crop = document.getElementById('crop').value;
  const currentThresholds = thresholds[season][crop];
  
  // Update moisture
  const moistureElement = document.getElementById('moisture');
  const moistureGauge = document.getElementById('moisture-gauge');
  const moistureStatus = document.getElementById('moisture-status');
  
  moistureElement.textContent = data.moisture;
  
  // ESP32 analog values are 0-4095, with 4095 being dry and 0 being wet
  // Higher values mean less moisture, so we need to adjust our gauge accordingly
  const moisturePercent = Math.max(0, Math.min(100, (data.moisture / 4095) * 100));
  moistureGauge.style.width = `${100 - moisturePercent}%`; // Invert for gauge

  // For moisture, HIGHER values mean DRIER soil, so we compare differently
  if (data.moisture > currentThresholds.moisture) {
    moistureElement.style.color = '#e74c3c';
    moistureStatus.textContent = 'Low - Watering needed';
    moistureStatus.style.color = '#e74c3c';
  } else {
    moistureElement.style.color = '#2ecc71';
    moistureStatus.textContent = 'Optimal';
    moistureStatus.style.color = '#2ecc71';
  }
  
  // Update temperature
  const tempElement = document.getElementById('temperature');
  const tempGauge = document.getElementById('temperature-gauge');
  const tempStatus = document.getElementById('temperature-status');
  
  tempElement.textContent = data.temperature.toFixed(1) + ' °C';
  
  // For temperature gauge: 0-50°C range
  const tempPercent = Math.max(0, Math.min(100, (data.temperature / 50) * 100));
  tempGauge.style.width = `${tempPercent}%`;
  
  if (data.temperature > currentThresholds.temperature) {
    tempElement.style.color = '#e74c3c';
    tempStatus.textContent = 'High - Cooling needed';
    tempStatus.style.color = '#e74c3c';
  } else {
    tempElement.style.color = '#2ecc71';
    tempStatus.textContent = 'Optimal';
    tempStatus.style.color = '#2ecc71';
  }
  
  // Update humidity
  const humidityElement = document.getElementById('humidity');
  const humidityGauge = document.getElementById('humidity-gauge');
  const humidityStatus = document.getElementById('humidity-status');
  
  humidityElement.textContent = data.humidity.toFixed(1) + ' %';
  
  // For humidity gauge: 0-100% range
  const humidityPercent = Math.max(0, Math.min(100, data.humidity));
  humidityGauge.style.width = `${humidityPercent}%`;
  
  if (data.humidity < currentThresholds.humidity) {
    humidityElement.style.color = '#e74c3c';
    humidityStatus.textContent = 'Low - Use humidifier';
    humidityStatus.style.color = '#e74c3c';
  } else {
    humidityElement.style.color = '#2ecc71';
    humidityStatus.textContent = 'Optimal';
    humidityStatus.style.color = '#2ecc71';
  }
}

// Replace the initializeChart function with this:
function initializeChart() {
  // Create moisture chart
  const moistureCtx = document.createElement('canvas');
  moistureCtx.id = 'moisture-chart';
  document.querySelector('.chart-container').appendChild(moistureCtx);
  
  // Create temperature chart
  const temperatureCtx = document.createElement('canvas');
  temperatureCtx.id = 'temperature-chart';
  document.querySelector('.chart-container').appendChild(temperatureCtx);
  
  // Create humidity chart
  const humidityCtx = document.createElement('canvas');
  humidityCtx.id = 'humidity-chart';
  document.querySelector('.chart-container').appendChild(humidityCtx);
  
  // Style the container to accommodate multiple charts
  document.querySelector('.chart-container').style.display = 'grid';
  document.querySelector('.chart-container').style.gridTemplateColumns = '1fr';
  document.querySelector('.chart-container').style.gap = '30px';
  
  // Initialize the moisture chart
  chart = {
    moisture: new Chart(document.getElementById('moisture-chart').getContext('2d'), {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Soil Moisture',
          data: [],
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 3
        }]
      },
      options: createChartOptions('Moisture Level (0-4095)', true)
    }),
    
    temperature: new Chart(document.getElementById('temperature-chart').getContext('2d'), {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Temperature',
          data: [],
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 3
        }]
      },
      options: createChartOptions('Temperature (°C)')
    }),
    
    humidity: new Chart(document.getElementById('humidity-chart').getContext('2d'), {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Humidity',
          data: [],
          borderColor: '#9b59b6',
          backgroundColor: 'rgba(155, 89, 182, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          pointRadius: 3
        }]
      },
      options: createChartOptions('Humidity (%)')
    })
  };
}

// Add this helper function for chart options
function createChartOptions(yAxisTitle, reversed = false) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: yAxisTitle,
        font: {
          size: 16,
          weight: 'normal'
        },
        padding: {
          bottom: 10
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 0
        }
      },
      y: {
        reverse: reversed,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      }
    }
  };
}

// Update the updateHistory function
function updateHistory(data) {
  const now = new Date();
  const timeLabel = now.getHours().toString().padStart(2, '0') + ":" + 
                    now.getMinutes().toString().padStart(2, '0');
  
  // Add new data points
  sensorHistory.labels.push(timeLabel);
  sensorHistory.moisture.push(data.moisture);
  sensorHistory.temperature.push(data.temperature);
  sensorHistory.humidity.push(data.humidity);
  
  // Limit the number of points
  if (sensorHistory.labels.length > MAX_HISTORY_POINTS) {
    sensorHistory.labels.shift();
    sensorHistory.moisture.shift();
    sensorHistory.temperature.shift();
    sensorHistory.humidity.shift();
  }
  
  // Update all charts
  chart.moisture.data.labels = sensorHistory.labels;
  chart.moisture.data.datasets[0].data = sensorHistory.moisture;
  chart.moisture.update();
  
  chart.temperature.data.labels = sensorHistory.labels;
  chart.temperature.data.datasets[0].data = sensorHistory.temperature;
  chart.temperature.update();
  
  chart.humidity.data.labels = sensorHistory.labels;
  chart.humidity.data.datasets[0].data = sensorHistory.humidity;
  chart.humidity.update();
}