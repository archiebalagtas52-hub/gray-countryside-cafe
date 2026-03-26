// Staff Stock Management System
class StaffStockSystem {
    constructor() {
        this.staffId = null;
        this.assignedItems = [];
        this.pendingRequests = [];
        this.availableItems = [];
    }

    async initialize() {
        await this.loadStaffProfile();
        await this.loadAssignedItems();
        await this.loadAvailableItems();
        this.setupEventListeners();
        
        // Auto-refresh every 30 seconds
        setInterval(() => this.loadAssignedItems(), 30000);
    }

    async loadStaffProfile() {
        try {
            const response = await fetch('/api/staff/profile', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            
            const data = await response.json();
            if (data.success) {
                this.staffId = data.staff._id;
                document.getElementById('staffName').textContent = data.staff.name;
            }
        } catch (error) {
            console.error('Error loading staff profile:', error);
        }
    }

    async loadAssignedItems() {
        try {
            const response = await fetch('/api/staff/assigned-items', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            
            const data = await response.json();
            if (data.success) {
                this.assignedItems = data.items;
                this.renderAssignedItems();
            }
        } catch (error) {
            console.error('Error loading assigned items:', error);
        }
    }

    async loadAvailableItems() {
        try {
            const response = await fetch('/api/menu/available-items', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            
            const data = await response.json();
            if (data.success) {
                this.availableItems = data.items;
                this.renderAvailableItems();
            }
        } catch (error) {
            console.error('Error loading available items:', error);
        }
    }

    renderAssignedItems() {
        const container = document.getElementById('assignedItemsGrid');
        if (!container) return;

        if (this.assignedItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <h3>No items assigned</h3>
                    <p>Request items from the available items list</p>
                </div>
            `;
            return;
        }

        const gridHTML = this.assignedItems.map(item => {
            return `
            <div class="inventory-card ${item.currentStock === 0 ? 'out-of-stock' : item.currentStock <= item.minStock ? 'low-stock' : ''}">
                <div class="card-header">
                    <h4>${item.name}</h4>
                    <span class="badge badge-secondary">Assigned</span>
                </div>
                <div class="card-body">
                    <div class="card-info">
                        <span class="label">Current Stock:</span> ${item.currentStock} ${item.unit}
                    </div>
                    <div class="card-info">
                        <span class="label">Min Stock:</span> ${item.minStock} ${item.unit}
                    </div>
                    <div class="card-info">
                        <span class="label">Last Updated:</span> 
                        ${item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : 'N/A'}
                    </div>
                    <div class="card-info">
                        <span class="label">Status:</span> 
                        <span class="status ${item.currentStock === 0 ? 'out-of-stock' : item.currentStock <= item.minStock ? 'low-stock' : 'in-stock'}">
                            ${item.currentStock === 0 ? 'Out of Stock' : item.currentStock <= item.minStock ? 'Low Stock' : 'In Stock'}
                        </span>
                    </div>
                    <div class="card-actions" style="margin-top: 10px;">
                        <button class="btn btn-primary" onclick="staffStockSystem.requestStock('${item._id}')">
                            Request More
                        </button>
                    </div>
                </div>
            </div>
            `;
        }).join('');

        container.innerHTML = gridHTML;
    }

    renderAvailableItems() {
        const container = document.getElementById('availableItemsGrid');
        if (!container) return;

        if (this.availableItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📦</div>
                    <h3>No items available</h3>
                    <p>Check back later for available items</p>
                </div>
            `;
            return;
        }

        const gridHTML = this.availableItems.map(item => {
            const isAssigned = this.assignedItems.some(assigned => assigned._id === item._id);
            
            return `
            <div class="inventory-card">
                <div class="card-header">
                    <h4>${item.name}</h4>
                    <span class="badge badge-primary">${item.category}</span>
                </div>
                <div class="card-body">
                    <div class="card-info">
                        <span class="label">Available Stock:</span> ${item.currentStock} ${item.unit}
                    </div>
                    <div class="card-info">
                        <span class="label">Price:</span> ₱${item.price.toFixed(2)}
                    </div>
                    <div class="card-info">
                        <span class="label">Status:</span> 
                        <span class="status ${item.currentStock === 0 ? 'out-of-stock' : 'in-stock'}">
                            ${item.currentStock === 0 ? 'Out of Stock' : 'Available'}
                        </span>
                    </div>
                    <div class="card-actions" style="margin-top: 10px;">
                        ${isAssigned ? 
                            '<span style="color: #28a745; font-weight: bold;">✓ Already Assigned</span>' :
                            `<button class="btn btn-primary" onclick="staffStockSystem.requestAssignment('${item._id}')">
                                Request Assignment
                            </button>`
                        }
                    </div>
                </div>
            </div>
            `;
        }).join('');

        container.innerHTML = gridHTML;
    }

    async requestStock(menuItemId) {
        const quantity = prompt('Enter quantity to request:', '1');
        if (!quantity || isNaN(quantity) || parseInt(quantity) <= 0) {
            alert('Please enter a valid quantity');
            return;
        }

        const notes = prompt('Enter notes (optional):', '');
        
        try {
            const response = await fetch('/api/stock-transfers/request-stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    menuItemId: menuItemId,
                    quantity: parseInt(quantity),
                    notes: notes
                }),
                credentials: 'include'
            });

            const data = await response.json();
            
            if (data.success) {
                alert('Stock request submitted successfully!');
                this.loadAssignedItems();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error requesting stock:', error);
            alert('Failed to submit request: ' + error.message);
        }
    }

    async requestAssignment(menuItemId) {
        const confirmAssign = confirm('Request assignment of this item?');
        if (!confirmAssign) return;

        try {
            const response = await fetch('/api/staff/request-assignment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    menuItemId: menuItemId
                }),
                credentials: 'include'
            });

            const data = await response.json();
            
            if (data.success) {
                alert('Assignment request submitted! Waiting for manager approval.');
                this.loadAvailableItems();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Error requesting assignment:', error);
            alert('Failed to submit assignment request: ' + error.message);
        }
    }

    async viewStockHistory() {
        try {
            const response = await fetch('/api/stock-transfers/staff-transfers', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            const data = await response.json();
            
            if (data.success) {
                this.showTransferHistory(data.transfers);
            }
        } catch (error) {
            console.error('Error loading transfer history:', error);
        }
    }

    showTransferHistory(transfers) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.5); display: flex; justify-content: center; 
            align-items: center; z-index: 10000;
        `;

        let html = `
            <div style="background: white; padding: 20px; border-radius: 8px; max-width: 800px; max-height: 80vh; overflow-y: auto; width: 90%;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3>📋 Stock Transfer History</h3>
                    <button onclick="this.closest('.modal').remove()" style="background: none; border: none; font-size: 20px; cursor: pointer;">×</button>
                </div>
        `;

        if (transfers.length === 0) {
            html += `
                <div style="text-align: center; padding: 40px 20px; color: #666;">
                    <div style="font-size: 48px; margin-bottom: 10px;">📭</div>
                    <p style="margin: 0;">No transfer history yet</p>
                </div>
            `;
        } else {
            html += `
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f5f5f5;">
                            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Item</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Quantity</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Date</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Status</th>
                            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Notes</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            transfers.forEach(transfer => {
                const statusColors = {
                    'pending': '#ff9800',
                    'approved': '#28a745',
                    'rejected': '#dc3545',
                    'completed': '#007bff'
                };

                html += `
                    <tr>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${transfer.menuItemName}</td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${transfer.quantity}</td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                            ${new Date(transfer.createdAt).toLocaleDateString()}
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                            <span style="color: ${statusColors[transfer.status] || '#666'}; font-weight: bold;">
                                ${transfer.status.toUpperCase()}
                            </span>
                        </td>
                        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${transfer.notes || ''}</td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
            `;
        }

        html += `
                <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
                    <button onclick="this.closest('.modal').remove()" 
                            style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Close
                    </button>
                </div>
            </div>
        `;

        modal.innerHTML = html;
        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refreshStaffStock');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadAssignedItems();
                this.loadAvailableItems();
            });
        }

        // View history button
        const historyBtn = document.getElementById('viewStockHistory');
        if (historyBtn) {
            historyBtn.addEventListener('click', () => this.viewStockHistory());
        }

        // Logout button
        const logoutBtn = document.getElementById('staffLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout);
        }
    }

  handleLogout() {
    showLogoutConfirmation(() => {
        // On confirm
        fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        })
        .then(() => {
            window.location.href = '/login';
        })
        .catch(() => {
            window.location.href = '/login';
        });
    }, () => {
        // On cancel
        console.log('🔙 Logout cancelled');
    });
}
}

// Initialize staff system
const staffStockSystem = new StaffStockSystem();

document.addEventListener('DOMContentLoaded', () => {
    staffStockSystem.initialize();
});


// Logout confirmation helper
function showLogoutConfirmation(onConfirm, onCancel) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.5); display: flex; justify-content: center; 
        align-items: center; z-index: 10001;
    `;

    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 8px; max-width: 400px; width: 90%;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0;">Confirm Logout</h3>
                <p style="color: #666; margin: 0;">Are you sure you want to logout?</p>
            </div>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button onclick="this.closest('.modal').remove(); ${onCancel.toString()}" 
                        style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Cancel
                </button>
                <button onclick="this.closest('.modal').remove(); ${onConfirm.toString()}" 
                        style="padding: 10px 20px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Logout
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            onCancel();
        }
    });
}
// Global exports
window.staffStockSystem = staffStockSystem;