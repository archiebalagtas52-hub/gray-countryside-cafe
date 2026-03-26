// seed.js
import mongoose from "mongoose";
import { MenuItem, Product } from "./path-to-your-db-file.js";

const menuDatabase = {
    'Rice Bowl Meals': [
        { itemName: 'Korean Spicy Bulgogi (Pork)', price: 180 },
        { itemName: 'Korean Salt and Pepper (Pork)', price: 175 },
        { itemName: 'Crispy Pork Lechon Kawali', price: 165 },
        { itemName: 'Cream Dory Fish Fillet', price: 160 },
        { itemName: 'Buttered Honey Chicken', price: 155 },
        { itemName: 'Buttered Spicy Chicken', price: 155 },
        { itemName: 'Chicken Adobo', price: 145 },
        { itemName: 'Pork Shanghai', price: 140 }
    ],
    'Hot Sizzlers': [
        { itemName: 'Sizzling Pork Sisig', price: 220 },
        { itemName: 'Sizzling Liempo', price: 210 },
        { itemName: 'Sizzling Porkchop', price: 195 },
        { itemName: 'Sizzling Fried Chicken', price: 185 }
    ],
    'Party Tray': [
        { itemName: 'Pancit Bihon (S)', price: 350 },
        { itemName: 'Pancit Bihon (M)', price: 550 },
        { itemName: 'Pancit Bihon (L)', price: 750 },
        { itemName: 'Pancit Canton (S)', price: 380 },
        { itemName: 'Pancit Canton (M)', price: 580 },
        { itemName: 'Pancit Canton (L)', price: 780 },
        { itemName: 'Spaghetti (S)', price: 400 },
        { itemName: 'Spaghetti (M)', price: 600 },
        { itemName: 'Spaghetti (L)', price: 800 }
    ],
    'Drinks': [
        { itemName: 'Cucumber Lemonade (Glass)', price: 60 },
        { itemName: 'Cucumber Lemonade (Pitcher)', price: 180 },
        { itemName: 'Blue Lemonade (Glass)', price: 65 },
        { itemName: 'Blue Lemonade (Pitcher)', price: 190 },
        { itemName: 'Red Tea (Glass)', price: 55 },
        { itemName: 'Soda (Mismo)', price: 25 },
        { itemName: 'Soda 1.5L', price: 65 }
    ],
    'Coffee': [
        { itemName: 'Cafe Americano Tall', price: 80 },
        { itemName: 'Cafe Americano Grande', price: 95 },
        { itemName: 'Cafe Latte Tall', price: 90 },
        { itemName: 'Cafe Latte Grande', price: 105 },
        { itemName: 'Caramel Macchiato Tall', price: 100 },
        { itemName: 'Caramel Macchiato Grande', price: 115 }
    ],
    'Milk Tea': [
        { itemName: 'Milk Tea Regular HC', price: 85 },
        { itemName: 'Milk Tea Regular MC', price: 95 },
        { itemName: 'Matcha Green Tea HC', price: 90 },
        { itemName: 'Matcha Green Tea MC', price: 100 }
    ],
    'Frappe': [
        { itemName: 'Matcha Green Tea HC', price: 120 },
        { itemName: 'Matcha Green Tea MC', price: 135 },
        { itemName: 'Cookies & Cream HC', price: 125 },
        { itemName: 'Cookies & Cream MC', price: 140 },
        { itemName: 'Strawberry & Cream HC', price: 130 },
        { itemName: 'Mango cheese cake HC', price: 135 }
    ],
    'Snacks & Appetizer': [
        { itemName: 'Cheesy Nachos', price: 150 },
        { itemName: 'Nachos Supreme', price: 180 },
        { itemName: 'French fries', price: 90 },
        { itemName: 'Clubhouse Sandwich', price: 120 },
        { itemName: 'Fish and Fries', price: 160 },
        { itemName: 'Cheesy Dynamite Lumpia', price: 25 },
        { itemName: 'Lumpiang Shanghai', price: 20 }
    ],
    'Budget Meals Served with Rice': [
        { itemName: 'Fried Chicken', price: 95 },
        { itemName: 'Buttered Honey Chicken', price: 105 },
        { itemName: 'Buttered Spicy Chicken', price: 105 },
        { itemName: 'Tinapa Rice', price: 85 },
        { itemName: 'Tuyo Pesto', price: 80 },
        { itemName: 'Fried Rice', price: 50 },
        { itemName: 'Plain Rice', price: 25 }
    ],
    'Specialties': [
        { itemName: 'Sinigang (PORK)', price: 280 },
        { itemName: 'Sinigang (Shrimp)', price: 320 },
        { itemName: 'Paknet (Pakbet w/ Bagnet)', price: 260 },
        { itemName: 'Buttered Shrimp', price: 300 },
        { itemName: 'Special Bulalo (good for 2-3 Persons)', price: 450 },
        { itemName: 'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)', price: 850 }
    ]
};

async function seedDatabase() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing menu items
        await MenuItem.deleteMany({});
        console.log('✅ Cleared existing menu items');

        // Seed menu items
        let seededCount = 0;
        let skippedCount = 0;

        for (const [category, items] of Object.entries(menuDatabase)) {
            for (const item of items) {
                try {
                    // Check if item already exists
                    const existingItem = await MenuItem.findOne({
                        itemName: item.itemName,
                        category: category
                    });

                    if (!existingItem) {
                        const menuItem = new MenuItem({
                            itemName: item.itemName,
                            price: item.price,
                            category: category,
                            isActive: true
                        });
                        await menuItem.save();
                        seededCount++;
                        console.log(`✅ Seeded: ${item.itemName}`);
                    } else {
                        // Update existing item
                        existingItem.price = item.price;
                        existingItem.isActive = true;
                        await existingItem.save();
                        skippedCount++;
                        console.log(`🔄 Updated: ${item.itemName}`);
                    }
                } catch (error) {
                    console.error(`❌ Error with ${item.itemName}:`, error.message);
                    skippedCount++;
                }
            }
        }

        console.log(`\n✅ Seeding completed!`);
        console.log(`✅ ${seededCount} items seeded`);
        console.log(`🔄 ${skippedCount} items updated/skipped`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

// Run the seed function
seedDatabase();