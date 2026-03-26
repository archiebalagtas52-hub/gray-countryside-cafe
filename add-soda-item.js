import 'dotenv/config';
import mongoose from 'mongoose';
import InventoryItem from './models/InventoryItem.js';
import { connectDB } from './config/database.js';
import mongoDBInventoryService from './services/mongoDBInventoryService.js';

async function addAllSodaItems() {
    try {
        await connectDB();
        console.log('✅ Connected to MongoDB\n');

        // List of all soda items to add
        const sodaItems = [
            {
                itemName: 'Soda 1.5L Coke',
                category: 'Beverages',
                currentStock: 50,   
                minStock: 10,
                maxStock: 100,
                unit: 'bottles',
                description: '1.5L Coke bottle'
            },
            {
                itemName: 'Soda 1.5L Coke Zero',
                category: 'Beverages',
                currentStock: 30,
                minStock: 5,
                maxStock: 80,
                unit: 'bottles',
                description: '1.5L Coke Zero bottle'
            },
            {
                itemName: 'Soda 1.5L Sprite',
                category: 'Beverages',
                currentStock: 40,
                minStock: 8,
                maxStock: 90,
                unit: 'bottles',
                description: '1.5L Sprite bottle'
            },
            {
                itemName: 'Soda 1.5L Royal',
                category: 'Beverages',
                currentStock: 35,
                minStock: 7,
                maxStock: 85,
                unit: 'bottles',
                description: '1.5L Royal bottle'
            },
            {
                itemName: 'Soda (Mismo) Coke',
                category: 'Beverages',
                currentStock: 60,
                minStock: 12,
                maxStock: 120,
                unit: 'cans',
                description: 'Mismo Coke can'
            },
            {
                itemName: 'Soda (Mismo) Sprite',
                category: 'Beverages',
                currentStock: 55,
                minStock: 11,
                maxStock: 110,
                unit: 'cans',
                description: 'Mismo Sprite can'
            },
            {
                itemName: 'Soda (Mismo) Royal',
                category: 'Beverages',
                currentStock: 45,
                minStock: 9,
                maxStock: 95,
                unit: 'cans',
                description: 'Mismo Royal can'
            }
        ];

        let added = 0;
        let existing = 0;

        for (const sodaData of sodaItems) {
            console.log(`🔄 Processing ${sodaData.itemName}...`);

            const result = await mongoDBInventoryService.addItem(sodaData);

            if (result.success) {
                console.log(`✅ Added ${sodaData.itemName} to inventory`);
                added++;
            } else {
                if (result.error === 'Item already exists') {
                    console.log(`✅ ${sodaData.itemName} already exists in inventory`);
                    existing++;
                } else {
                    console.log(`❌ Failed to add ${sodaData.itemName}: ${result.error}`);
                }
            }
        }

        console.log(`\n📊 Summary:`);
        console.log(`   Added: ${added} items`);
        console.log(`   Already existed: ${existing} items`);
        console.log(`   Total soda items: ${added + existing}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

addAllSodaItems();