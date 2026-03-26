#!/usr/bin/env node

/**
 * Quick Fix: Initialize Basic Inventory Data for Recipe Verification
 * This script creates fallback inventory data so recipe verification can work without MongoDB
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const BasicInventorySchema = new mongoose.Schema({
    name: String,
    current: Number,
    max: Number,
    unit: String,
    minThreshold: Number,
    createdAt: { type: Date, default: Date.now }
});

const BasicInventory = mongoose.model('BasicInventory', BasicInventorySchema);

const defaultInventory = [
    // Proteins
    { name: 'Pork', current: 100, max: 500, unit: 'kg', minThreshold: 20 },
    { name: 'Pork Belly', current: 50, max: 100, unit: 'kg', minThreshold: 10 },
    { name: 'Pork Chop', current: 50, max: 80, unit: 'kg', minThreshold: 8 },
    { name: 'Chicken', current: 100, max: 300, unit: 'kg', minThreshold: 15 },
    { name: 'Beef', current: 50, max: 100, unit: 'kg', minThreshold: 10 },
    { name: 'Beef Shank', current: 50, max: 100, unit: 'kg', minThreshold: 10 },
    { name: 'Shrimp', current: 50, max: 100, unit: 'kg', minThreshold: 8 },
    { name: 'Cream Dory', current: 50, max: 150, unit: 'kg', minThreshold: 10 },
    { name: 'Tuyo', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    { name: 'Tinapa', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    { name: 'Egg', current: 300, max: 500, unit: 'piece', minThreshold: 50 },

    // Vegetables
    { name: 'Onion', current: 30, max: 50, unit: 'kg', minThreshold: 5 },
    { name: 'Garlic', current: 20, max: 30, unit: 'kg', minThreshold: 3 },
    { name: 'Cabbage', current: 30, max: 40, unit: 'kg', minThreshold: 5 },
    { name: 'Carrot', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    { name: 'Bell Pepper', current: 15, max: 20, unit: 'kg', minThreshold: 3 },
    { name: 'Tomato', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    { name: 'Potato', current: 30, max: 100, unit: 'kg', minThreshold: 10 },
    { name: 'Cucumber', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    { name: 'Eggplant', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    { name: 'Green Beans', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    { name: 'Corn', current: 30, max: 50, unit: 'kg', minThreshold: 10 },

    // Fruits & Citrus
    { name: 'Calamansi', current: 15, max: 20, unit: 'kg', minThreshold: 5 },
    { name: 'Lemon', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    { name: 'Strawberry', current: 15, max: 20, unit: 'kg', minThreshold: 3 },
    { name: 'Mango', current: 20, max: 30, unit: 'kg', minThreshold: 5 },

    // Grains & Starches
    { name: 'Rice', current: 100, max: 200, unit: 'kg', minThreshold: 30 },
    { name: 'Pancit Bihon', current: 50, max: 100, unit: 'kg', minThreshold: 15 },
    { name: 'Pancit Canton', current: 50, max: 100, unit: 'kg', minThreshold: 15 },
    { name: 'Spaghetti Pasta', current: 50, max: 80, unit: 'kg', minThreshold: 10 },
    { name: 'Bread', current: 30, max: 50, unit: 'loaf', minThreshold: 10 },

    // Sauces & Condiments
    { name: 'Soy Sauce', current: 40, max: 50, unit: 'liter', minThreshold: 10 },
    { name: 'Vinegar', current: 40, max: 50, unit: 'liter', minThreshold: 10 },
    { name: 'Oyster Sauce', current: 30, max: 30, unit: 'liter', minThreshold: 5 },
    { name: 'Fish Sauce', current: 30, max: 30, unit: 'liter', minThreshold: 5 },
    { name: 'Cooking Oil', current: 40, max: 50, unit: 'liter', minThreshold: 10 },
    { name: 'Sesame Oil', current: 15, max: 25, unit: 'liter', minThreshold: 5 },
    { name: 'Chicken Broth', current: 20, max: 30, unit: 'liter', minThreshold: 5 },

    // Dairy & Creamy
    { name: 'Milk', current: 30, max: 50, unit: 'liter', minThreshold: 10 },
    { name: 'Cheese', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    { name: 'Cream', current: 15, max: 20, unit: 'liter', minThreshold: 3 },
    { name: 'Butter', current: 20, max: 30, unit: 'kg', minThreshold: 5 },

    // Beverages & Bases
    { name: 'Coffee Beans', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    { name: 'Milk Tea Base', current: 25, max: 40, unit: 'liter', minThreshold: 8 },
    { name: 'Matcha Powder', current: 8, max: 10, unit: 'kg', minThreshold: 2 },
    { name: 'Water', current: 100, max: 100, unit: 'liter', minThreshold: 30 },
    { name: 'Honey', current: 15, max: 20, unit: 'liter', minThreshold: 3 },

    // Seasonings & Spices
    { name: 'Sugar', current: 30, max: 50, unit: 'kg', minThreshold: 10 },
    { name: 'Salt', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    { name: 'Black Pepper', current: 5, max: 10, unit: 'kg', minThreshold: 1 },
    { name: 'Chili', current: 5, max: 10, unit: 'kg', minThreshold: 1 },
];

async function initializeInventory() {
    console.log('🚀 Initializing Basic Inventory Data...\n');
    
    try {
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI not set in .env file');
            console.log('\n📝 Please add MONGODB_URI to your .env file');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log('✅ Connected to MongoDB\n');

        // Clear existing data
        await BasicInventory.deleteMany({});
        console.log('🧹 Cleared existing inventory data\n');

        // Insert new data
        const result = await BasicInventory.insertMany(defaultInventory);
        console.log(`✅ Created ${result.length} inventory items\n`);

        // Show sample
        console.log('📦 Sample Inventory Items:');
        const samples = await BasicInventory.find().limit(5);
        samples.forEach(item => {
            console.log(`   - ${item.name}: ${item.current}/${item.max} ${item.unit}`);
        });

        console.log('\n✅ Inventory initialization complete!');
        await mongoose.connection.close();

    } catch (error) {
        console.error('❌ Error initializing inventory:');
        console.error(`   ${error.message}`);
        process.exit(1);
    }
}

// Run
initializeInventory();
