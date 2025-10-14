// ===============================================
// SETTINGS PAGE MANAGEMENT
// ===============================================

/**
 * Smart Poultry Settings Management
 * Handles device control toggles, automation modes, and system settings
 */

// ===============================================
// DOM ELEMENTS AND STATE
// ===============================================

let settingsElements = {};
let isPageLoading = false;
let pollingInterval = null;

// Configuration constants
const SETTINGS_CONFIG = {
    POLLING_INTERVAL: 5000,      // 5 seconds for state synchronization
    NOTIFICATION_TIMEOUT: 4000,  // 4 seconds for notifications
    REQUEST_TIMEOUT: 8000,       // 8 seconds for API requests
    API_ENDPOINTS: {
        INITIAL_STATE: '/api/get-initial-state',
        AUTO_MODE: '/api/toggle-auto',
        BELT: '/api/toggle-belt',
        FAN: '/api/toggle-fan',
        LIGHT: '/api/toggle-bulb',
        FEEDER: '/api/toggle-feeder',
        WATER: '/api/toggle-water',
        SCHEDULE: '/api/schedule'
    }
};

// ===============================================
// INITIALIZATION
// ===============================================

/**
 * Initialize settings page when DOM is loaded
 */
document.addEventListener("DOMContentLoaded", initializeSettings);

/**
 * Initialize all settings functionality
 */
async function initializeSettings() {
    try {
        isPageLoading = true;
        
        cacheSettingsElements();
        setupEventListeners();
        await loadInitialSettings();
        setupPeriodicSync();
        
        console.log("Settings page initialized successfully");
        
    } catch (error) {
        console.error("Failed to initialize settings page:", error);
        handleInitializationError();
    } finally {
        isPageLoading = false;
    }
}

/**
 * Cache DOM elements for better performance
 */
function cacheSettingsElements() {
    settingsElements = {
        // Mode toggles
        autoModeToggle: document.getElementById("autoModeToggle"),
        
        // Device toggles
        beltToggle: document.getElementById("beltToggle"),
        fanToggle: document.getElementById("fanToggle"),
        lightToggle: document.getElementById("lightToggle"),
        feederToggle: document.getElementById("feedToggle"),
        waterToggle: document.getElementById("waterToggle"),
        
        // Notification system
        notification: document.getElementById("notification"),
        
        // Status indicators
        connectionStatus: document.querySelector('.connection-status'),
        lastUpdateTime: document.querySelector('.last-update')
    };
    
    // Verify critical elements exist
    const requiredElements = ['autoModeToggle', 'notification'];
    requiredElements.forEach(elementKey => {
        if (!settingsElements[elementKey]) {
            throw new Error(`Required element '${elementKey}' not found`);
        }
    });
}

// ===============================================
// EVENT LISTENERS SETUP
// ===============================================

/**
 * Setup all event listeners for settings functionality
 */
function setupEventListeners() {
    // Auto mode toggle with enhanced handling
    if (settingsElements.autoModeToggle) {
        settingsElements.autoModeToggle.addEventListener("change", handleAutoModeChange);
    }
    
    // Device control toggles
    const deviceMappings = [
        { element: settingsElements.beltToggle, endpoint: SETTINGS_CONFIG.API_ENDPOINTS.BELT, name: "សំពៅ" },
        { element: settingsElements.fanToggle, endpoint: SETTINGS_CONFIG.API_ENDPOINTS.FAN, name: "កង្ហារ" },
        { element: settingsElements.lightToggle, endpoint: SETTINGS_CONFIG.API_ENDPOINTS.LIGHT, name: "ភ្លើង" },
        { element: settingsElements.feederToggle, endpoint: SETTINGS_CONFIG.API_ENDPOINTS.FEEDER, name: "ម្ជូរអាហារ" },
        { element: settingsElements.waterToggle, endpoint: SETTINGS_CONFIG.API_ENDPOINTS.WATER, name: "ទឹក" }
    ];
    
    deviceMappings.forEach(({ element, endpoint, name }) => {
        if (element) {
            element.addEventListener("change", (event) => {
                handleDeviceToggle(endpoint, event.target.checked, name, element);
            });
        }
    });
    
    // Page visibility handling for performance
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    // Cleanup on page unload
    window.addEventListener("beforeunload", cleanup);
}

// ===============================================
// AUTO MODE HANDLING
// ===============================================

/**
 * Handle auto mode toggle changes
 * @param {Event} event - Toggle change event
 */
async function handleAutoModeChange(event) {
    const isAutoMode = event.target.checked;
    
    try {
        setLoadingState(true);
        
        await toggleAutoMode(isAutoMode);
        
        if (isAutoMode) {
            await disableAllManualControls();
            showNotification("ម៉ូដស្វ័យប្រវត្តិត្រូវបានបើក។ ការគ្រប់គ្រងដោយដៃទាំងអស់ត្រូវបានបិទ។", "success");
        } else {
            showNotification("ម៉ូដស្វ័យប្រវត្តិត្រូវបានបិទ។", "info");
        }
        
    } catch (error) {
        console.error("Error handling auto mode change:", error);
        handleAutoModeError(error, isAutoMode);
    } finally {
        setLoadingState(false);
    }
}

/**
 * Toggle auto mode on the backend
 * @param {boolean} state - Auto mode state
 */
async function toggleAutoMode(state) {
    const response = await fetchWithTimeout(SETTINGS_CONFIG.API_ENDPOINTS.AUTO_MODE, {
        method: 'GET'
    });
    
    if (!response.ok) {
        throw new Error(`Failed to toggle auto mode: ${response.status} ${response.statusText}`);
    }
    
    let result = await response.json();
    if (typeof result.state === 'string') {
        result = JSON.parse(result.state);
    }
    
    console.log("Auto mode toggle result:", result);
    return result;
}

/**
 * Disable all manual control toggles when auto mode is enabled
 */
async function disableAllManualControls() {
    const controlElements = [
        settingsElements.beltToggle,
        settingsElements.fanToggle,
        settingsElements.lightToggle,
        settingsElements.feederToggle,
        settingsElements.waterToggle
    ].filter(Boolean);
    
    // Update UI immediately
    controlElements.forEach(element => {
        element.checked = false;
    });
    
    // Send backend requests to disable devices
    const disablePromises = [
        handleDeviceToggleAPI(SETTINGS_CONFIG.API_ENDPOINTS.BELT, false),
        handleDeviceToggleAPI(SETTINGS_CONFIG.API_ENDPOINTS.FAN, false),
        handleDeviceToggleAPI(SETTINGS_CONFIG.API_ENDPOINTS.LIGHT, false),
        handleDeviceToggleAPI(SETTINGS_CONFIG.API_ENDPOINTS.FEEDER, false),
        handleDeviceToggleAPI(SETTINGS_CONFIG.API_ENDPOINTS.WATER, false)
    ];
    
    try {
        await Promise.all(disablePromises);
    } catch (error) {
        console.warn("Some devices may not have been disabled properly:", error);
    }
}

// ===============================================
// DEVICE CONTROL HANDLING
// ===============================================

/**
 * Handle individual device toggle changes
 * @param {string} endpoint - API endpoint
 * @param {boolean} state - Device state
 * @param {string} deviceName - Device name in Khmer
 * @param {HTMLElement} toggleElement - Toggle element
 */
async function handleDeviceToggle(endpoint, state, deviceName, toggleElement) {
    // Prevent device control when auto mode is enabled
    if (settingsElements.autoModeToggle?.checked) {
        toggleElement.checked = !state; // Revert the toggle
        showNotification("មិនអាចគ្រប់គ្រងឧបករណ៍ដោយដៃនៅពេលម៉ូដស្វ័យប្រវត្តិកំពុងដំណើរការ", "warning");
        return;
    }
    
    try {
        setDeviceLoadingState(toggleElement, true);
        
        await handleDeviceToggleAPI(endpoint, state);
        
        const statusText = state ? "បើក" : "បិទ";
        showNotification(`${deviceName}ត្រូវបាន${statusText}`, "success");
        
    } catch (error) {
        console.error(`Error toggling device ${endpoint}:`, error);
        handleDeviceToggleError(error, toggleElement, state, deviceName);
    } finally {
        setDeviceLoadingState(toggleElement, false);
    }
}

/**
 * Handle device toggle API call
 * @param {string} endpoint - API endpoint
 * @param {boolean} state - Device state
 */
async function handleDeviceToggleAPI(endpoint, state) {
    const response = await fetchWithTimeout(endpoint, {
        method: 'GET'
    });
    
    if (!response.ok) {
        throw new Error(`Failed to toggle device: ${response.status} ${response.statusText}`);
    }
    
    let result = await response.json();
    if (typeof result.state === 'string') {
        result = JSON.parse(result.state);
    }
    
    console.log(`Device toggle result for ${endpoint}:`, result);
    return result;
}

// ===============================================
// SETTINGS DATA MANAGEMENT
// ===============================================

/**
 * Load initial settings from the backend
 */
async function loadInitialSettings() {
    try {
        const response = await fetchWithTimeout(SETTINGS_CONFIG.API_ENDPOINTS.INITIAL_STATE);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch initial state: ${response.status} ${response.statusText}`);
        }
        
        let data = await response.json();
        
        // Handle different response formats
        if (typeof data.data === 'string') {
            data = JSON.parse(data.data);
        } else if (data.data) {
            data = data.data;
        }
        
        console.log("Fetched initial settings state:", data);
        updateSettingsUI(data);
        updateConnectionStatus(true);
        
    } catch (error) {
        console.error("Error loading initial settings:", error);
        handleSettingsLoadError(error);
    }
}

/**
 * Update the settings UI based on retrieved data
 * @param {Object} data - Settings state data
 */
function updateSettingsUI(data) {
    try {
        // Update mode toggles
        if (settingsElements.autoModeToggle && data.automation !== undefined) {
            settingsElements.autoModeToggle.checked = data.automation;
        }
        
        // Update device toggles
        const deviceMappings = [
            { element: settingsElements.beltToggle, dataKey: 'belt' },
            { element: settingsElements.fanToggle, dataKey: 'fan' },
            { element: settingsElements.lightToggle, dataKey: 'lightbulb' },
            { element: settingsElements.feederToggle, dataKey: 'feeder' },
            { element: settingsElements.waterToggle, dataKey: 'water' }
        ];
        
        deviceMappings.forEach(({ element, dataKey }) => {
            if (element && data[dataKey] !== undefined) {
                element.checked = data[dataKey];
            }
        });
        
        updateLastUpdateTime();
        
    } catch (error) {
        console.error("Error updating settings UI:", error);
    }
}

// ===============================================
// PERIODIC SYNCHRONIZATION
// ===============================================

/**
 * Setup periodic state synchronization
 */
function setupPeriodicSync() {
    // Clear existing interval
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
    
    // Setup new interval for state synchronization
    pollingInterval = setInterval(() => {
        if (!document.hidden && !isPageLoading) {
            syncSettingsState();
        }
    }, SETTINGS_CONFIG.POLLING_INTERVAL);
}

/**
 * Synchronize settings state with backend
 */
async function syncSettingsState() {
    try {
        const response = await fetchWithTimeout(SETTINGS_CONFIG.API_ENDPOINTS.INITIAL_STATE);
        
        if (!response.ok) {
            console.warn("Failed to sync settings state");
            updateConnectionStatus(false);
            return;
        }
        
        let data = await response.json();
        if (typeof data.data === 'string') {
            data = JSON.parse(data.data);
        } else if (data.data) {
            data = data.data;
        }
        
        updateSettingsUI(data);
        updateConnectionStatus(true);
        
    } catch (error) {
        console.warn("Error syncing settings state:", error);
        updateConnectionStatus(false);
    }
}

// ===============================================
// UI STATE MANAGEMENT
// ===============================================

/**
 * Set loading state for the entire page
 * @param {boolean} loading - Loading state
 */
function setLoadingState(loading) {
    const controls = document.querySelectorAll('input[type="checkbox"], button');
    controls.forEach(control => {
        control.disabled = loading;
    });
    
    if (loading) {
        document.body.classList.add('loading');
    } else {
        document.body.classList.remove('loading');
    }
}

/**
 * Set loading state for a specific device
 * @param {HTMLElement} toggleElement - Toggle element
 * @param {boolean} loading - Loading state
 */
function setDeviceLoadingState(toggleElement, loading) {
    if (!toggleElement) return;
    
    toggleElement.disabled = loading;
    
    const parent = toggleElement.closest('.device-control');
    if (parent) {
        if (loading) {
            parent.classList.add('loading');
        } else {
            parent.classList.remove('loading');
        }
    }
}

/**
 * Update connection status indicator
 * @param {boolean} connected - Connection status
 */
function updateConnectionStatus(connected) {
    if (settingsElements.connectionStatus) {
        settingsElements.connectionStatus.className = `connection-status ${connected ? 'online' : 'offline'}`;
        settingsElements.connectionStatus.textContent = connected ? 'តភ្ជាប់' : 'ផ្តាច់';
    }
}

/**
 * Update last update time display
 */
function updateLastUpdateTime() {
    if (settingsElements.lastUpdateTime) {
        const now = new Date();
        settingsElements.lastUpdateTime.textContent = `ធ្វើឱ្យទាន់សម័យចុងក្រោយ: ${now.toLocaleTimeString('km-KH')}`;
    }
}

// ===============================================
// NOTIFICATION SYSTEM
// ===============================================

/**
 * Display notification message to user
 * @param {string} message - Message to display
 * @param {string} type - Notification type (success, error, warning, info)
 */
function showNotification(message, type = "success") {
    try {
        if (!settingsElements.notification) {
            console.warn("Notification element not found");
            return;
        }
        
        settingsElements.notification.textContent = message;
        settingsElements.notification.className = `notification ${type} show`;
        
        // Auto-hide notification
        setTimeout(() => {
            if (settingsElements.notification) {
                settingsElements.notification.classList.remove("show");
            }
        }, SETTINGS_CONFIG.NOTIFICATION_TIMEOUT);
        
    } catch (error) {
        console.error("Error showing notification:", error);
    }
}

// ===============================================
// ERROR HANDLING
// ===============================================

/**
 * Handle initialization errors
 */
function handleInitializationError() {
    showNotification("មានបញ្ហាក្នុងការផ្ទុកការកំណត់", "error");
    
    // Show fallback UI
    const container = document.querySelector('.settings-container');
    if (container) {
        container.innerHTML += `
            <div class="error-state">
                <p>មានបញ្ហាក្នុងការផ្ទុកការកំណត់។ សូមបញ្ជាក់ការតភ្ជាប់អ៊ីនធឺណិត។</p>
                <button onclick="location.reload()">ព្យាយាមម្តងទៀត</button>
            </div>
        `;
    }
}

/**
 * Handle auto mode toggle errors
 * @param {Error} error - Error object
 * @param {boolean} intendedState - Intended auto mode state
 */
function handleAutoModeError(error, intendedState) {
    // Revert the toggle state
    if (settingsElements.autoModeToggle) {
        settingsElements.autoModeToggle.checked = !intendedState;
    }
    
    let message = "មានបញ្ហាក្នុងការផ្លាស់ប្តូរម៉ូដស្វ័យប្រវត្តិ";
    
    if (error.name === 'TimeoutError') {
        message = "ការតភ្ជាប់យឺត។ សូមព្យាយាមម្តងទៀត";
    }
    
    showNotification(message, "error");
}

/**
 * Handle device toggle errors
 * @param {Error} error - Error object
 * @param {HTMLElement} toggleElement - Toggle element
 * @param {boolean} intendedState - Intended device state
 * @param {string} deviceName - Device name
 */
function handleDeviceToggleError(error, toggleElement, intendedState, deviceName) {
    // Revert the toggle state
    if (toggleElement) {
        toggleElement.checked = !intendedState;
    }
    
    let message = `មានបញ្ហាក្នុងការគ្រប់គ្រង${deviceName}`;
    
    if (error.name === 'TimeoutError') {
        message = "ការតភ្ជាប់យឺត។ សូមព្យាយាមម្តងទៀត";
    } else if (error.message.includes('404')) {
        message = "ឧបករណ៍មិនដំណើរការ";
    }
    
    showNotification(message, "error");
}

/**
 * Handle settings loading errors
 * @param {Error} error - Error object
 */
function handleSettingsLoadError(error) {
    updateConnectionStatus(false);
    
    let message = "មិនអាចទាញយកការកំណត់បាន";
    
    if (error.name === 'TimeoutError') {
        message = "ការតភ្ជាប់អ៊ីនធឺណិតយឺត";
    }
    
    showNotification(message, "error");
}

// ===============================================
// PAGE LIFECYCLE MANAGEMENT
// ===============================================

/**
 * Handle page visibility changes
 */
function handleVisibilityChange() {
    if (document.hidden) {
        // Page is hidden, pause polling
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    } else {
        // Page is visible, resume polling
        setupPeriodicSync();
        syncSettingsState();
    }
}

/**
 * Cleanup resources before page unload
 */
function cleanup() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

// ===============================================
// UTILITY FUNCTIONS
// ===============================================

/**
 * Fetch with timeout support
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise} Fetch promise with timeout
 */
async function fetchWithTimeout(url, options = {}, timeout = SETTINGS_CONFIG.REQUEST_TIMEOUT) {
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('TimeoutError')), timeout);
    });
    
    return Promise.race([
        fetch(url, options),
        timeoutPromise
    ]);
}

