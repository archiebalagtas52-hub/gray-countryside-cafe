import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MenuItem from './models/Menuitem.js';

dotenv.config();

async function checkMenuItems() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        const items = await MenuItem.find({ isActive: true });
        
        console.log('\n📋 Menu Items in Database:');
        items.forEach((item, idx) => {
            console.log(`\n${idx + 1}. itemName: "${item.itemName}"`);
            console.log(`   name: "${item.name}"`);
            console.log(`   category: "${item.category}"`);
            console.log(`   price: ₱${item.price}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

checkMenuItems();
