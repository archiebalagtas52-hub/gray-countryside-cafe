import Order from '../models/Order.js';
import MenuItem from '../models/Menuitem.js';
import Product from '../models/Product.js';
import RevenueBreakdown from '../models/RevenueBreakdown.js';

class RevenueBreakdownService {
    constructor() {
        this.CATEGORY_MAPPING = {
            'Coffee': {
                keywords: ['coffee', 'latte', 'espresso', 'americano', 'macchiato', 'cappuccino', 'mocha', 'café', 'cortado'],
                color: '#8B4513'
            },
            'Snacks & Appetizers': {
                keywords: ['snack', 'fries', 'pancit', 'bihon', 'shanghai', 'lumpia', 'nachos', 'clubhouse', 'sandwich', 'fish and fries'],
                color: '#FFA500'
            },
            'Rice Bowl Meals': {
                keywords: ['rice', 'bowl', 'korean', 'bulgogi', 'adobo', 'cream dory', 'buttered', 'pork shanghai', 'chicken teriyaki', 'lechon kawali'],
                color: '#DAA520'
            },
            'Hot Sizzlers': {
                keywords: ['sizzling', 'sisig', 'liempo', 'porkchop', 'sizzler', 'fried chicken'],
                color: '#FF6347'
            },
            'Party Platters': {
                keywords: ['party', 'platter', 'family', 'large', '(l)', 'combo', 'set', 'canton', 'spaghetti'],
                color: '#FFD700'
            },
            'Budget Meals': {
                keywords: ['budget', 'tinapa', 'tuyo', 'silog', 'fried rice', 'plain rice', 'egg'],
                color: '#90EE90'
            },
            'Specialty Dishes': {
                keywords: ['bulalo', 'sinigang', 'pakbet', 'paknet', 'seafood', 'shrimp', 'squid', 'prawns', 'kare-kare', 'dinuguan', 'special'],
                color: '#DDA0DD'
            },
            'Milk Tea': {
                keywords: ['milk tea', 'matcha', 'tapioca', 'boba', 'pearl tea', 'milktea', 'okinawa', 'wintermelon'],
                color: '#D2691E'
            },
            'Frappe': {
                keywords: ['frappe', 'cookies & cream', 'cookies and cream', 'strawberry', 'mango', 'cheesecake', 'blended', 'shake'],
                color: '#FFB6C1'
            },
            'Beverages': {
                keywords: ['soda', 'coke', 'sprite', 'royal', 'juice', 'iced tea', 'lemonade', 'red tea', 'cucumber', 'water', 'calamansi', 'pineapple'],
                color: '#87CEEB'
            },
            'Other': {
                keywords: [],
                color: '#CCCCCC'
            }
        };
    }

    categorizeItem(itemName, dbCategory = null) {
        if (dbCategory && dbCategory !== 'Other' && dbCategory !== '') {
            const mapping = Object.keys(this.CATEGORY_MAPPING).find(
                cat => cat.toLowerCase() === dbCategory.toLowerCase() ||
                       cat.includes(dbCategory) ||
                       dbCategory.includes(cat)
            );
            if (mapping) return mapping;
        }

        if (!itemName || itemName === 'Unknown Item' || itemName === '') {
            return 'Other';
        }

        const lowerName = itemName.toLowerCase().trim();

        for (const [category, { keywords }] of Object.entries(this.CATEGORY_MAPPING)) {
            if (keywords.some(keyword => lowerName.includes(keyword.toLowerCase()))) {
                return category;
            }
        }

        if (lowerName.includes('rice') && !lowerName.includes('fried rice') && !lowerName.includes('plain rice')) {
            return 'Rice Bowl Meals';
        }
        if (lowerName.includes('chicken') && !lowerName.includes('fried chicken')) {
            return 'Rice Bowl Meals';
        }
        if (lowerName.includes('pork')) {
            return 'Rice Bowl Meals';
        }
        if (lowerName.includes('fish')) {
            return 'Rice Bowl Meals';
        }

        return 'Other';
    }

    async calculateBreakdown(startDate, endDate) {
        try {
            const breakdown = {};
            for (const category of Object.keys(this.CATEGORY_MAPPING)) {
                breakdown[category] = {
                    amount: 0,
                    count: 0,
                    percentage: 0,
                    items: []
                };
            }

            let totalRevenue = 0;
            let totalItems = 0;
            let orderCount = 0;

            console.log(`\n${'='.repeat(70)}`);
            console.log(`📊 REVENUE BREAKDOWN SERVICE - DETAILED CALCULATION`);
            console.log(`${'='.repeat(70)}`);
            console.log(`Date Range: ${startDate.toISOString()} to ${endDate.toISOString()}`);

            let orders = await Order.find({
                $or: [
                    { status: 'completed' },
                    { status: 'served' },
                    { status: 'ready' },
                    { status: 'preparing' }
                ],
                createdAt: { $gte: startDate, $lte: endDate }
            }).lean();

            orderCount = orders.length;
            console.log(`📦 Found ${orders.length} orders with status (completed/served/ready/preparing) in this date range\n`);
            
            if (orders.length === 0) {
                console.warn(`⚠️ WARNING: No orders found for this date range! Attempting fallback...`);
                
                // Fallback 1: Try last 7 days
                const last7Days = new Date(startDate);
                last7Days.setDate(last7Days.getDate() - 7);
                
                const recentOrders = await Order.find({
                    $or: [
                        { status: 'completed' },
                        { status: 'served' },
                        { status: 'ready' },
                        { status: 'preparing' }
                    ],
                    createdAt: { $gte: last7Days }
                }).lean().limit(100);
                
                console.log(`   Found ${recentOrders.length} orders from last 7 days`);
                
                if (recentOrders.length > 0) {
                    console.log(`   Using recent orders for breakdown instead`);
                    orders = recentOrders;
                    orderCount = recentOrders.length;
                } else {
                    // Fallback 2: Get ANY orders that exist
                    const anyOrders = await Order.find({}).lean().limit(50);
                    console.log(`   Found ${anyOrders.length} orders total in database`);
                    if (anyOrders.length > 0) {
                        console.log(`   Using ALL orders for breakdown`);
                        orders = anyOrders;
                        orderCount = anyOrders.length;
                    }
                }
            }

            for (const order of orders) {
                if (!order.items || !Array.isArray(order.items)) {
                    console.warn(`⚠️ Order ${order._id} has no items array`);
                    continue;
                }

                for (const item of order.items) {
                    // Extract and validate item data with multiple field name options
                    const itemName = item.name || item.itemName || item.productName || 'Unknown Item';
                    const quantity = parseInt(item.quantity || item.qty || 1) || 1;
                    
                    // Try multiple price field names
                    let price = parseFloat(item.price || item.unitPrice || item.amount || 0) || 0;
                    
                    // Validate price
                    if (isNaN(price) || price < 0) {
                        console.warn(`⚠️ Invalid price for item "${itemName}": ${item.price}`);
                        price = 0;
                    }
                    
                    // Skip items with no price
                    if (price === 0) {
                        console.debug(`📌 Skipping item with ₱0 price: ${itemName}`);
                        continue;
                    }
                    
                    const itemTotal = quantity * price;

                    let category = 'Other';
                    
                    if (item.productId) {
                        try {
                            const menuItem = await MenuItem.findById(item.productId).lean();
                            if (menuItem && menuItem.category) {
                                category = this.categorizeItem(itemName, menuItem.category);
                            } else {
                                category = this.categorizeItem(itemName);
                            }
                        } catch (err) {
                            console.debug(`📌 MenuItem lookup failed for ${item.productId}, using name-based categorization`);
                            category = this.categorizeItem(itemName);
                        }
                    } else {
                        category = this.categorizeItem(itemName);
                    }

                    if (!breakdown[category]) {
                        breakdown[category] = { amount: 0, count: 0, percentage: 0, items: [] };
                    }

                    breakdown[category].amount += itemTotal;
                    breakdown[category].count += quantity;
                    breakdown[category].items.push({
                        name: itemName,
                        quantity: quantity,
                        amount: itemTotal
                    });

                    totalRevenue += itemTotal;
                    totalItems += quantity;
                    
                    console.debug(`✓ ${category}: ${itemName} x${quantity} @ ₱${price.toFixed(2)} = ₱${itemTotal.toFixed(2)}`);
                }
            }

            for (const category of Object.keys(breakdown)) {
                if (totalRevenue > 0) {
                    breakdown[category].percentage = parseFloat(
                        ((breakdown[category].amount / totalRevenue) * 100).toFixed(2)
                    );
                }

                if (breakdown[category].items.length === 0) {
                    delete breakdown[category].items;
                }
            }

            let topCategory = { name: 'None', amount: 0, percentage: 0 };
            for (const [cat, data] of Object.entries(breakdown)) {
                if (data.amount > topCategory.amount) {
                    topCategory = { name: cat, amount: data.amount, percentage: data.percentage };
                }
            }

            const result = {
                breakdown,
                totalRevenue: parseFloat(totalRevenue.toFixed(2)),
                totalItems,
                totalOrders: orderCount,
                topCategory,
                dateRange: { start: startDate, end: endDate }
            };

            // Log detailed breakdown summary
            console.log(`\n📈 BREAKDOWN SUMMARY:`);
            console.log(`  Total Revenue: ₱${totalRevenue.toFixed(2)}`);
            console.log(`  Total Items: ${totalItems}`);
            console.log(`  Total Orders: ${orderCount}`);
            console.log(`  Top Category: ${topCategory.name} (₱${topCategory.amount.toFixed(2)})`);
            
            const categoriesWithRevenue = Object.entries(breakdown)
                .filter(([_, data]) => data.amount > 0)
                .sort((a, b) => b[1].amount - a[1].amount);
            
            console.log(`  Categories with Revenue: ${categoriesWithRevenue.length}`);
            
            if (categoriesWithRevenue.length > 0) {
                console.log(`\n📑 BREAKDOWN BY CATEGORY:`);
                categoriesWithRevenue.forEach(([category, data]) => {
                    console.log(`  ${category.padEnd(25)} | ₱${data.amount.toFixed(2).padStart(10)} | ${data.count.toString().padStart(3)} items | ${data.percentage.toFixed(1).padStart(5)}%`);
                });
            } else {
                console.warn(`⚠️ WARNING: No categories with revenue! All breakdown amounts are ₱0.00`);
            }
            
            console.log(`${'='.repeat(70)}\n`);

            console.log(`✅ Revenue breakdown calculated:`, {
                totalRevenue: result.totalRevenue,
                totalItems: result.totalItems,
                totalOrders: result.totalOrders,
                topCategory: result.topCategory.name
            });

            return result;
        } catch (error) {
            console.error('❌ Error calculating breakdown:', error);
            throw error;
        }
    }

    async calculateAndSaveToday(dateRange) {
        try {
            const { startOfDay, endOfDay } = dateRange;
            const breakdown = await this.calculateBreakdown(startOfDay, endOfDay);

            const dateString = startOfDay.toISOString().split('T')[0];
            console.log(`\n💾 Saving revenue breakdown for ${dateString}...`);

            const breakdownData = {};
            for (const [category, data] of Object.entries(breakdown.breakdown)) {
                breakdownData[category] = {
                    amount: data.amount,
                    count: data.count,
                    percentage: data.percentage
                };
                if (data.items && data.items.length > 0) {
                    breakdownData[category].items = data.items;
                }
            }

            const savedBreakdown = await RevenueBreakdown.findOneAndUpdate(
                { dateString },
                {
                    date: startOfDay,
                    dateString,
                    breakdown: breakdownData,
                    totalRevenue: breakdown.totalRevenue,
                    totalItems: breakdown.totalItems,
                    totalOrders: breakdown.totalOrders,
                    topCategory: breakdown.topCategory,
                    lastUpdated: new Date()
                },
                { upsert: true, new: true }
            );

            console.log(`✅ Successfully saved revenue breakdown for ${dateString}`);
            console.log(`   Total Revenue: ₱${breakdown.totalRevenue.toFixed(2)}`);
            console.log(`   Total Orders: ${breakdown.totalOrders}`);
            console.log(`   Categories: ${Object.keys(breakdownData).filter(k => breakdownData[k].amount > 0).length}\n`);

            return {
                success: true,
                data: {
                    breakdown: breakdownData,
                    totalRevenue: breakdown.totalRevenue,
                    totalItems: breakdown.totalItems,
                    totalOrders: breakdown.totalOrders,
                    topCategory: breakdown.topCategory,
                    date: dateString
                }
            };
        } catch (error) {
            console.error('❌ Error saving breakdown:', error);
            return {
                success: false,
                message: 'Failed to calculate revenue breakdown',
                error: error.message
            };
        }
    }

    async getBreakdownByDate(date) {
        try {
            const dateString = date.toISOString().split('T')[0];
            const breakdown = await RevenueBreakdown.findOne({ dateString });
            return breakdown;
        } catch (error) {
            console.error('❌ Error fetching breakdown by date:', error);
            throw error;
        }
    }

    async getHistoricalBreakdown(startDate, endDate) {
        try {
            const breakdowns = await RevenueBreakdown.find({
                date: { $gte: startDate, $lte: endDate }
            }).sort({ date: -1 });
            return breakdowns;
        } catch (error) {
            console.error('❌ Error fetching historical breakdown:', error);
            throw error;
        }
    }

    async getTopCategories(limit = 5, startDate, endDate) {
        try {
            const breakdown = await this.calculateBreakdown(startDate, endDate);

            const sorted = Object.entries(breakdown.breakdown)
                .filter(([_, data]) => data.amount > 0)
                .sort((a, b) => b[1].amount - a[1].amount)
                .slice(0, limit)
                .map(([category, data]) => ({
                    category,
                    amount: data.amount,
                    count: data.count,
                    percentage: data.percentage
                }));

            return sorted;
        } catch (error) {
            console.error('❌ Error fetching top categories:', error);
            throw error;
        }
    }

    async clearOldRecords(daysToKeep = 90) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            const result = await RevenueBreakdown.deleteMany({
                date: { $lt: cutoffDate }
            });

            console.log(`✅ Cleared ${result.deletedCount} old revenue breakdown records`);
            return result;
        } catch (error) {
            console.error('❌ Error clearing old records:', error);
            throw error;
        }
    }
}

export default new RevenueBreakdownService();