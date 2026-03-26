// Find all ingredients used for "Fried Chicken" from the recipe mapping

import fs from 'fs';

const serverContent = fs.readFileSync('./server.js', 'utf-8');

// Extract recipeMapping section
const recipeMappingStart = serverContent.indexOf('const recipeMapping = {');
const recipeMappingEnd = serverContent.indexOf('const reverseRecipeMapping = {}', recipeMappingStart);
const recipeMappingStr = serverContent.substring(recipeMappingStart, recipeMappingEnd);

// Manual extraction of the recipeMapping structure
const recipeMappingObj = {};

// Parse each ingredient line
const lines = recipeMappingStr.split('\n');
let currentIngredient = null;

for (const line of lines) {
    const ingredientMatch = line.match(/^\s*'([^']+)':\s*\[/);
    if (ingredientMatch) {
        currentIngredient = ingredientMatch[1];
        recipeMappingObj[currentIngredient] = [];
    }
    
    if (currentIngredient && line.includes("'")) {
        const dishMatches = line.match(/'([^']+)'/g);
        if (dishMatches) {
            for (const match of dishMatches) {
                const dish = match.replace(/'/g, '');
                if (!recipeMappingObj[currentIngredient].includes(dish)) {
                    recipeMappingObj[currentIngredient].push(dish);
                }
            }
        }
    }
}

console.log('\n🍗 Ingredients for "Fried Chicken":\n');

const friedChickenIngredients = [];
for (const [ingredient, dishes] of Object.entries(recipeMappingObj)) {
    if (dishes.includes('Fried Chicken')) {
        friedChickenIngredients.push(ingredient);
        console.log(`  ✓ ${ingredient}`);
    }
}

console.log(`\nTotal: ${friedChickenIngredients.length} ingredients\n`);
