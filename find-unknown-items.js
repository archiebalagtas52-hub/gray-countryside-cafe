import mongoose from 'mongoose';
import Order from './models/Order.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/POS';

async function findUnknownItems() {
    try {
        console.log('🔍 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected');

        // Find orders with "Unknown Item"
        const orders = await Order.find({ 
            'items.name': 'Unknown Item' 
        }).select('_id orderNumber items createdAt').lean();

        console.log(`\n📊 Found ${orders.length} orders with "Unknown Item"\n`);

        if (orders.length > 0) {
            console.log('First 5 orders with Unknown Item:');
            orders.slice(0, 5).forEach(order => {
                console.log(`\n  Order: ${order.orderNumber || order._id}`);
                console.log(`  Created: ${order.createdAt}`);
                console.log(`  Items:`);
                order.items.forEach(item => {
                    if (item.name === 'Unknown Item') {
                        console.log(`    ❌ ${item.name} - Price: ₱${item.price}, Qty: ${item.quantity}`);
                    } else {
                        console.log(`    ✅ ${item.name} - Price: ₱${item.price}, Qty: ${item.quantity}`);
                    }
                });
            });

            // Calculate total revenue from Unknown Item
            const unknownRevenue = await Order.aggregate([
                { $match: { 'items.name': 'Unknown Item' } },
                { $unwind: '$items' },
                { $match: { 'items.name': 'Unknown Item' } },
                { $group: { 
                    _id: null, 
                    totalQty: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
                }}
            ]);

            if (unknownRevenue.length > 0) {
                console.log(`\n💰 Unknown Item Statistics:`);
                console.log(`   Total Quantity: ${unknownRevenue[0].totalQty}`);
                console.log(`   Total Revenue: ₱${unknownRevenue[0].totalRevenue.toFixed(2)}`);
            }
        } else {
            console.log('✅ No "Unknown Item" entries found!');
        }

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

findUnknownItems();
