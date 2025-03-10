// js/navbar.js
document.addEventListener("DOMContentLoaded", function () {
	fetch("../components/navbar.html")
		.then((response) => response.text())
		.then((data) => {
			document.body.insertAdjacentHTML("beforeend", data);

			document.getElementById("nav-home").href = getURL();
			document.getElementById("nav-dashboard").href = getURL() + "/dashboard";
			document.getElementById("nav-settings").href = getURL() + "/settings";
		})
		.catch((error) => console.error("Error loading navbar:", error));
});
