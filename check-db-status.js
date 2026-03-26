import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from './models/Order.js';
import InventoryItem from './models/InventoryItem.js';
import MenuItem from './models/Menuitem.js';
import Product from './models/Product.js';
import User from './models/User.js';
import Stats from './models/Stats.js';
import Settings from './models/SettingsModel.js';

dotenv.config();

async function checkDatabaseStatus() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 DATABASE STATUS CHECKER');
    console.log('='.repeat(60) + '\n');
    
    console.log('🔄 Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI, {
      retryWrites: true,
      w: 'majority',
      serverSelectionTimeoutMS: 10000,
    });
    
    console.log('✅ Connected to MongoDB Atlas');
    const dbName = mongoose.connection.db.databaseName;
    console.log(`📊 Database Name: ${dbName}`);
    console.log(`🏠 Host: ${mongoose.connection.host}\n`);
    
    // Check each collection
    const collections = [
      { name: 'Orders', model: Order },
      { name: 'InventoryItems', model: InventoryItem },
      { name: 'MenuItems', model: MenuItem },
      { name: 'Products', model: Product },
      { name: 'Users', model: User },
      { name: 'Stats', model: Stats },
      { name: 'Settings', model: Settings }
    ];
    
    console.log('📋 COLLECTION STATUS:\n');
    
    for (const collection of collections) {
      try {
        const count = await collection.model.countDocuments();
        const status = count > 0 ? '✅' : '⚠️';
        console.log(`${status} ${collection.name.padEnd(20)} ${count} documents`);
        
        if (count > 0 && count <= 3) {
          const samples = await collection.model.find().limit(1).lean();
          samples.forEach(sample => {
            const keys = Object.keys(sample).slice(0, 3).join(', ');
            console.log(`   └─ Sample: {${keys}...}`);
          });
        }
      } catch (error) {
        console.log(`❌ ${collection.name.padEnd(20)} Error: ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🔍 DATA SUMMARY:\n');
    
    const orderCount = await Order.countDocuments();
    const userCount = await User.countDocuments();
    const inventoryCount = await InventoryItem.countDocuments();
    const menuCount = await MenuItem.countDocuments();
    const productCount = await Product.countDocuments();
    
    console.log(`📦 Total Orders: ${orderCount}`);
    console.log(`👥 Total Users: ${userCount}`);
    console.log(`🛒 Total Inventory Items: ${inventoryCount}`);
    console.log(`🍽️  Total Menu Items: ${menuCount}`);
    console.log(`📊 Total Products: ${productCount}`);
    
    // Check for admin user
    const adminUser = await User.findOne({ role: 'admin' });
    if (adminUser) {
      console.log(`\n✅ Admin user exists: ${adminUser.email}`);
    } else {
      console.log(`\n⚠️ No admin user found in database`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Database check complete!\n');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
    console.error('\nPossible issues:');
    console.log('1. MONGODB_URI not set in .env file');
    console.log('2. MongoDB Atlas connection string is invalid');
    console.log('3. Database has been deleted');
    console.log('4. Network connection issue\n');
    process.exit(1);
  }
}

checkDatabaseStatus();
