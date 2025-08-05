// DOM Elements
const autoModeToggle = document.getElementById("autoModeToggle");
const beltToggle = document.getElementById("beltToggle");
const fanToggle = document.getElementById("fanToggle");
const lightToggle = document.getElementById("lightToggle");
const feederToggle = document.getElementById("feedToggle");
const waterToggle = document.getElementById("waterToggle");
const notification = document.getElementById("notification");

// State management
let currentState = {};
let isUpdating = false;
let pollingInterval = null;
let connectionStatus = 'unknown';

// Network status tracking
function updateConnectionStatus(status) {
    connectionStatus = status;
    console.log(`Connection status: ${status}`);
    
    // You can add visual indicator here
    if (status === 'offline') {
        showNotification("Connection lost. Retrying...", "error");
    } else if (status === 'online') {
        showNotification("Connection restored", "success");
    }
}

// Improved fetch with timeout and retry logic
async function fetchWithRetry(url, options = {}, retries = 3, timeout = 5000) {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`Attempt ${i + 1} fetching: ${url}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            updateConnectionStatus('online');
            return response;
            
        } catch (error) {
            console.error(`Fetch attempt ${i + 1} failed:`, error.message);
            
            if (error.name === 'AbortError') {
                console.log('Request timed out');
            }
            
            if (i === retries - 1) {
                updateConnectionStatus('offline');
                throw error;
            }
            
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
    }
}

// Initialize the application
async function initializeToggles() {
    try {
        console.log("Initializing toggles...");
        showNotification("Connecting to system...", "info");
        
        const response = await fetchWithRetry("/api/get-initial-state");
        let data = await response.json();
        
        console.log("Raw initial data:", data);
        
        // Handle different response formats
        if (typeof data === 'string') {
            data = JSON.parse(data);
        }
        if (data.data) {
            data = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
        }
        
        console.log("Parsed initial data:", data);
        
        // Store current state
        currentState = { ...data };

        // Initialize toggles based on the fetched data
        updateUI(data);
        
        showNotification("System connected successfully", "success");
        
    } catch (error) {
        console.error("Error initializing toggles:", error);
        showNotification(`Failed to connect: ${error.message}`, "error");
        
        // Set default state if connection fails
        const defaultState = {
            automation: false,
            belt: false,
            fan: false,
            lightbulb: false,
            feeder: false,
            water: false
        };
        updateUI(defaultState);
    }
}

// Improved updateUI function with state comparison
function updateUI(newState) {
    console.log("Updating UI with state:", newState);
    
    // Prevent recursive updates
    if (isUpdating) {
        console.log("Update skipped - already updating");
        return;
    }
    
    isUpdating = true;

    try {
        // Update mode toggles
        if (autoModeToggle && autoModeToggle.checked !== newState.automation) {
            autoModeToggle.checked = newState.automation;
            console.log(`Auto mode updated: ${newState.automation}`);
        }

        // Update device toggles
        const deviceMappings = [
            { element: beltToggle, key: 'belt' },
            { element: fanToggle, key: 'fan' },
            { element: lightToggle, key: 'lightbulb' },
            { element: feederToggle, key: 'feeder' },
            { element: waterToggle, key: 'water' }
        ];

        deviceMappings.forEach(({ element, key }) => {
            if (element && element.checked !== newState[key]) {
                element.checked = newState[key];
                console.log(`${key} updated: ${newState[key]}`);
            }
        });

        // Update manual controls state
        updateManualControlsState(newState.automation);
        
        // Update current state
        currentState = { ...newState };
        
    } finally {
        isUpdating = false;
    }
}

// Disable manual controls when auto mode is ON
function updateManualControlsState(disabled) {
    const controls = [beltToggle, fanToggle, lightToggle, feederToggle, waterToggle];
    controls.forEach(control => {
        if (control) {
            control.disabled = disabled;
        }
    });
    console.log(`Manual controls ${disabled ? 'disabled' : 'enabled'}`);
}

// Improved polling with better error handling
async function fetchCurrentState() {
    try {
        const response = await fetchWithRetry("/api/get-initial-state");
        let data = await response.json();
        
        // Handle different response formats
        if (typeof data === 'string') {
            data = JSON.parse(data);
        }
        if (data.data) {
            data = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
        }
        
        // Only update UI if state has changed
        if (JSON.stringify(currentState) !== JSON.stringify(data)) {
            console.log("State changed, updating UI");
            updateUI(data);
        }
        
    } catch (error) {
        console.error("Error fetching state:", error);
        // Don't spam notifications for polling errors
    }
}

// Start/Stop polling functions
function startPolling() {
    if (pollingInterval) return;
    
    console.log("Starting state polling...");
    pollingInterval = setInterval(fetchCurrentState, 5000); // Increased to 5 seconds
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        console.log("Stopped state polling");
    }
}

// Improved toggle handlers with better error handling and debugging
async function handleModeToggle(endpoint, state) {
    if (isUpdating) {
        console.log("Mode toggle skipped - already updating");
        return;
    }
    
    console.log(`Toggling mode: ${endpoint} to ${state}`);
    
    try {
        isUpdating = true;
        showNotification("Updating auto mode...", "info");
        
        const response = await fetchWithRetry(endpoint, { method: "GET" });
        let result = await response.json();
        
        console.log("Raw mode toggle response:", result);
        
        // Handle different response formats
        if (result.state) {
            result = typeof result.state === 'string' ? JSON.parse(result.state) : result.state;
        }

        console.log(`Mode toggle result: ${result}`);
        
        // Update the automation state
        currentState.automation = result;
        updateManualControlsState(result);

        showNotification(`Auto Mode ${result ? "enabled" : "disabled"}`, "success");
        
        // Force a state refresh after successful toggle
        setTimeout(fetchCurrentState, 1000);
        
    } catch (error) {
        console.error(`Error toggling ${endpoint}:`, error);
        showNotification(`Failed to update Auto Mode: ${error.message}`, "error");

        // Revert the toggle state on error
        if (autoModeToggle) {
            autoModeToggle.checked = !state;
        }
    } finally {
        isUpdating = false;
    }
}

async function handleImmediateToggle(endpoint, state, toggleElement) {
    if (isUpdating) {
        console.log("Device toggle skipped - already updating");
        return;
    }
    
    console.log(`Toggling device: ${endpoint} to ${state}`);
    
    try {
        isUpdating = true;
        const deviceName = endpoint.split("-")[1];
        showNotification(`Updating ${deviceName}...`, "info");
        
        const response = await fetchWithRetry(endpoint, { method: "GET" });
        let result = await response.json();
        
        console.log("Raw device toggle response:", result);
        
        // Handle different response formats
        if (result.state) {
            result = typeof result.state === 'string' ? JSON.parse(result.state) : result.state;
        }

        console.log(`Device toggle result: ${result}`);

        // Update the specific device state
        const stateKey = deviceName === "bulb" ? "lightbulb" : deviceName;
        currentState[stateKey] = result;

        // Ensure the UI reflects the actual state from the backend
        if (toggleElement) {
            toggleElement.checked = result;
        }

        const deviceDisplayName = deviceName.charAt(0).toUpperCase() + deviceName.slice(1);
        showNotification(
            `${deviceDisplayName} ${result ? "turned on" : "turned off"}`,
            "success"
        );
        
        // Force a state refresh after successful toggle
        setTimeout(fetchCurrentState, 1000);
        
    } catch (error) {
        console.error(`Error toggling ${endpoint}:`, error);
        showNotification(`Failed to update device: ${error.message}`, "error");

        // Revert the toggle state on error
        if (toggleElement) {
            toggleElement.checked = !state;
        }
    } finally {
        isUpdating = false;
    }
}

// Helper function to display notifications with improved UX
function showNotification(message, type) {
    if (!notification) return;
    
    console.log(`Notification: ${message} (${type})`);
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    
    // Clear any existing timeout
    if (notification.timeoutId) {
        clearTimeout(notification.timeoutId);
    }
    
    // Set new timeout (longer for errors)
    const timeout = type === 'error' ? 5000 : 3000;
    notification.timeoutId = setTimeout(() => {
        notification.className = "notification";
        notification.timeoutId = null;
    }, timeout);
}

// Page visibility API to pause/resume polling when tab is not active
function handleVisibilityChange() {
    if (document.hidden) {
        stopPolling();
    } else {
        startPolling();
        // Fetch current state immediately when tab becomes active
        setTimeout(fetchCurrentState, 500);
    }
}

// Debug function to test API endpoints
async function testAPIEndpoints() {
    const endpoints = [
        "/api/get-initial-state",
        "/api/toggle-auto",
        "/api/toggle-belt",
        "/api/toggle-fan",
        "/api/toggle-bulb",
        "/api/toggle-feeder",
        "/api/toggle-water"
    ];
    
    console.log("Testing API endpoints...");
    
    for (const endpoint of endpoints) {
        try {
            const response = await fetchWithRetry(endpoint, { method: "GET" }, 1, 3000);
            console.log(`✅ ${endpoint}: OK`);
        } catch (error) {
            console.log(`❌ ${endpoint}: ${error.message}`);
        }
    }
}

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    console.log("Smart poultry farming system starting...");
    
    // Test API endpoints first
    testAPIEndpoints();
    
    // Initialize the application
    initializeToggles();

    // Auto mode toggle event listener
    if (autoModeToggle) {
        autoModeToggle.addEventListener("change", () => {
            handleModeToggle("/api/toggle-auto", autoModeToggle.checked);
        });
    }

    // Attach event listeners for device toggles
    const deviceListeners = [
        { element: beltToggle, endpoint: "/api/toggle-belt" },
        { element: fanToggle, endpoint: "/api/toggle-fan" },
        { element: lightToggle, endpoint: "/api/toggle-bulb" },
        { element: feederToggle, endpoint: "/api/toggle-feeder" },
        { element: waterToggle, endpoint: "/api/toggle-water" }
    ];

    deviceListeners.forEach(({ element, endpoint }) => {
        if (element) {
            element.addEventListener("change", () => {
                handleImmediateToggle(endpoint, element.checked, element);
            });
        }
    });

    // Start polling for state updates
    startPolling();
    
    // Handle page visibility changes to optimize polling
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    console.log("System initialization complete");
});

// Cleanup when page is unloaded
window.addEventListener("beforeunload", () => {
    stopPolling();
});

// Expose debug functions to console
window.debugPoultry = {
    testAPI: testAPIEndpoints,
    getCurrentState: () => currentState,
    getConnectionStatus: () => connectionStatus,
    forceRefresh: fetchCurrentState,
    startPolling,
    stopPolling
};