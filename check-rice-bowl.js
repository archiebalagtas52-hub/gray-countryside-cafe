import mongoose from "mongoose";
import dotenv from "dotenv";
import MenuItem from "./models/Menuitem.js";
import { connectDB } from "./config/database.js";

dotenv.config();

async function checkAllProducts() {
    try {
        await connectDB();
        
        // Find ALL items (not just Rice Bowl Meals)
        const allItems = await MenuItem.find({});
        
        console.log('\n========================================');
        console.log('📦 ALL PRODUCTS IN DATABASE');
        console.log('========================================\n');
        
        if (allItems.length === 0) {
            console.log('❌ No products found in database');
            process.exit(0);
        }
        
        // Group items by category
        const itemsByCategory = {};
        allItems.forEach(item => {
            const category = item.category || 'Uncategorized';
            if (!itemsByCategory[category]) {
                itemsByCategory[category] = [];
            }
            itemsByCategory[category].push(item);
        });
        
        // Display all items grouped by category
        Object.keys(itemsByCategory).sort().forEach(category => {
            console.log(`\n📂 ${category}`);
            console.log('─'.repeat(50));
            
            itemsByCategory[category].forEach((item, index) => {
                console.log(`  ${index + 1}. ${item.itemName}`);
                console.log(`     Price: ₱${item.price?.toFixed(2) || '0.00'} | Unit: ${item.unit || 'N/A'}`);
                console.log(`     Stock: ${item.currentStock || 0}/${item.maxStock || 0} | Min: ${item.minStock || 0}`);
                console.log(`     Stock Value: ₱${((item.currentStock || 0) * (item.price || 0)).toFixed(2)}`);
                console.log(`     Status: ${item.status || 'unknown'}`);
            });
        });
        
        console.log('\n========================================');
        console.log('📊 OVERALL SUMMARY');
        console.log('========================================\n');
        console.log(`Total Products: ${allItems.length}`);
        
        const totalStockValue = allItems.reduce((sum, item) => {
            return sum + ((item.currentStock || 0) * (item.price || 0));
        }, 0);
        
        console.log(`Total Stock Value: ₱${totalStockValue.toFixed(2)}`);
        
        console.log('\n========================================');
        console.log('🔍 ISSUES FOUND BY CATEGORY');
        console.log('========================================\n');
        
        let totalIssues = 0;
        const issuesByCategory = {};
        
        allItems.forEach((item) => {
            const issues = [];
            
            // Check for zero or missing price
            if (!item.price || item.price === 0) {
                issues.push('❌ Zero Price');
            }
            
            // Check for missing unit
            if (!item.unit) {
                issues.push('❌ Missing Unit');
            }
            
            // Check for low stock
            if (item.currentStock < item.minStock) {
                issues.push(`⚠️  Low Stock (${item.currentStock}/${item.minStock})`);
            }
            
            // Check for out of stock
            if (item.currentStock === 0) {
                issues.push('🔴 Out of Stock');
            }
            
            // Check for zero stock value
            if ((item.currentStock || 0) * (item.price || 0) === 0 && item.currentStock > 0) {
                issues.push('❌ Zero Stock Value');
            }
            
            if (issues.length > 0) {
                const category = item.category || 'Uncategorized';
                if (!issuesByCategory[category]) {
                    issuesByCategory[category] = [];
                }
                issuesByCategory[category].push({ item: item.itemName, issues });
                totalIssues += issues.length;
            }
        });
        
        if (totalIssues === 0) {
            console.log('✅ No issues found');
        } else {
            Object.keys(issuesByCategory).sort().forEach(category => {
                console.log(`\n📂 ${category}:`);
                issuesByCategory[category].forEach(({ item, issues }) => {
                    console.log(`   ⚠️  ${item}`);
                    issues.forEach(issue => console.log(`      ${issue}`));
                });
            });
        }
        
        console.log('\n========================================');
        console.log('📈 STATISTICS');
        console.log('========================================\n');
        
        const zeroPriceItems = allItems.filter(i => !i.price || i.price === 0);
        const outOfStockItems = allItems.filter(i => i.currentStock === 0);
        const lowStockItems = allItems.filter(i => i.currentStock < i.minStock && i.currentStock > 0);
        const missingUnitItems = allItems.filter(i => !i.unit);
        const zeroValueItems = allItems.filter(i => (i.currentStock || 0) * (i.price || 0) === 0 && i.currentStock > 0);
        
        console.log(`Items with Zero Price: ${zeroPriceItems.length}`);
        if (zeroPriceItems.length > 0) {
            zeroPriceItems.forEach(item => console.log(`  - ${item.itemName}`));
        }
        
        console.log(`\nOut of Stock Items: ${outOfStockItems.length}`);
        console.log(`Low Stock Items: ${lowStockItems.length}`);
        console.log(`Items Missing Unit: ${missingUnitItems.length}`);
        console.log(`Items with Zero Value: ${zeroValueItems.length}`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkAllProducts();
