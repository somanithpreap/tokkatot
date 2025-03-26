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
		handleModeToggle("toggle-auto", autoModeToggle.checked),
	);
	scheduleModeToggle.addEventListener("change", () =>
		handleModeToggle("toggle-schedule", scheduleModeToggle.checked),
	);

	// Attach event listeners for immediate toggles
	fanToggle.addEventListener("change", () =>
		handleImmediateToggle("fan", fanToggle.checked),
	);
	lightToggle.addEventListener("change", () =>
		handleImmediateToggle("bulb", lightToggle.checked),
	);
	feederToggle.addEventListener("change", () =>
		handleImmediateToggle("feeder", feederToggle.checked),
	);
	waterToggle.addEventListener("change", () =>
		handleImmediateToggle("water", waterToggle.checked),
	);

	// Attach event listener for saving schedule settings
	saveScheduleButton.addEventListener("click", saveScheduleSettings);

	// Launch schedule modal (if existing modal functionality exists)
	document
		.getElementById("addFeedingTime")
		.addEventListener("click", () => addFeedingTimeInput(""));
});

// Fetch initial settings state from the backend
async function fetchInitialSettings() {
	try {
		const response = await fetch(`${API_BASE}/get-initial-state`);
		if (!response.ok) {
			throw new Error("Failed to fetch initial state.");
		}

		let data = await response.json();
		data = JSON.parse(data.data);
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
	autoModeToggle.checked = data.automation;
	scheduleModeToggle.checked = data.scheduleMode;

	// Update immediate toggles
	fanToggle.checked = data.fan;
	lightToggle.checked = data.lightbulb;
	feederToggle.checked = data.feeder;
	waterToggle.checked = data.water;

	// Update schedule settings
	document.getElementById("lightStart").value =
		data.schedule.lighting.start || "06:00";
	document.getElementById("lightEnd").value =
		data.schedule.lighting.end || "18:00";

	// Update feeding times schedule
	feedingTimesContainer.innerHTML = ""; // Clear existing feeding times
		data.schedule.feeding.forEach((time) => addFeedingTimeInput(time));

	// Update water interval
	document.getElementById("waterInterval").value =
		data.schedule.waterInterval || 60;

	// Update environmental thresholds
	document.getElementById("tempMin").value =
		data.schedule.tempThreshold.min || 20;
	document.getElementById("tempMax").value =
		data.schedule.tempThreshold.max || 25;
	document.getElementById("humidityMin").value =
		data.schedule.humThreshold.min || 40;
	document.getElementById("humidityMax").value =
 		data.schedule.humThreshold.max || 60;
}

// Handle toggling Auto or Schedule mode
async function handleModeToggle(endpoint, state) {
	try {
		const response = await fetch(`${API_BASE}/${endpoint}`, {
			method: "GET",
		});

		if (!response.ok) {
			throw new Error(`Failed to toggle ${endpoint}.`);
		}

		let result = await response.json();
		result = JSON.parse(result.state);
		console.log(`Toggled ${endpoint}: `, result);

		showNotification(
			`${endpoint === "toggle-auto" ? "Auto Mode" : "Schedule Mode"} ${
				state ? "enabled" : "disabled"
			}.`,
			"success",
		);
	} catch (error) {
		console.error(`Error toggling ${endpoint}:`, error);
		showNotification("Failed to update mode toggle.", "error");

		// Revert the toggle state on error
		const toggle =
			endpoint === "toggle-auto" ? autoModeToggle : scheduleModeToggle;
		toggle.checked = !state;
	}
}

// Handle immediate toggles (like fan, light, feeder, and water)
async function handleImmediateToggle(device, state) {
	try {
		const response = await fetch(`${API_BASE}/toggle-${device}`, {
			method: "GET",
		});

		if (!response.ok) {
			throw new Error(`Failed to toggle ${device}.`);
		}

		let result = await response.json();
		result = JSON.parse(result.state);

		showNotification(
			`${device.charAt(0).toUpperCase() + device.slice(1)} ${
				state ? "turned on" : "turned off"
			}.`,
			"success",
		);
	} catch (error) {
		console.error(`Error toggling ${device}:`, error);
		showNotification("Failed to update device state.", "error");

		// Revert the toggle state on error
		document.getElementById(`${device}Toggle`).checked = !state;
	}
}

// Handle saving updated schedule settings
async function saveScheduleSettings() {
	try {
		// Gather lighting schedule inputs
		const lightStart = document.getElementById("lightStart").value;
		const lightEnd = document.getElementById("lightEnd").value;

		// Gather feeding schedule inputs
		const feedingTimes = Array.from(
			feedingTimesContainer.querySelectorAll("input[type='time']"),
		).map((input) => input.value);

		// Gather water interval input
		const waterInterval = parseInt(
			document.getElementById("waterInterval").value,
			10,
		);

		// Gather environmental thresholds
		const tempMin = parseFloat(document.getElementById("tempMin").value);
		const tempMax = parseFloat(document.getElementById("tempMax").value);
		const humidityMin = parseFloat(
			document.getElementById("humidityMin").value,
		);
		const humidityMax = parseFloat(
			document.getElementById("humidityMax").value,
		);

		// Create payload
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

		console.log("Saving schedule settings with payload:", payload);

		const response = await fetch(`${API_BASE}/schedule`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			throw new Error("Failed to save the schedule settings.");
		}

		const result = await response.json();
		console.log("Schedule saved successfully:", result);

		showNotification("Schedule updated successfully!", "success");
	} catch (error) {
		console.error("Error saving schedule:", error);
		showNotification("Failed to save schedule settings.", "error");
	}
}

// Helper function to dynamically add a feeding time row
function addFeedingTimeInput(time = "") {
	const feedingTimeDiv = document.createElement("div");
	feedingTimeDiv.classList.add("feeding-time");

	const input = document.createElement("input");
	input.type = "time";
	input.value = time;

	const removeButton = document.createElement("button");
	removeButton.textContent = "លុប"; // "Remove" in Khmer
	removeButton.classList.add("remove-time");
	removeButton.addEventListener("click", () => feedingTimeDiv.remove());

	feedingTimeDiv.appendChild(input);
	feedingTimeDiv.appendChild(removeButton);
	feedingTimesContainer.appendChild(feedingTimeDiv);
}

// Helper function to display notifications
function showNotification(message, type) {
	notification.textContent = message;
	notification.className = `notification ${type}`;
	setTimeout(() => {
		notification.className = "notification"; // Clear notification
	}, 3000);
}
