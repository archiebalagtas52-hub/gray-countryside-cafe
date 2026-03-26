// ==================== 🔒 BACK BUTTON PREVENTION ====================
// Prevents users from using browser back button on dashboard pages
// This keeps users in the dashboard interface while logged in

class BackButtonPrevention {
    constructor(enabled = true) {
        this.isEnabled = enabled;
        this.historyStack = [];
        this.init();
    }

    init() {
        if (!this.isEnabled) return;
        
        // Push initial state to prevent back navigation
        this.pushState();
        
        // Listen for popstate events (back button press)
        window.addEventListener('popstate', (event) => {
            this.handleBackButton(event);
        });
        
        console.log('🔒 Back Button Prevention enabled');
    }

    // Push a new state to browser history
    pushState() {
        window.history.pushState(
            { 
                preventBack: true, 
                timestamp: new Date().toISOString(),
                url: window.location.href
            },
            null,
            window.location.href
        );
    }

    // Handle back button press
    handleBackButton(event) {
        if (event.state && event.state.preventBack) {
            // Push the state forward again to prevent going back
            this.pushState();
            console.log('🚫 Back button prevented - staying on current page');
            return false;
        }
    }

    // Disable back button prevention (for logout)
    disable() {
        this.isEnabled = false;
        console.log('🔓 Back Button Prevention disabled');
    }

    // Enable back button prevention
    enable() {
        this.isEnabled = true;
        this.init();
        console.log('🔒 Back Button Prevention enabled');
    }

    // Get current status
    isActive() {
        return this.isEnabled;
    }
}

// Create global instance
const backButtonPrevention = new BackButtonPrevention(true);

console.log('🔒 Back Button Prevention initialized');
