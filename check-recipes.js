/**
 * 🧂 DIAGNOSTIC: Check Recipe Mapping
 * Shows which menu items are in the recipe and which ones are missing
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import MenuItem from './models/Menuitem.js';
import { connectDB } from './config/database.js';

// Recipe mapping from server.js
const recipeMapping = {
    'Pork': ['Korean Spicy Bulgogi (Pork)', 'Korean Salt and Pepper (Pork)', /* etc */],
    'Chicken': ['Buttered Honey Chicken', 'Buttered Spicy Chicken', /* etc */],
    // ... (simplified, full list in server.js)
};

async function checkRecipeMapping() {
    try {
        await connectDB();
        console.log('✅ Connected to MongoDB\n');

        // Get all menu items
        const allMenuItems = await MenuItem.find({ isActive: true }).sort({ itemName: 1 });
        
        console.log('📋 MENU ITEMS WITH RECIPE MAPPING\n');
        console.log('Items with recipes:');
        
        // Build reverse mapping from server.js
        const reverseMapping = {};
        
        // Manual list of items that HAVE recipes
        const itemsWithRecipes = [
            'Korean Spicy Bulgogi (Pork)',
            'Korean Salt and Pepper (Pork)',
            'Crispy Pork Lechon Kawali',
            'Pork Shanghai',
            'Sinigang (Pork)',
            'Sizzling Pork Sisig',
            'Sizzling Liempo',
            'Sizzling Porkchop',
            'Buttered Honey Chicken',
            'Buttered Spicy Chicken',
            'Chicken Adobo',
            'Fried Chicken',
            'Sizzling Fried Chicken',
            'Clubhouse Sandwich',
            'Sinigang (Shrimp)',
            'Buttered Shrimp',
            'Special Bulalo',
            'Paknet (Pakbet w/ Bagnet)',
            'Pancit Bihon',
            'Pancit Canton + Bihon (Mixed)',
            'Pancit Bihon (L)',
            'Spaghetti (Filipino Style)',
            'Fried Rice',
            'Plain Rice',
            'Cheesy Nachos',
            'Nachos Supreme',
            'French Fries',
            'Fish and Fries',
            'Cream Dory Fish Fillet',
            'Budget Fried Chicken',
            'Tinapa Rice',
            'Tuyo Pesto',
            'Cheesy Dynamite Lumpia',
            'Lumpiang Shanghai',
            'Cucumber Lemonade',
            'Blue Lemonade',
            'Blue Lemonade (Glass)',
            'Red Tea',
            'Cafe Americano',
            'Cafe Latte',
            'Caramel Macchiato',
            'Milk Tea',
            'Matcha Green Tea',
            'Matcha Green Tea HC',
            'Cookies & Cream',
            'Strawberry & Cream',
            'Mango Cheesecake',
            'Soda'
        ];

        let count = 0;
        allMenuItems.forEach(item => {
            if (itemsWithRecipes.includes(item.itemName)) {
                console.log(`  ✅ ${item.itemName}`);
                count++;
            }
        });

        console.log(`\n✅ Items WITH recipes: ${count}`);

        console.log('\n\n❌ Items WITHOUT recipes (Ingredients won\'t deduct):\n');
        
        let missingCount = 0;
        allMenuItems.forEach(item => {
            if (!itemsWithRecipes.includes(item.itemName)) {
                console.log(`  ❌ ${item.itemName}`);
                missingCount++;
            }
        });

        console.log(`\n❌ Items WITHOUT recipes: ${missingCount}`);

        if (missingCount > 0) {
            console.log('\n\n⚠️ SOLUTION:');
            console.log('Items without recipes will NOT deduct ingredients.');
            console.log('\nTo add recipes for new items, edit server.js and add entries to recipeMapping.');
            console.log('\nExample:');
            console.log(`
    const recipeMapping = {
        'New Dish Name': [
            'Pork',      // ingredients it uses
            'Garlic',
            'Onion',
            'Salt'
        ],
        // ... other items
    };
            `);
        }

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

checkRecipeMapping();
