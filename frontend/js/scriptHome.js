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
				label: "សីតុណ្ហភាព (°C)",
				data: [],
				borderColor: "#FFBA49",
				backgroundColor: "rgba(255, 186, 73, 0.1)",
				borderWidth: 2,
				fill: true,
				tension: 0.4,
				pointRadius: 2,
				pointBackgroundColor: "#FFBA49",
				yAxisID: 'y',
			},
			{
				label: "សំណើម (%)",
				data: [],
				borderColor: "#4FC3F7",
				backgroundColor: "rgba(79, 195, 247, 0.1)",
				borderWidth: 2,
				fill: true,
				tension: 0.4,
				pointRadius: 2,
				pointBackgroundColor: "#4FC3F7",
				yAxisID: 'y1',
			},
		],
	},
	options: {
		responsive: true,
		maintainAspectRatio: false,
		interaction: {
			mode: 'index',
			intersect: false,
		},
		plugins: {
			legend: {
				display: true,
				position: 'top',
				labels: {
					usePointStyle: true,
					padding: 20,
					font: {
						size: 12,
					},
				},
			},
			tooltip: {
				mode: "index",
				intersect: false,
				callbacks: {
					title: function(context) {
						return context[0].label;
					},
					label: function (context) {
						if (context.datasetIndex === 0) {
							return `សីតុណ្ហភាព: ${context.parsed.y}°C`;
						} else {
							return `សំណើម: ${context.parsed.y}%`;
						}
					},
				},
			},
		},
		scales: {
			x: {
				grid: {
					display: true,
					color: "rgba(0, 0, 0, 0.05)",
				},
				ticks: {
					maxRotation: 45,
					font: {
						size: 10,
					},
					maxTicksLimit: 12, // Limit number of labels for readability
				},
			},
			y: {
				type: 'linear',
				display: true,
				position: 'left',
				beginAtZero: false,
				grid: {
					color: "rgba(255, 186, 73, 0.1)",
				},
				ticks: {
					font: {
						size: 10,
					},
					callback: function(value) {
						return value + '°C';
					},
				},
				title: {
					display: true,
					text: 'សីតុណ្ហភាព (°C)',
					font: {
						size: 12,
					},
				},
			},
			y1: {
				type: 'linear',
				display: true,
				position: 'right',
				beginAtZero: true,
				max: 100,
				grid: {
					drawOnChartArea: false,
				},
				ticks: {
					font: {
						size: 10,
					},
					callback: function(value) {
						return value + '%';
					},
				},
				title: {
					display: true,
					text: 'សំណើម (%)',
					font: {
						size: 12,
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
		setInterval(fetchCurrentData, 5000); // Update current data every 5 seconds
		setInterval(fetchHistoricalData, 30000); // Update historical data every 30 seconds (less frequent for performance)
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

		// Debug log to see the data structure (remove in production)
		console.log('Historical data received:', data.length, 'records');
		if (data.length > 0) {
			console.log('Sample data:', {
				timestamp: data[0].timestamp,
				temperature: data[0].temperature,
				humidity: data[0].humidity
			});
		}

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
	if (!temperatureChart || !data || data.length === 0) return;

	// Sort data by timestamp to ensure chronological order
	const sortedData = data.sort((a, b) => {
		const dateA = parseTimestamp(a.timestamp);
		const dateB = parseTimestamp(b.timestamp);
		return dateA - dateB;
	});

	// Filter and group data for better visualization
	const processedData = processDataForChart(sortedData);

	const timestamps = processedData.map((item) => formatTimestampForChart(item.date));
	const temperatures = processedData.map((item) => item.temperature);
	const humidities = processedData.map((item) => item.humidity);

	temperatureChart.data.labels = timestamps;
	temperatureChart.data.datasets[0].data = temperatures;
	temperatureChart.data.datasets[1].data = humidities;
	temperatureChart.update();
}

// Helper function to parse timestamp consistently
function parseTimestamp(timestamp) {
	let date;
	if (typeof timestamp === 'string') {
		date = new Date(timestamp);
	} else if (typeof timestamp === 'number') {
		date = timestamp < 10000000000 ? new Date(timestamp * 1000) : new Date(timestamp);
	} else {
		date = new Date();
	}
	
	if (isNaN(date.getTime())) {
		console.warn('Invalid timestamp:', timestamp);
		return new Date();
	}
	
	return date;
}

// Process data to show meaningful time periods and reduce noise
function processDataForChart(data) {
	const now = new Date();
	const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
	
	// Filter data from last 24 hours
	const recentData = data.filter(item => {
		const itemDate = parseTimestamp(item.timestamp);
		return itemDate >= last24Hours;
	});

	// Group data by time periods for better visualization
	const groupedData = [];
	const intervalMinutes = 30; // Group data in 30-minute intervals
	
	for (let i = 0; i < recentData.length; i += Math.max(1, Math.floor(intervalMinutes * 60 / 5))) {
		const chunk = recentData.slice(i, i + Math.floor(intervalMinutes * 60 / 5));
		if (chunk.length > 0) {
			// Calculate average for the time period
			const avgTemp = chunk.reduce((sum, item) => sum + (item.temperature || 0), 0) / chunk.length;
			const avgHumidity = chunk.reduce((sum, item) => sum + (item.humidity || 0), 0) / chunk.length;
			
			groupedData.push({
				date: parseTimestamp(chunk[Math.floor(chunk.length / 2)].timestamp), // Use middle timestamp
				temperature: Math.round(avgTemp * 10) / 10,
				humidity: Math.round(avgHumidity * 10) / 10
			});
		}
	}

	return groupedData.length > 0 ? groupedData : recentData.map(item => ({
		date: parseTimestamp(item.timestamp),
		temperature: item.temperature || 0,
		humidity: item.humidity || 0
	}));
}

// Format timestamp for chart labels with meaningful time periods
function formatTimestampForChart(date) {
	const now = new Date();
	const diffInMs = now - date;
	const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
	const diffInHours = Math.floor(diffInMinutes / 60);
	
	// Current day times
	if (diffInHours < 1) {
		if (diffInMinutes < 5) {
			return 'ឥឡូវនេះ'; // Now
		} else {
			return `${diffInMinutes}នាទី`; // X minutes
		}
	} else if (diffInHours < 12) {
		const hours = Math.floor(diffInHours);
		const minutes = diffInMinutes % 60;
		if (minutes === 0) {
			return `${hours}ម៉ោង`; // X hours
		} else {
			return `${hours}ម៉:${minutes < 10 ? '0' : ''}${minutes}`; // X:XX format
		}
	} else if (diffInHours < 24) {
		// Show time of day for today
		const timeStr = date.toLocaleTimeString('km-KH', { 
			hour: '2-digit', 
			minute: '2-digit', 
			hour12: false 
		});
		return `ថ្ងៃនេះ ${timeStr}`;
	} else if (diffInHours < 48) {
		// Yesterday with time
		const timeStr = date.toLocaleTimeString('km-KH', { 
			hour: '2-digit', 
			minute: '2-digit', 
			hour12: false 
		});
		return `ម្សិលមិញ ${timeStr}`;
	} else {
		// Older dates
		const days = Math.floor(diffInHours / 24);
		return `${days}ថ្ងៃមុន`;
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
		// Clear chart data on error
		if (temperatureChart) {
			temperatureChart.data.labels = ['No Data'];
			temperatureChart.data.datasets[0].data = [0];
			temperatureChart.data.datasets[1].data = [0];
			temperatureChart.update();
		}
	}
}

// Helper function to get data quality insights for farmers
function getDataQualityStatus(data) {
	if (!data || data.length === 0) return "No data available";
	
	const now = new Date();
	const latest = parseTimestamp(data[data.length - 1].timestamp);
	const timeSinceLastReading = Math.floor((now - latest) / (1000 * 60));
	
	if (timeSinceLastReading < 10) {
		return "Data is current";
	} else if (timeSinceLastReading < 60) {
		return `Last reading ${timeSinceLastReading} minutes ago`;
	} else {
		return "Data may be outdated";
	}
}