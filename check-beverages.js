import 'dotenv/config';
import mongoose from 'mongoose';
import InventoryItem from './models/InventoryItem.js';
import { connectDB } from './config/database.js';

async function checkBeverages() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    const beverages = await InventoryItem.find({
      category: 'Beverages',
      isActive: true
    }).sort({ itemName: 1 });

    console.log('🍹 BEVERAGE INVENTORY ITEMS:');
    console.log(`Total: ${beverages.length}\n`);

    beverages.forEach(item => {
      console.log(`• ${item.itemName}: ${item.currentStock} ${item.unit} (min: ${item.minStock})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

checkBeverages();