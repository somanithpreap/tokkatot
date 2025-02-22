const form = document.querySelector("form"),
uField = form.querySelector(".username"),
uInput = uField.querySelector("input"),
pField = form.querySelector(".password"),
pInput = pField.querySelector("input");
const togglePassword = document.querySelector(".toggle-password");

togglePassword.addEventListener("click", () => {
  const type = pInput.getAttribute("type") === "password" ? "text" : "password";
  pInput.setAttribute("type", type);
  togglePassword.classList.toggle("fa-eye-slash");
});

form.onsubmit = (e) => {
  e.preventDefault();
  (uInput.value == "") ? uField.classList.add("shake", "error") : checkUsername();
  (pInput.value == "") ? pField.classList.add("shake", "error") : checkPass();
  setTimeout(() => {
    uField.classList.remove("shake");
    pField.classList.remove("shake");
  }, 500);
  uInput.onkeyup = () => { checkUsername(); }
  pInput.onkeyup = () => { checkPass(); }

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

  if (!uField.classList.contains("error") && !pField.classList.contains("error")) {
    // Send login data via WebSocket
    const loginData = {
      type: 'login',
      username: uInput.value,
      password: pInput.value
    };
    socket.send(JSON.stringify(loginData));
  }
}

document.querySelector(".sign-txt a").addEventListener("click", (e) => {
  e.preventDefault();
  window.location.href = "signup.html";
});