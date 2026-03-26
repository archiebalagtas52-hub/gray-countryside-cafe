import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './models/Order.js';

dotenv.config();

async function checkOrderStructure() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        
        // Get one recent order with full details
        const order = await Order.findOne().sort({ createdAt: -1 });
        
        if (!order) {
            console.log('No orders found');
            return;
        }

        console.log('\n📦 ===== ORDER STRUCTURE =====');
        console.log('Order Number:', order.orderNumber);
        console.log('Total:', order.total);
        console.log('Created:', order.createdAt.toLocaleString('en-PH'));
        
        console.log('\n📋 Items in order:');
        order.items.forEach((item, idx) => {
            console.log(`\n${idx + 1}. Item:`, {
                id: item.id,
                name: item.name,
                itemName: item.itemName,
                price: item.price,
                quantity: item.quantity,
                size: item.size,
                image: item.image,
                vatable: item.vatable,
                allKeys: Object.keys(item).sort()
            });
        });

        console.log('\n✅ Check complete!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

checkOrderStructure();
