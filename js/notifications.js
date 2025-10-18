/* ===============================================
   TOKKATOT NOTIFICATION SYSTEM
   ===============================================
   Simple notification system for user feedback
   =============================================== */

// Notification system
const NotificationSystem = {
    container: null,
    
    /**
     * Initialize the notification system
     */
    init() {
        // Create container if it doesn't exist
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'notification-container';
            document.body.appendChild(this.container);
        }
        
        // Add connection status indicator
        this.createConnectionIndicator();
        
        // Listen for online/offline events
        window.addEventListener('online', () => this.showConnectionStatus(true));
        window.addEventListener('offline', () => this.showConnectionStatus(false));
    },
    
    /**
     * Show a notification
     * @param {string} message - The notification message
     * @param {string} type - success, error, warning, info
     * @param {string} title - Optional title
     * @param {number} duration - Auto-dismiss duration in ms (0 = no auto-dismiss)
     */
    show(message, type = 'info', title = '', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        // Create content
        let content = '';
        if (title) {
            content += `<div class="notification-title">${title}</div>`;
        }
        content += `<div class="notification-message">${message}</div>`;
        content += `<button class="notification-close">&times;</button>`;
        
        if (duration > 0) {
            content += `<div class="notification-progress"></div>`;
        }
        
        notification.innerHTML = content;
        
        // Add event listeners
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => this.hide(notification));
        
        notification.addEventListener('click', (e) => {
            if (e.target !== closeBtn) {
                this.hide(notification);
            }
        });
        
        // Add to container
        this.container.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // Auto-dismiss
        if (duration > 0) {
            const progressBar = notification.querySelector('.notification-progress');
            if (progressBar) {
                progressBar.style.width = '100%';
                progressBar.style.transitionDuration = `${duration}ms`;
                
                setTimeout(() => {
                    progressBar.style.width = '0%';
                }, 50);
            }
            
            setTimeout(() => {
                this.hide(notification);
            }, duration);
        }
        
        return notification;
    },
    
    /**
     * Hide a notification
     * @param {HTMLElement} notification - The notification element to hide
     */
    hide(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    },
    
    /**
     * Show success notification
     */
    success(message, title = 'ជោគជ័យ') {
        return this.show(message, 'success', title);
    },
    
    /**
     * Show error notification
     */
    error(message, title = 'កំហុស') {
        return this.show(message, 'error', title, 8000);
    },
    
    /**
     * Show warning notification
     */
    warning(message, title = 'ការព្រមាន') {
        return this.show(message, 'warning', title, 6000);
    },
    
    /**
     * Show info notification
     */
    info(message, title = 'ព័ត៌មាន') {
        return this.show(message, 'info', title);
    },
    
    /**
     * Create connection status indicator
     */
    createConnectionIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'connection-status';
        indicator.id = 'connection-indicator';
        document.body.appendChild(indicator);
        
        // Set initial status
        this.updateConnectionStatus(navigator.onLine);
    },
    
    /**
     * Update connection status
     * @param {boolean} isOnline - Whether the connection is online
     */
    updateConnectionStatus(isOnline) {
        const indicator = document.getElementById('connection-indicator');
        if (indicator) {
            indicator.className = isOnline ? 'connection-status' : 'connection-status offline';
        }
    },
    
    /**
     * Show connection status change
     * @param {boolean} isOnline - Whether the connection is online
     */
    showConnectionStatus(isOnline) {
        this.updateConnectionStatus(isOnline);
        
        if (isOnline) {
            this.success('អ៊ីនធឺណេតត្រូវបានភ្ជាប់ឡើងវិញ', 'ភ្ជាប់ឡើងវិញ');
        } else {
            this.warning('គ្មានការភ្ជាប់អ៊ីនធឺណេត - ប្រើប្រាស់ទិន្នន័យដែលបានរក្សាទុក', 'អ៊ីនធឺណេតផ្តាច់');
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    NotificationSystem.init();
});

// Global shortcut functions
window.showNotification = (message, type, title, duration) => {
    return NotificationSystem.show(message, type, title, duration);
};

window.showSuccess = (message, title) => {
    return NotificationSystem.success(message, title);
};

window.showError = (message, title) => {
    return NotificationSystem.error(message, title);
};

window.showWarning = (message, title) => {
    return NotificationSystem.warning(message, title);
};

window.showInfo = (message, title) => {
    return NotificationSystem.info(message, title);
};