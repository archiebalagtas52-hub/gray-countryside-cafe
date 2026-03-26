const fs = require('fs');
const content = fs.readFileSync('server.js', 'utf8');

// Extract recipeMapping
const start = content.indexOf('const recipeMapping = {');
const end = content.indexOf('const reverseRecipeMapping = {};', start);
const mappingCode = content.substring(start, end);

// Execute the mapping
eval(mappingCode);

console.log('\n' + '='.repeat(80));
console.log('🍽️  COMPLETE RECIPE MAPPING VERIFICATION - ALL CATEGORIES');
console.log('='.repeat(80) + '\n');

// Define categories and their items
const categories = {
    'Rice Bowl Meals': [
        'Korean Spicy Bulgogi (Pork)',
        'Korean Salt and Pepper (Pork)',
        'Crispy Pork Lechon Kawali',
        'Cream Dory Fish Fillet',
        'Buttered Honey Chicken',
        'Buttered Spicy Chicken',
        'Chicken Adobo',
        'Pork Shanghai',
        'Sizzling Pork Sisig',
        'Sizzling Liempo',
        'Sizzling Porkchop',
        'Sizzling Fried Chicken',
        'Fried Chicken',
        'Budget Fried Chicken',
        'Tinapa Rice',
        'Tuyo Pesto',
        'Fried Rice',
        'Fried Rice (Small)',
        'Fried Rice (Medium)',
        'Fried Rice (Large)',
        'Plain Rice',
        'Plain Rice (Small)',
        'Plain Rice (Medium)',
        'Plain Rice (Large)'
    ],
    'Hot Sizzlers': [
        'Sizzling Pork Sisig',
        'Sizzling Liempo',
        'Sizzling Porkchop',
        'Sizzling Fried Chicken'
    ],
    'Party Trays': [
        'Pancit Bihon',
        'Pancit Bihon (S)',
        'Pancit Bihon (M)',
        'Pancit Bihon (L)',
        'Pancit Canton (S)',
        'Pancit Canton (M)',
        'Pancit Canton (L)',
        'Pancit Canton + Bihon (Mixed)',
        'Pancit Canton + Bihon (Mixed) (L)',
        'Pancit Canton + Bihon (Mixed) (M)',
        'Spaghetti (Filipino Style)',
        'Spaghetti (Filipino Style) (L)',
        'Spaghetti (L)',
        'Spaghetti (M)',
        'Spaghetti (S)'
    ],
    'Drinks': [
        'Soda (Glass)',
        'Soda (Mismo)',
        'Soda (L)',
        'Cucumber Lemonade',
        'Cucumber Lemonade (Glass)',
        'Cucumber Lemonade (L)',
        'Cucumber Lemonade (Pitcher)',
        'Blue Lemonade',
        'Blue Lemonade (Glass)',
        'Blue Lemonade (L)',
        'Red Tea',
        'Red Tea (Glass)',
        'Red Tea (L)'
    ],
    'Coffee': [
        'Cafe Americano',
        'Cafe Americano Tall',
        'Cafe Americano (Glass)',
        'Cafe Americano (L)',
        'Cafe Latte',
        'Cafe Latte Tall',
        'Cafe Latte (Glass)',
        'Cafe Latte (L)',
        'Cafe Latte Grande',
        'Caramel Macchiato',
        'Caramel Macchiato Tall',
        'Caramel Macchiato (Glass)',
        'Caramel Macchiato (L)'
    ],
    'Milk Tea': [
        'Milk Tea',
        'Milk Tea Tall',
        'Milk Tea Regular',
        'Milk Tea Large',
        'Milk Tea Regular HC',
        'Milk Tea Large HC',
        'Milk Tea Regular MC',
        'Milk Tea (Glass)',
        'Milk Tea (L)'
    ],
    'Frappe': [
        'Cookies & Cream Frappe',
        'Cookies and Cream Frappe',
        'Cookies & Cream (Glass)',
        'Cookies & Cream (L)',
        'Cookies & Cream MC',
        'Strawberry & Cream Frappe',
        'Strawberry and Cream Frappe',
        'Strawberry & Cream (Glass)',
        'Strawberry & Cream (L)',
        'Mango Cheesecake Frappe',
        'Mango Cheesecake (Glass)',
        'Mango Cheesecake (L)'
    ],
    'Snacks & Appetizers': [
        'French Fries',
        'French Fries (Small)',
        'French Fries (Medium)',
        'French Fries (Large)',
        'Cheesy Nachos',
        'Cheesy Nachos (Small)',
        'Cheesy Nachos (Medium)',
        'Cheesy Nachos (Large)',
        'Nachos Supreme',
        'Nachos Supreme (Small)',
        'Nachos Supreme (Medium)',
        'Nachos Supreme (Large)',
        'Cheesy Dynamite Lumpia',
        'Lumpiang Shanghai',
        'Fish and Fries',
        'Clubhouse Sandwich'
    ],
    'Budget Meals': [
        'Tinapa Rice',
        'Tinapa Rice (Small)',
        'Tinapa Rice (Medium)',
        'Tinapa Rice (Large)',
        'Tuyo Pesto',
        'Tuyo Pesto (Small)',
        'Tuyo Pesto (Medium)',
        'Tuyo Pesto (Large)',
        'Fried Rice',
        'Fried Rice (Small)',
        'Fried Rice (Medium)',
        'Fried Rice (Large)',
        'Plain Rice',
        'Plain Rice (Small)',
        'Plain Rice (Medium)',
        'Plain Rice (Large)',
        'Budget Fried Chicken'
    ],
    'Specialties': [
        'Sinigang (Pork)',
        'Sinigang (PORK)',
        'Sinigang (Shrimp)',
        'Paknet (Pakbet w/ Bagnet)',
        'Buttered Shrimp',
        'Special Bulalo',
        'Special Bulalo (good for 2-3 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)'
    ]
};

// Also include Matcha variants
categories['Matcha Green Tea'] = [
    'Matcha',
    'Matcha Green Tea',
    'Matcha Green Tea Tall',
    'Matcha Green Tea HC',
    'Matcha Green Tea MC',
    'Matcha Regular HC',
    'Matcha Green Tea (Glass)',
    'Matcha Green Tea (L)',
    'Matcha Green Tea (HC)'
];

let totalItems = 0;
let totalMissing = 0;

for (const [category, items] of Object.entries(categories)) {
    const categoryTotal = items.length;
    const foundItems = items.filter(item => recipeMapping[item]);
    const missingItems = items.filter(item => !recipeMapping[item]);
    
    totalItems += categoryTotal;
    totalMissing += missingItems.length;
    
    console.log(`\n�� ${category.toUpperCase()}`);
    console.log('-'.repeat(80));
    console.log(`Total Items: ${categoryTotal} | Found: ${foundItems.length} | Missing: ${missingItems.length}`);
    
    if (missingItems.length > 0) {
        console.log('\n❌ MISSING ITEMS:');
        missingItems.forEach(item => console.log(`   • ${item}`));
    } else {
        console.log('✅ ALL ITEMS HAVE RECIPES!');
    }
}

console.log('\n' + '='.repeat(80));
console.log(`�� FINAL SUMMARY`);
console.log('='.repeat(80));
console.log(`Total Items Checked: ${totalItems}`);
console.log(`Items with Recipes: ${totalItems - totalMissing}`);
console.log(`Missing Recipes: ${totalMissing}`);
console.log(totalMissing === 0 ? '✅ ALL RECIPES COMPLETE!' : `❌ ${totalMissing} items still need recipes`);
console.log('='.repeat(80) + '\n');
