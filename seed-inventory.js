import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InventoryItem from './models/InventoryItem.js';

dotenv.config();

async function seedInventory() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      retryWrites: true,
      w: 'majority',
      serverSelectionTimeoutMS: 10000,
    });
    
    console.log('✅ Connected to MongoDB');
    
    const existingCount = await InventoryItem.countDocuments();
    console.log(`📊 Current inventory items: ${existingCount}`);
    
    const zeroStockCount = await InventoryItem.countDocuments({ currentStock: 0 });
    
    if (existingCount > 0 && zeroStockCount === 0) {
      console.log('✅ Inventory items already exist with stock. Skipping seeding.');
      const items = await InventoryItem.find({}).select('itemName category currentStock').limit(5);
      console.log('\n📋 Sample inventory items:');
      items.forEach(item => {
        console.log(`   • ${item.itemName} (${item.category}): ${item.currentStock} units`);
      });
    } else if (existingCount > 0 && zeroStockCount > 0) {
      console.log(`⚠️  Found ${zeroStockCount} items with zero stock. Restocking...\n`);
      
      const restockData = {
        'Banana Flower Bud': 50,
        'Ground Peanuts': 30,
        'Annatto oil': 20,
        'Toasted Ground Rice': 15,
        'Fish Sauce': 25,
        'Soy Sauce': 35,
        'Garlic': 40,
        'Onion': 45,
        'Tomato': 30,
        'Coconut Milk': 20
      };
      
      for (const [itemName, stock] of Object.entries(restockData)) {
        const result = await InventoryItem.findOneAndUpdate(
          { itemName: itemName },
          { 
            currentStock: stock,
            status: 'in_stock',
            lastRestockDate: new Date()
          },
          { new: true }
        );
        if (result) {
          console.log(`✅ Restocked: ${itemName} → ${stock} units`);
        }
      }
      
      console.log('\n✅ Restocking completed!');
    } else {
      console.log('\n🔄 No inventory found. Seeding default inventory items...\n');
      
      const inventoryItems = [
        {
          itemName: 'Banana Flower Bud',
          category: 'Vegetables',
          currentStock: 50,
          minStock: 10,
          maxStock: 100,
          unit: 'kg',
          status: 'in_stock',
          isActive: true,
          supplier: 'Local Farm',
          lastRestockDate: new Date(),
          usageHistory: [],
          notes: 'Fresh vegetable for cooking'
        },
        {
          itemName: 'Ground Peanuts',
          category: 'Dry Goods',
          currentStock: 30,
          minStock: 5,
          maxStock: 50,
          unit: 'pieces',
          status: 'in_stock',
          isActive: true,
          supplier: 'Supplier A',
          lastRestockDate: new Date(),
          usageHistory: [],
          notes: 'For cooking and snacks'
        },
        {
          itemName: 'Annatto Oil',
          category: 'Cooking Oil',
          currentStock: 20,
          minStock: 5,
          maxStock: 40,
          unit: 'pieces',
          status: 'in_stock',
          isActive: true,
          supplier: 'Supplier B',
          lastRestockDate: new Date(),
          usageHistory: [],
          notes: 'For coloring and flavor'
        },
        {
          itemName: 'Toasted Ground Rice',
          category: 'Dry Goods',
          currentStock: 15,
          minStock: 5,
          maxStock: 30,
          unit: 'pieces',
          status: 'in_stock',
          isActive: true,
          supplier: 'Supplier C',
          lastRestockDate: new Date(),
          usageHistory: [],
          notes: 'For dusting and cooking'
        },
        {
          itemName: 'Fish Sauce',
          category: 'Condiments',
          currentStock: 25,
          minStock: 5,
          maxStock: 50,
          unit: 'bottles',
          status: 'in_stock',
          isActive: true,
          supplier: 'Supplier A',
          lastRestockDate: new Date(),
          usageHistory: [],
          notes: 'Essential Filipino condiment'
        },
        {
          itemName: 'Soy Sauce',
          category: 'Condiments',
          currentStock: 35,
          minStock: 10,
          maxStock: 60,
          unit: 'bottles',
          status: 'in_stock',
          isActive: true,
          supplier: 'Supplier B',
          lastRestockDate: new Date(),
          usageHistory: [],
          notes: 'For marinating and cooking'
        },
        {
          itemName: 'Garlic',
          category: 'Vegetables',
          currentStock: 40,
          minStock: 10,
          maxStock: 80,
          unit: 'kg',
          status: 'in_stock',
          isActive: true,
          supplier: 'Local Farm',
          lastRestockDate: new Date(),
          usageHistory: [],
          notes: 'Fresh aromatic ingredient'
        },
        {
          itemName: 'Onion',
          category: 'Vegetables',
          currentStock: 45,
          minStock: 10,
          maxStock: 100,
          unit: 'kg',
          status: 'in_stock',
          isActive: true,
          supplier: 'Local Farm',
          lastRestockDate: new Date(),
          usageHistory: [],
          notes: 'Essential cooking ingredient'
        },
        {
          itemName: 'Tomato',
          category: 'Vegetables',
          currentStock: 30,
          minStock: 10,
          maxStock: 60,
          unit: 'kg',
          status: 'in_stock',
          isActive: true,
          supplier: 'Local Farm',
          lastRestockDate: new Date(),
          usageHistory: [],
          notes: 'Fresh garden tomatoes'
        },
        {
          itemName: 'Coconut Milk',
          category: 'Liquids',
          currentStock: 20,
          minStock: 5,
          maxStock: 40,
          unit: 'cans',
          status: 'in_stock',
          isActive: true,
          supplier: 'Supplier C',
          lastRestockDate: new Date(),
          usageHistory: [],
          notes: 'For curry and creamy dishes'
        }
      ];
      
      const result = await InventoryItem.insertMany(inventoryItems);
      
      console.log(`✅ Successfully seeded ${result.length} inventory items!\n`);
      console.log('📊 Seeded Inventory Summary:');
      result.forEach((item, idx) => {
        console.log(`[${idx + 1}] ${item.itemName} (${item.category})`);
        console.log(`    Stock: ${item.currentStock} ${item.unit} | Min: ${item.minStock} | Max: ${item.maxStock}`);
      });
    }
    
    const finalCount = await InventoryItem.countDocuments();
    console.log(`\n✅ Total inventory items in database: ${finalCount}`);
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding inventory:', error);
    process.exit(1);
  }
}

seedInventory();
