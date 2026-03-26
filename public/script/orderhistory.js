// Order History Page Script

// Check if this is the order history page to avoid conflicts
if (window.location.pathname.includes('orderhistory')) {
    
    // DOM Elements - Get them dynamically
    let topItemsBody = document.getElementById('topItemsBody');
    let inventoryStatusBody = document.getElementById('inventoryStatusBody');
    let todaysOrdersBody = document.getElementById('todaysOrdersBody');

    // Load orders on page load
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📋 Order History page loaded');
        
        const isOrderHistoryPage = window.location.pathname.includes('orderhistory');
        
        if (isOrderHistoryPage) {
            console.log('🏁 Loading data from database...');
            
            // Re-get elements to ensure they exist
            topItemsBody = document.getElementById('topItemsBody');
            inventoryStatusBody = document.getElementById('inventoryStatusBody');
            todaysOrdersBody = document.getElementById('todaysOrdersBody');
            
            // Load initial data
            if (topItemsBody || inventoryStatusBody || todaysOrdersBody) {
                console.log('📊 Loading Top Items, Inventory, and Today\'s Orders...');
                loadInventoryStatus();
                loadLowStockItems();
                loadTopItems();
                loadTodaysOrders();
            }
            
            // Setup real-time updates
            // Setup real-time updates
            // Real-time updates disabled - using periodic refresh only (every 30 seconds)
            // setupRealTimeUpdates();
            
            // ✅ Periodic refresh DISABLED - Data fetched only on page load and manual refresh
        }
    });

    // Setup real-time updates via Server-Sent Events - DISABLED
    function setupRealTimeUpdates() {
        console.log('ℹ️ Real-time updates disabled');
        // Real-time EventSource connections disabled to prevent duplicate data
    }

    // Handle real-time events
    function handleRealTimeEvent(event) {
        console.log('📨 Real-time event received:', event.type);
        
        switch (event.type) {
            case 'new_order':
                console.log('📦 New order received, updating tables...');
                // Reload orders and top items when new order comes in
                loadOrders();
                loadTopItems();
                loadTodaysOrders();
                loadInventoryStatus();
                break;
                
            case 'inventory_update':
                console.log('📦 Inventory updated, refreshing...');
                loadInventoryStatus();
                break;
                
            case 'menu_update':
                console.log('🍽️ Menu updated, refreshing...');
                loadTopItems();
                break;
                
            case 'stats_update':
                console.log('📊 Stats updated, refreshing top items...');
                loadTopItems();
                break;
        }
    }

    async function loadOrders() {
        try {
            console.log('📦 Loading orders from database...');
            
            const response = await fetch('/api/orders', {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.error(`❌ HTTP error! status: ${response.status}`);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ Response received:', result);
            
            orderHistoryAllOrders = result.success ? result.data : [];
            
            console.log('📦 Orders loaded from database:', orderHistoryAllOrders.length);
            
            orderHistoryFilteredOrders = [...orderHistoryAllOrders];
            orderHistoryCurrentPage = 1;
            displayOrders();
            
        } catch (error) {
            console.error('❌ Error loading orders:', error);
            displayNoOrders();
        }
    }

    function displayOrders() {
        if (orderHistoryFilteredOrders.length === 0) {
            displayNoOrders();
            return;
        }
        
        // Sort by date descending
        orderHistoryFilteredOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Calculate pagination
        const totalPages = Math.ceil(orderHistoryFilteredOrders.length / orderHistoryItemsPerPage);
        const startIndex = (orderHistoryCurrentPage - 1) * orderHistoryItemsPerPage;
        const endIndex = startIndex + orderHistoryItemsPerPage;
        const pageOrders = orderHistoryFilteredOrders.slice(startIndex, endIndex);
        
        // Clear table body
        ordersTableBody.innerHTML = '';
        
        // Add rows
        pageOrders.forEach(order => {
            const itemsList = order.items
                .map(item => `${item.name} (x${item.quantity})`)
                .join(', ');
            
            const dateTime = new Date(order.createdAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            const statusClass = `status-${order.status}`;
            const isPaid = order.payment?.status === 'completed';
            
            const row = document.createElement('tr');
            ordersTableBody.appendChild(row);
        });
        
        // Show table and hide no orders message
        ordersTable.style.display = 'table';
        noOrdersMessage.style.display = 'none';
        
        // Update pagination
        updatePagination(totalPages);
    }

    function displayNoOrders() {
        ordersTable.style.display = 'none';
        noOrdersMessage.style.display = 'block';
        pagination.style.display = 'none';
        
        // Show message based on error state
        if (orderHistoryAllOrders.length === 0) {
            noOrdersMessage.innerHTML = ``;
        }
    }

    function updatePagination(totalPages) {
        const currentPageSpan = document.getElementById('currentPage');
        const totalPagesSpan = document.getElementById('totalPages');
        
        if (totalPages > 1) {
            pagination.style.display = 'flex';
            currentPageSpan.textContent = orderHistoryCurrentPage;
            totalPagesSpan.textContent = totalPages;
        } else {
            pagination.style.display = 'none';
        }
    }

    function changePage(direction) {
        const totalPages = Math.ceil(orderHistoryFilteredOrders.length / orderHistoryItemsPerPage);
        const newPage = orderHistoryCurrentPage + direction;
        
        if (newPage >= 1 && newPage <= totalPages) {
            orderHistoryCurrentPage = newPage;
            displayOrders();
            window.scrollTo(0, 0);
        }
    }

    function searchOrders(query) {
        if (!query.trim()) {
            orderHistoryFilteredOrders = [...orderHistoryAllOrders];
        } else {
            const searchTerm = query.toLowerCase();
            orderHistoryFilteredOrders = orderHistoryAllOrders.filter(order => 
                order.orderNumber?.toLowerCase().includes(searchTerm) ||
                order.customerName?.toLowerCase().includes(searchTerm) ||
                order.items?.some(item => item.name?.toLowerCase().includes(searchTerm))
            );
        }
        orderHistoryCurrentPage = 1;
        displayOrders();
    }

    function filterOrders() {
        const statusFilter = document.getElementById('statusFilter').value;
        
        if (!statusFilter) {
            orderHistoryFilteredOrders = [...orderHistoryAllOrders];
        } else {
            orderHistoryFilteredOrders = orderHistoryAllOrders.filter(order => order.status === statusFilter);
        }
        orderHistoryCurrentPage = 1;
        displayOrders();
    }

    function filterByDate() {
        const dateFilter = document.getElementById('dateFilter').value;
        
        if (!dateFilter) {
            orderHistoryFilteredOrders = [...orderHistoryAllOrders];
        } else {
            const filterDate = new Date(dateFilter);
            filterDate.setHours(0, 0, 0, 0);
            
            orderHistoryFilteredOrders = orderHistoryAllOrders.filter(order => {
                const orderDate = new Date(order.createdAt);
                orderDate.setHours(0, 0, 0, 0);
                return orderDate.getTime() === filterDate.getTime();
            });
        }
        orderHistoryCurrentPage = 1;
        displayOrders();
    }

    function refreshOrders() {
        console.log('🔄 Manual refresh');
        loadOrders();
    }

    function viewOrderDetails(orderId) {
        const order = orderHistoryAllOrders.find(o => o._id === orderId);
        if (order) {
            // Create a modal or show details
            const itemsList = order.items.map(item => 
                `${item.name} - ${item.quantity} x ₱${item.price.toFixed(2)} = ₱${(item.price * item.quantity).toFixed(2)}`
            ).join('\n');
            
            alert(`Order #${order.orderNumber}\n\nCustomer: ${order.customerName || 'Walk-in'}\n\nItems:\n${itemsList}\n\nTotal: ₱${order.total.toFixed(2)}\nStatus: ${order.status}\nPayment: ${order.payment?.method || 'Cash'}`);
        }
    }

    async function loadInventoryStatus() {
        try {
            // Always re-fetch the element reference
            const body = document.getElementById('inventoryStatusBody');
            if (!body) {
                console.warn('⚠️ inventoryStatusBody element not found in DOM');
                return;
            }
            
            console.log('📦 Fetching ALL inventory from /api/inventory...');
            const response = await fetch('/api/inventory', {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            console.log('📦 Inventory fetch response status:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`Failed to load inventory: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('📦 Inventory API response:', result);
            
            const items = result.data || result.items || [];
            
            console.log('📦 ALL inventory items fetched:', items.length);
            body.innerHTML = '';
            
            if (items.length === 0) {
                body.innerHTML = `
                    <tr>
                        <td colspan="3" style="text-align: center; color: #999; padding: 20px;">
                            No inventory items found
                        </td>
                    </tr>
                `;
                return;
            }
            
            // Sort by stock level (lowest first)
            items.sort((a, b) => (a.currentStock || a.stock || 0) - (b.currentStock || b.stock || 0));
            
            // Display ALL inventory items
            items.forEach(item => {
                const stock = item.currentStock || item.stock || 0;
                let status = 'In Stock';
                let statusClass = 'status-instock';
                
                if (stock === 0) {
                    status = 'Out of Stock';
                    statusClass = 'status-out';
                } else if (stock <= 50) {
                    status = 'Low Stock';
                    statusClass = 'status-low';
                }
                
                const unit = item.unit || item.measurementUnit || 'units';
                const itemName = item.itemName || item.name || 'Unknown';
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${itemName}</td>
                    <td>${stock} ${unit}</td>
                    <td><span class="status-badge ${statusClass}">${status}</span></td>
                `;
                body.appendChild(row);
            });
            
            console.log('✅ ALL inventory status loaded');
        } catch (error) {
            console.error('❌ Error loading inventory:', error);
            const body = document.getElementById('inventoryStatusBody');
            if (body) {
                body.innerHTML = `
                    <tr>
                        <td colspan="3" style="text-align: center; color: #f44336; padding: 20px;">
                            Error loading inventory: ${error.message}
                        </td>
                    </tr>
                `;
            }
        }
    }

    async function loadLowStockItems() {
        try {
            // Always re-fetch the element reference
            const body = document.getElementById('lowStockItemsBody');
            if (!body) {
                return;
            }
            
            console.log('📦 Fetching LOW STOCK items from /api/inventory...');
            const response = await fetch('/api/inventory', {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            console.log('📦 Low stock fetch response status:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`Failed to load inventory: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('📦 Inventory API response for low stock:', result);
            
            const items = result.data || result.items || [];
            
            // Filter for low stock (<=50) and out of stock (0) items ONLY
            const lowStockItems = items.filter(item => {
                const stock = item.currentStock || item.stock || 0;
                return stock === 0 || stock <= 50;
            });
            
            console.log('📊 Low/Out of stock items:', lowStockItems.length);
            body.innerHTML = '';
            
            if (lowStockItems.length === 0) {
                body.innerHTML = `
                    <tr>
                        <td colspan="3" style="text-align: center; color: #999; padding: 20px;">
                            All items are in good stock
                        </td>
                    </tr>
                `;
                return;
            }
            
            // Sort by stock level (lowest first - out of stock items first)
            lowStockItems.sort((a, b) => (a.currentStock || a.stock || 0) - (b.currentStock || b.stock || 0));
            
            // Display only low stock items
            lowStockItems.forEach(item => {
                const stock = item.currentStock || item.stock || 0;
                let status = 'In Stock';
                let statusClass = 'status-instock';
                
                if (stock === 0) {
                    status = 'Out of Stock';
                    statusClass = 'status-out';
                } else if (stock <= 50) {
                    status = 'Low Stock';
                    statusClass = 'status-low';
                }
                
                const unit = item.unit || item.measurementUnit || 'units';
                const itemName = item.itemName || item.name || 'Unknown';
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${itemName}</td>
                    <td>${stock} ${unit}</td>
                    <td><span class="status-badge ${statusClass}">${status}</span></td>
                `;
                body.appendChild(row);
            });
            
            console.log('✅ Low stock items loaded');
        } catch (error) {
            console.error('❌ Error loading low stock items:', error);
            const body = document.getElementById('lowStockItemsBody');
            if (body) {
                body.innerHTML = `
                    <tr>
                        <td colspan="3" style="text-align: center; color: #f44336; padding: 20px;">
                            Error loading low stock items: ${error.message}
                        </td>
                    </tr>
                `;
            }
        }
    }

    async function loadTopItems() {
        try {
            // Always re-fetch the element reference
            const body = document.getElementById('topItemsBody');
            if (!body) {
                console.warn('⚠️ topItemsBody element not found in DOM');
                return;
            }
            
            console.log('📊 Fetching top items from /api/orders/top-items...');
            
            const response = await fetch('/api/orders/top-items', {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`API returned status ${response.status}`);
            }
            
            const result = await response.json();
            console.log('📦 Top Items API response:', result);
            
            body.innerHTML = '';
            
            // Get top products from API response - supports multiple response formats
            let topProducts = result.data || result.items || result.topItems || [];
            
            console.log(`✅ Found ${topProducts.length} top products from API`);
            
            if (topProducts.length > 0) {
                console.log('📋 Processing top products from database...');
                
                // Filter out items with invalid names
                const validProducts = topProducts.filter(product => {
                    let name = product._id || product.name || product.productName || product.itemName || '';
                    // Filter out if name is empty, null, 'Unknown', or just an ObjectID-like string
                    return name && name.trim() !== '' && name !== 'Unknown' && !/^[a-f0-9]{24}$/.test(name);
                }).slice(0, 5);
                
                console.log(`✅ Valid products after filtering: ${validProducts.length}`);
                
                if (validProducts.length === 0) {
                    throw new Error('No valid products found after filtering');
                }
                
                validProducts.forEach((product, index) => {
                    const row = document.createElement('tr');
                    row.style.opacity = '0';
                    row.style.transform = 'translateY(10px)';
                    row.style.transition = `opacity 0.3s ease ${index * 100}ms, transform 0.3s ease ${index * 100}ms`;
                    
                    // Extract product information
                    let productName = 'Unknown';
                    let revenue = 0;
                    let quantity = 0;
                    
                    // Get product name from any available field
                    if (product._id && product._id.trim()) {
                        productName = product._id;
                    } else if (product.name && product.name.trim()) {
                        productName = product.name;
                    } else if (product.productName && product.productName.trim()) {
                        productName = product.productName;
                    } else if (product.itemName && product.itemName.trim()) {
                        productName = product.itemName;
                    }
                    
                    if (product.totalRevenue !== undefined) {
                        revenue = product.totalRevenue;
                    } else if (product.revenue !== undefined) {
                        revenue = product.revenue;
                    } else if (product.totalSales !== undefined) {
                        revenue = product.totalSales;
                    } else if (product.sales !== undefined) {
                        revenue = product.sales;
                    }
                    
                    if (product.totalQuantity !== undefined) {
                        quantity = product.totalQuantity;
                    } else if (product.quantity !== undefined) {
                        quantity = product.quantity;
                    } else if (product.count !== undefined) {
                        quantity = product.count;
                    }
                    
                    // Determine status
                    let status = 'Normal';
                    let statusClass = 'status-instock';
                    
                    if (index === 0) {
                        status = 'Top Seller';
                        statusClass = 'status-top';
                    } else if (revenue > 5000) {
                        status = 'High Sales';
                        statusClass = 'status-high';
                    } else if (revenue > 1000) {
                        status = 'Good Sales';
                        statusClass = 'status-good';
                    } else if (revenue > 0) {
                        status = 'Low Sales';
                        statusClass = 'status-low';
                    } else {
                        status = 'No Sales';
                        statusClass = 'status-out-of-stock';
                    }
                    
                    // Truncate long product names
                    const displayName = productName.length > 25 
                        ? productName.substring(0, 22) + '...' 
                        : productName;
                    
                    // Format revenue
                    const formattedRevenue = new Intl.NumberFormat('en-PH', {
                        style: 'currency',
                        currency: 'PHP',
                        minimumFractionDigits: 2
                    }).format(revenue);
                    
                    row.innerHTML = `
                        <td>
                            <div class="product-name">${displayName}</div>
                            ${quantity > 0 ? `<small class="text-muted">Sold: ${quantity} units</small>` : ''}
                        </td>
                        <td class="revenue-cell">${formattedRevenue}</td>
                        <td><span class="status-badge ${statusClass}">${status}</span></td>
                    `;
                    body.appendChild(row);
                    
                    // Trigger animation
                    setTimeout(() => {
                        row.style.opacity = '1';
                        row.style.transform = 'translateY(0)';
                    }, 10);
                    
                    console.log(`  ✅ Item ${index + 1}: ${displayName} - ${formattedRevenue}`);
                });
                
            } else {
                body.innerHTML = `
                    <tr>
                        <td colspan="3" style="text-align: center; color: #999; padding: 30px;">
                            <div style="margin-bottom: 10px;">
                                <i class="fas fa-chart-bar" style="font-size: 24px; color: #ccc;"></i>
                            </div>
                            No Top Sales
                        </td>
                    </tr>
                `;
            }
            
            console.log('✅ Top items table updated successfully');
            
        } catch (error) {
            console.error('❌ Error loading top items:', error);
            const body = document.getElementById('topItemsBody');
            if (body) {
                body.innerHTML = `
                    <tr>
                        <td colspan="3" style="text-align: center; color: #f44336; padding: 20px;">
                            <div style="margin-bottom: 10px;">
                                <i class="fas fa-exclamation-triangle" style="font-size: 24px;"></i>
                            </div>
                            Error loading sales data
                            <div style="margin-top: 10px; font-size: 12px;">
                                ${error.message}
                            </div>
                        </td>
                    </tr>
                `;
            }
        }
    }

    // Load today's orders separately
    async function loadTodaysOrders() {
        try {
            // Always re-fetch the element reference
            const body = document.getElementById('todaysOrdersBody');
            if (!body) {
                console.warn('⚠️ todaysOrdersBody element not found in DOM');
                return;
            }
            
            console.log('📅 Fetching today\'s orders from /api/orders/today...');
            
            // ✅ Increased limit from 5 to 100 to show all orders
            const response = await fetch('/api/orders/today?limit=100', {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load today's orders: ${response.status}`);
            }
            
            const result = await response.json();
            const todayOrders = result.success ? result.data : [];
            
            console.log('📅 Today\'s orders fetched:', todayOrders.length, 'orders');
            body.innerHTML = '';
            
            if (todayOrders.length > 0) {
                console.log('📋 Displaying all', todayOrders.length, 'orders');
                
                // ✅ Display ALL orders, not just first 5
                todayOrders.forEach((order, index) => {
                    const time = new Date(order.createdAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    // ✅ Handle customer ID properly
                    let customerId = 'Walk-in';
                    if (order.customerId) {
                        if (typeof order.customerId === 'object' && order.customerId.customerId) {
                            customerId = order.customerId.customerId;
                        } else if (typeof order.customerId === 'string' && order.customerId.trim() !== '') {
                            customerId = order.customerId;
                        }
                    }
                    
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${order.orderNumber || 'N/A'}</td>
                        <td>${time}</td>
                        <td>${customerId}</td>
                        <td>₱${(order.total || 0).toFixed(2)}</td>
                    `;
                    body.appendChild(row);
                    
                    console.log(`  ✅ Order ${index + 1}: ${order.orderNumber} - ${customerId}`);
                });
            } else {
                body.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align: center; color: #999; padding: 20px;">
                            No orders
                        </td>
                    </tr>
                `;
            }
            
            console.log(`✅ Today's orders table updated with ${todayOrders.length} orders`);
        } catch (error) {
            console.error('❌ Error loading today\'s orders:', error);
            const body = document.getElementById('todaysOrdersBody');
            if (body) {
                body.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align: center; color: #f44336; padding: 20px;">
                            Error loading today's orders: ${error.message}
                        </td>
                    </tr>
                `;
            }
        }
    }

    // Payment Modal Functions
    function openPaymentModal(orderId, orderNumber, totalAmount) {
        const modal = document.createElement('div');
        modal.id = 'paymentModal';
        modal.className = 'payment-modal';
        modal.innerHTML = ``;
        
        document.body.appendChild(modal);
        
        // Add event listener for change calculation
        document.getElementById('amountPaid').addEventListener('input', function() {
            const amountPaid = parseFloat(this.value) || 0;
            const change = amountPaid - totalAmount;
            const changeDisplay = document.getElementById('changeDisplay');
            
            if (change < 0) {
                changeDisplay.value = '₱' + Math.abs(change).toFixed(2) + ' (Shortfall)';
                changeDisplay.style.color = 'red';
            } else {
                changeDisplay.value = '₱' + change.toFixed(2);
                changeDisplay.style.color = 'green';
            }
        });
    }

    function closePaymentModal() {
        const modal = document.getElementById('paymentModal');
        if (modal) {
            modal.remove();
        }
    }

    async function processPayment(orderId, totalAmount) {
        const amountPaid = parseFloat(document.getElementById('amountPaid').value);
        const paymentMethod = document.getElementById('paymentMethod').value;
        const errorDiv = document.getElementById('paymentError');
        
        // Validate
        if (!amountPaid || amountPaid <= 0) {
            errorDiv.style.display = 'block';
            errorDiv.textContent = 'Please enter a valid amount';
            return;
        }
        
        if (amountPaid < totalAmount) {
            errorDiv.style.display = 'block';
            errorDiv.textContent = 'Insufficient payment amount';
            return;
        }
        
        try {
            const response = await fetch(`/api/orders/${orderId}/pay`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amountPaid: amountPaid,
                    paymentMethod: paymentMethod
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Close modal
                closePaymentModal();
                
                // Show success message
                alert('Payment processed successfully!\nChange: ₱' + result.receipt.change.toFixed(2));
                
                // Reload orders to update the table
                loadOrders();
                
                // Generate and print receipt
                if (result.receipt) {
                    generateReceipt(result.receipt);
                }
            } else {
                errorDiv.style.display = 'block';
                errorDiv.textContent = result.message || 'Failed to process payment';
            }
        } catch (error) {
            console.error('Error processing payment:', error);
            errorDiv.style.display = 'block';
            errorDiv.textContent = 'Error processing payment: ' + error.message;
        }
    }

    function generateReceipt(receiptData) {
        const receiptHTML = ``;
        
        // Open receipt in new window
        const receiptWindow = window.open('', 'Receipt', 'width=600,height=800');
        receiptWindow.document.write(receiptHTML);
        receiptWindow.document.close();
    }

    function printReceipt(orderId) {
        const order = orderHistoryAllOrders.find(o => o._id === orderId);
        if (order) {
            const receiptData = {
                orderNumber: order.orderNumber,
                items: order.items,
                subtotal: order.subtotal || order.total,
                tax: order.tax || 0,
                total: order.total,
                paymentMethod: order.payment?.method || 'Cash',
                amountPaid: order.payment?.amountPaid || order.total,
                change: order.payment?.change || 0
            };
            generateReceipt(receiptData);
        } else {
            alert('Order not found');
        }
    }

    // Expose functions to global scope for inline onclick handlers
    window.loadInventoryStatus = loadInventoryStatus;
    window.loadTopItems = loadTopItems;
    window.loadTodaysOrders = loadTodaysOrders;

} // End of order history page check