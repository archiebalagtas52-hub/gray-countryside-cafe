import 'dotenv/config';
import mongoose from 'mongoose';
import InventoryItem from './models/InventoryItem.js';
import { connectDB } from './config/database.js';

async function checkSodas() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    const sodas = await InventoryItem.find({
      itemName: { $regex: /Soda/i },
      isActive: true
    }).sort({ itemName: 1 });

    console.log('🥤 SODA INVENTORY ITEMS:');
    console.log(`Total: ${sodas.length}\n`);

    sodas.forEach(item => {
      console.log(`• ${item.itemName}: ${item.currentStock} ${item.unit} (category: ${item.category})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
  }
}

checkSodas();