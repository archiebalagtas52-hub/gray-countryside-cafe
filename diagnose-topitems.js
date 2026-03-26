#!/usr/bin/env node
/**
 * Diagnostic Script for Top Selling Items Issue
 * Usage: node diagnose-topitems.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './models/Order.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in .env file');
    process.exit(1);
}

async function diagnose() {
    try {
        console.log('🔍 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
        
        // 1. Check total orders
        console.log('\n📊 === ORDER STATISTICS ===');
        const totalOrders = await Order.countDocuments();
        console.log(`Total orders: ${totalOrders}`);
        
        // 2. Check orders by status
        const statuses = await Order.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);
        console.log('\nOrders by status:');
        statuses.forEach(s => {
            console.log(`  ${s._id || 'null'}: ${s.count}`);
        });
        
        // 3. Check recent orders
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentOrders = await Order.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
        console.log(`\nOrders from last 30 days: ${recentOrders}`);
        
        // 4. Show sample order
        console.log('\n📋 === SAMPLE ORDER STRUCTURE ===');
        const sampleOrder = await Order.findOne();
        if (sampleOrder) {
            console.log('Sample order:');
            console.log(JSON.stringify(sampleOrder, null, 2).substring(0, 1000) + '...');
        } else {
            console.log('❌ No orders found in database!');
        }
        
        // 5. Run the aggregation
        console.log('\n🔄 === TOP ITEMS AGGREGATION ===');
        const topItems = await Order.aggregate([
            { 
                $match: { 
                    createdAt: { $gte: thirtyDaysAgo }
                } 
            },
            { $unwind: '$items' },
            { 
                $group: { 
                    _id: '$items.name',
                    totalQuantity: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                    count: { $sum: 1 }
                }
            },
            { 
                $match: { 
                    _id: { $ne: null, $ne: '' }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 }
        ]);
        
        console.log(`Aggregation returned ${topItems.length} items:`);
        topItems.forEach((item, idx) => {
            console.log(`  ${idx + 1}. ${item._id}`);
            console.log(`     Quantity: ${item.totalQuantity}, Revenue: ₱${item.totalRevenue}`);
        });
        
        if (topItems.length === 0) {
            console.log('\n⚠️ ISSUE: No items returned from aggregation!');
            console.log('\nPossible causes:');
            console.log('1. No orders exist in the last 30 days');
            console.log('2. All orders have invalid/null item names');
            console.log('3. All orders are being filtered out by the aggregation');
        }
        
        // 6. Check for orders with items
        console.log('\n🔍 === CHECKING ORDER ITEMS ===');
        const ordersWithItems = await Order.find({ 'items.0': { $exists: true } }).limit(5);
        console.log(`Found ${ordersWithItems.length} orders with items`);
        
        if (ordersWithItems.length > 0) {
            ordersWithItems.forEach((order, idx) => {
                console.log(`\nOrder ${idx + 1}: ID=${order._id}, Status=${order.status}`);
                console.log(`  Items: ${order.items.length}`);
                order.items.slice(0, 2).forEach(item => {
                    console.log(`    - Name: "${item.name}", Price: ${item.price}, Qty: ${item.quantity}`);
                });
            });
        }
        
        console.log('\n✅ Diagnostic complete!');
        
    } catch (error) {
        console.error('❌ Error during diagnosis:', error);
    } finally {
        await mongoose.connection.close();
    }
}

diagnose();
