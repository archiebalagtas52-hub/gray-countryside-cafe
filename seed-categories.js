import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from './models/categoryModel.js';
import { connectDB } from './config/database.js';

dotenv.config();

async function seedCategories() {
    try {
        console.log('🌱 Starting Category Seed...');
        
        // Connect to database
        await connectDB();
        console.log('✅ Connected to MongoDB');
        
        // Categories to seed
        const categories = [
            {
                name: 'Rice Bowl Meals',
                displayOrder: 1,
                isActive: true
            },
            {
                name: 'Hot Sizzlers',
                displayOrder: 2,
                isActive: true
            },
            {
                name: 'Party Tray',
                displayOrder: 3,
                isActive: true
            },
            {
                name: 'Drinks',
                displayOrder: 4,
                isActive: true
            },
            {
                name: 'Coffee',
                displayOrder: 5,
                isActive: true
            },
            {
                name: 'Milk Tea',
                displayOrder: 6,
                isActive: true
            },
            {
                name: 'Frappe',
                displayOrder: 7,
                isActive: true
            },
            {
                name: 'Snacks & Appetizer',
                displayOrder: 8,
                isActive: true
            },
            {
                name: 'Budget Meals Served with Rice',
                displayOrder: 9,
                isActive: true
            },
            {
                name: 'Specialties',
                displayOrder: 10,
                isActive: true
            }
        ];

        // Check existing categories
        const existingCategories = await Category.find();
        console.log(`📊 Found ${existingCategories.length} existing categories`);

        // Insert categories
        let addedCount = 0;
        let skippedCount = 0;

        for (const category of categories) {
            const exists = existingCategories.some(c => c.name.toLowerCase() === category.name.toLowerCase());
            
            if (!exists) {
                const newCategory = new Category(category);
                await newCategory.save();
                console.log(`✅ Added: ${category.name}`);
                addedCount++;
            } else {
                console.log(`⏭️  Skipped: ${category.name} (already exists)`);
                skippedCount++;
            }
        }

        console.log('\n📈 Seed Summary:');
        console.log(`✅ Added: ${addedCount} new categories`);
        console.log(`⏭️  Skipped: ${skippedCount} existing categories`);
        console.log(`📊 Total categories in database: ${existingCategories.length + addedCount}`);

        // Display all categories
        const allCategories = await Category.find().sort({ displayOrder: 1 });
        console.log('\n📋 All Categories:');
        allCategories.forEach((cat, index) => {
            console.log(`${index + 1}. ${cat.name} (${cat.isActive ? 'Active' : 'Inactive'})`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding categories:', error.message);
        if (error.code === 11000) {
            console.error('⚠️  Duplicate key error - a category with this name already exists');
        }
        process.exit(1);
    }
}

// Run the seed function
seedCategories();
