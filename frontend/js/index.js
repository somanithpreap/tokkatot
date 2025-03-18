function getUsername() {
	const cookie = document.cookie.split("=");
	if (cookie[0] == "token")
		return JSON.parse(b64DecodeUnicode(cookie[1].split(".")[1])).client_id;
	else {
		document.cookie = "";
		window.location.href = getURL() + "/login";
	}
}

function b64DecodeUnicode(str) {
	// Going backwards: from bytestream, to percent-encoding, to original string.
	return decodeURIComponent(
		atob(str)
			.split("")
			.map(function (c) {
				return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
			})
			.join(""),
	);
}

function getURL() {
	return window.location.origin;
}

if (document.getElementById("username"))
	document.getElementById("username").textContent = getUsername();
