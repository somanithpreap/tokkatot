document.addEventListener("DOMContentLoaded", function () {
  // Simulate fetching temperature dynamically
  let temperatureElement = document.querySelector("#temperature");
  let temp = 30;
  setInterval(() => {
      temp = temp + (Math.random() > 0.5 ? 1 : -1);
      temperatureElement.textContent = temp + "°C";
  }, 5000);

  // Make container full-screen
  function adjustLayout() {
      let container = document.querySelector(".container");
      container.style.width = "100%";
      container.style.height = "100%";
  }

  window.addEventListener("resize", adjustLayout);
  adjustLayout();
});
const ctx = document.getElementById('temperatureChart').getContext('2d');

// Sample data for the past 7 days
const temperatures = [28, 30, 29, 31, 32, 30, 29]; // Replace with actual data
const days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];

// Calculate the average temperature
const averageTemp = temperatures.reduce((sum, temp) => sum + temp, 0) / temperatures.length;

// Add the average line to the chart
const avgLine = temperatures.map(() => averageTemp);

new Chart(ctx, {
    type: 'line',
    data: {
        labels: days,
        datasets: [
            {
                label: 'Daily Temperature (°C)',
                data: temperatures,
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderWidth: 2,
                tension: 0.3,
            },
            {
                label: 'Average Temperature (°C)',
                data: avgLine,
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1,
                borderDash: [10, 5],
                fill: false,
            },
        ],
    },
    options: {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
        },
        scales: {
            y: {
                beginAtZero: true,
            },
        },
    },
});

