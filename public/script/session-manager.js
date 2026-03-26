// ==================== 🔐 SESSION MANAGER ====================
// Manages user session across browser windows and tabs
// Stores role and maintains persistent session state

class SessionManager {
    constructor() {
        this.roleKey = 'userRole';
        this.isLoggedInKey = 'isLoggedIn';
        this.lastActivityKey = 'lastActivity';
        this.profileInitRetries = 0;
        this.maxProfileInitRetries = 3;
        this.init();
    }

    // Initialize session manager
    init() {
        this.listenForStorageChanges();
        this.setupBeforeUnload();
    }

    // Set user role (admin or staff)
    setRole(role) {
        if (['admin', 'staff'].includes(role)) {
            sessionStorage.setItem(this.roleKey, role);
            sessionStorage.setItem(this.isLoggedInKey, 'true');
            sessionStorage.setItem(this.lastActivityKey, new Date().toISOString());
            console.log(`✅ User role set to: ${role}`);
            return true;
        }
        return false;
    }

    // Get current user role
    getRole() {
        return sessionStorage.getItem(this.roleKey);
    }

    // Initialize role from data attribute (for EJS templates)
    initializeRoleFromData(role) {
        if (role && ['admin', 'staff'].includes(role.toLowerCase())) {
            this.setRole(role.toLowerCase());
            console.log(`✅ Role initialized from page data: ${role}`);
            return true;
        }
        return false;
    }

    // Check if user is logged in
    isLoggedIn() {
        return sessionStorage.getItem(this.isLoggedInKey) === 'true';
    }

    // Clear session (on logout)
    clearSession() {
        sessionStorage.removeItem(this.roleKey);
        sessionStorage.removeItem(this.isLoggedInKey);
        sessionStorage.removeItem(this.lastActivityKey);
        console.log('🔓 Session cleared');
    }

    // Get appropriate dashboard URL based on role
    getDashboardUrl() {
        const role = this.getRole();
        if (role === 'admin') {
            return '/admindashboard/dashboard';
        } else if (role === 'staff') {
            return '/staffdashboard';
        }
        return '/login';
    }

    // Listen for storage changes from other tabs
    listenForStorageChanges() {
        window.addEventListener('storage', (event) => {
            if (event.key === this.roleKey) {
                console.log('🔄 Role changed in another tab: ' + event.newValue);
            }
            if (event.key === this.isLoggedInKey) {
                if (!event.newValue) {
                    console.log('📴 User logged out in another tab');
                }
            }
        });
    }

    // Track last activity for session timeout (optional)
    setupBeforeUnload() {
        window.addEventListener('beforeunload', () => {
            sessionStorage.setItem(this.lastActivityKey, new Date().toISOString());
        });
    }

    // Update last activity timestamp
    updateActivity() {
        sessionStorage.setItem(this.lastActivityKey, new Date().toISOString());
    }

    // Get last activity time
    getLastActivity() {
        const lastActivity = sessionStorage.getItem(this.lastActivityKey);
        return lastActivity ? new Date(lastActivity) : null;
    }

    // ==================== USER PROFILE DISPLAY ====================
    // Generate user profile HTML with avatar and role
    getUserProfileHTML() {
        let role = this.getRole();
        
        // If no role found, try to detect from current URL
        if (!role) {
            if (window.location.pathname.includes('/admindashboard')) {
                role = 'admin';
                this.setRole('admin');
            } else if (window.location.pathname.includes('/staffdashboard')) {
                role = 'staff';
                this.setRole('staff');
            } else {
                // Default to staff for other pages
                role = 'staff';
                this.setRole('staff');
            }
        }

        // Create avatar with first letter of role
        const avatarLetter = role.charAt(0).toUpperCase();
        const roleBadge = role.charAt(0).toUpperCase() + role.slice(1);

        return `
            <div class="user-profile-container">
                <div class="user-avatar">
                    ${avatarLetter}
                </div>
                <div class="user-info">
                    <span class="user-role">${roleBadge}</span>
                </div>
            </div>
        `;
    }

    // Initialize user profile in navbar
    initializeUserProfile() {
        try {
            const logoutContainer = document.querySelector('.logout-container');
            
            // If no logout container exists, silently skip (page may not have navbar)
            if (!logoutContainer) {
                // No retry - some pages genuinely don't have a logout container
                return;
            }

            const profileHTML = this.getUserProfileHTML();
            if (!profileHTML) {
                return;
            }

            // Check if profile already exists to avoid duplicates
            if (logoutContainer.querySelector('.user-profile-container')) {
                return;
            }

            // Insert user profile before the logout button
            const profileDiv = document.createElement('div');
            profileDiv.innerHTML = profileHTML;
            
            // Insert profile before the logout button
            const logoutBtn = logoutContainer.querySelector('button');
            if (logoutBtn) {
                logoutBtn.parentNode.insertBefore(profileDiv.firstElementChild, logoutBtn);
            } else {
                logoutContainer.appendChild(profileDiv.firstElementChild);
            }

            console.log('✅ User profile initialized in navbar');
        } catch (error) {
            console.error('❌ Error initializing user profile:', error);
        }
    }

    // ==================== LOGOUT FUNCTION ====================
    // Handle user logout and redirect to login page
    logout() {
        try {
            console.log('🔓 Logging out user...');
            
            // Clear session storage
            this.clearSession();
            
            // Try to call the API logout endpoint first
            fetch('/api/auth/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            })
            .then(response => {
                console.log('✅ Logout request sent to server via API');
                // Redirect to login page
                window.location.href = '/login?logout=true';
            })
            .catch(error => {
                console.error('❌ Logout API error, trying GET endpoint:', error);
                // Fallback to GET endpoint
                return fetch('/logout', {
                    method: 'GET',
                    credentials: 'include'
                });
            })
            .then(response => {
                if (response && response.ok) {
                    console.log('✅ Logged out via fallback endpoint');
                }
            })
            .catch(error => {
                console.error('❌ All logout attempts failed:', error);
                // Still redirect even if API call fails
                window.location.href = '/login?logout=true';
            });
        } catch (error) {
            console.error('❌ Error during logout:', error);
            window.location.href = '/login?logout=true';
        }
    }
}

// Create global instance
const sessionManager = new SessionManager();

console.log('🔐 Session Manager initialized');

// ==================== LOGOUT CONFIRMATION MODAL ====================
function showLogoutConfirmation(onConfirm, onCancel) {
    // Remove any existing modal
    const existingModal = document.getElementById('logoutConfirmModal');
    if (existingModal) existingModal.remove();
    
    // Create modal overlay
    const modal = document.createElement('div');
    modal.id = 'logoutConfirmModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 40px;
        border-radius: 12px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        text-align: center;
        animation: slideUp 0.3s ease;
    `;
    
    // Add animation styles
    if (!document.getElementById('logoutModalStyles')) {
        const style = document.createElement('style');
        style.id = 'logoutModalStyles';
        style.textContent = `
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    modalContent.innerHTML = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 48px; margin-bottom: 15px;"></div>
            <h2 style="color: #333; margin: 0 0 10px 0; font-size: 22px;">Confirm Logout</h2>
            <p style="color: #666; margin: 0; font-size: 14px;">Are you sure you want to logout?</p>
        </div>
        <div style="display: flex; gap: 12px; justify-content: center; margin-top: 30px;">
            <button id="cancelLogoutBtn" style="
                flex: 1;
                padding: 12px 20px;
                background: #f0f0f0;
                color: #666;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: all 0.2s ease;
            " onmouseover="this.style.background='#e0e0e0'" onmouseout="this.style.background='#f0f0f0'">
                Cancel
            </button>
            <button id="confirmLogoutBtn" style="
                flex: 1;
                padding: 12px 20px;
                background: #dc3545;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: all 0.2s ease;
            " onmouseover="this.style.background='#c82333'" onmouseout="this.style.background='#dc3545'">
                Proceed
            </button>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Add event listeners
    document.getElementById('cancelLogoutBtn').addEventListener('click', () => {
        modal.remove();
        if (onCancel) onCancel();
    });
    
    document.getElementById('confirmLogoutBtn').addEventListener('click', () => {
        modal.remove();
        if (onConfirm) onConfirm();
    });
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            if (onCancel) onCancel();
        }
    });
    
    // Close on Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            document.removeEventListener('keydown', handleEscape);
            modal.remove();
            if (onCancel) onCancel();
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// ==================== GLOBAL LOGOUT HANDLER ====================
// Called from onclick="handleLogout()" in navbar buttons
function handleLogout() {
    showLogoutConfirmation(() => {
        // On confirm
        sessionManager.logout();
    }, () => {
        // On cancel
        console.log('🔙 Logout cancelled');
    });
}

// Initialize user profile when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    sessionManager.initializeUserProfile();
});
