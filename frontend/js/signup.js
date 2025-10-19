/*
==============================================
TOKKATOT - SIGNUP FORM HANDLER
==============================================
Smart Poultry System - User Registration
Author: CamTech University Students
Description: Registration form validation and submission logic
==============================================
*/

// ===========================================
// CONFIGURATION AND SETUP
// ===========================================

/**
 * Initialize form configuration on page load
 */
document.addEventListener("DOMContentLoaded", () => {
    initializeSignupForm();
    setupPasswordToggles();
    setupFormValidation();
});

// ===========================================
// FORM INITIALIZATION
// ===========================================

/**
 * Initialize form URLs and basic setup
 */
function initializeSignupForm() {
    const form = document.querySelector("form");
    const loginLink = document.getElementById("login-link");
    
    // Set form action URL and login link
    form.action = getURL() + "/register";
    loginLink.href = getURL() + "/login";
}

// ===========================================
// DOM ELEMENT REFERENCES
// ===========================================

/**
 * Get form elements for easier access
 */
function getSignupFormElements() {
    const form = document.querySelector("form");
    return {
        form: form,
        usernameField: form.querySelector(".username"),
        usernameInput: form.querySelector(".username input"),
        passwordField: form.querySelector(".password"),
        passwordInput: form.querySelector(".password input"),
        confirmPasswordField: form.querySelector(".confirm-password"),
        confirmPasswordInput: form.querySelector(".confirm-password input"),
        registrationKeyField: form.querySelector(".registration-key"),
        registrationKeyInput: form.querySelector(".registration-key input"),
        togglePassword: document.querySelector(".toggle-password"),
        toggleConfirmPassword: document.querySelector(".toggle-confirm-password")
    };
}

// ===========================================
// PASSWORD VISIBILITY TOGGLES
// ===========================================

/**
 * Setup password visibility toggle functionality for both password fields
 */
function setupPasswordToggles() {
    const { passwordInput, confirmPasswordInput, togglePassword, toggleConfirmPassword } = getSignupFormElements();
    
    // Main password toggle
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener("click", () => {
            togglePasswordVisibility(passwordInput, togglePassword);
        });
    }
    
    // Confirm password toggle
    if (toggleConfirmPassword && confirmPasswordInput) {
        toggleConfirmPassword.addEventListener("click", () => {
            togglePasswordVisibility(confirmPasswordInput, toggleConfirmPassword);
        });
    }
}

/**
 * Toggle password field visibility
 * @param {HTMLInputElement} passwordInput - Password input element
 * @param {HTMLElement} toggleIcon - Toggle icon element
 */
function togglePasswordVisibility(passwordInput, toggleIcon) {
    const isPassword = passwordInput.getAttribute("type") === "password";
    
    // Toggle input type
    passwordInput.setAttribute("type", isPassword ? "text" : "password");
    
    // Toggle icon classes
    toggleIcon.classList.toggle("fa-eye", !isPassword);
    toggleIcon.classList.toggle("fa-eye-slash", isPassword);
}

// ===========================================
// FORM VALIDATION SETUP
// ===========================================

/**
 * Setup form validation and submission handlers
 */
function setupFormValidation() {
    const { form } = getSignupFormElements();
    
    if (form) {
        form.addEventListener("submit", handleSignupFormSubmission);
    }
}

/**
 * Handle form submission with validation
 * @param {Event} event - Form submission event
 */
function handleSignupFormSubmission(event) {
    event.preventDefault();
    
    const { form } = getSignupFormElements();
    
    // Validate all form fields
    const validationResults = [
        validateSignupUsername(),
        validateSignupPassword(),
        validateConfirmPassword(),
        validateRegistrationKey()
    ];
    
    // Submit if all validations pass
    if (validationResults.every(result => result === true)) {
        submitSignupForm(form);
    }
}

/**
 * Submit signup form to server
 * @param {HTMLFormElement} form - Form element to submit
 */
async function submitSignupForm(form) {
    try {
        const formData = new FormData(form);
        
        const response = await fetch(form.action, {
            method: "POST",
            body: formData,
        });
        
        if (response.ok) {
            // Successful registration - redirect to home
            window.location.href = "/";
        } else {
            // Handle server errors
            const errorData = await response.json();
            handleSignupServerErrors(errorData.error);
            console.error("Registration Error:", errorData.error);
        }
    } catch (error) {
        console.error("Network Error:", error);
        showSignupGenericError();
    }
}

// ===========================================
// FIELD VALIDATION FUNCTIONS
// ===========================================

/**
 * Validate username field
 * @returns {boolean} True if valid, false otherwise
 */
function validateSignupUsername() {
    const { usernameField, usernameInput } = getSignupFormElements();
    
    if (!usernameInput.value.trim()) {
        setSignupFieldError(usernameField, "Username can't be blank");
        return false;
    }
    
    setSignupFieldValid(usernameField);
    return true;
}

/**
 * Validate password field
 * @returns {boolean} True if valid, false otherwise
 */
function validateSignupPassword() {
    const { passwordField, passwordInput } = getSignupFormElements();
    const password = passwordInput.value.trim();
    
    if (!password) {
        setSignupFieldError(passwordField, "Password can't be blank");
        return false;
    }
    
    if (password.length < 8) {
        setSignupFieldError(passwordField, "Password must be at least 8 characters");
        return false;
    }
    
    setSignupFieldValid(passwordField);
    return true;
}

/**
 * Validate confirm password field
 * @returns {boolean} True if valid, false otherwise
 */
function validateConfirmPassword() {
    const { confirmPasswordField, confirmPasswordInput, passwordInput } = getSignupFormElements();
    const confirmPassword = confirmPasswordInput.value.trim();
    const password = passwordInput.value.trim();
    
    if (!confirmPassword) {
        setSignupFieldError(confirmPasswordField, "Confirm Password can't be blank");
        return false;
    }
    
    if (confirmPassword !== password) {
        setSignupFieldError(confirmPasswordField, "Passwords do not match");
        return false;
    }
    
    setSignupFieldValid(confirmPasswordField);
    return true;
}

/**
 * Validate registration key field
 * @returns {boolean} True if valid, false otherwise
 */
function validateRegistrationKey() {
    const { registrationKeyField, registrationKeyInput } = getSignupFormElements();
    
    if (!registrationKeyInput.value.trim()) {
        setSignupFieldError(registrationKeyField, "Registration key can't be blank");
        return false;
    }
    
    setSignupFieldValid(registrationKeyField);
    return true;
}

// ===========================================
// FIELD STATE MANAGEMENT
// ===========================================

/**
 * Set field to error state with message
 * @param {HTMLElement} field - Field container element
 * @param {string} message - Error message to display
 */
function setSignupFieldError(field, message) {
    field.classList.add("error");
    field.classList.remove("valid");
    
    const errorElement = field.querySelector(".error-txt");
    if (errorElement) {
        errorElement.innerText = message;
    }
}

/**
 * Set field to valid state
 * @param {HTMLElement} field - Field container element
 */
function setSignupFieldValid(field) {
    field.classList.remove("error");
    field.classList.add("valid");
}

// ===========================================
// ERROR HANDLING
// ===========================================

/**
 * Handle server-side validation errors
 * @param {string} errorType - Type of error from server
 */
function handleSignupServerErrors(errorType) {
    const { 
        usernameField, 
        passwordField, 
        registrationKeyField 
    } = getSignupFormElements();
    
    const errorMessages = {
        "Invalid username": {
            field: usernameField,
            message: "ឈ្មោះអ្នកប្រើប្រាស់មិនត្រឹមត្រូវ"
        },
        "Password must be at least 8 characters": {
            field: passwordField,
            message: "ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៨ តួអក្សរ"
        },
        "Username already taken": {
            field: usernameField,
            message: "ឈ្មោះអ្នកប្រើប្រាស់មានរួចហើយ"
        },
        "Failed to hash password": {
            field: passwordField,
            message: "បរាជ័យក្នុងការអ៊ិនគ្រីបពាក្យសម្ងាត់"
        },
        "Invalid registration key": {
            field: registrationKeyField,
            message: "លេខកូដចុះឈ្មោះមិនត្រឹមត្រូវ"
        }
    };
    
    const systemErrorMessages = {
        "Failed to register": "បរាជ័យក្នុងការចុះឈ្មោះ សូមព្យាយាមម្ដងទៀតនៅពេលក្រោយ",
        "Database error": "ឃ្លាំងផ្ទុកទិន្នន័យមានបញ្ហា សូមព្យាយាមម្ដងទៀតនៅពេលក្រោយ",
        "Internal server error": "ស៊ើវើមានបញ្ហា សូមព្យាយាមម្ដងទៀតនៅពេលក្រោយ"
    };
    
    // Handle field-specific errors
    if (errorMessages[errorType]) {
        const { field, message } = errorMessages[errorType];
        setSignupFieldError(field, message);
        return;
    }
    
    // Handle system-level errors
    if (systemErrorMessages[errorType]) {
        alert(systemErrorMessages[errorType]);
        return;
    }
    
    // Fallback for unknown errors
    showSignupGenericError();
}

/**
 * Show generic error message for unexpected errors
 */
function showSignupGenericError() {
    console.error("An unexpected error occurred during registration");
    alert("មានបញ្ហាមិនរំពឹងទុក សូមព្យាយាមម្ដងទៀតនៅពេលក្រោយ");
}
