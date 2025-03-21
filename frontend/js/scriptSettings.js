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

async function fetchSchedule() {
    try {
        // Fetch data from the backend
        const response = await fetch(`${API_BASE}/schedule`);
        if (!response.ok) {
            throw new Error("Failed to fetch schedule.");
        }

        const data = await response.json();
        console.log("Fetched schedule:", data);

        // Populate lighting schedule
        document.getElementById("lightStart").value = data.schedule.lighting.start;
        document.getElementById("lightEnd").value = data.schedule.lighting.end;

        // Populate feeding times
        const feedingTimesContainer = document.getElementById("feedingTimes");
        feedingTimesContainer.innerHTML = ""; // Clear existing feeding items
        data.schedule.feeding.forEach((time) => addFeedingTimeInput(time));

        // Populate water control interval
        document.getElementById("waterInterval").value = data.schedule.waterInterval;

        // Populate temperature and humidity thresholds
        document.getElementById("tempMin").value = data.schedule.tempThreshold.min;
        document.getElementById("tempMax").value = data.schedule.tempThreshold.max;
        document.getElementById("humidityMin").value = data.schedule.humThreshold.min;
        document.getElementById("humidityMax").value = data.schedule.humThreshold.max;

    } catch (error) {
        console.error("Error fetching schedule:", error);
        showNotification("Unable to load schedule!", "error");
    }
}

// Helper function to add feeding time dynamically
function addFeedingTimeInput(time = "") {
    const feedingTimesContainer = document.getElementById("feedingTimes");

    const feedingTimeDiv = document.createElement("div");
    feedingTimeDiv.classList.add("feeding-time");

    const input = document.createElement("input");
    input.type = "time";
    input.value = time;

    const removeButton = document.createElement("button");
    removeButton.classList.add("remove-time");
    removeButton.textContent = "លុប"; // "Remove" in Khmer
    removeButton.addEventListener("click", () => feedingTimeDiv.remove());

    feedingTimeDiv.appendChild(input);
    feedingTimeDiv.appendChild(removeButton);

    feedingTimesContainer.appendChild(feedingTimeDiv);
}

// Fetch schedule data when the modal is opened
document.addEventListener("DOMContentLoaded", () => {
    fetchSchedule();
});

async function saveScheduleSettings() {
    // Gather lighting data
    const lightStart = document.getElementById("lightStart").value;
    const lightEnd = document.getElementById("lightEnd").value;

    // Gather feeding schedule
    const feedingTimes = Array.from(
        document.getElementById("feedingTimes").querySelectorAll("input[type='time']")
    ).map((input) => input.value);

    // Gather water interval
    const waterInterval = parseInt(document.getElementById("waterInterval").value, 10);

    // Gather temperature and humidity thresholds
    const tempMin = parseFloat(document.getElementById("tempMin").value);
    const tempMax = parseFloat(document.getElementById("tempMax").value);
    const humidityMin = parseFloat(document.getElementById("humidityMin").value);
    const humidityMax = parseFloat(document.getElementById("humidityMax").value);

    // Create payload to send to the backend
    const payload = {
        lighting: {
            start: lightStart,
            end: lightEnd,
        },
        feeding: feedingTimes,
        waterInterval: waterInterval,
        tempThreshold: {
            min: tempMin,
            max: tempMax,
        },
        humThreshold: {
            min: humidityMin,
            max: humidityMax,
        },
    };

    try {
        // Send payload to the backend
        const response = await fetch(`${API_BASE}/schedule`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error("Failed to save schedule.");
        }

        const result = await response.json();
        console.log("Schedule updated successfully:", result);

        // Show success notification
        showNotification("Schedule updated successfully!", "success");
    } catch (error) {
        console.error("Error saving schedule:", error);
        showNotification("Failed to save schedule!", "error");
    }
}

// Add save button event listener
document.getElementById("saveSchedule").addEventListener("click", saveScheduleSettings);

// Add cancel button event listener
document.getElementById("cancelSchedule").addEventListener("click", () => {
    showNotification("Schedule changes discarded.", "info");
});