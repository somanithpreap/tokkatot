// DOM Elements
const autoModeToggle = document.getElementById("autoModeToggle");
// const scheduleModeToggle = document.getElementById("scheduleModeToggle");
const beltToggle = document.getElementById("beltToggle");
const fanToggle = document.getElementById("fanToggle");
const lightToggle = document.getElementById("lightToggle");
const feederToggle = document.getElementById("feedToggle");
const waterToggle = document.getElementById("waterToggle");
// const feedingTimesContainer = document.getElementById("feedingTimes");
// const saveScheduleButton = document.getElementById("saveSchedule");
const notification = document.getElementById("notification");

// Ensure proper initialization of toggles and fix conveyor (belt) logic
async function initializeToggles() {
	try {
		const response = await fetch("/api/get-initial-state");
		if (!response.ok) {
			throw new Error("Failed to fetch initial state.");
		}

		let data = await response.json();
		data = JSON.parse(data.data);

		// Initialize toggles based on the fetched data
		autoModeToggle.checked = data.automation;
		beltToggle.checked = data.belt;
		fanToggle.checked = data.fan;
		lightToggle.checked = data.lightbulb;
		feederToggle.checked = data.feeder;
		waterToggle.checked = data.water;
	} catch (error) {
		console.error("Error initializing toggles:", error);
		showNotification("Failed to initialize toggles.", "error");
	}
}

// Call initializeToggles on page load
document.addEventListener("DOMContentLoaded", () => {
	initializeToggles();

	// Attach event listeners for toggles
	beltToggle.addEventListener("change", () =>
		handleImmediateToggle("/api/toggle-belt", beltToggle.checked)
	);
	fanToggle.addEventListener("change", () =>
		handleImmediateToggle("/api/toggle-fan", fanToggle.checked)
	);
	lightToggle.addEventListener("change", () =>
		handleImmediateToggle("/api/toggle-bulb", lightToggle.checked)
	);
	feederToggle.addEventListener("change", () =>
		handleImmediateToggle("/api/toggle-feeder", feederToggle.checked)
	);
	waterToggle.addEventListener("change", () =>
		handleImmediateToggle("/api/toggle-water", waterToggle.checked)
	);

	// Attach event listener for saving schedule settings
	/*  saveScheduleButton.addEventListener("click", saveScheduleSettings);

    // Launch schedule modal (if existing modal functionality exists)
    document
        .getElementById("addFeedingTime")
        .addEventListener("click", () => addFeedingTimeInput("")); */
});

// Update the UI based on retrieved settings
function updateUI(data) {
	// Update mode toggles
	autoModeToggle.checked = data.automation;
	// scheduleModeToggle.checked = data.scheduleMode;

	// Update immediate toggles
	beltToggle.checked = data.belt;
	fanToggle.checked = data.fan;
	lightToggle.checked = data.lightbulb;
	feederToggle.checked = data.feeder;
	waterToggle.checked = data.water;

	// Update schedule settings
	/*  document.getElementById("lightStart").value =
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
        data.schedule.humThreshold.max || 60; */
}

// Handle toggling Auto Mode
async function handleModeToggle(endpoint, state) {
	try {
		const response = await fetch(endpoint, {
			method: "GET",
		});

		if (!response.ok) {
			throw new Error(`Failed to toggle ${endpoint}.`);
		}

		let result = await response.json();
		result = JSON.parse(result.state);

		console.log(`Toggled ${endpoint}: `, result);

		showNotification(`Auto Mode ${state ? "enabled" : "disabled"}.`, "success");
	} catch (error) {
		console.error(`Error toggling ${endpoint}:`, error);
		showNotification("Failed to update Auto Mode toggle.", "error");

		// Revert the toggle state on error
		autoModeToggle.checked = !state;
	}
}

// Update the immediate toggle handler to ensure proper synchronization
async function handleImmediateToggle(endpoint, state) {
	try {
		// Optimistically update the UI
		const toggleElement = document.querySelector(`[data-endpoint='${endpoint}']`);
		if (toggleElement) toggleElement.checked = state;

		const response = await fetch(endpoint, {
			method: "GET",
		});

		if (!response.ok) {
			throw new Error(`Failed to toggle ${endpoint}.`);
		}

		let result = await response.json();
		result = JSON.parse(result.state);

		// Ensure the UI reflects the actual state from the backend
		if (toggleElement) toggleElement.checked = result;

		showNotification(
			`${endpoint.split("-")[1].charAt(0).toUpperCase() + endpoint.split("-")[1].slice(1)} ${
				result ? "turned on" : "turned off"
			}.`,
			"success",
		);
	} catch (error) {
		console.error(`Error toggling ${endpoint}:`, error);
		showNotification("Failed to update device state.", "error");

		// Revert the toggle state on error
		const toggleElement = document.querySelector(`[data-endpoint='${endpoint}']`);
		if (toggleElement) toggleElement.checked = !state;
	}
}

// Handle saving updated schedule settings
/* async function saveScheduleSettings() {
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

        const response = await fetch("/api/schedule", {
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
} */

// Helper function to display notifications
function showNotification(message, type) {
	notification.textContent = message;
	notification.className = `notification ${type}`;
	setTimeout(() => {
		notification.className = "notification"; // Clear notification
	}, 3000);
}

// Add periodic polling to sync the state of the toggles
setInterval(async () => {
	try {
		const response = await fetch("/api/get-initial-state");
		if (!response.ok) {
			throw new Error("Failed to fetch current data.");
		}

		let data = await response.json();
		data = JSON.parse(data.data);
		console.log("Fetched state:", data);

		// Update the UI based on the fetched data
		updateUI(data);
	} catch (error) {
		console.error("Error fetching state:", error);
	}
}, 1000); // Poll every second
