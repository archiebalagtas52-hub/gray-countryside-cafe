#!/usr/bin/env node

/**
 * Quick Fix: Restore Inventory Data to MongoDB
 * This script initializes or restores inventory data when MongoDB is not accessible
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const INVENTORY_DATA = {
    // ====================== PROTEINS ======================
    'Pork': { name: 'Pork', current: 100, max: 500, unit: 'kg', minThreshold: 20 },
    'Pork Belly': { name: 'Pork Belly', current: 50, max: 100, unit: 'kg', minThreshold: 10 },
    'Pork Chop': { name: 'Pork Chop', current: 50, max: 80, unit: 'kg', minThreshold: 8 },
    'Chicken': { name: 'Chicken', current: 100, max: 300, unit: 'kg', minThreshold: 15 },
    'Beef': { name: 'Beef', current: 50, max: 100, unit: 'kg', minThreshold: 10 },
    'Beef Shank': { name: 'Beef Shank', current: 50, max: 100, unit: 'kg', minThreshold: 10 },
    'Shrimp': { name: 'Shrimp', current: 50, max: 100, unit: 'kg', minThreshold: 8 },
    'Cream Dory': { name: 'Cream Dory', current: 50, max: 150, unit: 'kg', minThreshold: 10 },
    'Tuyo': { name: 'Tuyo', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    'Tinapa': { name: 'Tinapa', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    'Egg': { name: 'Egg', current: 300, max: 500, unit: 'piece', minThreshold: 50 },

    // ====================== VEGETABLES ======================
    'Onion': { name: 'Onion', current: 30, max: 50, unit: 'kg', minThreshold: 5 },
    'Garlic': { name: 'Garlic', current: 20, max: 30, unit: 'kg', minThreshold: 3 },
    'Cabbage': { name: 'Cabbage', current: 30, max: 40, unit: 'kg', minThreshold: 5 },
    'Carrot': { name: 'Carrot', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    'Bell Pepper': { name: 'Bell Pepper', current: 15, max: 20, unit: 'kg', minThreshold: 3 },
    'Tomato': { name: 'Tomato', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    'Potato': { name: 'Potato', current: 30, max: 100, unit: 'kg', minThreshold: 10 },
    'Cucumber': { name: 'Cucumber', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    'Eggplant': { name: 'Eggplant', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    'Green Beans': { name: 'Green Beans', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    'Corn': { name: 'Corn', current: 30, max: 50, unit: 'kg', minThreshold: 10 },

    // ====================== FRUITS & CITRUS ======================
    'Calamansi': { name: 'Calamansi', current: 15, max: 20, unit: 'kg', minThreshold: 5 },
    'Lemon': { name: 'Lemon', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    'Strawberry': { name: 'Strawberry', current: 15, max: 20, unit: 'kg', minThreshold: 3 },
    'Mango': { name: 'Mango', current: 20, max: 30, unit: 'kg', minThreshold: 5 },

    // ====================== GRAINS & STARCHES ======================
    'Rice': { name: 'Rice', current: 100, max: 200, unit: 'kg', minThreshold: 30 },
    'Pancit Bihon': { name: 'Pancit Bihon', current: 50, max: 100, unit: 'kg', minThreshold: 15 },
    'Pancit Canton': { name: 'Pancit Canton', current: 50, max: 100, unit: 'kg', minThreshold: 15 },
    'Spaghetti Pasta': { name: 'Spaghetti Pasta', current: 50, max: 80, unit: 'kg', minThreshold: 10 },
    'Bread': { name: 'Bread', current: 30, max: 50, unit: 'loaf', minThreshold: 10 },

    // ====================== SAUCES & CONDIMENTS ======================
    'Soy Sauce': { name: 'Soy Sauce', current: 40, max: 50, unit: 'liter', minThreshold: 10 },
    'Vinegar': { name: 'Vinegar', current: 40, max: 50, unit: 'liter', minThreshold: 10 },
    'Oyster Sauce': { name: 'Oyster Sauce', current: 30, max: 30, unit: 'liter', minThreshold: 5 },
    'Fish Sauce': { name: 'Fish Sauce', current: 30, max: 30, unit: 'liter', minThreshold: 5 },
    'Cooking Oil': { name: 'Cooking Oil', current: 40, max: 50, unit: 'liter', minThreshold: 10 },
    'Sesame Oil': { name: 'Sesame Oil', current: 15, max: 25, unit: 'liter', minThreshold: 5 },
    'Chicken Broth': { name: 'Chicken Broth', current: 20, max: 30, unit: 'liter', minThreshold: 5 },

    // ====================== DAIRY & CREAMY ======================
    'Milk': { name: 'Milk', current: 30, max: 50, unit: 'liter', minThreshold: 10 },
    'Cheese': { name: 'Cheese', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    'Cream': { name: 'Cream', current: 15, max: 20, unit: 'liter', minThreshold: 3 },
    'Butter': { name: 'Butter', current: 20, max: 30, unit: 'kg', minThreshold: 5 },

    // ====================== BEVERAGES & BASES ======================
    'Coffee Beans': { name: 'Coffee Beans', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    'Milk Tea Base': { name: 'Milk Tea Base', current: 25, max: 40, unit: 'liter', minThreshold: 8 },
    'Matcha Powder': { name: 'Matcha Powder', current: 8, max: 10, unit: 'kg', minThreshold: 2 },
    'Water': { name: 'Water', current: 100, max: 100, unit: 'liter', minThreshold: 30 },
    'Honey': { name: 'Honey', current: 15, max: 20, unit: 'liter', minThreshold: 3 },

    // ====================== SEASONINGS & SPICES ======================
    'Sugar': { name: 'Sugar', current: 30, max: 50, unit: 'kg', minThreshold: 10 },
    'Salt': { name: 'Salt', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    'Black Pepper': { name: 'Black Pepper', current: 5, max: 10, unit: 'kg', minThreshold: 1 },
    'Chili Powder': { name: 'Chili Powder', current: 3, max: 5, unit: 'kg', minThreshold: 1 },
    'Gochujang': { name: 'Gochujang', current: 5, max: 10, unit: 'kg', minThreshold: 2 },

    // ====================== SUPPLIES ======================
    'Plastic Cups': { name: 'Plastic Cups', current: 500, max: 2000, unit: 'piece', minThreshold: 100 },
    'Straws': { name: 'Straws', current: 1000, max: 5000, unit: 'piece', minThreshold: 200 },
    'Plastic Spoon': { name: 'Plastic Spoon', current: 500, max: 2000, unit: 'piece', minThreshold: 100 },
    'Napkin': { name: 'Napkin', current: 100, max: 500, unit: 'pack', minThreshold: 20 },
    'Plate': { name: 'Plate', current: 50, max: 100, unit: 'piece', minThreshold: 10 }
};

async function fixInventoryData() {
    try {
        console.log('🔧 Starting Inventory Data Fix...\n');
        
        // Check MongoDB connection
        if (!process.env.MONGODB_URI) {
            console.error('❌ ERROR: MONGODB_URI not set in .env file');
            console.log('\n📋 To fix this:');
            console.log('1. Create a .env file in the project root');
            console.log('2. Add: MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dbname');
            console.log('3. Run this script again\n');
            return;
        }

        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('✅ Connected to MongoDB\n');

        // Get InventoryItem model
        const InventoryItemSchema = new mongoose.Schema({
            name: String,
            current: Number,
            max: Number,
            unit: String,
            minThreshold: Number,
            category: String,
            createdAt: { type: Date, default: Date.now },
            updatedAt: { type: Date, default: Date.now }
        });

        const InventoryItem = mongoose.model('InventoryItem', InventoryItemSchema);

        // Clear existing inventory
        console.log('🗑️  Clearing existing inventory items...');
        await InventoryItem.deleteMany({});
        console.log('✅ Cleared\n');

        // Insert new inventory data
        console.log('📦 Inserting inventory data...');
        const inventoryArray = Object.entries(INVENTORY_DATA).map(([key, value]) => ({
            ...value,
            category: categorizeItem(key)
        }));

        const result = await InventoryItem.insertMany(inventoryArray);
        console.log(`✅ Successfully inserted ${result.length} inventory items\n`);

        // Verify data
        const count = await InventoryItem.countDocuments();
        console.log(`📊 Total inventory items in database: ${count}`);

        // Show sample
        const sample = await InventoryItem.findOne();
        if (sample) {
            console.log('\n📋 Sample inventory item:');
            console.log(JSON.stringify(sample, null, 2));
        }

        console.log('\n✅ Inventory data fix completed successfully!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.message.includes('connect')) {
            console.log('\n⚠️  MongoDB Connection Failed');
            console.log('Make sure:');
            console.log('1. MongoDB server is running');
            console.log('2. Connection string is correct in .env');
            console.log('3. Network access is allowed');
        }
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Disconnected from MongoDB');
    }
}

function categorizeItem(name) {
    const proteinKeywords = ['pork', 'chicken', 'beef', 'shrimp', 'fish', 'cream dory', 'tuyo', 'tinapa', 'egg'];
    const vegetableKeywords = ['onion', 'garlic', 'cabbage', 'carrot', 'pepper', 'tomato', 'potato', 'cucumber', 'eggplant', 'bean', 'corn'];
    const fruitKeywords = ['calamansi', 'lemon', 'strawberry', 'mango'];
    const grainKeywords = ['rice', 'pancit', 'spaghetti', 'bread'];
    const sauceKeywords = ['sauce', 'oil', 'vinegar', 'broth'];
    const dairyKeywords = ['milk', 'cheese', 'cream', 'butter'];
    const beverageKeywords = ['coffee', 'tea', 'matcha', 'water', 'honey'];
    const seasoningKeywords = ['sugar', 'salt', 'pepper', 'chili', 'gochujang'];
    const supplyKeywords = ['cup', 'straw', 'spoon', 'napkin', 'plate'];

    const lowerName = name.toLowerCase();

    if (proteinKeywords.some(k => lowerName.includes(k))) return 'Proteins';
    if (vegetableKeywords.some(k => lowerName.includes(k))) return 'Vegetables';
    if (fruitKeywords.some(k => lowerName.includes(k))) return 'Fruits';
    if (grainKeywords.some(k => lowerName.includes(k))) return 'Grains';
    if (sauceKeywords.some(k => lowerName.includes(k))) return 'Sauces & Condiments';
    if (dairyKeywords.some(k => lowerName.includes(k))) return 'Dairy';
    if (beverageKeywords.some(k => lowerName.includes(k))) return 'Beverages';
    if (seasoningKeywords.some(k => lowerName.includes(k))) return 'Seasonings';
    if (supplyKeywords.some(k => lowerName.includes(k))) return 'Supplies';

    return 'Other';
}

// Run the fix
fixInventoryData();
