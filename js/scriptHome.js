//real time clock
function clock() {
  window.rt = 1000; // Refresh time interval in milliseconds

  document.getElementById("t").textContent = new Date().toLocaleDateString(); // Set the date once

  let interval = setInterval(function () {
    document.getElementById("t2").textContent = new Date().toLocaleTimeString(); // Update clock every second

    if (window.rt <= 0) {
      clearInterval(interval);
    }
  }, window.rt);
}
// Call the function to start the clock
clock();

//Toggle ON OFF check
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".switch input").forEach(toggle => {
      toggle.addEventListener("change", () => {
          console.log(`Toggled: ${toggle.id} is now ${toggle.checked ? "ON" : "OFF"}`);
      });
  });
});