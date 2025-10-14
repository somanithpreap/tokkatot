// ===============================================
// NAVBAR COMPONENT LOADER
// ===============================================

/**
 * Initialize navbar component loading on DOM content loaded
 */
document.addEventListener("DOMContentLoaded", initializeNavbar);

// ===============================================
// MAIN NAVBAR INITIALIZATION
// ===============================================

/**
 * Initialize the navbar component and setup navigation
 */
async function initializeNavbar() {
    try {
        await loadNavbarComponent();
        setupNavbarNavigation();
        updateActiveNavigation();
    } catch (error) {
        console.error("Failed to initialize navbar:", error);
        handleNavbarLoadError();
    }
}

// ===============================================
// COMPONENT LOADING
// ===============================================

/**
 * Load navbar component from HTML file
 * @returns {Promise<void>}
 */
async function loadNavbarComponent() {
    try {
        const response = await fetch("../components/navbar.html");
        
        if (!response.ok) {
            throw new Error(`Failed to load navbar: ${response.status} ${response.statusText}`);
        }
        
        const navbarHTML = await response.text();
        
        if (!navbarHTML.trim()) {
            throw new Error("Navbar component is empty");
        }
        
        document.body.insertAdjacentHTML("beforeend", navbarHTML);
        
    } catch (error) {
        console.error("Error loading navbar component:", error);
        throw error;
    }
}

// ===============================================
// NAVIGATION SETUP
// ===============================================

/**
 * Setup navigation links with proper URLs
 */
function setupNavbarNavigation() {
    try {
        const baseURL = getURL();
        
        // Navigation link configurations
        const navLinks = [
            { id: "nav-home", path: "" },
            { id: "nav-settings", path: "/settings" },
            { id: "nav-profile", path: "/profile" },
            { id: "nav-detection", path: "/disease-detection" }
        ];
        
        // Setup each navigation link
        navLinks.forEach(({ id, path }) => {
            setupNavigationLink(id, baseURL + path);
        });
        
    } catch (error) {
        console.error("Error setting up navbar navigation:", error);
    }
}

/**
 * Setup individual navigation link
 * @param {string} elementId - The ID of the navigation element
 * @param {string} href - The URL to navigate to
 */
function setupNavigationLink(elementId, href) {
    try {
        const element = document.getElementById(elementId);
        
        if (element) {
            element.href = href;
            
            // Add click event for analytics or custom handling if needed
            element.addEventListener('click', (e) => {
                handleNavigationClick(elementId, href, e);
            });
        } else {
            console.warn(`Navigation element with ID '${elementId}' not found`);
        }
        
    } catch (error) {
        console.error(`Error setting up navigation link ${elementId}:`, error);
    }
}

// ===============================================
// NAVIGATION STATE MANAGEMENT
// ===============================================

/**
 * Update active navigation based on current page
 */
function updateActiveNavigation() {
    try {
        const currentPath = window.location.pathname;
        const navItems = document.querySelectorAll('.nav-item');
        
        navItems.forEach(item => {
            const link = item.querySelector('a');
            if (link) {
                const linkPath = new URL(link.href).pathname;
                
                if (linkPath === currentPath || 
                    (currentPath === '/' && linkPath.endsWith('/')) ||
                    (currentPath.includes(linkPath) && linkPath !== '/')) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            }
        });
        
    } catch (error) {
        console.error("Error updating active navigation:", error);
    }
}

// ===============================================
// EVENT HANDLERS
// ===============================================

/**
 * Handle navigation click events
 * @param {string} elementId - The ID of the clicked element
 * @param {string} href - The destination URL
 * @param {Event} event - The click event
 */
function handleNavigationClick(elementId, href, event) {
    try {
        // Log navigation for analytics if needed
        console.debug(`Navigation clicked: ${elementId} -> ${href}`);
        
        // Add any custom navigation logic here
        // For example, you could prevent navigation and show loading state
        
    } catch (error) {
        console.error("Error handling navigation click:", error);
    }
}

/**
 * Handle navbar loading errors with fallback
 */
function handleNavbarLoadError() {
    try {
        console.warn("Creating fallback navbar");
        
        // Create minimal fallback navbar
        const fallbackNavbar = createFallbackNavbar();
        document.body.insertAdjacentHTML("beforeend", fallbackNavbar);
        
    } catch (error) {
        console.error("Failed to create fallback navbar:", error);
    }
}

/**
 * Create fallback navbar HTML
 * @returns {string} Fallback navbar HTML
 */
function createFallbackNavbar() {
    const baseURL = getURL();
    
    return `
        <nav class="bottom-navbar" role="navigation" aria-label="ការរុករកមុខម្ហូបសំខាន់">
            <div class="nav-container">
                <a href="${baseURL}" class="nav-item" id="nav-home-fallback">
                    <i class="fas fa-home"></i>
                    <span>ផ្ទះ</span>
                </a>
                <a href="${baseURL}/settings" class="nav-item" id="nav-settings-fallback">
                    <i class="fas fa-cog"></i>
                    <span>ការកំណត់</span>
                </a>
            </div>
        </nav>
    `;
}
