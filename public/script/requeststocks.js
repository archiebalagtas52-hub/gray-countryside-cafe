// ==================== REQUEST STOCKS SCRIPT ====================

const BACKEND_URL = window.location.origin;

let allProducts = [];
let selectedRequests = {};

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    loadProducts();
    
    // Add event listeners
    document.getElementById('searchInput').addEventListener('input', filterProducts);
    document.getElementById('categoryFilter').addEventListener('change', filterProducts);
});

// Load all products from the database
async function loadProducts() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/menu`);
        if (!response.ok) throw new Error('Failed to load products');
        
        const data = await response.json();
        allProducts = data.data || [];
        
        // If no products from API, use menu database (fallback)
        if (allProducts.length === 0) {
            loadProductsFromDatabase();
        } else {
            renderProductsTable(allProducts);
        }
    } catch (error) {
        console.error('Error loading products:', error);
        loadProductsFromDatabase();
    }
}

// Fallback: Use the menu database if API fails
function loadProductsFromDatabase() {
    const menuDatabase = {
        'Rice Bowl Meals': [
            { name: 'Korean Spicy Bulgogi (Pork)', unit: 'plate', price: 158 },
            { name: 'Korean Salt and Pepper (Pork)', unit: 'plate', price: 158 },
            { name: 'Crispy Pork Lechon Kawali', unit: 'plate', price: 158 },
            { name: 'Cream Dory Fish Fillet', unit: 'plate', price: 138 },
            { name: 'Buttered Honey Chicken', unit: 'plate', price: 128 },
            { name: 'Buttered Spicy Chicken', unit: 'plate', price: 128 },
            { name: 'Chicken Adobo', unit: 'plate', price: 128 },
            { name: 'Pork Shanghai', unit: 'plate', price: 128 }
        ],
        'Hot Sizzlers': [
            { name: 'Sizzling Pork Sisig', unit: 'sizzling plate', price: 168 },
            { name: 'Sizzling Liempo', unit: 'sizzling plate', price: 168 },
            { name: 'Sizzling Porkchop', unit: 'sizzling plate', price: 148 },
            { name: 'Sizzling Fried Chicken', unit: 'sizzling plate', price: 148 }
        ],
        'Party Tray': [
            { name: 'Pansit Bihon', unit: 'tray', price: 300 },
            { name: 'Pancit Canton', unit: 'tray', price: 300 },
            { name: 'Spaghetti', unit: 'tray', price: 400 },
            { name: 'Creamy Carbonara', unit: 'tray', price: 500 },
            { name: 'Creamy Pesto', unit: 'tray', price: 500 },
            { name: 'Tuyo Pesto', unit: 'tray', price: 600 },
            { name: 'Kare-Kare', unit: 'tray', price: 600 },
            { name: 'Chicken Buffalo Wings', unit: 'tray', price: 400 },
            { name: 'Lumpia Shanghai', unit: 'tray', price: 300 }
        ],
        'Drinks': [
            { name: 'Cucumber Lemonade (Glass)', unit: 'glass', price: 38 },
            { name: 'Cucumber Lemonade (Pitcher)', unit: 'pitcher', price: 114 },
            { name: 'Blue Lemonade (Glass)', unit: 'glass', price: 38 },
            { name: 'Blue Lemonade (Pitcher)', unit: 'pitcher', price: 114 },
            { name: 'Red Tea (Glass)', unit: 'glass', price: 38 },
            { name: 'Red Tea (Pitcher)', unit: 'pitcher', price: 114 },
            { name: 'Calamansi Juice (Glass)', unit: 'glass', price: 38 },
            { name: 'Calamansi Juice (Pitcher)', unit: 'pitcher', price: 114 },
            { name: 'Soda (Mismo) Coke', unit: 'bottle', price: 28 },
            { name: 'Soda (Mismo) Sprite', unit: 'bottle', price: 28 },
            { name: 'Soda (Mismo) Royal', unit: 'bottle', price: 28 },
            { name: 'Soda 1.5L Coke', unit: 'bottle', price: 118 },
            { name: 'Soda 1.5L Coke Zero', unit: 'bottle', price: 118 },
            { name: 'Soda 1.5L Sprite', unit: 'bottle', price: 118 },
            { name: 'Soda 1.5L Royal', unit: 'bottle', price: 118 }
        ],
        'Coffee': [
            { name: 'Espresso Hot', unit: 'cup', price: 88 },
            { name: 'Café Americano Hot', unit: 'cup', price: 108 },
            { name: 'Cappuccino Hot', unit: 'cup', price: 98 },
            { name: 'Café Latte Hot', unit: 'cup', price: 108 },
            { name: 'Mocha Latte Hot', unit: 'cup', price: 108 },
            { name: 'Vanilla Latte Hot', unit: 'cup', price: 108 },
            { name: 'Caramel Macchiato Hot', unit: 'cup', price: 108 },
            { name: 'Green Tea Latte Hot', unit: 'cup', price: 118 },
            { name: 'White Chocolate Hot', unit: 'cup', price: 108 },
            { name: 'Green Tea Matcha Hot', unit: 'cup', price: 118 },
            { name: 'Hot Ceylon Tea Black', unit: 'cup', price: 78 },
            { name: 'Hot Ceylon Tea Lemon', unit: 'cup', price: 78 },
            { name: 'Hot Ceylon Tea Peppermint', unit: 'cup', price: 78 },
            { name: 'Iced Café Latte', unit: 'cup', price: 108 },
            { name: 'Iced Mocha Latte', unit: 'cup', price: 118 },
            { name: 'Iced Vanilla Latte', unit: 'cup', price: 118 },
            { name: 'Iced Caramel Macchiato', unit: 'cup', price: 128 },
            { name: 'Iced White Chocolate Latte', unit: 'cup', price: 98 },
            { name: 'Iced Dark Chocolate', unit: 'cup', price: 98 }
        ],
        'Milk Tea': [
            { name: 'Milk Tea Regular', unit: 'cup', price: 68 },
            { name: 'Caramel Milk Tea', unit: 'cup', price: 78 },
            { name: 'Cookies & Cream Milk Tea', unit: 'cup', price: 78 },
            { name: 'Dark Choco Milk Tea', unit: 'cup', price: 78 },
            { name: 'Okinawa Milk Tea', unit: 'cup', price: 78 },
            { name: 'Wintermelon Milk Tea', unit: 'cup', price: 78 },
            { name: 'Matcha Green Tea Milk Tea', unit: 'cup', price: 88 }
        ],
        'Frappe': [
            { name: 'Matcha Green Tea Frappe', unit: 'cup', price: 108 },
            { name: 'Salted Caramel Frappe', unit: 'cup', price: 108 },
            { name: 'Strawberry Cheesecake Frappe', unit: 'cup', price: 108 },
            { name: 'Mango Cheesecake Frappe', unit: 'cup', price: 108 },
            { name: 'Strawberry Cream Frappe', unit: 'cup', price: 98 },
            { name: 'Cookies & Cream Frappe', unit: 'cup', price: 98 },
            { name: 'Rocky Road Frappe', unit: 'cup', price: 88 },
            { name: 'Choco Fudge Frappe', unit: 'cup', price: 88 },
            { name: 'Choco Mousse Frappe', unit: 'cup', price: 88 },
            { name: 'Coffee Crumble Frappe', unit: 'cup', price: 88 },
            { name: 'Vanilla Cream Frappe', unit: 'cup', price: 88 }
        ],
        'Snacks & Appetizer': [
            { name: 'Cheesy Nachos', unit: 'serving', price: 150 },
            { name: 'Nachos Supreme', unit: 'serving', price: 180 },
            { name: 'French Fries', unit: 'serving', price: 90 },
            { name: 'Clubhouse Sandwich', unit: 'sandwich', price: 120 },
            { name: 'Fish and Fries', unit: 'serving', price: 160 },
            { name: 'Cheesy Dynamite Lumpia', unit: 'piece', price: 25 },
            { name: 'Lumpiang Shanghai', unit: 'piece', price: 20 }
        ],
        'Budget Meals Served with Rice': [
            { name: 'Fried Chicken', unit: 'meal', price: 95 },
            { name: 'Budget Fried Chicken', unit: 'meal', price: 85 },
            { name: 'Tinapa Rice', unit: 'meal', price: 85 },
            { name: 'Tuyo Pesto', unit: 'meal', price: 80 },
            { name: 'Fried Rice', unit: 'serving', price: 50 },
            { name: 'Plain Rice', unit: 'bowl', price: 25 }
        ],
        'Specialties': [
            { name: 'Sinigang (Pork)', unit: 'serving', price: 280 },
            { name: 'Sinigang (Shrimp)', unit: 'serving', price: 320 },
            { name: 'Paknet (Pakbet w/ Bagnet)', unit: 'serving', price: 260 },
            { name: 'Buttered Shrimp', unit: 'serving', price: 300 },
            { name: 'Special Bulalo (good for 2-3 Persons)', unit: 'pot', price: 450 },
            { name: 'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)', unit: 'pot', price: 850 }
        ],
        'Packaging Supplies': [
            { name: 'Paper Cups (12oz)', unit: 'pack', price: 0 },
            { name: 'Paper Cups (16oz)', unit: 'pack', price: 0 },
            { name: 'Straws (Regular)', unit: 'pack', price: 0 },
            { name: 'Straws (Boba)', unit: 'pack', price: 0 },
            { name: 'Food Containers (Small)', unit: 'pack', price: 0 },
            { name: 'Food Containers (Medium)', unit: 'pack', price: 0 },
            { name: 'Food Containers (Large)', unit: 'pack', price: 0 },
            { name: 'Plastic Utensils Set', unit: 'set', price: 0 },
            { name: 'Napkins (Pack of 50)', unit: 'pack', price: 0 }
        ]
    };
    
    // Flatten the database into products array with category
    allProducts = [];
    let index = 1;
    for (const [category, products] of Object.entries(menuDatabase)) {
        products.forEach(product => {
            allProducts.push({
                id: `prod_${index}`,
                name: product.name,
                category: category,
                unit: product.unit,
                price: product.price,
                status: 'In Stock'
            });
            index++;
        });
    }
    
    renderProductsTable(allProducts);
}

// Render products in table
function renderProductsTable(products) {
    const tbody = document.getElementById('productsTableBody');
    
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="empty-state"><p>No products found</p></td></tr>';
        return;
    }
    
    let html = '';
    products.forEach((product, index) => {
        const key = product.name;
        const isSelected = selectedRequests[key] !== undefined;
        const quantity = isSelected ? selectedRequests[key].quantity : 0;
        
        // Determine stock status
        const currentStock = product.stock || product.currentStock || 0;
        const maxStock = product.maxStock || 100;
        let statusBadge = '';
        let statusClass = '';
        
        if (currentStock === 0) {
            statusBadge = 'Out of Stock';
            statusClass = 'status-out';
        } else if (currentStock <= 20) {
            statusBadge = `Low Stock (${currentStock}/${maxStock})`;
            statusClass = 'status-low';
        } else if (currentStock >= maxStock) {
            statusBadge = `Full (${currentStock}/${maxStock})`;
            statusClass = 'status-good';
        } else {
            statusBadge = `In Stock (${currentStock}/${maxStock})`;
            statusClass = 'status-good';
        }
        
        html += `
            <tr class="product-row ${isSelected ? 'row-selected' : ''}" id="row-${key}">
                <td>
                    <input type="checkbox" class="row-checkbox" data-key="${key}" 
                           onchange="toggleRowSelection(this)" ${isSelected ? 'checked' : ''}>
                </td>
                <td>${index + 1}</td>
                <td><strong>${product.name}</strong></td>
                <td>${product.category}</td>
                <td>${product.category} - ${product.name}</td>
                <td>${product.unit}</td>
                <td><span class="status-badge ${statusClass}">${statusBadge}</span></td>
                <td>
                    <input type="number" class="quantity-input" data-key="${key}" 
                           value="${quantity}" min="0" step="1" 
                           onchange="updateQuantity('${key}', this.value)">
                </td>
                <td>
                    <select class="priority-select" data-key="${key}" onchange="updatePriority('${key}', this.value)">
                        <option value="low" ${isSelected && selectedRequests[key].priority === 'low' ? 'selected' : ''}>🟢 Low</option>
                        <option value="medium" ${isSelected && selectedRequests[key].priority === 'medium' ? 'selected' : ''} selected>🟡 Medium</option>
                        <option value="high" ${isSelected && selectedRequests[key].priority === 'high' ? 'selected' : ''}>🔴 High</option>
                    </select>
                </td>
                <td>
                    <button class="btn-request" onclick="submitSingleRequest('${key}')" ${quantity > 0 ? '' : 'disabled'}>
                        Request
                    </button>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Filter products by search and category
function filterProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    
    const filtered = allProducts.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm) || 
                            product.category.toLowerCase().includes(searchTerm);
        const matchesCategory = !categoryFilter || product.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });
    
    renderProductsTable(filtered);
}

// Reset filters
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = '';
    renderProductsTable(allProducts);
}

// Toggle row selection
function toggleRowSelection(checkbox) {
    const key = checkbox.dataset.key;
    const row = document.getElementById(`row-${key}`);
    const quantityInput = row.querySelector('.quantity-input');
    const quantity = parseInt(quantityInput.value) || 0;
    
    if (checkbox.checked && quantity > 0) {
        const priority = row.querySelector('.priority-select').value;
        selectedRequests[key] = { quantity, priority };
        row.classList.add('row-selected');
    } else {
        delete selectedRequests[key];
        row.classList.remove('row-selected');
    }
    
    updateBulkUI();
}

// Update quantity
function updateQuantity(key, value) {
    const quantity = parseInt(value) || 0;
    const row = document.getElementById(`row-${key}`);
    const checkbox = row.querySelector('.row-checkbox');
    
    if (quantity > 0) {
        checkbox.disabled = false;
        checkbox.checked = true;
        const priority = row.querySelector('.priority-select').value;
        selectedRequests[key] = { quantity, priority };
        row.classList.add('row-selected');
    } else {
        delete selectedRequests[key];
        checkbox.checked = false;
        row.classList.remove('row-selected');
    }
    
    updateBulkUI();
}

// Update priority
function updatePriority(key, priority) {
    if (selectedRequests[key]) {
        selectedRequests[key].priority = priority;
    }
}

// Toggle select all
function toggleSelectAll(checkbox) {
    const rows = document.querySelectorAll('.row-checkbox');
    rows.forEach(cb => {
        cb.checked = checkbox.checked;
        cb.dispatchEvent(new Event('change'));
    });
}

// Select all out of stock
function selectAllOutOfStock() {
    const quantityInputs = document.querySelectorAll('.quantity-input');
    quantityInputs.forEach(input => {
        // Set to 50 by default for bulk requests
        input.value = 50;
        input.dispatchEvent(new Event('change'));
    });
}

// Clear all selections
function clearAllSelections() {
    selectedRequests = {};
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(cb => cb.checked = false);
    const rows = document.querySelectorAll('.product-row');
    rows.forEach(row => row.classList.remove('row-selected'));
    document.querySelectorAll('.quantity-input').forEach(input => input.value = 0);
    updateBulkUI();
}

// Update bulk UI
function updateBulkUI() {
    const selectedCount = Object.keys(selectedRequests).length;
    let totalQuantity = 0;
    
    Object.values(selectedRequests).forEach(req => {
        totalQuantity += req.quantity;
    });
    
    document.getElementById('selectedCount').textContent = selectedCount;
    document.getElementById('totalQuantity').textContent = totalQuantity;
    
    const bulkSection = document.getElementById('bulkActionsSection');
    const submitBtn = document.getElementById('submitAllBtn');
    
    if (selectedCount > 0) {
        bulkSection.style.display = 'flex';
        submitBtn.disabled = false;
    } else {
        bulkSection.style.display = 'none';
        submitBtn.disabled = true;
    }
}

// Submit single request with timeout
async function submitSingleRequest(key) {
    const product = allProducts.find(p => p.name === key);
    const row = document.getElementById(`row-${key}`);
    const quantity = parseInt(row.querySelector('.quantity-input').value);
    const priority = row.querySelector('.priority-select').value;
    
    // Check if quantity is valid (must be 25 or 100 only)
    if (!quantity || (quantity !== 25 && quantity !== 100)) {
        showRequestStocksInvalidQuantityAlert();
        return;
    }
    
    const btn = row.querySelector('.btn-request');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳ Sending...';
    
    try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        const response = await fetch(`${BACKEND_URL}/api/stock-requests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            signal: controller.signal,
            body: JSON.stringify({
                productId: product.id || key,
                productName: key,
                requestedQuantity: quantity,
                unit: product.unit,
                priority: priority,
                requestedBy: 'staff',
                status: 'pending'
            })
        });
        
        clearTimeout(timeoutId);
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(`✓ Request submitted for ${key} (${quantity} ${product.unit})`, 'success');
            // Clear the row
            row.querySelector('.quantity-input').value = 0;
            row.querySelector('.row-checkbox').checked = false;
            delete selectedRequests[key];
            row.classList.remove('row-selected');
            updateBulkUI();
        } else if (response.status === 409) {
            // Conflict: Request already pending - show details
            const hoursOld = data.hoursOld || 0;
            const message = hoursOld < 1 ? 
                `Request already pending (just submitted). Please wait before re-requesting.` :
                `Request already pending for ${Math.ceil(hoursOld)} hours. Please contact admin if stuck.`;
            showNotification(message, 'warning');
        } else {
            showNotification(`Failed: ${data.message || 'Unable to submit request'}`, 'error');
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            showNotification('Request timeout - server not responding', 'error');
        } else {
            console.error('Error submitting request:', error);
            showNotification('Error submitting request', 'error');
        }
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// Submit all selected requests with timeout handling
async function submitBulkRequests() {
    const btn = document.getElementById('submitAllBtn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳ Submitting...';
    
    let successCount = 0;
    let failureCount = 0;
    let timeoutCount = 0;
    
    try {
        for (const [productName, requestData] of Object.entries(selectedRequests)) {
            const product = allProducts.find(p => p.name === productName);
            
            try {
                // Create abort controller for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout per request
                
                const response = await fetch(`${BACKEND_URL}/api/stock-requests`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    signal: controller.signal,
                    body: JSON.stringify({
                        productId: product?.id || productName,
                        productName: productName,
                        requestedQuantity: requestData.quantity,
                        unit: product?.unit || 'units',
                        priority: requestData.priority,
                        requestedBy: 'staff',
                        status: 'pending'
                    })
                });
                
                clearTimeout(timeoutId);
                
                if (response.ok) {
                    successCount++;
                } else {
                    failureCount++;
                }
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.warn(`Request timeout for ${productName}`);
                    timeoutCount++;
                } else {
                    console.error(`Error submitting request for ${productName}:`, error);
                    failureCount++;
                }
            }
        }
        
        // Show results
        let message = `✓ ${successCount} requests submitted successfully`;
        if (failureCount > 0) {
            message += ` (${failureCount} failed)`;
        }
        if (timeoutCount > 0) {
            message += ` (${timeoutCount} timeout)`;
        }
        
        showNotification(message, successCount > 0 ? 'success' : 'error');
        
        // Clear all selections only if all successful
        if (failureCount === 0 && timeoutCount === 0) {
            clearAllSelections();
        }
        
    } catch (error) {
        console.error('Error submitting bulk requests:', error);
        showNotification('Error submitting requests', 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// Show notification (simple version without external library)
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Show invalid quantity alert modal
function showRequestStocksInvalidQuantityAlert() {
    const existingAlert = document.getElementById('requestStocksInvalidQuantityAlert');
    if (existingAlert) existingAlert.remove();
    
    const overlay = document.createElement('div');
    overlay.id = 'requestStocksInvalidQuantityAlert';
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
    message.textContent = 'Please fill up the quantity with 25 or 100 only';
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

// Add styles for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
