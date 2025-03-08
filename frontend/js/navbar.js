// js/navbar.js
document.addEventListener("DOMContentLoaded", function () {
    fetch("../components/navbar.html")
        .then(response => response.text())
        .then(data => {
            document.body.insertAdjacentHTML("beforeend", data);
        })
        .catch(error => console.error("Error loading navbar:", error));
});