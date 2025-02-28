const form = document.querySelector("form"),
  uField = form.querySelector(".username"),
  uInput = uField.querySelector("input"),
  pField = form.querySelector(".password"),
  pInput = pField.querySelector("input"),
  cpField = form.querySelector(".confirm-password"),
  cpInput = cpField.querySelector("input");

const togglePassword = document.querySelector(".toggle-password");
const toggleConfirmPassword = document.querySelector(".toggle-confirm-password");

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'signupResponse') {
    if (data.success) {
      localStorage.setItem('registrationKey', data.registrationKey);
      window.location.href = form.getAttribute("action");
    } else {
      alert('Signup failed: ' + data.message);
    }
  }
};

togglePassword.addEventListener("click", () => {
  const type = pInput.getAttribute("type") === "password" ? "text" : "password";
  pInput.setAttribute("type", type);
  togglePassword.classList.toggle("fa-eye-slash");
});

toggleConfirmPassword.addEventListener("click", () => {
  const type = cpInput.getAttribute("type") === "password" ? "text" : "password";
  cpInput.setAttribute("type", type);
  toggleConfirmPassword.classList.toggle("fa-eye-slash");
});

form.onsubmit = (e) => {
  e.preventDefault();
  (uInput.value == "") ? uField.classList.add("shake", "error") : checkUsername();
  (pInput.value == "") ? pField.classList.add("shake", "error") : checkPass();
  (cpInput.value == "") ? cpField.classList.add("shake", "error") : checkConfirmPass();
  setTimeout(() => {
    uField.classList.remove("shake");
    pField.classList.remove("shake");
    cpField.classList.remove("shake");
  }, 500);
  uInput.onkeyup = () => { checkUsername(); }
  pInput.onkeyup = () => { checkPass(); }
  cpInput.onkeyup = () => { checkConfirmPass(); }

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

  function checkConfirmPass() {
    if (cpInput.value == "" || cpInput.value !== pInput.value) {
      cpField.classList.add("error");
      cpField.classList.remove("valid");
      let errorTxt = cpField.querySelector(".error-txt");
      (cpInput.value != "") ? errorTxt.innerText = "Passwords do not match" : errorTxt.innerText = "Confirm Password can't be blank";
      toggleConfirmPassword.style.visibility = "hidden"; // Hide eye icon
    } else {
      cpField.classList.remove("error");
      cpField.classList.add("valid");
      toggleConfirmPassword.style.visibility = "visible"; // Show eye icon
    }
  }

  if (!uField.classList.contains("error") && !pField.classList.contains("error") && !cpField.classList.contains("error")) {
    // Send signup data via WebSocket
    const signupData = {
      type: 'signup',
      username: uInput.value,
      password: pInput.value
    };
    socket.send(JSON.stringify(signupData));
    // Handle server response for signup
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'signupResponse') {
            if (data.success) {
                window.location.href = "home.html"; // Redirect to home on success
            } else {
                alert('Signup failed: ' + data.message);
            }
        }
    };

  }
}
