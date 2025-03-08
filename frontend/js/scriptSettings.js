// Handle toggle switch change
document.getElementById("toggleSwitch").addEventListener("change", function () {
	const status = this.checked ? "ON" : "OFF";
	sendMessage(JSON.stringify({ type: "toggle", status: status }));
	console.log(`Daily updates toggled: ${status}`);
});

// Function to handle updates
function handleUpdate(data) {
	console.log("Settings update:", data);
}
