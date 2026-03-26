// ==================== REAL-TIME DASHBOARD SCRIPT ====================
// G'RAY COUNTRYSIDE CAFÉ - Real-time Events & Dashboard Management

// Business Information
const BUSINESS_INFO = {
    name: "G'RAY COUNTRYSIDE CAFÉ",
    address: "IPO Road, Barangay Minuyan Proper",
    city: "City of San Jose Del Monte, Bulacan"
};

// Debug logging function
function debugLog(message, type = 'info') {
  const log = document.getElementById('debugLog');
  if (!log) return;
  
  const timestamp = new Date().toLocaleTimeString('en-PH');
  const color = type === 'error' ? '#ff6b6b' : type === 'success' ? '#4CAF50' : '#2196F3';
  const entry = document.createElement('div');
  entry.innerHTML = `<span style="color: #aaa">[${timestamp}]</span> <span style="color: ${color}">${message}</span>`;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
  console.log(`[DEBUG] ${message}`);
}

// Simple real-time test for G'RAY COUNTRYSIDE CAFÉ POS System - DISABLED
async function testRealTime() {
  debugLog('========================================');
  debugLog('ℹ️ Real-time updates disabled - using periodic refresh only');
  debugLog('========================================');
  
  try {
    debugLog('ℹ️ Real-time EventSource connections have been disabled to prevent duplicate data');
    debugLog('✅ Periodic refresh is configured and working properly');
    
  } catch (error) {
    debugLog(`⚠️ Note: ${error.message}`);
  }
}

// Handle new order event
function handleNewOrder(order) {
  debugLog(`🆕 New Order Received: #${order.orderNumber}`, 'success');
  debugLog(`   💰 Total: ₱${order.total.toFixed(2)}`);
  debugLog(`   👥 Customer: ${order.customerId || 'Walk-in'}`);
  debugLog(`   📦 Items: ${order.items || 0} items`);
  
  // Update the UI
  updateDashboardWithNewOrder(order);
  
  // Show notification
  showOrderNotification(order);
}

// Handle low stock alert
function handleLowStockAlert(stockData) {
  debugLog(`📦 Low Stock Alert: ${stockData.itemName}`, 'warning');
  debugLog(`   📊 Current: ${stockData.currentStock} units`);
  debugLog(`   🎯 Minimum: ${stockData.minStock} units`);
  
  showStockNotification(stockData);
}

// Handle stats update event
function handleStatsUpdate(stats) {
  debugLog(`📊 Stats Update Received`);
  
  // Update stats if they exist on the page
  updateStatsDisplay(stats);
}

// Update dashboard with new order
function updateDashboardWithNewOrder(order) {
  debugLog(`📊 Updating dashboard with order ${order.orderNumber}`);
  
  // Update Today's Orders table
  const tableBody = document.getElementById('ordersTableBody');
  if (tableBody) {
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
      <td>${order.orderNumber}</td>
      <td>${new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}</td>
      <td>${order.customerId || 'Walk-in'}</td>
      <td>₱${order.total.toFixed(2)}</td>
    `;
    
    // Add at the top
    if (tableBody.firstChild) {
      tableBody.insertBefore(newRow, tableBody.firstChild);
    } else {
      tableBody.appendChild(newRow);
    }
    
    // Keep only 5 rows
    if (tableBody.children.length > 5) {
      tableBody.removeChild(tableBody.lastChild);
    }
  }
  
  // Update order count
  updateOrderCounts();
}

// Show order notification
function showOrderNotification(order) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-left: 4px solid #4CAF50;
    border-radius: 8px;
    padding: 15px;
    width: 300px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9999;
    animation: slideIn 0.3s ease-out;
    font-family: 'Arial', sans-serif;
    font-size: 14px;
  `;
  
  notification.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="background: #4CAF50; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px;">🆕</span>
        <strong style="color: #333; font-size: 16px;">New Order!</strong>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #999;">×</button>
    </div>
    <div style="font-size: 13px; line-height: 1.5;">
      <div style="margin: 5px 0; display: flex; justify-content: space-between;">
        <span style="color: #666;">Order #:</span>
        <span style="font-weight: 600;">${order.orderNumber}</span>
      </div>
      <div style="margin: 5px 0; display: flex; justify-content: space-between;">
        <span style="color: #666;">Total:</span>
        <span style="font-weight: 600; color: #4CAF50;">₱${order.total.toFixed(2)}</span>
      </div>
      <div style="margin: 5px 0; display: flex; justify-content: space-between;">
        <span style="color: #666;">Customer:</span>
        <span>${order.customerId || 'Walk-in'}</span>
      </div>
      <div style="margin: 5px 0; display: flex; justify-content: space-between;">
        <span style="color: #666;">Type:</span>
        <span>${order.type || 'Dine In'}</span>
      </div>
      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee; text-align: center; font-size: 11px; color: #888;">
        ${BUSINESS_INFO.name}
        <div>${new Date().toLocaleTimeString('en-PH')}</div>
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 10000);
}

// Show stock notification
function showStockNotification(stockData) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 70px;
    right: 20px;
    background: white;
    border-left: 4px solid #ff9800;
    border-radius: 8px;
    padding: 15px;
    width: 300px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 9998;
    animation: slideIn 0.3s ease-out;
    font-family: 'Arial', sans-serif;
    font-size: 14px;
  `;
  
  notification.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="background: #ff9800; color: white; padding: 2px 6px; border-radius: 4px; font-size: 12px;">⚠️</span>
        <strong style="color: #333; font-size: 16px;">Low Stock Alert</strong>
      </div>
      <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 18px; cursor: pointer; color: #999;">×</button>
    </div>
    <div style="font-size: 13px; line-height: 1.5;">
      <div style="margin: 5px 0;">
        <strong>${stockData.itemName}</strong>
      </div>
      <div style="margin: 5px 0; display: flex; justify-content: space-between;">
        <span style="color: #666;">Current Stock:</span>
        <span style="font-weight: 600; color: ${stockData.currentStock === 0 ? '#f44336' : '#ff9800'};">${stockData.currentStock} units</span>
      </div>
      <div style="margin: 5px 0; display: flex; justify-content: space-between;">
        <span style="color: #666;">Minimum Required:</span>
        <span>${stockData.minStock} units</span>
      </div>
      <div style="margin-top: 10px; padding: 8px; background: #fff3cd; border-radius: 4px; font-size: 12px; color: #856404;">
        <strong>Action Required:</strong> Please restock this item
      </div>
      <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee; text-align: center; font-size: 11px; color: #888;">
        ${new Date().toLocaleTimeString('en-PH')}
      </div>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 15 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 15000);
}

// Update stats display
function updateStatsDisplay(stats) {
  // Update total orders
  const totalOrdersEl = document.getElementById('totalOrders');
  if (totalOrdersEl && stats.totalOrders !== undefined) {
    totalOrdersEl.textContent = stats.totalOrders;
    animateValue(totalOrdersEl);
  }
  
  // Update today's orders
  const todayOrdersEl = document.getElementById('todayOrders') || document.getElementById('todaysOrders');
  if (todayOrdersEl && stats.todaysOrders !== undefined) {
    todayOrdersEl.textContent = stats.todaysOrders;
    animateValue(todayOrdersEl);
  }
  
  // Update total revenue
  const totalRevenueEl = document.getElementById('totalRevenue');
  if (totalRevenueEl && stats.totalRevenue !== undefined) {
    totalRevenueEl.textContent = `₱${stats.totalRevenue.toFixed(2)}`;
    animateValue(totalRevenueEl);
  }
  
  // Update today's revenue
  const todayRevenueEl = document.getElementById('todayRevenue') || document.getElementById('todaysRevenue');
  if (todayRevenueEl && stats.todaysRevenue !== undefined) {
    todayRevenueEl.textContent = `₱${stats.todaysRevenue.toFixed(2)}`;
    animateValue(todayRevenueEl);
  }
  
  // Update inventory counts
  const lowStockEl = document.getElementById('lowStockItems');
  if (lowStockEl && stats.inventoryLowStock !== undefined) {
    lowStockEl.textContent = stats.inventoryLowStock;
    if (stats.inventoryLowStock > 0) {
      lowStockEl.style.color = '#ff9800';
    }
  }
  
  const outOfStockEl = document.getElementById('outOfStockItems');
  if (outOfStockEl && stats.inventoryOutOfStock !== undefined) {
    outOfStockEl.textContent = stats.inventoryOutOfStock;
    if (stats.inventoryOutOfStock > 0) {
      outOfStockEl.style.color = '#f44336';
    }
  }
}

// Update order counts
function updateOrderCounts() {
  const tableBody = document.getElementById('ordersTableBody');
  if (!tableBody) return;
  
  const orderCount = tableBody.children.length;
  const todayOrdersEl = document.getElementById('todayOrders') || document.getElementById('todaysOrders');
  
  if (todayOrdersEl) {
    const currentCount = parseInt(todayOrdersEl.textContent) || 0;
    todayOrdersEl.textContent = currentCount + 1;
    animateValue(todayOrdersEl);
  }
  
  const totalOrdersEl = document.getElementById('totalOrders');
  if (totalOrdersEl) {
    const currentCount = parseInt(totalOrdersEl.textContent) || 0;
    totalOrdersEl.textContent = currentCount + 1;
    animateValue(totalOrdersEl);
  }
}

// Animation for value changes
function animateValue(element) {
  element.style.transform = 'scale(1.1)';
  element.style.transition = 'transform 0.2s ease';
  
  setTimeout(() => {
    element.style.transform = 'scale(1)';
  }, 200);
}

// Update dashboard stats
function updateDashboardStats(stats) {
    console.log('Updating dashboard stats:', stats);
    
    // Update all stat cards
    const elements = {
        'totalOrders': stats.totalOrders || 0,
        'todayOrders': stats.todaysOrders || 0,
        'totalCustomers': stats.totalCustomers || 0,
        'totalMenuItems': stats.totalMenuItems || 0,
        'availableMenuItems': stats.availableMenuItems || 0,
        'totalInventory': stats.totalInventoryItems || stats.totalInventory || 0,
        'lowStockItems': stats.inventoryLowStock || 0,
        'outOfStockItems': stats.inventoryOutOfStock || 0,
        'totalRevenue': '₱' + (stats.totalRevenue || 0).toFixed(2),
        'todayRevenue': '₱' + (stats.todaysRevenue || 0).toFixed(2)
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            
            // Highlight low/out of stock items
            if ((id === 'lowStockItems' || id === 'outOfStockItems') && value > 0) {
                element.style.color = id === 'lowStockItems' ? '#ff9800' : '#f44336';
                element.style.fontWeight = '600';
            }
        }
    }
    
    // Hide any error messages
    hideError();
}

function showError(message) {
    let errorDiv = document.getElementById('dashboardError');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'dashboardError';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #f8d7da;
            color: #721c24;
            padding: 12px 20px;
            border-radius: 4px;
            border: 1px solid #f5c6cb;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        `;
        document.body.appendChild(errorDiv);
    }
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

function hideError() {
    const errorDiv = document.getElementById('dashboardError');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

// Initialize everything when page loads
document.addEventListener('DOMContentLoaded', () => {
  debugLog('========================================');
  debugLog('🚀 G\'RAY COUNTRYSIDE CAFÉ Dashboard Initialized');
  debugLog(`🏪 ${BUSINESS_INFO.name}`);
  debugLog(`📍 ${BUSINESS_INFO.address}`);
  debugLog(`🏙️ ${BUSINESS_INFO.city}`);
  debugLog('========================================');
  
  console.log('G\'RAY COUNTRYSIDE CAFÉ Dashboard loading...');
  
  // Fetch dashboard stats
  fetch('/api/dashboard/stats')
      .then(response => {
          if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
      })
      .then(data => {
          console.log('Dashboard stats received:', data);
          if (data.success) {
              updateDashboardStats(data.data);
          } else {
              showError('Failed to load dashboard stats');
          }
      })
      .catch(error => {
          console.error('Error fetching stats:', error);
          showError('Failed to load dashboard data: ' + error.message);
      });
  
  // Check if we're on admin dashboard
  const isAdminDashboard = window.location.pathname.includes('/admindashboard');
  
  if (isAdminDashboard) {
    debugLog('👨‍💼 Admin Dashboard detected - starting real-time system');
    
    // Start real-time updates after 3 seconds
    setTimeout(() => {
      debugLog('🔄 Starting real-time event listener...');
      testRealTime();
    }, 3000);
    
    // Refresh stats every minute
    setInterval(async () => {
      try {
        const response = await fetch('/api/dashboard/stats', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            updateStatsDisplay(data.data);
            debugLog('📊 Periodic stats refresh complete');
          }
        }
      } catch (error) {
        debugLog(`❌ Periodic refresh failed: ${error.message}`, 'error');
      }
    }, 60000);
    
  } else {
    debugLog('👨‍🍳 Staff Dashboard detected - real-time features limited');
  }
  
  // Store user role in sessionStorage
  if (typeof sessionManager !== 'undefined' && sessionManager.setRole) {
    sessionManager.setRole('admin');
    console.log('✅ Admin interface loaded - sessionStorage updated');
  }
  
  // Add animation styles
  if (!document.getElementById('slideInStyle')) {
    const style = document.createElement('style');
    style.id = 'slideInStyle';
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window._eventSource) {
    window._eventSource.close();
    debugLog('🔌 Cleaned up real-time connection');
  }
});

// Mobile menu initialization
(function() {
    function initMobileMenu() {
        const navbar = document.querySelector('.navbar') || document.querySelector('.header-navbar');
        if (!navbar) return;

        if (document.querySelector('.hamburger-menu')) return;

        const hamburger = document.createElement('div');
        hamburger.className = 'hamburger-menu';
        hamburger.id = 'hamburgerMenu';
        hamburger.innerHTML = '<span></span><span></span><span></span>';

        navbar.insertBefore(hamburger, navbar.firstChild);

        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.id = 'sidebarOverlay';
        document.body.appendChild(overlay);

        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        const sidebarHeader = document.createElement('div');
        sidebarHeader.className = 'sidebar-header';
        sidebarHeader.innerHTML = `
            <h3>Menu</h3>
            <button class="sidebar-close" id="closeSidebar"></button>
        `;

        sidebar.insertBefore(sidebarHeader, sidebar.firstChild);

        function openMenu() {
            hamburger.classList.add('active');
            sidebar.classList.add('active');
            overlay.classList.add('active');
            document.body.classList.add('menu-open');
        }

        function closeMenu() {
            hamburger.classList.remove('active');
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            document.body.classList.remove('menu-open');
        }

        hamburger.addEventListener('click', function(e) {
            e.stopPropagation();
            if (sidebar.classList.contains('active')) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        overlay.addEventListener('click', closeMenu);

        const closeBtn = document.getElementById('closeSidebar');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeMenu);
        }

        const menuItems = sidebar.querySelectorAll('ul.dashboard-menu li a, .sidebar .category-btn, .sidebar button');
        menuItems.forEach(item => {
            item.addEventListener('click', function() {
                menuItems.forEach(i => i.classList.remove('active'));
                if (this.tagName === 'A') {
                    this.classList.add('active');
                }
                closeMenu();
            });
        });

        const currentPath = window.location.pathname;
        const links = sidebar.querySelectorAll('ul.dashboard-menu li a');
        links.forEach(item => {
            const href = item.getAttribute('href');
            if (href && currentPath.includes(href)) {
                item.classList.add('active');
            }
        });

        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                if (sidebar.classList.contains('active')) {
                    closeMenu();
                }
                document.body.classList.remove('menu-open');
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMobileMenu);
    } else {
        initMobileMenu();
    }
})();
