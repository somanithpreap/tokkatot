// Establish WebSocket connection
const socket = new WebSocket("ws://localhost:8080");

// WebSocket event handlers
socket.onopen = function () {
    console.log("✅ Connected to WebSocket server");
};

socket.onmessage = function (event) {
    console.log("📩 Message from server:", event.data);
};

socket.onclose = function () {
    console.log("❌ WebSocket connection closed");
};

socket.onerror = function (error) {
    console.error("⚠️ WebSocket error:", error);
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

// Make sendMessage globally available
window.sendMessage = sendMessage;