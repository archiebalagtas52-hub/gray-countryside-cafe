import 'dotenv/config';
import mongoose from 'mongoose';
import InventoryItem from './models/InventoryItem.js';
import { connectDB } from './config/database.js';

async function updateSodaUnits() {
    try {
        await connectDB();
        console.log('✅ Connected to MongoDB\n');

        // Update 1.5L sodas to liters
        const literSodas = [
            'Soda 1.5L Coke',
            'Soda 1.5L Coke Zero',
            'Soda 1.5L Sprite',
            'Soda 1.5L Royal'
        ];

        console.log('🔄 Updating 1.5L sodas to liters...\n');

        for (const sodaName of literSodas) {
            const result = await InventoryItem.findOneAndUpdate(
                { itemName: sodaName },
                { unit: 'liters' },
                { new: true }
            );

            if (result) {
                console.log(`✅ ${sodaName}: unit changed to 'liters'`);
            } else {
                console.log(`❌ ${sodaName}: not found`);
            }
        }

        // Update Mismo sodas to bottles
        const bottleSodas = [
            'Soda (Mismo) Coke',
            'Soda (Mismo) Sprite',
            'Soda (Mismo) Royal'
        ];

        console.log('\n🔄 Updating Mismo sodas to bottles...\n');

        for (const sodaName of bottleSodas) {
            const result = await InventoryItem.findOneAndUpdate(
                { itemName: sodaName },
                { unit: 'bottles' },
                { new: true }
            );

            if (result) {
                console.log(`✅ ${sodaName}: unit changed to 'bottles'`);
            } else {
                console.log(`❌ ${sodaName}: not found`);
            }
        }

        // Verify the changes
        console.log('\n📋 VERIFICATION - Current soda units:\n');

        const allSodas = await InventoryItem.find({
            itemName: { $regex: /Soda/i },
            isActive: true
        }).sort({ itemName: 1 });

        allSodas.forEach(item => {
            console.log(`• ${item.itemName}: ${item.currentStock} ${item.unit}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
    }
}

updateSodaUnits();