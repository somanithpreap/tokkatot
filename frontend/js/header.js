// Load header component
document.addEventListener("DOMContentLoaded", function () {
	// Find the header placeholder
	const headerPlaceholder = document.getElementById("header-placeholder");

	// Fetch and insert header
	fetch("../components/header.html")
		.then((response) => response.text())
		.then((data) => {
			headerPlaceholder.innerHTML = data;
			initializeHeader();
		})
		.catch((error) => console.error("Error loading header:", error));
});

// Initialize header functionality
function initializeHeader() {
	// Update date and time
	function updateDateTime() {
		const now = new Date();
		const days = [
			"អាទិត្យ",
			"ចន្ទ",
			"អង្គារ",
			"ពុធ",
			"ព្រហស្បតិ៍",
			"សុក្រ",
			"សៅរ៍",
		];
		const months = [
			"មករា",
			"កុម្ភៈ",
			"មីនា",
			"មេសា",
			"ឧសភា",
			"មិថុនា",
			"កក្កដា",
			"សីហា",
			"កញ្ញា",
			"តុលា",
			"វិច្ឆិកា",
			"ធ្នូ",
		];

		const day = days[now.getDay()];
		const date = now.getDate();
		const month = months[now.getMonth()];
		const year = now.getFullYear();

		const hours = String(now.getHours()).padStart(2, "0");
		const minutes = String(now.getMinutes()).padStart(2, "0");
		const seconds = String(now.getSeconds()).padStart(2, "0");

		document.getElementById("t").textContent =
			`${day} ${date} ${month} ${year}`;
		document.getElementById("t2").textContent =
			`${hours}:${minutes}:${seconds}`;
	}

	// Update immediately and then every second
	updateDateTime();
	setInterval(updateDateTime, 1000);

	document.querySelector(".profile-info").href = getURL() + "/profile";

	// Set username if available
	const username = getUsername();
	document.getElementById("username").innerHTML = username;
}
