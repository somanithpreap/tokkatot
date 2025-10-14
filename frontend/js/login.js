/*
==============================================
TOKKATOT - LOGIN FORM HANDLER
==============================================
Smart Poultry System - User Authentication
Author: CamTech University Students
Description: Login form validation and submission logic
==============================================
*/

// ===========================================
// CONFIGURATION AND SETUP
// ===========================================

/**
 * Initialize form configuration on page load
 */
document.addEventListener("DOMContentLoaded", () => {
    initializeLoginForm();
    setupPasswordToggle();
    setupFormValidation();
});

// ===========================================
// FORM INITIALIZATION
// ===========================================

/**
 * Initialize form URLs and basic setup
 */
function initializeLoginForm() {
    const form = document.querySelector("form");
    const signupLink = document.getElementById("signup-link");
    
    // Set form action URL and signup link
    form.action = getURL() + "/login";
    signupLink.href = getURL() + "/register";
}

// ===========================================
// DOM ELEMENT REFERENCES
// ===========================================

/**
 * Get form elements for easier access
 */
function getFormElements() {
    const form = document.querySelector("form");
    return {
        form: form,
        usernameField: form.querySelector(".username"),
        usernameInput: form.querySelector(".username input"),
        passwordField: form.querySelector(".password"),
        passwordInput: form.querySelector(".password input"),
        togglePassword: document.querySelector(".toggle-password")
    };
}

// ===========================================
// PASSWORD VISIBILITY TOGGLE
// ===========================================

/**
 * Setup password visibility toggle functionality
 */
function setupPasswordToggle() {
    const { passwordInput, togglePassword } = getFormElements();
    
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener("click", () => {
            togglePasswordVisibility(passwordInput, togglePassword);
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
    const { form } = getFormElements();
    
    if (form) {
        form.addEventListener("submit", handleFormSubmission);
    }
}

/**
 * Handle form submission with validation
 * @param {Event} event - Form submission event
 */
function handleFormSubmission(event) {
    event.preventDefault();
    
    const { form, usernameField, passwordField } = getFormElements();
    
    // Validate form fields
    const isUsernameValid = validateUsername();
    const isPasswordValid = validatePassword();
    
    // Submit if all validations pass
    if (isUsernameValid && isPasswordValid) {
        submitLoginForm(form);
    }
}

/**
 * Submit login form to server
 * @param {HTMLFormElement} form - Form element to submit
 */
async function submitLoginForm(form) {
    try {
        const formData = new FormData(form);
        
        const response = await fetch(form.action, {
            method: "POST",
            body: formData,
        });
        
        if (response.ok) {
            // Successful login - redirect to home
            window.location.href = "/";
        } else {
            // Handle server errors
            const errorData = await response.json();
            handleServerErrors(errorData.error);
            console.error("Login Error:", errorData.error);
        }
    } catch (error) {
        console.error("Network Error:", error);
        showGenericError();
    }
}

// ===========================================
// FIELD VALIDATION FUNCTIONS
// ===========================================

/**
 * Validate username field
 * @returns {boolean} True if valid, false otherwise
 */
function validateUsername() {
    const { usernameField, usernameInput } = getFormElements();
    
    if (!usernameInput.value.trim()) {
        setFieldError(usernameField, "Username can't be blank");
        return false;
    }
    
    setFieldValid(usernameField);
    return true;
}

/**
 * Validate password field
 * @returns {boolean} True if valid, false otherwise
 */
function validatePassword() {
    const { passwordField, passwordInput } = getFormElements();
    
    if (!passwordInput.value.trim()) {
        setFieldError(passwordField, "Password can't be blank");
        return false;
    }
    
    setFieldValid(passwordField);
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
function setFieldError(field, message) {
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
function setFieldValid(field) {
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
function handleServerErrors(errorType) {
    const { usernameField, passwordField } = getFormElements();
    
    switch (errorType) {
        case "Invalid username":
            setFieldError(usernameField, "ឈ្មោះអ្នកប្រើប្រាស់មិនត្រឹមត្រូវ");
            break;
        case "Invalid password":
            setFieldError(passwordField, "ពាក្យសម្ងាត់មិនត្រឹមត្រូវ");
            break;
        default:
            showGenericError();
            break;
    }
}

/**
 * Show generic error message for unexpected errors
 */
function showGenericError() {
    console.error("An unexpected error occurred during login");
    // Could be enhanced with a toast notification or modal
}
