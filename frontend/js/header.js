/*
==============================================
TOKKATOT - HEADER COMPONENT HANDLER
==============================================
Smart Poultry System - Header Component Logic
Author: CamTech University Students
Description: Header loading, datetime updates, and profile info
==============================================
*/

// ===========================================
// COMPONENT INITIALIZATION
// ===========================================

/**
 * Initialize header component when DOM is ready
 */
document.addEventListener("DOMContentLoaded", () => {
    loadHeaderComponent();
});

// ===========================================
// HEADER COMPONENT LOADING
// ===========================================

/**
 * Load header component from external file
 */
async function loadHeaderComponent() {
    try {
        const headerPlaceholder = document.getElementById("header-placeholder");
        
        if (!headerPlaceholder) {
            console.warn("Header placeholder not found");
            return;
        }

        const response = await fetch("../components/header.html");
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const headerHTML = await response.text();
        headerPlaceholder.innerHTML = headerHTML;
        
        // Initialize header functionality after loading
        initializeHeaderFunctionality();
        
    } catch (error) {
        console.error("Error loading header component:", error);
        showHeaderFallback();
    }
}

/**
 * Show fallback header if component loading fails
 */
function showHeaderFallback() {
    const headerPlaceholder = document.getElementById("header-placeholder");
    if (headerPlaceholder) {
        headerPlaceholder.innerHTML = `
            <header class="main-header">
                <div class="datetime">
                    <span>📅</span>
                    <b id="t">កំពុងចាក់ទិន្នន័យ...</b>
                    <span>🕰️</span>
                    <b id="t2">--:--:--</b>
                </div>
                <div class="profile-info">
                    <p><span>កសិករ ៖ </span><span id="username">--</span></p>
                    <img src="../assets/images/tokkatot logo-02.png" alt="Profile" />
                </div>
            </header>
        `;
        initializeHeaderFunctionality();
    }
}

// ===========================================
// HEADER FUNCTIONALITY INITIALIZATION
// ===========================================

/**
 * Initialize all header functionality after component is loaded
 */
function initializeHeaderFunctionality() {
    setupDateTimeUpdates();
    setupProfileInfo();
    setupProfileNavigation();
}

// ===========================================
// DATE AND TIME MANAGEMENT
// ===========================================

/**
 * Setup automatic date and time updates
 */
function setupDateTimeUpdates() {
    // Update immediately and then every second
    updateDateTime();
    setInterval(updateDateTime, 1000);
}

/**
 * Update date and time display with Khmer localization
 */
function updateDateTime() {
    try {
        const now = new Date();
        
        // Khmer day names
        const khmerDays = [
            "អាទិត្យ", "ចន្ទ", "អង្គារ", "ពុធ", 
            "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"
        ];
        
        // Khmer month names
        const khmerMonths = [
            "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា",
            "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"
        ];

        // Format date components
        const dayName = khmerDays[now.getDay()];
        const date = now.getDate();
        const monthName = khmerMonths[now.getMonth()];
        const year = now.getFullYear();

        // Format time components
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");

        // Update DOM elements safely
        const dateElement = document.getElementById("t");
        const timeElement = document.getElementById("t2");
        
        if (dateElement) {
            dateElement.textContent = `${dayName} ${date} ${monthName} ${year}`;
        }
        
        if (timeElement) {
            timeElement.textContent = `${hours}:${minutes}:${seconds}`;
        }
        
    } catch (error) {
        console.error("Error updating date/time:", error);
    }
}

// ===========================================
// PROFILE INFORMATION MANAGEMENT
// ===========================================

/**
 * Setup profile information display
 */
function setupProfileInfo() {
    try {
        const username = getUsername();
        const usernameElement = document.getElementById("username");
        
        if (usernameElement) {
            usernameElement.textContent = username || "មិនស្គាល់";
        }
    } catch (error) {
        console.error("Error setting up profile info:", error);
    }
}

/**
 * Setup profile navigation link
 */
function setupProfileNavigation() {
    try {
        const profileLink = document.querySelector(".profile-info");
        
        if (profileLink && typeof getURL === 'function') {
            profileLink.href = getURL() + "/profile";
        }
    } catch (error) {
        console.error("Error setting up profile navigation:", error);
    }
}
