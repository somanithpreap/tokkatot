// ===============================================
// GLOBAL UTILITY FUNCTIONS
// ===============================================

/**
 * Core utility functions for the Smart Poultry application
 * Handles authentication, URL management, and common functionality
 */

// Add loading state management
let isLoading = false;

/**
 * Show loading spinner
 */
function showLoading() {
    if (isLoading) return;
    isLoading = true;
    
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.id = 'global-spinner';
    document.body.appendChild(spinner);
}

/**
 * Hide loading spinner
 */
function hideLoading() {
    isLoading = false;
    const spinner = document.getElementById('global-spinner');
    if (spinner) {
        spinner.remove();
    }
}

// ===============================================
// AUTHENTICATION MANAGEMENT
// ===============================================

/**
 * Get the current authenticated username from JWT token
 * @returns {string|null} Username or null if not authenticated
 */
function getUsername() {
    try {
        const cookies = document.cookie.split(";");
        let tokenCookie = null;
        
        // Find the token cookie
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split("=");
            if (name === "token") {
                tokenCookie = value;
                break;
            }
        }
        
        if (!tokenCookie) {
            console.warn("No authentication token found");
            redirectToLogin();
            return null;
        }
        
        // Parse JWT token
        const tokenParts = tokenCookie.split(".");
        if (tokenParts.length !== 3) {
            console.error("Invalid token format");
            clearAuthenticationAndRedirect();
            return null;
        }
        
        // Decode the payload
        const payload = b64DecodeUnicode(tokenParts[1]);
        const tokenData = JSON.parse(payload);
        
        // Validate token data
        if (!tokenData.client_id) {
            console.error("Invalid token data: missing client_id");
            clearAuthenticationAndRedirect();
            return null;
        }
        
        // Check if token is expired
        if (tokenData.exp && Date.now() >= tokenData.exp * 1000) {
            console.warn("Token has expired");
            clearAuthenticationAndRedirect();
            return null;
        }
        
        return tokenData.client_id;
        
    } catch (error) {
        console.error("Error parsing authentication token:", error);
        clearAuthenticationAndRedirect();
        return null;
    }
}

/**
 * Check if user is currently authenticated
 * @returns {boolean} True if authenticated
 */
function isAuthenticated() {
    try {
        const username = getUsername();
        return username !== null && username !== undefined;
    } catch (error) {
        console.error("Error checking authentication status:", error);
        return false;
    }
}

/**
 * Get full user data from JWT token
 * @returns {Object|null} User data or null if not authenticated
 */
function getUserData() {
    try {
        const cookies = document.cookie.split(";");
        let tokenCookie = null;
        
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split("=");
            if (name === "token") {
                tokenCookie = value;
                break;
            }
        }
        
        if (!tokenCookie) {
            return null;
        }
        
        const tokenParts = tokenCookie.split(".");
        if (tokenParts.length !== 3) {
            return null;
        }
        
        const payload = b64DecodeUnicode(tokenParts[1]);
        return JSON.parse(payload);
        
    } catch (error) {
        console.error("Error getting user data:", error);
        return null;
    }
}

/**
 * Clear authentication and redirect to login
 */
function clearAuthenticationAndRedirect() {
    try {
        // Clear all cookies
        const cookies = document.cookie.split(";");
        cookies.forEach(cookie => {
            const [name] = cookie.trim().split("=");
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        });
        
        // Clear localStorage if any
        localStorage.clear();
        
        // Redirect to login
        redirectToLogin();
        
    } catch (error) {
        console.error("Error clearing authentication:", error);
        // Force redirect anyway
        redirectToLogin();
    }
}

/**
 * Redirect to login page
 */
function redirectToLogin() {
    const loginUrl = `${getURL()}/login`;
    console.log("Redirecting to login:", loginUrl);
    window.location.href = loginUrl;
}

/**
 * Logout the current user
 */
function logout() {
    try {
        clearAuthenticationAndRedirect();
    } catch (error) {
        console.error("Error during logout:", error);
        // Force redirect to login page
        window.location.href = `${getURL()}/login`;
    }
}

// ===============================================
// ENCODING/DECODING UTILITIES
// ===============================================

/**
 * Decode base64 encoded Unicode string (JWT payload)
 * @param {string} str - Base64 encoded string
 * @returns {string} Decoded Unicode string
 */
function b64DecodeUnicode(str) {
    try {
        // Going backwards: from bytestream, to percent-encoding, to original string
        return decodeURIComponent(
            atob(str)
                .split("")
                .map(function (c) {
                    return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
                })
                .join("")
        );
    } catch (error) {
        console.error("Error decoding base64 string:", error);
        throw new Error("Failed to decode authentication token");
    }
}

/**
 * Encode Unicode string to base64
 * @param {string} str - Unicode string to encode
 * @returns {string} Base64 encoded string
 */
function b64EncodeUnicode(str) {
    try {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
            function toSolidBytes(match, p1) {
                return String.fromCharCode('0x' + p1);
            }));
    } catch (error) {
        console.error("Error encoding to base64:", error);
        throw new Error("Failed to encode string");
    }
}

// ===============================================
// URL AND NAVIGATION UTILITIES
// ===============================================

/**
 * Get the base URL of the application
 * @returns {string} Base URL (protocol + hostname + port)
 */
function getURL() {
    // Use TokkatotConfig if available (from config.js)
    if (window.TokkatotConfig) {
        return window.TokkatotConfig.getApiBaseUrl();
    }
    
    // Fallback: detect environment
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        // Development: middleware runs on port 4000
        return 'http://localhost:4000';
    } else if (hostname === '10.0.0.1') {
        // Raspberry Pi: middleware on same host, port 4000
        return 'http://10.0.0.1:4000';
    } else {
        // Production: same origin
        return window.location.origin;
    }
}

/**
 * Get current page path
 * @returns {string} Current page path
 */
function getCurrentPath() {
    return window.location.pathname;
}

/**
 * Navigate to a specific page
 * @param {string} path - Path to navigate to (relative to base URL)
 */
function navigateTo(path) {
    try {
        const url = path.startsWith('/') ? `${getURL()}${path}` : `${getURL()}/${path}`;
        window.location.href = url;
    } catch (error) {
        console.error("Error navigating to path:", path, error);
    }
}

/**
 * Check if current page requires authentication
 * @returns {boolean} True if page requires authentication
 */
function requiresAuthentication() {
    const publicPages = ['/login', '/signup', '/404'];
    const currentPath = getCurrentPath();
    
    return !publicPages.some(page => currentPath.includes(page));
}

// ===============================================
// SESSION MANAGEMENT
// ===============================================

/**
 * Set up session monitoring
 */
function setupSessionMonitoring() {
    // Check authentication status periodically
    setInterval(() => {
        if (requiresAuthentication() && !isAuthenticated()) {
            console.warn("Session expired, redirecting to login");
            clearAuthenticationAndRedirect();
        }
    }, 60000); // Check every minute
    
    // Handle page focus to revalidate session
    window.addEventListener('focus', () => {
        if (requiresAuthentication() && !isAuthenticated()) {
            clearAuthenticationAndRedirect();
        }
    });
}

// ===============================================
// DOM UTILITIES
// ===============================================

/**
 * Safely get element by ID
 * @param {string} id - Element ID
 * @returns {HTMLElement|null} Element or null if not found
 */
function getElementById(id) {
    try {
        return document.getElementById(id);
    } catch (error) {
        console.error(`Error getting element with ID '${id}':`, error);
        return null;
    }
}

/**
 * Safely set element content
 * @param {string} id - Element ID
 * @param {string} content - Content to set
 * @param {string} method - Method to use ('textContent', 'innerHTML')
 */
function setElementContent(id, content, method = 'textContent') {
    try {
        const element = getElementById(id);
        if (element) {
            element[method] = content;
        } else {
            console.warn(`Element with ID '${id}' not found`);
        }
    } catch (error) {
        console.error(`Error setting content for element '${id}':`, error);
    }
}

// ===============================================
// ERROR HANDLING UTILITIES
// ===============================================

/**
 * Handle and log errors consistently
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 * @param {boolean} showToUser - Whether to show error to user
 */
function handleError(error, context = "Unknown", showToUser = false) {
    const errorMessage = `Error in ${context}: ${error.message}`;
    console.error(errorMessage, error);
    
    if (showToUser) {
        // Show user-friendly error message
        showErrorNotification("មានបញ្ហាកើតឡើង។ សូមព្យាយាមម្តងទៀត។");
    }
}

/**
 * Show error notification to user
 * @param {string} message - Error message in Khmer
 */
function showErrorNotification(message) {
    try {
        // Create or update error notification
        let notification = document.querySelector('.error-notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.className = 'error-notification';
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (notification) {
                notification.style.display = 'none';
            }
        }, 5000);
        
    } catch (error) {
        console.error("Error showing notification:", error);
    }
}

// ===============================================
// INITIALIZATION
// ===============================================

/**
 * Initialize global functionality when DOM is ready
 */
function initializeGlobalFunctions() {
    try {
        // Set username in header if element exists
        const usernameElement = getElementById("username");
        if (usernameElement) {
            const username = getUsername();
            if (username) {
                setElementContent("username", username);
            }
        }
        
        // Setup session monitoring for authenticated pages
        if (requiresAuthentication()) {
            setupSessionMonitoring();
            
            // Verify authentication immediately
            if (!isAuthenticated()) {
                clearAuthenticationAndRedirect();
                return;
            }
        }
        
        console.log("Global functions initialized successfully");
        
    } catch (error) {
        handleError(error, "Global initialization", false);
    }
}

// ===============================================
// AUTO-INITIALIZATION
// ===============================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGlobalFunctions);
} else {
    // DOM is already ready
    initializeGlobalFunctions();
}

// ===============================================
// BACKWARDS COMPATIBILITY
// ===============================================

// Maintain compatibility with existing code that checks for username element
if (getElementById("username")) {
    const username = getUsername();
    if (username) {
        setElementContent("username", username);
    }
}
