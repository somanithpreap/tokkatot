document.querySelector("form").action = getURL() + "/register";
document.getElementById("login-link").href = getURL();

const form = document.querySelector("form"),
    uField = form.querySelector(".username"),
    uInput = uField.querySelector("input"),
    pField = form.querySelector(".password"),
    pInput = pField.querySelector("input"),
    cpField = form.querySelector(".confirm-password"),
    cpInput = cpField.querySelector("input"),
    kField = form.querySelector(".registration-key"),
    kInput = kField.querySelector("input");

// Get the toggle password icons
const togglePassword = document.querySelector(".toggle-password");
const toggleConfirmPassword = document.querySelector(".toggle-confirm-password");

// Password toggle functionality
document.addEventListener("DOMContentLoaded", () => {
    // Toggle password visibility
    togglePassword.addEventListener("click", function () {
        const type = pInput.getAttribute("type") === "password" ? "text" : "password";
        pInput.setAttribute("type", type);
        this.classList.toggle("fa-eye");
        this.classList.toggle("fa-eye-slash");
    });

    // Toggle confirm password visibility
    toggleConfirmPassword.addEventListener("click", function () {
        const type = cpInput.getAttribute("type") === "password" ? "text" : "password";
        cpInput.setAttribute("type", type);
        this.classList.toggle("fa-eye");
        this.classList.toggle("fa-eye-slash");
    });
});

form.addEventListener("submit", function (event) {
    event.preventDefault();

    checkUsername();
    checkPass();
    checkConfirmPass();
    checkRegKey();

    if (!uField.classList.contains("error") && !pField.classList.contains("error") && !cpField.classList.contains("error") && !kField.classList.contains("error")) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        fetch(form.action, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        })
            .then((response) => {
                if (!response.ok) {
                    return response.json().then((error) => {
                        throw error;
                    });
                }
                return response.json();
            })
            .then((result) => {
                if (result.error) {
                    handleServerErrors(result.error);
                } else {
                    window.location.href = "/";
                }
            })
            .catch((error) => {
                console.error("Error:", error);
                handleServerErrors(error);
            });
    }
});

function handleServerErrors(errors) {
    if (errors.username) {
        uField.classList.add("error");
        let errorTxt = uField.querySelector(".error-txt");
        errorTxt.innerText = errors.username;
    }
    if (errors.password) {
        pField.classList.add("error");
        let errorTxt = pField.querySelector(".error-txt");
        errorTxt.innerText = errors.password;
    }
    if (errors.confirmPassword) {
        cpField.classList.add("error");
        let errorTxt = cpField.querySelector(".error-txt");
        errorTxt.innerText = errors.confirmPassword;
    }
    if (errors.registrationKey) {
        kField.classList.add("error");
        let errorTxt = kField.querySelector(".error-txt");
        errorTxt.innerText = errors.registrationKey;
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
    } else if (pInput.value.length < 8) {
        pField.classList.add("error");
        pField.classList.remove("valid");
        let errorTxt = pField.querySelector(".error-txt");
        errorTxt.innerText = "Password must be at least 8 characters";
    } else {
        pField.classList.remove("error");
        pField.classList.add("valid");
    }
}

function checkConfirmPass() {
    if (cpInput.value == "" || cpInput.value !== pInput.value) {
        cpField.classList.add("error");
        cpField.classList.remove("valid");
        let errorTxt = cpField.querySelector(".error-txt");
        (cpInput.value != "") ? errorTxt.innerText = "Passwords do not match" : errorTxt.innerText = "Confirm Password can't be blank";
    } else {
        cpField.classList.remove("error");
        cpField.classList.add("valid");
    }
}

function checkRegKey() {
    if (kInput.value == "") {
        kField.classList.add("error");
        kField.classList.remove("valid");
        let errorTxt = kField.querySelector(".error-txt");
        errorTxt.innerText = "Registration key can't be blank";
    } else {
        kField.classList.remove("error");
        kField.classList.add("valid");
    }
}

/*
// Socket functionality
if (typeof socket !== 'undefined') {
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
}

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
    } else {
      pField.classList.remove("error");
      pField.classList.add("valid");
    }
  }

  function checkConfirmPass() {
    if (cpInput.value == "" || cpInput.value !== pInput.value) {
      cpField.classList.add("error");
      cpField.classList.remove("valid");
      let errorTxt = cpField.querySelector(".error-txt");
      (cpInput.value != "") ? errorTxt.innerText = "Passwords do not match" : errorTxt.innerText = "Confirm Password can't be blank";
    } else {
      cpField.classList.remove("error");
      cpField.classList.add("valid");
    }
  }

  if (!uField.classList.contains("error") && !pField.classList.contains("error") && !cpField.classList.contains("error")) {
    const signupData = {
      type: 'signup',
      username: uInput.value,
      password: pInput.value
    };
    if (typeof socket !== 'undefined') {
      socket.send(JSON.stringify(signupData));
    }
  }
}
*/
