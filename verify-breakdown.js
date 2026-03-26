import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error);
        process.exit(1);
    }
};

const orderSchema = new mongoose.Schema({}, { strict: false });
const Order = mongoose.model('Order', orderSchema, 'orders');

const verifyFix = async () => {
    try {
        console.log('\n📊 VERIFYING REVENUE BREAKDOWN FIX\n');

        // Get all orders from Feb 20-21
        const orders = await Order.find({
            createdAt: { 
                $gte: new Date('2026-02-20T00:00:00Z'),
                $lte: new Date('2026-02-21T23:59:59Z')
            },
            status: { $in: ['completed', 'served', 'ready', 'preparing'] }
        });

        console.log(`📦 Found ${orders.length} orders\n`);

        const categoryMap = {
            'Coffee': { keywords: ['coffee', 'latte', 'espresso', 'americano', 'macchiato', 'cappuccino', 'mocha', 'cortado'] },
            'Rice Bowl Meals': { keywords: ['rice', 'bowl', 'korean', 'bulgogi', 'adobo', 'cream dory', 'buttered', 'pork shanghai', 'chicken teriyaki', 'lechon kawali', 'pork', 'chicken', 'fish'] },
            'Party Platters': { keywords: ['party', 'platter', 'family', 'large', 'combo', 'set', 'canton', 'spaghetti', 'pancit'] },
            'Snacks & Appetizers': { keywords: ['snack', 'fries', 'pancit', 'bihon', 'shanghai', 'lumpia', 'nachos', 'clubhouse', 'sandwich'] },
            'Other': { keywords: [] }
        };

        const breakdown = {};
        let totalRevenue = 0;

        for (const order of orders) {
            if (!order.items) continue;

            for (const item of order.items) {
                const itemName = item.name || 'Unknown';
                const price = parseFloat(item.price || 0);
                const quantity = parseInt(item.quantity || 1);
                const itemTotal = price * quantity;

                // Categorize
                let category = 'Other';
                const lowerName = itemName.toLowerCase();
                
                for (const [cat, { keywords }] of Object.entries(categoryMap)) {
                    if (cat !== 'Other' && keywords.some(kw => lowerName.includes(kw))) {
                        category = cat;
                        break;
                    }
                }

                if (!breakdown[category]) {
                    breakdown[category] = { amount: 0, count: 0, items: [] };
                }

                breakdown[category].amount += itemTotal;
                breakdown[category].count += quantity;
                breakdown[category].items.push(itemName);

                totalRevenue += itemTotal;
            }
        }

        console.log('📈 REVENUE BREAKDOWN BY CATEGORY:\n');
        const sorted = Object.entries(breakdown)
            .filter(([_, data]) => data.amount > 0)
            .sort((a, b) => b[1].amount - a[1].amount);

        for (const [category, data] of sorted) {
            const percentage = ((data.amount / totalRevenue) * 100).toFixed(1);
            const uniqueItems = [...new Set(data.items)];
            console.log(`${category.padEnd(25)} | ₱${data.amount.toFixed(2).padStart(10)} | ${data.count} items | ${percentage.padStart(5)}%`);
            console.log(`  Items: ${uniqueItems.join(', ')}`);
        }

        console.log(`\n${'='.repeat(80)}`);
        console.log(`📊 TOTAL REVENUE: ₱${totalRevenue.toFixed(2)}`);
        console.log(`📦 TOTAL ITEMS: ${Object.values(breakdown).reduce((sum, d) => sum + d.count, 0)}`);
        console.log(`🛒 TOTAL ORDERS: ${orders.length}`);
        console.log(`${'='.repeat(80)}\n`);

    } catch (error) {
        console.error('❌ Error verifying fix:', error);
    } finally {
        await mongoose.connection.close();
    }
};

connectDB().then(() => verifyFix());
