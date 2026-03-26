import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './models/Order.js';
import { connectDB } from './config/database.js';

dotenv.config();

async function diagnoseOrders() {
    try {
        await connectDB();
        console.log('\n🔍 DIAGNOSING ORDER DATA...\n');
        
        // Get all orders
        const allOrders = await Order.find({}).lean();
        console.log(`📊 Total orders in database: ${allOrders.length}`);
        
        // Get status distribution
        const statusCounts = {};
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        
        let todayCount = 0;
        
        allOrders.forEach(order => {
            const status = order.status || 'undefined';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
            
            const orderDate = new Date(order.createdAt);
            if (orderDate >= todayStart && orderDate <= todayEnd) {
                todayCount++;
            }
        });
        
        console.log('\n📋 Orders by Status:');
        Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`   ${status}: ${count} orders`);
        });
        
        console.log(`\n📅 Orders created today (Feb 21, 2026): ${todayCount}`);
        
        // Check sample order structure
        if (allOrders.length > 0) {
            console.log('\n📦 Sample Order #1:');
            const sample = allOrders[0];
            console.log(`   Order Number: ${sample.orderNumber}`);
            console.log(`   Status: ${sample.status}`);
            console.log(`   Created: ${sample.createdAt}`);
            console.log(`   Items: ${sample.items?.length || 0}`);
            if (sample.items && sample.items.length > 0) {
                console.log(`   First Item:`);
                const firstItem = sample.items[0];
                console.log(`     - Name: ${firstItem.name}`);
                console.log(`     - Price: ${firstItem.price}`);
                console.log(`     - Quantity: ${firstItem.quantity}`);
            }
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

diagnoseOrders();
