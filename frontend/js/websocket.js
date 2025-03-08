// Function to update the connection status on the webpage
function updateConnectionStatus(status) {
	const statusElement = document.getElementById("connection-status");
	if (statusElement) {
		statusElement.textContent = status;
	} else {
		console.warn("⚠️ Connection status element not found.");
	}
}

// Establish WebSocket connection
let socket = new WebSocket("ws://localhost:5500/ws");

// WebSocket event handlers
socket.onopen = function () {
	console.log("✅ Connected to WebSocket server");
	updateConnectionStatus("Connected"); // Update the status message when connected
};

// Function to handle different types of messages
function handleMessage(event) {
	const message = JSON.parse(event.data);
	console.log("📩 Message from server:", message);
	switch (message.type) {
		case "update":
			console.log("🔄 Update received:", message.data);
			if (typeof handleUpdate === "function") {
				handleUpdate(message.data);
			}
			break;
		case "alert":
			console.warn("🚨 Alert received:", message.data);
			if (typeof handleAlert === "function") {
				handleAlert(message.data);
			}
			break;
		case "temperature-update":
			if (typeof updateTemperature === "function") {
				updateTemperature(message.data);
			}
			break;
		case "loginResponse":
			if (message.success) {
				localStorage.setItem("registrationKey", message.registrationKey);
				window.location.href = document
					.querySelector(".login-form")
					.getAttribute("action");
			} else {
				alert("Login failed: " + message.message);
			}
			break;
		case "signupResponse":
			if (message.success) {
				localStorage.setItem("registrationKey", message.registrationKey);
				window.location.href = document
					.querySelector(".signup-form")
					.getAttribute("action");
			} else {
				alert("Signup failed: " + message.message);
			}
			break;
		default:
			console.log("📩 Message from server:", message.data);
	}
}

// Update onmessage to use handleMessage
socket.onmessage = function (event) {
	handleMessage(event);
};

socket.onclose = function () {
	console.log("❌ WebSocket connection closed. Attempting to reconnect...");
	updateConnectionStatus("Connecting...");
	setTimeout(function () {
		socket = new WebSocket("ws://localhost:5500/ws");
		// Reassign event handlers
		socket.onopen = function () {
			console.log("✅ Reconnected to WebSocket server");
			updateConnectionStatus("Connected"); // Update the status message when connected
		};
		socket.onmessage = handleMessage;
		socket.onclose = socket.onclose;
		socket.onerror = socket.onerror;
	}, reconnectInterval);
};

socket.onerror = function (error) {
	console.error("⚠️ WebSocket error:", error);
	updateConnectionStatus("Error. Check console for details.");
};

// Function to send messages to the server
function sendMessage(message) {
	if (socket.readyState === WebSocket.OPEN) {
		socket.send(message);
		console.log("📤 Sent message:", message);
	} else {
		console.warn("⚠️ WebSocket not open. Message not sent.");
	}
}

// Reconnect logic
let reconnectInterval = 5000; // 5 seconds

// Heartbeat messages to keep the connection alive
setInterval(function () {
	if (socket.readyState === WebSocket.OPEN) {
		socket.send(JSON.stringify({ type: "heartbeat" }));
		console.log("💓 Heartbeat sent");
	}
}, 30000); // 30 seconds

// Make sendMessage globally available
window.sendMessage = sendMessage;
