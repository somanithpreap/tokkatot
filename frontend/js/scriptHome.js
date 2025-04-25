// Function to handle sensor control updates
function handleUpdate(data) {
	console.log("Home update:", data);
}

// Function to handle alerts
function handleAlert(data) {
	console.warn("Home alert:", data);
}

// Chart configuration
const chartConfig = {
	type: "line",
	data: {
		labels: [],
		datasets: [
			{
				label: "សីតុណ្ហភាព",
				data: [],
				borderColor: "#FFBA49",
				backgroundColor: "rgba(255, 186, 73, 0.1)",
				borderWidth: 2,
				fill: true,
				tension: 0.4,
				pointRadius: 3,
				pointBackgroundColor: "#FFBA49",
			},
		],
	},
	options: {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				display: false,
			},
			tooltip: {
				mode: "index",
				intersect: false,
				callbacks: {
					label: function (context) {
						return `សីតុណ្ហភាព: ${context.parsed.y}°C`;
					},
				},
			},
		},
		scales: {
			x: {
				grid: {
					display: false,
				},
				ticks: {
					maxRotation: 0,
					font: {
						size: 10,
					},
				},
			},
			y: {
				beginAtZero: false,
				grid: {
					color: "rgba(0, 0, 0, 0.1)",
				},
				ticks: {
					font: {
						size: 10,
					},
				},
			},
		},
	},
};

let temperatureChart;

// Initialize chart
document.addEventListener("DOMContentLoaded", () => {
	const ctx = document.getElementById("temperatureChart");
	if (ctx) {
		temperatureChart = new Chart(ctx, chartConfig);

		// Start data fetching
		fetchCurrentData();
		fetchHistoricalData();

		// Set up intervals for updates
		setInterval(fetchCurrentData, 1000); // Update current data every second
		setInterval(fetchHistoricalData, 5000); // Update historical data every 5 seconds
	}
});

// Fetch current temperature and humidity
async function fetchCurrentData() {
	try {
		// Endpoint
		const response = await fetch("/api/get-current-data");
		let data = await response.json();
		data = JSON.parse(data.data);

		updateCurrentValues(data);
	} catch (error) {
		console.error("Error fetching current data:", error);
		showError("current");
	}
}

// Fetch historical temperature data
async function fetchHistoricalData() {
	try {
		// Endpoint
		const response = await fetch("/api/get-historical-data");
		let data = await response.json();
		data = JSON.parse(data.data);

		updateChart(data);
	} catch (error) {
		console.error("Error fetching historical data:", error);
		showError("historical");
	}
}

// Update current temperature and humidity values
function updateCurrentValues(data) {
	const tempElement = document.getElementById("current-temp");
	const humidityElement = document.getElementById("current-humidity");

	if (data.temperature !== undefined && tempElement) {
		tempElement.textContent = data.temperature.toFixed(1);
	}

	if (data.humidity !== undefined && humidityElement) {
		humidityElement.textContent = data.humidity.toFixed(1);
	}
}

// Update temperature chart
function updateChart(data) {
	if (!temperatureChart) return;

	const timestamps = data.map((item) => {
		const date = new Date(item.timestamp);
		return formatTimestamp(date);
	});

	const temperatures = data.map((item) => item.temperature);

	temperatureChart.data.labels = timestamps;
	temperatureChart.data.datasets[0].data = temperatures;
	temperatureChart.update();
}

// Format timestamp for chart labels
function formatTimestamp(date) {
	const now = new Date();
	const diffInMinutes = Math.floor((now - date) / (1000 * 60));

	if (diffInMinutes < 60) {
		return `${diffInMinutes} នាទីមុន`; // X minutes ago
	} else if (diffInMinutes < 1440) {
		const hours = Math.floor(diffInMinutes / 60);
		return `${hours} ម៉ោងមុន`; // X hours ago
	} else {
		const days = Math.floor(diffInMinutes / 1440);
		return `${days} ថ្ងៃមុន`; // X days ago
	}
}

// Show error state
function showError(type) {
	if (type === "current") {
		const tempElement = document.getElementById("current-temp");
		const humidityElement = document.getElementById("current-humidity");
		if (tempElement) tempElement.textContent = "--";
		if (humidityElement) humidityElement.textContent = "--";
	} else if (type === "historical") {
	}
}
