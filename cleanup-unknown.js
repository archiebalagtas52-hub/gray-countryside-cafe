import mongoose from 'mongoose';
import Order from './models/Order.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/POS';

async function cleanup() {
    try {
        console.log('🔍 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        
        const result = await Order.deleteMany({ 
            'items': { $elemMatch: { name: 'Unknown Item' } }
        });

        console.log(`🗑️  Deleted ${result.deletedCount} orders with "Unknown Item"`);
        
        const remaining = await Order.countDocuments({ 'items.name': 'Unknown Item' });
        console.log(remaining === 0 ? '✅ Clean!' : `⚠️  ${remaining} remain`);

        await mongoose.disconnect();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

cleanup();
