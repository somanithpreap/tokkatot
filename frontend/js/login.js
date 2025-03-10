document.querySelector("form").action = getURL() + "/login";
document.getElementById("signup-link").href = getURL() + "/register";

const form = document.querySelector("form"),
	uField = form.querySelector(".username"),
	uInput = uField.querySelector("input"),
	pField = form.querySelector(".password"),
	pInput = pField.querySelector("input");

// Get the toggle password icon
const togglePassword = document.querySelector(".toggle-password");

// Password toggle functionality
document.addEventListener("DOMContentLoaded", () => {
	// Toggle password visibility
	togglePassword.addEventListener("click", function () {
		const type =
			pInput.getAttribute("type") === "password" ? "text" : "password";
		pInput.setAttribute("type", type);
		this.classList.toggle("fa-eye");
		this.classList.toggle("fa-eye-slash");
	});
});

form.addEventListener("submit", function (event) {
	event.preventDefault();

	checkUsername();
	checkPass();

	if (
		!uField.classList.contains("error") &&
		!pField.classList.contains("error")
	) {
		const formData = new FormData(form);

		fetch(form.action, {
			method: "POST",
			body: formData,
		}).then((response) => {
			if (response.ok) window.location.href = "/";
			else {
				return response.json().then((error) => {
					handleServerErrors(error.error);
					console.error("Error: ", error.error);
				});
			}
		});
	}
});

function handleServerErrors(error) {
	if (error == "Invalid username") {
		uField.classList.add("error");
		let errorTxt = uField.querySelector(".error-txt");
		errorTxt.innerText = "ឈ្មោះអ្នកប្រើប្រាស់មិនត្រឹមត្រូវ";
	} else if (error == "Invalid password") {
		pField.classList.add("error");
		let errorTxt = pField.querySelector(".error-txt");
		errorTxt.innerText = "ពាក្យសម្ងាត់មិនត្រឹមត្រូវ";
	}
}

function checkUsername() {
	if (uInput.value == "") {
		uField.classList.add("error");
		uField.classList.remove("valid");
		let errorTxt = uField.querySelector(".error-txt");
		errorTxt.innerText = "Username can't be blank";
	} else {
		uField.classList.remove("error");
		uField.classList.add("valid");
	}
}

function checkPass() {
	if (pInput.value == "") {
		pField.classList.add("error");
		pField.classList.remove("valid");
		let errorTxt = pField.querySelector(".error-txt");
		errorTxt.innerText = "Password can't be blank";
	} else {
		pField.classList.remove("error");
		pField.classList.add("valid");
	}
}
/*
form.onsubmit = (e) => {
	e.preventDefault();
	uInput.value == "" ? uField.classList.add("shake", "error") : checkUsername();
	pInput.value == "" ? pField.classList.add("shake", "error") : checkPass();
	setTimeout(() => {
		uField.classList.remove("shake");
		pField.classList.remove("shake");
	}, 500);
	uInput.onkeyup = () => {
		checkUsername();
	};
	pInput.onkeyup = () => {
		checkPass();
	};

	function checkUsername() {
		if (uInput.value == "") {
			uField.classList.add("error");
			uField.classList.remove("valid");
			let errorTxt = uField.querySelector(".error-txt");
			errorTxt.innerText = "Username can't be blank";
		} else {
			uField.classList.remove("error");
			uField.classList.add("valid");
		}
	}

	function checkPass() {
		if (pInput.value == "") {
			pField.classList.add("error");
			pField.classList.remove("valid");
			togglePassword.style.visibility = "hidden"; // Hide eye icon
		} else {
			pField.classList.remove("error");
			pField.classList.add("valid");
			togglePassword.style.visibility = "visible"; // Show eye icon
		}
	}

	if (
		!uField.classList.contains("error") &&
		!pField.classList.contains("error")
	) {
		// Send login data via WebSocket
		const loginData = {
			type: "login",
			username: uInput.value,
			password: pInput.value,
		};
		socket.send(JSON.stringify(loginData));
		// Handle server response for login
		socket.onmessage = (event) => {
			const data = JSON.parse(event.data);
			if (data.type === "loginResponse") {
				if (data.success) {
					window.location.href = "home.html"; // Redirect to home on success
				} else {
					alert("Login failed: " + data.message);
				}
			}
		};
	}
};
*/
