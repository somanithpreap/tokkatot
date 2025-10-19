// ===============================================
// PROFILE PAGE MANAGEMENT
// ===============================================

/**
 * Profile management functionality for user data handling
 */

// ===============================================
// DOM ELEMENTS AND STATE
// ===============================================

let profileElements = {};
let isLoading = false;

// ===============================================
// INITIALIZATION
// ===============================================

/**
 * Initialize profile page when DOM is loaded
 */
document.addEventListener("DOMContentLoaded", initializeProfile);

/**
 * Initialize all profile functionality
 */
async function initializeProfile() {
    try {
        cacheProfileElements();
        setupEventListeners();
        setupFormValidation();
        await loadUserProfileData();
    } catch (error) {
        console.error("Failed to initialize profile page:", error);
        showNotification("មានបញ្ហាក្នុងការផ្ទុកទំព័រ", "error");
    }
}

/**
 * Cache DOM elements for better performance
 */
function cacheProfileElements() {
    profileElements = {
        form: document.getElementById("userInfoForm"),
        notification: document.getElementById("notification"),
        fullName: document.getElementById("fullName"),
        phoneNumber: document.getElementById("phoneNumber"),
        gender: document.getElementById("gender"),
        province: document.getElementById("province"),
        submitButton: document.querySelector("button[type='submit']"),
        usernameHeader: document.getElementById("username")
    };
    
    // Verify critical elements exist
    if (!profileElements.form) {
        throw new Error("Profile form not found");
    }
}

// ===============================================
// EVENT LISTENERS SETUP
// ===============================================

/**
 * Setup all event listeners for profile functionality
 */
function setupEventListeners() {
    // Form submission
    if (profileElements.form) {
        profileElements.form.addEventListener("submit", handleProfileSubmit);
    }
    
    // Phone number validation
    if (profileElements.phoneNumber) {
        profileElements.phoneNumber.addEventListener("input", handlePhoneNumberInput);
        profileElements.phoneNumber.addEventListener("blur", validatePhoneNumber);
    }
    
    // Real-time form validation
    const formInputs = [
        profileElements.fullName,
        profileElements.phoneNumber,
        profileElements.gender,
        profileElements.province
    ].filter(Boolean);
    
    formInputs.forEach(input => {
        input.addEventListener("blur", () => validateField(input));
        input.addEventListener("input", () => clearFieldError(input));
    });
}

// ===============================================
// DATA LOADING
// ===============================================

/**
 * Load user profile data from the API
 */
async function loadUserProfileData() {
    if (isLoading) return;
    
    try {
        setLoadingState(true);
        
        const response = await fetchWithTimeout(`${getURL()}/api/profile`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const userData = await response.json();
        populateProfileForm(userData);
        updateHeaderUsername(userData.full_name);
        
    } catch (error) {
        console.error("Error loading user profile data:", error);
        handleProfileLoadError(error);
    } finally {
        setLoadingState(false);
    }
}

/**
 * Populate form fields with user data
 * @param {Object} userData - User profile data
 */
function populateProfileForm(userData) {
    try {
        const fieldMappings = {
            fullName: userData.full_name || "",
            phoneNumber: userData.phone_number || "",
            gender: userData.gender || "",
            province: userData.province || ""
        };
        
        Object.entries(fieldMappings).forEach(([fieldName, value]) => {
            const element = profileElements[fieldName];
            if (element) {
                element.value = value;
                // Trigger validation for populated fields
                if (value) {
                    validateField(element);
                }
            }
        });
        
    } catch (error) {
        console.error("Error populating profile form:", error);
    }
}

// ===============================================
// FORM SUBMISSION
// ===============================================

/**
 * Handle profile form submission
 * @param {Event} event - Form submit event
 */
async function handleProfileSubmit(event) {
    event.preventDefault();
    
    if (isLoading) return;
    
    try {
        // Validate form before submission
        if (!validateProfileForm()) {
            showNotification("សូមបំពេញព័ត៌មានឱ្យបានត្រឹមត្រូវ", "error");
            return;
        }
        
        setLoadingState(true);
        
        const profileData = collectProfileFormData();
        await saveProfileData(profileData);
        
        updateHeaderUsername(profileData.full_name);
        showNotification("ទិន្នន័យត្រូវបានរក្សាទុកដោយជោគជ័យ", "success");
        
    } catch (error) {
        console.error("Error saving profile data:", error);
        handleProfileSaveError(error);
    } finally {
        setLoadingState(false);
    }
}

/**
 * Collect form data for profile update
 * @returns {Object} Profile data object
 */
function collectProfileFormData() {
    return {
        full_name: profileElements.fullName?.value?.trim() || "",
        phone_number: profileElements.phoneNumber?.value?.trim() || "",
        gender: profileElements.gender?.value || "",
        province: profileElements.province?.value || ""
    };
}

/**
 * Save profile data to the API
 * @param {Object} profileData - Profile data to save
 */
async function saveProfileData(profileData) {
    const response = await fetchWithTimeout(`${getURL()}/api/profile`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
}

// ===============================================
// FORM VALIDATION
// ===============================================

/**
 * Setup form validation rules
 */
function setupFormValidation() {
    // Add required attribute to critical fields
    if (profileElements.fullName) {
        profileElements.fullName.setAttribute('required', 'true');
    }
}

/**
 * Validate entire profile form
 * @returns {boolean} True if form is valid
 */
function validateProfileForm() {
    let isValid = true;
    
    // Validate full name
    if (!validateField(profileElements.fullName)) {
        isValid = false;
    }
    
    // Validate phone number
    if (!validateField(profileElements.phoneNumber)) {
        isValid = false;
    }
    
    return isValid;
}

/**
 * Validate individual form field
 * @param {HTMLElement} field - Form field to validate
 * @returns {boolean} True if field is valid
 */
function validateField(field) {
    if (!field) return true;
    
    clearFieldError(field);
    
    const value = field.value.trim();
    let isValid = true;
    let errorMessage = "";
    
    switch (field.id) {
        case 'fullName':
            if (!value) {
                errorMessage = "សូមបំពេញឈ្មោះពេញ";
                isValid = false;
            } else if (value.length < 2) {
                errorMessage = "ឈ្មោះត្រូវតែមានយ៉ាងតិច ២ តួអក្សរ";
                isValid = false;
            }
            break;
            
        case 'phoneNumber':
            if (value && !isValidPhoneNumber(value)) {
                errorMessage = "លេខទូរស័ព្ទមិនត្រឹមត្រូវ";
                isValid = false;
            }
            break;
    }
    
    if (!isValid) {
        showFieldError(field, errorMessage);
    }
    
    return isValid;
}

/**
 * Show field validation error
 * @param {HTMLElement} field - Form field
 * @param {string} message - Error message
 */
function showFieldError(field, message) {
    field.classList.add('error');
    
    // Remove existing error message
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
        existingError.remove();
    }
    
    // Add new error message
    const errorElement = document.createElement('div');
    errorElement.className = 'field-error';
    errorElement.textContent = message;
    field.parentNode.appendChild(errorElement);
}

/**
 * Clear field validation error
 * @param {HTMLElement} field - Form field
 */
function clearFieldError(field) {
    if (!field) return;
    
    field.classList.remove('error');
    const errorElement = field.parentNode.querySelector('.field-error');
    if (errorElement) {
        errorElement.remove();
    }
}

// ===============================================
// PHONE NUMBER HANDLING
// ===============================================

/**
 * Handle phone number input formatting
 * @param {Event} event - Input event
 */
function handlePhoneNumberInput(event) {
    try {
        let value = event.target.value.replace(/\D/g, "");
        
        // Ensure the number starts with 0
        if (value.length > 0 && value[0] !== "0") {
            value = "0" + value;
        }
        
        // Limit to 10 digits
        value = value.slice(0, 10);
        
        // Update the input value
        event.target.value = value;
        
    } catch (error) {
        console.error("Error formatting phone number:", error);
    }
}

/**
 * Validate phone number format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} True if valid
 */
function isValidPhoneNumber(phoneNumber) {
    // Cambodian phone number format: 0xxxxxxxxx (10 digits starting with 0)
    const phoneRegex = /^0\d{8,9}$/;
    return phoneRegex.test(phoneNumber);
}

/**
 * Validate phone number field
 */
function validatePhoneNumber() {
    validateField(profileElements.phoneNumber);
}

// ===============================================
// UI STATE MANAGEMENT
// ===============================================

/**
 * Set loading state for the form
 * @param {boolean} loading - Loading state
 */
function setLoadingState(loading) {
    isLoading = loading;
    
    if (profileElements.submitButton) {
        profileElements.submitButton.disabled = loading;
        profileElements.submitButton.textContent = loading ? "កំពុងរក្សាទុក..." : "រក្សាទុក";
    }
    
    if (profileElements.form) {
        profileElements.form.style.opacity = loading ? "0.7" : "1";
    }
}

/**
 * Update username in header
 * @param {string} fullName - User's full name
 */
function updateHeaderUsername(fullName) {
    try {
        if (profileElements.usernameHeader && fullName) {
            profileElements.usernameHeader.textContent = fullName;
        }
    } catch (error) {
        console.error("Error updating header username:", error);
    }
}

// ===============================================
// NOTIFICATION SYSTEM
// ===============================================

/**
 * Show notification message
 * @param {string} message - Message to display
 * @param {string} type - Notification type (success, error, warning)
 */
function showNotification(message, type = "success") {
    try {
        if (!profileElements.notification) {
            console.warn("Notification element not found");
            return;
        }
        
        profileElements.notification.textContent = message;
        profileElements.notification.className = `notification ${type} show`;
        
        // Auto-hide notification
        setTimeout(() => {
            if (profileElements.notification) {
                profileElements.notification.classList.remove("show");
            }
        }, 4000);
        
    } catch (error) {
        console.error("Error showing notification:", error);
    }
}

// ===============================================
// ERROR HANDLING
// ===============================================

/**
 * Handle profile data loading errors
 * @param {Error} error - Error object
 */
function handleProfileLoadError(error) {
    let message = "មានបញ្ហាក្នុងការទាញយកទិន្នន័យ";
    
    if (error.name === 'TimeoutError') {
        message = "ការតភ្ជាប់អ៊ីនធឺណិតយឺត សូមព្យាយាមម្តងទៀត";
    } else if (error.message.includes('404')) {
        message = "មិនមានទិន្នន័យគណនី";
    }
    
    showNotification(message, "error");
}

/**
 * Handle profile data saving errors
 * @param {Error} error - Error object
 */
function handleProfileSaveError(error) {
    let message = "មានបញ្ហាក្នុងការរក្សាទុកទិន្នន័យ";
    
    if (error.name === 'TimeoutError') {
        message = "ការតភ្ជាប់អ៊ីនធឺណិតយឺត សូមព្យាយាមម្តងទៀត";
    } else if (error.message.includes('validation')) {
        message = "ទិន្នន័យមិនត្រឹមត្រូវ សូមពិនិត្យម្តងទៀត";
    }
    
    showNotification(message, "error");
}

// ===============================================
// UTILITY FUNCTIONS
// ===============================================

/**
 * Fetch with timeout support
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise} Fetch promise
 */
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('TimeoutError')), timeout);
    });
    
    return Promise.race([
        fetch(url, options),
        timeoutPromise
    ]);
}
