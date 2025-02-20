// Establish WebSocket connection
const socket = new WebSocket("ws://localhost:8080");

// WebSocket event handlers
socket.onopen = function () {
    console.log("✅ Connected to WebSocket server");
};

// Function to handle different types of messages
function handleMessage(event) {
    const message = JSON.parse(event.data);
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
    setTimeout(function () {
        socket = new WebSocket("ws://localhost:8080");
        // Reassign event handlers
        socket.onopen = socket.onopen;
        socket.onmessage = socket.onmessage;
        socket.onclose = socket.onclose;
        socket.onerror = socket.onerror;
    }, reconnectInterval);
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