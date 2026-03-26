/**
 * 📊 Check if Black Pepper exists in inventory and show all inventory items
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import InventoryItem from './models/InventoryItem.js';
import { connectDB } from './config/database.js';

async function checkInventory() {
    try {
        await connectDB();
        console.log('✅ Connected to MongoDB\n');

        // Check for Black Pepper
        const blackPepper = await InventoryItem.findOne({
            itemName: { $regex: /^black pepper$/i }
        });

        if (blackPepper) {
            console.log('✅ Black Pepper FOUND in inventory:');
            console.log(JSON.stringify(blackPepper, null, 2));
        } else {
            console.log('❌ Black Pepper NOT FOUND in inventory\n');
            console.log('Creating Black Pepper in inventory...\n');
            
            const newItem = new InventoryItem({
                itemName: 'Black pepper',
                category: 'Dry Goods',
                currentStock: 100,
                minStock: 10,
                maxStock: 50,
                unit: 'kg',
                itemType: 'raw',
                isActive: true,
                status: 'in_stock'
            });
            
            await newItem.save();
            console.log('✅ Black Pepper created successfully!');
            console.log(JSON.stringify(newItem, null, 2));
        }

        // Show all inventory items
        console.log('\n\n📋 ALL INVENTORY ITEMS:\n');
        const allItems = await InventoryItem.find({ isActive: true }).sort({ itemName: 1 });
        
        console.log(`Total Items: ${allItems.length}\n`);
        
        allItems.forEach(item => {
            const usageCount = item.usageHistory ? item.usageHistory.length : 0;
            console.log(`  • ${item.itemName}`);
            console.log(`    Category: ${item.category}`);
            console.log(`    Stock: ${item.currentStock} ${item.unit} (Min: ${item.minStock}, Max: ${item.maxStock})`);
            console.log(`    Status: ${item.status}`);
            console.log(`    Usage History: ${usageCount} records`);
            if (usageCount > 0) {
                const lastUsage = item.usageHistory[usageCount - 1];
                console.log(`    Last Usage: -${lastUsage.quantity} ${item.unit} (${lastUsage.notes})`);
            }
            console.log();
        });

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkInventory();
