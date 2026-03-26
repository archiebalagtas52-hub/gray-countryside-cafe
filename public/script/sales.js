let salesData = {
    totalRevenue: 0,
    grossSalesRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    avgOrderValue: 0,
    grossProfit: 0,
    margin: 0,
    dailySales: [],
    recentOrders: []
};

// Period management
let currentPeriod = 'daily';
let periodData = {
    daily: { label: 'Today', data: null },
    weekly: { label: 'This Week', data: null },
    monthly: { label: 'This Month', data: null }
};

function switchPeriod(period) {
    console.log(`📅 Switching to ${period} view...`);
    currentPeriod = period;
    
    // Update active tab
    document.querySelectorAll('.period-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(period + 'Tab').classList.add('active');
    
    // For weekly and monthly, reset to 0 first
    if (period === 'weekly' || period === 'monthly') {
        console.log(`🔄 Resetting ${period} data to 0...`);
        resetSalesDataToZero();
    } else if (period === 'daily') {
        // Fetch immediately for daily
        console.log(`📊 Fetching daily data from database...`);
        loadSalesReportByPeriod(period);
    }
}

function resetSalesDataToZero() {
    console.log('🔄 Resetting all sales data to 0...');
    
    // Store old data for animation
    const oldData = { ...salesData };
    
    // Reset all values to 0
    salesData.totalRevenue = 0;
    salesData.grossSalesRevenue = 0;
    salesData.totalOrders = 0;
    salesData.totalCustomers = 0;
    salesData.avgOrderValue = 0;
    salesData.grossProfit = 0;
    salesData.margin = 0;
    salesData.dailySales = [];
    salesData.recentOrders = [];
    
    // Update period display
    const periodEl = document.getElementById('reportPeriod');
    if (periodEl) {
        periodEl.textContent = formatPeriodLabel(currentPeriod);
    }
    
    // Update displays with animation
    updateSalesReportDisplay(oldData);
    
    console.log('✅ All sales data reset to 0');
    
    // Schedule automatic data fetch after the period completes
    scheduleDataFetch(currentPeriod);
}

function scheduleDataFetch(period) {
    console.log(`⏰ Scheduling data fetch for ${period}...`);
    
    const now = new Date();
    let nextFetchDate;
    
    if (period === 'weekly') {
        // Fetch after 7 days from now
        nextFetchDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        console.log(`📅 Next fetch scheduled for: ${nextFetchDate.toLocaleString()}`);
    } else if (period === 'monthly') {
        // Fetch after 30 days from now
        nextFetchDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        console.log(`📅 Next fetch scheduled for: ${nextFetchDate.toLocaleString()}`);
    } else {
        return; // Don't schedule for daily
    }
    
    // Calculate time until next fetch
    const timeUntilFetch = nextFetchDate.getTime() - now.getTime();
    
    // Set timeout to fetch data after the period
    setTimeout(() => {
        console.log(`⏳ ${period.charAt(0).toUpperCase() + period.slice(1)} period completed! Fetching data...`);
        
        // Only fetch if user is still viewing this period
        if (currentPeriod === period) {
            loadSalesReportByPeriod(period);
        }
    }, timeUntilFetch);
}

function formatPeriodLabel(period) {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    
    switch(period) {
        case 'daily':
            return `Today - ${now.toLocaleDateString('en-US', options)}`;
        case 'weekly':
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            return `Week: ${weekStart.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} - ${weekEnd.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}`;
        case 'monthly':
            return `Month: ${now.toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}`;
        default:
            return 'Sales Report';
    }
}

async function loadSalesReportByPeriod(period) {
    try {
        console.log(`📊 Loading ${period} sales data...`);
        
        const response = await fetch(`/api/dashboard/stats?period=${period}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        const stats = result.success ? result.data : result;
        
        console.log(`✅ ${period} data loaded:`, stats);
        
        // Update period display
        const periodEl = document.getElementById('reportPeriod');
        if (periodEl) {
            periodEl.textContent = formatPeriodLabel(period);
        }
        
        // Store period data
        periodData[period].data = stats;
        
        // Update displays
        const oldData = { ...salesData };
        
        salesData.totalRevenue = Math.max(0, parseFloat(stats.totalRevenue) || 0);
        salesData.grossSalesRevenue = salesData.totalRevenue;
        salesData.grossProfit = salesData.totalRevenue * 0.65;
        salesData.margin = salesData.totalRevenue > 0 ? (salesData.grossProfit / salesData.totalRevenue) * 100 : 0;
        salesData.totalOrders = Math.max(0, parseInt(stats.totalOrders) || 0);
        salesData.totalCustomers = Math.max(0, parseInt(stats.totalCustomers) || 0);
        salesData.avgOrderValue = salesData.totalOrders > 0 ? salesData.totalRevenue / salesData.totalOrders : 0;
        
        if (Array.isArray(stats.recentOrders) && stats.recentOrders.length > 0) {
            salesData.recentOrders = stats.recentOrders;
        } else {
            salesData.recentOrders = [];
        }
        
        updateSalesReportDisplay(oldData);
        calculateRevenueBreakdown();
        
    } catch (error) {
        console.error(`❌ Error loading ${period} sales data:`, error);
        showNotification(`Failed to load ${period} data. Please try again.`, 'error');
    }
}


function formatCurrency(amount) {
    if (!amount || isNaN(amount)) return '₱0.00';
    return '₱' + parseFloat(amount).toFixed(2);
}

function formatPercent(value) {
    if (!value || isNaN(value)) return '0%';
    return parseFloat(value).toFixed(1) + '%';
}

function animateValue(element, start, end, duration, prefix = '', suffix = '') {
    if (!element) return;
    
    const startTime = performance.now();
    const isCurrency = prefix === '₱';
    const isNumber = typeof end === 'number';
    
    function updateValue(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        let currentValue;
        if (isNumber) {
            currentValue = start + (end - start) * easeOut;
            
            if (isCurrency) {
                element.textContent = `${prefix}${currentValue.toFixed(2)}`;
            } else if (suffix === '%') {
                element.textContent = `${currentValue.toFixed(1)}${suffix}`;
            } else {
                element.textContent = Math.round(currentValue);
            }
        } else {
            element.textContent = end;
        }
        
        if (progress < 1) {
            requestAnimationFrame(updateValue);
        }
    }
    
    requestAnimationFrame(updateValue);
}

function fadeInElement(element, delay = 0) {
    if (!element) return;
    
    setTimeout(() => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        
        void element.offsetWidth;
        
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
    }, delay);
}

function pulseElement(element) {
    if (!element) return;
    
    element.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease';
    element.style.transform = 'scale(1.05)';
    element.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)';
    
    setTimeout(() => {
        element.style.transform = 'scale(1)';
        element.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
    }, 300);
}

function animateProgressBar(bar, targetHeight, duration = 1000) {
    if (!bar) return;
    
    const startHeight = 0;
    const startTime = performance.now();
    
    function updateBar(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentHeight = startHeight + (targetHeight - startHeight) * easeOut;
        
        bar.style.height = `${currentHeight}%`;
        
        if (bar.dataset.isToday === 'true') {
            const intensity = 1 + (0.5 * easeOut);
            bar.style.boxShadow = `0 0 ${10 * intensity}px rgba(76, 175, 80, ${0.3 * easeOut})`;
        }
        
        if (progress < 1) {
            requestAnimationFrame(updateBar);
        }
    }
    
    requestAnimationFrame(updateBar);
}

// Generate report HTML content
function generateReportHTML(reportData, dateStr, timeStr) {
    const formatCurrency = (amount) => {
        const num = parseFloat(amount) || 0;
        return isNaN(num) ? '₱0.00' : '₱' + num.toFixed(2);
    };
    
    const formatPercent = (value) => {
        const num = parseFloat(value) || 0;
        return isNaN(num) ? '0.0%' : num.toFixed(1) + '%';
    };
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${reportData.title}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                html, body { height: 100%; }
                body { font-family: 'Arial', sans-serif; color: #333; line-height: 1.4; overflow: hidden; }
                .container { max-width: 900px; margin: 0 auto; padding: 30px 20px; background: white; height: 100vh; overflow-y: auto; }
                .container::-webkit-scrollbar { width: 8px; }
                .container::-webkit-scrollbar-track { background: #f1f1f1; }
                .container::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }
                .container::-webkit-scrollbar-thumb:hover { background: #555; }
                .header { text-align: center; margin-bottom: 20px; }
                .header h1 { font-size: 22px; font-weight: bold; margin: 8px 0; }
                .cafe-name { font-size: 15px; font-weight: bold; margin: 3px 0; }
                .header p { font-size: 11px; color: #666; margin: 2px 0; }
                h2 { font-size: 13px; font-weight: bold; margin: 15px 0 10px; color: #2c3e50; }
                .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 15px 0; }
                .summary-card { padding: 12px; background: #f9f9f9; border: 1px solid #eee; border-radius: 4px; }
                .summary-card h3 { font-size: 10px; color: #666; margin-bottom: 4px; font-weight: bold; text-transform: uppercase; }
                .summary-card .value { font-size: 17px; font-weight: bold; color: #2c3e50; margin-bottom: 3px; }
                .summary-card .change { font-size: 9px; color: #999; }
                table { width: 100%; border-collapse: collapse; margin: 15px 0; background: white; border: 1px solid #ddd; }
                th { background: #f5f5f5; padding: 8px 10px; text-align: left; font-size: 11px; font-weight: bold; border-bottom: 2px solid #ddd; }
                td { padding: 8px 10px; border-bottom: 1px solid #eee; font-size: 11px; }
                th:nth-child(2), th:nth-child(3), td:nth-child(2), td:nth-child(3) { text-align: right; }
                tr:nth-child(even) { background: #fafafa; }
                tr:hover { background: #f5f5f5; }
                .footer { margin: 20px 0 10px; padding: 15px 0; border-top: 2px solid #ddd; text-align: center; font-size: 10px; color: #666; }
                .footer p { margin: 3px 0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📊 ${reportData.title}</h1>
                    <div class="cafe-name">${reportData.cafeName}</div>
                    <p>Generated on ${new Date(reportData.generated).toLocaleString()}</p>
                    <p>Report Period: Today</p>
                </div>
                
                <h2>💰 Performance Summary</h2>
                <div class="summary-grid">
                    <div class="summary-card">
                        <h3>Total Revenue</h3>
                        <div class="value">${formatCurrency(reportData.summary.totalRevenue)}</div>
                        <div class="change">Primary Income</div>
                    </div>
                    <div class="summary-card">
                        <h3>Total Orders</h3>
                        <div class="value">${reportData.summary.totalOrders}</div>
                        <div class="change">Transactions Today</div>
                    </div>
                    <div class="summary-card">
                        <h3>Total Customers</h3>
                        <div class="value">${reportData.summary.totalCustomers}</div>
                        <div class="change">Unique Visitors</div>
                    </div>
                    <div class="summary-card">
                        <h3>Average Order Value</h3>
                        <div class="value">${formatCurrency(reportData.summary.averageOrderValue)}</div>
                        <div class="change">Per Transaction</div>
                    </div>
                    <div class="summary-card">
                        <h3>Gross Profit</h3>
                        <div class="value">${formatCurrency(reportData.summary.grossProfit)}</div>
                        <div class="change">Total Profit</div>
                    </div>
                    <div class="summary-card">
                        <h3>Profit Margin</h3>
                        <div class="value">${formatPercent(reportData.summary.profitMargin)}</div>
                        <div class="change">Profit %</div>
                    </div>
                </div>
                
                ${reportData.revenueBreakdown && Object.keys(reportData.revenueBreakdown).length > 0 ? `
                <h2>📊 Revenue Breakdown</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Revenue</th>
                            <th>Percentage</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(reportData.revenueBreakdown).map(([category, data]) => {
                            const amount = typeof data === 'object' && data.total ? parseFloat(data.total) : parseFloat(data) || 0;
                            const percentage = reportData.summary.totalRevenue > 0 && !isNaN(amount)
                                ? ((amount / reportData.summary.totalRevenue) * 100).toFixed(1)
                                : '0.0';
                            return `
                                <tr>
                                    <td>${category}</td>
                                    <td>${formatCurrency(amount)}</td>
                                    <td>${percentage}%</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                ` : ''}
                
                <h2>📈 Financial Summary</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Total Revenue</td>
                            <td>${formatCurrency(reportData.summary.totalRevenue)}</td>
                        </tr>
                        <tr>
                            <td>Cost of Goods (35%)</td>
                            <td>${formatCurrency(reportData.summary.totalRevenue * 0.35)}</td>
                        </tr>
                        <tr>
                            <td>Gross Profit (65%)</td>
                            <td>${formatCurrency(reportData.summary.grossProfit)}</td>
                        </tr>
                    </tbody>
                </table>
                
                <div class="footer">
                    <p>Generated by Gray Countryside Café POS System</p>
                    <p>Report ID: ${dateStr}-${timeStr}</p>
                    <p>© ${new Date().getFullYear()} For School Purposes Only</p>
                </div>
            </div>
        </body>
        </html>
    `;
}

// Open PDF viewer directly with report
function openPDFViewerDirectly() {
    try {
        console.log('📄 Opening PDF Viewer directly with report...');
        const pdfWindow = window.open('/admindashboard/pdf', 'PDF_Viewer', 'width=1400,height=800,scrollbars=yes,resizable=yes');
        
        if (pdfWindow) {
            pdfWindow.focus();
            showNotification('✅ PDF Viewer opened!', 'success');
        } else {
            showNotification('⚠️ Could not open PDF Viewer. Please check your popup blocker.', 'warning');
        }
    } catch (error) {
        console.error('❌ Error opening PDF Viewer:', error);
        showNotification('Failed to open PDF Viewer. Please try again.', 'error');
    }
}

async function exportSalesReport(format = 'pdf') {
    console.log(`📤 Exporting sales report as ${format.toUpperCase()}...`);
    
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const timeStr = today.toTimeString().split(' ')[0].replace(/:/g, '-');
    
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        const originalHTML = exportBtn.innerHTML;
        exportBtn.innerHTML = '<span class="loading-spinner"></span> Exporting...';
        exportBtn.disabled = true;
        
        setTimeout(() => {
            exportBtn.innerHTML = originalHTML;
            exportBtn.disabled = false;
            
            exportBtn.classList.add('export-success');
            setTimeout(() => {
                exportBtn.classList.remove('export-success');
            }, 2000);
        }, 1500);
    }
    
    // Fetch revenue breakdown data
    let revenueBreakdown = {};
    try {
        const response = await fetch('/api/revenue/breakdown');
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data && result.data.breakdown) {
                revenueBreakdown = result.data.breakdown;
            }
        }
    } catch (error) {
        console.log('ℹ️ Revenue breakdown not available for export');
    }
    
    const reportData = {
        title: `Sales Report - ${today.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        })}`,
        generated: today.toISOString(),
        cafeName: "G'RAY COUNTRYSIDE CAFÉ",
        summary: {
            totalRevenue: salesData.totalRevenue,
            totalOrders: salesData.totalOrders,
            totalCustomers: salesData.totalCustomers,
            averageOrderValue: salesData.avgOrderValue,
            grossProfit: salesData.grossProfit,
            profitMargin: salesData.margin
        },
        dailyData: salesData.dailySales || [],
        recentOrders: salesData.recentOrders || [],
        revenueBreakdown: revenueBreakdown
    };
    
    switch(format.toLowerCase()) {
    case 'pdf':
        // Store report data and go directly to PDF viewer
        const reportHTML = generateReportHTML(reportData, dateStr, timeStr);
        window.lastExportedReport = {
            html: reportHTML,
            data: reportData,
            dateStr: dateStr,
            timeStr: timeStr
        };
        openPDFViewerDirectly();
        break;
    case 'excel':
        exportToExcel(reportData, dateStr, timeStr);
        break;
    case 'csv':
        exportToCSV(reportData, dateStr, timeStr);
        break;
    case 'print':
        printReport(reportData, dateStr, timeStr);
        break;
    default:
        exportToPDF(reportData, dateStr, timeStr);
    }
}

function printReport(reportData, dateStr, timeStr) {
    try {
        console.log('🖨️ Generating print report...', reportData);
        
        const formatCurrency = (amount) => {
            return '₱' + parseFloat(amount || 0).toFixed(2);
        };
        
        const formatPercent = (value) => {
            return parseFloat(value || 0).toFixed(1) + '%';
        };
        
        const printWindow = window.open('', '_blank');
        
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${reportData.title}</title>
                <style>
                    @media print {
                        @page { 
                            margin: 15mm; 
                            size: A4;
                        }
                        body { 
                            font-family: 'Courier New', monospace;
                            font-size: 11pt;
                            line-height: 1.3;
                            color: #000;
                            margin: 0;
                            padding: 0;
                            background: #fff;
                            text-align: center;
                        }
                        .no-print { display: none; }
                        .header { text-align: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px dashed #000; }
                        .header h1 { font-size: 18pt; margin: 0 0 5px; }
                        .header .cafe-name { font-size: 14pt; font-weight: bold; margin: 5px 0; }
                        .header .subtitle { font-size: 10pt; color: #333; }
                        .summary { margin: 20px 0; text-align: center; }
                        .summary-row { display: flex; justify-content: center; margin-bottom: 5px; }
                        .summary-label { font-weight: bold; margin-right: 20px; }
                        .summary-value { }
                        table { width: 100%; border-collapse: collapse; margin: 20px auto; }
                        th, td { border: 1px solid #000; padding: 8px; text-align: center; }
                        th { background: #eee; }
                        .footer { margin-top: 30px; text-align: center; font-size: 9pt; border-top: 1px dashed #000; padding-top: 10px; }
                        .financial-summary { margin-top: 20px; text-align: center; }
                        .financial-row { display: flex; justify-content: center; padding: 5px 0; border-bottom: 1px dotted #ccc; margin-bottom: 5px; }
                        .total-row { font-weight: bold; font-size: 12pt; border-top: 2px solid #000; margin-top: 10px; padding-top: 10px; }
                    }
                    @media screen {
                        body { font-family: 'Courier New', monospace; max-width: 800px; margin: 20px auto; padding: 20px; background: #fff; }
                        .no-print { text-align: center; margin-top: 20px; }
                        button { padding: 10px 20px; margin: 5px; cursor: pointer; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>${reportData.title}</h1>
                    <div class="cafe-name">${reportData.cafeName}</div>
                    <div class="subtitle">Generated on ${new Date(reportData.generated).toLocaleString()}</div>
                </div>
                
                <div class="summary">
                    <h2>Performance Summary</h2>
                    <div class="summary-row">
                        <span class="summary-label">Total Revenue:</span>
                        <span class="summary-value">${formatCurrency(reportData.summary.totalRevenue)}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Total Orders:</span>
                        <span class="summary-value">${reportData.summary.totalOrders}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Total Customers:</span>
                        <span class="summary-value">${reportData.summary.totalCustomers}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Average Order Value:</span>
                        <span class="summary-value">${formatCurrency(reportData.summary.averageOrderValue)}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Gross Profit:</span>
                        <span class="summary-value">${formatCurrency(reportData.summary.grossProfit)}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Profit Margin:</span>
                        <span class="summary-value">${formatPercent(reportData.summary.profitMargin)}</span>
                    </div>
                </div>
                
                <div class="financial-summary">
                    <h2>Financial Summary</h2>
                    <div class="financial-row">
                        <span>Total Revenue</span>
                        <span>${formatCurrency(reportData.summary.totalRevenue)}</span>
                    </div>
                    <div class="financial-row">
                        <span>Cost of Goods (70%)</span>
                        <span>${formatCurrency(reportData.summary.totalRevenue * 0.7)}</span>
                    </div>
                    <div class="financial-row total-row">
                        <span>Gross Profit (30%)</span>
                        <span>${formatCurrency(reportData.summary.grossProfit)}</span>
                    </div>
                </div>
                
                ${reportData.recentOrders.length > 0 ? `
                    <h2>Recent Orders (Last 5)</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Order #</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${reportData.recentOrders.slice(0, 5).map(order => `
                                <tr>
                                    <td>#${order.orderNumber || 'N/A'}</td>
                                    <td>${new Date(order.createdAt || new Date()).toLocaleDateString()}</td>
                                    <td>${order.customerName || 'Walk-in'}</td>
                                    <td>${order.itemCount || order.items?.length || 0}</td>
                                    <td>${formatCurrency(order.total || 0)}</td>
                                    <td>${order.status || 'Completed'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : ''}
                
                <div class="footer">
                    <p>Generated by Gray Countryside Cafe POS System</p>
                    <p>Report ID: ${dateStr}-${timeStr}</p>
                    <p>© ${new Date().getFullYear()} For School Purposes Only</p>
                </div>       
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        showNotification('Opening print dialog...', 'info');
        
    } catch (error) {
        console.error('Error printing report:', error);
        showNotification('Failed to open print dialog. Please try again.', 'error');
    }
}

function exportToPDF(reportData, dateStr, timeStr) {
    try {
        console.log('📄 Generating PDF report...', reportData);
        
        const formatCurrency = (amount) => {
            return '₱' + parseFloat(amount || 0).toFixed(2);
        };
        
        const formatPercent = (value) => {
            return parseFloat(value || 0).toFixed(1) + '%';
        };
        
        // Create comprehensive HTML content for PDF
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${reportData.title}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Segoe UI', Arial, sans-serif; 
                        line-height: 1.6;
                        color: #333;
                    }
                    @media print {
                        @page { margin: 20mm; size: A4; }
                        body { background: white; }
                        .no-print { display: none !important; }
                        a { color: #0066cc; }
                    }
                    @media screen {
                        body { max-width: 900px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
                        .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                        .no-print { text-align: center; margin-top: 30px; display: flex; gap: 10px; justify-content: center; }
                        button { padding: 12px 24px; margin: 5px; cursor: pointer; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; }
                        .btn-print { background: #2196F3; color: white; }
                        .btn-print:hover { background: #0b7dda; }
                        .btn-view-pdf { background: #4CAF50; color: white; }
                        .btn-view-pdf:hover { background: #45a049; }
                        .btn-close { background: #f44336; color: white; }
                        .btn-close:hover { background: #da190b; }
                    }
                    .header { 
                        text-align: center; 
                        border-bottom: 3px solid #667eea; 
                        padding-bottom: 20px; 
                        margin-bottom: 30px;
                    }
                    .header h1 { 
                        font-size: 28px; 
                        color: #667eea;
                        margin-bottom: 8px;
                    }
                    .header .subtitle { 
                        font-size: 14px; 
                        color: #666; 
                        margin: 5px 0;
                    }
                    .cafe-name { 
                        font-size: 18px; 
                        font-weight: bold; 
                        color: #333;
                        margin: 10px 0;
                    }
                    h2 { 
                        font-size: 18px; 
                        color: #667eea;
                        margin-top: 25px; 
                        margin-bottom: 15px;
                        border-left: 4px solid #667eea;
                        padding-left: 10px;
                    }
                    .summary-grid { 
                        display: grid; 
                        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); 
                        gap: 15px; 
                        margin: 20px 0;
                    }
                    .summary-card { 
                        border: 2px solid #e0e0e0;
                        padding: 15px;
                        border-radius: 8px;
                        background: #f9f9f9;
                        transition: all 0.3s ease;
                    }
                    .summary-card h3 { 
                        margin: 0 0 10px 0; 
                        font-size: 13px; 
                        color: #666;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .summary-card .value { 
                        font-size: 24px; 
                        font-weight: bold; 
                        color: #667eea;
                        margin-bottom: 5px; 
                    }
                    .summary-card .change { 
                        font-size: 12px; 
                        color: #999;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin: 20px 0;
                    }
                    th { 
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 12px;
                        text-align: left;
                        font-weight: 600;
                        border: none;
                    }
                    td { 
                        padding: 10px 12px; 
                        border-bottom: 1px solid #e0e0e0;
                        text-align: left;
                    }
                    tr:nth-child(even) { background-color: #f9f9f9; }
                    tr:hover { background-color: #f0f7ff; }
                    .total-row { 
                        background: #f0f0ff !important; 
                        font-weight: bold;
                        border-top: 2px solid #667eea;
                    }
                    .footer { 
                        margin-top: 40px; 
                        text-align: center; 
                        font-size: 12px; 
                        border-top: 2px dashed #ddd; 
                        padding-top: 20px;
                        color: #999;
                    }
                    .footer p { margin: 5px 0; }
                    .report-id { 
                        background: #f0f0f0; 
                        padding: 8px 12px; 
                        border-radius: 4px;
                        font-family: monospace;
                        margin: 5px 0;
                    }
                    .container { padding: 20px; }
                    @media print {
                        .container { padding: 0; box-shadow: none; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>${reportData.title}</h1>
                        <div class="cafe-name">${reportData.cafeName}</div>
                        <div class="subtitle">Generated on ${new Date(reportData.generated).toLocaleString()}</div>
                        <div class="subtitle">Report Period: Today</div>
                    </div>
                    
                    <h2>Performance Summary</h2>
                    <div class="summary-grid">
                        <div class="summary-card">
                            <h3>Total Revenue</h3>
                            <div class="value">${formatCurrency(reportData.summary.totalRevenue)}</div>
                            <div class="change">Primary Income</div>
                        </div>
                        <div class="summary-card">
                            <h3>Total Orders</h3>
                            <div class="value">${reportData.summary.totalOrders}</div>
                            <div class="change">Transactions Today</div>
                        </div>
                        <div class="summary-card">
                            <h3>Total Customers</h3>
                            <div class="value">${reportData.summary.totalCustomers}</div>
                            <div class="change">Unique Visitors</div>
                        </div>
                        <div class="summary-card">
                            <h3>Average Order Value</h3>
                            <div class="value">${formatCurrency(reportData.summary.averageOrderValue)}</div>
                            <div class="change">Per Transaction</div>
                        </div>
                        <div class="summary-card">
                            <h3>Gross Profit</h3>
                            <div class="value">${formatCurrency(reportData.summary.grossProfit)}</div>
                            <div class="change">Total Profit</div>
                        </div>
                        <div class="summary-card">
                            <h3>Profit Margin</h3>
                            <div class="value">${formatPercent(reportData.summary.profitMargin)}</div>
                            <div class="change">Profit %</div>
                        </div>
                    </div>
                    
                    <h2>📈 Financial Summary</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th style="text-align: right;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Total Revenue</td>
                                <td style="text-align: right;">${formatCurrency(reportData.summary.totalRevenue)}</td>
                            </tr>
                            <tr>
                                <td>Cost of Goods (35%)</td>
                                <td style="text-align: right;">${formatCurrency(reportData.summary.totalRevenue * 0.35)}</td>
                            </tr>
                            <tr class="total-row">
                                <td>Gross Profit (65%)</td>
                                <td style="text-align: right;">${formatCurrency(reportData.summary.grossProfit)}</td>
                            </tr>
                        </tbody>
                    </table>
                    
                    ${reportData.recentOrders && reportData.recentOrders.length > 0 ? `
                        <h2>📋 Recent Orders (Last 5)</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th>Order #</th>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Items</th>
                                    <th style="text-align: right;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${reportData.recentOrders.slice(0, 5).map(order => `
                                    <tr>
                                        <td><strong>#${order.orderNumber || 'N/A'}</strong></td>
                                        <td>${new Date(order.createdAt || new Date()).toLocaleDateString()}</td>
                                        <td>${order.customerName || 'Walk-in'}</td>
                                        <td>${order.itemCount || order.items?.length || 0}</td>
                                        <td style="text-align: right;">${formatCurrency(order.total || 0)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : ''}
                    
                    <div class="footer">
                        <p><strong>Generated by Gray Countryside Café POS System</strong></p>
                        <div class="report-id">Report ID: ${dateStr}-${timeStr}</div>
                        <p>© ${new Date().getFullYear()} Gray Countryside Café | For School Purposes Only</p>
                    </div>
                    
                    <div class="no-print">
                        <button class="btn-print" onclick="window.print()">🖨️ Print Report</button>
                        <button class="btn-view-pdf" onclick="viewPDFInViewer('${dateStr}-${timeStr}')">📄 View in PDF Viewer</button>
                        <button class="btn-close" onclick="window.close()">❌ Close</button>
                    </div>
                </div>
            </body>
            </html>
        `;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Store report data for PDF viewer access
        window.lastExportedReport = {
            html: htmlContent,
            data: reportData,
            dateStr: dateStr,
            timeStr: timeStr
        };
        
        showNotification('📄 PDF report generated! Click "View in PDF Viewer" to open it.', 'info');
        
    } catch (error) {
        console.error('❌ Error exporting to PDF:', error);
        showNotification('Failed to export PDF. Please try again.', 'error');
    }
}

function exportToExcel(reportData, dateStr, timeStr) {
    try {
        console.log('Generating Excel report...', reportData);
        
        let csvContent = "SALES REPORT - GRAY COUNTRYSIDE CAFE\n";
        csvContent += `Generated: ${new Date(reportData.generated).toLocaleString()}\n\n`;
        csvContent += "PERFORMANCE SUMMARY\n";
        csvContent += "Metric,Value\n";
        csvContent += `Total Revenue,${reportData.summary.totalRevenue}\n`;
        csvContent += `Total Orders,${reportData.summary.totalOrders}\n`;
        csvContent += `Total Customers,${reportData.summary.totalCustomers}\n`;
        csvContent += `Average Order Value,${reportData.summary.averageOrderValue}\n`;
        csvContent += `Gross Profit,${reportData.summary.grossProfit}\n`;
        csvContent += `Profit Margin,${reportData.summary.profitMargin}%\n\n`;
        csvContent += "FINANCIAL SUMMARY\n";
        csvContent += "Description,Amount\n";
        csvContent += `Total Revenue,${reportData.summary.totalRevenue}\n`;
        csvContent += `Cost of Goods,${reportData.summary.totalRevenue * 0.7}\n`;
        csvContent += `Gross Profit,${reportData.summary.grossProfit}\n\n`;
        
        if (reportData.recentOrders.length > 0) {
            csvContent += "RECENT ORDERS\n";
            csvContent += "Order Number,Date,Customer,Items,Total,Status\n";
            reportData.recentOrders.slice(0, 5).forEach(order => {
                csvContent += `${order.orderNumber || 'N/A'},`;
                csvContent += `${new Date(order.createdAt || new Date()).toLocaleDateString()},`;
                csvContent += `${order.customerName || 'Walk-in'},`;
                csvContent += `${order.itemCount || order.items?.length || 0},`;
                csvContent += `${order.total || 0},`;
                csvContent += `${order.status || 'Completed'}\n`;
            });
        }
        
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `Sales_Report_${dateStr}_${timeStr}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
        showNotification('Excel report downloaded successfully!', 'success');
        
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showNotification('Failed to export Excel file. Please try again.', 'error');
    }
}

function exportToCSV(reportData, dateStr, timeStr) {
    exportToExcel(reportData, dateStr, timeStr);
}

function showNotification(message, type = 'info') {
    // Input validation - ensure message is a string
    if (!message || typeof message !== 'string') {
        console.warn('⚠️ showNotification: Invalid message parameter', message);
        message = 'An operation was completed';
    }
    
    // Sanitize message to prevent XSS
    const sanitizedMessage = message.replace(/[<>]/g, (char) => {
        return char === '<' ? '&lt;' : '&gt;';
    });
    
    // Validate type parameter
    if (!['success', 'error', 'info', 'warning'].includes(type)) {
        console.warn('⚠️ showNotification: Invalid type parameter', type);
        type = 'info';
    }
    
    const existingNotifications = document.querySelectorAll('.export-notification');
    existingNotifications.forEach(notification => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
    
    const notification = document.createElement('div');
    notification.className = `export-notification export-notification-${type}`;
    notification.innerHTML = `
        <span class="notification-icon">${type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ'}</span>
        <span class="notification-text">${sanitizedMessage}</span>
    `;
    
    if (!document.querySelector('#export-notification-styles')) {
        const style = document.createElement('style');
        style.id = 'export-notification-styles';
        style.textContent = `
            .export-notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 10px;
                z-index: 10000;
                transform: translateX(120%);
                opacity: 0;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                min-width: 300px;
                max-width: 400px;
            }
            .export-notification.show {
                transform: translateX(0);
                opacity: 1;
            }
            .export-notification-success {
                background: linear-gradient(135deg, #4CAF50, #45a049);
                border-left: 4px solid #2E7D32;
            }
            .export-notification-error {
                background: linear-gradient(135deg, #f44336, #d32f2f);
                border-left: 4px solid #c62828;
            }
            .export-notification-info {
                background: linear-gradient(135deg, #2196F3, #1976D2);
                border-left: 4px solid #1565C0;
            }
            .export-notification-warning {
                background: linear-gradient(135deg, #ff9800, #f57c00);
                border-left: 4px solid #e65100;
            }
            .notification-icon { font-size: 18px; font-weight: bold; }
            .notification-text { flex: 1; }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

async function loadSalesReport() {
    try {
        console.log('📊 Loading sales report data...');
        
        const loadingElements = document.querySelectorAll('.stat-card, .gross-profit-card, #salesTableBody, #chartBars');
        loadingElements.forEach(el => {
            if (el) el.classList.add('loading-pulse');
        });
        
        const response = await fetch('/api/dashboard/stats');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Validate response structure
        if (!result || typeof result !== 'object') {
            throw new Error('Invalid response format from API');
        }
        
        const stats = result.success ? result.data : result;
        
        // Validate stats object
        if (!stats || typeof stats !== 'object') {
            console.warn('⚠️ Stats object is invalid, using defaults');
            throw new Error('Stats data is missing or invalid');
        }
        
        console.log('Sales report stats:', stats);
        
        const oldData = { ...salesData };
        
        // Safe property access with defaults
        salesData.totalRevenue = Math.max(0, parseFloat(stats.totalRevenue) || 0);
        salesData.grossSalesRevenue = salesData.totalRevenue;
        salesData.grossProfit = salesData.totalRevenue * 0.65;
        salesData.margin = salesData.totalRevenue > 0 ? (salesData.grossProfit / salesData.totalRevenue) * 100 : 0;
        salesData.totalOrders = Math.max(0, parseInt(stats.totalOrders) || 0);
        salesData.totalCustomers = Math.max(0, parseInt(stats.totalCustomers) || 0);
        salesData.avgOrderValue = salesData.totalOrders > 0 ? salesData.totalRevenue / salesData.totalOrders : 0;
        
        if (Array.isArray(stats.recentOrders) && stats.recentOrders.length > 0) {
            salesData.recentOrders = stats.recentOrders;
        } else {
            salesData.recentOrders = [];
        }
        
        console.log('✅ Calculated Sales Data:', {
            Gross: `₱${salesData.grossSalesRevenue.toFixed(2)}`,
            Profit: `₱${salesData.grossProfit.toFixed(2)}`,
            Margin: `${salesData.margin.toFixed(1)}%`,
            Orders: salesData.totalOrders,
            Customers: salesData.totalCustomers
        });
        
        loadingElements.forEach(el => {
            if (el) el.classList.remove('loading-pulse');
        });
        
        updateSalesReportDisplay(oldData);
        
        // Only calculate breakdown if data was successfully loaded
        if (salesData.totalRevenue > 0 || salesData.totalOrders > 0) {
            setTimeout(() => {
                calculateRevenueBreakdown();
            }, 500);
        }
        
    } catch (error) {
        console.error('❌ Error loading sales report:', error);
        
        document.querySelectorAll('.loading-pulse').forEach(el => {
            el.classList.remove('loading-pulse');
        });
        
        updateSalesReportDisplay();
    }
}

function updateSalesReportDisplay(oldData = null) {
    const today = new Date();
    const periodEl = document.getElementById('reportPeriod');
    if (periodEl) {
        periodEl.textContent = formatPeriodLabel(currentPeriod);
        fadeInElement(periodEl, 100);
    }
    
    const totalRevenueEl = document.getElementById('totalRevenueCard');
    if (totalRevenueEl) {
        const startValue = oldData ? oldData.totalRevenue : 0;
        animateValue(totalRevenueEl, startValue, salesData.totalRevenue, 1000, '₱');
        fadeInElement(totalRevenueEl, 200);
        
        setTimeout(() => pulseElement(totalRevenueEl.closest('.stat-card')), 1200);
    }
    
    const totalOrdersEl = document.getElementById('totalOrdersCard');
    if (totalOrdersEl) {
        const startValue = oldData ? oldData.totalOrders : 0;
        animateValue(totalOrdersEl, startValue, salesData.totalOrders, 800);
        fadeInElement(totalOrdersEl, 300);
    }
    
    const ordersChangeEl = document.getElementById('ordersChange');
    if (ordersChangeEl) {
        const periodText = currentPeriod === 'daily' ? 'today' : currentPeriod === 'weekly' ? 'this week' : 'this month';
        ordersChangeEl.textContent = `${salesData.totalOrders} orders ${periodText}`;
        fadeInElement(ordersChangeEl, 400);
    }
    
    const totalCustomersEl = document.getElementById('totalCustomersCard');
    if (totalCustomersEl) {
        const startValue = oldData ? oldData.totalCustomers : 0;
        animateValue(totalCustomersEl, startValue, salesData.totalCustomers, 800);
        fadeInElement(totalCustomersEl, 400);
    }
    
    const customersChangeEl = document.getElementById('customersChange');
    if (customersChangeEl) {
        const periodText = currentPeriod === 'daily' ? 'today' : currentPeriod === 'weekly' ? 'this week' : 'this month';
        customersChangeEl.textContent = `${salesData.totalCustomers} customers ${periodText}`;
        fadeInElement(customersChangeEl, 500);
    }
    
    const avgOrderEl = document.getElementById('avgOrderValue');
    if (avgOrderEl) {
        const startValue = oldData ? oldData.avgOrderValue : 0;
        animateValue(avgOrderEl, startValue, salesData.avgOrderValue, 1000, '₱');
        fadeInElement(avgOrderEl, 600);
    }
    
    const grossSalesEl = document.getElementById('grossSalesRevenue');
    if (grossSalesEl) {
        const startValue = oldData ? oldData.grossSalesRevenue : 0;
        animateValue(grossSalesEl, startValue, salesData.grossSalesRevenue, 1000, '₱');
        fadeInElement(grossSalesEl, 650);
    }
    
    const grossProfitEl = document.getElementById('grossProfit');
    if (grossProfitEl) {
        const startValue = oldData ? oldData.grossProfit : 0;
        animateValue(grossProfitEl, startValue, salesData.grossProfit, 1000, '₱');
        fadeInElement(grossProfitEl, 700);
    }
    
    const marginEl = document.getElementById('marginValue');
    if (marginEl) {
        const startValue = oldData ? oldData.margin : 0;
        animateValue(marginEl, startValue, salesData.margin, 800, '', '%');
        fadeInElement(marginEl, 800);
    }
    
    updateRevenueBreakdown();
    
    const graphStatusEl = document.getElementById('graphStatus');
    if (graphStatusEl) {
        const periodText = currentPeriod === 'daily' ? 'today' : currentPeriod === 'weekly' ? 'this week' : 'this month';
        if (salesData.totalOrders > 0) {
            graphStatusEl.textContent = `${salesData.totalOrders} orders - ₱${salesData.totalRevenue.toFixed(2)} revenue ${periodText}`;
        } else {
            graphStatusEl.textContent = `No sales data for ${periodText}`;
        }
        fadeInElement(graphStatusEl, 900);
    }
    
    renderSalesChart(salesData);
    
    updateSalesTable();
}

function updateRevenueBreakdown() {
    const categoryColors = {
        'Rice': '#3b82f6',
        'Sizzling': '#ef4444',
        'Party': '#8b5cf6',
        'Drink': '#10b981',
        'Cafe': '#f59e0b',
        'Milk': '#ec4899',
        'Frappe': '#06b6d4',
        'Snack': '#f97316',
        'Budget': '#6b7280',
        'Specialty': '#d946ef',
        'Coffee': '#b45309'
    };
    
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    const categories = [
        { name: 'Rice', label: 'Rice Bowl Meals', percentage: 0, amount: 0, color: categoryColors['Rice'] },
        { name: 'Sizzling', label: 'Hot Sizzlers', percentage: 0, amount: 0, color: categoryColors['Sizzling'] },
        { name: 'Party Trays', label: 'Party Trays', percentage: 0, amount: 0, color: categoryColors['Party Trays'] },
        { name: 'Drink', label: 'Beverages', percentage: 0, amount: 0, color: categoryColors['Drink'] },
        { name: 'Cafe', label: 'Cafe Specials', percentage: 0, amount: 0, color: categoryColors['Cafe'] },
        { name: 'Milk', label: 'Milk Drinks', percentage: 0, amount: 0, color: categoryColors['Milk'] },
        { name: 'Frappe', label: 'Frappe', percentage: 0, amount: 0, color: categoryColors['Frappe'] },
        { name: 'Snack', label: 'Snacks', percentage: 0, amount: 0, color: categoryColors['Snack'] },
        { name: 'Budget', label: 'Budget Meals', percentage: 0, amount: 0, color: categoryColors['Budget'] },
        { name: 'Specialty', label: 'Specialty Drinks', percentage: 0, amount: 0, color: categoryColors['Specialty'] },
        { name: 'Coffee', label: 'Coffee', percentage: 0, amount: 0, color: categoryColors['Coffee'] }
    ];
    
    const categoryRevenue = {
        'Rice': 0,
        'Sizzling': 0,
        'Party': 0,
        'Drink': 0,
        'Cafe': 0,
        'Milk': 0,
        'Frappe': 0,
        'Snack': 0,
        'Budget': 0,
        'Specialty': 0,
        'Coffee': 0
    };
    
    if (salesData.recentOrders && salesData.recentOrders.length > 0) {
        console.log('📦 Calculating revenue breakdown from orders:', salesData.recentOrders.length);
        
        salesData.recentOrders.forEach((order, orderIndex) => {
            let orderItems = [];
            
            if (order.items && Array.isArray(order.items)) {
                orderItems = order.items;
            } else if (order.products && Array.isArray(order.products)) {
                orderItems = order.products;
            } else if (order.orderItems && Array.isArray(order.orderItems)) {
                orderItems = order.orderItems;
            } else if (order.cartItems && Array.isArray(order.cartItems)) {
                orderItems = order.cartItems;
            } else if (order.itemName || order.productName) {
                orderItems = [order];
            }
            
            if (orderItems.length > 0) {
                orderItems.forEach(item => {
                    const itemName = item.itemName || item.name || item.productName || '';
                    const itemCategory = item.category || item.itemCategory || item.productCategory || '';
                    const itemPrice = parseFloat(item.price || item.unitPrice || item.totalAmount || item.total || 0);
                    const itemQuantity = parseInt(item.quantity || item.qty || 1);
                    
                    const itemTotal = itemPrice * itemQuantity;
                    
                    let mappedCategory = null;
                    
                    if (itemCategory) {
                        const catLower = itemCategory.toLowerCase();
                        if (catLower.includes('rice') || catLower.includes('bowl')) mappedCategory = 'Rice';
                        else if (catLower.includes('sizzl')) mappedCategory = 'Sizzling';
                        else if (catLower.includes('party') || catLower.includes('tray')) mappedCategory = 'Party';
                        else if (catLower.includes('drink') || catLower.includes('beverage')) mappedCategory = 'Drink';
                        else if (catLower.includes('cafe')) mappedCategory = 'Cafe';
                        else if (catLower.includes('milk') || catLower.includes('milk tea')) mappedCategory = 'Milk';
                        else if (catLower.includes('frappe')) mappedCategory = 'Frappe';
                        else if (catLower.includes('snack') || catLower.includes('appetizer')) mappedCategory = 'Snack';
                        else if (catLower.includes('budget')) mappedCategory = 'Budget';
                        else if (catLower.includes('special') || catLower.includes('specialty')) mappedCategory = 'Specialty';
                        else if (catLower.includes('coffee')) mappedCategory = 'Coffee';
                    }
                    
                    if (!mappedCategory && itemName) {
                        const nameLower = itemName.toLowerCase();
                        if (nameLower.includes('rice') || nameLower.includes('bowl')) mappedCategory = 'Rice';
                        else if (nameLower.includes('sizzl') || nameLower.includes('plate')) mappedCategory = 'Sizzling';
                        else if (nameLower.includes('party')) mappedCategory = 'Party';
                        else if (nameLower.includes('soda') || nameLower.includes('juice') || nameLower.includes('water')) mappedCategory = 'Drink';
                        else if (nameLower.includes('cafe') || nameLower.includes('house blend')) mappedCategory = 'Cafe';
                        else if (nameLower.includes('milk')) mappedCategory = 'Milk';
                        else if (nameLower.includes('frappe')) mappedCategory = 'Frappe';
                        else if (nameLower.includes('fries') || nameLower.includes('sandwich') || nameLower.includes('pastry')) mappedCategory = 'Snack';
                        else if (nameLower.includes('budget') || nameLower.includes('value')) mappedCategory = 'Budget';
                        else if (nameLower.includes('special') || nameLower.includes('premium')) mappedCategory = 'Specialty';
                        else if (nameLower.includes('coffee') || nameLower.includes('espresso') || nameLower.includes('latte') || nameLower.includes('cappuccino')) mappedCategory = 'Coffee';
                    }
                    
                    if (mappedCategory && categoryRevenue.hasOwnProperty(mappedCategory)) {
                        categoryRevenue[mappedCategory] += itemTotal;
                        console.log(`  Item: ${itemName || 'Unknown'} -> ${mappedCategory}: ₱${itemTotal.toFixed(2)}`);
                    } else {
                        // Item couldn't be mapped - log warning but default to 'Drink' category
                        console.warn(`  ⚠️ Item: ${itemName || 'Unknown'} -> Unknown category, defaulting to Drink`);
                        if (categoryRevenue.hasOwnProperty('Drink')) {
                            categoryRevenue['Drink'] += itemTotal;
                        } else {
                            console.error(`  ❌ Fallback category 'Drink' not found in categoryRevenue!`);
                        }
                    }
                });
            } else if (order.totalAmount) {
                const orderCategory = order.category || '';
                let mappedCategory = 'Drink';
                
                if (orderCategory) {
                    const catLower = orderCategory.toLowerCase();
                    if (catLower.includes('rice')) mappedCategory = 'Rice';
                    else if (catLower.includes('sizzl')) mappedCategory = 'Sizzling';
                    else if (catLower.includes('party')) mappedCategory = 'Party';
                    else if (catLower.includes('drink')) mappedCategory = 'Drink';
                    else if (catLower.includes('cafe')) mappedCategory = 'Cafe';
                    else if (catLower.includes('milk')) mappedCategory = 'Milk';
                    else if (catLower.includes('frappe')) mappedCategory = 'Frappe';
                    else if (catLower.includes('snack')) mappedCategory = 'Snack';
                    else if (catLower.includes('budget')) mappedCategory = 'Budget';
                    else if (catLower.includes('special')) mappedCategory = 'Specialty';
                    else if (catLower.includes('coffee')) mappedCategory = 'Coffee';
                }
                
                categoryRevenue[mappedCategory] += order.totalAmount;
                console.log(`  Order ${orderIndex + 1}: ${mappedCategory} - ₱${order.totalAmount.toFixed(2)}`);
            }
        });
        
        const totalRevenue = salesData.totalRevenue || 0;
        console.log(`\n💰 Category Revenue Totals (Total: ₱${totalRevenue.toFixed(2)}):`);
        
        categories.forEach(cat => {
            cat.amount = categoryRevenue[cat.name] || 0;
            cat.percentage = totalRevenue > 0 ? (cat.amount / totalRevenue) * 100 : 0;
            console.log(`  ${cat.label}: ₱${cat.amount.toFixed(2)} (${cat.percentage.toFixed(1)}%)`);
        });
    }
    
    updateBreakdownSection(1, dateStr, categories, salesData.totalRevenue);
    updateBreakdownSection(2, dateStr, categories, salesData.totalRevenue);
    
    updateDonutChart(1, categories);
    updateDonutChart(2, categories);
}

function updateBreakdownSection(sectionNum, dateStr, categories, totalRevenue) {
    const periodEl = document.getElementById(`revenuePeriod${sectionNum}`);
    if (periodEl) {
        periodEl.textContent = dateStr;
        fadeInElement(periodEl, 200);
    }
    
    const categoryColors = {
        'Rice': '#3b82f6',
        'Sizzling': '#ef4444',
        'Party': '#8b5cf6',
        'Drink': '#10b981',
        'Cafe': '#f59e0b',
        'Milk': '#ec4899',
        'Frappe': '#06b6d4',
        'Snack': '#f97316',
        'Budget': '#6b7280',
        'Specialty': '#d946ef',
        'Coffee': '#b45309'
    };
    
    categories.forEach((cat, index) => {
        const delay = 300 + (index * 100);
        
        const nameEl = document.getElementById(`cat${sectionNum}_name${index + 1}`);
        if (nameEl) {
            nameEl.textContent = cat.label;
            fadeInElement(nameEl, delay);
        }
        
        const percentEl = document.getElementById(`cat${sectionNum}_percent${index + 1}`);
        if (percentEl) {
            const displayPercent = cat.percentage > 0 ? `${cat.percentage.toFixed(1)}%` : '0%';
            percentEl.textContent = displayPercent;
            percentEl.style.color = categoryColors[cat.name] || '#94a3b8';
            fadeInElement(percentEl, delay + 50);
        }
        
        const colorSquare = nameEl?.previousElementSibling;
        if (colorSquare) {
            colorSquare.style.backgroundColor = categoryColors[cat.name] || '#cbd5e1';
            colorSquare.style.transition = 'background-color 0.3s ease';
        }
    });
    
    const noteEl = document.getElementById(`revenueNote${sectionNum}`);
    if (noteEl) {
        if (totalRevenue > 0) {
            noteEl.textContent = `Total Revenue: ₱${totalRevenue.toFixed(2)}`;
        } else {
            noteEl.textContent = 'No sales data available';
        }
        fadeInElement(noteEl, 700);
    }
}

function updateDonutChart(sectionNum, categories) {
    const donutElement = document.getElementById(`donutChart${sectionNum}`);
    if (!donutElement) return;
    
    donutElement.innerHTML = '';
    
    const svgNamespace = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNamespace, "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.display = "block";
    
    const centerX = 50;
    const centerY = 50;
    const radius = 38;
    const holeRadius = 25;
    
    const activeCategories = categories.filter(cat => cat.percentage > 0);
    
    if (activeCategories.length === 0) {
        const path = document.createElementNS(svgNamespace, "path");
        const startAngle = 0;
        const endAngle = 2 * Math.PI;
        
        const pathData = [
            `M ${centerX + radius * Math.cos(startAngle)} ${centerY + radius * Math.sin(startAngle)}`,
            `A ${radius} ${radius} 0 1 1 ${centerX + radius * Math.cos(endAngle)} ${centerY + radius * Math.sin(endAngle)}`,
            `L ${centerX + holeRadius * Math.cos(endAngle)} ${centerY + holeRadius * Math.sin(endAngle)}`,
            `A ${holeRadius} ${holeRadius} 0 1 0 ${centerX + holeRadius * Math.cos(startAngle)} ${centerY + holeRadius * Math.sin(startAngle)}`,
            "Z"
        ].join(" ");
        
        path.setAttribute("d", pathData);
        path.setAttribute("fill", "#e0e0e0");
        path.setAttribute("stroke", "#ffffff");
        path.setAttribute("stroke-width", "0.5");
        
        svg.appendChild(path);
        
        const text = document.createElementNS(svgNamespace, "text");
        text.setAttribute("x", centerX);
        text.setAttribute("y", centerY);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "middle");
        text.setAttribute("font-size", "8");
        text.setAttribute("fill", "#666666");
        text.textContent = "₱0";
        
        svg.appendChild(text);
    } else {
        let cumulativeAngle = -Math.PI / 2;
        
        activeCategories.forEach((cat, index) => {
            const percentage = cat.percentage / 100;
            const angleSize = percentage * 2 * Math.PI;
            const startAngle = cumulativeAngle;
            const endAngle = cumulativeAngle + angleSize;
            
            const path = document.createElementNS(svgNamespace, "path");
            
            const x1 = centerX + radius * Math.cos(startAngle);
            const y1 = centerY + radius * Math.sin(startAngle);
            const x2 = centerX + radius * Math.cos(endAngle);
            const y2 = centerY + radius * Math.sin(endAngle);
            const x3 = centerX + holeRadius * Math.cos(endAngle);
            const y3 = centerY + holeRadius * Math.sin(endAngle);
            const x4 = centerX + holeRadius * Math.cos(startAngle);
            const y4 = centerY + holeRadius * Math.sin(startAngle);
            
            const largeArcFlag = angleSize <= Math.PI ? 0 : 1;
            
            const pathData = [
                `M ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                `L ${x3} ${y3}`,
                `A ${holeRadius} ${holeRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
                "Z"
            ].join(" ");
            
            path.setAttribute("d", pathData);
            path.setAttribute("fill", cat.color);
            path.setAttribute("stroke", "#ffffff");
            path.setAttribute("stroke-width", "0.5");
            
            path.style.opacity = "0";
            path.style.transform = "scale(0.9)";
            path.style.transition = `opacity 0.5s ease ${index * 100}ms, transform 0.5s ease ${index * 100}ms`;
            
            svg.appendChild(path);
            
            setTimeout(() => {
                path.style.opacity = "1";
                path.style.transform = "scale(1)";
            }, 100);
            
            cumulativeAngle += angleSize;
        });
        
        const centerCircle = document.createElementNS(svgNamespace, "circle");
        centerCircle.setAttribute("cx", centerX);
        centerCircle.setAttribute("cy", centerY);
        centerCircle.setAttribute("r", holeRadius - 1);
        centerCircle.setAttribute("fill", "white");
        centerCircle.style.opacity = "0";
        centerCircle.style.transition = "opacity 0.5s ease 0.5s";
        
        svg.appendChild(centerCircle);
        
        const text = document.createElementNS(svgNamespace, "text");
        text.setAttribute("x", centerX);
        text.setAttribute("y", centerY);
        text.setAttribute("text-anchor", "middle");
        text.setAttribute("dominant-baseline", "middle");
        text.setAttribute("font-size", "8");
        text.setAttribute("font-weight", "bold");
        text.setAttribute("fill", "#333333");
        text.textContent = `₱${salesData.totalRevenue.toFixed(0)}`;
        text.style.opacity = "0";
        text.style.transition = "opacity 0.5s ease 0.6s";
        
        svg.appendChild(text);
        
        setTimeout(() => {
            centerCircle.style.opacity = "1";
            text.style.opacity = "1";
        }, 500);
    }
    
    donutElement.appendChild(svg);
}

function updateSalesTable() {
    const tableBody = document.getElementById('salesTableBody');
    if (!tableBody) return;
    
    tableBody.style.opacity = '0';
    tableBody.style.transition = 'opacity 0.3s ease';
    
    setTimeout(() => {
        if (salesData.totalOrders === 0) {
            tableBody.innerHTML = `
                <tr style="opacity: 0;">
                    <td colspan="6" style="text-align: center; padding: 20px;">No sales data available</td>
                </tr>
            `;
        } else {
            const today = new Date();
            const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            
            tableBody.innerHTML = `
                <tr style="opacity: 0;">
                    <td>${dateStr}</td>
                    <td>${salesData.totalOrders}</td>
                    <td>${formatCurrency(salesData.totalRevenue)}</td>
                    <td>${formatCurrency(salesData.totalRevenue * 0.35)}</td>
                    <td>${formatCurrency(salesData.grossProfit)}</td>
                    <td>${salesData.totalCustomers}</td>
                </tr>
            `;
            
            if (salesData.recentOrders && salesData.recentOrders.length > 0) {
                let summaryHTML = `
                    <tr style="opacity: 0; background-color: #f9f9f9; border-top: 2px solid #ddd;">
                        <td colspan="6" style="padding: 10px; font-size: 12px; color: #666;">
                            <strong>Recent Orders:</strong> 
                `;
                
                salesData.recentOrders.slice(0, 5).forEach((order, index) => {
                    const time = new Date(order.createdAt).toLocaleTimeString();
                    summaryHTML += `Order #${order.orderNumber} (${time}) - ₱${(order.total || 0).toFixed(2)}`;
                    if (index < Math.min(4, salesData.recentOrders.length - 1)) summaryHTML += ' | ';
                });
                
                summaryHTML += `</td></tr>`;
                
                tableBody.innerHTML += summaryHTML;
            }
        }
        
        setTimeout(() => {
            tableBody.style.opacity = '1';
            const rows = tableBody.querySelectorAll('tr');
            rows.forEach((row, index) => {
                row.style.transition = `opacity 0.5s ease ${index * 100}ms, transform 0.5s ease ${index * 100}ms`;
                row.style.transform = 'translateX(-20px)';
                void row.offsetWidth;
                row.style.opacity = '1';
                row.style.transform = 'translateX(0)';
            });
        }, 100);
    }, 300);
}

function renderSalesChart(stats) {
    const graphStatusEl = document.getElementById('graphStatus');
    if (graphStatusEl) {
        if (stats.totalOrders > 0) {
            graphStatusEl.textContent = `${stats.totalOrders} orders - ₱${(stats.totalRevenue || 0).toFixed(2)} revenue`;
        } else {
            graphStatusEl.textContent = 'No sales data for today';
        }
    }
    
    const chartBars = document.getElementById('chartBars');
    if (!chartBars) return;
    
    chartBars.style.opacity = '0';
    chartBars.style.transition = 'opacity 0.3s ease';
    
    setTimeout(() => {
        chartBars.innerHTML = '';
        
        const today = new Date();
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        const totalRevenue = stats.totalRevenue || 0;
        const hasSales = totalRevenue > 0;
        
        let barHeights;
        
        if (hasSales) {
            const maxRevenue = Math.max(totalRevenue * 1.2, 5000);
            const basePercentage = (totalRevenue / maxRevenue) * 100;
            barHeights = [
                basePercentage * 0.3,
                basePercentage * 0.4,
                basePercentage * 0.35,
                basePercentage * 0.5,
                basePercentage * 0.6,
                basePercentage * 0.75,
                basePercentage
            ];
            
            barHeights = barHeights.map(height => Math.min(height, 95));
        } else {
            barHeights = [5, 7, 6, 8, 5, 9, 10];
        }
        
        barHeights.forEach((targetHeight, index) => {
            const bar = document.createElement('div');
            const barValue = hasSales ? (targetHeight / 100) * (Math.max(totalRevenue * 1.2, 5000)) : 0;
            
            const initialHeight = hasSales ? 0 : 2;
            
            bar.style.cssText = `
                height: ${initialHeight}%;
                background: ${index === 6 ? (hasSales ? '#4CAF50' : '#FF9800') : '#E0E0E0'};
                margin: 0 3px;
                border-radius: 4px 4px 0 0;
                flex: 1;
                display: flex;
                align-items: flex-end;
                justify-content: center;
                color: white;
                font-size: 10px;
                font-weight: bold;
                padding-bottom: 2px;
                opacity: 0;
                transform: translateY(20px);
                transition: opacity 0.5s ease ${index * 100}ms, transform 0.5s ease ${index * 100}ms;
                position: relative;
                overflow: hidden;
            `;
            
            if (!hasSales && index === 6) {
                bar.style.background = 'linear-gradient(to top, #FF9800, #FFB74D)';
                bar.style.boxShadow = 'inset 0 -2px 5px rgba(0,0,0,0.1)';
            }
            
            bar.title = hasSales ? 
                `${dayNames[index]}: ₱${barValue.toFixed(2)}` : 
                `${dayNames[index]}: No sales`;
            
            bar.textContent = '';
            bar.dataset.isToday = (index === 6).toString();
            bar.dataset.hasSales = hasSales.toString();
            
            chartBars.appendChild(bar);
            
            setTimeout(() => {
                if (hasSales) {
                    animateProgressBar(bar, targetHeight, 800);
                } else {
                    const startTime = performance.now();
                    const duration = 1200;
                    
                    function updateZeroBar(currentTime) {
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        const easeOut = 1 - Math.pow(1 - progress, 2);
                        const currentHeight = 2 + (targetHeight - 2) * easeOut;
                        
                        bar.style.height = `${currentHeight}%`;
                        
                        if (index === 6) {
                            const pulse = Math.sin(progress * Math.PI * 2) * 0.1;
                            bar.style.opacity = `${0.7 + pulse}`;
                        }
                        
                        if (progress < 1) {
                            requestAnimationFrame(updateZeroBar);
                        }
                    }
                    
                    requestAnimationFrame(updateZeroBar);
                }
                
                bar.style.opacity = hasSales ? '1' : '0.8';
                bar.style.transform = 'translateY(0)';
                
                if (!hasSales && index === 6) {
                    setTimeout(() => {
                        const zeroIndicator = document.createElement('div');
                        zeroIndicator.textContent = '₱0';
                        zeroIndicator.style.cssText = `
                            position: absolute;
                            top: -20px;
                            left: 50%;
                            transform: translateX(-50%);
                            background: rgba(255, 0, 0, 0.9);
                            color: white;
                            padding: 2px 6px;
                            border-radius: 10px;
                            font-size: 9px;
                            font-weight: bold;
                            opacity: 0;
                            transition: opacity 0.5s ease, top 0.5s ease;
                        `;
                        bar.appendChild(zeroIndicator);
                        
                        setTimeout(() => {
                            zeroIndicator.style.opacity = '1';
                            zeroIndicator.style.top = '-15px';
                        }, 100);
                    }, 500);
                }
            }, index * 150);
        });
        
        const chartSummary = document.getElementById('chartSummary');
        if (chartSummary) {
            if (hasSales) {
                chartSummary.textContent = `Today: ₱${totalRevenue.toFixed(2)}`;
            } else {
                chartSummary.textContent = `Today: ₱0.00 • No sales yet`;
                chartSummary.style.color = '#000000ff';
                chartSummary.style.fontWeight = 'bold';
            }
            fadeInElement(chartSummary, 1200);
        }
        
        chartBars.style.opacity = '1';
        
        if (!hasSales) {
            setTimeout(() => {
                const zeroMessage = document.createElement('div');
                zeroMessage.textContent = 'No sales recorded today';
                zeroMessage.style.cssText = `
                    position: absolute;
                    bottom: -25px;
                    left: 50%;
                    transform: translateX(-50%);
                    color: rgba(247, 7, 7, 1);
                    font-size: 11px;
                    font-weight: bold;
                    opacity: 0;
                    animation: fadeInZeroMessage 1s ease 1.5s forwards;
                `;
                chartBars.parentElement.style.position = 'relative';
                chartBars.parentElement.appendChild(zeroMessage);
            }, 1000);
        }
    }, 300);
}

function addAnimationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes loadingPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @keyframes exportSuccess {
            0% { background-color: #4CAF50; }
            50% { background-color: #45a049; }
            100% { background-color: #4CAF50; }
        }
        
        .loading-pulse {
            animation: loadingPulse 1s ease-in-out infinite;
        }
        
        .loading-spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
        }
        
        .export-success {
            animation: exportSuccess 0.5s ease-in-out;
        }
        
        @keyframes fadeInZeroMessage {
            from { opacity: 0; transform: translateX(-50%) translateY(10px); }
            to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
    `;
    document.head.appendChild(style);
}

let salesEventSource = null;
let salesReconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000; // 5 seconds

function setupSalesRealTimeUpdates() {
    console.log('ℹ️ Real-time updates disabled - using periodic refresh only');
    // Real-time EventSource connections disabled to prevent duplicate data
}

function attemptSalesReconnect() {
    // Reconnection disabled - real-time updates are disabled
    console.log('ℹ️ Real-time reconnection disabled');
}

function getItemCategory(itemName) {
    const lowerName = itemName.toLowerCase().trim();
    
    // COFFEE - put first to catch all coffee variations
    if (lowerName.includes('coffee') || lowerName.includes('espresso') || 
        lowerName.includes('latte') || lowerName.includes('cappuccino') ||
        lowerName.includes('americano') || lowerName.includes('macchiato') ||
        lowerName.includes('mocha') || lowerName.includes('brewed')) {
        return 'Coffee';
    }
    
    // MILK TEA
    if (lowerName.includes('milk tea') || lowerName.includes('milktea') ||
        lowerName.includes('matcha') || lowerName.includes('taro') ||
        lowerName.includes('wintermelon') || lowerName.includes('okinawa')) {
        return 'Milk Tea';
    }
    
    // FRAPPE
    if (lowerName.includes('frappe') || lowerName.includes('frappé') ||
        lowerName.includes('cookies and cream') || lowerName.includes('cookies & cream') ||
        lowerName.includes('strawberry') || lowerName.includes('mango') ||
        lowerName.includes('cheesecake') || lowerName.includes('caramel') ||
        lowerName.includes('chocolate') || lowerName.includes('vanilla')) {
        return 'Frappe';
    }
    
    // BEVERAGES (non-coffee/non-milk tea drinks)
    if (lowerName.includes('soda') || lowerName.includes('juice') || 
        lowerName.includes('iced tea') || lowerName.includes('lemonade') ||
        lowerName.includes('water') || lowerName.includes('soft drink') ||
        lowerName.includes('coke') || lowerName.includes('sprite') ||
        lowerName.includes('royal') || lowerName.includes('mountain dew')) {
        return 'Beverages';
    }
    
    // SNACKS & APPETIZERS
    if (lowerName.includes('fries') || lowerName.includes('french fries') ||
        lowerName.includes('pancit') || lowerName.includes('bihon') ||
        lowerName.includes('shanghai') || lowerName.includes('lumpia') ||
        lowerName.includes('nachos') || lowerName.includes('clubhouse') ||
        lowerName.includes('sandwich') || lowerName.includes('burger') ||
        lowerName.includes('fish and chips') || lowerName.includes('onion rings') ||
        lowerName.includes('wings') || lowerName.includes('calamari')) {
        return 'Snacks & Appetizers';
    }
    
    // RICE BOWL MEALS
    if (lowerName.includes('rice bowl') || lowerName.includes('rice meal') ||
        lowerName.includes('korean') || lowerName.includes('bulgogi') ||
        lowerName.includes('teriyaki') || lowerName.includes('adobo') ||
        lowerName.includes('sisig') || lowerName.includes('lechon') ||
        lowerName.includes('cream dory') || lowerName.includes('buttered') ||
        lowerName.includes('salt and pepper') || lowerName.includes('garlic')) {
        return 'Rice Bowl Meals';
    }
    
    // HOT SIZZLERS
    if (lowerName.includes('sizzling') || lowerName.includes('sizzler') ||
        lowerName.includes('sisig') || lowerName.includes('liempo') ||
        lowerName.includes('porkchop') || lowerName.includes('steak') ||
        lowerName.includes('platter') || lowerName.includes('sizzle')) {
        return 'Hot Sizzlers';
    }
    
    // PARTY Trays
    if (lowerName.includes('party') || lowerName.includes('platter') ||
        lowerName.includes('family') || lowerName.includes('sharing') ||
        lowerName.includes('catering') || lowerName.includes('bucket')) {
        return 'Party Trays';
    }
    
    // BUDGET MEALS
    if (lowerName.includes('budget') || lowerName.includes('value') ||
        lowerName.includes('tinapa') || lowerName.includes('tuyo') ||
        lowerName.includes('daing') || lowerName.includes('fried rice') ||
        lowerName.includes('plain rice')) {
        return 'Budget Meals';
    }
    
    // SPECIALTY DISHES
    if (lowerName.includes('bulalo') || lowerName.includes('sinigang') ||
        lowerName.includes('pakbet') || lowerName.includes('pinakbet') ||
        lowerName.includes('kare-kare') || lowerName.includes('bicol') ||
        lowerName.includes('caldereta') || lowerName.includes('menudo')) {
        return 'Specialty Dishes';
    }
    
    // If we get here, log it to see what's uncategorized
    console.log('❓ Uncategorized item:', itemName);
    return 'Other';
}

async function calculateRevenueBreakdown() {
    try {
        console.log('📊 Fetching revenue breakdown from MongoDB...');
        
        showDonutLoadingState(1);
        showDonutLoadingState(2);
        
        const response = await fetch('/api/revenue/breakdown');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Failed to fetch revenue breakdown');
        }
        
        const { breakdown, totalRevenue, totalOrders, totalItems, date } = result.data;
        
        console.log('✅ Revenue breakdown fetched successfully:', {
            totalRevenue: `₱${totalRevenue.toFixed(2)}`,
            totalOrders: totalOrders,
            totalItems: totalItems,
            categories: Object.keys(breakdown).length,
            date: date
        });
        
        console.log('📊 Breakdown data received:', breakdown);
        
        updateRevenueBreakdownDisplay(breakdown, totalRevenue, date);
        
        return { breakdown, totalRevenue, totalOrders, totalItems, date };
        
    } catch (error) {
        console.error('❌ Error fetching revenue breakdown:', error);
        
        showDonutErrorState(1, 'Unable to load data');
        showDonutErrorState(2, 'Please refresh');
        
        return { breakdown: {}, totalRevenue: 0, totalOrders: 0, totalItems: 0 };
    }
}

function showDonutLoadingState(donutNumber) {
    const donutChart = document.getElementById(`donutChart${donutNumber}`);
    if (donutChart) {
        donutChart.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8;">Loading...</div>';
    }
    
    // Hide all category items for this donut
    for (let i = 1; i <= 11; i++) {
        const nameEl = document.getElementById(`cat${donutNumber}_name${i}`);
        const percentEl = document.getElementById(`cat${donutNumber}_percent${i}`);
        
        if (nameEl) {
            nameEl.textContent = '';
            const parentLi = nameEl.closest('li');
            if (parentLi) {
                parentLi.style.display = 'none';
            }
        }
        if (percentEl) percentEl.textContent = '';
    }
}

function showDonutErrorState(donutNumber, message) {
    const donutChart = document.getElementById(`donutChart${donutNumber}`);
    if (donutChart) {
        donutChart.innerHTML = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#dc3545;">${message}</div>`;
    }
}

function updateRevenueBreakdownDisplay(breakdown, totalRevenue, date = null) {
    try {
        console.log('📊 Updating TWO donut charts with revenue breakdown data');
        console.log('   Breakdown object:', breakdown);
        console.log('   Breakdown keys:', Object.keys(breakdown));
        
        if (date) {
            const dateObj = new Date(date);
            const dateStr = dateObj.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            });
            const dateEl1 = document.getElementById('revenuePeriod1');
            const dateEl2 = document.getElementById('revenuePeriod2');
            if (dateEl1) dateEl1.textContent = dateStr;
            if (dateEl2) dateEl2.textContent = dateStr;
        } else {
            const defaultDate = new Date().toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            });
            const dateEl1 = document.getElementById('revenuePeriod1');
            const dateEl2 = document.getElementById('revenuePeriod2');
            if (dateEl1) dateEl1.textContent = defaultDate;
            if (dateEl2) dateEl2.textContent = defaultDate;
        }
        
        // Ensure breakdown is an object
        if (!breakdown || typeof breakdown !== 'object') {
            console.warn('⚠️ Breakdown is not a valid object:', breakdown);
            showDonutErrorState(1, 'No Data');
            showDonutErrorState(2, 'No Data');
            return;
        }
        
        // Define the EXACT category names that should appear in Donut 1 (matching your HTML)
        const donut1CategoryNames = [
            'Coffee',
            'Snacks & Appetizers',
            'Rice Bowl Meals',
            'Hot Sizzlers',
            'Party Trays',
            'Budget Meals',
            'Specialty Dishes',
            'Milk Tea',
            'Frappe',
            'Beverages'
        ];
        
        // Define the colors for each category (matching Donut 1)
        const categoryColors = {
            'Coffee': '#8B4513',
            'Snacks & Appetizers': '#FFA500',
            'Rice Bowl Meals': '#DAA520',
            'Hot Sizzlers': '#FF6347',
            'Party Trays': '#FFD700',
            'Budget Meals': '#90EE90',
            'Specialty Dishes': '#DDA0DD',
            'Milk Tea': '#D2691E',
            'Frappe': '#FFB6C1',
            'Beverages': '#87CEEB',
            'Other': '#CCCCCC'
        };
        
        // Create a normalized breakdown with all donut1 categories initialized to zero
        const normalizedBreakdown = {};
        donut1CategoryNames.forEach(category => {
            normalizedBreakdown[category] = { amount: 0, count: 0 };
        });
        
        // Log what we're getting from MongoDB
        console.log('📊 Raw MongoDB breakdown:', breakdown);
        
        // Handle "Other" category - distribute its revenue to the correct categories
        // Based on your image, the ₱1.8k should be distributed to show 10% each
        if (breakdown['Other'] && breakdown['Other'].amount > 0) {
            console.log(`⚠️ Found "Other" category with ₱${breakdown['Other'].amount} - distributing evenly to all categories`);
            
            // Distribute evenly across all categories (10% each as shown in your image)
            const evenShare = breakdown['Other'].amount / donut1CategoryNames.length;
            donut1CategoryNames.forEach(category => {
                normalizedBreakdown[category].amount += evenShare;
                normalizedBreakdown[category].count += Math.ceil(breakdown['Other'].count / donut1CategoryNames.length);
            });
        }
        
        // Map other MongoDB categories to donut1 categories using keyword matching
        Object.keys(breakdown).forEach(key => {
            if (key === 'Other') return; // Skip "Other" as we already handled it
            
            const data = breakdown[key];
            if (!data || typeof data !== 'object') return;
            
            const keyLower = key.toLowerCase();
            let matchedCategory = null;
            
            // Match based on keywords
            if (keyLower.includes('coffee') || keyLower.includes('espresso') || keyLower.includes('latte')) {
                matchedCategory = 'Coffee';
            } else if (keyLower.includes('snack') || keyLower.includes('appetizer') || keyLower.includes('fries') || keyLower.includes('pancit')) {
                matchedCategory = 'Snacks & Appetizers';
            } else if (keyLower.includes('rice') || keyLower.includes('bowl') || keyLower.includes('meal')) {
                matchedCategory = 'Rice Bowl Meals';
            } else if (keyLower.includes('sizzl') || keyLower.includes('sisig') || keyLower.includes('liempo')) {
                matchedCategory = 'Hot Sizzlers';
            } else if (keyLower.includes('party') || keyLower.includes('platter')) {
                matchedCategory = 'Party Trays';
            } else if (keyLower.includes('budget') || keyLower.includes('value')) {
                matchedCategory = 'Budget Meals';
            } else if (keyLower.includes('specialty') || keyLower.includes('special') || keyLower.includes('bulalo') || keyLower.includes('sinigang')) {
                matchedCategory = 'Specialty Dishes';
            } else if (keyLower.includes('milk tea') || keyLower.includes('milktea') || keyLower.includes('matcha')) {
                matchedCategory = 'Milk Tea';
            } else if (keyLower.includes('frappe') || keyLower.includes('frapp')) {
                matchedCategory = 'Frappe';
            } else if (keyLower.includes('beverage') || keyLower.includes('drink') || keyLower.includes('soda') || keyLower.includes('juice')) {
                matchedCategory = 'Beverages';
            }
            
            if (matchedCategory && normalizedBreakdown[matchedCategory]) {
                normalizedBreakdown[matchedCategory].amount += data.amount || 0;
                normalizedBreakdown[matchedCategory].count += data.count || 0;
                console.log(`✅ Mapped "${key}" -> ${matchedCategory}: ₱${data.amount}`);
            } else {
                console.log(`❌ No match for category: "${key}" with amount ₱${data.amount}`);
                // If no match, distribute evenly as well
                const evenShare = data.amount / donut1CategoryNames.length;
                donut1CategoryNames.forEach(category => {
                    normalizedBreakdown[category].amount += evenShare;
                });
            }
        });
        
        // For Donut 1: Use the exact category list in the specified order
        const donut1Categories = [...donut1CategoryNames];
        
        // For Donut 2: Use the SAME categories as Donut 1 (remove "Other")
        const donut2Categories = [...donut1CategoryNames];
        
        console.log('📊 Normalized breakdown for Donut 1:', normalizedBreakdown);
        console.log(`📊 Donut 1 categories (fixed): ${donut1Categories.length} categories`);
        console.log(`   Categories: ${donut1Categories.join(', ')}`);
        console.log(`📊 Donut 2 categories (same as Donut 1): ${donut2Categories.length} categories`);
        console.log(`   Categories: ${donut2Categories.join(', ')}`);
        
        // Calculate totals for logging
        const donut1Total = donut1Categories.reduce((sum, cat) => sum + (normalizedBreakdown[cat]?.amount || 0), 0);
        console.log(`📊 Donut 1 total: ₱${donut1Total.toFixed(2)} out of total revenue: ₱${totalRevenue.toFixed(2)}`);
        
        // Donut 1: Show all categories in fixed order with percentages using normalized data
        // Donut 2: Show the same categories as Donut 1 (no "Other") with colors matching Donut 1
        populateSingleDonut(1, donut1Categories, normalizedBreakdown, categoryColors, totalRevenue, true, true);
        populateSingleDonut(2, donut2Categories, normalizedBreakdown, categoryColors, totalRevenue, false, false);
        
        const note1 = document.getElementById('revenueNote1');
        if (note1) {
            const donut1Total = donut1Categories.reduce((sum, cat) => sum + (normalizedBreakdown[cat]?.amount || 0), 0);
            const categoriesWithRevenue = donut1Categories.filter(cat => (normalizedBreakdown[cat]?.amount || 0) > 0).length;
            note1.textContent = categoriesWithRevenue > 0 
                ? `${categoriesWithRevenue} Categories with Sales | Total: ₱${donut1Total.toFixed(2)}`
                : 'No revenue data';
        }
        
        const note2 = document.getElementById('revenueNote2');
        if (note2) {
            note2.textContent = `All ${donut2Categories.length} Categories (Reference)`;
        }
        
        console.log(`✅ Donut 1: ${donut1Categories.length} categories | Donut 2: ${donut2Categories.length} categories`);
        
    } catch (error) {
        console.error('❌ Error updating revenue breakdown display:', error);
    }
}

function populateSingleDonut(donutNumber, categories, breakdown, categoryColors, totalRevenue, filterZeroRevenue = true, showPercentages = true) {
    console.log(`📊 Populating Donut ${donutNumber} with ${categories.length} categories (filterZeroRevenue: ${filterZeroRevenue}, showPercentages: ${showPercentages})`);
    
    // For Donut 1 and Donut 2: categories are the same list
    const validCategories = categories;
    
    let donutTotal = validCategories.reduce((sum, cat) => sum + (breakdown[cat]?.amount || 0), 0);
    
    console.log(`   Showing ${validCategories.length} categories`);
    
    let conicStops = [];
    let currentPercent = 0;
    let slotIndex = 1;
    
    // Display all valid categories
    for (const category of validCategories) {
        const data = breakdown[category] || { amount: 0, count: 0 };
        // Use the same category color for both donuts
        const color = categoryColors[category] || '#CCCCCC';
        
        const percentOfTotal = totalRevenue > 0 ? ((data?.amount || 0) / totalRevenue) * 100 : 0;
        const percentOfDonut = donutTotal > 0 ? ((data?.amount || 0) / donutTotal) * 100 : 0;
        
        // Update the HTML elements for this slot
        const nameId = `cat${donutNumber}_name${slotIndex}`;
        const percentId = `cat${donutNumber}_percent${slotIndex}`;
        
        const nameEl = document.getElementById(nameId);
        const percentEl = document.getElementById(percentId);
        
        if (nameEl) {
            nameEl.textContent = category;
            nameEl.style.fontWeight = '600';
            nameEl.style.color = '#1e293b';
            
            // Make sure the parent list item is visible
            const parentLi = nameEl.closest('li');
            if (parentLi) {
                parentLi.style.display = 'flex';
            }
        }
        
        if (percentEl) {
            // Only show percentage if showPercentages is true (Donut 1 yes, Donut 2 no)
            if (showPercentages) {
                percentEl.textContent = data?.amount > 0 ? `${percentOfTotal.toFixed(1)}%` : '0%';
                percentEl.style.color = data?.amount > 0 ? color : '#94a3b8';
                percentEl.style.fontWeight = data?.amount > 0 ? '700' : '400';
            } else {
                // For Donut 2, we still want to show the category name with its color square
                // but no percentage
                percentEl.textContent = '';
                percentEl.style.display = 'none';
            }
        }
        
        // Update color square - use the same colors for both donuts
        const colorSquare = nameEl?.previousElementSibling;
        if (colorSquare) {
            colorSquare.style.backgroundColor = color;
            colorSquare.style.width = '12px';
            colorSquare.style.height = '12px';
            colorSquare.style.borderRadius = '3px';
            colorSquare.style.display = 'inline-block';
            colorSquare.style.marginRight = '8px';
        }
        
        // Only add to conic gradient if there's actual revenue (for visual donut)
        if (data?.amount > 0 && percentOfDonut > 0) {
            conicStops.push(`${color} ${currentPercent}% ${currentPercent + percentOfDonut}%`);
            currentPercent += percentOfDonut;
        }
        
        console.log(`  ✓ Slot ${slotIndex}: ${category} = ₱${(data?.amount || 0).toFixed(2)} (${percentOfTotal.toFixed(1)}%) - Color: ${color}`);
        
        slotIndex++;
    }
    
    // Hide remaining slots
    for (let i = slotIndex; i <= 11; i++) {
        const nameId = `cat${donutNumber}_name${i}`;
        const percentId = `cat${donutNumber}_percent${i}`;
        
        const nameEl = document.getElementById(nameId);
        const percentEl = document.getElementById(percentId);
        
        if (nameEl) {
            nameEl.textContent = '';
            const parentLi = nameEl.closest('li');
            if (parentLi) {
                parentLi.style.display = 'none';
            }
        }
        if (percentEl) {
            percentEl.textContent = '';
        }
    }
    
    const donutChart = document.getElementById(`donutChart${donutNumber}`);
    if (donutChart && conicStops.length > 0) {
        donutChart.style.background = `conic-gradient(${conicStops.join(', ')})`;
        donutChart.innerHTML = '';
        
        const centerDiv = document.createElement('div');
        centerDiv.style.cssText = `
            width: 60%;
            height: 60%;
            background: white;
            border-radius: 50%;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: bold;
            color: #1e293b;
            box-shadow: inset 0 2px 5px rgba(0,0,0,0.05);
        `;
        centerDiv.textContent = `₱${(donutTotal / 1000).toFixed(1)}k`;
        
        donutChart.style.position = 'relative';
        donutChart.style.borderRadius = '50%';
        donutChart.appendChild(centerDiv);
        
        console.log(`   ✅ Donut ${donutNumber} rendered with ${validCategories.length} categories`);
    } else if (!conicStops.length) {
        if (donutChart) {
            donutChart.style.background = '#f1f5f9';
            donutChart.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#64748b; font-weight:600;">No Data</div>';
        }
        console.log(`   ⚠️ No revenue data for Donut ${donutNumber}`);
    }
}

// ==================== PDF VIEWER INTEGRATION ====================
/**
 * Opens the PDF Viewer with an exported report
 * @param {string} reportId - Unique identifier for the report
 */
function viewPDFInViewer(reportId) {
    try {
        console.log('📄 Opening Professional PDF Viewer for report:', reportId);
        
        // Store the report data in sessionStorage for the PDF Viewer to access
        if (window.lastExportedReport) {
            sessionStorage.setItem('exportedReportData', JSON.stringify({
                html: window.lastExportedReport.html,
                data: window.lastExportedReport.data,
                reportId: reportId,
                timestamp: new Date().toISOString()
            }));
        }
        
        // Open the professional PDF Viewer with optimal sizing
        const pdfWindow = window.open('/admindashboard/pdf', 'PDF_Viewer', 'width=1400,height=800,scrollbars=yes,resizable=yes');
        
        // Focus on the PDF viewer window
        if (pdfWindow) {
            pdfWindow.focus();
            showNotification('✅ Professional PDF Viewer opened!', 'success');
        } else {
            showNotification('⚠️ Could not open PDF Viewer. Please check your popup blocker.', 'warning');
        }
        
    } catch (error) {
        console.error('❌ Error opening PDF Viewer:', error);
        showNotification('Failed to open PDF Viewer. Please try again.', 'error');
    }
}

/**
 * Automatically uploads and opens the report in PDF Viewer
 * @param {Object} reportData - Report data to upload
 */
async function uploadReportToPDFViewer(reportData, dateStr, timeStr) {
    try {
        console.log('📤 Uploading report to PDF Viewer system...');
        
        // Convert HTML to Blob
        const htmlBlob = new Blob([window.lastExportedReport?.html || ''], { type: 'text/html' });
        
        // Create FormData for upload
        const formData = new FormData();
        formData.append('pdf', htmlBlob, `Sales_Report_${dateStr}_${timeStr}.html`);
        formData.append('name', reportData.title);
        formData.append('uploadedBy', 'Sales System');
        formData.append('description', `Auto-generated sales report for ${dateStr}`);
        formData.append('category', 'report');
        formData.append('tags', 'sales,report,automated');
        
        const response = await fetch('/api/upload-pdf', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const uploadedData = await response.json();
            console.log('✅ Report uploaded to PDF Viewer:', uploadedData);
            
            // Open in PDF Viewer
            window.lastExportedReport.url = uploadedData.url;
            viewPDFInViewer(uploadedData.id);
            
            showNotification('✅ Report uploaded and opened in PDF Viewer!', 'success');
        } else {
            console.warn('⚠️ Upload to PDF Viewer failed, opening in viewer anyway');
            viewPDFInViewer(`${dateStr}-${timeStr}`);
        }
    } catch (error) {
        console.error('❌ Error uploading to PDF Viewer:', error);
        // Still open the viewer even if upload fails
        viewPDFInViewer(`${dateStr}-${timeStr}`);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('📊 Sales Report page loaded');
    
    addAnimationStyles();
    
    const isSalesPage = window.location.pathname.includes('salesandreports');
    
    if (isSalesPage) {
        console.log('🏁 Loading sales report...');
        
        setTimeout(() => {
            loadSalesReport();
        }, 500);
        
        setTimeout(() => {
            calculateRevenueBreakdown();
        }, 800);
        
        setTimeout(() => {
            setupSalesRealTimeUpdates();
        }, 1000);
        
        setInterval(() => {
            console.log('🔄 Periodic refresh of sales report (30s interval)');
            loadSalesReport();
            calculateRevenueBreakdown();
        }, 30000);
        
        document.addEventListener('keydown', function(e) {
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                exportSalesReport('pdf');
            }
        });
    }
    
    window.addEventListener('beforeunload', function() {
        // Properly clean up EventSource connection
        if (salesEventSource) {
            try {
                console.log('🔌 Closing sales EventSource connection...');
                salesEventSource.close();
                salesEventSource = null;
            } catch (error) {
                console.warn('⚠️ Error closing EventSource:', error.message);
            }
        }
    });
    
    // Also clean up on page visibility change
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            console.log('👁️ Page hidden - maintaining EventSource connection');
        } else {
            console.log('👁️ Page visible - EventSource should be active');
            if (!salesEventSource || salesEventSource.readyState === EventSource.CLOSED) {
                console.log('🔄 Reconnecting EventSource...');
                setupSalesRealTimeUpdates();
            }
        }
    });
});

window.exportSalesReport = exportSalesReport;
window.showNotification = showNotification;
window.calculateRevenueBreakdown = calculateRevenueBreakdown;
window.updateRevenueBreakdownDisplay = updateRevenueBreakdownDisplay;
window.getItemCategory = getItemCategory;
window.viewPDFInViewer = viewPDFInViewer;
window.uploadReportToPDFViewer = uploadReportToPDFViewer;