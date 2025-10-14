// ===============================================
// DISEASE DETECTION PAGE MANAGEMENT
// ===============================================

/**
 * AI-powered disease detection functionality
 * Handles image upload, processing, and result display
 */

// ===============================================
// DOM ELEMENTS AND STATE
// ===============================================

let detectionElements = {};
let isProcessing = false;
let currentImageFile = null;

// Configuration constants
const DETECTION_CONFIG = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    SUPPORTED_FORMATS: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    API_ENDPOINTS: {
        PREDICT: '/api/ai/predict-disease',
        HEALTH: '/api/ai/health'
    },
    TIMEOUTS: {
        UPLOAD: 30000,  // 30 seconds for upload
        HEALTH_CHECK: 5000  // 5 seconds for health check
    },
    SCROLL_BEHAVIOR: {
        behavior: 'smooth',
        block: 'center'
    }
};

// ===============================================
// INITIALIZATION
// ===============================================

/**
 * Initialize disease detection functionality when DOM is loaded
 */
document.addEventListener("DOMContentLoaded", initializeDiseaseDetection);

/**
 * Initialize all disease detection functionality
 */
function initializeDiseaseDetection() {
    try {
        cacheDetectionElements();
        setupEventListeners();
        setupAccessibility();
        checkAIServiceHealth();
        
        console.log("Disease detection page initialized successfully");
        
    } catch (error) {
        console.error("Failed to initialize disease detection:", error);
        handleInitializationError();
    }
}

/**
 * Cache DOM elements for better performance
 */
function cacheDetectionElements() {
    detectionElements = {
        uploadArea: document.getElementById('uploadArea'),
        cameraBtn: document.getElementById('cameraBtn'),
        uploadBtn: document.getElementById('uploadBtn'),
        fileInput: document.getElementById('fileInput'),
        uploadInput: document.getElementById('uploadInput'),
        imagePreview: document.getElementById('imagePreview'),
        loading: document.getElementById('loading'),
        resultContainer: document.getElementById('resultContainer'),
        resultTitle: document.getElementById('resultTitle'),
        confidenceFill: document.getElementById('confidenceFill'),
        confidenceText: document.getElementById('confidenceText'),
        recommendationText: document.getElementById('recommendationText')
    };
    
    // Verify critical elements exist
    const requiredElements = ['uploadArea', 'cameraBtn', 'uploadBtn', 'fileInput', 'uploadInput'];
    requiredElements.forEach(elementKey => {
        if (!detectionElements[elementKey]) {
            throw new Error(`Required element '${elementKey}' not found`);
        }
    });
}

// ===============================================
// EVENT LISTENERS SETUP
// ===============================================

/**
 * Setup all event listeners for disease detection functionality
 */
function setupEventListeners() {
    // Button click handlers
    detectionElements.cameraBtn.addEventListener('click', handleCameraClick);
    detectionElements.uploadBtn.addEventListener('click', handleUploadClick);
    
    // File input handlers
    detectionElements.fileInput.addEventListener('change', handleFileSelect);
    detectionElements.uploadInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop handlers
    setupDragAndDrop();
    
    // Touch handlers for mobile
    setupTouchHandlers();
    
    // Keyboard navigation
    setupKeyboardNavigation();
}

/**
 * Setup drag and drop functionality
 */
function setupDragAndDrop() {
    const uploadArea = detectionElements.uploadArea;
    
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // Prevent default drag behaviors on document
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.addEventListener(eventName, preventDefaults, false);
    });
}

/**
 * Setup touch handlers for mobile devices
 */
function setupTouchHandlers() {
    const uploadArea = detectionElements.uploadArea;
    
    uploadArea.addEventListener('touchstart', handleTouchStart);
    uploadArea.addEventListener('touchend', handleTouchEnd);
    
    // Prevent zoom on double tap
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
}

/**
 * Setup keyboard navigation for accessibility
 */
function setupKeyboardNavigation() {
    const uploadArea = detectionElements.uploadArea;
    
    uploadArea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            detectionElements.uploadInput.click();
        }
    });
}

/**
 * Setup accessibility features
 */
function setupAccessibility() {
    // Add ARIA attributes
    detectionElements.uploadArea.setAttribute('role', 'button');
    detectionElements.uploadArea.setAttribute('aria-label', 'ជ្រើសរើសរូបភាពសម្រាប់វិភាគជំងឺ');
    detectionElements.uploadArea.setAttribute('tabindex', '0');
    
    // Screen reader announcements
    const srAnnouncement = document.createElement('div');
    srAnnouncement.className = 'detection-sr-only';
    srAnnouncement.setAttribute('aria-live', 'polite');
    srAnnouncement.setAttribute('aria-atomic', 'true');
    srAnnouncement.id = 'sr-announcement';
    document.body.appendChild(srAnnouncement);
}

// ===============================================
// EVENT HANDLERS
// ===============================================

/**
 * Handle camera button click
 */
function handleCameraClick() {
    try {
        announceToScreenReader('បើកកាមេរ៉ាសម្រាប់ថតរូប');
        detectionElements.fileInput.click();
    } catch (error) {
        console.error("Error opening camera:", error);
        showNotification("មិនអាចបើកកាមេរ៉ាបាន", "error");
    }
}

/**
 * Handle upload button click
 */
function handleUploadClick() {
    try {
        announceToScreenReader('ជ្រើសរើសរូបភាពពីឧបករណ៍');
        detectionElements.uploadInput.click();
    } catch (error) {
        console.error("Error opening file dialog:", error);
        showNotification("មិនអាចបើកកម្មវិធីជ្រើសរើសឯកសារបាន", "error");
    }
}

/**
 * Handle file selection from input
 * @param {Event} event - Change event from file input
 */
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        processSelectedFile(file);
    }
}

/**
 * Handle drag over event
 * @param {Event} event - Drag event
 */
function handleDragOver(event) {
    preventDefaults(event);
    detectionElements.uploadArea.classList.add('dragover');
}

/**
 * Handle drag leave event
 * @param {Event} event - Drag event
 */
function handleDragLeave(event) {
    preventDefaults(event);
    detectionElements.uploadArea.classList.remove('dragover');
}

/**
 * Handle drop event
 * @param {Event} event - Drop event
 */
function handleDrop(event) {
    preventDefaults(event);
    detectionElements.uploadArea.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        processSelectedFile(files[0]);
    }
}

/**
 * Handle touch start event
 * @param {Event} event - Touch event
 */
function handleTouchStart(event) {
    event.preventDefault();
}

/**
 * Handle touch end event
 * @param {Event} event - Touch event
 */
function handleTouchEnd(event) {
    event.preventDefault();
    detectionElements.uploadInput.click();
}

/**
 * Prevent default behaviors
 * @param {Event} event - Event to prevent
 */
function preventDefaults(event) {
    event.preventDefault();
    event.stopPropagation();
}

// ===============================================
// FILE PROCESSING
// ===============================================

/**
 * Process selected file for disease detection
 * @param {File} file - Selected image file
 */
function processSelectedFile(file) {
    try {
        // Validate file
        const validation = validateImageFile(file);
        if (!validation.isValid) {
            showNotification(validation.message, "error");
            return;
        }
        
        currentImageFile = file;
        displayImagePreview(file);
        uploadAndAnalyze(file);
        
    } catch (error) {
        console.error("Error processing file:", error);
        showNotification("មានបញ្ហាក្នុងការដំណើរការឯកសារ", "error");
    }
}

/**
 * Validate image file
 * @param {File} file - File to validate
 * @returns {Object} Validation result
 */
function validateImageFile(file) {
    // Check file type
    if (!DETECTION_CONFIG.SUPPORTED_FORMATS.includes(file.type)) {
        return {
            isValid: false,
            message: 'សូមជ្រើសរើសឯកសាររូបភាព (JPEG, PNG, WebP)'
        };
    }
    
    // Check file size
    if (file.size > DETECTION_CONFIG.MAX_FILE_SIZE) {
        return {
            isValid: false,
            message: `ទំហំឯកសារត្រូវតែតិចជាង ${Math.round(DETECTION_CONFIG.MAX_FILE_SIZE / (1024 * 1024))}MB`
        };
    }
    
    return { isValid: true };
}

/**
 * Display image preview
 * @param {File} file - Image file to preview
 */
function displayImagePreview(file) {
    try {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            detectionElements.imagePreview.src = event.target.result;
            detectionElements.imagePreview.classList.remove('detection-hidden');
            
            // Announce to screen reader
            announceToScreenReader('រូបភាពត្រូវបានផ្ទុក និងកំពុងបង្ហាញ');
            
            // Scroll to preview on mobile
            if (window.innerWidth < 768) {
                setTimeout(() => {
                    detectionElements.imagePreview.scrollIntoView(DETECTION_CONFIG.SCROLL_BEHAVIOR);
                }, 200);
            }
        };
        
        reader.onerror = () => {
            throw new Error('Failed to read file');
        };
        
        reader.readAsDataURL(file);
        
    } catch (error) {
        console.error("Error displaying image preview:", error);
        showNotification("មិនអាចបង្ហាញរូបភាពបាន", "error");
    }
}

// ===============================================
// AI ANALYSIS
// ===============================================

/**
 * Upload image and analyze with AI
 * @param {File} file - Image file to analyze
 */
async function uploadAndAnalyze(file) {
    if (isProcessing) {
        return;
    }
    
    try {
        setProcessingState(true);
        announceToScreenReader('កំពុងវិភាគរូបភាពដោយប្រើ AI');
        
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetchWithTimeout(
            DETECTION_CONFIG.API_ENDPOINTS.PREDICT,
            {
                method: 'POST',
                body: formData
            },
            DETECTION_CONFIG.TIMEOUTS.UPLOAD
        );
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            displayAnalysisResult(result.prediction);
        } else {
            throw new Error(result.error || 'Analysis failed');
        }
        
    } catch (error) {
        console.error("Error during AI analysis:", error);
        handleAnalysisError(error);
    } finally {
        setProcessingState(false);
    }
}

/**
 * Display analysis result
 * @param {Object} prediction - AI prediction result
 */
function displayAnalysisResult(prediction) {
    try {
        const { predicted_disease, confidence, is_healthy, recommendation } = prediction;
        
        // Set result title and styling
        if (is_healthy) {
            detectionElements.resultTitle.textContent = `✅ ${predicted_disease}`;
            detectionElements.resultContainer.className = 'detection-result-container detection-result-healthy show';
            announceToScreenReader(`លទ្ធផល៖ មាន់មានសុខភាពល្អ។ ${predicted_disease}`);
        } else {
            detectionElements.resultTitle.textContent = `⚠️ រកឃើញជំងឺ ${predicted_disease}`;
            detectionElements.resultContainer.className = 'detection-result-container detection-result-disease show';
            announceToScreenReader(`លទ្ធផល៖ រកឃើញជំងឺ ${predicted_disease}។ កម្រិតជឿជាក់ ${Math.round(confidence * 100)} ភាគរយ`);
        }
        
        // Update confidence display
        updateConfidenceDisplay(confidence);
        
        // Set recommendation
        detectionElements.recommendationText.textContent = recommendation;
        
        // Scroll to results on mobile
        if (window.innerWidth < 768) {
            setTimeout(() => {
                detectionElements.resultContainer.scrollIntoView(DETECTION_CONFIG.SCROLL_BEHAVIOR);
            }, 300);
        }
        
    } catch (error) {
        console.error("Error displaying analysis result:", error);
        displayErrorResult("មានបញ្ហាក្នុងការបង្ហាញលទ្ធផល");
    }
}

/**
 * Update confidence display with animation
 * @param {number} confidence - Confidence value (0-1)
 */
function updateConfidenceDisplay(confidence) {
    const confidencePercent = Math.round(confidence * 100);
    
    // Animate confidence bar
    setTimeout(() => {
        detectionElements.confidenceFill.style.width = confidencePercent + '%';
    }, 100);
    
    detectionElements.confidenceText.textContent = confidencePercent + '%';
    
    // Add visual feedback based on confidence level
    if (confidencePercent >= 80) {
        detectionElements.confidenceFill.style.background = 'linear-gradient(90deg, #28a745, #20c997)';
    } else if (confidencePercent >= 60) {
        detectionElements.confidenceFill.style.background = 'linear-gradient(90deg, #ffc107, #fd7e14)';
    } else {
        detectionElements.confidenceFill.style.background = 'linear-gradient(90deg, #dc3545, #e83e8c)';
    }
}

/**
 * Display error result
 * @param {string} errorMessage - Error message to display
 */
function displayErrorResult(errorMessage) {
    try {
        detectionElements.resultContainer.className = 'detection-result-container detection-result-disease show';
        detectionElements.resultTitle.textContent = '❌ ការវិភាគបរាជ័យ';
        detectionElements.confidenceFill.style.width = '0%';
        detectionElements.confidenceText.textContent = '';
        detectionElements.recommendationText.textContent = errorMessage;
        
        announceToScreenReader(`ការវិភាគបរាជ័យ៖ ${errorMessage}`);
        
    } catch (error) {
        console.error("Error displaying error result:", error);
    }
}

// ===============================================
// UI STATE MANAGEMENT
// ===============================================

/**
 * Set processing state
 * @param {boolean} processing - Whether processing is active
 */
function setProcessingState(processing) {
    isProcessing = processing;
    
    if (processing) {
        detectionElements.loading.classList.add('show');
        detectionElements.resultContainer.classList.remove('show');
        
        // Disable controls
        detectionElements.cameraBtn.disabled = true;
        detectionElements.uploadBtn.disabled = true;
        detectionElements.uploadArea.style.pointerEvents = 'none';
        
    } else {
        detectionElements.loading.classList.remove('show');
        
        // Re-enable controls
        detectionElements.cameraBtn.disabled = false;
        detectionElements.uploadBtn.disabled = false;
        detectionElements.uploadArea.style.pointerEvents = 'auto';
    }
}

/**
 * Reset detection interface
 */
function resetDetection() {
    try {
        detectionElements.imagePreview.classList.add('detection-hidden');
        detectionElements.resultContainer.classList.remove('show');
        detectionElements.loading.classList.remove('show');
        
        // Clear file inputs
        detectionElements.fileInput.value = '';
        detectionElements.uploadInput.value = '';
        
        // Reset state
        currentImageFile = null;
        isProcessing = false;
        
        // Re-enable controls
        setProcessingState(false);
        
        announceToScreenReader('ទំព័រត្រូវបានកំណត់ឡើងវិញសម្រាប់ការវិភាគថ្មី');
        
        // Focus on upload area
        detectionElements.uploadArea.focus();
        
    } catch (error) {
        console.error("Error resetting detection:", error);
    }
}

// ===============================================
// AI SERVICE HEALTH CHECK
// ===============================================

/**
 * Check AI service health
 */
async function checkAIServiceHealth() {
    try {
        const response = await fetchWithTimeout(
            DETECTION_CONFIG.API_ENDPOINTS.HEALTH,
            { method: 'GET' },
            DETECTION_CONFIG.TIMEOUTS.HEALTH_CHECK
        );
        
        if (!response.ok) {
            throw new Error(`Health check failed: ${response.status}`);
        }
        
        const health = await response.json();
        
        if (!health.model_loaded) {
            console.warn('AI model not loaded. Disease detection may not work.');
            showNotification('ប្រព័ន្ធ AI មិនទាន់រួចរាល់។ ការវិភាគអាចមិនដំណើរការ', 'warning');
        } else {
            console.log('AI service is healthy and ready');
        }
        
    } catch (error) {
        console.error('AI service health check failed:', error);
        showNotification('មិនអាចតភ្ជាប់ទៅកាន់ប្រព័ន្ធ AI', 'warning');
    }
}

// ===============================================
// ERROR HANDLING
// ===============================================

/**
 * Handle initialization errors
 */
function handleInitializationError() {
    const container = document.querySelector('.disease-detection-container');
    if (container) {
        container.innerHTML = `
            <div class="error-state">
                <h3>មានបញ្ហាក្នុងការផ្ទុកទំព័រ</h3>
                <p>សូមបញ្ជាក់ការតភ្ជាប់អ៊ីនធឺណិត និងព្យាយាមម្តងទៀត</p>
                <button onclick="location.reload()">ព្យាយាមម្តងទៀត</button>
            </div>
        `;
    }
}

/**
 * Handle analysis errors
 * @param {Error} error - Error object
 */
function handleAnalysisError(error) {
    let message = 'មានបញ្ហាក្នុងការវិភាគរូបភាព';
    
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
        message = 'ការវិភាគចំណាយពេលយូរពេក។ សូមព្យាយាមម្តងទៀត';
    } else if (error.message.includes('413')) {
        message = 'រូបភាពធំពេក។ សូមជ្រើសរើសរូបភាពតូចជាងនេះ';
    } else if (error.message.includes('400')) {
        message = 'រូបភាពមិនត្រឹមត្រូវ។ សូមជ្រើសរើសរូបភាពមាន់';
    } else if (error.message.includes('500')) {
        message = 'មានបញ្ហាកម្មវិធី។ សូមព្យាយាមម្តងទៀតក្រោយមួយភ្លែត';
    }
    
    displayErrorResult(message);
}

// ===============================================
// UTILITY FUNCTIONS
// ===============================================

/**
 * Fetch with timeout support
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise} Fetch promise with timeout
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

/**
 * Show notification to user
 * @param {string} message - Notification message
 * @param {string} type - Notification type
 */
function showNotification(message, type = 'info') {
    // Create or update notification
    let notification = document.querySelector('.detection-notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'detection-notification';
        document.body.appendChild(notification);
    }
    
    notification.className = `detection-notification ${type} show`;
    notification.textContent = message;
    
    // Auto-hide notification
    setTimeout(() => {
        if (notification) {
            notification.classList.remove('show');
        }
    }, 5000);
    
    // Announce to screen reader
    announceToScreenReader(message);
}

/**
 * Announce message to screen reader
 * @param {string} message - Message to announce
 */
function announceToScreenReader(message) {
    const announcement = document.getElementById('sr-announcement');
    if (announcement) {
        announcement.textContent = message;
    }
}

// ===============================================
// GLOBAL FUNCTIONS (for HTML onclick handlers)
// ===============================================

/**
 * Global reset function for onclick handler
 */
window.resetDetection = resetDetection;