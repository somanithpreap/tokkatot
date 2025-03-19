// Configuration object for system settings
const CONFIG = {
    temperature: {
        min: 20,
        max: 25
    },
    humidity: {
        min: 40,
        max: 60
    },
    schedule: {
        lighting: {
            start: '06:00',
            end: '18:00'
        },
        feeding: ['07:00', '12:00', '17:00'],
        waterInterval: 60 // minutes
    }
};

// System state object
const systemState = {
    autoMode: false,
    scheduleMode: false,
    devices: {
        fan: false,
        light: false,
        feed: false,
        water: false
    },
    monitoring: null,
    scheduling: null
};

// DOM Elements
const autoModeToggle = document.getElementById('autoModeToggle');
const scheduleModeToggle = document.getElementById('scheduleModeToggle');
const fanToggle = document.getElementById('fanToggle');
const lightToggle = document.getElementById('lightToggle');
const feedToggle = document.getElementById('feedToggle');
const waterToggle = document.getElementById('waterToggle');
const scheduleModal = document.getElementById('scheduleModal');
const closeButton = document.querySelector('.close-button');
const saveScheduleBtn = document.getElementById('saveSchedule');
const cancelScheduleBtn = document.getElementById('cancelSchedule');
const addFeedingTimeBtn = document.getElementById('addFeedingTime');
const notification = document.getElementById('notification');

// Event Listeners
autoModeToggle.addEventListener('change', handleAutoMode);
scheduleModeToggle.addEventListener('change', handleScheduleMode);
fanToggle.addEventListener('change', () => handleDeviceToggle('fan'));
lightToggle.addEventListener('change', () => handleDeviceToggle('light'));
feedToggle.addEventListener('change', () => handleDeviceToggle('feed'));
waterToggle.addEventListener('change', () => handleDeviceToggle('water'));

closeButton.addEventListener('click', () => scheduleModal.style.display = 'none');
saveScheduleBtn.addEventListener('click', saveScheduleSettings);
cancelScheduleBtn.addEventListener('click', () => scheduleModal.style.display = 'none');
addFeedingTimeBtn.addEventListener('click', addFeedingTimeInput);

// Initialize the system
function initializeSystem() {
    // Load saved configuration if any
    loadConfiguration();
    
    // Update UI with current state
    updateUIState();
    
    // Start monitoring if auto mode was enabled
    if (systemState.autoMode) {
        startAutoMonitoring();
    }
    
    // Start scheduling if schedule mode was enabled
    if (systemState.scheduleMode) {
        startScheduling();
    }
}

// Auto Mode Functions
function handleAutoMode(event) {
    systemState.autoMode = event.target.checked;
    
    if (systemState.autoMode) {
        // Disable manual controls
        disableManualControls(true);
        startAutoMonitoring();
        showNotification('Auto mode enabled', 'success');
    } else {
        // Enable manual controls
        disableManualControls(false);
        stopAutoMonitoring();
        showNotification('Auto mode disabled', 'success');
    }
}

function startAutoMonitoring() {
    if (systemState.monitoring) return;
    
    systemState.monitoring = setInterval(async () => {
        try {
            const sensorData = await getSensorData();
            handleEnvironmentalControl(sensorData);
        } catch (error) {
            console.error('Error in auto monitoring:', error);
            showNotification('Error reading sensor data', 'error');
        }
    }, 30000); // Check every 30 seconds
}

function stopAutoMonitoring() {
    if (systemState.monitoring) {
        clearInterval(systemState.monitoring);
        systemState.monitoring = null;
    }
}

// Schedule Mode Functions
function handleScheduleMode(event) {
    systemState.scheduleMode = event.target.checked;
    
    if (systemState.scheduleMode) {
        startScheduling();
        showNotification('Schedule mode enabled', 'success');
        
        // Automatically open the schedule modal
        openScheduleModal();
    } else {
        stopScheduling();
        showNotification('Schedule mode disabled', 'success');
    }
}

function startScheduling() {
    if (systemState.scheduling) return;
    
    // Check schedule every minute
    systemState.scheduling = setInterval(() => {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        
        // Check lighting schedule
        handleLightingSchedule(currentTime);
        
        // Check feeding schedule
        handleFeedingSchedule(currentTime);
        
        // Check water system
        handleWaterSchedule(now);
    }, 60000);
}

function stopScheduling() {
    if (systemState.scheduling) {
        clearInterval(systemState.scheduling);
        systemState.scheduling = null;
    }
}

// Device Control Functions
async function handleDeviceToggle(device) {
    if (systemState.autoMode) return; // Prevent manual control in auto mode
    
    const toggle = document.getElementById(`${device}Toggle`);
    const newState = toggle.checked;
    
    try {
        await setDeviceState(device, newState);
        systemState.devices[device] = newState;
        showNotification(`${device} ${newState ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
        console.error(`Error toggling ${device}:`, error);
        toggle.checked = !newState; // Revert toggle state
        showNotification(`Failed to control ${device}`, 'error');
    }
}

// Environmental Control Functions
async function handleEnvironmentalControl(sensorData) {
    const { temperature, humidity } = sensorData;
    
    // Temperature control
    if (temperature > CONFIG.temperature.max) {
        await setDeviceState('fan', true);
    } else if (temperature < CONFIG.temperature.min) {
        await setDeviceState('fan', false);
    }
    
    // Update UI
    updateUIState();
}

// Schedule Control Functions
function handleLightingSchedule(currentTime) {
    const { start, end } = CONFIG.schedule.lighting;
    const shouldBeOn = currentTime >= start && currentTime <= end;
    
    if (systemState.devices.light !== shouldBeOn) {
        setDeviceState('light', shouldBeOn);
    }
}

function handleFeedingSchedule(currentTime) {
    if (CONFIG.schedule.feeding.includes(currentTime)) {
        setDeviceState('feed', true);
        // Turn off feed after 1 minute
        setTimeout(() => setDeviceState('feed', false), 60000);
    }
}

function handleWaterSchedule(now) {
    const minutes = now.getMinutes();
    if (minutes % CONFIG.schedule.waterInterval === 0) {
        setDeviceState('water', true);
        // Turn off water after 5 minutes
        setTimeout(() => setDeviceState('water', false), 300000);
    }
}

// UI Functions
function disableManualControls(disabled) {
    fanToggle.disabled = disabled;
    lightToggle.disabled = disabled;
    feedToggle.disabled = disabled;
    waterToggle.disabled = disabled;
}

function updateUIState() {
    // Update toggle states
    autoModeToggle.checked = systemState.autoMode;
    scheduleModeToggle.checked = systemState.scheduleMode;
    
    Object.entries(systemState.devices).forEach(([device, state]) => {
        const toggle = document.getElementById(`${device}Toggle`);
        if (toggle) toggle.checked = state;
    });
    
    // Update disabled states
    disableManualControls(systemState.autoMode);
}

function showNotification(message, type) {
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Schedule Modal Functions
function addFeedingTimeInput() {
    const feedingTimes = document.getElementById('feedingTimes');
    const newTime = document.createElement('div');
    newTime.className = 'feeding-time';
    newTime.innerHTML = `
        <input type="time" value="12:00">
        <button class="remove-time">Remove</button>
    `;
    
    newTime.querySelector('.remove-time').addEventListener('click', () => {
        newTime.remove();
    });
    
    feedingTimes.appendChild(newTime);
}

function saveScheduleSettings() {
    // Update lighting schedule
    CONFIG.schedule.lighting.start = document.getElementById('lightStart').value;
    CONFIG.schedule.lighting.end = document.getElementById('lightEnd').value;
    
    // Update feeding schedule
    const feedingInputs = document.querySelectorAll('#feedingTimes input[type="time"]');
    CONFIG.schedule.feeding = Array.from(feedingInputs).map(input => input.value);
    
    // Update water interval
    CONFIG.schedule.waterInterval = parseInt(document.getElementById('waterInterval').value);
    
    // Update temperature thresholds
    CONFIG.temperature.min = parseInt(document.getElementById('tempMin').value);
    CONFIG.temperature.max = parseInt(document.getElementById('tempMax').value);
    
    // Update humidity thresholds
    CONFIG.humidity.min = parseInt(document.getElementById('humidityMin').value);
    CONFIG.humidity.max = parseInt(document.getElementById('humidityMax').value);
    
    // Save configuration
    saveConfiguration();
    
    // Close modal and show notification
    scheduleModal.style.display = 'none';
    showNotification('Schedule settings saved', 'success');
}

// Configuration Persistence
function saveConfiguration() {
    try {
        localStorage.setItem('tokkatotConfig', JSON.stringify(CONFIG));
    } catch (error) {
        console.error('Error saving configuration:', error);
        showNotification('Failed to save configuration', 'error');
    }
}

function loadConfiguration() {
    try {
        const savedConfig = localStorage.getItem('tokkatotConfig');
        if (savedConfig) {
            Object.assign(CONFIG, JSON.parse(savedConfig));
        }
    } catch (error) {
        console.error('Error loading configuration:', error);
        showNotification('Failed to load configuration', 'error');
    }
}

// API Communication Functions
async function getSensorData() {
    try {
        const response = await fetch('http://localhost:5000/api/sensor-data');
        if (!response.ok) throw new Error('Failed to fetch sensor data');
        return await response.json();
    } catch (error) {
        console.error('Error fetching sensor data:', error);
        throw error;
    }
}

async function setDeviceState(device, state) {
    try {
        const response = await fetch('http://localhost:5000/api/control', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                device,
                state
            })
        });
        
        if (!response.ok) throw new Error(`Failed to set ${device} state`);
        
        // Update local state
        systemState.devices[device] = state;
        
        // Update UI
        const toggle = document.getElementById(`${device}Toggle`);
        if (toggle) toggle.checked = state;
        
    } catch (error) {
        console.error(`Error setting ${device} state:`, error);
        throw error;
    }
}

// Initialize the system when the page loads
window.addEventListener('load', initializeSystem);
