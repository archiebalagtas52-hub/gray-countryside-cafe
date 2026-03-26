#!/usr/bin/env node
/**
 * CLEANUP SCRIPT - Delete all menu items from MongoDB
 * Usage: node cleanup-mongodb.js
 * 
 * This script:
 * 1. Connects to MongoDB Atlas
 * 2. Deletes ALL menu items (starts fresh)
 * 3. Shows confirmation
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// Import MenuItem model
import MenuItem from './models/Menuitem.js';

async function cleanupDatabase() {
    try {
        console.log('🔄 Connecting to MongoDB Atlas...');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('✅ Connected to MongoDB Atlas');
        
        // Count items before deletion
        const countBefore = await MenuItem.countDocuments();
        console.log(`\n📊 Menu Items Before Cleanup: ${countBefore}`);
        
        if (countBefore > 0) {
            // List all items
            const items = await MenuItem.find({}, { name: 1, itemName: 1, _id: 1 }).lean();
            console.log('\n📋 Items to be deleted:');
            items.forEach((item, index) => {
                console.log(`   ${index + 1}. ${item.name || item.itemName} (ID: ${item._id})`);
            });
        }
        
        // Delete ALL menu items
        console.log('\n🗑️ Deleting ALL menu items...');
        const result = await MenuItem.deleteMany({});
        
        console.log(`✅ Deleted ${result.deletedCount} items`);
        
        // Verify deletion
        const countAfter = await MenuItem.countDocuments();
        console.log(`\n📊 Menu Items After Cleanup: ${countAfter}`);
        
        if (countAfter === 0) {
            console.log('\n✅ DATABASE IS NOW EMPTY - Ready for fresh data!');
            console.log('📝 You can now create products manually via admin dashboard');
            console.log('💾 All products will be saved to MongoDB Atlas only\n');
        }
        
        // Disconnect
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB\n');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error.message);
        process.exit(1);
    }
}

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║         MENU ITEMS DATABASE CLEANUP SCRIPT                 ║');
console.log('║         This will DELETE ALL menu items from MongoDB       ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Run cleanup
cleanupDatabase();
