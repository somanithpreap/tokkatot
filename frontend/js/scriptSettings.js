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

// Initialize the application
async function initializeToggles() {
    try {
        const response = await fetch("/api/get-initial-state");
        if (!response.ok) {
            throw new Error("Failed to fetch initial state.");
        }

        let data = await response.json();
        data = JSON.parse(data.data);
        
        // Store current state
        currentState = { ...data };

        // Initialize toggles based on the fetched data
        updateUI(data);
        
        console.log("Initial state loaded:", data);
    } catch (error) {
        console.error("Error initializing toggles:", error);
        showNotification("Failed to initialize toggles.", "error");
    }
}

// Improved updateUI function with state comparison
function updateUI(newState) {
    // Only update if state has actually changed
    if (JSON.stringify(currentState) === JSON.stringify(newState)) {
        return; // No changes needed
    }
    
    // Prevent recursive updates
    if (isUpdating) return;
    isUpdating = true;

    try {
        // Update mode toggles
        if (autoModeToggle.checked !== newState.automation) {
            autoModeToggle.checked = newState.automation;
        }

        // Update device toggles only if they've changed
        if (beltToggle.checked !== newState.belt) {
            beltToggle.checked = newState.belt;
        }
        if (fanToggle.checked !== newState.fan) {
            fanToggle.checked = newState.fan;
        }
        if (lightToggle.checked !== newState.lightbulb) {
            lightToggle.checked = newState.lightbulb;
        }
        if (feederToggle.checked !== newState.feeder) {
            feederToggle.checked = newState.feeder;
        }
        if (waterToggle.checked !== newState.water) {
            waterToggle.checked = newState.water;
        }

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
    beltToggle.disabled = disabled;
    fanToggle.disabled = disabled;
    lightToggle.disabled = disabled;
    feederToggle.disabled = disabled;
    waterToggle.disabled = disabled;
}

// Improved polling with better error handling and debouncing
async function fetchCurrentState() {
    try {
        const response = await fetch("/api/get-initial-state");
        if (!response.ok) {
            throw new Error("Failed to fetch current state.");
        }

        let data = await response.json();
        data = JSON.parse(data.data);
        
        // Only update UI if state has changed
        updateUI(data);
        
    } catch (error) {
        console.error("Error fetching state:", error);
        // Don't show notification for every polling error to avoid spam
    }
}

// Start/Stop polling functions
function startPolling() {
    if (pollingInterval) return; // Already polling
    
    // Poll every 3 seconds instead of 1 second to reduce server load
    pollingInterval = setInterval(fetchCurrentState, 3000);
    console.log("Started state polling");
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        console.log("Stopped state polling");
    }
}

// Improved toggle handlers with better error handling
async function handleModeToggle(endpoint, state) {
    if (isUpdating) return; // Prevent multiple simultaneous updates
    
    try {
        isUpdating = true;
        
        const response = await fetch(endpoint, {
            method: "GET",
        });

        if (!response.ok) {
            throw new Error(`Failed to toggle ${endpoint}.`);
        }

        let result = await response.json();
        result = JSON.parse(result.state);

        console.log(`Toggled ${endpoint}: `, result);
        
        // Update the automation state in currentState
        currentState.automation = result;
        updateManualControlsState(result);

        showNotification(`Auto Mode ${state ? "enabled" : "disabled"}.`, "success");
        
        // Force a state refresh after successful toggle
        setTimeout(fetchCurrentState, 500);
        
    } catch (error) {
        console.error(`Error toggling ${endpoint}:`, error);
        showNotification("Failed to update Auto Mode toggle.", "error");

        // Revert the toggle state on error
        autoModeToggle.checked = !state;
    } finally {
        isUpdating = false;
    }
}

async function handleImmediateToggle(endpoint, state, toggleElement) {
    if (isUpdating) return; // Prevent multiple simultaneous updates
    
    try {
        isUpdating = true;
        
        const response = await fetch(endpoint, {
            method: "GET",
        });

        if (!response.ok) {
            throw new Error(`Failed to toggle ${endpoint}.`);
        }

        let result = await response.json();
        result = JSON.parse(result.state);

        // Update the specific device state in currentState
        const deviceName = endpoint.split("-")[1];
        const stateKey = deviceName === "bulb" ? "lightbulb" : deviceName;
        currentState[stateKey] = result;

        // Ensure the UI reflects the actual state from the backend
        toggleElement.checked = result;

        const deviceDisplayName = deviceName.charAt(0).toUpperCase() + deviceName.slice(1);
        showNotification(
            `${deviceDisplayName} ${result ? "turned on" : "turned off"}.`,
            "success"
        );
        
        // Force a state refresh after successful toggle
        setTimeout(fetchCurrentState, 500);
        
    } catch (error) {
        console.error(`Error toggling ${endpoint}:`, error);
        showNotification("Failed to update device state.", "error");

        // Revert the toggle state on error
        toggleElement.checked = !state;
    } finally {
        isUpdating = false;
    }
}

// Helper function to display notifications with improved UX
function showNotification(message, type) {
    notification.textContent = message;
    notification.className = `notification ${type}`;
    
    // Clear any existing timeout
    if (notification.timeoutId) {
        clearTimeout(notification.timeoutId);
    }
    
    // Set new timeout
    notification.timeoutId = setTimeout(() => {
        notification.className = "notification";
        notification.timeoutId = null;
    }, 3000);
}

// Page visibility API to pause/resume polling when tab is not active
function handleVisibilityChange() {
    if (document.hidden) {
        stopPolling();
    } else {
        startPolling();
        // Fetch current state immediately when tab becomes active
        fetchCurrentState();
    }
}

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    console.log("Initializing smart poultry farming system...");
    
    // Initialize the application
    initializeToggles();

    // Auto mode toggle event listener
    autoModeToggle.addEventListener("change", () => {
        handleModeToggle("/api/toggle-auto", autoModeToggle.checked);
    });

    // Attach event listeners for device toggles
    beltToggle.addEventListener("change", () => {
        handleImmediateToggle("/api/toggle-belt", beltToggle.checked, beltToggle);
    });
    
    fanToggle.addEventListener("change", () => {
        handleImmediateToggle("/api/toggle-fan", fanToggle.checked, fanToggle);
    });
    
    lightToggle.addEventListener("change", () => {
        handleImmediateToggle("/api/toggle-bulb", lightToggle.checked, lightToggle);
    });
    
    feederToggle.addEventListener("change", () => {
        handleImmediateToggle("/api/toggle-feeder", feederToggle.checked, feederToggle);
    });
    
    waterToggle.addEventListener("change", () => {
        handleImmediateToggle("/api/toggle-water", waterToggle.checked, waterToggle);
    });

    // Start polling for state updates
    startPolling();
    
    // Handle page visibility changes to optimize polling
    document.addEventListener("visibilitychange", handleVisibilityChange);
});

// Cleanup when page is unloaded
window.addEventListener("beforeunload", () => {
    stopPolling();
});