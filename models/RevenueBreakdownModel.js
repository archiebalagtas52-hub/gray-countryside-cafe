// revenue-breakdown-model.js
// ES6+ Model for Revenue Breakdown Management - NO SAMPLE DATA

class RevenueBreakdownModel {
    constructor() {
        this.state = {
            currentPeriod: null,
            dateRange: {
                start: null,
                end: null
            },
            categories: [],
            revenueData: null,
            isLoading: false,
            error: null
        };
        
        // Color palette for categories (only visual, no data)
        this.CATEGORY_COLORS = [
            '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
            '#ec4899', '#14b8a6', '#f97316', '#6b7280', '#84cc16',
            '#6366f1'
        ];
        
        this.observers = [];
    }

    // Initialize with empty state
    async initialize(period = null, customRange = null) {
        this.state.isLoading = true;
        this.notifyObservers();
        
        try {
            this.state.currentPeriod = period;
            this.state.dateRange = customRange || this.getDefaultDateRange(period);
            // Data will be loaded separately via fetchRevenueData
        } catch (error) {
            this.state.error = error.message;
        } finally {
            this.state.isLoading = false;
            this.notifyObservers();
        }
    }

    // Get date range without any default data
    getDefaultDateRange(period) {
        if (!period) return { start: null, end: null };
        
        const now = new Date();
        const end = new Date(now);
        const start = new Date(now);

        switch(period) {
            case 'daily':
                start.setDate(now.getDate() - 1);
                break;
            case 'weekly':
                start.setDate(now.getDate() - 7);
                break;
            case 'monthly':
                start.setMonth(now.getMonth() - 1);
                break;
            case 'quarterly':
                start.setMonth(now.getMonth() - 3);
                break;
            case 'yearly':
                start.setFullYear(now.getFullYear() - 1);
                break;
            default:
                start.setDate(now.getDate() - 1);
        }

        return { start, end };
    }

    // Fetch revenue data from API (to be implemented with actual endpoint)
    async fetchRevenueData(apiEndpoint, params = {}) {
        this.state.isLoading = true;
        this.notifyObservers();
        
        try {
            const queryString = new URLSearchParams({
                period: this.state.currentPeriod || '',
                startDate: this.state.dateRange.start?.toISOString() || '',
                endDate: this.state.dateRange.end?.toISOString() || '',
                ...params
            }).toString();

            const response = await fetch(`${apiEndpoint}?${queryString}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.state.revenueData = data;
            this.processRevenueCategories();
            
        } catch (error) {
            this.state.error = error.message;
            console.error('Failed to fetch revenue data:', error);
        } finally {
            this.state.isLoading = false;
            this.notifyObservers();
        }
    }

    // Process revenue categories for display
    processRevenueCategories() {
        if (!this.state.revenueData?.categories) {
            this.state.categories = [];
            return;
        }

        // Sort categories by revenue (if revenue exists)
        this.state.categories = [...this.state.revenueData.categories]
            .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
            .map((cat, index) => ({
                name: cat.name || '—',
                revenue: cat.revenue || 0,
                orders: cat.orders || 0,
                percentage: cat.percentage || 0,
                color: this.CATEGORY_COLORS[index % this.CATEGORY_COLORS.length],
                revenueFormatted: this.formatCurrency(cat.revenue || 0),
                percentageFormatted: this.formatPercentage(cat.percentage || 0)
            }));
    }

    // Format currency
    formatCurrency(value) {
        if (value === null || value === undefined) return '₱0.00';
        
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2
        }).format(value);
    }

    // Format percentage
    formatPercentage(value) {
        if (value === null || value === undefined) return '0%';
        return `${Number(value).toFixed(1)}%`;
    }

    // Format date range
    formatDateRange() {
        if (!this.state.dateRange.start || !this.state.dateRange.end) {
            return 'No period selected';
        }

        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        };

        const startStr = this.state.dateRange.start.toLocaleDateString('en-US', options);
        const endStr = this.state.dateRange.end.toLocaleDateString('en-US', options);

        return `${startStr} - ${endStr}`;
    }

    // Get breakdown for first donut (by category)
    getCategoryBreakdown() {
        const categories = this.state.categories;
        const totalRevenue = this.state.revenueData?.totalRevenue || 0;

        return {
            period: this.formatDateRange(),
            categories: categories.slice(0, 11), // Limit to 11 categories for display
            totalRevenue: this.formatCurrency(totalRevenue),
            note: categories.length ? 
                `Total revenue from ${categories.length} categories` : 
                'No category data available'
        };
    }

    // Get breakdown for second donut (by time period)
    getTimeBreakdown() {
        const dailyData = this.state.revenueData?.dailyBreakdown || [];
        const totalRevenue = dailyData.reduce((sum, day) => sum + (day.revenue || 0), 0);

        // Group days into segments for display
        const segments = dailyData.slice(0, 11).map((day, index) => ({
            name: day.date ? new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }) : '—',
            revenue: day.revenue || 0,
            percentage: totalRevenue ? ((day.revenue || 0) / totalRevenue) * 100 : 0,
            color: this.CATEGORY_COLORS[index % this.CATEGORY_COLORS.length]
        }));

        return {
            period: 'Daily Breakdown',
            categories: segments,
            totalRevenue: this.formatCurrency(totalRevenue),
            note: dailyData.length ? 
                `Average daily revenue: ${this.formatCurrency(totalRevenue / dailyData.length)}` : 
                'No daily data available'
        };
    }

    // Generate conic-gradient string for donut chart
    generateConicGradient(categories) {
        if (!categories || categories.length === 0) {
            return '#e2e8f0'; // Default gray for empty state
        }

        // Filter out categories with 0 percentage
        const validCategories = categories.filter(cat => (cat.percentage || 0) > 0);
        
        if (validCategories.length === 0) {
            return '#e2e8f0';
        }

        let gradient = 'conic-gradient(';
        let startAngle = 0;

        validCategories.forEach((cat, index) => {
            const endAngle = startAngle + ((cat.percentage || 0) * 3.6); // Convert to degrees
            
            if (index > 0) {
                gradient += ', ';
            }
            
            gradient += `${cat.color || '#cbd5e1'} ${startAngle}deg ${endAngle}deg`;
            startAngle = endAngle;
        });

        // Fill remaining circle if total percentage < 100
        if (startAngle < 360) {
            gradient += `, #e2e8f0 ${startAngle}deg 360deg`;
        }

        gradient += ')';
        return gradient;
    }

    // Update donut chart in DOM
    updateDonutChart(containerId, categories, innerTextElement) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const gradient = this.generateConicGradient(categories);
        container.style.background = gradient;

        // Update inner text with total or placeholder
        if (innerTextElement) {
            const total = categories.reduce((sum, cat) => sum + (cat.revenue || 0), 0);
            innerTextElement.textContent = total > 0 ? '₱' : '—';
        }
    }

    // Update legend items
    updateLegend(catNames, catPercents, categories) {
        if (!catNames || !catPercents) return;

        for (let i = 0; i < 11; i++) {
            const category = categories[i];
            const nameElement = catNames[i];
            const percentElement = catPercents[i];

            if (nameElement) {
                nameElement.textContent = category?.name || '—';
            }
            
            if (percentElement) {
                percentElement.textContent = category?.percentageFormatted || '—';
            }
        }
    }

    // Observer pattern for UI updates
    addObserver(callback) {
        this.observers.push(callback);
    }

    removeObserver(callback) {
        this.observers = this.observers.filter(obs => obs !== callback);
    }

    notifyObservers() {
        this.observers.forEach(callback => callback(this.state));
    }

    // Clear all data
    clearData() {
        this.state = {
            currentPeriod: null,
            dateRange: {
                start: null,
                end: null
            },
            categories: [],
            revenueData: null,
            isLoading: false,
            error: null
        };
        this.notifyObservers();
    }

    // Set period and refresh
    setPeriod(period) {
        this.state.currentPeriod = period;
        this.state.dateRange = this.getDefaultDateRange(period);
        this.notifyObservers();
    }

    // Set custom date range
    setCustomDateRange(start, end) {
        this.state.dateRange = { start, end };
        this.notifyObservers();
    }

    // Get current state
    getState() {
        return { ...this.state };
    }

    // Check if has data
    hasData() {
        return this.state.revenueData !== null && 
               this.state.categories.length > 0;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RevenueBreakdownModel;
}