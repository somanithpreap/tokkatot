// ===============================================
// HOME DASHBOARD MANAGEMENT
// ===============================================

/**
 * Main dashboard functionality for home page
 * Handles temperature/humidity monitoring, charts, and real-time updates
 */

// ===============================================
// GLOBAL STATE AND CONFIGURATION
// ===============================================

let temperatureChart = null;
let dataUpdateInterval = null;
let chartUpdateInterval = null;
let isPageVisible = true;

// Configuration constants
const CONFIG = {
    UPDATE_INTERVALS: {
        CURRENT_DATA: 5000,      // 5 seconds for current data
        HISTORICAL_DATA: 30000,  // 30 seconds for historical data
        CHART_REFRESH: 60000     // 1 minute for full chart refresh
    },
    CHART_SETTINGS: {
        MAX_DATA_POINTS: 48,     // Maximum points to show on chart
        GROUPING_INTERVAL: 30,   // Minutes to group data points
        TIME_RANGE_HOURS: 24     // Hours of data to display
    },
    // API endpoints (will be resolved at runtime)
    getApiEndpoints() {
        const baseUrl = getURL();
        return {
            CURRENT: `${baseUrl}/api/get-current-data`,
            HISTORICAL: `${baseUrl}/api/get-historical-data`
        };
    }
};

// ===============================================
// INITIALIZATION
// ===============================================

/**
 * Initialize the home dashboard when DOM is loaded
 */
document.addEventListener("DOMContentLoaded", initializeDashboard);

/**
 * Handle page visibility changes to optimize performance
 */
document.addEventListener("visibilitychange", handleVisibilityChange);

/**
 * Initialize all dashboard functionality
 */
async function initializeDashboard() {
    try {
        await initializeChart();
        setupDataFetching();
        setupWebSocketHandlers();
        setupPerformanceOptimizations();
        
        console.log("Dashboard initialized successfully");
    } catch (error) {
        console.error("Failed to initialize dashboard:", error);
        handleInitializationError();
    }
}

// ===============================================
// CHART INITIALIZATION AND CONFIGURATION
// ===============================================

/**
 * Initialize the temperature/humidity chart
 */
async function initializeChart() {
    const chartCanvas = document.getElementById("temperatureChart");
    
    if (!chartCanvas) {
        throw new Error("Chart canvas element not found");
    }
    
    try {
        temperatureChart = new Chart(chartCanvas, getChartConfiguration());
        await loadInitialData();
    } catch (error) {
        console.error("Error initializing chart:", error);
        throw error;
    }
}

/**
 * Get chart configuration object
 * @returns {Object} Chart.js configuration
 */
function getChartConfiguration() {
    return {
        type: "line",
        data: {
            labels: [],
            datasets: [
                {
                    label: "សីតុណ្ហភាព (°C)",
                    data: [],
                    borderColor: "#FFBA49",
                    backgroundColor: "rgba(255, 186, 73, 0.1)",
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2,
                    pointBackgroundColor: "#FFBA49",
                    yAxisID: 'y',
                },
                {
                    label: "សំណើម (%)",
                    data: [],
                    borderColor: "#4FC3F7",
                    backgroundColor: "rgba(79, 195, 247, 0.1)",
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 2,
                    pointBackgroundColor: "#4FC3F7",
                    yAxisID: 'y1',
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { size: 12 },
                    },
                },
                tooltip: {
                    mode: "index",
                    intersect: false,
                    callbacks: {
                        title: function(context) {
                            return context[0].label;
                        },
                        label: function (context) {
                            const suffix = context.datasetIndex === 0 ? '°C' : '%';
                            const label = context.datasetIndex === 0 ? 'សីតុណ្ហភាព' : 'សំណើម';
                            return `${label}: ${context.parsed.y}${suffix}`;
                        },
                    },
                },
            },
            scales: {
                x: {
                    grid: {
                        display: true,
                        color: "rgba(0, 0, 0, 0.05)",
                    },
                    ticks: {
                        maxRotation: 45,
                        font: { size: 10 },
                        maxTicksLimit: 12,
                    },
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: false,
                    grid: {
                        color: "rgba(255, 186, 73, 0.1)",
                    },
                    ticks: {
                        font: { size: 10 },
                        callback: function(value) {
                            return value + '°C';
                        },
                    },
                    title: {
                        display: true,
                        text: 'សីតុណ្ហភាព (°C)',
                        font: { size: 12 },
                    },
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        drawOnChartArea: false,
                    },
                    ticks: {
                        font: { size: 10 },
                        callback: function(value) {
                            return value + '%';
                        },
                    },
                    title: {
                        display: true,
                        text: 'សំណើម (%)',
                        font: { size: 12 },
                    },
                },
            },
        },
    };
}

// ===============================================
// DATA FETCHING AND MANAGEMENT
// ===============================================

/**
 * Load initial data for the dashboard
 */
async function loadInitialData() {
    try {
        await Promise.all([
            fetchCurrentData(),
            fetchHistoricalData()
        ]);
    } catch (error) {
        console.error("Error loading initial data:", error);
        showError("both");
    }
}

/**
 * Setup automatic data fetching intervals
 */
function setupDataFetching() {
    // Clear existing intervals
    clearDataIntervals();
    
    // Setup new intervals
    dataUpdateInterval = setInterval(() => {
        if (isPageVisible) {
            fetchCurrentData();
        }
    }, CONFIG.UPDATE_INTERVALS.CURRENT_DATA);
    
    chartUpdateInterval = setInterval(() => {
        if (isPageVisible) {
            fetchHistoricalData();
        }
    }, CONFIG.UPDATE_INTERVALS.HISTORICAL_DATA);
}

/**
 * Fetch current temperature and humidity data
 */
async function fetchCurrentData() {
    try {
        showLoading();
        const endpoints = CONFIG.getApiEndpoints();
        const response = await fetchWithTimeout(endpoints.CURRENT);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        let data = await response.json();
        
        // Handle different response formats
        if (typeof data.data === 'string') {
            data = JSON.parse(data.data);
        } else if (data.data) {
            data = data.data;
        }
        
        updateCurrentValues(data);
        updateDataQualityIndicator(true);
        
    } catch (error) {
        console.error("Error fetching current data:", error);
        
        // Use demo data for development/testing
        const now = new Date();
        const hour = now.getHours();
        
        // Simulate realistic daily temperature pattern
        const baseTemp = 26; // Base temperature
        const tempVariation = 3 * Math.sin((hour - 6) * Math.PI / 12); // Daily cycle
        const randomNoise = (Math.random() - 0.5) * 2; // ±1°C noise
        
        // Simulate realistic humidity (inverse relationship with temp)
        const baseHumidity = 70;
        const humidityVariation = -tempVariation * 2; // Opposite to temp
        const humidityNoise = (Math.random() - 0.5) * 5; // ±2.5% noise
        
        const demoData = {
            temperature: Math.round((baseTemp + tempVariation + randomNoise) * 10) / 10,
            humidity: Math.round((baseHumidity + humidityVariation + humidityNoise) * 10) / 10,
            timestamp: now.toISOString()
        };
        
        console.log("Using realistic demo data:", demoData);
        updateCurrentValues(demoData);
        updateDataQualityIndicator(false);
        
        // Show user-friendly notification
        if (window.showWarning) {
            window.showWarning(
                'កំពុងប្រើទិន្នន័យសាកល្បង - សូមពិនិត្យការភ្ជាប់ទៅកាន់ hardware',
                'មិនអាចភ្ជាប់ទៅ sensors'
            );
        }
    } finally {
        hideLoading();
    }
}

/**
 * Fetch historical temperature and humidity data
 */
async function fetchHistoricalData() {
    try {
        const endpoints = CONFIG.getApiEndpoints();
        const response = await fetchWithTimeout(endpoints.HISTORICAL);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        let data = await response.json();
        
        // Handle different response formats
        if (typeof data.data === 'string') {
            data = JSON.parse(data.data);
        } else if (data.data) {
            data = data.data;
        }
        
        if (Array.isArray(data) && data.length > 0) {
            updateChart(data);
            console.log(`Updated chart with ${data.length} data points`);
        } else {
            console.warn("No historical data received");
        }
        
    } catch (error) {
        console.error("Error fetching historical data:", error);
        handleHistoricalDataError();
    }
}

// ===============================================
// UI UPDATE FUNCTIONS
// ===============================================

/**
 * Update current temperature and humidity display values
 * @param {Object} data - Current sensor data
 */
function updateCurrentValues(data) {
    try {
        const tempElement = document.getElementById("current-temp");
        const humidityElement = document.getElementById("current-humidity");
        
        if (data.temperature !== undefined && tempElement) {
            const temp = parseFloat(data.temperature);
            tempElement.textContent = isNaN(temp) ? "--" : temp.toFixed(1);
        }
        
        if (data.humidity !== undefined && humidityElement) {
            const humidity = parseFloat(data.humidity);
            humidityElement.textContent = isNaN(humidity) ? "--" : humidity.toFixed(1);
        }
        
        updateLastUpdateTime();
        
    } catch (error) {
        console.error("Error updating current values:", error);
    }
}

/**
 * Update the temperature and humidity chart
 * @param {Array} data - Historical sensor data
 */
function updateChart(data) {
    if (!temperatureChart || !Array.isArray(data) || data.length === 0) {
        console.warn("Cannot update chart: invalid data or chart not initialized");
        return;
    }
    
    try {
        // Process and sort data
        const processedData = processDataForChart(data);
        
        if (processedData.length === 0) {
            console.warn("No processed data available for chart");
            return;
        }
        
        // Update chart data
        const timestamps = processedData.map(item => formatTimestampForChart(item.date));
        const temperatures = processedData.map(item => item.temperature);
        const humidities = processedData.map(item => item.humidity);
        
        temperatureChart.data.labels = timestamps;
        temperatureChart.data.datasets[0].data = temperatures;
        temperatureChart.data.datasets[1].data = humidities;
        temperatureChart.update('none'); // Use 'none' for better performance
        
    } catch (error) {
        console.error("Error updating chart:", error);
    }
}

/**
 * Update data quality indicator
 * @param {boolean} hasData - Whether current data is available
 */
function updateDataQualityIndicator(hasData) {
    const indicator = document.querySelector('.data-status');
    if (indicator) {
        indicator.className = `data-status ${hasData ? 'online' : 'offline'}`;
        indicator.textContent = hasData ? 'ទាន់សម័យ' : 'មិនទាន់សម័យ';
    }
}

/**
 * Update last update time display
 */
function updateLastUpdateTime() {
    const timeElement = document.querySelector('.last-update');
    if (timeElement) {
        const now = new Date();
        timeElement.textContent = `ការធ្វើឱ្យទាន់សម័យចុងក្រោយ: ${now.toLocaleTimeString('km-KH')}`;
    }
}

// ===============================================
// DATA PROCESSING FUNCTIONS
// ===============================================

/**
 * Process raw data for chart display
 * @param {Array} data - Raw sensor data
 * @returns {Array} Processed data suitable for chart
 */
function processDataForChart(data) {
    try {
        // Sort data by timestamp
        const sortedData = data.sort((a, b) => {
            const dateA = parseTimestamp(a.timestamp);
            const dateB = parseTimestamp(b.timestamp);
            return dateA - dateB;
        });
        
        // Filter data from the specified time range
        const now = new Date();
        const timeRangeMs = CONFIG.CHART_SETTINGS.TIME_RANGE_HOURS * 60 * 60 * 1000;
        const cutoffTime = new Date(now.getTime() - timeRangeMs);
        
        const recentData = sortedData.filter(item => {
            const itemDate = parseTimestamp(item.timestamp);
            return itemDate >= cutoffTime && isValidSensorData(item);
        });
        
        // Group data to reduce chart complexity
        return groupDataByInterval(recentData);
        
    } catch (error) {
        console.error("Error processing chart data:", error);
        return [];
    }
}

/**
 * Validate sensor data
 * @param {Object} item - Sensor data item
 * @returns {boolean} True if data is valid
 */
function isValidSensorData(item) {
    const temp = parseFloat(item.temperature);
    const humidity = parseFloat(item.humidity);
    
    return !isNaN(temp) && !isNaN(humidity) &&
           temp >= -50 && temp <= 100 &&  // Reasonable temperature range
           humidity >= 0 && humidity <= 100; // Valid humidity range
}

/**
 * Group data points by time intervals for better chart performance
 * @param {Array} data - Sensor data array
 * @returns {Array} Grouped data
 */
function groupDataByInterval(data) {
    if (data.length <= CONFIG.CHART_SETTINGS.MAX_DATA_POINTS) {
        // Return as-is if data is already within limits
        return data.map(item => ({
            date: parseTimestamp(item.timestamp),
            temperature: parseFloat(item.temperature) || 0,
            humidity: parseFloat(item.humidity) || 0
        }));
    }
    
    // Group data into intervals
    const intervalMs = CONFIG.CHART_SETTINGS.GROUPING_INTERVAL * 60 * 1000;
    const groupedData = [];
    
    for (let i = 0; i < data.length; i += Math.ceil(data.length / CONFIG.CHART_SETTINGS.MAX_DATA_POINTS)) {
        const chunk = data.slice(i, i + Math.ceil(data.length / CONFIG.CHART_SETTINGS.MAX_DATA_POINTS));
        
        if (chunk.length > 0) {
            const avgTemp = chunk.reduce((sum, item) => sum + (parseFloat(item.temperature) || 0), 0) / chunk.length;
            const avgHumidity = chunk.reduce((sum, item) => sum + (parseFloat(item.humidity) || 0), 0) / chunk.length;
            
            groupedData.push({
                date: parseTimestamp(chunk[Math.floor(chunk.length / 2)].timestamp),
                temperature: Math.round(avgTemp * 10) / 10,
                humidity: Math.round(avgHumidity * 10) / 10
            });
        }
    }
    
    return groupedData;
}

/**
 * Parse timestamp from various formats
 * @param {*} timestamp - Timestamp in various formats
 * @returns {Date} Parsed date object
 */
function parseTimestamp(timestamp) {
    let date;
    
    if (timestamp instanceof Date) {
        date = timestamp;
    } else if (typeof timestamp === 'string') {
        date = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
        // Handle both seconds and milliseconds timestamps
        date = timestamp < 10000000000 ? new Date(timestamp * 1000) : new Date(timestamp);
    } else {
        console.warn('Invalid timestamp format:', timestamp);
        return new Date();
    }
    
    if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp value:', timestamp);
        return new Date();
    }
    
    return date;
}

/**
 * Format timestamp for chart labels with Khmer localization
 * @param {Date} date - Date to format
 * @returns {string} Formatted time string
 */
function formatTimestampForChart(date) {
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    
    if (diffInHours < 1) {
        return diffInMinutes < 5 ? 'ឥឡូវនេះ' : `${diffInMinutes}នាទី`;
    } else if (diffInHours < 12) {
        const hours = Math.floor(diffInHours);
        const minutes = diffInMinutes % 60;
        return minutes === 0 ? `${hours}ម៉ោង` : `${hours}ម៉:${minutes.toString().padStart(2, '0')}`;
    } else if (diffInHours < 24) {
        return `ថ្ងៃនេះ ${date.toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    } else if (diffInHours < 48) {
        return `ម្សិលមិញ ${date.toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    } else {
        const days = Math.floor(diffInHours / 24);
        return `${days}ថ្ងៃមុន`;
    }
}

// ===============================================
// ERROR HANDLING
// ===============================================

/**
 * Handle current data fetch errors
 */
function handleCurrentDataError() {
    showError("current");
    updateDataQualityIndicator(false);
}

/**
 * Handle historical data fetch errors
 */
function handleHistoricalDataError() {
    showError("historical");
}

/**
 * Handle initialization errors
 */
function handleInitializationError() {
    const errorContainer = document.querySelector('.dashboard-container');
    if (errorContainer) {
        errorContainer.innerHTML = `
            <div class="error-state">
                <h3>មានបញ្ហាក្នុងការផ្ទុកទំព័រ</h3>
                <p>សូមបញ្ជាក់ថាការតភ្ជាប់អ៊ីនធឺណិតរបស់អ្នកដំណើរការល្អ</p>
                <button onclick="location.reload()">ព្យាយាមម្តងទៀត</button>
            </div>
        `;
    }
}

/**
 * Show error state for specific components
 * @param {string} type - Error type ("current", "historical", "both")
 */
function showError(type) {
    if (type === "current" || type === "both") {
        const tempElement = document.getElementById("current-temp");
        const humidityElement = document.getElementById("current-humidity");
        
        if (tempElement) tempElement.textContent = "--";
        if (humidityElement) humidityElement.textContent = "--";
    }
    
    if (type === "historical" || type === "both") {
        if (temperatureChart) {
            temperatureChart.data.labels = ['មិនមានទិន្នន័យ'];
            temperatureChart.data.datasets[0].data = [0];
            temperatureChart.data.datasets[1].data = [0];
            temperatureChart.update();
        }
    }
}

// ===============================================
// WEBSOCKET HANDLERS
// ===============================================

/**
 * Setup WebSocket event handlers for real-time updates
 */
function setupWebSocketHandlers() {
    // These functions are called by the WebSocket manager
    window.handleUpdate = handleWebSocketUpdate;
    window.handleAlert = handleWebSocketAlert;
}

/**
 * Handle WebSocket update messages
 * @param {Object} data - Update data from WebSocket
 */
function handleWebSocketUpdate(data) {
    try {
        console.log("Home update received:", data);
        
        // Update current values if sensor data is provided
        if (data.temperature !== undefined || data.humidity !== undefined) {
            updateCurrentValues(data);
        }
        
        // Trigger data refresh if needed
        if (data.refresh === true) {
            fetchHistoricalData();
        }
        
    } catch (error) {
        console.error("Error handling WebSocket update:", error);
    }
}

/**
 * Handle WebSocket alert messages
 * @param {Object} data - Alert data from WebSocket
 */
function handleWebSocketAlert(data) {
    try {
        console.warn("Home alert received:", data);
        
        // Show alert notification if available
        if (data.message) {
            showAlertNotification(data);
        }
        
    } catch (error) {
        console.error("Error handling WebSocket alert:", error);
    }
}

/**
 * Show alert notification to user
 * @param {Object} alertData - Alert information
 */
function showAlertNotification(alertData) {
    // Implementation depends on your notification system
    console.warn("Alert:", alertData.message);
}

// ===============================================
// PERFORMANCE OPTIMIZATIONS
// ===============================================

/**
 * Setup performance optimizations
 */
function setupPerformanceOptimizations() {
    // Handle page visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    // Cleanup on page unload
    window.addEventListener("beforeunload", cleanup);
}

/**
 * Handle page visibility changes to optimize resource usage
 */
function handleVisibilityChange() {
    isPageVisible = !document.hidden;
    
    if (isPageVisible) {
        // Resume updates when page becomes visible
        setupDataFetching();
        fetchCurrentData();
    } else {
        // Pause updates when page is hidden
        clearDataIntervals();
    }
}

/**
 * Clear all data update intervals
 */
function clearDataIntervals() {
    if (dataUpdateInterval) {
        clearInterval(dataUpdateInterval);
        dataUpdateInterval = null;
    }
    
    if (chartUpdateInterval) {
        clearInterval(chartUpdateInterval);
        chartUpdateInterval = null;
    }
}

/**
 * Cleanup resources before page unload
 */
function cleanup() {
    clearDataIntervals();
    
    if (temperatureChart) {
        temperatureChart.destroy();
        temperatureChart = null;
    }
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
async function fetchWithTimeout(url, options = {}, timeout = 8000) {
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout);
    });
    
    return Promise.race([
        fetch(url, options),
        timeoutPromise
    ]);
}

/**
 * Get data quality status for display
 * @param {Array} data - Sensor data array
 * @returns {string} Status message
 */
function getDataQualityStatus(data) {
    if (!data || data.length === 0) {
        return "មិនមានទិន្នន័យ";
    }
    
    const latest = parseTimestamp(data[data.length - 1].timestamp);
    const now = new Date();
    const timeSinceLastReading = Math.floor((now - latest) / (1000 * 60));
    
    if (timeSinceLastReading < 10) {
        return "ទិន្នន័យទាន់សម័យ";
    } else if (timeSinceLastReading < 60) {
        return `ទិន្នន័យចុងក្រោយ ${timeSinceLastReading} នាទីមុន`;
    } else {
        return "ទិន្នន័យអាចមិនទាន់សម័យ";
    }
}