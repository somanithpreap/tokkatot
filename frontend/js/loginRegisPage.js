const forms = document.querySelector(".forms"),
  pwShowHide = document.querySelectorAll(".eye-icon"),
  links = document.querySelectorAll(".link");

pwShowHide.forEach(eyeIcon => {
  eyeIcon.addEventListener("click", () => {
    let pwFields = eyeIcon.parentElement.parentElement.querySelectorAll(".password");
    pwFields.forEach(password => {
      if (password.type === "password") {
        password.type = "text";
        eyeIcon.classList.replace("bx-hide", "bx-show");
        return;
      }
      password.type = "password";
      eyeIcon.classList.replace("bx-show", "bx-hide");
    });
  });
});

links.forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    forms.classList.toggle("show-signup");
  });
});

const loginForm = document.querySelector(".form.login form");
const registerForm = document.querySelector(".form.signup form");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = loginForm.querySelector("input[type='email']").value;
  const password = loginForm.querySelector("input[type='password']").value;

  if (!email || !password) {
    alert('Please fill in all fields.');
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email, password })
    });
    const result = await response.json();
    if (response.ok) {
      alert(result.message);
      localStorage.setItem('token', result.token);
      // Redirect to dashboard or another page
    } else {
      alert(result.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred. Please try again.');
  }
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = registerForm.querySelector("input[type='email']").value;
  const password = registerForm.querySelector("input[type='password']").value;
  const confirmPassword = registerForm.querySelector("input[placeholder='Confirm password']").value;

  if (!email || !password || !confirmPassword) {
    alert('Please fill in all fields.');
    return;
  }

  if (password !== confirmPassword) {
    alert('Passwords do not match.');
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email, password })
    });
    const result = await response.json();
    if (response.ok) {
      alert(result.message);
      forms.classList.remove("show-signup");
    } else {
      alert(result.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred. Please try again.');
  }
});

document.querySelectorAll('.facebook').forEach(button => {
  button.addEventListener('click', () => {
    FB.login(response => {
      if (response.authResponse) {
        FB.api('/me', {fields: 'name,email'}, userInfo => {
          console.log('User info:', userInfo);
          alert(`Logged in as: ${userInfo.name}`);
        });
      } else {
        alert('User cancelled login or did not fully authorize.');
      }
    }, {scope: 'email'});
  });
});

function handleCredentialResponse(response) {
  const userInfo = jwt_decode(response.credential);
  console.log('User info:', userInfo);
  alert(`Logged in as: ${userInfo.name}`);
}

window.onload = function () {
  google.accounts.id.initialize({
    client_id: '637493509328-2hcu2l7nceh2at7927f43umhp7mk3msm.apps.googleusercontent.com',
    callback: handleCredentialResponse
  });
  google.accounts.id.renderButton(
    document.querySelector('.google'),
    { theme: 'outline', size: 'large' }
  );
};

document.querySelectorAll('.google').forEach(button => {
  button.addEventListener('click', () => {
    google.accounts.id.prompt(); // This will show the Google Sign-In prompt
  });
});