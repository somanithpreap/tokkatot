// Configuration for backend API base
const API_BASE = "/api";

// DOM Elements
const autoModeToggle = document.getElementById("autoModeToggle");
const scheduleModeToggle = document.getElementById("scheduleModeToggle");
const fanToggle = document.getElementById("fanToggle");
const lightToggle = document.getElementById("lightToggle");
const feederToggle = document.getElementById("feedToggle");
const waterToggle = document.getElementById("waterToggle");
const feedingTimesContainer = document.getElementById("feedingTimes");
const saveScheduleButton = document.getElementById("saveSchedule");
const notification = document.getElementById("notification");

// Initialize the system on page load
document.addEventListener("DOMContentLoaded", () => {
    // Fetch and display initial settings
    fetchInitialSettings();

    // Attach event listeners for toggles
    autoModeToggle.addEventListener("change", () =>
        handleModeToggle("toggle-auto", autoModeToggle.checked)
    );
    scheduleModeToggle.addEventListener("change", () =>
        handleModeToggle("toggle-schedule", scheduleModeToggle.checked)
    );

    // Attach event listeners for immediate toggles
    fanToggle.addEventListener("change", () =>
        handleImmediateToggle("fan", fanToggle.checked)
    );
    lightToggle.addEventListener("change", () =>
        handleImmediateToggle("bulb", lightToggle.checked)
    );
    feederToggle.addEventListener("change", () =>
        handleImmediateToggle("feeder", feederToggle.checked)
    );
    waterToggle.addEventListener("change", () =>
        handleImmediateToggle("water", waterToggle.checked)
    );

    // Attach event listener for saving schedule settings
    saveScheduleButton.addEventListener("click", saveScheduleSettings);
});

// Fetch initial settings state from the backend
async function fetchInitialSettings() {
    try {
        const response = await fetch(`${API_BASE}/get-initial-state`);
        if (!response.ok) {
            throw new Error("Failed to fetch initial state.");
        }

        const data = await response.json();
        console.log("Fetched initial state:", data);

        // Update the UI based on the fetched data
        updateUI(data);
    } catch (error) {
        console.error("Error fetching initial state:", error);
        showNotification("Unable to load initial settings!", "error");
    }
}

// Update the UI based on retrieved settings
function updateUI(data) {
    // Update mode toggles
    autoModeToggle.checked = data.autoMode;
    scheduleModeToggle.checked = data.scheduleMode;

    // Update immediate toggles
    fanToggle.checked = data.devices.fan;
    lightToggle.checked = data.devices.light;
    feederToggle.checked = data.devices.feed;
    waterToggle.checked = data.devices.water;

    // Update schedule settings
    document.getElementById("lightStart").value =
        data.schedule.lighting.start || "06:00";
    document.getElementById("lightEnd").value =
        data.schedule.lighting.end || "18:00";

    // Update feeding times
    feedingTimesContainer.innerHTML = ""; // Clear existing feeding times
    data.schedule.feeding.forEach((time) => addFeedingTimeInput(time));
}

// Handle toggling Auto or Schedule mode
async function handleModeToggle(endpoint, state) {
    try {
        const response = await fetch(`${API_BASE}/${endpoint}`, {
            method: "GET"
        });

        if (!response.ok) {
            throw new Error(`Failed to toggle ${endpoint}.`);
        }

        const result = await response.json();
        console.log(`Toggled ${endpoint}: `, result);

        showNotification(
            `${endpoint === "toggle-auto" ? "Auto Mode" : "Schedule Mode"} ${
                state ? "enabled" : "disabled"
            }.`,
            "success"
        );
    } catch (error) {
        console.error(`Error toggling ${endpoint}:`, error);
        showNotification("Failed to update mode toggle.", "error");

        // Revert the toggle state if the request failed
        if (endpoint === "toggle-auto") {
            autoModeToggle.checked = !state;
        } else if (endpoint === "toggle-schedule") {
            scheduleModeToggle.checked = !state;
        }
    }
}

// Handle immediate toggling of devices (fan, bulb, feeder, water)
async function handleImmediateToggle(device, state) {
    try {
        const response = await fetch(`${API_BASE}/toggle-${device}`, {
            method: "GET"
        });

        if (!response.ok) {
            throw new Error(`Failed to toggle ${device}.`);
        }

        const result = await response.json();
        console.log(`Toggled device ${device}:`, result);

        showNotification(
            `Device "${device}" is now ${state ? "ON" : "OFF"}.`,
            "success"
        );
    } catch (error) {
        console.error(`Error toggling ${device}:`, error);

        // Revert the toggle state if the request failed
        document.getElementById(`${device}Toggle`).checked = !state;

        showNotification(`Failed to toggle "${device}".`, "error");
    }
}

// Save schedule settings
async function saveScheduleSettings() {
    const lightStart = document.getElementById("lightStart").value;
    const lightEnd = document.getElementById("lightEnd").value;

    const feedingTimes = Array.from(
        feedingTimesContainer.querySelectorAll("input[type=time]")
    ).map((input) => input.value);

    // Construct payload
    const payload = {
        schedule: {
            lighting: { start: lightStart, end: lightEnd },
            feeding: feedingTimes
        }
    };

    try {
        const response = await fetch(`${API_BASE}/update-schedule`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error("Failed to save schedule settings.");
        }

        const result = await response.json();
        console.log("Saved schedule settings:", result);

        showNotification("Schedule updated successfully!", "success");
    } catch (error) {
        console.error("Error saving schedule settings:", error);
        showNotification("Failed to update schedule.", "error");
    }
}

// Add a new feeding time input
function addFeedingTimeInput(defaultValue = "") {
    const row = document.createElement("div");
    row.className = "feeding-time";
    row.innerHTML = `
    <input type="time" value="${defaultValue}" />
    <button class="remove-time">Remove</button>
  `;
    row.querySelector(".remove-time").addEventListener("click", () =>
        row.remove()
    );
    feedingTimesContainer.appendChild(row);
}

// Show notifications for user feedback
function showNotification(message, type) {
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = "block";
    setTimeout(() => {
        notification.style.display = "none";
    }, 3000);
}
