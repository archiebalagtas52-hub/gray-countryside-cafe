import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error);
        process.exit(1);
    }
};

// Define Order schema
const orderSchema = new mongoose.Schema({}, { strict: false });
const Order = mongoose.model('Order', orderSchema, 'orders');

// Define MenuItem schema
const menuItemSchema = new mongoose.Schema({}, { strict: false });
const MenuItem = mongoose.model('MenuItem', menuItemSchema, 'menuItems');

const fixUnknownItems = async () => {
    try {
        console.log('\n🔍 Analyzing orders with "Unknown Item"...\n');

        // Get all menu items
        const menuItems = await MenuItem.find({});
        console.log(`📦 Found ${menuItems.length} menu items in database`);
        
        // Create a price-to-item map
        const priceMap = {};
        menuItems.forEach(item => {
            priceMap[item.price] = item;
            console.log(`  - ₱${item.price}: ${item.name} (ID: ${item._id})`);
        });

        // Find all orders with Unknown Items
        const ordersWithUnknown = await Order.find({ 'items.name': 'Unknown Item' });
        console.log(`\n📋 Found ${ordersWithUnknown.length} orders with "Unknown Item"\n`);

        let updatedCount = 0;
        let fixedItemsCount = 0;

        for (const order of ordersWithUnknown) {
            let orderModified = false;

            for (const item of order.items) {
                if (item.name === 'Unknown Item' && priceMap[item.price]) {
                    const menuItem = priceMap[item.price];
                    
                    console.log(`✅ Fixing Order ${order._id}:`);
                    console.log(`   Before: "${item.name}" @ ₱${item.price}`);
                    console.log(`   After:  "${menuItem.name}" @ ₱${menuItem.price}`);
                    
                    item.name = menuItem.name;
                    item.productId = menuItem._id;
                    
                    orderModified = true;
                    fixedItemsCount++;
                }
            }

            if (orderModified) {
                await Order.updateOne({ _id: order._id }, { items: order.items });
                updatedCount++;
            }
        }

        console.log(`\n✅ SUMMARY:`);
        console.log(`   Orders Updated: ${updatedCount}`);
        console.log(`   Items Fixed: ${fixedItemsCount}`);
        
        if (updatedCount === 0) {
            console.log(`\n⚠️  No items could be matched by price.`);
            console.log(`    Please check if your menu items have the correct prices.`);
        }

    } catch (error) {
        console.error('❌ Error fixing unknown items:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n✅ Connection closed');
    }
};

connectDB().then(() => fixUnknownItems());
