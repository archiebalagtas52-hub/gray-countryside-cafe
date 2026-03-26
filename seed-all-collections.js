import mongoose from "mongoose";
import dotenv from "dotenv";
import Stats from "./models/Stats.js";
import StockDeduction from "./models/StockDeduction.js";
import StaffAssignment from "./models/staffassignModel.js";
import Product from "./models/Product.js";
import StockTransfer from "./models/StocktransferModel.js";
import InventoryItem from "./models/InventoryItem.js";
import User from "./models/User.js";
import MenuItem from "./models/Menuitem.js";
import Settings from "./models/SettingsModel.js";
import SalesData from "./models/salesdata.js";

dotenv.config();

// Helper function to format date to YYYY-MM-DD
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// Helper function to get day of week
function getDayOfWeek(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
}

// Helper function to get week number
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Helper function to calculate profit (assuming 30% margin)
function calculateProfit(sales) {
    return sales * 0.3;
}

// Helper function to calculate cost (assuming 70% cost)
function calculateCost(sales) {
    return sales * 0.7;
}

async function seedSalesData(products) {
    console.log('\n🔄 Seeding SalesData collection...');
    
    const existingSalesData = await SalesData.countDocuments();
    if (existingSalesData > 0) {
        console.log(`⏭️  SalesData already exist (${existingSalesData} records)`);
        return;
    }

    console.log('   Generating sales data...');

    const endDate = new Date(); // Today
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3); // Go back 3 months
    
    const dailySalesData = [];
    const weeklySalesMap = new Map();
    const monthlySalesMap = new Map();

    // ==================== GENERATE DAILY SALES ====================
    console.log('   Generating daily sales...');
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const currentDate = new Date(d);
        const dateStr = formatDate(currentDate);
        const dayOfWeek = getDayOfWeek(currentDate);
        
        // Determine if it's a busy day
        const isWeekend = dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday';
        const isFriday = dayOfWeek === 'Friday';
        
        let dayMultiplier = 1;
        if (isWeekend) dayMultiplier = 1.8;
        if (isFriday) dayMultiplier = 1.4;
        
        // Generate orders per day
        const minOrders = isWeekend ? 15 : 8;
        const maxOrders = isWeekend ? 25 : 15;
        const orderCount = Math.floor(Math.random() * (maxOrders - minOrders + 1)) + minOrders;
        
        let totalSales = 0;
        let totalOrders = orderCount;
        let totalCustomers = Math.floor(orderCount * (1 + Math.random() * 0.5));
        
        // Track payment breakdown
        let cashTotal = 0;
        let gcashTotal = 0;
        
        // Track order types
        let dineInCount = 0;
        let takeOutCount = 0;
        
        // Track items
        const itemsMap = new Map();
        const topProducts = [];
        
        // Generate individual orders
        for (let i = 0; i < orderCount; i++) {
            // Random order type
            if (Math.random() < 0.6) {
                dineInCount++;
            } else {
                takeOutCount++;
            }
            
            // Random payment method
            const orderTotal = (Math.random() * 500 + 150) * dayMultiplier;
            
            if (Math.random() < 0.7) {
                cashTotal += orderTotal;
            } else {
                gcashTotal += orderTotal;
            }
            
            totalSales += orderTotal;
            
            // Generate items per order
            const itemCount = Math.floor(Math.random() * 5) + 1;
            for (let j = 0; j < itemCount; j++) {
                const product = products[Math.floor(Math.random() * products.length)];
                const quantity = Math.floor(Math.random() * 3) + 1;
                const revenue = product.price * quantity;
                
                const currentItem = itemsMap.get(product.itemName) || { quantity: 0, price: product.price, revenue: 0 };
                currentItem.quantity += quantity;
                currentItem.revenue += revenue;
                itemsMap.set(product.itemName, currentItem);
            }
        }
        
        // Calculate top products
        const sortedItems = Array.from(itemsMap.entries())
            .map(([name, data]) => ({
                name,
                quantity: data.quantity,
                revenue: Math.round(data.revenue * 100) / 100
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
        
        // Convert items map to proper format for schema
        const itemsObject = {};
        for (const [itemName, itemData] of itemsMap) {
            itemsObject[itemName] = {
                quantity: itemData.quantity,
                price: itemData.price,
                revenue: Math.round(itemData.revenue * 100) / 100
            };
        }

        // Create daily sales record
        const dailyRecord = {
            period: 'daily',
            date: dateStr,
            fullDate: currentDate,
            dayOfWeek: dayOfWeek,
            totalOrders: totalOrders,
            totalSales: Math.round(totalSales * 100) / 100,
            totalCosts: Math.round(calculateCost(totalSales) * 100) / 100,
            profit: Math.round(calculateProfit(totalSales) * 100) / 100,
            totalCustomers: totalCustomers,
            items: itemsObject,
            paymentBreakdown: {
                cash: Math.round(cashTotal * 100) / 100,
                gcash: Math.round(gcashTotal * 100) / 100
            },
            orderTypes: {
                dineIn: dineInCount,
                takeOut: takeOutCount
            },
            topProducts: sortedItems
        };
        
        dailySalesData.push(dailyRecord);
        
        // ==================== AGGREGATE FOR WEEKLY ====================
        const weekNum = getWeekNumber(currentDate);
        const weekKey = `${currentDate.getFullYear()}-W${weekNum}`;
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay()); // Start of week (Sunday)
        
        if (!weeklySalesMap.has(weekKey)) {
            weeklySalesMap.set(weekKey, {
                period: 'weekly',
                date: weekKey,
                fullDate: weekStart,
                dayOfWeek: 'Weekly Summary',
                totalOrders: 0,
                totalSales: 0,
                totalCosts: 0,
                profit: 0,
                totalCustomers: 0,
                items: new Map(),
                paymentBreakdown: { cash: 0, gcash: 0 },
                orderTypes: { dineIn: 0, takeOut: 0 },
                topProducts: []
            });
        }
        
        const weekly = weeklySalesMap.get(weekKey);
        weekly.totalOrders += totalOrders;
        weekly.totalSales += dailyRecord.totalSales;
        weekly.totalCosts += dailyRecord.totalCosts;
        weekly.profit += dailyRecord.profit;
        weekly.totalCustomers += totalCustomers;
        weekly.paymentBreakdown.cash += cashTotal;
        weekly.paymentBreakdown.gcash += gcashTotal;
        weekly.orderTypes.dineIn += dineInCount;
        weekly.orderTypes.takeOut += takeOutCount;
        
        // Merge items for weekly
        for (const [itemName, itemData] of itemsMap) {
            const weeklyItem = weekly.items.get(itemName) || { quantity: 0, price: itemData.price, revenue: 0 };
            weeklyItem.quantity += itemData.quantity;
            weeklyItem.revenue += itemData.revenue;
            weekly.items.set(itemName, weeklyItem);
        }
        
        // ==================== AGGREGATE FOR MONTHLY ====================
        const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        
        if (!monthlySalesMap.has(monthKey)) {
            monthlySalesMap.set(monthKey, {
                period: 'monthly',
                date: monthKey,
                fullDate: monthStart,
                dayOfWeek: 'Monthly Summary',
                totalOrders: 0,
                totalSales: 0,
                totalCosts: 0,
                profit: 0,
                totalCustomers: 0,
                items: new Map(),
                paymentBreakdown: { cash: 0, gcash: 0 },
                orderTypes: { dineIn: 0, takeOut: 0 },
                topProducts: []
            });
        }
        
        const monthly = monthlySalesMap.get(monthKey);
        monthly.totalOrders += totalOrders;
        monthly.totalSales += dailyRecord.totalSales;
        monthly.totalCosts += dailyRecord.totalCosts;
        monthly.profit += dailyRecord.profit;
        monthly.totalCustomers += totalCustomers;
        monthly.paymentBreakdown.cash += cashTotal;
        monthly.paymentBreakdown.gcash += gcashTotal;
        monthly.orderTypes.dineIn += dineInCount;
        monthly.orderTypes.takeOut += takeOutCount;
        
        // Merge items for monthly
        for (const [itemName, itemData] of itemsMap) {
            const monthlyItem = monthly.items.get(itemName) || { quantity: 0, price: itemData.price, revenue: 0 };
            monthlyItem.quantity += itemData.quantity;
            monthlyItem.revenue += itemData.revenue;
            monthly.items.set(itemName, monthlyItem);
        }
    }

    // ==================== PROCESS WEEKLY DATA ====================
    console.log('   Processing weekly aggregates...');
    const weeklySalesData = [];
    for (const [weekKey, weekly] of weeklySalesMap) {
        // Calculate top products for week
        const sortedWeeklyItems = Array.from(weekly.items.entries())
            .map(([name, data]) => ({
                name,
                quantity: data.quantity,
                revenue: Math.round(data.revenue * 100) / 100
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
        
        // Convert items map to proper format for schema
        const weeklyItemsObject = {};
        for (const [itemName, itemData] of weekly.items) {
            weeklyItemsObject[itemName] = {
                quantity: itemData.quantity,
                price: itemData.price,
                revenue: Math.round(itemData.revenue * 100) / 100
            };
        }
        
        weekly.topProducts = sortedWeeklyItems;
        weekly.items = weeklyItemsObject;
        weekly.totalSales = Math.round(weekly.totalSales * 100) / 100;
        weekly.totalCosts = Math.round(weekly.totalCosts * 100) / 100;
        weekly.profit = Math.round(weekly.profit * 100) / 100;
        
        weeklySalesData.push(weekly);
    }

    // ==================== PROCESS MONTHLY DATA ====================
    console.log('   Processing monthly aggregates...');
    const monthlySalesData = [];
    for (const [monthKey, monthly] of monthlySalesMap) {
        // Calculate top products for month
        const sortedMonthlyItems = Array.from(monthly.items.entries())
            .map(([name, data]) => ({
                name,
                quantity: data.quantity,
                revenue: Math.round(data.revenue * 100) / 100
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
        
        // Convert items map to proper format for schema
        const monthlyItemsObject = {};
        for (const [itemName, itemData] of monthly.items) {
            monthlyItemsObject[itemName] = {
                quantity: itemData.quantity,
                price: itemData.price,
                revenue: Math.round(itemData.revenue * 100) / 100
            };
        }
        
        monthly.topProducts = sortedMonthlyItems;
        monthly.items = monthlyItemsObject;
        monthly.totalSales = Math.round(monthly.totalSales * 100) / 100;
        monthly.totalCosts = Math.round(monthly.totalCosts * 100) / 100;
        monthly.profit = Math.round(monthly.profit * 100) / 100;
        
        monthlySalesData.push(monthly);
    }

    // ==================== INSERT ALL SALES DATA ====================
    const allSalesData = [...dailySalesData, ...weeklySalesData, ...monthlySalesData];
    await SalesData.insertMany(allSalesData);
    
    console.log(`✅ Seeded ${allSalesData.length} sales records`);
    console.log(`   • Daily: ${dailySalesData.length} records`);
    console.log(`   • Weekly: ${weeklySalesData.length} records`);
    console.log(`   • Monthly: ${monthlySalesData.length} records`);
}

async function seedAllCollections() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // ==================== SEED PRODUCTS ====================
        console.log('\n🔄 Seeding Products collection...');
        const existingProducts = await Product.countDocuments();
        let products = [];
        
        if (existingProducts === 0) {
            const productsData = [
                {
                    itemName: 'Fried Chicken',
                    category: 'Budget Meals',
                    price: 95,
                    stock: 50,
                    status: 'in_stock',
                    isActive: true,
                    unit: 'piece',
                    sku: 'PROD-001',
                    minStock: 10,
                    maxStock: 100
                },
                {
                    itemName: 'Sizzling Pork Sisig',
                    category: 'Hot Sizzlers',
                    price: 220,
                    stock: 30,
                    status: 'in_stock',
                    isActive: true,
                    unit: 'plate',
                    sku: 'PROD-002',
                    minStock: 5,
                    maxStock: 50
                },
                {
                    itemName: 'Pancit Bihon',
                    category: 'Party Tray',
                    price: 350,
                    stock: 20,
                    status: 'in_stock',
                    isActive: true,
                    unit: 'tray',
                    sku: 'PROD-003',
                    minStock: 5,
                    maxStock: 40
                },
                {
                    itemName: 'Cafe Americano',
                    category: 'Coffee',
                    price: 80,
                    stock: 100,
                    status: 'in_stock',
                    isActive: true,
                    unit: 'cup',
                    sku: 'PROD-004',
                    minStock: 20,
                    maxStock: 150
                },
                {
                    itemName: 'Milk Tea',
                    category: 'Milk Tea',
                    price: 85,
                    stock: 80,
                    status: 'in_stock',
                    isActive: true,
                    unit: 'cup',
                    sku: 'PROD-005',
                    minStock: 15,
                    maxStock: 120
                }
            ];
            products = await Product.insertMany(productsData);
            console.log(`✅ Seeded ${products.length} products`);
        } else {
            products = await Product.find();
            console.log(`⏭️  Products already exist (${existingProducts} records)`);
        }

        // ==================== SEED STATS ====================
        console.log('\n🔄 Seeding Stats collection...');
        const existingStats = await Stats.countDocuments();
        if (existingStats === 0) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const stats = new Stats({
                date: today,
                totalOrders: 45,
                totalRevenue: 8500,
                totalProfit: 2550,
                todayOrders: 12,
                todayRevenue: 2800,
                todayProfit: 840,
                totalCustomers: 158,
                averageOrderValue: 188.89,
                topProduct: 'Fried Chicken',
                topProductQuantity: 35,
                paymentMethods: {
                    cash: 1500,
                    gcash: 1300
                },
                orderTypes: {
                    dineIn: 8,
                    takeOut: 4
                },
                status: 'active'
            });
            await stats.save();
            console.log('✅ Seeded Stats record');
        } else {
            console.log(`⏭️  Stats already exist (${existingStats} records)`);
        }

        // ==================== SEED STOCK DEDUCTIONS ====================
        console.log('\n🔄 Seeding StockDeduction collection...');
        const existingDeductions = await StockDeduction.countDocuments();
        if (existingDeductions === 0) {
            const deductions = [
                {
                    productName: 'Fried Chicken',
                    productId: 'PROD-001',
                    ingredientName: 'Chicken Meat',
                    quantityDeducted: 2.5,
                    unit: 'kg',
                    stockBefore: 10,
                    stockAfter: 7.5,
                    status: 'success',
                    reason: 'Menu product preparation',
                    notes: 'Morning preparation - 5 orders',
                    createdAt: new Date()
                },
                {
                    productName: 'Sizzling Pork Sisig',
                    productId: 'PROD-002',
                    ingredientName: 'Pork Meat',
                    quantityDeducted: 1.8,
                    unit: 'kg',
                    stockBefore: 8,
                    stockAfter: 6.2,
                    status: 'success',
                    reason: 'Menu product preparation',
                    notes: 'Lunch rush - 3 orders'
                },
                {
                    productName: 'Pancit Bihon',
                    productId: 'PROD-003',
                    ingredientName: 'Rice Noodles',
                    quantityDeducted: 1.2,
                    unit: 'kg',
                    stockBefore: 5,
                    stockAfter: 3.8,
                    status: 'success',
                    reason: 'Menu product preparation',
                    notes: 'Party event - 2 trays'
                }
            ];
            await StockDeduction.insertMany(deductions);
            console.log(`✅ Seeded ${deductions.length} stock deductions`);
        } else {
            console.log(`⏭️  StockDeductions already exist (${existingDeductions} records)`);
        }

        // ==================== GET STAFF AND MENU ITEMS FOR ASSIGNMENTS ====================
        const staff = await User.findOne({ role: 'staff' });
        const menuItem = await MenuItem.findOne({ isActive: true });

        // ==================== SEED STAFF ASSIGNMENTS ====================
        console.log('\n🔄 Seeding StaffAssignment collection...');
        const existingAssignments = await StaffAssignment.countDocuments();
        if (existingAssignments === 0 && staff && menuItem) {
            const assignments = [
                {
                    staffId: staff._id,
                    menuItemId: menuItem._id,
                    status: 'active',
                    assignedQuantity: 5,
                    maxQuantity: 20,
                    notes: 'Assigned for morning shift'
                },
                {
                    staffId: staff._id,
                    menuItemId: menuItem._id,
                    status: 'active',
                    assignedQuantity: 8,
                    maxQuantity: 30,
                    notes: 'Assigned for afternoon shift'
                }
            ];
            await StaffAssignment.insertMany(assignments);
            console.log(`✅ Seeded ${assignments.length} staff assignments`);
        } else if (!staff || !menuItem) {
            console.log('⏭️  Skipping StaffAssignments - need Staff and MenuItem records first');
        } else {
            console.log(`⏭️  StaffAssignments already exist (${existingAssignments} records)`);
        }

        // ==================== SEED STOCK TRANSFERS ====================
        console.log('\n🔄 Seeding StockTransfer collection...');
        const existingTransfers = await StockTransfer.countDocuments();
        if (existingTransfers === 0 && staff && menuItem) {
            const transfers = [
                {
                    type: 'transfer_to_staff',
                    staffId: staff._id,
                    menuItemId: menuItem._id,
                    menuItemName: menuItem.itemName,
                    quantity: 10,
                    previousStock: 50,
                    newStock: 40,
                    status: 'completed',
                    notes: 'Stock transfer for morning shift',
                    processedAt: new Date(),
                    processedBy: staff._id
                },
                {
                    type: 'request_from_inventory',
                    staffId: staff._id,
                    menuItemId: menuItem._id,
                    menuItemName: menuItem.itemName,
                    quantity: 5,
                    previousStock: 40,
                    newStock: 45,
                    status: 'pending',
                    notes: 'Request for restock',
                    managerNotes: 'Awaiting approval'
                }
            ];
            await StockTransfer.insertMany(transfers);
            console.log(`✅ Seeded ${transfers.length} stock transfers`);
        } else if (!staff || !menuItem) {
            console.log('⏭️  Skipping StockTransfers - need Staff and MenuItem records first');
        } else {
            console.log(`⏭️  StockTransfers already exist (${existingTransfers} records)`);
        }

        // ==================== SEED SETTINGS (SIMPLIFIED - ONLY NAME AND ROLE) ====================
        console.log('\n🔄 Seeding Settings collection (simplified)...');
        const admin = await User.findOne({ role: 'admin' });
        const existingSettings = await Settings.countDocuments();
        
        if (existingSettings === 0 && admin) {
            // Simplified settings with only name and role
            const settings = new Settings({
                name: admin.firstName && admin.lastName ? `${admin.firstName} ${admin.lastName}` : 'Administrator',
                role: 'admin'
            });
            await settings.save();
            console.log('✅ Seeded simplified Settings record');
        } else if (!admin) {
            console.log('⏭️  Skipping Settings - need Admin user first');
        } else {
            console.log(`⏭️  Settings already exist (${existingSettings} records)`);
        }

        // ==================== SEED SALES DATA ====================
        await seedSalesData(products);

        console.log('\n✅✅✅ SEEDING COMPLETED SUCCESSFULLY! ✅✅✅\n');
        console.log('📊 Summary:');
        console.log(`   • Products: ${await Product.countDocuments()} records`);
        console.log(`   • Stats: ${await Stats.countDocuments()} records`);
        console.log(`   • StockDeductions: ${await StockDeduction.countDocuments()} records`);
        console.log(`   • StaffAssignments: ${await StaffAssignment.countDocuments()} records`);
        console.log(`   • StockTransfers: ${await StockTransfer.countDocuments()} records`);
        console.log(`   • Settings: ${await Settings.countDocuments()} records (simplified)`);
        console.log(`   • SalesData: ${await SalesData.countDocuments()} records`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seedAllCollections();