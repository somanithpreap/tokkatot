// Get all toggle switches
const fanToggle = document.getElementById('fan-toggle');
const lightToggle = document.getElementById('light-toggle');
const feedToggle = document.getElementById('feed-toggle');
const waterToggle = document.getElementById('water-toggle');

// Function to handle toggle changes
function handleToggle(type, isOn) {
	console.log(`${type} toggled ${isOn ? 'on' : 'off'}`);
}

// Add event listeners to all toggles
fanToggle.addEventListener('change', (e) => handleToggle('fan', e.target.checked));
lightToggle.addEventListener('change', (e) => handleToggle('light', e.target.checked));
feedToggle.addEventListener('change', (e) => handleToggle('feed', e.target.checked));
waterToggle.addEventListener('change', (e) => handleToggle('water', e.target.checked));

// Function to update toggle states from backend
function updateToggleStates(data) {
	if (data.fan !== undefined) fanToggle.checked = data.fan;
	if (data.light !== undefined) lightToggle.checked = data.light;
	if (data.feed !== undefined) feedToggle.checked = data.feed;
	if (data.water !== undefined) waterToggle.checked = data.water;
}