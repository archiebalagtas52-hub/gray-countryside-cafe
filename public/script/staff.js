let currentOrder = [];
let orderType = null;
let tableNumber = null;
let currentCategory = 'all';
let selectedPaymentMethod = null;
let paymentAmount = 0;
let productCatalog = [];
let staffInventory = [];
let pendingStockRequests = [];
let outOfStockItems = [];
let currentUser = null;

let activeStockRequests = new Map();

let isSubmittingStockRequest = false;

let outOfStockNotifications = new Set();

let stockEventSource = null;

const MAX_STOCK_PER_ITEM = 100;

// Table Occupancy Status - Tracks which tables are taken/occupied
let tableOccupancyStatus = new Map(); // { tableNum: { status: 'available'|'paid'|'waiting'|'left', orderId: null } }

// Initialize table occupancy system on load
function initializeTableOccupancy() {
    // Load from localStorage or initialize empty
    const saved = localStorage.getItem('tableOccupancy');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            tableOccupancyStatus = new Map(data);
        } catch (e) {
            console.log('Could not load table occupancy, initializing fresh');
            tableOccupancyStatus = new Map();
        }
    }
    // Initialize default tables
    for (let i = 1; i <= 5; i++) {
        if (!tableOccupancyStatus.has(String(i))) {
            tableOccupancyStatus.set(String(i), { status: 'available', orderId: null });
        }
    }
    saveTableOccupancy();
}

// Save table occupancy to localStorage
function saveTableOccupancy() {
    localStorage.setItem('tableOccupancy', JSON.stringify(Array.from(tableOccupancyStatus.entries())));
}

// Save table occupancy to localStorage
function saveTableOccupancy() {
    localStorage.setItem('tableOccupancy', JSON.stringify(Array.from(tableOccupancyStatus.entries())));
}

// Get table status
function getTableStatus(tableNum) {
    const status = tableOccupancyStatus.get(String(tableNum));
    return status ? status.status : 'available';
}

// Check if table is available for ordering
function isTableAvailable(tableNum) {
    try {
        // Check localStorage for active customers
        const customers = JSON.parse(localStorage.getItem('activeDineInCustomers')) || [];
        
        // Filter out customers who have left
        const activeCustomers = customers.filter(c => !c.hasLeft);
        
        // Check if this table number exists in active customers
        const isOccupied = activeCustomers.some(c => c.tableNumber === parseInt(tableNum));
        
        console.log(`🔍 Checking table ${tableNum}: ${isOccupied ? 'OCCUPIED' : 'AVAILABLE'}`);
        
        return !isOccupied;  // Return true if NOT occupied
    } catch (error) {
        console.error('Error checking table availability:', error);
        return true;  // Assume available if error
    }
}

// Update table status
function updateTableStatus(tableNum, newStatus) {
    tableOccupancyStatus.set(String(tableNum), { 
        status: newStatus, 
        orderId: null 
    });
    saveTableOccupancy();
    renderActiveDineInCustomers();
}

// Render Active Dine In Customers in sidebar
function renderActiveDineInCustomers() {
    const container = document.getElementById('activeDineInCustomers');
    if (!container) return;

    let html = '';
    let hasActiveTables = false;

    // Loop through all 5 tables
    for (let i = 1; i <= 5; i++) {
        const tableNum = String(i);
        const tableData = tableOccupancyStatus.get(tableNum);
        const status = tableData ? tableData.status : 'available';

        // Only show tables that are not available (paid, waiting, or left)
        if (status !== 'available') {
            hasActiveTables = true;

            let statusLabel = '';
            let statusClass = '';
            let buttons = '';

            if (status === 'paid') {
                statusLabel = 'PAID';
                statusClass = 'status-paid';
                buttons = `
                    <button class="dine-in-btn btn-wait-for-left" onclick="handleTableWaiting(${i})">⏳ Wait for Left</button>
                    <button class="dine-in-btn btn-left" onclick="handleTableLeft(${i})">👋 LEFT</button>
                `;
            } else if (status === 'waiting') {
                statusLabel = 'WAITING';
                statusClass = 'status-waiting';
                buttons = `
                    <button class="dine-in-btn btn-left" onclick="handleTableLeft(${i})">👋 LEFT</button>
                `;
            } else if (status === 'left') {
                statusLabel = 'LEFT';
                statusClass = 'status-left';
                buttons = `
                    <button class="dine-in-btn btn-next-order" onclick="handleNextOrder(${i})">✅ Next Order</button>
                `;
            }

            html += `
                <div class="dine-in-customer-item">
                    <div class="dine-in-customer-header">
                        <strong>🍽️ Table #${i}</strong>
                        <span class="dine-in-customer-status ${statusClass}">${statusLabel}</span>
                    </div>
                    <div class="dine-in-customer-buttons">
                        ${buttons}
                    </div>
                </div>
            `;
        }
    }

    if (!hasActiveTables) {
        html = `
            <div class="dine-in-empty-state">
                <p>✅ No active tables</p>
            </div>
        `;
    }

    container.innerHTML = html;
}

// Handle Table Waiting status
function handleTableWaiting(tableNum) {
    updateTableStatus(tableNum, 'waiting');
    showToast(`⏳ Table #${tableNum} is waiting...`, 'warning', 2000);
}

// Handle Table Left status
function handleTableLeft(tableNum) {
    console.log(`🔔 Attempting to mark Table #${tableNum} as LEFT`);
    
    // Remove any existing modal
    const existingModal = document.getElementById('tableLeftConfirmModal');
    if (existingModal) existingModal.remove();
    
    // Create modal overlay
    const modal = document.createElement('div');
    modal.id = 'tableLeftConfirmModal';
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
    if (!document.getElementById('tableLeftModalStyles')) {
        const style = document.createElement('style');
        style.id = 'tableLeftModalStyles';
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
            <div style="font-size: 48px; margin-bottom: 15px;">👋</div>
            <h2 style="color: #333; margin: 0 0 10px 0; font-size: 22px;">Mark Table as LEFT</h2>
            <p style="color: #666; margin: 0; font-size: 14px;">Are you sure you want to mark Table #${tableNum} as LEFT?</p>
        </div>
        <div style="display: flex; gap: 12px; justify-content: center; margin-top: 30px;">
            <button id="cancelTableLeftBtn" style="
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
            <button id="confirmTableLeftBtn" style="
                flex: 1;
                padding: 12px 20px;
                background: #28a745;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: all 0.2s ease;
            " onmouseover="this.style.background='#218838'" onmouseout="this.style.background='#28a745'">
                Mark as LEFT
            </button>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Add event listeners
    document.getElementById('cancelTableLeftBtn').addEventListener('click', () => {
        console.log(`❌ Cancelled: Did not mark Table #${tableNum} as LEFT`);
        modal.remove();
    });
    
    document.getElementById('confirmTableLeftBtn').addEventListener('click', () => {
        console.log(`✅ Confirmed: Marking Table #${tableNum} as LEFT`);
        updateTableStatus(tableNum, 'left');
        console.log(`📍 Table #${tableNum} status updated to: LEFT`);
        modal.remove();
    });
}


// Handle Next Order status
function handleNextOrder(tableNum) {
    updateTableStatus(tableNum, 'available');
    showToast(`✅ Table #${tableNum} is now available for next order`, 'success', 2000);
}

// Set table as paid (when order is completed)
function markTableAsPaid(tableNum) {
    updateTableStatus(tableNum, 'paid');
}

/**
 * Add an active dine-in customer to localStorage
 */
async function addActiveTable(tableNumber, customerId, orderStatus = 'Preparing', notes = '') {
    try {
        console.log('=====================================');
        console.log('🍽️ addActiveTable called');
        console.log('Table:', tableNumber, 'Type:', typeof tableNumber);
        console.log('Customer:', customerId, 'Type:', typeof customerId);
        console.log('Status:', orderStatus);
        
        // Create customer object
        const activeCustomer = {
            tableNumber: parseInt(tableNumber),
            customerId: customerId,
            orderStatus: orderStatus || 'Preparing',
            notes: notes || null,
            timeIn: new Date().toISOString(),
            hasLeft: false,
            leftTime: null
        };
        
        console.log('📦 Customer object created:', activeCustomer);
        
        // Get existing data
        let customers = [];
        const data = localStorage.getItem('activeDineInCustomers');
        console.log('📋 Current localStorage:', data);
        
        if (data) {
            try {
                customers = JSON.parse(data);
                console.log('✅ Parsed existing customers:', customers.length, 'total');
            } catch (e) {
                console.error('❌ Parse error:', e);
                customers = [];
            }
        }
        
        // Check if table already exists and is active
        const existing = customers.find(c => c.tableNumber === parseInt(tableNumber) && !c.hasLeft);
        if (existing) {
            console.warn('⚠️ Table already active:', existing);
            showToast(`⚠️ Table #${tableNumber} already active`, 'warning', 2000);
            return null;
        }
        
        // Add and save
        customers.push(activeCustomer);
        console.log('➕ Added customer. Total now:', customers.length);
        
        localStorage.setItem('activeDineInCustomers', JSON.stringify(customers));
        console.log('💾 Saved to localStorage');
        
        const verify = localStorage.getItem('activeDineInCustomers');
        console.log('✅ Verification - localStorage now contains:', verify);
        console.log('=====================================');
        
        showToast(`✅ Table #${tableNumber} added to active customers`, 'success', 2000);
        return activeCustomer;
    } catch (error) {
        console.error('❌ Error in addActiveTable:', error);
        console.log('=====================================');
        showToast('❌ Error adding table', 'error', 2000);
        return null;
    }
}

let servingwareInventory = {
    'plate': { name: 'Plate', current: 100, max: 100, unit: 'piece', minThreshold: 20 },
    'tray': { name: 'Party Tray', current: 100, max: 100, unit: 'piece', minThreshold: 15 },
    'glass': { name: 'Glass', current: 100, max: 100, unit: 'piece', minThreshold: 25 },
    'sizzling plate': { name: 'Sizzling Plate', current: 100, max: 100, unit: 'piece', minThreshold: 20 },
    'cup': { name: 'Coffee Cup', current: 100, max: 100, unit: 'piece', minThreshold: 20 },
    'bowl': { name: 'Rice Bowl', current: 100, max: 100, unit: 'piece', minThreshold: 30 },
    'pitcher': { name: 'Pitcher', current: 50, max: 50, unit: 'piece', minThreshold: 10 },
    'bottle': { name: 'Bottle', current: 100, max: 100, unit: 'piece', minThreshold: 20 },
    'serving': { name: 'Serving Plate', current: 80, max: 80, unit: 'piece', minThreshold: 15 },
    'sandwich': { name: 'Sandwich Plate', current: 50, max: 50, unit: 'piece', minThreshold: 10 },
    'meal': { name: 'Meal Tray', current: 100, max: 100, unit: 'piece', minThreshold: 20 },
    'pot': { name: 'Cooking Pot', current: 30, max: 30, unit: 'piece', minThreshold: 5 }
};

let ingredientInventory = {
    'pork': { name: 'Pork', current: 50, max: 500, unit: 'kg', minThreshold: 20 },
    'chicken': { name: 'Chicken', current: 40, max: 300, unit: 'kg', minThreshold: 15 },
    'beef': { name: 'Beef', current: 30, max: 200, unit: 'kg', minThreshold: 10 },
    'shrimp': { name: 'Shrimp', current: 20, max: 100, unit: 'kg', minThreshold: 8 },
    'fish': { name: 'Cream Dory', current: 25, max: 150, unit: 'kg', minThreshold: 10 },
    'pork_belly': { name: 'Pork Belly', current: 30, max: 100, unit: 'kg', minThreshold: 10 },
    'pork_chop': { name: 'Pork Chop', current: 25, max: 80, unit: 'kg', minThreshold: 8 },
    'onion': { name: 'Onion', current: 15, max: 50, unit: 'kg', minThreshold: 5 },
    'garlic': { name: 'Garlic', current: 10, max: 30, unit: 'kg', minThreshold: 3 },
    'cabbage': { name: 'Cabbage', current: 12, max: 40, unit: 'kg', minThreshold: 5 },
    'carrot': { name: 'Carrot', current: 10, max: 30, unit: 'kg', minThreshold: 5 },
    'bell_pepper': { name: 'Bell Pepper', current: 8, max: 20, unit: 'kg', minThreshold: 3 },
    'calamansi': { name: 'Calamansi', current: 8, max: 20, unit: 'kg', minThreshold: 5 },
    'tomato': { name: 'Tomato', current: 10, max: 30, unit: 'kg', minThreshold: 5 },
    'potato': { name: 'Potato', current: 25, max: 100, unit: 'kg', minThreshold: 10 },
    'cucumber': { name: 'Cucumber', current: 10, max: 30, unit: 'kg', minThreshold: 5 },
    'eggplant': { name: 'Eggplant', current: 10, max: 30, unit: 'kg', minThreshold: 5 },
    'green_beans': { name: 'Green Beans', current: 10, max: 30, unit: 'kg', minThreshold: 5 },
    'rice': { name: 'Rice', current: 80, max: 200, unit: 'kg', minThreshold: 30 }
};

const productIngredientMap = {
    'Korean Spicy Bulgogi (Pork)': {
        ingredients: { 
            'pork': 0.2, 
            'onion': 0.05, 
            'garlic': 0.02, 
            'gochujang': 0.03,
            'sesame_oil': 0.01,
            'soy_sauce': 0.03, 
            'cooking_oil': 0.02,
            'salt': 0.01,
            'black_pepper': 0.01,
            'chili': 0.01
        },
        servingware: 'plate'
    },
    'Korean Salt and Pepper (Pork)': {
        ingredients: { 
            'pork': 0.2, 
            'onion': 0.05, 
            'garlic': 0.02, 
            'gochujang': 0.03,
            'sesame_oil': 0.01,
            'soy_sauce': 0.03, 
            'cooking_oil': 0.02,
            'salt': 0.01,
            'black_pepper': 0.01,
            'peppercorn': 0.01
        },
        servingware: 'plate'
    },
    'Crispy Pork Lechon Kawali': {
        ingredients: { 
            'pork_belly': 0.25, 
            'garlic': 0.02, 
            'onion': 0.03,
            'salt': 0.01,
            'cooking_oil': 0.1,
            'cornstarch': 0.02
        },
        servingware: 'plate'
    },
    'Cream Dory Fish Fillet': {
        ingredients: { 
            'cream_dory': 0.2,
            'breadcrumbs': 0.05,
            'flour': 0.05,
            'egg': 0.05,
            'cooking_oil': 0.1,
            'salt': 0.01,
            'black_pepper': 0.01,
            'lemon': 0.02
        },
        servingware: 'plate'
    },
    'Buttered Honey Chicken': {
        ingredients: { 
            'chicken': 0.25,
            'butter': 0.08,
            'honey': 0.1,
            'garlic': 0.02,
            'cooking_oil': 0.05,
            'salt': 0.01
        },
        servingware: 'plate'
    },
    'Buttered Spicy Chicken': {
        ingredients: { 
            'chicken': 0.25,
            'butter': 0.08,
            'chili': 0.05,
            'garlic': 0.03,
            'cooking_oil': 0.05,
            'salt': 0.01,
            'black_pepper': 0.01
        },
        servingware: 'plate'
    },
    'Chicken Adobo': {
        ingredients: { 
            'chicken': 0.25,
            'soy_sauce': 0.1,
            'vinegar': 0.08,
            'garlic': 0.05,
            'onion': 0.05,
            'bay_leaves': 0.01,
            'black_pepper': 0.01,
            'cooking_oil': 0.03
        },
        servingware: 'plate'
    },
    'Pork Shanghai': {
        ingredients: { 
            'pork': 0.2,
            'lumpia_wrapper': 0.1,
            'carrots': 0.08,
            'onion': 0.05,
            'garlic': 0.03,
            'cooking_oil': 0.15,
            'salt': 0.01,
            'black_pepper': 0.01
        },
        servingware: 'plate'
    },
    'Sizzling Pork Sisig': {
        ingredients: { 
            'pork': 0.2, 
            'onion': 0.05, 
            'garlic': 0.02,
            'chili': 0.02,
            'calamansi': 0.02,
            'egg': 0.05,
            'mayonnaise': 0.03,
            'soy_sauce': 0.02,
            'oyster_sauce': 0.02,
            'cooking_oil': 0.02,
            'salt': 0.01,
            'black_pepper': 0.01
        },
        servingware: 'sizzling_plate'
    },
    'Sizzling Liempo': {
        ingredients: { 
            'pork_belly': 0.25, 
            'onion': 0.05, 
            'garlic': 0.02,
            'cooking_oil': 0.02,
            'salt': 0.01
        },
        servingware: 'sizzling_plate'
    },
    'Sizzling Porkchop': {
        ingredients: { 
            'pork': 0.25, 
            'onion': 0.05, 
            'garlic': 0.02,
            'cooking_oil': 0.02,
            'salt': 0.01
        },
        servingware: 'sizzling_plate'
    },
    'Sizzling Fried Chicken': {
        ingredients: { 
            'chicken': 0.3,
            'flour': 0.08,
            'breadcrumbs': 0.08,
            'egg': 0.05,
            'cooking_oil': 0.15,
            'gravy': 0.1,
            'salt': 0.01,
            'black_pepper': 0.01
        },
        servingware: 'sizzling_plate'
    },
    'Pansit Bihon': {
        ingredients: { 
            'rice_noodles': 0.8,
            'onion': 0.1, 
            'garlic': 0.05,
            'carrots': 0.15,
            'soy_sauce': 0.08,
            'oyster_sauce': 0.08,
            'cooking_oil': 0.1,
            'chicken': 0.2,
            'cabbage': 0.15
        },
        servingware: 'tray'
    },
    'Pancit Canton': {
        ingredients: { 
            'pancit_canton': 0.8,
            'onion': 0.1, 
            'garlic': 0.05,
            'carrots': 0.15,
            'soy_sauce': 0.08,
            'oyster_sauce': 0.08,
            'cooking_oil': 0.1,
            'chicken': 0.2,
            'cabbage': 0.15
        },
        servingware: 'tray'
    },
    'Spaghetti': {
        ingredients: { 
            'spaghetti_pasta': 0.8,
            'onion': 0.1, 
            'garlic': 0.05,
            'tomato_sauce': 0.3,
            'ground_pork': 0.25,
            'hotdog': 0.15,
            'cheese': 0.1,
            'sugar': 0.05,
            'cooking_oil': 0.08,
            'Tray': 0.05
        },
        servingware: 'tray'
    },
    'Creamy Carbonara': {
        ingredients: { 
            'spaghetti_pasta': 0.8,
            'bacon': 0.2,
            'cream': 0.3,
            'milk': 0.2,
            'cheese': 0.15,
            'egg': 0.1,
            'garlic': 0.03,
            'butter': 0.05,
            'black_pepper': 0.01
        },
        servingware: 'tray'
    },
    'Creamy Pesto': {
        ingredients: { 
            'spaghetti_pasta': 0.8,
            'basil_pesto': 0.15,
            'cream': 0.25,
            'cheese': 0.15,
            'garlic': 0.03,
            'pine_nuts': 0.05,
            'olive_oil': 0.08,
            'salt': 0.01
        },
        servingware: 'tray'
    },
    'Tuyo Pesto': {
        ingredients: { 
            'spaghetti_pasta': 0.8,
            'tuyo': 0.15,
            'basil_pesto': 0.15,
            'garlic': 0.05,
            'olive_oil': 0.08,
            'chili': 0.02,
            'salt': 0.01
        },
        servingware: 'tray'
    },
    'Kare-Kare': {
        ingredients: { 
            'oxtail': 0.4,
            'banana_flower_bud': 0.15,
            'pechay': 0.15,
            'string_beans': 0.1,
            'chinese_eggplant': 0.1,
            'ground_peanuts': 0.1,
            'peanut_butter': 0.1,
            'shrimp_paste': 0.02,
            'water': 0.5,
            'annatto_seeds': 0.005,
            'toasted_ground_rice': 0.05,
            'garlic': 0.03,
            'onion': 0.08,
            'salt': 0.01,
            'black_pepper': 0.005
        },
        servingware: 'pot'
    },
    'Chicken Buffalo Wings': {
        ingredients: { 
            'chicken_wings': 0.8,
            'flour': 0.15,
            'cornstarch': 0.1,
            'buffalo_sauce': 0.2,
            'butter': 0.1,
            'garlic': 0.03,
            'cooking_oil': 0.2,
            'salt': 0.01,
            'black_pepper': 0.01
        },
        servingware: 'plate'
    },
    'Lumpia Shanghai': {
        ingredients: { 
            'lumpia_wrapper': 0.3,
            'pork': 0.4,
            'carrots': 0.15,
            'onion': 0.1,
            'garlic': 0.05,
            'breadcrumbs': 0.1,
            'egg': 0.05,
            'cooking_oil': 0.2,
            'salt': 0.01,
            'black_pepper': 0.01
        },
        servingware: 'plate'
    },
    'Cucumber Lemonade (Glass)': {
        ingredients: { 
            'cucumber': 0.08,
            'lemon': 0.05,
            'sugar': 0.03,
            'water': 0.25,
            'ice': 0.15
        },
        servingware: 'glass'
    },
    'Blue Lemonade (Glass)': {
        ingredients: { 
            'blue_syrup': 0.05,
            'lemon': 0.05,
            'sugar': 0.03,
            'water': 0.25,
            'ice': 0.15
        },
        servingware: 'glass'
    },
    'Red Tea (Glass)': {
        ingredients: { 
            'red_tea': 0.02,
            'sugar': 0.03,
            'water': 0.25,
            'ice': 0.15
        },
        servingware: 'glass'
    },
    'Calamansi Juice (Glass)': {
        ingredients: { 
            'calamansi': 0.1,
            'sugar': 0.04,
            'water': 0.2,
            'ice': 0.15
        },
        servingware: 'glass'
    },
    'Cucumber Lemonade (Pitcher)': {
        ingredients: { 
            'cucumber': 0.25,
            'lemon': 0.15,
            'sugar': 0.1,
            'water': 0.8,
            'ice': 0.3
        },
        servingware: 'pitcher'
    },
    'Blue Lemonade (Pitcher)': {
        ingredients: { 
            'blue_syrup': 0.15,
            'lemon': 0.15,
            'sugar': 0.1,
            'water': 0.8,
            'ice': 0.3
        },
        servingware: 'pitcher'
    },
    'Red Tea (Pitcher)': {
        ingredients: { 
            'red_tea': 0.06,
            'sugar': 0.1,
            'water': 0.8,
            'ice': 0.3
        },
        servingware: 'pitcher'
    },
    'Calamansi Juice (Pitcher)': {
        ingredients: { 
            'calamansi': 0.3,
            'sugar': 0.12,
            'water': 0.7,
            'ice': 0.3
        },
        servingware: 'pitcher'
    },
    'Soda (Mismo) Coke': {
        ingredients: { 
            'coke_syrup': 0.05,
            'carbonated_water': 0.3
        },
        servingware: 'bottle'
    },
    'Soda (Mismo) Sprite': {
        ingredients: { 
            'sprite_syrup': 0.05,
            'carbonated_water': 0.3
        },
        servingware: 'bottle'
    },
    'Soda (Mismo) Royal': {
        ingredients: { 
            'royal_syrup': 0.05,
            'carbonated_water': 0.3
        },
        servingware: 'bottle'
    },
    'Soda 1.5L Coke': {
        ingredients: { 
            'coke_syrup': 0.2,
            'carbonated_water': 1.3
        },
        servingware: 'bottle'
    },
    'Soda 1.5L Coke Zero': {
        ingredients: { 
            'coke_zero_syrup': 0.2,
            'carbonated_water': 1.3
        },
        servingware: 'bottle'
    },
    'Soda 1.5L Sprite': {
        ingredients: { 
            'sprite_syrup': 0.2,
            'carbonated_water': 1.3
        },
        servingware: 'bottle'
    },
    'Soda 1.5L Royal': {
        ingredients: { 
            'royal_syrup': 0.2,
            'carbonated_water': 1.3
        },
        servingware: 'bottle'
    },
    'Espresso Hot': {
        ingredients: { 
            'coffee_beans': 0.02,
            'water': 0.03
        },
        servingware: 'cup'
    },
    'Café Americano Hot': {
        ingredients: { 
            'espresso': 0.05,
            'hot_water': 0.2
        },
        servingware: 'cup'
    },
    'Cappuccino Hot': {
        ingredients: { 
            'espresso': 0.05,
            'steamed_milk': 0.15,
            'milk_foam': 0.1
        },
        servingware: 'cup'
    },
    'Café Latte Hot': {
        ingredients: { 
            'espresso': 0.05,
            'steamed_milk': 0.25
        },
        servingware: 'cup'
    },
    'Mocha Latte Hot': {
        ingredients: { 
            'espresso': 0.05,
            'chocolate_syrup': 0.03,
            'steamed_milk': 0.22
        },
        servingware: 'cup'
    },
    'Vanilla Latte Hot': {
        ingredients: { 
            'espresso': 0.05,
            'vanilla_syrup': 0.03,
            'steamed_milk': 0.22
        },
        servingware: 'cup'
    },
    'Caramel Macchiato Hot': {
        ingredients: { 
            'espresso': 0.05,
            'vanilla_syrup': 0.02,
            'caramel_syrup': 0.03,
            'steamed_milk': 0.2,
            'milk_foam': 0.05
        },
        servingware: 'cup'
    },
    'Green Tea Latte Hot': {
        ingredients: { 
            'matcha_powder': 0.02,
            'steamed_milk': 0.25,
            'sugar': 0.02
        },
        servingware: 'cup'
    },
    'White Chocolate Hot': {
        ingredients: { 
            'white_chocolate_syrup': 0.05,
            'steamed_milk': 0.25,
            'cream': 0.02
        },
        servingware: 'cup'
    },
    'Green Tea Matcha Hot': {
        ingredients: { 
            'matcha_powder': 0.03,
            'steamed_milk': 0.25,
            'sugar': 0.02
        },
        servingware: 'cup'
    },
    'Hot Ceylon Tea Black': {
        ingredients: { 
            'black_tea': 0.02,
            'hot_water': 0.25,
            'sugar': 0.02
        },
        servingware: 'cup'
    },
    'Hot Ceylon Tea Lemon': {
        ingredients: { 
            'black_tea': 0.02,
            'lemon': 0.03,
            'hot_water': 0.25,
            'sugar': 0.02
        },
        servingware: 'cup'
    },
    'Hot Ceylon Tea Peppermint': {
        ingredients: { 
            'peppermint_tea': 0.02,
            'hot_water': 0.25,
            'honey': 0.02
        },
        servingware: 'cup'
    },
    'Iced Café Latte': {
        ingredients: { 
            'espresso': 0.05,
            'milk': 0.2,
            'ice': 0.15,
            'sugar': 0.02
        },
        servingware: 'cup'
    },
    'Iced Mocha Latte': {
        ingredients: { 
            'espresso': 0.05,
            'chocolate_syrup': 0.03,
            'milk': 0.18,
            'ice': 0.15,
            'sugar': 0.02
        },
        servingware: 'cup'
    },
    'Iced Vanilla Latte': {
        ingredients: { 
            'espresso': 0.05,
            'vanilla_syrup': 0.03,
            'milk': 0.18,
            'ice': 0.15
        },
        servingware: 'cup'
    },
    'Iced Caramel Macchiato': {
        ingredients: { 
            'espresso': 0.05,
            'vanilla_syrup': 0.02,
            'caramel_syrup': 0.03,
            'milk': 0.18,
            'ice': 0.15
        },
        servingware: 'cup'
    },
    'Iced White Chocolate Latte': {
        ingredients: { 
            'white_chocolate_syrup': 0.04,
            'milk': 0.2,
            'ice': 0.15
        },
        servingware: 'cup'
    },
    'Iced Dark Chocolate': {
        ingredients: { 
            'dark_chocolate_syrup': 0.05,
            'milk': 0.2,
            'ice': 0.15
        },
        servingware: 'cup'
    },
    'Milk Tea Regular': {
        ingredients: { 
            'black_tea': 0.03,
            'milk': 0.15,
            'sugar': 0.03,
            'tapioca_pearls': 0.08,
            'ice': 0.15
        },
        servingware: 'cup'
    },
    'Caramel Milk Tea': {
        ingredients: { 
            'black_tea': 0.03,
            'milk': 0.15,
            'caramel_syrup': 0.04,
            'sugar': 0.02,
            'tapioca_pearls': 0.08,
            'ice': 0.15
        },
        servingware: 'cup'
    },
    'Cookies & Cream Milk Tea': {
        ingredients: { 
            'black_tea': 0.03,
            'milk': 0.15,
            'cookie_crumbs': 0.05,
            'sugar': 0.02,
            'tapioca_pearls': 0.08,
            'ice': 0.15
        },
        servingware: 'cup'
    },
    'Dark Choco Milk Tea': {
        ingredients: { 
            'black_tea': 0.03,
            'milk': 0.15,
            'chocolate_syrup': 0.05,
            'sugar': 0.02,
            'tapioca_pearls': 0.08,
            'ice': 0.15
        },
        servingware: 'cup'
    },
    'Okinawa Milk Tea': {
        ingredients: { 
            'black_tea': 0.03,
            'milk': 0.15,
            'okinawa_syrup': 0.04,
            'sugar': 0.02,
            'tapioca_pearls': 0.08,
            'ice': 0.15
        },
        servingware: 'cup'
    },
    'Wintermelon Milk Tea': {
        ingredients: { 
            'wintermelon_syrup': 0.04,
            'milk': 0.15,
            'sugar': 0.02,
            'tapioca_pearls': 0.08,
            'ice': 0.15
        },
        servingware: 'cup'
    },
    'Matcha Green Tea Milk Tea': {
        ingredients: { 
            'matcha_powder': 0.02,
            'milk': 0.15,
            'sugar': 0.03,
            'tapioca_pearls': 0.08,
            'ice': 0.15
        },
        servingware: 'cup'
    },
    'Matcha Green Tea Frappe': {
        ingredients: { 
            'matcha_powder': 0.02,
            'milk': 0.15,
            'ice_cream': 0.1,
            'ice': 0.2,
            'sugar': 0.03,
            'whipped_cream': 0.05
        },
        servingware: 'cup'
    },
    'Salted Caramel Frappe': {
        ingredients: { 
            'coffee': 0.05,
            'caramel_syrup': 0.05,
            'milk': 0.15,
            'ice_cream': 0.1,
            'ice': 0.2,
            'salt': 0.005,
            'whipped_cream': 0.05
        },
        servingware: 'cup'
    },
    'Strawberry Cheesecake Frappe': {
        ingredients: { 
            'strawberry_syrup': 0.05,
            'cream_cheese': 0.03,
            'milk': 0.15,
            'ice_cream': 0.1,
            'ice': 0.2,
            'sugar': 0.02,
            'whipped_cream': 0.05,
            'graham_crumbs': 0.02
        },
        servingware: 'cup'
    },
    'Mango Cheesecake Frappe': {
        ingredients: { 
            'mango_puree': 0.06,
            'cream_cheese': 0.03,
            'milk': 0.15,
            'ice_cream': 0.1,
            'ice': 0.2,
            'sugar': 0.02,
            'whipped_cream': 0.05,
            'graham_crumbs': 0.02
        },
        servingware: 'cup'
    },
    'Strawberry Cream Frappe': {
        ingredients: { 
            'strawberry_syrup': 0.05,
            'milk': 0.15,
            'ice_cream': 0.1,
            'ice': 0.2,
            'sugar': 0.02,
            'whipped_cream': 0.05
        },
        servingware: 'cup'
    },
    'Cookies & Cream Frappe': {
        ingredients: { 
            'coffee': 0.05,
            'cookie_crumbs': 0.05,
            'milk': 0.15,
            'ice_cream': 0.1,
            'ice': 0.2,
            'sugar': 0.02,
            'whipped_cream': 0.05,
            'chocolate_syrup': 0.02
        },
        servingware: 'cup'
    },
    'Rocky Road Frappe': {
        ingredients: { 
            'chocolate_syrup': 0.05,
            'milk': 0.15,
            'ice_cream': 0.1,
            'ice': 0.2,
            'marshmallows': 0.03,
            'nuts': 0.02,
            'whipped_cream': 0.05
        },
        servingware: 'cup'
    },
    'Choco Fudge Frappe': {
        ingredients: { 
            'chocolate_syrup': 0.06,
            'milk': 0.15,
            'ice_cream': 0.1,
            'ice': 0.2,
            'whipped_cream': 0.05,
            'chocolate_sauce': 0.03
        },
        servingware: 'cup'
    },
    'Choco Mousse Frappe': {
        ingredients: { 
            'chocolate_syrup': 0.05,
            'chocolate_mousse': 0.08,
            'milk': 0.15,
            'ice': 0.2,
            'whipped_cream': 0.05
        },
        servingware: 'cup'
    },
    'Coffee Crumble Frappe': {
        ingredients: { 
            'coffee': 0.06,
            'milk': 0.15,
            'ice_cream': 0.1,
            'ice': 0.2,
            'cookie_crumbs': 0.04,
            'whipped_cream': 0.05
        },
        servingware: 'cup'
    },
    'Vanilla Cream Frappe': {
        ingredients: { 
            'vanilla_syrup': 0.05,
            'milk': 0.15,
            'ice_cream': 0.1,
            'ice': 0.2,
            'whipped_cream': 0.05
        },
        servingware: 'cup'
    },
    'Sinigang (Pork)': {
        ingredients: { 
            'pork': 0.25, 
            'onion': 0.05, 
            'garlic': 0.02,
            'tomato': 0.05,
            'calamansi': 0.02,
            'chili': 0.01,
            'shrimp_paste': 0.02,
            'tamarind_mix': 0.03,
            'salt': 0.01,
            'black_pepper': 0.01,
            'bay_leaves': 0.01,
            'water': 0.3
        },
        servingware: 'bowl'
    },
    'Sinigang (Shrimp)': {
        ingredients: { 
            'shrimp': 0.2, 
            'onion': 0.05, 
            'garlic': 0.02,
            'tomato': 0.05,
            'calamansi': 0.02,
            'chili': 0.01,
            'shrimp_paste': 0.02,
            'tamarind_mix': 0.03,
            'salt': 0.01,
            'black_pepper': 0.01,
            'bay_leaves': 0.01,
            'water': 0.3
        },
        servingware: 'bowl'
    },
    'Buttered Shrimp': {
        ingredients: { 
            'shrimp': 0.2, 
            'butter': 0.03,
            'calamansi': 0.02,
            'salt': 0.01,
            'black_pepper': 0.01
        },
        servingware: 'plate'
    },
    'Special Bulalo': {
        ingredients: { 
            'beef': 0.3,
            'corn': 0.1,
            'potato': 0.1,
            'carrots': 0.1,
            'onion': 0.05,
            'garlic': 0.02,
            'bay_leaves': 0.01,
            'salt': 0.01,
            'water': 0.3,
            'chicken_broth': 0.2
        },
        servingware: 'pot'
    },
    'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)': {
        ingredients: { 
            'beef': 0.6,
            'corn': 0.2,
            'potato': 0.2,
            'carrots': 0.2,
            'onion': 0.1,
            'garlic': 0.04,
            'bay_leaves': 0.02,
            'salt': 0.02,
            'water': 0.6,
            'chicken_broth': 0.4
        },
        servingware: 'pot'
    },
    'Paknet (Pakbet w/ Bagnet)': {
        ingredients: { 
            'bagnet': 0.15,
            'onion': 0.05, 
            'garlic': 0.02,
            'tomato': 0.05,
            'cucumber': 0.05,
            'corn': 0.05,
            'potato': 0.05,
            'carrots': 0.05,
            'salt': 0.01,
            'black_pepper': 0.01
        },
        servingware: 'plate'
    },
    'Tinapa Rice': {
        ingredients: { 
            'rice': 0.2,
            'tinapa': 0.05
        },
        servingware: 'plate'
    },
    'Fried Rice': {
        ingredients: { 
            'rice': 0.2,
            'onion': 0.02, 
            'garlic': 0.02,
            'egg': 0.05,
            'soy_sauce': 0.01,
            'sesame_oil': 0.01,
            'sugar': 0.01,
            'salt': 0.01,
            'water': 0.02,
            'cooking_oil': 0.02
        },
        servingware: 'plate'
    },
    'Plain Rice': {
        ingredients: { 
            'rice': 0.2,
            'salt': 0.01,
            'water': 0.02
        },
        servingware: 'cup'
    },
    'Cheesy Nachos': {
        ingredients: { 
            'nacho_chips': 0.15,
            'onion': 0.02,
            'cheese_sauce': 0.05,
            'cheese': 0.03,
            'cooking_oil': 0.02
        },
        servingware: 'plate'
    },
    'Nachos Supreme': {
        ingredients: { 
            'nacho_chips': 0.15,
            'onion': 0.02,
            'cheese_sauce': 0.05,
            'cheese': 0.03,
            'cooking_oil': 0.02
        },
        servingware: 'plate'
    },
    'French Fries': {
        ingredients: { 
            'french_fries': 0.2,
            'flour': 0.02,
            'cooking_oil': 0.08,
            'salt': 0.01
        },
        servingware: 'plate'
    },
    'Cheesy Dynamite Lumpia': {
        ingredients: { 
            'lumpia_wrapper': 0.1,
            'cheese': 0.05,
            'cheese_sauce': 0.03,
            'cornstarch': 0.02,
            'cooking_oil': 0.05
        },
        servingware: 'plate'
    },
    'Clubhouse Sandwich': {
        ingredients: { 
            'chicken': 0.1, 
            'bread': 0.1,
            'mayonnaise': 0.02,
            'gravy': 0.03
        },
        servingware: 'plate'
    },
    'Fish and Fries': {
        ingredients: { 
            'cream_dory': 0.15, 
            'french_fries': 0.15,
            'breadcrumbs': 0.02,
            'flour': 0.02,
            'cooking_oil': 0.08,
            'salt': 0.01
        },
        servingware: 'plate'
    },
    'Fried Chicken': {
        ingredients: { 
            'chicken': 0.25, 
            'breadcrumbs': 0.03,
            'flour': 0.03,
            'cooking_oil': 0.1,
            'salt': 0.01
        },
        servingware: 'plate'
    },
    'Budget Fried Chicken': {
        ingredients: { 
            'chicken': 0.15, 
            'breadcrumbs': 0.02,
            'flour': 0.02,
            'cooking_oil': 0.08,
            'salt': 0.01
        },
        servingware: 'plate'
    }
};

const categoryDisplayNames = {
    'Rice Bowl Meals': 'Rice Bowl Meals',
    'Hot Sizzlers': 'Hot Sizzlers',
    'Party Tray': 'Party Tray',
    'Drinks': 'Drinks',
    'Coffee': 'Coffee',
    'Milk Tea': 'Milk Tea',
    'Frappe': 'Frappe',
    'Snacks & Appetizer': 'Snacks & Appetizer',
    'Budget Meals Served with Rice': 'Budget Meals Served with Rice',
    'Specialties': 'Specialties'
};

const productImageMap = {
    'Korean Spicy Bulgogi (Pork)': '/images/rice/korean_spicy_bulgogi.png',
    'Korean Salt and Pepper (Pork)': '/images/rice/korean_salt_pepper_pork.png',
    'Crispy Pork Lechon Kawali': '/images/rice/lechon_kawali.png',
    'Pork Shanghai': '/images/rice/pork_shanghai.png',
    'Buttered Honey Chicken': '/images/rice/buttered_honey_chicken.png',
    'Buttered Spicy Chicken': '/images/rice/buttered_spicy_chicken.png',
    'Chicken Adobo': '/images/rice/chicken_adobo.png',
    'Fried Chicken': '/images/sizzling/fried_chicken.png',
    'Sizzling Fried Chicken': '/images/sizzling/fried_chicken.png',
    'Budget Fried Chicken': '/images/budget/fried_chicken_Meal.png',
    'Sinigang (Pork)': '/images/specialties/sinigang_pork.png',
    'Sizzling Pork Sisig': '/images/sizzling/pork_sisig.png',
    'Sizzling Liempo': '/images/sizzling/liempo.png',
    'Sizzling Porkchop': '/images/sizzling/porkchop.png',
    'Cream Dory Fish Fillet': '/images/rice/cream_dory.png',
    'Fish and Fries': '/images/snacks/fish_fries.png',
    'Sinigang (Shrimp)': '/images/specialties/sinigang_shrimp.png',
    'Buttered Shrimp': '/images/specialties/buttered_shrimp.png',
    'Special Bulalo': '/images/specialties/bulalo.png',
    'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)': '/images/specialties/bulalo.png',
    'Paknet (Pakbet w/ Bagnet)': '/images/specialties/paknet.png',
    'Pancit Bihon (S)': '/images/party/pancit_bihon_large.png',
    'Pancit Bihon (M)': '/images/party/pancit_bihon_large.png',
    'Pancit Bihon (L)': '/images/party/pancit_bihon_large.png',
    'Pancit Canton (S)': '/images/party/pancit_canton_large.png',
    'Pancit Canton (M)': '/images/party/pancit_canton_large.png',
    'Pancit Canton (L)': '/images/party/pancit_canton_large.png',
    'Spaghetti (S)': '/images/party/spaghetti_large.png',
    'Spaghetti (M)': '/images/party/spaghetti_large.png',
    'Spaghetti (L)': '/images/party/spaghetti_large.png',
    'Kare-Kare': '/images/party/Kare_Kare.png',
    'Tinapa Rice': '/images/budget/Tinapa_fried_rice.png',
    'Tuyo Pesto': '/images/budget/Tuyo_pesto.png',
    'Fried Rice': '/images/budget/fried_rice.png',
    'Plain Rice': '/images/budget/plain_rice.png',
    'Cheesy Nachos': '/images/snacks/cheesy_nachos.png',
    'Nachos Supreme': '/images/snacks/nachos_supreme.png',
    'French Fries': '/images/snacks/french_fries.png',
    'Cheesy Dynamite Lumpia': '/images/snacks/Cheesy_dynamite.png',
    'Lumpiang Shanghai': '/images/snacks/lumpiang_shanghai.png',
    'Clubhouse Sandwich': '/images/snacks/club_house_sandwich.png',
    'Cucumber Lemonade (Glass)': '/images/drinks/cucumber_lemonade.png',
    'Cucumber Lemonade (Pitcher)': '/images/drinks/cucumber_lemonade.png',
    'Blue Lemonade (Glass)': '/images/drinks/blue_lemonade.png',
    'Blue Lemonade (Pitcher)': '/images/drinks/blue_lemonade.png',
    'Red Tea (Glass)': '/images/drinks/red_tea.png',
    'Soda 1.5L Coke': '/images/drinks/Soda_Coke_1.5L.png',
    'Soda 1.5L Coke Zero': '/images/drinks/Soda_CokeZero_1.5L.png',
    'Soda 1.5L Sprite': '/images/drinks/Soda_Sprite_1.5L.png',
    'Soda 1.5L Royal': '/images/drinks/Soda_Royal_1.5L.png',
    'Soda (Mismo) Coke': '/images/drinks/Soda_Coke_Mismo.png',
    'Soda (Mismo) Sprite': '/images/drinks/Soda_Sprite_Mismo.png',
    'Soda (Mismo) Royal': '/images/drinks/Soda_Royal_Mismo.png',
    'Cafe Americano Tall': '/images/coffee/cafe_americano_grande.png',
    'Cafe Americano Grande': '/images/coffee/cafe_americano_grande.png',
    'Cafe Latte Tall': '/images/coffee/cafe_latte_grande.png',
    'Cafe Latte Grande': '/images/coffee/cafe_latte_grande.png',
    'Caramel Macchiato Tall': '/images/coffee/caramel_macchiato_tall.png',
    'Caramel Macchiato Grande': '/images/coffee/caramel_macchiato_grande.png',
    'Caramel Macchiato Hot': '/images/coffee/Caramel_machaitto_Hot.png',
    'Cappuccino Tall': '/images/coffee/cappuccino_grande.png',
    'Cappuccino Grande': '/images/coffee/cappuccino_grande.png',
    'Green Tea Latte Tall': '/images/coffee/green_tea_latte_grande.png',
    'Green Tea Latte Grande': '/images/coffee/green_tea_latte_grande.png',
    'Mocha Latte Tall': '/images/coffee/mocha_latte_grande.png',
    'Mocha Latte Grande': '/images/coffee/mocha_latte_grande.png',
    'Vanilla Latte Tall': '/images/coffee/vanilla_latte_grande.png',
    'Vanilla Latte Grande': '/images/coffee/vanilla_latte_grande.png',
    'White Chocolate Latte Tall': '/images/coffee/white_chocolate_hot.png',
    'White Chocolate Latte Grande': '/images/coffee/white_chocolate_hot.png',
    'Dark Chocolate  Tall': '/images/coffee/dark_chocolate_iced.png',
    'Dark Chocolate Grande': '/images/coffee/dark_chocolate_iced.png',
    'Black Tea':'/images/coffee/black_tea.png',
    'Lemon Tea': '/images/coffee/lemon_tea.png',
    'Peppermint Tea': '/images/coffee/peppermint_tea.png',
    'Milk Tea Regular HC': '/images/milktea/Milktea_regular.png',
    'Milk Tea Regular MC': '/images/milktea/Milktea_regular.png',
    'Matcha Green Tea HC': '/images/milktea/Matcha_greentea_HC.png',
    'Matcha Green Tea MC': '/images/milktea/Matcha_greentea_HC.png',
    'Cookies & Cream HC': '/images/milktea/Cookies&Cream_MilkTea.png',
    'Cookies & Cream MC': '/images/milktea/Cookies&Cream_MilkTea.png',
    'Caramel HC': '/images/milktea/Caramel_MilkTea.png',
    'Caramel MC': '/images/milktea/Caramel_MilkTea.png',
    'Dark Choco HC': '/images/milktea/Dark_Choco_MilkTea.png',
    'Dark Choco MC': '/images/milktea/Dark_Choco_MilkTea.png',
    'Okinawa HC': '/images/milktea/Okinawa_MilkTea.png',
    'Okinawa MC': '/images/milktea/Okinawa_MilkTea.png',
    'Wintermelon HC': '/images/milktea/Wintermelon_MilkTea.png',
    'Wintermelon MC': '/images/milktea/Wintermelon_MilkTea.png',
    'Cookies & Cream HC': '/images/frappe/Cookies_&Cream_HC.png',
    'Cookies & Cream MC': '/images/frappe/Cookies_&Cream_HC.png',
    'Strawberry & Cream HC': '/images/frappe/Strawberry_Cream_frappe_HC.png',
    'Mango cheese cake HC': '/images/frappe/Mango_cheesecake_HC.png',
    'Cookies & Cream Frappe': '/images/frappe/Cookies_&Cream_Frappe.png',
    'Strawberry & Cream Frappe': '/images/frappe/Strawberry_Cream_frappe.png',
    'Mango cheese cake Frappe': '/images/frappe/Mango_cheesecake_Frappe.png',
    'Rocky Road Frappe': '/images/frappe/Rocky_Road_Frappe.png',
    'Choco Fudge Frappe': '/images/frappe/Chocofudge_frappe.png',
    'Choco Mousse Frappe': '/images/frappe/Choco_Mousse_Frappe.png',
    'Coffee Crumble Frappe': '/images/frappe/Coffee_Crumble_Frappe.png',
    'Vanilla Cream Frappe': '/images/frappe/Vanilla_Cream_Frappe.png',
    'Matcha Green Tea Frappe': '/images/frappe/Matcha_Green_Tea_Frappe.png',
    'Salted Caramel Frappe': '/images/frappe/Salted_Caramel_Frappe.png',
    'Buffalo Chicken Wings (S)': '/images/snacks/Chicken_Buffalo_WingsS.png',
    'Buffalo Chicken Wings (M)': '/images/snacks/Chicken_Buffalo_WingsM.png',
    'Buffalo Chicken Wings (L)': '/images/snacks/Chicken_Buffalo_WingsL.png',
    'Cheesy Dynamite Lumpia': '/images/snacks/Cheesy_dynamite.png',
    'Lumpiang Shanghai': '/images/snacks/lumpiang_shanghai.png',
    'Clubhouse Sandwich': '/images/snacks/club_house_sandwich.png',

};

const BACKEND_URL = window.location.origin;

function getProductImage(productName) {
    return productImageMap[productName] || '/images/default_food.png';
}

function showToast(message, type = 'success', duration = 3000) {
    const existingToast = document.getElementById('activeToast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.id = 'activeToast';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ff9800' : '#17a2b8'};
        color: white;
        border-radius: 8px;
        z-index: 99999;
        font-weight: bold;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        animation: slideInRight 0.3s ease-in-out;
        max-width: 400px;
        word-wrap: break-word;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    if (duration > 0) {
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, duration);
    }
    
    return toast;
}

// Waiting Modal for order processing
function showWaitingModal(message = 'Processing your order...') {
    // Remove existing modal if any
    const existingModal = document.getElementById('waitingModal');
    if (existingModal) existingModal.remove();
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'waitingModal';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 100001;
    `;
    
    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        padding: 40px;
        border-radius: 12px;
        text-align: center;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        max-width: 400px;
    `;
    
    modal.innerHTML = `
        <div style="
            width: 50px;
            height: 50px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #007bff;
            border-radius: 50%;
            margin: 0 auto 20px;
            animation: spin 1s linear infinite;
        "></div>
        <h2 style="color: #2c3e50; margin-bottom: 10px; font-size: 20px;">Processing</h2>
        <p style="color: #666; margin-bottom: 10px;">${message}</p>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    return overlay;
}

// Close waiting modal
function closeWaitingModal() {
    const modal = document.getElementById('waitingModal');
    if (modal) modal.remove();
}

async function getCurrentUser() {
    try {
        const response = await fetch('/api/user/me', {
            credentials: 'include'
        });
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            return currentUser;
        }
    } catch (error) {
        console.error('Error getting current user:', error);
    }
    return null;
}

function handleLogout() {
    showLogoutConfirmation(() => {
        try {
            currentOrder = [];
            pendingStockRequests = [];
            currentUser = null;
            
            const itemsToClear = [
                'pendingStockRequests',
                'localStockRequests',
                'servingwareInventory',
                'stockRequestTimestamps',
                'offlineMode',
                'lastSyncTime'
            ];
            
            itemsToClear.forEach(item => {
                localStorage.removeItem(item);
            });
            
            showToast('Logging out... Please wait', 'info', 2000);
            
            setTimeout(() => {
                fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' }
                })
                .then(() => {
                    window.location.href = '/login?logout=true';
                })
                .catch(() => {
                    window.location.href = '/login?logout=true';
                });
            }, 500);
            
        } catch (error) {
            window.location.href = '/login?logout=true';
        }
    }, () => {
    });
}

function showLogoutConfirmation(onConfirm, onCancel) {
    if (document.getElementById('logoutModal')) {
        return;
    }

    const modal = document.createElement('div');
    modal.id = 'logoutModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        animation: fadeIn 0.3s ease;
    `;

    if (!document.getElementById('logoutModalStyles')) {
        const style = document.createElement('style');
        style.id = 'logoutModalStyles';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            @keyframes slideIn {
                from { transform: translateY(-20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            @keyframes slideInRight {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes scaleIn {
                from { transform: scale(0.8); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
        `;
        document.head.appendChild(style);
    }

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 12px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
        text-align: center;
    `;

    modalContent.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; color: #333; font-size: 24px;">Confirm Logout</h3>
            <p style="color: #666; margin: 0; font-size: 16px;">Are you sure you want to logout?</p>
        </div>
        <div style="display: flex; gap: 15px; justify-content: center;">
            <button id="cancelLogoutBtn" style="
                padding: 12px 30px;
                background: #f0f0f0;
                color: #666;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                font-weight: 500;
                transition: all 0.2s ease;
                flex: 1;
                max-width: 130px;
            " onmouseover="this.style.background='#e4e4e4'" 
               onmouseout="this.style.background='#f0f0f0'">
                Cancel
            </button>
            <button id="confirmLogoutBtn" style="
                padding: 12px 30px;
                background: #dc3545;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                font-weight: 500;
                transition: all 0.2s ease;
                flex: 1;
                max-width: 130px;
            " onmouseover="this.style.background='#c82333'" 
               onmouseout="this.style.background='#dc3545'">
                Logout
            </button>
        </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    const cancelBtn = document.getElementById('cancelLogoutBtn');
    const confirmBtn = document.getElementById('confirmLogoutBtn');

    cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
        if (onCancel) onCancel();
    });

    confirmBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
        if (onConfirm) onConfirm();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
            if (onCancel) onCancel();
        }
    });

    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            document.removeEventListener('keydown', handleEscape);
            if (document.getElementById('logoutModal')) {
                document.body.removeChild(modal);
                if (onCancel) onCancel();
            }
        }
    };
    document.addEventListener('keydown', handleEscape);
}

async function loadAllMenuItems() {
    try {
        const response = await fetch('/api/menu', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success && result.data && Array.isArray(result.data)) {
            productCatalog = [];
            outOfStockItems = [];
            
            result.data.forEach(item => {
                const currentStock = parseInt(item.currentStock) || 0;
                const itemPrice = parseFloat(item.price) || 0;
                
                const product = {
                    name: item.name || item.itemName || 'Unknown',
                    price: itemPrice,
                    category: item.category || 'Uncategorized',
                    image: getProductImage(item.name || item.itemName || ''),
                    stock: currentStock,
                    unit: item.unit || 'piece',
                    _id: item._id || `temp_${Date.now()}_${Math.random()}`,
                    maxStock: item.maxStock || MAX_STOCK_PER_ITEM,
                    status: currentStock > 0 ? 'in_stock' : 'out_of_stock'
                };
                
                productCatalog.push(product);
                
                if (currentStock <= 0) {
                    outOfStockItems.push(product.name);
                }
            });
            renderMenu();
            return true;
        }
        
        showToast('❌ Invalid database response', 'error', 3000);
        return false;
        
    } catch (error) {
        showToast(`❌ Database error: ${error.message}`, 'error', 3000);
        return false;
    }
}

function renderMenu() {
    const container = document.getElementById('menuContainer');
    if (!container) return;
    
    container.innerHTML = '';

    const items = currentCategory === 'all'
        ? productCatalog
        : productCatalog.filter(p => p.category === currentCategory);

    if (items.length === 0) {
        container.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px 20px;
                text-align: center;
                min-height: 300px;
                color: #666;
            ">
                <div style="font-size: 48px; margin-bottom: 20px;">📦</div>
                <h3 style="margin: 10px 0; font-size: 20px; color: #333;">No Products Found</h3>
                <p style="margin: 10px 0; font-size: 14px; color: #999;">
                    No items available in this category at the moment.
                </p>
                <p style="margin: 10px 0; font-size: 13px; color: #bbb;">
                    Please try another category or check back later.
                </p>
            </div>
        `;
        return;
    }

    items.forEach(product => {
        const card = createProductCard(product);
        container.appendChild(card);
    });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'compact-product-card';
    
    card.dataset.productName = product.name;
    card.dataset.productId = product._id;
    card.dataset.stock = product.stock || 0;
    
    card.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (product.stock > 0) {
            addItemToOrder(product.name, product.price, product);
        } else {
            showToast(`${product.name} is out of stock`, 'error', 2000);
        }
    };
    
    const stockStatus = product.stock > 0 
        ? `✅ In Stock: ${product.stock}`
        : `🚫 OUT OF STOCK`;
    
    const stockColor = product.stock > 0 ? '#28a745' : '#dc3545';
    
    const hasPendingRequest = activeStockRequests.has(product.name);
    const pendingIndicator = hasPendingRequest ? '<span style="color: #ff9800; font-size: 12px; display: block;">Request Pending (Waiting for Admin)</span>' : '';
    
    const categoryFolderMap = {
        'Coffee': 'coffee',
        'Milk Tea': 'milktea',
        'Frappe': 'frappe',
        'Drinks': 'drinks',
        'Rice': 'rice',
        'Sizzling': 'sizzling',
        'Snacks': 'snacks',
        'Party': 'party',
        'Budget': 'budget',
        'Specialties': 'specialties'
    };
    
    const categoryFolder = categoryFolderMap[product.category] || 'images';
    let imagePath = product.image;
    
    if (imagePath && !imagePath.startsWith('/')) {
        imagePath = `/images/${categoryFolder}/${imagePath}`;
    }
    
    card.innerHTML = `
        <img src="${imagePath}" 
             onerror="this.onerror=null; this.src='/images/default_food.png';" 
             alt="${product.name}"
             style="opacity: ${product.stock > 0 ? '1' : '0.7'}; width: 100%; height: 100%; object-fit: cover;" />
        <div class="compact-product-name">${product.name}</div>
        <div class="compact-product-category">${product.category}</div>
        <div class="compact-product-price">₱${product.price}</div>
        <div class="compact-product-stock" style="color: ${stockColor}; font-weight: bold;">
            ${stockStatus}
            ${pendingIndicator}
        </div>
    `;
    
    return card;
}

async function updateStockInMongoDB(productId, newStock) {
    try {
        const response = await fetch(`/api/menu/${productId}/stock`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ currentStock: newStock })
        });

        if (!response.ok) {
            const errorData = await response.json();
            showToast(` Stock update failed`, 'warning', 2000);
            return false;
        }

        const result = await response.json();
        return true;
    } catch (error) {
        showToast(` Error updating stock`, 'warning', 2000);
        return false;
    }
}

function addItemToOrder(name, price, product = null) {
    if (!product) {
        product = productCatalog.find(p => p.name === name);
    }
    
    if (!product || product.stock <= 0) {
        showToast(`${name} is out of stock`, 'error', 2000);
        return;
    }
    
    const existingItem = currentOrder.find(item => item.name === name);
    
    product.stock--;
    
    updateStockInMongoDB(product._id, product.stock);
    
    // Ensure price is a number
    const itemPrice = parseFloat(product.price) || 0;
    
    if (existingItem) {
        existingItem.quantity++;
        existingItem.subtotal = existingItem.quantity * itemPrice;
    } else {
        currentOrder.push({
            id: product._id,
            itemName: product.itemName || product.name,
            name: product.name || product.itemName,
            price: itemPrice,
            quantity: 1,
            subtotal: itemPrice,
            unit: product.unit,
            _id: product._id,
            image: product.image || '/images/default_food.png',
            vatable: product.vatable !== undefined ? product.vatable : true,
            size: 'Regular'
        });
    }
    
    if (product.stock === 0) {
        product.status = 'out_of_stock';
        if (!outOfStockItems.includes(product.name)) {
            outOfStockItems.push(product.name);
        }
    }
    
    renderOrder();
    renderMenu();
    updatePayButtonState();
    updateChange();
}

function renderOrder() {
    const list = document.getElementById('productlist');
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('totals');

    if (!list) return;

    list.innerHTML = '';
    let subtotal = 0;

    currentOrder.forEach((item, index) => {
        const itemPrice = parseFloat(item.price) || 0;
        const itemTotal = itemPrice * item.quantity;
        subtotal += itemTotal;
        
        list.innerHTML += `
            <li style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid #eee;">
                <span>${item.name} x${item.quantity}</span>
                <span>₱${itemTotal.toFixed(2)}</span>
                <button onclick="removeItemFromOrder(${index})" style="background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer; padding: 2px 8px;">✕</button>
            </li>`;
    });

    if (subtotalEl) subtotalEl.textContent = `₱${subtotal.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `${subtotal.toFixed(2)}`;
}

function removeItemFromOrder(index) {
    const item = currentOrder[index];
    const product = productCatalog.find(p => p.name === item.name);
    
    if (product) {
        product.stock += item.quantity;
        
        updateStockInMongoDB(product._id, product.stock);
        
        if (product.stock > 0) {
            product.status = 'in_stock';
            outOfStockItems = outOfStockItems.filter(name => name !== product.name);
            
            if (activeStockRequests.has(product.name)) {
                activeStockRequests.delete(product.name);
            }
        }
    }
    
    currentOrder.splice(index, 1);
    renderOrder();
    renderMenu();
    updatePayButtonState();
    updateChange();
}

function clearCurrentOrder() {
    if (currentOrder.length === 0) return;
    
    if (!confirm('Clear current order? This will return items to inventory.')) return;
    
    currentOrder.forEach(item => {
        const product = productCatalog.find(p => p.name === item.name);
        if (product) {
            product.stock += item.quantity;
            
            updateStockInMongoDB(product._id, product.stock);
            
            if (product.stock > 0) {
                product.status = 'in_stock';
                outOfStockItems = outOfStockItems.filter(name => name !== product.name);
                
                if (activeStockRequests.has(product.name)) {
                    activeStockRequests.delete(product.name);
                }
            }
        }
    });
    
    currentOrder = [];
    renderOrder();
    renderMenu();
    updatePayButtonState();
    updateChange();
}

function showOrderConfirmation() {
    if (!currentOrder || currentOrder.length === 0) {
        alert("No items in order");
        return;
    }
    
    if (!orderType || orderType === "None") {
        alert("Please select order type (Dine In or Takeout)");
        return;
    }
    
    if (orderType === "Dine In" && !tableNumber) {
        alert("Please enter table number");
        return;
    }
    
    if (!selectedPaymentMethod) {
        alert("Please select payment method");
        return;
    }
    
    const paymentModal = document.getElementById('paymentModal');
    if (paymentModal) {
        paymentModal.style.display = 'block';
    }
}

function setDineIn() {
    orderType = "Dine In";
    const display = document.getElementById("orderTypeDisplay");
    if (display) display.textContent = orderType;
    
    const tableInput = document.getElementById('tableNumber');
    if (tableInput) {
        tableInput.disabled = false;
        tableInput.style.backgroundColor = 'white';
        tableInput.style.opacity = '1';
        tableInput.style.pointerEvents = 'auto';
        tableInput.placeholder = 'Enter table number';
    }
    
    updatePayButtonState();
}

function setTakeout() {
    orderType = "Takeout";
    tableNumber = null;
    const display = document.getElementById("orderTypeDisplay");
    if (display) display.textContent = orderType;
    
    const tableInput = document.getElementById('tableNumber');
    if (tableInput) {
        tableInput.disabled = true;
        tableInput.value = '';
        tableInput.style.backgroundColor = '#f0f0f0';
        tableInput.style.opacity = '0.7';
        tableInput.style.pointerEvents = 'none';
        tableInput.placeholder = 'Table number not required';
    }
    
    updatePayButtonState();
}

function setTableNumber() {
    const input = document.getElementById('tableNumber');
    const value = input.value.trim();
    
    console.log('========== TABLE NUMBER VALIDATION ==========');
    console.log('📥 Input value:', value);
    
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) {
        console.warn('❌ Non-numeric input detected');
        showToast('❌ Table number must be numbers only', 'error', 2000);
        input.value = value.replace(/[^\d]/g, '');
        tableNumber = null;
    } else {
        // Check if table is between 1-6 and if it's available
        if (value) {
            const tableNum = parseInt(value);
            console.log('🔢 Parsed table number:', tableNum);
            
            // Validate table number range (1-6)
            if (tableNum < 1 || tableNum > 6) {
                console.warn(`❌ Table ${tableNum} out of range (1-6)`);
                showToast('❌ Tables available: 1-6 only', 'error', 2000);
                input.value = '';
                tableNumber = null;
            } else {
                console.log(`✓ Table ${tableNum} is in valid range (1-6)`);
                
                // Check availability
                const available = isTableAvailable(value);
                console.log(`🔍 Table ${tableNum} availability: ${available ? 'AVAILABLE ✅' : 'OCCUPIED ❌'}`);
                
                if (!available) {
                    console.log(`⚠️ Showing occupied modal for table ${tableNum}`);
                    // Show alert modal for occupied table
                    showTableOccupiedModal(tableNum);
                    input.value = '';
                    tableNumber = null;
                } else {
                    console.log(`✅ Table ${tableNum} accepted`);
                    tableNumber = value || null;
                }
            }
        } else {
            console.log('ℹ️ No table number entered');
            tableNumber = null;
        }
    }
    
    console.log('Final tableNumber:', tableNumber);
    console.log('===========================================');
    
    updatePayButtonState();
}

function selectPaymentMethod(method) {
    selectedPaymentMethod = method;
    const display = document.getElementById("paymentMethodDisplay");
    if (display) {
        display.textContent = method === 'cash' ? 'Cash' : 'GCash';
    }
    
    document.querySelectorAll('.payment-method-btn').forEach(btn => {
        if (method === 'cash' && btn.id === 'cash-btn') {
            btn.style.background = '#007bff';
        } else if (method === 'gcash' && btn.id === 'gcash-btn') {
            btn.style.background = '#007bff';
        } else {
            btn.style.background = '#6c757d';
        }
    });
    
    const paymentInput = document.getElementById('inputPayment');
    
    if (paymentInput) {
        if (method === 'cash') {
            paymentInput.disabled = false;
            paymentInput.style.backgroundColor = 'white';
            paymentInput.style.opacity = '1';
            paymentInput.style.pointerEvents = 'auto';
            paymentInput.placeholder = 'Enter payment amount';
            paymentInput.value = '';
            paymentAmount = 0;
        } else {
            paymentInput.disabled = true;
            paymentInput.style.backgroundColor = '#f0f0f0';
            paymentInput.style.opacity = '0.7';
            paymentInput.style.pointerEvents = 'none';
            paymentInput.placeholder = 'GCash payment (click Pay)';
            paymentInput.value = '';
            paymentAmount = 0;
        }
    }
    
    updatePayButtonState();
    updateChange();
}

function updatePaymentAmount() {
    const paymentInput = document.getElementById('inputPayment');
    if (!paymentInput) return;
    
    if (selectedPaymentMethod === 'cash') {
        paymentAmount = parseFloat(paymentInput.value) || 0;
    }
    updateChange();
    updatePayButtonState();
}

function updateChange() {
    const total = currentOrder.reduce((sum, item) => {
        const itemPrice = parseFloat(item.price) || 0;
        return sum + (itemPrice * item.quantity);
    }, 0);
    const changeEl = document.getElementById('changeAmount');
    
    if (!changeEl) return;
    
    if (selectedPaymentMethod === 'gcash') {
        changeEl.textContent = '0.00';
        changeEl.style.color = '#17a2b8';
    } else if (selectedPaymentMethod === 'cash') {
        const amountPaid = parseFloat(paymentAmount) || 0;
        if (amountPaid >= total) {
            const change = amountPaid - total;
            changeEl.textContent = change.toFixed(2);
            changeEl.style.color = '#28a745';
        } else {
            changeEl.textContent = '0.00';
            changeEl.style.color = '#dc3545';
        }
    } else {
        changeEl.textContent = '0.00';
        changeEl.style.color = '#666';
    }
}

function updatePayButtonState() {
    const payButton = document.getElementById('payment-btn');
    if (!payButton) return;
    
    const total = currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const hasItems = currentOrder.length > 0;
    const hasOrderType = orderType && orderType !== "None";
    const hasPaymentMethod = selectedPaymentMethod;
    
    let canPay = false;
    
    if (selectedPaymentMethod === 'gcash') {
        canPay = true;
    } else if (selectedPaymentMethod === 'cash') {
        canPay = paymentAmount >= total && paymentAmount > 0;
    }
    
    let tableValid = true;
    if (orderType === "Dine In") {
        const tableInput = document.getElementById('tableNumber');
        tableNumber = tableInput ? tableInput.value : null;
        tableValid = tableNumber && tableNumber.trim() !== '';
    }
    
    payButton.disabled = !(hasItems && hasOrderType && hasPaymentMethod && canPay && tableValid);
    
    payButton.style.opacity = payButton.disabled ? '0.5' : '1';
    payButton.style.backgroundColor = payButton.disabled ? '#6c757d' : '#28a745';
    payButton.style.cursor = payButton.disabled ? 'not-allowed' : 'pointer';
    payButton.style.pointerEvents = payButton.disabled ? 'none' : 'auto';
}

function showPaymentConfirmation(paymentDetails) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 30px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            font-family: Arial, sans-serif;
        `;
        
        const title = document.createElement('h2');
        title.textContent = 'Confirm Payment';
        title.style.cssText = `
            margin: 0 0 20px 0;
            color: #333;
            text-align: center;
            font-size: 20px;
        `;
        
        const details = document.createElement('div');
        details.style.cssText = `
            background: #f5f5f5;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            line-height: 1.8;
        `;
        
        let detailsHTML = `
            <div style="font-size: 14px; color: #555;">
                <strong style="color: #333; display: block; margin-bottom: 10px;">Order: ${paymentDetails.orderType}</strong>
        `;
        
        if (paymentDetails.orderType === 'Dine In') {
            detailsHTML += `<div style="margin-bottom: 8px;"><span style="color: #666;">Table #${paymentDetails.tableNumber}</span></div>`;
        }
        
        detailsHTML += `
                <div style="border-top: 1px solid #ddd; padding-top: 10px; margin-top: 10px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span>Total:</span>
                        <strong style="color: #2196f3;">₱${paymentDetails.total.toFixed(2)}</strong>
                    </div>
        `;
        
        if (paymentDetails.method === 'cash') {
            detailsHTML += `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span>Payment:</span>
                        <strong>₱${paymentDetails.amountPaid.toFixed(2)}</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; background: #e8f5e9; padding: 8px; border-radius: 4px; margin-top: 8px;">
                        <span>Change:</span>
                        <strong style="color: #28a745;">₱${paymentDetails.change.toFixed(2)}</strong>
                    </div>
            `;
        }
        
        detailsHTML += `
                </div>
            </div>
        `;
        
        details.innerHTML = detailsHTML;
        
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = `
            display: flex;
            gap: 10px;
            justify-content: space-between;
        `;
        
        const confirmBtn = document.createElement('button');
        confirmBtn.textContent = '✓ Confirm';
        confirmBtn.style.cssText = `
            flex: 1;
            padding: 12px;
            background: #28a745;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: background 0.3s;
        `;
        confirmBtn.onmouseover = () => confirmBtn.style.background = '#218838';
        confirmBtn.onmouseout = () => confirmBtn.style.background = '#28a745';
        confirmBtn.onclick = () => {
            overlay.remove();
            resolve(true);
        };
        
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '✕ Cancel';
        cancelBtn.style.cssText = `
            flex: 1;
            padding: 12px;
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: background 0.3s;
        `;
        cancelBtn.onmouseover = () => cancelBtn.style.background = '#c82333';
        cancelBtn.onmouseout = () => cancelBtn.style.background = '#dc3545';
        cancelBtn.onclick = () => {
            overlay.remove();
            resolve(false);
        };
        
        buttonsContainer.appendChild(confirmBtn);
        buttonsContainer.appendChild(cancelBtn);
        
        modal.appendChild(title);
        modal.appendChild(details);
        modal.appendChild(buttonsContainer);
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        confirmBtn.focus();
    });
}

async function Payment() {
    if (!currentOrder.length) {
        alert("Please add items to order");
        return;
    }
    
    if (!orderType || orderType === "None") {
        alert("Please select order type (Dine In or Takeout)");
        return;
    }
    
    if (orderType === "Dine In") {
        const tableInput = document.getElementById('tableNumber');
        tableNumber = tableInput ? tableInput.value : null;
        if (!tableNumber || tableNumber.trim() === '') {
            alert("Please enter table number for Dine In orders");
            return;
        }
    }
    
    if (!selectedPaymentMethod) {
        alert("Please select payment method (Cash or GCash)");
        return;
    }
    
    const total = currentOrder.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    if (selectedPaymentMethod === 'cash' && paymentAmount < total) {
        alert(`Insufficient payment. Please enter at least ₱${total.toFixed(2)}`);
        return;
    }
    
    const change = selectedPaymentMethod === 'cash' ? paymentAmount - total : 0;
    
    const paymentConfirmed = await showPaymentConfirmation({
        orderType: orderType,
        tableNumber: tableNumber,
        total: total,
        method: selectedPaymentMethod,
        amountPaid: selectedPaymentMethod === 'cash' ? paymentAmount : total,
        change: change
    });
    
    if (!paymentConfirmed) {
        return;
    }
    
    // Show waiting modal during order processing
    const waitingModal = showWaitingModal('Processing your order...');
    
    try {
        const paymentMethod = selectedPaymentMethod === 'gcash' ? 'online' : selectedPaymentMethod;
        
        const orderPayload = {
            items: currentOrder.map(item => ({
                id: item.id,
                itemName: item.itemName,
                name: item.itemName,
                price: item.price,
                quantity: item.quantity,
                size: item.size || 'Regular',
                image: item.image || '/images/default_food.png',
                vatable: item.vatable !== undefined ? item.vatable : true
            })),
            total: total,
            type: orderType,
            tableNumber: orderType === 'Dine In' ? tableNumber : null,
            payment: {
                method: paymentMethod,
                amountPaid: selectedPaymentMethod === 'cash' ? paymentAmount : total
            },
            notes: ''
        };
        
        const saveResponse = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(orderPayload)
        });
        
        if (!saveResponse.ok) {
            let errorMessage = 'Failed to save order';
            try {
                const errorData = await saveResponse.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (e) {
                errorMessage = `Server error: ${saveResponse.status} ${saveResponse.statusText}`;
            }
            throw new Error(errorMessage);
        }
        
        const savedOrder = await saveResponse.json();
        
        // Close waiting modal
        closeWaitingModal();
        
        showToast('✅ Order saved! Preparing receipt...', 'success', 2000);
        
        const receiptNumber = `RCP-${Date.now().toString().slice(-8)}`;
        const gcashRef = selectedPaymentMethod === 'gcash' ? `GCASH-${Date.now().toString().slice(-8)}` : '';
        
        const receiptHTML = generateReceiptHTML(receiptNumber, total, change, gcashRef);
        
        printReceipt(receiptHTML);
        
        // If Dine In, add table to active tables with current user/customer info
        if (orderType === 'Dine In' && tableNumber) {
            console.log('=== PAYMENT: Adding Dine In Table ===');
            console.log('orderType:', orderType);
            console.log('tableNumber:', tableNumber);
            console.log('currentUser:', currentUser);
            
            const customerIdentifier = currentUser?.id || currentUser?.username || 'Customer';
            console.log('customerIdentifier:', customerIdentifier);
            
            addActiveTable(tableNumber, customerIdentifier, 1, 'Preparing');
            showToast(`✅ Table #${tableNumber} added to active customers!`, 'success', 2000);
        } else {
            console.log('=== PAYMENT: Not a Dine In order ===');
            console.log('orderType:', orderType);
            console.log('tableNumber:', tableNumber);
        }
        
        setTimeout(() => {
            clearOrderAfterPayment();
            if (orderType === 'Takeout') {
                showToast('✅ Order completed! Ready for new order.', 'success', 3000);
            }
        }, 500);
               
    } catch (error) {
        // Close waiting modal on error
        closeWaitingModal();
        
        let userMessage = error.message;
        if (error.message.includes('NetworkError') || error instanceof TypeError) {
            userMessage = 'Network error: Server is not responding. Please check if server is running.';
        } else if (error.message.includes('Failed to fetch')) {
            userMessage = 'Connection error: Cannot reach server. Please check your internet connection.';
        } else if (error.message.includes('Insufficient payment')) {
            userMessage = 'Insufficient payment amount. Please enter correct amount.';
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            userMessage = 'Session expired. Please login again.';
        } else if (error.message.includes('No items in order')) {
            userMessage = 'Order has no items. Please add items to the order.';
        }
        
        showToast(`❌ ${userMessage}`, 'error', 4000);
    }
}

function clearOrderAfterPayment() {
    currentOrder = [];
    paymentAmount = 0;
    
    const paymentInput = document.getElementById('inputPayment');
    if (paymentInput) {
        paymentInput.value = '';
        paymentInput.disabled = true;
        paymentInput.style.backgroundColor = '#f0f0f0';
        paymentInput.style.opacity = '0.7';
        paymentInput.style.pointerEvents = 'none';
        paymentInput.placeholder = 'Select Cash first';
    }
    
    const tableInput = document.getElementById('tableNumber');
    if (tableInput) {
        tableInput.value = '';
        tableInput.disabled = true;
        tableInput.style.backgroundColor = '#f0f0f0';
        tableInput.style.opacity = '0.7';
        tableInput.style.pointerEvents = 'none';
        tableInput.placeholder = 'Select Dine In first';
    }
    
    selectedPaymentMethod = null;
    document.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.style.background = '#6c757d';
    });
    
    const paymentMethodDisplay = document.getElementById("paymentMethodDisplay");
    if (paymentMethodDisplay) paymentMethodDisplay.textContent = "None";
    
    const orderTypeDisplay = document.getElementById("orderTypeDisplay");
    if (orderTypeDisplay) orderTypeDisplay.textContent = "None";
    
    const changeEl = document.getElementById('changeAmount');
    if (changeEl) {
        changeEl.textContent = '0.00';
        changeEl.style.color = '#666';
    }
    
    orderType = null;
    tableNumber = null;
    
    renderOrder();
    updatePayButtonState();
}

// ========== TABLE OCCUPIED ALERT MODAL ==========

/**
 * Shows a stylish alert modal when a table is already occupied
 * @param {number} tableNum - The table number that is occupied
 */
function showTableOccupiedModal(tableNum) {
    try {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'tableOccupiedOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease-in-out;
        `;
        
        // Create modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 30px;
            max-width: 350px;
            width: 90%;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            text-align: center;
            animation: slideUp 0.4s ease-in-out;
        `;
        
        // Icon
        const icon = document.createElement('div');
        icon.style.cssText = `
            font-size: 60px;
            margin-bottom: 15px;
            animation: bounce 0.6s ease-in-out infinite;
        `;
        icon.textContent = '🪑';
        modal.appendChild(icon);
        
        // Title
        const title = document.createElement('h2');
        title.style.cssText = `
            color: #dc3545;
            margin: 0 0 15px 0;
            font-size: 22px;
            font-weight: bold;
        `;
        title.textContent = `Table #${tableNum} is Occupied`;
        modal.appendChild(title);
        
        // Message
        const message = document.createElement('p');
        message.style.cssText = `
            color: #666;
            margin: 0 0 25px 0;
            font-size: 14px;
            line-height: 1.6;
        `;
        message.textContent = `This table is currently in use. Please select another table.`;
        modal.appendChild(message);
        
        // Button
        const button = document.createElement('button');
        button.style.cssText = `
            width: 100%;
            padding: 12px;
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 15px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        button.textContent = 'OK';
        button.onmouseover = () => button.style.background = '#c82333';
        button.onmouseout = () => button.style.background = '#dc3545';
        button.onclick = () => {
            overlay.style.animation = 'slideDown 0.3s ease-in-out';
            setTimeout(() => overlay.remove(), 300);
        };
        modal.appendChild(button);
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Close on overlay click
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.style.animation = 'slideDown 0.3s ease-in-out';
                setTimeout(() => overlay.remove(), 300);
            }
        };
        
    } catch (error) {
        console.error('❌ Error showing table occupied modal:', error);
        // Fallback to toast if modal fails
        showToast(`❌ Table #${tableNum} is occupied`, 'error', 2000);
    }
}

// ========== ACTIVE DINE IN CUSTOMERS MANAGEMENT ==========

// Function to add a table to active dine-in customers (using correct localStorage key)
function addActiveTable(tableNumber, customerName = 'Guest', guests = 1, orderStatus = 'Pending') {
    try {
        console.log('🍽️ addActiveTable called with:', { tableNumber, customerName, guests, orderStatus });
        
        // Get existing data from correct localStorage key
        let customers = [];
        const data = localStorage.getItem('activeDineInCustomers');
        
        if (data) {
            try {
                customers = JSON.parse(data);
            } catch (e) {
                console.warn('Could not parse existing data, starting fresh');
                customers = [];
            }
        }
        
        // Check if table already exists
        const existingCustomer = customers.find(c => c.tableNumber === parseInt(tableNumber));
        if (!existingCustomer) {
            // Generate random Customer ID with format CUST-XXXXXX
            const customerId = `CUST-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
            
            const activeCustomer = {
                tableNumber: parseInt(tableNumber),
                customerId: customerId,
                customerName: customerName || 'Customer',
                guests: guests || 1,
                orderStatus: orderStatus || 'Preparing',
                timeIn: new Date().toISOString(),
                hasLeft: false,
                leftTime: null
            };
            
            customers.push(activeCustomer);
            localStorage.setItem('activeDineInCustomers', JSON.stringify(customers));
            
            console.log(`✅ Table #${tableNumber} added to active customers with ID: ${customerId}`);
            console.log('📊 Total active customers:', customers.length);
            
            // Trigger modal refresh if it's open
            if (typeof loadActiveDineInCustomersModal === 'function') {
                // Delay to allow localStorage to sync
                setTimeout(() => {
                    loadActiveDineInCustomersModal();
                }, 100);
            }
        } else {
            console.log(`⚠️ Table #${tableNumber} already exists`);
        }
    } catch (error) {
        console.error('❌ Error adding active table:', error);
    }
}

// Function to update table/customer status
function updateTableStatus(tableNumber, orderStatus) {
    try {
        let customers = JSON.parse(localStorage.getItem('activeDineInCustomers')) || [];
        const customer = customers.find(c => c.tableNumber === parseInt(tableNumber));
        
        if (customer) {
            customer.orderStatus = orderStatus;
            localStorage.setItem('activeDineInCustomers', JSON.stringify(customers));
            console.log(`✅ Table #${tableNumber} status updated to ${orderStatus}`);
            
            // Refresh modal if open
            if (typeof loadActiveDineInCustomersModal === 'function') {
                setTimeout(() => loadActiveDineInCustomersModal(), 100);
            }
        }
    } catch (error) {
        console.error('❌ Error updating table status:', error);
    }
}

// Function to mark customer as left
function markCustomerAsLeft(tableNumber) {
    console.log(`🚪 Marking Table #${tableNumber} as LEFT...`);
    
    if (!confirm(`Mark customer at Table #${tableNumber} as LEFT?`)) {
        console.log(`❌ Cancelled marking Table #${tableNumber} as left`);
        return;
    }
    
    try {
        let customers = JSON.parse(localStorage.getItem('activeDineInCustomers')) || [];
        
        console.log('📋 Before marking left:', customers.length, 'customers');
        
        const customer = customers.find(c => c.tableNumber === parseInt(tableNumber));
        
        if (customer) {
            console.log(`✅ Found customer at Table #${tableNumber}:`, customer);
            customer.hasLeft = true;
            customer.leftTime = new Date().toISOString();
            localStorage.setItem('activeDineInCustomers', JSON.stringify(customers));
            
            console.log('💾 Saved to localStorage');
            console.log('📋 After marking left:', customers.filter(c => !c.hasLeft).length, 'active customers');
            
            // Refresh modal if open
            if (typeof loadActiveDineInCustomersModal === 'function') {
                console.log('🔄 Reloading modal...');
                setTimeout(() => loadActiveDineInCustomersModal(), 100);
            }
            
            console.log(`✅ Table #${tableNumber} marked as LEFT successfully`);
            if (typeof showToast === 'function') {
                showToast(`✔️ Table #${tableNumber} is now available`, 'success', 2000);
            }
        } else {
            console.warn(`⚠️ Customer not found at Table #${tableNumber}`);
            if (typeof showToast === 'function') {
                showToast(`❌ Customer not found at Table #${tableNumber}`, 'error', 2000);
            }
        }
    } catch (error) {
        console.error('❌ Error marking customer as left:', error);
        if (typeof showToast === 'function') {
            showToast(`❌ Error marking table as left`, 'error', 2000);
        }
    }
}

// Function to remove table from active customers
function removeActiveTable(tableNumber) {
    try {
        let customers = JSON.parse(localStorage.getItem('activeDineInCustomers')) || [];
        const filteredCustomers = customers.filter(c => c.tableNumber !== parseInt(tableNumber));
        localStorage.setItem('activeDineInCustomers', JSON.stringify(filteredCustomers));
        console.log(`✅ Table #${tableNumber} removed from active customers`);
        
        // Refresh modal if open
        if (typeof loadActiveDineInCustomersModal === 'function') {
            setTimeout(() => loadActiveDineInCustomersModal(), 100);
        }
    } catch (error) {
        console.error('❌ Error removing active table:', error);
    }
}

// Load and render active dine in customers
async function loadActiveDineInCustomers() {
    // Use local table occupancy data instead of API
    renderActiveDineInCustomers();
}

// Toggle visibility of dine-in customers section
function toggleDineInCustomers() {
    const container = document.getElementById('activeDineInCustomers');
    const toggleBtn = document.querySelector('.dine-in-header-btn');
    const toggleIcon = toggleBtn.querySelector('.toggle-icon');
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'dineInModal';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 99999;
        animation: fadeIn 0.3s ease-in-out;
    `;
    
    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        max-width: 500px;
        max-height: 70vh;
        overflow-y: auto;
        animation: scaleIn 0.4s ease-in-out;
    `;
    
    // Get active tables count
    let activeTables = 0;
    let tableContent = '';
    for (let i = 1; i <= 5; i++) {
        const tableData = tableOccupancyStatus.get(String(i));
        const status = tableData ? tableData.status : 'available';
        if (status !== 'available') {
            activeTables++;
            let statusIcon = '';
            let statusColor = '';
            if (status === 'paid') {
                statusIcon = '💳';
                statusColor = '#FF9800';
            } else if (status === 'waiting') {
                statusIcon = '⏳';
                statusColor = '#FFC107';
            } else if (status === 'left') {
                statusIcon = '👋';
                statusColor = '#9C27B0';
            }
            tableContent += `
                <div style="padding: 12px; background: #f5f5f5; margin-bottom: 10px; border-left: 4px solid ${statusColor}; border-radius: 4px;">
                    <strong>${statusIcon} Table #${i}</strong>
                    <div style="font-size: 12px; color: #666; margin-top: 5px;">Status: ${status.toUpperCase()}</div>
                </div>
            `;
        }
    }
    
    if (activeTables === 0) {
        tableContent = '<p style="text-align: center; color: #999; padding: 20px;">✅ No active tables</p>';
    }
    
    modal.innerHTML = `
        <h2 style="color: #2c3e50; margin-bottom: 20px; text-align: center;">🍽️ Active Dine In Customers</h2>
        <div style="margin-bottom: 20px; padding: 10px; background: #e3f2fd; border-radius: 6px; text-align: center;">
            <strong style="color: #1976d2;">Active Tables: ${activeTables}</strong>
        </div>
        <div>
            ${tableContent}
        </div>
        <button id="closeDineInModal" style="
            width: 100%;
            background: #2196F3;
            color: white;
            border: none;
            padding: 12px;
            border-radius: 6px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            margin-top: 20px;
            transition: all 0.3s ease;
        " onmouseover="this.style.background='#1976D2'" onmouseout="this.style.background='#2196F3'">
            Close
        </button>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Close modal on button click
    document.getElementById('closeDineInModal').onclick = function() {
        overlay.remove();
    };
    
    // Close modal on overlay click
    overlay.onclick = function(e) {
        if (e.target === overlay) {
            overlay.remove();
        }
    };
}

// Render the active dine-in customers list in sidebar
function renderActiveDineInList(orders) {
    const container = document.getElementById('activeDineInCustomers');
    if (!container) return;
    
    // Group orders by table number
    const tableMap = new Map();
    orders.forEach(order => {
        if (order.tableNumber) {
            tableMap.set(order.tableNumber, order);
        }
    });
    
    // Sort table numbers
    const sortedTables = Array.from(tableMap.keys()).sort((a, b) => a - b);
    
    if (sortedTables.length === 0) {
        container.innerHTML = `<p style="color: #999; font-size: 12px; text-align: center; padding: 10px;">No active dine-in customers</p>`;
        return;
    }
    
    let html = '';
    sortedTables.forEach(tableNum => {
        const order = tableMap.get(tableNum);
        html += `
            <div class="dine-in-customer-item" onclick="openDineInTableModal('${tableNum}', '${order._id}')">
                <div class="dine-in-customer-header">
                    <strong>🪑 Table #${tableNum}</strong>
                    <span class="dine-in-customer-status" style="background: #4CAF50; color: white; border-radius: 4px;">Occupied</span>
                </div>
                <div style="font-size: 11px; color: #666;">
                    Items: ${order.items.length} | Total: ₱${order.total.toFixed(2)}
                </div>
                <div style="font-size: 10px; color: #999; margin-top: 5px;">
                    ID: ${order._id.substring(0, 8)}...
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Open modal for table management
function openDineInTableModal(tableNum, orderId) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'tableManagementModal';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 100000;
        animation: fadeIn 0.3s ease-in-out;
    `;
    
    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        padding: 40px;
        border-radius: 12px;
        text-align: center;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        max-width: 450px;
        animation: scaleIn 0.4s ease-in-out;
    `;
    
    modal.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 20px;">🪑</div>
        <h2 style="color: #2c3e50; margin-bottom: 10px; font-size: 28px;">Table #${tableNum}</h2>
        <p style="color: #666; margin-bottom: 30px; font-size: 14px;">
            Order ID: ${orderId.substring(0, 12)}...<br>
            Status: <strong style="color: #4CAF50;">Occupied</strong>
        </p>
        
        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 25px;">
            <button id="tableLeftBtn" style="
                background: #dc3545;
                color: white;
                border: none;
                padding: 14px 20px;
                border-radius: 6px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
            " onmouseover="this.style.background='#c82333'" onmouseout="this.style.background='#dc3545'">
                🚪 Customer Left
            </button>
            
            <button id="cancelTableBtn" style="
                background: #6c757d;
                color: white;
                border: none;
                padding: 14px 20px;
                border-radius: 6px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                transition: all 0.3s ease;
            " onmouseover="this.style.background='#5a6268'" onmouseout="this.style.background='#6c757d'">
                ✕ Close
            </button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Add event listeners
    document.getElementById('tableLeftBtn').addEventListener('click', async () => {
        overlay.remove();
        await markTableAsAvailable(tableNum, orderId);
    });
    
    document.getElementById('cancelTableBtn').addEventListener('click', () => {
        overlay.remove();
    });
}

// Mark table as available after customer leaves
async function markTableAsAvailable(tableNum, orderId) {
    try {
        // Show waiting modal
        showWaitingModal('Updating table status...');
        
        // Update table status
        const response = await fetch(`/api/orders/${orderId}/table-available`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to update table status');
        }
        
        // Close waiting modal
        closeWaitingModal();
        
        // Mark table as available in local system
        setTableAvailable(tableNum);
        
        // Show success message
        showToast(`✅ Table #${tableNum} is now available!`, 'success', 2000);
        
        // Refresh the list
        loadActiveDineInCustomers();
        
    } catch (error) {
        closeWaitingModal();
        showToast(`❌ Error: ${error.message}`, 'error', 3000);
        console.error('Error marking table as available:', error);
    }
}

// Auto-refresh dine-in customers list every 5 seconds
function startDineInCustomersRefresh() {
    setInterval(() => {
        loadActiveDineInCustomers();
    }, 5000);
}

function generateReceiptHTML(receiptNumber, total, change, gcashRef = '') {
    const timestamp = new Date();
    const dateStr = timestamp.toLocaleDateString('en-US', { 
        month: '2-digit',
        day: '2-digit',
        year: 'numeric'
    });
    const timeStr = timestamp.toLocaleTimeString('en-US', { 
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    
    let itemsHTML = '';
    let subtotal = 0;
    
    currentOrder.forEach(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        const itemName = item.itemName || item.name;
        
        itemsHTML += `
            <div class="receipt-item">
                <span class="item-name">${itemName}</span>
                <span class="item-price">PHP ${itemTotal.toFixed(2)}</span>
            </div>
        `;
    });
    
    const totalDue = subtotal;
    const vatAmount = totalDue * (0.12 / 1.12);
    const vatableSales = totalDue - vatAmount;
    
    const amountPaid = selectedPaymentMethod === 'cash' ? paymentAmount : totalDue;
    
    const changeDisplay = selectedPaymentMethod === 'cash' ? `
        <div class="payment-row">
            <span>CASH</span>
            <span>PHP ${amountPaid.toFixed(2)}</span>
        </div>
        <div class="payment-row">
            <span>CHANGE</span>
            <span>PHP ${change.toFixed(2)}</span>
        </div>
    ` : selectedPaymentMethod === 'gcash' ? `
        <div class="payment-row">
            <span>GCASH</span>
            <span>PHP ${totalDue.toFixed(2)}</span>
        </div>
        <div class="payment-row">
            <span>REF NO.</span>
            <span>${gcashRef || 'N/A'}</span>
        </div>
    ` : '';
    
    const tableInfo = orderType === 'Dine In' ? `
        <div class="info-row">Order Type: Dine In (Table: ${tableNumber})</div>
    ` : `
        <div class="info-row">Order Type: Takeout</div>
    `;
    
    const transNumber = `TRX-${Math.floor(Math.random() * 100000000)}`;
    const receiptDateTime = `${timestamp.getFullYear()}${(timestamp.getMonth()+1).toString().padStart(2,'0')}${timestamp.getDate().toString().padStart(2,'0')}-${timeStr.replace(':','')}-00000`;
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Receipt ${receiptNumber}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: 'Courier New', monospace;
                    background: white;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    padding: 20px;
                }
                
                .receipt-container {
                    width: 80mm;
                    max-width: 80mm;
                    background: white;
                    padding: 10px;
                    margin: 0 auto;
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    font-size: 12px;
                    line-height: 1.4;
                }
                
                .header {
                    text-align: center;
                    margin-bottom: 10px;
                }
                
                .restaurant-name {
                    font-size: 16px;
                    font-weight: bold;
                    margin-bottom: 2px;
                }
                
                .header div {
                    margin: 1px 0;
                }
                
                .divider {
                    border-top: 1px dashed #000;
                    margin: 8px 0;
                }
                
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    margin: 2px 0;
                }
                
                .items-header {
                    text-align: left;
                    margin: 5px 0 2px 0;
                }
                
                .receipt-item {
                    display: flex;
                    justify-content: space-between;
                    margin: 4px 0;
                    text-align: justify;
                }
                
                .item-name {
                    text-align: left;
                    flex: 2;
                    white-space: pre-wrap;
                }
                
                .item-price {
                    text-align: right;
                    flex: 1;
                }
                
                .summary-row {
                    display: flex;
                    justify-content: space-between;
                    margin: 2px 0;
                }
                
                .summary-row.total {
                    font-weight: bold;
                    margin-top: 5px;
                }
                
                .payment-row {
                    display: flex;
                    justify-content: space-between;
                    margin: 2px 0;
                }
                
                .vat-header {
                    text-align: left;
                    margin: 5px 0 2px 0;
                }
                
                .vat-row {
                    display: flex;
                    justify-content: space-between;
                    margin: 2px 0;
                }
                
                .footer {
                    text-align: center;
                    margin-top: 10px;
                }
                
                .thank-you {
                    font-weight: bold;
                    margin: 5px 0;
                }
                
                .footer-small {
                    font-size: 10px;
                }
                
                .section-title {
                    text-align: left;
                    margin: 5px 0 2px 0;
                }
                
                @media print {
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                    
                    body {
                        padding: 0;
                        background: white;
                    }
                    
                    .receipt-container {
                        box-shadow: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="receipt-container">
                <div class="header">
                    <div class="restaurant-name">GRAY COUNTRYSIDE CAFE</div>
                    <div>JD Building, Crossing, Norzagaray,</div>
                    <div>Bulacan, Philippines, 3013</div>
                    <div>TIN: 000-000-000-000</div>
                    <div>POS: POS001 | MIN#: 1769767525781</div>
                </div>
                
                <div class="divider"></div>
                
                <div class="info-row">
                    <span>RECEIPT</span>
                </div>
                <div class="info-row">
                    <span>Trans#: ${transNumber}</span>
                </div>
                <div class="info-row">
                    <span>Cashier: CASHIER001</span>
                </div>
                <div class="info-row">
                    <span>Date: ${dateStr} ${timeStr} #02</span>
                </div>
                
                <div class="divider"></div>
                
                ${tableInfo}
                
                <div class="divider"></div>
                
                <div class="items-header">Items:</div>
                
                <div>
                    ${itemsHTML}
                </div>
                
                <div class="divider"></div>
                
                <div class="summary-row">
                    <span>SUB-TOTAL</span>
                    <span>PHP ${totalDue.toFixed(2)}</span>
                </div>
                <div class="summary-row total">
                    <span>TOTAL DUE</span>
                    <span>PHP ${totalDue.toFixed(2)}</span>
                </div>
                
                <div class="divider"></div>
                
                <div class="section-title">Payment:</div>
                ${changeDisplay}
                
                <div class="divider"></div>
                
                <div class="vat-header">VAT Breakdown:</div>
                <div class="vat-row">
                    <span>VATable Sales</span>
                    <span>${vatableSales.toFixed(2)}</span>
                </div>
                <div class="vat-row">
                    <span>VAT Amount (12%)</span>
                    <span>${vatAmount.toFixed(2)}</span>
                </div>
                <div class="vat-row">
                    <span>Zero-Rated Sales</span>
                    <span>0.00</span>
                </div>
                <div class="vat-row">
                    <span>VAT Exempt Sales</span>
                    <span>0.00</span>
                </div>
                
                <div class="divider"></div>
                
                <div class="footer">
                    <div class="thank-you">THANK YOU. PLEASE COME AGAIN.</div>
                    <div class="footer-small">${receiptDateTime}</div>
                </div>
            </div>
        </body>
        </html>
    `;
}

function printReceipt(receiptHTML) {
    try {
        const printWindow = window.open('', 'receipt_' + Date.now(), 'width=800,height=600,menubar=no,toolbar=no,location=no,status=no');
        
        if (!printWindow || printWindow.closed) {
            showToast('Print window blocked. Please allow popups in browser settings.', 'error', 3000);
            return;
        }
        
        printWindow.document.open();
        printWindow.document.write(receiptHTML);
        printWindow.document.close();
        
        const triggerPrint = () => {
            try {
                printWindow.focus();
                printWindow.print();
            } catch (err) {
            }
        };
        
        let printAttempts = 0;
        const maxAttempts = 5;
        
        const printInterval = setInterval(() => {
            printAttempts++;
            
            if (printWindow && !printWindow.closed && printWindow.document.readyState === 'complete') {
                clearInterval(printInterval);
                setTimeout(triggerPrint, 300);
            } else if (printAttempts >= maxAttempts) {
                clearInterval(printInterval);
                setTimeout(triggerPrint, 300);
            }
        }, 200);
        
        setTimeout(() => {
            if (printWindow && !printWindow.closed) {
                clearInterval(printInterval);
                triggerPrint();
            }
        }, 1500);
        
    } catch (error) {
        showToast(`Print error: ${error.message}`, 'error', 3000);
    }
}

function hasPendingRequest(productName) {
    return activeStockRequests.has(productName);
}

function requestStock(productNameOrId) {
    console.log(`📦 requestStock called with: ${productNameOrId}`);
    
    // Check if it's a product name (string) or ID
    let productName = null;
    let unit = 'unit';
    
    // First, try to find by name if it's a string
    if (typeof productNameOrId === 'string' && productNameOrId.length > 3) {
        // It's likely a product name
        let product = productCatalog.find(p => 
            p.name === productNameOrId || 
            (p.name && p.name.toLowerCase() === productNameOrId.toLowerCase())
        );
        
        if (product) {
            productName = product.name;
            unit = product.unit || 'unit';
            console.log(`📦 Found product by name from catalog: ${productName}`);
        } else {
            // Try to find in stocksData
            const stockItem = stocksData.find(item => 
                item.name === productNameOrId || 
                (item.name && item.name.toLowerCase() === productNameOrId.toLowerCase())
            );
            if (stockItem) {
                productName = stockItem.name;
                console.log(`📦 Found product from fallback list: ${productName}`);
            }
        }
    } else {
        // It's likely an ID - try to find by ID
        let product = productCatalog.find(p => p._id === productNameOrId || p.id === productNameOrId);
        
        if (product) {
            productName = product.name;
            unit = product.unit || 'unit';
            console.log(`📦 Found product by ID from catalog: ${productName}`);
        } else {
            // Fallback to hardcoded list
            const stockItem = stocksData.find(item => item.id === productNameOrId);
            if (stockItem) {
                productName = stockItem.name;
                console.log(`📦 Found product by ID from fallback list: ${productName}`);
            }
        }
    }
    
    if (!productName) {
        console.error(`❌ Product not found: ${productNameOrId}`);
        showToast('❌ Product not found', 'error', 3000);
        return;
    }
    
    if (hasPendingRequest(productName)) {
        showPendingRequestAlert(productName);
        return;
    }
    
    showStockRequestModal(productName, unit);
}

function showPendingRequestAlert(productName) {
    const existingAlert = document.getElementById('pendingRequestAlert');
    if (existingAlert) existingAlert.remove();
    
    const overlay = document.createElement('div');
    overlay.id = 'pendingRequestAlert';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        text-align: center;
    `;
    
    const icon = document.createElement('div');
    icon.textContent = '⏳';
    icon.style.cssText = `
        font-size: 48px;
        margin-bottom: 15px;
    `;
    
    const title = document.createElement('h2');
    title.textContent = 'Request Already Pending';
    title.style.cssText = `
        margin: 0 0 10px 0;
        color: #ff9800;
        font-size: 20px;
    `;
    
    const message = document.createElement('p');
    message.textContent = `A stock request for "${productName}" is already pending. Please wait for the admin to process it.`;
    message.style.cssText = `
        margin: 0 0 25px 0;
        color: #666;
        font-size: 14px;
        line-height: 1.6;
    `;
    
    const okBtn = document.createElement('button');
    okBtn.textContent = '✓ OK';
    okBtn.style.cssText = `
        padding: 12px 30px;
        background: #ff9800;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        transition: background 0.3s;
        width: 100%;
    `;
    okBtn.onmouseover = () => okBtn.style.background = '#f57c00';
    okBtn.onmouseout = () => okBtn.style.background = '#ff9800';
    okBtn.onclick = () => overlay.remove();
    
    modal.appendChild(icon);
    modal.appendChild(title);
    modal.appendChild(message);
    modal.appendChild(okBtn);
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    okBtn.focus();
    
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

function showStockRequestModal(productName) {
    // Directly submit stock request with default quantity of 100
    submitStockRequest(productName, 100);
}

function showInvalidQuantityAlert(callback = null) {
    const existingAlert = document.getElementById('invalidQuantityAlert');
    if (existingAlert) existingAlert.remove();
    
    const overlay = document.createElement('div');
    overlay.id = 'invalidQuantityAlert';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        text-align: center;
    `;
    
    const icon = document.createElement('div');
    icon.textContent = '❌';
    icon.style.cssText = `
        font-size: 48px;
        margin-bottom: 15px;
    `;
    
    const title = document.createElement('h2');
    title.textContent = 'Invalid Quantity';
    title.style.cssText = `
        margin: 0 0 10px 0;
        color: #f44336;
        font-size: 20px;
    `;
    
    const message = document.createElement('p');
    message.textContent = 'Please fill up the quantity (25 or 100 only)';
    message.style.cssText = `
        margin: 0 0 25px 0;
        color: #666;
        font-size: 14px;
        line-height: 1.6;
    `;
    
    const okBtn = document.createElement('button');
    okBtn.textContent = '✓ OK';
    okBtn.style.cssText = `
        padding: 12px 30px;
        background: #f44336;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        transition: background 0.3s;
        width: 100%;
    `;
    okBtn.onmouseover = () => okBtn.style.background = '#d32f2f';
    okBtn.onmouseout = () => okBtn.style.background = '#f44336';
    okBtn.onclick = () => {
        overlay.remove();
        if (callback) callback();
    };
    
    modal.appendChild(icon);
    modal.appendChild(title);
    modal.appendChild(message);
    modal.appendChild(okBtn);
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    okBtn.focus();
    
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

function closeStockRequestModal() {
    const modal = document.getElementById('stockRequestModal');
    if (modal) modal.remove();
}

function submitStockRequest(productName, quantityNum) {
    if (hasPendingRequest(productName)) {
        closeStockRequestModal();
        showPendingRequestAlert(productName);
        return;
    }
    
    closeStockRequestModal();
    
    fetch('/api/stock-requests', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            productName: productName,
            requestedQuantity: quantityNum,
            requestedBy: 'Staff',
            status: 'pending'
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            activeStockRequests.set(productName, {
                timestamp: Date.now(),
                quantity: quantityNum,
                status: 'pending'
            });
            
            if (data.updated) {
                showToast(`🔄 Updated request: ${quantityNum} units`, 'success', 3000);
            } else {
                showToast(`✅ Stock request sent to admin!`, 'success', 3000);
            }
            
            const count = (parseInt(localStorage.getItem('stockRequestCount')) || 0) + 1;
            localStorage.setItem('stockRequestCount', count);
            updateStockRequestNotification();
            
            renderMenu();
        } else {
            throw new Error(data.message || 'Failed to save request');
        }
    })
    .catch(err => {
        showToast(`❌ Request failed: ${err.message}`, 'error', 3000);
    });
    
    if (!pendingStockRequests.includes(productName)) {
        pendingStockRequests.push(productName);
    }
}

function checkFulfilledStockRequests(productName) {
    const product = productCatalog.find(p => p.name === productName);
    if (product && product.stock > 0 && activeStockRequests.has(productName)) {
        activeStockRequests.delete(productName);
        pendingStockRequests = pendingStockRequests.filter(name => name !== productName);
        renderMenu();
        showToast(`✅ Stock received for ${productName}!`, 'success', 3000);
    }
}

function updateStockRequestNotification() {
    try {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            const currentCount = parseInt(badge.textContent) || 0;
            const newCount = currentCount + 1;
            badge.textContent = newCount > 99 ? '99+' : newCount;
            badge.style.display = 'inline-flex';
            badge.style.animation = 'pulse 0.5s ease-in-out';
        }
        
        const stockRequestCount = (parseInt(localStorage.getItem('stockRequestCount')) || 0) + 1;
        localStorage.setItem('stockRequestCount', stockRequestCount);
        localStorage.setItem('lastStockRequest', new Date().toISOString());
        
    } catch (error) {
    }
}

function filterCategory(category) {
    currentCategory = category;
    
    const buttons = document.querySelectorAll('.category-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === category) {
            btn.classList.add('active');
        }
    });
    
    renderMenu();
}

function searchFood(searchTerm) {
    const container = document.getElementById('menuContainer');
    if (!container) return;
    
    if (!searchTerm.trim()) {
        renderMenu();
        return;
    }
    
    const term = searchTerm.toLowerCase().trim();
    const filtered = productCatalog.filter(product => {
        if (currentCategory !== 'all' && product.category !== currentCategory) return false;
        return product.name.toLowerCase().includes(term);
    });
    
    container.innerHTML = '';
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 40px 20px;
                text-align: center;
                min-height: 300px;
                color: #666;
            ">
                <div style="font-size: 48px; margin-bottom: 20px;">🔍</div>
                <h3 style="margin: 10px 0;">No Results Found</h3>
                <p style="margin: 10px 0;">No products match your search for "<strong>${term}</strong>"</p>
            </div>
        `;
        return;
    }
    
    filtered.forEach(product => {
        container.appendChild(createProductCard(product));
    });
}

function saveInventoryToStorage() {
    localStorage.setItem('servingwareInventory', JSON.stringify(servingwareInventory));
    localStorage.setItem('ingredientInventory', JSON.stringify(ingredientInventory));
}

function loadInventoryFromStorage() {
    const saved = localStorage.getItem('servingwareInventory');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            Object.keys(parsed).forEach(key => {
                if (servingwareInventory[key]) {
                    servingwareInventory[key].current = parsed[key].current;
                }
            });
        } catch (e) {}
    }
}

function loadActiveStockRequests() {
    const saved = localStorage.getItem('activeStockRequests');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            activeStockRequests = new Map(parsed);
        } catch (e) {}
    }
}

async function syncPendingRequests() {
    try {
        const response = await fetch('/api/stock-requests/pending');
        
        if (response.ok) {
            const result = await response.json();
            const pendingRequests = result.data || result || [];
            
            const serverPendingNames = new Set(
                pendingRequests.map(req => req.productName || req.product_name || '')
            );
            
            for (const [productName] of activeStockRequests) {
                if (!serverPendingNames.has(productName)) {
                    activeStockRequests.delete(productName);
                }
            }
            
            saveActiveStockRequests();
            
        } else {
        }
    } catch (error) {
    }
}

setInterval(syncPendingRequests, 10000);

function saveActiveStockRequests() {
    try {
        const toSave = Array.from(activeStockRequests.entries());
        localStorage.setItem('activeStockRequests', JSON.stringify(toSave));
    } catch (e) {}
}

document.addEventListener('DOMContentLoaded', async function() {
    loadInventoryFromStorage();
    loadActiveStockRequests();
    initializeTableOccupancy(); // Initialize table management system
    await getCurrentUser();
    
    // Debug function to check localStorage
    window.debugActiveDineIn = function() {
        const data = localStorage.getItem('activeDineInCustomers');
        console.log('=== DEBUG: Active Dine-In Data ===');
        console.log('Raw localStorage:', data);
        if (data) {
            const parsed = JSON.parse(data);
            console.log('Parsed:', parsed);
            console.log('Count:', parsed.length);
            parsed.forEach((customer, i) => {
                console.log(`Customer ${i+1}:`, customer);
            });
        } else {
            console.log('No data found');
        }
    };
    
    // Test function to create sample data
    window.testActiveDineIn = function() {
        const testCustomer = {
            tableNumber: 1,
            customerId: 'CUST-TEST001',
            orderStatus: 'Preparing',
            notes: null,
            timeIn: new Date().toISOString(),
            hasLeft: false,
            leftTime: null
        };
        localStorage.setItem('activeDineInCustomers', JSON.stringify([testCustomer]));
        console.log('✅ Test data added:', testCustomer);
        console.log('Now open the modal and it should show Table #1');
    };
    
    const menuLoaded = await loadAllMenuItems();
    
    if (!menuLoaded) {
        alert('Cannot connect to database. Please check your connection.');
    }
    
    const searchInput = document.querySelector('input[placeholder*="Search"]');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => searchFood(e.target.value));
    }
    
    const categoryButtons = document.querySelectorAll('.category-btn');
    categoryButtons.forEach(btn => {
        if (btn.id !== 'stockManagementBtn') {
            btn.addEventListener('click', () => {
                filterCategory(btn.dataset.category);
            });
        }
    });
    
    const dineInBtn = document.querySelector('.dineinandtakeout-btn:nth-child(1)');
    const takeoutBtn = document.querySelector('.dineinandtakeout-btn:nth-child(2)');
    
    if (dineInBtn) dineInBtn.addEventListener('click', setDineIn);
    if (takeoutBtn) takeoutBtn.addEventListener('click', setTakeout);
    
    const tableInput = document.getElementById('tableNumber');
    if (tableInput) {
        // Allow only numbers in input
        tableInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^\d]/g, '');
            setTableNumber();
        });
        // Prevent non-numeric characters on keypress
        tableInput.addEventListener('keypress', (e) => {
            if (!/[0-9]/.test(e.key)) {
                e.preventDefault();
            }
        });
        tableInput.type = 'number';
        tableInput.disabled = true;
        tableInput.style.backgroundColor = '#f0f0f0';
        tableInput.style.opacity = '0.7';
        tableInput.style.pointerEvents = 'none';
        tableInput.placeholder = 'Select Dine In first';
    }
    
    const cashBtn = document.getElementById('cash-btn');
    const gcashBtn = document.getElementById('gcash-btn');
    
    if (cashBtn) cashBtn.addEventListener('click', () => selectPaymentMethod('cash'));
    if (gcashBtn) gcashBtn.addEventListener('click', () => selectPaymentMethod('gcash'));
    
    const paymentInput = document.getElementById('inputPayment');
    if (paymentInput) {
        paymentInput.addEventListener('input', updatePaymentAmount);
        paymentInput.disabled = true;
        paymentInput.style.backgroundColor = '#f0f0f0';
        paymentInput.style.opacity = '0.7';
        paymentInput.style.pointerEvents = 'none';
        paymentInput.placeholder = 'Select Cash first';
    }
    
    const payButton = document.getElementById('payment-btn');
    if (payButton) {
        payButton.addEventListener('click', Payment);
    }
    
    renderMenu();
    updatePayButtonState();
    
    // Load and refresh active dine-in customers
    await loadActiveDineInCustomers();
    startDineInCustomersRefresh();
    
    setInterval(() => {
        productCatalog.forEach(product => {
            if (product.stock > 0 && activeStockRequests.has(product.name)) {
                activeStockRequests.delete(product.name);
                pendingStockRequests = pendingStockRequests.filter(name => name !== product.name);
                saveActiveStockRequests();
                renderMenu();
            }
        });
    }, 5000);
});

setInterval(saveInventoryToStorage, 30000);
setInterval(saveActiveStockRequests, 10000);

// Settings modal function
function openSettingsModal() {
    // Remove existing modal if any
    const existingModal = document.getElementById('settingsModal');
    if (existingModal) existingModal.remove();
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'settingsModal';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 30px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        text-align: center;
    `;
    
    // Modal header
    const header = document.createElement('h2');
    header.textContent = '⚙️ Settings';
    header.style.cssText = `
        margin: 0 0 20px 0;
        color: #333;
        font-size: 24px;
    `;
    
    // User info section
    const userInfoSection = document.createElement('div');
    userInfoSection.style.cssText = `
        margin-bottom: 30px;
        text-align: left;
    `;
    
    // Name field
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Full Name:';
    nameLabel.style.cssText = `
        display: block;
        font-weight: bold;
        margin-bottom: 5px;
        color: #555;
    `;
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'Loading...';
    nameInput.style.cssText = `
        width: 100%;
        padding: 10px;
        border: 2px solid #ddd;
        border-radius: 6px;
        font-size: 16px;
        margin-bottom: 15px;
        box-sizing: border-box;
    `;
    
    // Role field (read-only)
    const roleLabel = document.createElement('label');
    roleLabel.textContent = 'Role:';
    roleLabel.style.cssText = `
        display: block;
        font-weight: bold;
        margin-bottom: 5px;
        color: #555;
    `;
    
    const roleInput = document.createElement('input');
    roleInput.type = 'text';
    roleInput.readOnly = true;
    roleInput.placeholder = 'Loading...';
    roleInput.style.cssText = `
        width: 100%;
        padding: 10px;
        border: 2px solid #ddd;
        border-radius: 6px;
        font-size: 16px;
        background-color: #f5f5f5;
        box-sizing: border-box;
    `;
    
    userInfoSection.appendChild(nameLabel);
    userInfoSection.appendChild(nameInput);
    userInfoSection.appendChild(roleLabel);
    userInfoSection.appendChild(roleInput);
    
    // Buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
        display: flex;
        gap: 10px;
        justify-content: center;
    `;
    
    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '💾 Save Changes';
    saveBtn.disabled = true;
    saveBtn.style.cssText = `
        padding: 12px 20px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 16px;
        cursor: pointer;
        transition: background 0.3s;
        flex: 1;
    `;
    saveBtn.onmouseover = () => {
        if (!saveBtn.disabled) saveBtn.style.background = '#388E3C';
    };
    saveBtn.onmouseout = () => {
        if (!saveBtn.disabled) saveBtn.style.background = '#4CAF50';
    };
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Close';
    closeBtn.style.cssText = `
        padding: 12px 20px;
        background: #f44336;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 16px;
        cursor: pointer;
        transition: background 0.3s;
        flex: 1;
    `;
    closeBtn.onmouseover = () => closeBtn.style.background = '#d32f2f';
    closeBtn.onmouseout = () => closeBtn.style.background = '#f44336';
    closeBtn.onclick = () => overlay.remove();
    
    buttonsContainer.appendChild(saveBtn);
    buttonsContainer.appendChild(closeBtn);
    
    // Assemble modal
    modal.appendChild(header);
    modal.appendChild(userInfoSection);
    modal.appendChild(buttonsContainer);
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Load user data
    loadUserDataForModal(nameInput, roleInput, saveBtn);
    
    // Handle escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// Load user data for the modal
async function loadUserDataForModal(nameInput, roleInput, saveBtn) {
    try {
        const response = await fetch('/api/infosettings/user', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Failed to load user data');
        }
        
        const userData = result.data || result.user || result;
        const fullName = userData.fullName || userData.name || userData.username || '';
        const role = userData.role || 'User';
        
        nameInput.value = fullName;
        roleInput.value = role;
        nameInput.placeholder = '';
        roleInput.placeholder = '';
        
        // Enable save button and add change detection
        let originalName = fullName;
        saveBtn.disabled = false;
        
        nameInput.addEventListener('input', () => {
            const hasChanges = nameInput.value.trim() !== originalName;
            saveBtn.disabled = !hasChanges;
        });
        
        // Save functionality
        saveBtn.onclick = async () => {
            const newName = nameInput.value.trim();
            
            if (!newName) {
                showToast('Name cannot be empty', 'error');
                return;
            }
            
            if (newName === originalName) {
                showToast('No changes made', 'info');
                return;
            }
            
            try {
                saveBtn.disabled = true;
                saveBtn.textContent = 'Saving...';
                
                const response = await fetch('/api/infosettings/update', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        name: newName
                    })
                });
                
                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.message || `HTTP ${response.status}`);
                }
                
                originalName = newName;
                saveBtn.disabled = true;
                saveBtn.textContent = 'Save Changes';
                
                showToast('✅ Name updated successfully!', 'success');
                
                // Close modal after successful save
                setTimeout(() => {
                    const modal = document.getElementById('settingsModal');
                    if (modal) modal.remove();
                }, 1500);
                
            } catch (error) {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Save Changes';
                showToast('Error: ' + error.message, 'error');
            }
        };
        
    } catch (error) {
        nameInput.placeholder = 'Error loading data';
        roleInput.placeholder = 'Error loading data';
        showToast('Failed to load user data', 'error');
    }
}

// ==================== 🍽️ ACTIVE DINE-IN CUSTOMERS MANAGEMENT ====================

/**
 * Add a new dine-in customer to the active tables
 * Called when a Dine-In order is completed/paid
 */
function addActiveDineInCustomer(tableNumber, orderStatus = 'Preparing') {
    const activeTables = JSON.parse(localStorage.getItem('activeTables')) || [];
    
    // Check if table is already active
    const existingTable = activeTables.find(t => t.tableNumber === parseInt(tableNumber));
    if (existingTable) {
        console.log(`Table #${tableNumber} is already active`);
        return;
    }
    
    // Generate random Customer ID with format CUST-XXXXXX
    const customerId = `CUST-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
    
    const newDineInCustomer = {
        tableNumber: parseInt(tableNumber),
        customerId: customerId,
        orderStatus: orderStatus,
        timeIn: new Date().toISOString(),
        hasLeft: false,
        leftTime: null
    };
    
    activeTables.push(newDineInCustomer);
    localStorage.setItem('activeTables', JSON.stringify(activeTables));
    
    console.log(`✅ Added customer to Table #${tableNumber} with ID: ${customerId}`);
}

/**
 * Remove customer from active dine-in customers (when they leave)
 */
function removeActiveDineInCustomer(tableNumber) {
    const activeTables = JSON.parse(localStorage.getItem('activeTables')) || [];
    const filteredTables = activeTables.filter(t => t.tableNumber !== parseInt(tableNumber));
    localStorage.setItem('activeTables', JSON.stringify(filteredTables));
    
    // Update table occupancy status
    updateTableStatus(parseInt(tableNumber), 'available');
    
    console.log(`✅ Removed customer from Table #${tableNumber}`);
}

/**
 * Update order status for a dine-in customer
 */
function updateDineInOrderStatus(tableNumber, newStatus) {
    const activeTables = JSON.parse(localStorage.getItem('activeTables')) || [];
    const table = activeTables.find(t => t.tableNumber === parseInt(tableNumber));
    
    if (table) {
        table.orderStatus = newStatus;
        localStorage.setItem('activeTables', JSON.stringify(activeTables));
        console.log(`✅ Updated Table #${tableNumber} status to: ${newStatus}`);
    }
}

/**
 * Get all active dine-in customers
 */
function getActiveDineInCustomers() {
    return JSON.parse(localStorage.getItem('activeTables')) || [];
}

/**
 * Get a specific customer by table number
 */
function getCustomerByTable(tableNumber) {
    const activeTables = getActiveDineInCustomers();
    return activeTables.find(t => t.tableNumber === parseInt(tableNumber));
}

/**
 * Handle when customer marks "Left" - removes them from active list
 */
function handleCustomerLeft(tableNumber) {
    removeActiveDineInCustomer(tableNumber);
    showToast(`✔️ Table #${tableNumber} is now available!`, 'success', 3000);
}

/**
 * Handle when customer marks "Not Left" - reverts the hasLeft flag
 */
function handleCustomerNotLeft(tableNumber) {
    console.log(`🔄 Marking Table #${tableNumber} as NOT LEFT...`);
    
    try {
        let customers = JSON.parse(localStorage.getItem('activeDineInCustomers')) || [];
        
        const customer = customers.find(c => c.tableNumber === parseInt(tableNumber));
        if (customer) {
            console.log(`✅ Found customer at Table #${tableNumber}:`, customer);
            customer.hasLeft = false;
            localStorage.setItem('activeDineInCustomers', JSON.stringify(customers));
            
            console.log('💾 Saved to localStorage');
            console.log('📋 Active customers:', customers.filter(c => !c.hasLeft).length);
            
            // Refresh modal if open
            if (typeof loadActiveDineInCustomersModal === 'function') {
                console.log('🔄 Reloading modal...');
                setTimeout(() => loadActiveDineInCustomersModal(), 100);
            }
            
            console.log(`✅ Table #${tableNumber} marked as NOT LEFT successfully`);
            if (typeof showToast === 'function') {
                showToast(`✖️ Table #${tableNumber} still dining`, 'info', 2000);
            }
        } else {
            console.warn(`⚠️ Customer not found at Table #${tableNumber}`);
            if (typeof showToast === 'function') {
                showToast(`❌ Customer not found at Table #${tableNumber}`, 'error', 2000);
            }
        }
    } catch (error) {
        console.error('❌ Error marking customer as not left:', error);
        if (typeof showToast === 'function') {
            showToast(`❌ Error updating table status`, 'error', 2000);
        }
    }
}

window.requestStock = requestStock;
window.showStockRequestModal = showStockRequestModal;
window.closeStockRequestModal = closeStockRequestModal;
window.submitStockRequest = submitStockRequest;
window.setDineIn = setDineIn;
window.setTakeout = setTakeout;
window.selectPaymentMethod = selectPaymentMethod;
window.Payment = Payment;
window.clearCurrentOrder = clearCurrentOrder;
window.removeItemFromOrder = removeItemFromOrder;
window.filterCategory = filterCategory;
window.searchFood = searchFood;
window.handleLogout = handleLogout;
window.productCatalog = productCatalog;
window.pendingStockRequests = pendingStockRequests;
window.checkFulfilledStockRequests = checkFulfilledStockRequests;
window.openSettingsModal = openSettingsModal;
window.addActiveDineInCustomer = addActiveDineInCustomer;
window.removeActiveDineInCustomer = removeActiveDineInCustomer;
window.updateDineInOrderStatus = updateDineInOrderStatus;
window.getActiveDineInCustomers = getActiveDineInCustomers;
window.getCustomerByTable = getCustomerByTable;
window.handleCustomerLeft = handleCustomerLeft;
window.handleCustomerNotLeft = handleCustomerNotLeft; 