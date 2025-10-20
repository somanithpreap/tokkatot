/* ===============================================
   TOKKATOT API CONFIGURATION
   ===============================================
   Centralized configuration for API endpoints
   Handles both development and production environments
   =============================================== */

// Environment configuration
const CONFIG = {
    // API Base URLs for different environments
    API_BASE_URL: {
        development: 'http://localhost:4000',  // Go middleware server
        production: window.location.origin,    // Same origin in production
        raspberry: 'http://10.0.0.1:4000'  // Raspberry Pi local IP
    },
    
    // Detect current environment
    getCurrentEnvironment() {
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'development';
        } else if (hostname === '10.0.0.1') {
            return 'raspberry';
        } else {
            return 'production';
        }
    },
    
    // Get the correct API base URL
    getApiBaseUrl() {
        const env = this.getCurrentEnvironment();
        return this.API_BASE_URL[env];
    },
    
    // Get full API endpoint URL
    getApiUrl(endpoint) {
        const baseUrl = this.getApiBaseUrl();
        return endpoint.startsWith('/') ? `${baseUrl}${endpoint}` : `${baseUrl}/${endpoint}`;
    }
};

// Global function to get base URL (updated for API server)
function getURL() {
    return CONFIG.getApiBaseUrl();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

// Make available globally
window.TokkatotConfig = CONFIG;