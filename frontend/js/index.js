function getUsername() {
	const cookie = document.cookie.split("=");
	if (cookie[0] == "token")
		return JSON.parse(atob(cookie[1].split(".")[1])).client_id;
	else {
		document.cookie = "";
		window.location.href = getURL();
	}
}

function getURL() {
	return "https://" + window.location.hostname + ":" + window.location.port;
}

if (document.getElementById("username"))
	document.getElementById("username").textContent = getUsername();
