/**
 * RECIPE MAPPING ANALYZER
 * 
 * This script analyzes the recipeMapping in server.js and helps identify
 * why ingredients are not being deducted from inventory.
 * 
 * Run: node analyze-recipes.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔍 RECIPE MAPPING ANALYZER\n');
console.log('='.repeat(60));

// Read server.js and extract recipeMapping
const serverPath = path.join(__dirname, 'server.js');
const serverContent = fs.readFileSync(serverPath, 'utf8');

// Extract recipeMapping using regex
const recipeMappingMatch = serverContent.match(/const\s+recipeMapping\s*=\s*\{([\s\S]*?)\n\};/);

if (!recipeMappingMatch) {
    console.error('❌ Could not find recipeMapping in server.js');
    process.exit(1);
}

const recipeMappingStr = 'const recipeMapping = {' + recipeMappingMatch[1] + '\n}';

// Parse the recipeMapping
let recipeMapping = {};
try {
    // Extract just the object content
    const objectContent = recipeMappingMatch[1];
    
    // Simple parsing - extract ingredient -> dishes
    const lines = objectContent.split('\n');
    let currentIngredient = null;
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        // Match ingredient line: 'Ingredient': [
        const ingredientMatch = trimmed.match(/^'([^']+)'\s*:\s*\[/);
        if (ingredientMatch) {
            currentIngredient = ingredientMatch[1];
            recipeMapping[currentIngredient] = [];
        }
        
        // Match dish line: 'Dish Name',
        if (currentIngredient) {
            const dishMatch = trimmed.match(/^'([^']+)',?$/);
            if (dishMatch && dishMatch[1] !== '') {
                recipeMapping[currentIngredient].push(dishMatch[1]);
            }
        }
        
        // End of array
        if (trimmed === '],') {
            currentIngredient = null;
        }
    }
} catch (e) {
    console.error('❌ Error parsing recipeMapping:', e.message);
}

// Build reverse mapping (dish -> ingredients)
const reverseRecipeMapping = {};
for (const [ingredient, dishes] of Object.entries(recipeMapping)) {
    for (const dish of dishes) {
        if (!reverseRecipeMapping[dish]) {
            reverseRecipeMapping[dish] = [];
        }
        if (!reverseRecipeMapping[dish].includes(ingredient)) {
            reverseRecipeMapping[dish].push(ingredient);
        }
    }
}

console.log('\n📊 RECIPE MAPPING STATISTICS\n');
console.log(`Total ingredients: ${Object.keys(recipeMapping).length}`);
console.log(`Total unique dishes: ${Object.keys(reverseRecipeMapping).length}`);
console.log(`Total ingredient-dish relationships: ${Object.values(recipeMapping).reduce((sum, arr) => sum + arr.length, 0)}`);

console.log('\n' + '='.repeat(60));
console.log('\n🧂 INGREDIENTS AND THEIR DISHES\n');

const ingredients = Object.keys(recipeMapping).sort();
for (const ingredient of ingredients) {
    const dishes = recipeMapping[ingredient];
    console.log(`\n${ingredient} (${dishes.length} dishes):`);
    for (const dish of dishes) {
        console.log(`  • ${dish}`);
    }
}

console.log('\n' + '='.repeat(60));
console.log('\n🍽️ DISHES AND THEIR INGREDIENTS\n');

const dishes = Object.keys(reverseRecipeMapping).sort();
for (const dish of dishes) {
    const ingredients = reverseRecipeMapping[dish];
    console.log(`\n${dish} (${ingredients.length} ingredients):`);
    for (const ingredient of ingredients) {
        console.log(`  • ${ingredient}`);
    }
}

console.log('\n' + '='.repeat(60));
console.log('\n⚠️ COMMON ISSUES TO CHECK\n');

// Check for common issues
const issues = [];

// 1. Check for dishes with no ingredients
for (const [dish, ingredients] of Object.entries(reverseRecipeMapping)) {
    if (ingredients.length === 0) {
        issues.push(`❌ "${dish}" has no ingredients defined`);
    }
}

// 2. Check for ingredients with no dishes
for (const [ingredient, dishes] of Object.entries(recipeMapping)) {
    if (dishes.length === 0) {
        issues.push(`⚠️ "${ingredient}" is not used in any dish`);
    }
}

// 3. Check for common naming inconsistencies
const commonIssues = [];
for (const ingredient of Object.keys(recipeMapping)) {
    // Check for case issues
    const lower = ingredient.toLowerCase();
    for (const other of Object.keys(recipeMapping)) {
        if (other !== ingredient && other.toLowerCase() === lower) {
            commonIssues.push(`⚠️ Possible duplicate (case mismatch): "${ingredient}" vs "${other}"`);
        }
    }
}

if (issues.length === 0 && commonIssues.length === 0) {
    console.log('✅ No obvious issues detected in recipe mappings');
} else {
    if (issues.length > 0) {
        for (const issue of issues) {
            console.log(issue);
        }
    }
    if (commonIssues.length > 0) {
        for (const issue of commonIssues) {
            console.log(issue);
        }
    }
}

console.log('\n' + '='.repeat(60));
console.log('\n🔧 TROUBLESHOOTING STEPS\n');
console.log('1. When you create a menu item, check the server console');
console.log('2. Look for: "🧂 API: Deducting ingredients for: [Product Name]"');
console.log('3. If you see "ℹ️ No ingredients required", product not in reverseRecipeMapping');
console.log('4. Verify product name EXACTLY matches a key in reverseRecipeMapping');
console.log('5. Check MongoDB inventory items have matching names (case-insensitive)');
console.log('6. Ensure all ingredients have itemType = "raw" in MongoDB');

console.log('\n' + '='.repeat(60));
console.log('\nAnalysis complete!\n');
