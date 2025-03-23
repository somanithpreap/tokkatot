// Get form elements
const userInfoForm = document.getElementById("userInfoForm");
const notification = document.getElementById("notification");

// Load user data when the page loads
document.addEventListener("DOMContentLoaded", () => {
	loadUserData();
});

// Load user data from backend API
async function loadUserData() {
	try {
		const response = await fetch(`${getURL()}/api/profile`);
		if (!response.ok) {
			throw new Error("Failed to fetch profile");
		}
		const userData = await response.json();

		// Populate form fields
		document.getElementById("fullName").value = userData.full_name || "";
		document.getElementById("phoneNumber").value = userData.phone_number || "";
		document.getElementById("gender").value = userData.gender || "";
		document.getElementById("province").value = userData.province || "";

		// Update username in header if it exists
		const usernameElement = document.getElementById("username");
		if (usernameElement && userData.full_name) {
			usernameElement.textContent = userData.full_name;
		}
	} catch (error) {
		console.error("Error loading user data:", error);
		showNotification("មានបញ្ហាក្នុងការទាញយកទិន្នន័យ", "error");
	}
}

// Handle form submission
userInfoForm.addEventListener("submit", async (e) => {
	e.preventDefault();

	// Get form data
	const formData = {
		full_name: document.getElementById("fullName").value,
		phone_number: document.getElementById("phoneNumber").value,
		gender: document.getElementById("gender").value,
		province: document.getElementById("province").value,
	};

	try {
		const response = await fetch(`${getURL()}/api/profile`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(formData),
		});

		if (!response.ok) {
			throw new Error("Failed to update profile");
		}

		// Update username in header
		const usernameElement = document.getElementById("username");
		if (usernameElement) {
			usernameElement.textContent = formData.full_name;
		}

		showNotification("ទិន្នន័យត្រូវបានរក្សាទុកដោយជោគជ័យ", "success");
	} catch (error) {
		console.error("Error saving user data:", error);
		showNotification("មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ", "error");
	}
});

// Show notification
function showNotification(message, type = "success") {
	notification.textContent = message;
	notification.style.backgroundColor =
		type === "success" ? "#4CAF50" : "#F44336";
	notification.classList.add("show");

	// Hide notification after 3 seconds
	setTimeout(() => {
		notification.classList.remove("show");
	}, 3000);
}

// Phone number validation
const phoneNumberInput = document.getElementById("phoneNumber");
phoneNumberInput.addEventListener("input", (e) => {
	// Remove any non-digit characters
	let value = e.target.value.replace(/\D/g, "");

	// Ensure the number starts with 0
	if (value.length > 0 && value[0] !== "0") {
		value = "0" + value;
	}

	// Limit to 10 digits
	value = value.slice(0, 10);

	// Update the input value
	e.target.value = value;
});
