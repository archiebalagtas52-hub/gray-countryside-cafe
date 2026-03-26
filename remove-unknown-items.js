import mongoose from 'mongoose';
import Order from './models/Order.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/POS';

async function removeUnknownItems() {
    try {
        console.log('🔍 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected');

        // Find and delete orders with ONLY "Unknown Item"
        const result = await Order.deleteMany({ 
            'items': { 
                $elemMatch: { name: 'Unknown Item' }
            }
        });

        console.log(`\n🗑️  Deleted ${result.deletedCount} orders with "Unknown Item"`);

        // Verify deletion
        const remaining = await Order.countDocuments({ 
            'items.name': 'Unknown Item' 
        });

        if (remaining === 0) {
            console.log('✅ All "Unknown Item" entries have been removed!');
        } else {
            console.log(`⚠️  ${remaining} orders still have "Unknown Item"`);
        }

        await mongoose.disconnect();
        console.log('\n✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

console.log('⚠️  WARNING: This will DELETE all orders containing "Unknown Item"');
console.log('Are you sure you want to continue? (running in 3 seconds...)\n');

setTimeout(() => {
    removeUnknownItems();
}, 3000);
