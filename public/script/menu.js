// ==================== GLOBAL VARIABLES ====================
let allMenuItems = [];
let notifications = [];
let stockRequestNotifications = []; // Separate array for stock requests
let notificationCount = 0;
let stockRequestCount = 0; // Count for stock requests
let isNotificationModalOpen = false;
let hasNewNotifications = false;
let hasNewStockRequests = false;
let currentSection = 'dashboard';
let currentCategory = 'all';
let isModalOpen = false;
let retryCount = 0;
let currentInventoryCache = [];
let lastInventoryCacheTime = 0;
let missingIngredientsData = {}; // Store missing ingredients by product name

// DEBOUNCE & THROTTLE VARIABLES
let dashboardRenderTimeout = null;
let lastDashboardRenderTime = 0;
const DASHBOARD_RENDER_DEBOUNCE = 500; // milliseconds

// PAGINATION VARIABLES
let currentPage = 1;
let itemsPerPage = 15;
let totalPages = 1;
let filteredMenuItems = [];

// NOTIFICATION EVENT SOURCE
let notificationEventSource = null;

const MAX_RETRIES = 3;
const BACKEND_URL = window.location.origin;
const INVENTORY_CACHE_DURATION = 5000;

// ==================== INGREDIENT INVENTORY ====================
const ingredientInventory = {
    // ====================== PROTEINS ======================
    'Pork': { name: 'Pork', current: 100, max: 500, unit: 'kg', minThreshold: 20 },
    'Pork Belly': { name: 'Pork Belly', current: 50, max: 100, unit: 'kg', minThreshold: 10 },
    'Pork Chop': { name: 'Pork Chop', current: 50, max: 80, unit: 'kg', minThreshold: 8 },
    'Ground Pork': { name: 'Ground Pork', current: 40, max: 100, unit: 'kg', minThreshold: 10 },
    'Chicken': { name: 'Chicken', current: 100, max: 300, unit: 'kg', minThreshold: 15 },
    'Chicken Wings': { name: 'Chicken Wings', current: 50, max: 100, unit: 'kg', minThreshold: 10 },
    'Beef': { name: 'Beef', current: 50, max: 100, unit: 'kg', minThreshold: 10 },
    'beef_shank': { name: 'Beef Shank', current: 50, max: 100, unit: 'kg', minThreshold: 10 },
    'Shrimp': { name: 'Shrimp', current: 50, max: 100, unit: 'kg', minThreshold: 8 },
    'Cream Dory': { name: 'Cream Dory', current: 50, max: 150, unit: 'kg', minThreshold: 10 },
    'tuyo': { name: 'Tuyo', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    'tinapa': { name: 'Tinapa', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    'Egg': { name: 'Egg', current: 300, max: 500, unit: 'piece', minThreshold: 50 },

    // ====================== VEGETABLES ======================
    'Onion': { name: 'Onion', current: 30, max: 50, unit: 'kg', minThreshold: 5 },
    'Garlic': { name: 'Garlic', current: 20, max: 30, unit: 'kg', minThreshold: 3 },
    'Cabbage': { name: 'Cabbage', current: 30, max: 40, unit: 'kg', minThreshold: 5 },
    'Carrot': { name: 'Carrot', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    'bell_pepper': { name: 'Bell Pepper', current: 15, max: 20, unit: 'kg', minThreshold: 3 },
    'Tomato': { name: 'Tomato', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    'Potato': { name: 'Potato', current: 30, max: 100, unit: 'kg', minThreshold: 10 },
    'cucumber': { name: 'Cucumber', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    'Eggplant': { name: 'Eggplant', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    'green_beans': { name: 'Green Beans', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    'corn': { name: 'Corn', current: 30, max: 50, unit: 'kg', minThreshold: 10 },
    'Chili': { name: 'Red Chili', current: 15, max: 25, unit: 'kg', minThreshold: 3 },

    // ====================== FRUITS & CITRUS ======================
    'Calamansi': { name: 'Calamansi', current: 15, max: 20, unit: 'kg', minThreshold: 5 },
    'lemon': { name: 'Lemon', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    'strawberry': { name: 'Strawberry', current: 15, max: 20, unit: 'kg', minThreshold: 3 },
    'mango': { name: 'Mango', current: 20, max: 30, unit: 'kg', minThreshold: 5 },

    // ====================== GRAINS & STARCHES ======================
    'Rice': { name: 'Rice', current: 100, max: 200, unit: 'kg', minThreshold: 30 },
    'Bihon noodles': { name: 'Bihon Noodles', current: 50, max: 100, unit: 'kg', minThreshold: 15 },
    'pancit_bihon': { name: 'Pancit Bihon', current: 50, max: 100, unit: 'kg', minThreshold: 15 },
    'pancit_canton': { name: 'Pancit Canton', current: 50, max: 100, unit: 'kg', minThreshold: 15 },
    'Spaghetti pasta': { name: 'Spaghetti Pasta', current: 50, max: 80, unit: 'kg', minThreshold: 10 },
    'Bread': { name: 'Bread', current: 30, max: 50, unit: 'loaf', minThreshold: 10 },

    // ====================== SAUCES & CONDIMENTS ======================
    'Soy sauce': { name: 'Soy Sauce', current: 40, max: 50, unit: 'liter', minThreshold: 10 },
    'Vinegar': { name: 'Vinegar', current: 40, max: 50, unit: 'liter', minThreshold: 10 },
    'oyster_sauce': { name: 'Oyster Sauce', current: 30, max: 30, unit: 'liter', minThreshold: 5 },
    'fish_sauce': { name: 'Fish Sauce', current: 30, max: 30, unit: 'liter', minThreshold: 5 },
    'Buffalo Sauce': { name: 'Buffalo Sauce', current: 20, max: 40, unit: 'liter', minThreshold: 5 },
    'Cooking oil': { name: 'Cooking Oil', current: 40, max: 50, unit: 'liter', minThreshold: 10 },
    'Sesame oil': { name: 'Sesame Oil', current: 15, max: 25, unit: 'liter', minThreshold: 5 },
    'Chicken_broth': { name: 'Chicken Broth', current: 20, max: 30, unit: 'liter', minThreshold: 5 },
    'Gravy': { name: 'Gravy', current: 50, max: 100, unit: 'liter', minThreshold: 15 },
    'Mayonnaise': { name: 'Mayonnaise', current: 30, max: 50, unit: 'liter', minThreshold: 10 },

    // ====================== DAIRY & CREAMY ======================
    'Milk': { name: 'Milk', current: 30, max: 50, unit: 'liter', minThreshold: 10 },
    'Cheese': { name: 'Cheese', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    'Cream': { name: 'Cream', current: 15, max: 20, unit: 'liter', minThreshold: 3 },
    'Butter': { name: 'Butter', current: 20, max: 30, unit: 'pieces', minThreshold: 5 },

    // ====================== BEVERAGES & BASES ======================
    'coffee_beans': { name: 'Coffee Beans', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    'Milk_tea_base': { name: 'Milk Tea Base', current: 25, max: 40, unit: 'liter', minThreshold: 8 },
    'matcha': { name: 'Matcha Powder', current: 8, max: 10, unit: 'kg', minThreshold: 2 },
    'water': { name: 'Water', current: 100, max: 100, unit: 'liter', minThreshold: 30 },
    'Honey': { name: 'Honey', current: 15, max: 20, unit: 'liter', minThreshold: 3 },

    // ====================== SEASONINGS & SPICES ======================
    'Sugar': { name: 'Sugar', current: 30, max: 50, unit: 'kg', minThreshold: 10 },
    'Salt': { name: 'Salt', current: 30, max: 50, unit: 'kg', minThreshold: 10 },
    'Black pepper': { name: 'Black Pepper', current: 20, max: 30, unit: 'kg', minThreshold: 5 },
    'Pepper': { name: 'Pepper', current: 15, max: 25, unit: 'kg', minThreshold: 3 },
    'Bay leaves': { name: 'Bay Leaves', current: 10, max: 20, unit: 'piece', minThreshold: 3 },
    'Peppercorn': { name: 'Peppercorn', current: 5, max: 10, unit: 'kg', minThreshold: 1 },

    // ====================== SPECIALTY INGREDIENTS ======================
    'lumpia_wrapper': { name: 'Lumpia Wrapper', current: 60, max: 100, unit: 'pack', minThreshold: 20 },
    'dynamite': { name: 'Dynamite', current: 30, max: 50, unit: 'kg', minThreshold: 8 },
    'nachos': { name: 'Nachos Chips', current: 30, max: 50, unit: 'kg', minThreshold: 10 },
    'french_fries': { name: 'French Fries', current: 30, max: 50, unit: 'kg', minThreshold: 10 },
    'Breadcrumbs': { name: 'Breadcrumbs', current: 20, max: 40, unit: 'kg', minThreshold: 5 },

    // ====================== KOREAN INGREDIENTS (MISSING) ======================
    'gochujang': { name: 'Gochujang', current: 10, max: 20, unit: 'kg', minThreshold: 3 },
    'Chili flakes': { name: 'Chili Flakes', current: 5, max: 15, unit: 'kg', minThreshold: 2 },
    'Cornstarch': { name: 'Cornstarch', current: 10, max: 20, unit: 'kg', minThreshold: 3 },

    // ====================== ITALIAN INGREDIENTS (MISSING) ======================
    'Parmesan': { name: 'Parmesan Cheese', current: 10, max: 20, unit: 'kg', minThreshold: 3 },
    'Tomato sauce': { name: 'Tomato Sauce', current: 20, max: 40, unit: 'liter', minThreshold: 5 },
    'Basil': { name: 'Fresh Basil', current: 5, max: 10, unit: 'kg', minThreshold: 2 },
    'Oregano': { name: 'Oregano', current: 5, max: 10, unit: 'kg', minThreshold: 2 },

    // ====================== ASIAN SEASONINGS (MISSING) ======================
    'White pepper': { name: 'White Pepper', current: 5, max: 10, unit: 'kg', minThreshold: 2 },
    'Star anise': { name: 'Star Anise', current: 5, max: 10, unit: 'kg', minThreshold: 2 },
    'Cinnamon': { name: 'Cinnamon', current: 5, max: 10, unit: 'kg', minThreshold: 1 },
    'Ginger': { name: 'Ginger', current: 10, max: 20, unit: 'kg', minThreshold: 3 },

    // ====================== BAKING INGREDIENTS (MISSING) ======================
    'Flour': { name: 'Flour', current: 30, max: 60, unit: 'kg', minThreshold: 10 },
    'All-purpose flour': { name: 'All-Purpose Flour', current: 25, max: 50, unit: 'kg', minThreshold: 10 },
    'Baking powder': { name: 'Baking Powder', current: 5, max: 10, unit: 'kg', minThreshold: 2 },
    'Baking soda': { name: 'Baking Soda', current: 5, max: 10, unit: 'kg', minThreshold: 2 },
    'Vanilla extract': { name: 'Vanilla Extract', current: 5, max: 10, unit: 'liter', minThreshold: 1 },

    // ====================== THICKENING AGENTS (MISSING) ======================
    'Starch': { name: 'Starch', current: 10, max: 20, unit: 'kg', minThreshold: 3 },
    'Soda 1.5L Coke': { name: 'Soda 1.5L Coke', current: 5, max: 10, unit: 'liter', minThreshold: 1 },
    'Soda 1.5L Coke Zero': { name: 'Soda 1.5L Coke Zero', current: 5, max: 10, unit: 'liter', minThreshold: 1 },
    'Soda 1.5L Royal': { name: 'Soda 1.5L Royal', current: 5, max: 10, unit: 'liter', minThreshold: 1 }
};

// ==================== SERVINGWARE INVENTORY ====================
const servingwareInventory = {
    'plate': { name: 'Plate', current: 100, max: 100, unit: 'piece', minThreshold: 20 },
    'tray': { name: 'Party Tray', current: 100, max: 100, unit: 'piece', minThreshold: 15 },
    'glass': { name: 'Glass', current: 100, max: 100, unit: 'piece', minThreshold: 25 },
    'sizzling plate': { name: 'Sizzling Plate', current: 100, max: 100, unit: 'piece', minThreshold: 20 },
    'cup': { name: 'Coffee Cup', current: 100, max: 100, unit: 'piece', minThreshold: 20 },
    'bowl': { name: 'Rice Bowl', current: 100, max: 100, unit: 'piece', minThreshold: 30 },
    'pitcher': { name: 'Pitcher', current: 50, max: 50, unit: 'piece', minThreshold: 10 },
    'plastic_bottle': { name: 'Plastic Bottle', current: 100, max: 100, unit: 'piece', minThreshold: 20 },
    'serving': { name: 'Serving Plate', current: 80, max: 80, unit: 'piece', minThreshold: 15 },
    'sandwich': { name: 'Sandwich Plate', current: 50, max: 50, unit: 'piece', minThreshold: 10 },
    'meal': { name: 'Meal Tray', current: 100, max: 100, unit: 'piece', minThreshold: 20 },
    'pot': { name: 'Cooking Pot', current: 30, max: 30, unit: 'piece', minThreshold: 5 }
};

// ==================== PRODUCT INGREDIENT MAPPING ====================
const productIngredientMap = {
    // ==================== 🍚 RICE BOWL MEALS - PORK ====================
    'Korean Spicy Bulgogi (Pork)': {
        ingredients: { 
            'Pork': 0.25, 
            'gochujang': 0.03, 
            'Soy sauce': 0.03, 
            'Garlic': 0.02, 
            'Onion': 0.05, 
            'Sugar': 0.01, 
            'Sesame oil': 0.02, 
            'Chili flakes': 0.005, 
            'Black pepper': 0.005 
        },
        servingware: 'plate'
    },
    'Korean Salt and Pepper (Pork)': {
        ingredients: { 
            'Pork': 0.25, 
            'Salt': 0.01, 
            'Black pepper': 0.01, 
            'Garlic': 0.02, 
            'Chili flakes': 0.005, 
            'Cornstarch': 0.02 
        },
        servingware: 'plate'
    },
    'Crispy Pork Lechon Kawali': {
        ingredients: { 
            'Pork Belly': 0.35, 
            'Garlic': 0.03, 
            'Bay leaves': 2, 
            'Peppercorn': 0.01, 
            'Salt': 0.01, 
            'Cooking oil': 0.25 
        },
        servingware: 'plate'
    },
    'Cream Dory Fish Fillet': {
        ingredients: { 
            'Cream Dory': 0.25, 
            'Flour': 0.05, 
            'Salt': 0.01, 
            'Black pepper': 0.005, 
            'Butter': 0.05, 
            'Garlic': 0.02, 
            'Cream': 0.1 
        },
        servingware: 'plate'
    },
    'Buttered Honey Chicken': {
        ingredients: { 
            'Chicken': 0.25, 
            'Butter': 0.05, 
            'Honey': 0.07, 
            'Garlic': 0.02, 
            'Soy sauce': 0.02, 
            'Black pepper': 0.005 
        },
        servingware: 'plate'
    },
    'Buttered Spicy Chicken': {
        ingredients: { 
            'Chicken': 0.25, 
            'Butter': 0.05, 
            'Chili flakes': 0.01, 
            'Garlic': 0.02, 
            'Soy sauce': 0.02 
        },
        servingware: 'plate'
    },
    'Chicken Adobo': {
        ingredients: { 
            'Chicken': 0.3, 
            'Soy sauce': 0.05, 
            'Vinegar': 0.04, 
            'Garlic': 0.03, 
            'Bay leaves': 2, 
            'Peppercorn': 0.01 
        },
        servingware: 'plate'
    },
    'Pork Shanghai': {
        ingredients: { 
            'Ground Pork': 0.2, 
            'Carrot': 0.03, 
            'Onion': 0.03, 
            'Garlic': 0.02, 
            'Egg': 1, 
            'Breadcrumbs': 0.03, 
            'Lumpia wrapper': 10, 
            'Cooking oil': 0.1 
        },
        servingware: 'plate'
    },

    // ==================== HOT SIZZLERS ====================
    'Sizzling Pork Sisig': {
        ingredients: { 
            'Pork': 0.3, 
            'Onion': 0.08, 
            'Chili': 0.02, 
            'Calamansi': 0.03, 
            'Mayonnaise': 0.05, 
            'Soy sauce': 0.02, 
            'Egg': 1, 
            'Cooking oil': 0.1,
            'sizzling plate': 0.1
        },
        servingware: 'sizzling plate'
    },
    'Sizzling Liempo': {
        ingredients: { 
            'Pork Belly': 0.3, 
            'Garlic': 0.02, 
            'Soy sauce': 0.03, 
            'Black pepper': 0.01, 
            'Cooking oil': 0.1,
            'sizzling plate': 0.1
        },
        servingware: 'sizzling plate'
    },
    'Sizzling Porkchop': {
        ingredients: { 
            'Pork Chop': 0.35, 
            'Garlic': 0.02, 
            'Soy sauce': 0.03, 
            'Black pepper': 0.01, 
            'Cooking oil': 0.1,
            'sizzling plate': 0.1
        },
        servingware: 'sizzling plate'
    },
    'Sizzling Fried Chicken': {
        ingredients: { 
            'Chicken': 0.35, 
            'Flour': 0.03, 
            'Garlic': 0.02, 
            'Black pepper': 0.01, 
            'Gravy': 0.2, 
            'Cooking oil': 0.1,
            'sizzling plate': 0.1
        },
        servingware: 'sizzling plate'
    },

    // ==================== PARTY TRAYS ====================
    'Pancit Bihon (S)': {
        ingredients: { 
            'Bihon noodles': 0.3, 
            'Chicken': 0.06, 
            'Cabbage': 0.09, 
            'Carrot': 0.06, 
            'Garlic': 0.02, 
            'Onion': 0.03, 
            'Soy sauce': 0.03, 
            'Oyster sauce': 0.01, 
            'Cooking oil': 0.03,
            'Calamansi': 0.02,
            'Tray S': 0.05
        },
        servingware: 'tray'
    },
    'Pancit Bihon (M)': {
        ingredients: { 
            'Bihon noodles': 0.4, 
            'Chicken': 0.08, 
            'Cabbage': 0.12, 
            'Carrot': 0.08, 
            'Garlic': 0.025, 
            'Onion': 0.04, 
            'Soy sauce': 0.04, 
            'Oyster sauce': 0.015, 
            'Cooking oil': 0.04,
            'Calamansi': 0.02,
            'Tray M': 0.05
        },
        servingware: 'tray'
    },
    'Pancit Bihon (L)': {
        ingredients: { 
            'Bihon noodles': 0.6, 
            'Chicken': 0.12, 
            'Cabbage': 0.18, 
            'Carrot': 0.12, 
            'Garlic': 0.035, 
            'Onion': 0.06, 
            'Soy sauce': 0.06, 
            'Oyster sauce': 0.025, 
            'Cooking oil': 0.06,
            'Calamansi': 0.02,
            'Tray L': 0.05
        },
        servingware: 'tray'
    },

    'Pancit Canton (S)': {
        ingredients: { 
            'Canton noodles': 0.3,
            'Bihon noodles': 0.1,
            'Chicken': 0.06, 
            'Cabbage': 0.09, 
            'Carrot': 0.06, 
            'Garlic': 0.02, 
            'Onion': 0.03, 
            'Soy sauce': 0.03, 
            'Oyster sauce': 0.01, 
            'Cooking oil': 0.03,
            'Calamansi': 0.02,
            'Tray S': 0.05
        },
        servingware: 'tray'
    },

    'Pancit Canton (M)': {
        ingredients: { 
            'Canton noodles': 0.4,
            'Bihon noodles': 0.15,
            'Chicken': 0.08, 
            'Cabbage': 0.12, 
            'Carrot': 0.08, 
            'Garlic': 0.025,
            'Onion': 0.04,
            'Soy sauce': 0.04, 
            'Oyster sauce': 0.015, 
            'Cooking oil': 0.04,
            'Calamansi': 0.02,
            'Tray M': 0.05
        },
        servingware: 'tray'
    },
    
    'Pancit Canton (L)': {
        ingredients: { 
            'Canton noodles': 0.6,
            'Bihon noodles': 0.2,
            'Chicken': 0.12, 
            'Cabbage': 0.18,    
            'Carrot': 0.12,
            'Garlic': 0.035,
            'Onion': 0.06,
            'Soy sauce': 0.06, 
            'Oyster sauce': 0.025, 
            'Cooking oil': 0.06,
            'Calamansi': 0.02,
            'Tray L': 0.05
        },
        servingware: 'tray'
    },  

    'Spaghetti (S)': {
        ingredients: { 
            'Spaghetti pasta': 0.5, 
            'Sweet Tomato paste': 0.2, 
            'Ground meat': 0.15, 
            'Hotdog': 0.1, 
            'Cheese': 0.08, 
            'Garlic': 0.02, 
            'Onion': 0.03, 
            'Cooking oil': 0.05, 
            'Tray S': 0.05,
        },
        servingware: 'tray'
    },

    'Spaghetti (M)': {
        ingredients: { 
            'Spaghetti pasta': 0.75, 
            'Sweet Tomato paste': 0.3, 
            'Ground meat': 0.225, 
            'Hotdog': 0.15, 
            'Cheese': 0.12,
            'Garlic': 0.03, 
            'Onion': 0.045, 
            'Cooking oil': 0.075,
            'Tray M': 0.05
        },
        servingware: 'tray'
    },

    'Spaghetti (L)': {
        ingredients: { 
            'Spaghetti pasta': 1,
            'Sweet Tomato paste': 0.4, 
            'Ground meat': 0.3, 
            'Hotdog': 0.2, 
            'Cheese': 0.16,
            'Garlic': 0.04, 
            'Onion': 0.06, 
            'Cooking oil': 0.1,
            'Tray L': 0.05
        },
        servingware: 'tray'
    },

    'Kare-Kare': {
        ingredients: { 
        'Oxtail': 0.3,
        'Banana Flower Bud': 0.1,
        'Pechay': 0.1,
        'String Beans': 0.1,
        'Eggplant': 0.1,
        'Ground peanuts': 0.1,
        'Peanut butter': 0.1,
        'Shrimp paste': 0.1,
        'Water': 1,
        'Annatto oil': 0.05,
        'Toasted ground Rice': 0.1,
        'Garlic': 0.02,
        'Onion': 0.03,
        'Salt': 0.01,
        'Black Pepper': 0.01
        },
        servingware: 'tray'
    },

    // ==================== 🥤 DRINKS & LEMONADES ====================
    'Cucumber Lemonade (Glass)': {
        ingredients: { 
            'cucumber': 0.1, 
            'lemon': 0.1, 
            'Sugar': 0.05, 
            'water': 0.3, 
            'Ice': 0.1 
        },
        servingware: 'glass'
    },
    'Blue Lemonade (Glass)': {
        ingredients: { 
            'lemon': 0.15, 
            'Sugar': 0.08,
            'water': 0.3, 
            'Ice': 0.1,
            'Blue Syrup': 0.02
        },
        servingware: 'glass'
    },
    'Red Tea (Glass)': {
        ingredients: { 
            'Black Tea': 0.02, 
            'Sugar': 0.05, 
            'water': 0.3, 
            'Ice': 0.1 
        },
        servingware: 'glass'
    },
    'Lemon Iced Tea (Glass)': {
        ingredients: { 
            'Black Tea': 0.02, 
            'lemon': 0.08,
            'Sugar': 0.05,
            'water': 0.3,
            'Ice': 0.1
        },
        servingware: 'glass'
    },
    'Green Tea (Glass)': {
        ingredients: { 
            'Green Tea': 0.02,
            'Sugar': 0.05,
            'water': 0.3,
            'Ice': 0.1,
            'lemon': 0.03
        },
        servingware: 'glass'
    },
    'Mango Juice (Glass)': {
        ingredients: { 
            'mango': 0.2,
            'Sugar': 0.05,
            'water': 0.2,
            'Ice': 0.1
        },
        servingware: 'glass'
    },
    'Strawberry Juice (Glass)': {
        ingredients: { 
            'strawberry': 0.15,
            'Sugar': 0.05,
            'water': 0.25,
            'Ice': 0.1
        },
        servingware: 'glass'
    },

    'Soda 1.5L Coke': {
        ingredients: { 
            'Soda 1.5L Coke': 0.1,
        },
        servingware: 'bottle'
    },

    'Soda 1.5L Coke Zero': {
        ingredients: {
            'Soda 1.5L Coke Zero': 0.1,
        },
    },

    'Soda 1.5L Sprite': {
        ingredients: { 
            'Soda 1.5L Sprite': 0.1,
        },
        servingware: 'bottle'
    },
    
    'Soda 1.5L Royal': {
        ingredients: { 
           'Soda 1.5L Royal': 0.1,
        },
        servingware: 'bottle'
    },

    'Soda (Mismo) Coke': {
        ingredients: { 
            'Soda (Mismo) Coke': 0.1,
        },
        servingware: 'bottle'
    },

    'Soda (Mismo) Sprite': {
        ingredients: { 
            'Soda (Mismo) Sprite': 0.1,
        },
        servingware: 'bottle'
    },

    'Soda (Mismo) Royal': {
        ingredients: { 
            'Soda (Mismo) Royal': 0.1,
        },
        servingware: 'bottle'
    },

    // ==================== ☕ COFFEE VARIETIES ====================
    'Cafe Americano (Grande)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'water': 0.2,
            'Sugar': 0.03
        },
        servingware: 'cup'
    },
    'Cafe Americano (Tall)': {
        ingredients: {
            'coffee_beans': 0.03,
            'water': 0.2,
            'Sugar': 0.03
        },
        servingware: 'cup'
    },

    'Cafe Americano Hot (Grande)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'water': 0.2,
            'Sugar': 0.03
        },
        servingware: 'cup'
    },
    'Cafe Americano Hot (Tall)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'water': 0.2,
            'Sugar': 0.03
        },
        servingware: 'cup'
    },
    
    'Cafe Latte': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.25,
            'Sugar': 0.03
        },
        servingware: 'cup'
    },
    'Cafe Latte (Grande)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.25,
            'Sugar': 0.03
        },
        servingware: 'cup'
    },
    'Cafe Latte (Tall)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.25,
            'Sugar': 0.03
        },
        servingware: 'cup'
    },
    'Caramel Macchiato': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2, 
            'Caramel Syrup': 0.03, 
            'Vanilla extract': 0.01,
            'Sugar': 0.03
        },
        servingware: 'cup'
    },
    'Caramel Macchiato (Grande)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2, 
            'Caramel Syrup': 0.03, 
            'Vanilla extract': 0.01,
            'Sugar': 0.03
        },
        servingware: 'cup'
    },
    'Caramel Macchiato (Tall)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2, 
            'Caramel Syrup': 0.03, 
            'Vanilla extract': 0.01,
            'Sugar': 0.03
        },
        servingware: 'cup'
    },
    'Caramel Macchiato Hot': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2, 
            'Caramel Syrup': 0.03, 
            'Vanilla extract': 0.01,
            'Sugar': 0.03
        },
        servingware: 'cup'
    },
    'Caramel Macchiato Hot (Grande)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2, 
            'Caramel Syrup': 0.03, 
            'Vanilla extract': 0.01,
            'Sugar': 0.03
        },
        servingware: 'cup'
    },
    'Caramel Macchiato Hot (Tall)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2, 
            'Caramel Syrup': 0.03, 
            'Vanilla extract': 0.01,
            'Sugar': 0.03
        },
        servingware: 'cup'
    },
    'Iced Caramel Macchiato': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2, 
            'Caramel Syrup': 0.03, 
            'Vanilla extract': 0.01,
            'Sugar': 0.03,
            'Ice': 0.2
        },
        servingware: 'cup'
    },
    'Iced Caramel Macchiato (Grande)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2, 
            'Caramel Syrup': 0.03, 
            'Vanilla extract': 0.01,
            'Sugar': 0.03,
            'Ice': 0.2
        },
        servingware: 'cup'
    },
    'Iced Caramel Macchiato (Tall)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2, 
            'Caramel Syrup': 0.03, 
            'Vanilla extract': 0.01,
            'Sugar': 0.03,
            'Ice': 0.2
        },
        servingware: 'cup'
    },
    'Caramel Milk Tea': {
        ingredients: { 
            'Black Tea': 0.02, 
            'Milk': 0.2, 
            'Caramel Syrup': 0.04,
            'Sugar': 0.05, 
            'water': 0.15
        },
        servingware: 'cup'
    },
    'Salted Caramel Frappe (Regular)': {
        ingredients: { 
            'Ice': 0.2, 
            'Milk': 0.2, 
            'Caramel Syrup': 0.05, 
            'Cream': 0.1,
            'Sugar': 0.05,
            'Salt': 0.003,
            'water': 0.1
        },
        servingware: 'cup'
    },

    'Salted Caramel Frappe (Premium)': {
        ingredients: { 
            'Ice': 0.2, 
            'Milk': 0.2, 
            'Caramel Syrup': 0.07, 
            'Cream': 0.15,
            'Sugar': 0.05,
            'Salt': 0.003,
            'water': 0.1
        },
        servingware: 'cup'
    },

    'Iced Americano': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'water': 0.2,
            'Sugar': 0.03,
            'Ice': 0.2
        },
        servingware: 'cup'
    },
    'Iced Americano (Grande)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'water': 0.2,
            'Sugar': 0.03,
            'Ice': 0.2
        },
        servingware: 'cup'
    },
    'Iced Americano (Tall)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'water': 0.2,
            'Sugar': 0.03,
            'Ice': 0.2
        },
        servingware: 'cup'
    },
    'Iced Latte': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2,
            'Sugar': 0.03,
            'Ice': 0.2
        },
        servingware: 'cup'
    },
    'Iced Latte (Grande)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2,
            'Sugar': 0.03,
            'Ice': 0.2
        },
        servingware: 'cup'
    },
    'Iced Latte (Tall)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2,
            'Sugar': 0.03,
            'Ice': 0.2
        },
        servingware: 'cup'
    },
    'Iced Mocha': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2, 
            'Cocoa powder': 0.02,
            'Sugar': 0.03,
            'Ice': 0.2
        },
        servingware: 'cup'
    },
    'Iced Mocha (Grande)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2, 
            'Cocoa powder': 0.02,
            'Sugar': 0.03,
            'Ice': 0.2
        },
        servingware: 'cup'
    },
    'Iced Mocha (Tall)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2, 
            'Cocoa powder': 0.02,
            'Sugar': 0.03,
            'Ice': 0.2
        },
        servingware: 'cup'
    },
    'Cappuccino': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.25,
            'Sugar': 0.03,
            'Foam': 0.05
        },
        servingware: 'cup'
    },
    'Cappuccino (Grande)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.25,
            'Sugar': 0.03,
            'Foam': 0.05
        },
        servingware: 'cup'
    },
    'Cappuccino (Tall)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.25,
            'Sugar': 0.03,
            'Foam': 0.05
        },
        servingware: 'cup'
    },
    'Mocha': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2, 
            'Cocoa powder': 0.02,
            'Sugar': 0.03
        },
        servingware: 'cup'
    },
    'Mocha (Grande)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2, 
            'Cocoa powder': 0.02,
            'Sugar': 0.03
        },
        servingware: 'cup'
    },
    'Mocha (Tall)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2, 
            'Cocoa powder': 0.02,
            'Sugar': 0.03
        },
        servingware: 'cup'
    },
    'Espresso': {
        ingredients: { 
            'coffee_beans': 0.02, 
            'water': 0.08,
            'Sugar': 0.02
        },
        servingware: 'cup'
    },
    'Espresso (Grande)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'water': 0.12,
            'Sugar': 0.03
        },
        servingware: 'cup'
    },
    'Espresso (Tall)': {
        ingredients: { 
            'coffee_beans': 0.025, 
            'water': 0.1,
            'Sugar': 0.025
        },
        servingware: 'cup'
    },
    'Vanilla Latte': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2,
            'Vanilla extract': 0.01,
            'Sugar': 0.03
        },
        servingware: 'cup'
    },
    'Vanilla Latte (Grande)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.25,
            'Vanilla extract': 0.01,
            'Sugar': 0.03
        },
        servingware: 'cup'
    },
    'Vanilla Latte (Tall)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2,
            'Vanilla extract': 0.01,
            'Sugar': 0.03
        },
        servingware: 'cup'
    },
    'Mocha Latte': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2, 
            'Cocoa powder': 0.02,
            'Sugar': 0.03
        },
        servingware: 'cup'
    },
    'Mocha Latte (Grande)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.25, 
            'Cocoa powder': 0.02,
            'Sugar': 0.03
        },
        servingware: 'cup'
    },
    'Mocha Latte (Tall)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2, 
            'Cocoa powder': 0.02,
            'Sugar': 0.03
        },
        servingware: 'cup'
    },
    'White Chocolate': {
        ingredients: { 
            'White Chocolate Syrup': 0.04, 
            'Milk': 0.2,
            'Sugar': 0.03
        },
        servingware: 'cup'
    },
    'White Chocolate (Grande)': {
        ingredients: { 
            'White Chocolate Syrup': 0.05, 
            'Milk': 0.25,
            'Sugar': 0.03
        },
        servingware: 'cup'
    },
    'White Chocolate (Tall)': {
        ingredients: { 
            'White Chocolate Syrup': 0.04, 
            'Milk': 0.2,
            'Sugar': 0.03
        },
        servingware: 'cup'
    },
    'Iced Mocha Latte': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2, 
            'Cocoa powder': 0.02,
            'Sugar': 0.03,
            'Ice': 0.2
        },
        servingware: 'cup'
    },
    'Iced Mocha Latte (Grande)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.25, 
            'Cocoa powder': 0.02,
            'Sugar': 0.03,
            'Ice': 0.2
        },
        servingware: 'cup'
    },
    'Iced Mocha Latte (Tall)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2, 
            'Cocoa powder': 0.02,
            'Sugar': 0.03,
            'Ice': 0.2
        },
        servingware: 'cup'
    },
    'Iced Vanilla Latte': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2,
            'Vanilla extract': 0.01,
            'Sugar': 0.03,
            'Ice': 0.2
        },
        servingware: 'cup'
    },
    'Iced Vanilla Latte (Grande)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.25,
            'Vanilla extract': 0.01,
            'Sugar': 0.03,
            'Ice': 0.2
        },
        servingware: 'cup'
    },
    'Iced Vanilla Latte (Tall)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2,
            'Vanilla extract': 0.01,
            'Sugar': 0.03,
            'Ice': 0.2
        },
        servingware: 'cup'
    },
    'Iced White Chocolate': {
        ingredients: { 
            'White Chocolate Syrup': 0.04, 
            'Milk': 0.2,
            'Sugar': 0.03,
            'Ice': 0.2
        },
        servingware: 'cup'
    },
    'Iced White Chocolate (Grande)': {
        ingredients: { 
            'White Chocolate Syrup': 0.05, 
            'Milk': 0.25,
            'Sugar': 0.03,
            'Ice': 0.2
        },
        servingware: 'cup'
    },
    'Iced White Chocolate (Tall)': {
        ingredients: { 
            'White Chocolate Syrup': 0.04, 
            'Milk': 0.2,
            'Sugar': 0.03,
            'Ice': 0.2
        },
        servingware: 'cup'
    },
    'Iced Café Latte': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2,
            'Sugar': 0.03,
            'Ice': 0.2
        },
        servingware: 'cup'
    },
    'Iced Café Latte (Grande)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.25,
            'Sugar': 0.03,
            'Ice': 0.2
        },
        servingware: 'cup'
    },
    'Iced Café Latte (Tall)': {
        ingredients: { 
            'coffee_beans': 0.03, 
            'Milk': 0.2,
            'Sugar': 0.03,
            'Ice': 0.2
        },
        servingware: 'cup'
    },
    'Iced Dark Chocolate': {
        ingredients: { 
            'Dark Chocolate Syrup': 0.04, 
            'Milk': 0.2,
            'Sugar': 0.03,
            'Ice': 0.2
        },
        servingware: 'cup'
    },
    'Iced Dark Chocolate (Grande)': {
        ingredients: { 
            'Dark Chocolate Syrup': 0.05, 
            'Milk': 0.25,
            'Sugar': 0.03,
            'Ice': 0.2
        },
        servingware: 'cup'
    },
    'Iced Dark Chocolate (Tall)': {
        ingredients: { 
            'Dark Chocolate Syrup': 0.04, 
            'Milk': 0.2,
            'Sugar': 0.03,
            'Ice': 0.2
        },
        servingware: 'cup'
    },

    // ==================== 🍵 MILK TEA VARIETIES ====================
    'Milk Tea (Regular)': {
        ingredients: { 
            'Black Tea': 0.02, 
            'Milk': 0.2, 
            'Sugar': 0.05, 
            'Tapioca Pearls': 0.03,
            'Boba Straws': 1
        },
        servingware: 'cup'
    },

    'Milk Tea (MC)': {
        ingredients: { 
            'Black Tea': 0.02,
            'Milk': 0.2,
            'Sugar': 0.05, 
            'Tapioca Pearls': 0.03,
            'Boba Straws': 1
        },
        servingware: 'cup'
    },
    
    'Milk Tea (HC)': {
        ingredients: { 
            'Black Tea': 0.02,
            'Milk': 0.2,
            'Sugar': 0.05, 
            'Tapioca Pearls': 0.03,
            'Boba Straws': 1
        },
        servingware: 'cup'
    },

    'Matcha Green Tea (Regular)': {
        ingredients: { 
            'Matcha Powder': 0.01, 
            'Milk': 0.25, 
            'Sugar': 0.05,
            'Boba Straws': 1
        },
        servingware: 'cup'
    }, 

    'Matcha Green Tea (MC)': {
        ingredients: { 
            'Matcha Powder': 0.01, 
            'Milk': 0.25, 
            'Sugar': 0.05,
            'Boba Straws': 1
        },
        servingware: 'cup'
    },

    'Matcha Green Tea (HC)': {
        ingredients: { 
            'Matcha Powder': 0.01, 
            'Milk': 0.25, 
            'Sugar': 0.05,
            'Boba Straws': 1
        },
        servingware: 'cup'
    },

    'Okinawa Milk Tea (Regular)': {
        ingredients: { 
            'Black Tea': 0.02, 
            'Milk': 0.2, 
            'Okinawa Brown Sugar': 0.05,
            'Boba Straws': 1
        },
        servingware: 'cup'
    },

    'Okinawa Milk Tea (MC)': {
        ingredients: { 
            'Black Tea': 0.02,
            'Milk': 0.2,
            'Okinawa Brown Sugar': 0.05,
            'Boba Straws': 1
        },
        servingware: 'cup'
    },
    
    'Okinawa Milk Tea (HC)': {
        ingredients: { 
            'Black Tea': 0.02,
            'Milk': 0.2,
            'Okinawa Brown Sugar': 0.05,
            'Boba Straws': 1
        },
        servingware: 'cup'
    },

    'Wintermelon Milk Tea (HC)': {
        ingredients: { 
            'Black Tea': 0.02, 
            'Milk': 0.2, 
            'Wintermelon Syrup': 0.05,
            'Boba Straws': 1
        },
        servingware: 'cup'
    },

    'Wintermelon Milk Tea (MC)': {
        ingredients: { 
            'Black Tea': 0.02,
            'Milk': 0.2, 
            'Wintermelon Syrup': 0.05,
            'Boba Straws': 1
        },
        servingware: 'cup'
    },

    'Wintermelon Milk Tea (Regular)': {
        ingredients: { 
            'Black Tea': 0.02,
            'Milk': 0.2, 
            'Wintermelon Syrup': 0.05,
            'Boba Straws': 1
        },
        servingware: 'cup'
    },


    'Caramel Milk Tea (MC)': {
        ingredients: { 
            'Black Tea': 0.02,
            'Milk': 0.2,
            'Caramel Syrup': 0.05,
            'Sugar': 0.05,
            'Boba Straws': 1
        },
        servingware: 'cup'
    },

    'Caramel Milk Tea (HC)': {
        ingredients: {
            'Black Tea': 0.02,
            'Milk': 0.2,
            'Caramel Syrup': 0.05,
            'Sugar': 0.05,
            'Boba Straws': 1
        },
        servingware: 'cup'
    },

    'Caramel Milk Tea (Regular)': {
        ingredients: {
            'Black Tea': 0.02,
            'Milk': 0.2,
            'Caramel Syrup': 0.05,
            'Sugar': 0.05,
            'Boba Straws': 1
        },
        servingware: 'cup'
    },

    'Dark Chocolate Milk Tea (MC)': {
        ingredients: { 
            'Black Tea': 0.02,
            'Milk': 0.2,
            'Cocoa powder': 0.02,
            'Sugar': 0.05,
            'Boba Straws': 1
        },
        servingware: 'cup'
    },

    'Dark Choco Milk Tea (HC)': {
        ingredients: { 
            'Black Tea': 0.02,
            'Milk': 0.2,
            'Cocoa powder': 0.02,
            'Sugar': 0.05,
            'Boba Straws': 1
        },
        servingware: 'cup'
    },

    'Dark Chocolate Milk Tea (Regular)': {
        ingredients: { 
            'Black Tea': 0.02,
            'Milk': 0.2,
            'Cocoa powder': 0.02,
            'Sugar': 0.05,
            'Boba Straws': 1
        },
        servingware: 'cup'
    },

    'Strawberry Milk Tea (HC) ': {
        ingredients: { 
            'Black Tea': 0.02,
            'Milk': 0.2,
            'Strawberry Syrup': 0.05,
            'Sugar': 0.05,
            'Boba Straws': 1
        },
        servingware: 'cup'
    },

    'Strawberry Milk Tea (MC) ': {
        ingredients: { 
            'Black Tea': 0.02,
            'Milk': 0.2,
            'Strawberry Syrup': 0.05,
            'Sugar': 0.05,
            'Boba Straws': 1
        },
        servingware: 'cup'
    },

    'Strawberry Milk Tea (Regular) ': {
        ingredients: { 
            'Black Tea': 0.02,
            'Milk': 0.2,
            'Strawberry Syrup': 0.05,
            'Sugar': 0.05,
            'Boba Straws': 1
        },
        servingware: 'cup'
    },

    'Black Tea (Grande)': {
        ingredients: { 
            'Black Tea': 0.02,
            'Hot Water': 0.25,
            'Sugar': 0.05
        },
        servingware: 'cup'
    },

    'Black Tea (Tall)': {
        ingredients: { 
            'Black Tea': 0.02,
            'Hot Water': 0.2,
            'Sugar': 0.05
        },
        servingware: 'cup'
    },

    'Green Tea Latte': {
        ingredients: { 
            'Green Tea': 0.02,
            'Milk': 0.2,
            'Sugar': 0.05
        },
        servingware: 'cup'
    },

    'Green Tea Latte (Grande)': {
        ingredients: { 
            'Green Tea': 0.02,
            'Milk': 0.25,
            'Sugar': 0.05
        },
        servingware: 'cup'
    },

    'Green Tea Latte (Tall)': {
        ingredients: { 
            'Green Tea': 0.02,
            'Milk': 0.2,
            'Sugar': 0.05
        },
        servingware: 'cup'
    },

    'Green Tea Matcha': {
        ingredients: { 
            'Matcha Powder': 0.01,
            'Milk': 0.2,
            'Sugar': 0.05
        },
        servingware: 'cup'
    },

    'Green Tea Matcha (Grande)': {
        ingredients: { 
            'Matcha Powder': 0.01,
            'Milk': 0.25,
            'Sugar': 0.05
        },
        servingware: 'cup'
    },

    'Green Tea Matcha (Tall)': {
        ingredients: { 
            'Matcha Powder': 0.01,
            'Milk': 0.2,
            'Sugar': 0.05
        },
        servingware: 'cup'
    },

    'Lemon Tea': {
        ingredients: { 
            'Black Tea': 0.02,
            'lemon': 0.05,
            'water': 0.2,
            'Sugar': 0.05
        },
        servingware: 'cup'
    },

    'Lemon Tea (Grande)': {
        ingredients: { 
            'Black Tea': 0.02,
            'lemon': 0.08,
            'water': 0.25,
            'Sugar': 0.05
        },
        servingware: 'cup'
    },

    'Lemon Tea (Tall)': {
        ingredients: { 
            'Black Tea': 0.02,
            'lemon': 0.05,
            'water': 0.2,
            'Sugar': 0.05
        },
        servingware: 'cup'
    },

    'Peppermint Tea': {
        ingredients: { 
            'Black Tea': 0.02,
            'Peppermint extract': 0.005,
            'water': 0.2,
            'Sugar': 0.05
        },
        servingware: 'cup'
    },

    'Peppermint Tea (Grande)': {
        ingredients: { 
            'Black Tea': 0.02,
            'Peppermint extract': 0.007,
            'water': 0.25,
            'Sugar': 0.05
        },
        servingware: 'cup'
    },

    'Peppermint Tea (Tall)': {
        ingredients: { 
            'Black Tea': 0.02,
            'Peppermint extract': 0.005,
            'water': 0.2,
            'Sugar': 0.05
        },
        servingware: 'cup'
    },

    // ==================== FRAPPE ====================
    'Matcha Green Tea Frappe (Regular)': {
        ingredients: { 
            'Matcha Powder': 0.01, 
            'Milk': 0.25, 
            'Sugar': 0.05,
            'Ice': 0.2,
            'Cream': 0.1,
            'water': 0.1
        },
        servingware: 'cup'
    },

    'Matcha Green Tea Frappe (Premium)': {
        ingredients: { 
            'Matcha Powder': 0.015, 
            'Milk': 0.25, 
            'Sugar': 0.05,
            'Ice': 0.2,
            'Cream': 0.15,
            'water': 0.1
        },
        servingware: 'cup'
    },

    'Cookies & Cream Frappe (Regular)': {
        ingredients: { 
            'Ice': 0.2, 
            'Milk': 0.2, 
            'Cream': 0.1,
            'Cookie Crumbs': 0.03,
            'Sugar': 0.05,
            'water': 0.1
        },
        servingware: 'cup'
    },

    'Cookies & Cream Frappe (Premium)': {
        ingredients: { 
            'Ice': 0.2, 
            'Milk': 0.2, 
            'Cream': 0.15,
            'Cookie Crumbs': 0.05,
            'Sugar': 0.05,
            'water': 0.1
        },
        servingware: 'cup'
    },

    'Cookies & Cream Frappe Milktea (HC)': {
        ingredients: {
            'Black Tea': 0.02,
            'Milk': 0.2,
            'Cream': 0.1,
            'Cookie Crumbs': 0.03,
            'Sugar': 0.05,
            'water': 0.1
        },
        servingware: 'cup'
    },

    'Cookies & Cream Milk Tea (MC)': {
        ingredients: { 
            'Milk': 0.2, 
            'Cookie Crumbs': 0.03, 
            'Cream': 0.1,
            'Sugar': 0.05,
            'Black Tea': 0.02,
            'water': 0.15
        },
        servingware: 'cup'
    },  

    'Cookies & Cream Milk Tea (Regular)': {
        ingredients: { 
            'Milk': 0.2,
            'Cookie Crumbs': 0.03,
            'Cream': 0.1,
            'Sugar': 0.05,
            'Black Tea': 0.02,
            'water': 0.15
        },
        servingware: 'cup'
    },
    'Strawberry Cream Frappe (Regular)': {
        ingredients: { 
            'strawberry': 0.05, 
            'Milk': 0.2, 
            'Ice': 0.2, 
            'Cream': 0.1,
            'Sugar': 0.05,
            'water': 0.1
        },
        servingware: 'cup'
    },
    'Strawberry Cream Frappe (Premium)': {
        ingredients: { 
            'strawberry': 0.08, 
            'Milk': 0.2, 
            'Ice': 0.2, 
            'Cream': 0.15,
            'Sugar': 0.05,
            'water': 0.1
        },
        servingware: 'cup'
    },

    'Strawberry Cheesecake Frappe (Premium)': {
        ingredients: { 
            'strawberry': 0.1, 
            'Cream cheese': 0.1, 
            'Milk': 0.2,
            'Sugar': 0.05,
            'water': 0.1
        },
        servingware: 'cup'
    },
    'Strawberry Cheesecake Frappe (Regular)': {
        ingredients: { 
            'strawberry': 0.05, 
            'Cream cheese': 0.1, 
            'Milk': 0.2,
            'Sugar': 0.05,
            'water': 0.1
        },
        servingware: 'cup'
    },

    'Mango Cheesecake Frappe (Regular)': {
        ingredients: { 
            'mango': 0.1, 
            'Milk': 0.2, 
            'Ice': 0.2,
            'Cream': 0.08,
            'Sugar': 0.05,
            'Vanilla extract': 0.01,
            'water': 0.1
        },
        servingware: 'cup'
    },
    'Mango Cheesecake Frappe (Premium)': {
        ingredients: { 
            'mango': 0.15, 
            'Milk': 0.2, 
            'Ice': 0.2,
            'Cream': 0.12,
            'Sugar': 0.05,
            'Vanilla extract': 0.01,
            'water': 0.1
        },
        servingware: 'cup'
    },
    'Rocky Road Frappe (Regular)': {
        ingredients: { 
            'Chocolate Syrup': 0.05, 
            'Marshmallows': 0.02, 
            'Nuts': 0.02, 
            'Ice': 0.2, 
            'Milk': 0.2, 
            'Cream': 0.1,
            'Sugar': 0.05,
            'water': 0.1
        },
        servingware: 'cup'
    },
    'Rocky Road Frappe (Premium)': {
        ingredients: { 
            'Chocolate Syrup': 0.07, 
            'Marshmallows': 0.03, 
            'Nuts': 0.03, 
            'Ice': 0.2, 
            'Milk': 0.2, 
            'Cream': 0.15,
            'Sugar': 0.05,
            'water': 0.1
        },
        servingware: 'cup'
    },
    'Choco Fudge Frappe (Regular)': {
        ingredients: { 
            'Chocolate Syrup': 0.07, 
            'Ice': 0.2, 
            'Milk': 0.2, 
            'Cream': 0.1,
            'Sugar': 0.05,
            'water': 0.1
        },
        servingware: 'cup'
    },

    'Choco Fudge Frappe (Premium)': {
        ingredients: { 
            'Chocolate Syrup': 0.1,
            'Ice': 0.2,
            'Milk': 0.2,
            'Cream': 0.1,
            'Sugar': 0.05,
            'water': 0.1
        },
        servingware: 'cup'
    },

    'Choco Mousse Frappe (Regular)': {
        ingredients: { 
            'Chocolate Mousse': 0.06, 
            'Ice': 0.2, 
            'Milk': 0.2, 
            'Cream': 0.1,
            'Sugar': 0.05,
            'water': 0.1
        },
        servingware: 'cup'
    },
    'Coffee Crumble Frappe (Regular)': {
        ingredients: { 
            'Chocolate Coffee beans': 0.03, 
            'Chocolate Coffee Crumbles': 0.03, 
            'Ice': 0.2, 
            'Milk': 0.2, 
            'Cream': 0.1,
            'Sugar': 0.05,
            'water': 0.1
        },
        servingware: 'cup'
    },
    'Chocolate Coffee Frappe': {
        ingredients: { 
            'Chocolate Coffee Beans': 0.03, 
            'Ice': 0.2, 
            'Milk': 0.2, 
            'Cream': 0.1,
            'Sugar': 0.05,
            'water': 0.1
        },
        servingware: 'cup'
    },
    'Chocolate Coffee Crumbles Frappe': {
        ingredients: { 
            'Chocolate Coffee Beans': 0.03, 
            'Cookie Crumbs': 0.03, 
            'Ice': 0.2, 
            'Milk': 0.2, 
            'Cream': 0.1,
            'Sugar': 0.05,
            'water': 0.1
        },
        servingware: 'cup'
    },
    'Vanilla Cream Frappe (Regular)': {
        ingredients: { 
            'Vanilla extract': 0.04, 
            'Cream': 0.15, 
            'Ice': 0.2, 
            'Milk': 0.2,
            'Sugar': 0.05,
            'water': 0.1
        },
        servingware: 'cup'
    },
    'Chocolate Banana Frappe': {
        ingredients: { 
            'Chocolate Syrup': 0.05, 
            'mango': 0.08, 
            'Milk': 0.2, 
            'Ice': 0.2, 
            'Cream': 0.1,
            'Sugar': 0.05,
            'water': 0.1
        },
        servingware: 'cup'
    },
    'Mint Chocolate Frappe': {
        ingredients: { 
            'Chocolate Syrup': 0.05, 
            'Cinnamon': 0.002, 
            'Milk': 0.2, 
            'Ice': 0.2, 
            'Cream': 0.1,
            'Sugar': 0.05,
            'water': 0.1
        },
        servingware: 'cup'
    },

    // ==================== SNACKS & APPETIZERS ====================
    'Cheesy Nachos': {
        ingredients: { 
            'Nacho chips': 0.3, 
            'Cheese sauce': 0.15 
        },
        servingware: 'serving'
    },
    'Nachos Supreme': {
        ingredients: { 
            'Nacho chips': 0.3, 
            'Cheese': 0.15, 
            'Ground meat': 0.1, 
            'Tomato': 0.05, 
            'Onion': 0.03 
        },
        servingware: 'serving'
    },
    'French Fries': {
        ingredients: { 
            'Potato': 0.25, 
            'Cooking oil': 0.1, 
            'Salt': 0.005 
        },
        servingware: 'serving'
    },
    'Clubhouse Sandwich': {
        ingredients: { 
            'Bread': 0.1, 
            'Chicken': 0.1, 
            'Ham': 0.05, 
            'Egg': 1, 
            'Lettuce': 0.03, 
            'Tomato': 0.05, 
            'Mayonnaise': 0.02 
        },
        servingware: 'sandwich'
    },
    'Fish and Fries': {
        ingredients: { 
            'fish_fillet': 0.15, 
            'Butter': 0.05, 
            'Potato': 0.2, 
            'Cooking oil': 0.15, 
            'Salt': 0.005 
        },
        servingware: 'serving'
    },
    'Cheesy Dynamite Lumpia': {
        ingredients: { 
            'Siling Green': 0.05, 
            'Cheese': 0.05, 
            'lumpia_wrapper': 10, 
            'Cooking oil': 0.1 
        },
        servingware: 'plate'
    },

    'Fried Chicken': {
        ingredients: { 
            'Chicken': 0.25, 
            'Flour': 0.05, 
            'Garlic': 0.02, 
            'Black pepper': 0.005, 
            'Cooking oil': 0.2, 
            'Salt': 0.01 
        },
        servingware: 'plate'
    },

    // ==================== RICE VARIETIES ====================
    'Tinapa Rice': {
        ingredients: { 
            'Tinapa': 0.1, 
            'Rice': 0.3, 
            'Garlic': 0.02, 
            'Egg': 1, 
            'Cooking oil': 0.05 
        },
        servingware: 'meal'
    },
    'Tuyo Pesto (S)': {
        ingredients: { 
            'Tuyo': 0.08, 
            'Spaghetti pasta': 0.3, 
            'Garlic': 0.02, 
            'Cooking oil': 0.05, 
            'Black pepper': 0.01 
        },
        servingware: 'meal'
    },
    'Tuyo Pesto (M)': {
        ingredients: { 
            'Tuyo': 0.11, 
            'Spaghetti pasta': 0.4, 
            'Garlic': 0.03, 
            'Cooking oil': 0.07, 
            'Black pepper': 0.01 
        },
        servingware: 'meal'
    },
    'Tuyo Pesto (L)': {
        ingredients: { 
            'Tuyo': 0.13, 
            'Spaghetti pasta': 0.5, 
            'Garlic': 0.03, 
            'Cooking oil': 0.08, 
            'Black pepper': 0.02 
        },
        servingware: 'meal'
    },
    'Creamy Pesto (S)': {
        ingredients: { 
            'Spaghetti pasta': 0.3, 
            'Pesto sauce': 0.1, 
            'Garlic': 0.02,
            'Cream': 0.1,
            'Cooking oil': 0.05, 
            'Black pepper': 0.01
        },
        servingware: 'meal'
    },
    'Creamy Pesto (M)': {
        ingredients: { 
            'Spaghetti pasta': 0.4, 
            'Pesto sauce': 0.13, 
            'Garlic': 0.03,
            'Cream': 0.13,
            'Cooking oil': 0.07, 
            'Black pepper': 0.01
        },
        servingware: 'meal'
    },
    'Creamy Pesto (L)': {
        ingredients: { 
            'Spaghetti pasta': 0.5, 
            'Pesto sauce': 0.17, 
            'Garlic': 0.03,
            'Cream': 0.17,
            'Cooking oil': 0.08, 
            'Black pepper': 0.02
        },
        servingware: 'meal'
    },
    'Fried Rice': {
        ingredients: { 
            'Rice': 0.3, 
            'Garlic': 0.03, 
            'Egg': 1, 
            'Soy sauce': 0.02, 
            'Cooking oil': 0.05 
        },
        servingware: 'bowl'
    },
    'Plain Rice': {
        ingredients: { 
            'Rice': 0.25, 
            'water': 0.5 
        },
        servingware: 'bowl'
    },

    // ==================== FILIPINO SPECIALTIES ====================
    'Sinigang (Pork)': {
        ingredients: { 
            'Pork': 0.4, 
            'tamarind_mix': 0.05, 
            'Tomato': 0.05, 
            'Onion': 0.05, 
            'radish': 0.1, 
            'kangkong': 0.1 
        },
        servingware: 'pot'
    },
    'Sinigang (Shrimp)': {
        ingredients: { 
            'Shrimp': 0.35, 
            'tamarind_mix': 0.05, 
            'Tomato': 0.05, 
            'Onion': 0.05, 
            'kangkong': 0.1 
        },
        servingware: 'pot'
    },
    'Paknet (Pakbet w/ Bagnet)': {
        ingredients: { 
            'bagnet': 0.2, 
            'Eggplant': 0.15, 
            'squash': 0.15, 
            'okra': 0.1, 
            'ampalaya': 0.1, 
            'shrimp_paste': 0.02, 
            'Cooking oil': 0.05 
        },
        servingware: 'serving'
    },
    'Buttered Shrimp': {
        ingredients: { 
            'shrimp': 0.3, 
            'Butter': 0.1, 
            'Garlic': 0.03, 
            'Sugar': 0.01, 
            'Salt': 0.005 
        },
        servingware: 'serving'
    },
    'Special Bulalo': {
        ingredients: { 
            'Beef Shank': 0.8, 
            'corn': 0.1, 
            'Cabbage': 0.3, 
            'Potato': 0.2, 
            'Onion': 0.1, 
            'Peppercorn': 0.01 
        },
        servingware: 'pot'
    },
    'Special Bulalo (good for 2-3 Persons)': {
        ingredients: { 
            'Beef Shank': 0.8, 
            'corn': 0.1, 
            'Potato': 0.2, 
            'Cabbage': 0.3, 
            'Carrot': 0.15, 
            'Bay leaves': 2, 
            'Peppercorn': 0.01, 
            'Salt': 0.01, 
            'water': 1.5, 
            'beef_broth': 0.2 
        },
        servingware: 'pot'
    },
    'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)': {
        ingredients: { 
            'Beef Shank': 1.6, 
            'corn': 0.2, 
            'Potato': 0.4, 
            'Cabbage': 0.6, 
            'Carrot': 0.3, 
            'Bay leaves': 4, 
            'Peppercorn': 0.02, 
            'Salt': 0.02, 
            'water': 3.0, 
            'beef_broth': 0.4 
        },
        servingware: 'pot'
    },

    'Kare-Kare (S)': {
        ingredients: { 
            'Oxtail': 0.3, 
            'Peanut Butter': 0.05, 
            'Eggplant': 0.1, 
            'String Beans': 0.1, 
            'Banana Blossom': 0.1,
            'Cooking oil': 0.05,
            'Garlic': 0.02,
            'Onion': 0.05,
            'Salt': 0.01,
            'Pepper': 0.005
        },
        servingware: 'pot'
    },

    'Kare-Kare (M)': {
        ingredients: { 
            'Oxtail': 0.5, 
            'Peanut Butter': 0.08, 
            'Eggplant': 0.15,
            'String Beans': 0.15,
            'Banana Blossom': 0.15,
            'Cooking oil': 0.08,
            'Garlic': 0.03,
            'Onion': 0.08,
            'Salt': 0.015,
            'Pepper': 0.007
        },
        servingware: 'pot'
    },

    'Kare-Kare (L)': {
        ingredients: { 
            'Oxtail': 0.8, 
            'Peanut Butter': 0.12, 
            'Eggplant': 0.2,
            'String Beans': 0.2,
            'Banana Blossom': 0.2,
            'Cooking oil': 0.1,
            'Garlic': 0.05,
            'Onion': 0.1,
            'Salt': 0.02,
            'Pepper': 0.01
        },
        servingware: 'pot'
    },

    'Lumpian Shanghai (S)': {
        ingredients: { 
            'Ground Pork': 0.1, 
            'Carrots': 0.05, 
            'lumpia_wrapper': 5, 
            'Cooking oil': 0.05 
        },
        servingware: 'plate'
    },
    
    'Lumpian Shanghai (M)': {
        ingredients: { 
            'Ground Pork': 0.2, 
            'Carrots': 0.1, 
            'lumpia_wrapper': 10, 
            'Cooking oil': 0.1 
        },
        servingware: 'plate'
    },

    'Lumpian Shanghai (L)': {
        ingredients: { 
            'Ground Pork': 0.3, 
            'Carrots': 0.15, 
            'lumpia_wrapper': 15, 
            'Cooking oil': 0.15 
        },
        servingware: 'plate'
    },

    // ====================  PACKAGING SUPPLIES ====================
    'Plastic Cups (12oz)': {
        ingredients: {},
        servingware: 'pack'
    },
    'Plastic Cups (16oz)': {
        ingredients: {},
        servingware: 'pack'
    },
    'Plastic Cups (20oz)': {
        ingredients: {},
        servingware: 'pack'
    },
    'Straws (Regular)': {
        ingredients: {},
        servingware: 'pack'
    },
    'Straws (Boba)': {
        ingredients: {},
        servingware: 'pack'
    },
    'Food Containers (Small)': {
        ingredients: {},
        servingware: 'pack'
    },
    'Food Containers (Medium)': {
        ingredients: {},
        servingware: 'pack'
    },
    'Food Containers (Large)': {
        ingredients: {},
        servingware: 'pack'
    },
    'Plastic Utensils Set': {
        ingredients: {},
        servingware: 'set'
    },
    'Napkins (Pack of 50)': {
        ingredients: {},
        servingware: 'pack'
    },

    'Buffalo Chicken Wings (S)': {
        ingredients: { 
            'Chicken Wings': 0.5, 
            'Buffalo Sauce': 0.1, 
            'Butter': 0.05, 
            'Garlic': 0.02, 
            'Salt': 0.01, 
            'Pepper': 0.005 
        },
        servingware: 'plate'
    },

    'Buffalo Chicken Wings (M)': {
        ingredients: { 
            'Chicken Wings': 1.0, 
            'Buffalo Sauce': 0.2, 
            'Butter': 0.1,
            'Garlic': 0.04,
            'Salt': 0.02,
            'Pepper': 0.01
        },
        servingware: 'plate'
    },

    'Buffalo Chicken Wings (L)': {
        ingredients: { 
            'Chicken Wings': 1.5, 
            'Buffalo Sauce': 0.3, 
            'Butter': 0.15,
            'Garlic': 0.06,
            'Salt': 0.03,
            'Pepper': 0.015
        },
        servingware: 'plate'
    }

};

// ==================== FALLBACK INVENTORY ITEMS ====================
// We'll keep an empty array - all inventory comes from MongoDB
let FALLBACK_INVENTORY_ITEMS = [];

// ==================== RESET INVENTORY TO ZERO ====================
function resetInventoryToZero() {
    console.log('🔄 All inventory items will be loaded from MongoDB...');
    console.log('✅ No local fallback inventory - Using MongoDB data only');
    
    // Clear persisted values in localStorage
    localStorage.removeItem('menu_inventory_currentStock');
    console.log('✅ Persisted inventory values cleared from localStorage');
    
    return true;
}

// ==================== LOAD INVENTORY WITH PERSISTED VALUES ====================
function loadInventoryWithPersistedValues() {
    console.log('🔄 Inventory will be loaded from MongoDB only...');
    console.log('✅ No fallback inventory - MongoDB data only');
    return false;
}

// ==================== SAVE INVENTORY STOCK VALUES ====================
function saveInventoryStockValues() {
    try {
        console.log('💾 Stock values managed through MongoDB');
    } catch (error) {
        console.error('❌ Error saving inventory stock values:', error);
    }
}

// ==================== SAVE NOTIFICATIONS TO LOCALSTORAGE ====================
function saveNotificationsToLocalStorage() {
    try {
        localStorage.setItem('menu_notifications', JSON.stringify(notifications));
        localStorage.setItem('menu_stockRequests', JSON.stringify(stockRequestNotifications));
        localStorage.setItem('menu_notificationCount', notificationCount.toString());
        localStorage.setItem('menu_stockRequestCount', stockRequestCount.toString());
        localStorage.setItem('menu_hasNewNotifications', hasNewNotifications.toString());
        localStorage.setItem('menu_hasNewStockRequests', hasNewStockRequests.toString());
        console.log('💾 Saved notifications to localStorage');
    } catch (error) {
        console.error('❌ Error saving notifications:', error);
    }
}

// ==================== LOAD NOTIFICATIONS FROM LOCALSTORAGE ====================
function loadNotificationsFromLocalStorage() {
    try {
        const savedNotifications = localStorage.getItem('menu_notifications');
        if (savedNotifications) {
            notifications = JSON.parse(savedNotifications);
            console.log('📦 Loaded notifications from localStorage:', notifications.length, 'notifications');
        }
        
        const savedStockRequests = localStorage.getItem('menu_stockRequests');
        if (savedStockRequests) {
            stockRequestNotifications = JSON.parse(savedStockRequests);
            console.log('📦 Loaded stock requests from localStorage:', stockRequestNotifications.length, 'requests');
        }
        
        const savedCount = localStorage.getItem('menu_notificationCount');
        if (savedCount) {
            notificationCount = parseInt(savedCount);
        }
        
        const savedStockCount = localStorage.getItem('menu_stockRequestCount');
        if (savedStockCount) {
            stockRequestCount = parseInt(savedStockCount);
        }
        
        const savedHasNew = localStorage.getItem('menu_hasNewNotifications');
        if (savedHasNew) {
            hasNewNotifications = savedHasNew === 'true';
        }
        
        const savedHasNewStock = localStorage.getItem('menu_hasNewStockRequests');
        if (savedHasNewStock) {
            hasNewStockRequests = savedHasNewStock === 'true';
        }
        
        updateNotificationBadge();
        renderNotifications();
    } catch (error) {
        console.error('❌ Error loading notifications:', error);
    }
}

// ==================== LOGOUT CONFIRMATION MODAL ====================
function showLogoutConfirmation(onConfirm, onCancel) {
    // Check if modal already exists
    if (document.getElementById('logoutModal')) {
        return;
    }

    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'logoutModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        animation: fadeIn 0.3s ease;
    `;

    // Add animation styles if they don't exist
    if (!document.getElementById('logoutModalStyles')) {
        const style = document.createElement('style');
        style.id = 'logoutModalStyles';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideIn {
                from { transform: translateY(-20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 12px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
        text-align: center;
    `;

    modalContent.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; color: #333; font-size: 24px;">Confirm Logout</h3>
            <p style="color: #666; margin: 0; font-size: 16px;">Are you sure you want to logout?</p>
        </div>
        <div style="display: flex; gap: 15px; justify-content: center;">
            <button id="cancelLogoutBtn" style="
                padding: 12px 30px;
                background: #f0f0f0;
                color: #666;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                font-weight: 500;
                transition: all 0.2s ease;
                flex: 1;
                max-width: 130px;
            " onmouseover="this.style.background='#e4e4e4'" 
               onmouseout="this.style.background='#f0f0f0'">
                Cancel
            </button>
            <button id="confirmLogoutBtn" style="
                padding: 12px 30px;
                background: #dc3545;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
                font-weight: 500;
                transition: all 0.2s ease;
                flex: 1;
                max-width: 130px;
            " onmouseover="this.style.background='#c82333'" 
               onmouseout="this.style.background='#dc3545'">
                Logout
            </button>
        </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Handle cancel button
    const cancelBtn = document.getElementById('cancelLogoutBtn');
    const confirmBtn = document.getElementById('confirmLogoutBtn');

    cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
        if (onCancel) onCancel();
    });

    confirmBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
        if (onConfirm) onConfirm();
    });

    // Handle clicking outside the modal
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
            if (onCancel) onCancel();
        }
    });

    // Handle escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            document.removeEventListener('keydown', handleEscape);
            if (document.getElementById('logoutModal')) {
                document.body.removeChild(modal);
                if (onCancel) onCancel();
            }
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// ==================== CATEGORY DISPLAY NAMES ====================
const categoryDisplayNames = {
    'Rice': 'Rice Bowl Meals',
    'Sizzling': 'Hot Sizzlers',
    'Party': 'Party Trays',
    'Drink': 'Drinks',
    'Cafe': 'Coffee',
    'Milk Tea': 'Milk Tea',
    'Frappe': 'Frappe',
    'Snack & Appetizer': 'Snacks & Appetizers',
    'Budget Meals Served with Rice': 'Budget Meals',
    'Specialties': 'Specialties',
};

// ==================== UNIT DISPLAY LABELS ====================
const unitDisplayLabels = {
    'plate': 'Plate',
    'plates': 'Plates',
    'sizzling plate': 'Sizzling Plate',
    'tray': 'Tray',
    'trays': 'Trays',
    'glass': 'Glass',
    'collins_glass': 'Collins Glass',
    'cup': 'Cup',
    'cups': 'Plastic Cups',
    'plastic_cups': 'Plastic Cups',
    'pitcher': 'Pitcher',
    'pitchers': 'Pitchers',
    'plastic_bottle': 'Plastic Bottle',
    'plastic_bottles': 'Plastic Bottles',
    'serving': 'Serving',
    'servings': 'Servings',
    'meal': 'Meal',
    'meals': 'Meals',
    'bowl': 'Bowl',
    'bowls': 'Bowls',
    'sandwich': 'Sandwich',
    'sandwiches': 'Sandwiches',
    'piece': 'Piece',
    'pieces': 'Pieces',
    'pot': 'Pot',
    'pots': 'Pots',
    'pack': 'Pack',
    'packs': 'Packs',
    'set': 'Set',
    'sets': 'Sets',
    'box': 'Box',
    'boxes': 'Boxes',
    'bag': 'Bag',
    'bags': 'Bags'
};

// ==================== CATEGORY UNITS MAPPING ====================
const categoryUnitsMapping = {
    'Rice': ['plate', 'serving'],
    'Sizzling': ['sizzling plate', 'plate'],
    'Party': ['tray'],
    'Drink': ['collins_glass', 'cups', 'pitcher', 'plastic_bottle'],
    'Cafe': ['cups', 'collins_glass'],
    'Milk Tea': ['cups', 'collins_glass'],
    'Frappe': ['cups', 'collins_glass', 'plastic_cups'],
    'Snack & Appetizer': ['serving', 'piece', 'sandwich'],
    'Budget Meals Served with Rice': ['meal', 'bowl'],
    'Specialties': ['serving', 'pot'],
};

// ==================== MENU DATABASE ====================
const menuDatabase = {
    'Rice': [
        { name: 'Korean Spicy Bulgogi (Pork)', unit: 'plate', defaultPrice: 158 },
        { name: 'Korean Salt and Pepper (Pork)', unit: 'plate', defaultPrice: 158 },
        { name: 'Crispy Pork Lechon Kawali', unit: 'plate', defaultPrice: 158 },
        { name: 'Cream Dory Fish Fillet', unit: 'plate', defaultPrice: 138 },
        { name: 'Buttered Honey Chicken', unit: 'plate', defaultPrice: 128 },
        { name: 'Buttered Spicy Chicken', unit: 'plate', defaultPrice: 128 },
        { name: 'Chicken Adobo', unit: 'plate', defaultPrice: 128 },
        { name: 'Pork Shanghai', unit: 'plate', defaultPrice: 128 }
    ],
    'Sizzling': [
        { name: 'Sizzling Pork Sisig', unit: 'sizzling plate', defaultPrice: 168 },
        { name: 'Sizzling Liempo', unit: 'sizzling plate', defaultPrice: 168 },
        { name: 'Sizzling Porkchop', unit: 'sizzling plate', defaultPrice: 148 },
        { name: 'Sizzling Fried Chicken', unit: 'sizzling plate', defaultPrice: 148 }
    ],
    'Party': [
        { name: 'Pancit Bihon (S)', unit: 'tray', defaultPrice: 300 },
        { name: 'Pancit Bihon (M)', unit: 'tray', defaultPrice: 550 },
        { name: 'Pancit Bihon (L)', unit: 'tray', defaultPrice: 800 },
        { name: 'Pancit Canton (S)', unit: 'tray', defaultPrice: 300 },
        { name: 'Pancit Canton (M)', unit: 'tray', defaultPrice: 550 },
        { name: 'Pancit Canton (L)', unit: 'tray', defaultPrice: 800 },
        { name: 'Spaghetti (S)', unit: 'tray', defaultPrice: 400 },
        { name: 'Spaghetti (M)', unit: 'tray', defaultPrice: 750 },
        { name: 'Spaghetti (L)', unit: 'tray', defaultPrice: 1100 },
        { name: 'Creamy Carbonara (S)', unit: 'tray', defaultPrice: 500 },
        { name: 'Creamy Carbonara (M)', unit: 'tray', defaultPrice: 950 },
        { name: 'Creamy Carbonara (L)', unit: 'tray', defaultPrice: 1400 },
        { name: 'Creamy Pesto (S)', unit: 'tray', defaultPrice: 500 },
        { name: 'Creamy Pesto (M)', unit: 'tray', defaultPrice: 950 },
        { name: 'Creamy Pesto (L)', unit: 'tray', defaultPrice: 1400 },
        { name: 'Tuyo Pesto (S)', unit: 'tray', defaultPrice: 600 },
        { name: 'Tuyo Pesto (M)', unit: 'tray', defaultPrice: 1100 },
        { name: 'Tuyo Pesto (L)', unit: 'tray', defaultPrice: 1600 },
        { name: 'Kare-Kare (S)', unit: 'tray', defaultPrice: 600 },
        { name: 'Kare-Kare (M)', unit: 'tray', defaultPrice: 1100 },
        { name: 'Kare-Kare (L)', unit: 'tray', defaultPrice: 1600 },
        { name: 'Chicken Buffalo Wings (S)', unit: 'tray', defaultPrice: 400 },
        { name: 'Chicken Buffalo Wings (M)', unit: 'tray', defaultPrice: 750 },
        { name: 'Chicken Buffalo Wings (L)', unit: 'tray', defaultPrice: 1100 },
        { name: 'Lumpia Shanghai (S)', unit: 'tray', defaultPrice: 300 },
        { name: 'Lumpia Shanghai (M)', unit: 'tray', defaultPrice: 550 },
        { name: 'Lumpia Shanghai (L)', unit: 'tray', defaultPrice: 800 }
    ],
    'Drink': [
        { name: 'Cucumber Lemonade (Glass)', unit: 'glass', defaultPrice: 38 },
        { name: 'Cucumber Lemonade (Pitcher)', unit: 'pitcher', defaultPrice: 168 },
        { name: 'Blue Lemonade (Glass)', unit: 'glass', defaultPrice: 38 },
        { name: 'Blue Lemonade (Pitcher)', unit: 'pitcher', defaultPrice: 168 },
        { name: 'Red Tea (Glass)', unit: 'glass', defaultPrice: 38 },
        { name: 'Red Tea (Pitcher)', unit: 'pitcher', defaultPrice: 168 },
        { name: 'Calamansi Juice (Glass)', unit: 'glass', defaultPrice: 38 },
        { name: 'Calamansi Juice (Pitcher)', unit: 'pitcher', defaultPrice: 168 },
        { name: 'Soda (Mismo) Coke', unit: 'bottle', defaultPrice: 28 },
        { name: 'Soda (Mismo) Sprite', unit: 'bottle', defaultPrice: 28 },
        { name: 'Soda (Mismo) Royal', unit: 'bottle', defaultPrice: 28 },
        { name: 'Soda 1.5L Coke', unit: 'bottle', defaultPrice: 118 },
        { name: 'Soda 1.5L Coke Zero', unit: 'bottle', defaultPrice: 118 },
        { name: 'Soda 1.5L Sprite', unit: 'bottle', defaultPrice: 118 },
        { name: 'Soda 1.5L Royal', unit: 'bottle', defaultPrice: 118 },
    ],
    'Cafe': [
        { name: 'Espresso (Tall)', unit: 'cup', defaultPrice: 88 },
        { name: 'Espresso (Grande)', unit: 'cup', defaultPrice: 118 },
        { name: 'Café Americano (Tall)', unit: 'cup', defaultPrice: 108 },
        { name: 'Café Americano (Grande)', unit: 'cup', defaultPrice: 138 },
        { name: 'Cappuccino (Tall)', unit: 'cup', defaultPrice: 98 },
        { name: 'Cappuccino (Grande)', unit: 'cup', defaultPrice: 128 },
        { name: 'Café Latte (Tall)', unit: 'cup', defaultPrice: 108 },
        { name: 'Café Latte (Grande)', unit: 'cup', defaultPrice: 138 },
        { name: 'Mocha Latte (Tall)', unit: 'cup', defaultPrice: 108 },
        { name: 'Mocha Latte (Grande)', unit: 'cup', defaultPrice: 138 },
        { name: 'Vanilla Latte (Tall)', unit: 'cup', defaultPrice: 108 },
        { name: 'Vanilla Latte (Grande)', unit: 'cup', defaultPrice: 138 },
        { name: 'Caramel Macchiato (Tall)', unit: 'cup', defaultPrice: 108 },
        { name: 'Caramel Macchiato (Grande)', unit: 'cup', defaultPrice: 138 },
        { name: 'Green Tea Latte (Tall)', unit: 'cup', defaultPrice: 118 },
        { name: 'Green Tea Latte (Grande)', unit: 'cup', defaultPrice: 148 },
        { name: 'White Chocolate (Tall)', unit: 'cup', defaultPrice: 108 },
        { name: 'White Chocolate (Grande)', unit: 'cup', defaultPrice: 138 },
        { name: 'Green Tea Matcha (Tall)', unit: 'cup', defaultPrice: 118 },
        { name: 'Green Tea Matcha (Grande)', unit: 'cup', defaultPrice: 148 },
        { name: 'Black Tea (Tall)', unit: 'cup', defaultPrice: 78 },
        { name: 'Black Tea (Grande)', unit: 'cup', defaultPrice: 108 },
        { name: 'Lemon Tea (Tall)', unit: 'cup', defaultPrice: 78 },
        { name: 'Lemon Tea (Grande)', unit: 'cup', defaultPrice: 108 },
        { name: 'Peppermint Tea (Tall)', unit: 'cup', defaultPrice: 78 },
        { name: 'Peppermint Tea (Grande)', unit: 'cup', defaultPrice: 108 },
        { name: 'Iced Café Latte (Tall)', unit: 'cup', defaultPrice: 98 },
        { name: 'Iced Café Latte (Grande)', unit: 'cup', defaultPrice: 128 },
        { name: 'Iced Mocha Latte (Tall)', unit: 'cup', defaultPrice: 108 },
        { name: 'Iced Mocha Latte (Grande)', unit: 'cup', defaultPrice: 138 },
        { name: 'Iced Vanilla Latte (Tall)', unit: 'cup', defaultPrice: 108 },
        { name: 'Iced Vanilla Latte (Grande)', unit: 'cup', defaultPrice: 138 },
        { name: 'Iced Caramel Macchiato (Tall)', unit: 'cup', defaultPrice: 118 },
        { name: 'Iced Caramel Macchiato (Grande)', unit: 'cup', defaultPrice: 148 },
        { name: 'Iced White Chocolate (Tall)', unit: 'cup', defaultPrice: 88 },
        { name: 'Iced White Chocolate (Grande)', unit: 'cup', defaultPrice: 118 },
        { name: 'Iced Dark Chocolate (Tall)', unit: 'cup', defaultPrice: 88 },
        { name: 'Iced Dark Chocolate (Grande)', unit: 'cup', defaultPrice: 118 }
    ],
    'Milk Tea': [
        { name: 'Milk Tea (Regular)', unit: 'cup', defaultPrice: 68 },
        { name: 'Milk Tea (HC)', unit: 'cup', defaultPrice: 88 },
        { name: 'Milk Tea (MC)', unit: 'cup', defaultPrice: 108 },
        { name: 'Caramel Milk Tea (Regular)', unit: 'cup', defaultPrice: 78 },
        { name: 'Caramel Milk Tea (HC)', unit: 'cup', defaultPrice: 98 },
        { name: 'Caramel Milk Tea (MC)', unit: 'cup', defaultPrice: 118 },
        { name: 'Cookies & Cream Milk Tea (Regular)', unit: 'cup', defaultPrice: 78 },
        { name: 'Cookies & Cream Milk Tea (HC)', unit: 'cup', defaultPrice: 98 },
        { name: 'Cookies & Cream Milk Tea (MC)', unit: 'cup', defaultPrice: 118 },
        { name: 'Dark Choco Milk Tea (Regular)', unit: 'cup', defaultPrice: 78 },
        { name: 'Dark Choco Milk Tea (HC)', unit: 'cup', defaultPrice: 98 },
        { name: 'Dark Choco Milk Tea (MC)', unit: 'cup', defaultPrice: 118 },
        { name: 'Okinawa Milk Tea (Regular)', unit: 'cup', defaultPrice: 78 },
        { name: 'Okinawa Milk Tea (HC)', unit: 'cup', defaultPrice: 98 },
        { name: 'Okinawa Milk Tea (MC)', unit: 'cup', defaultPrice: 118 },
        { name: 'Wintermelon Milk Tea (Regular)', unit: 'cup', defaultPrice: 78 },
        { name: 'Wintermelon Milk Tea (HC)', unit: 'cup', defaultPrice: 98 },
        { name: 'Wintermelon Milk Tea (MC)', unit: 'cup', defaultPrice: 118 },
        { name: 'Matcha Green Tea Milk Tea (Regular)', unit: 'cup', defaultPrice: 88 },
        { name: 'Matcha Green Tea Milk Tea (HC)', unit: 'cup', defaultPrice: 108 },
        { name: 'Matcha Green Tea Milk Tea (MC)', unit: 'cup', defaultPrice: 128 }
    ],
    'Frappe': [
        { name: 'Matcha Green Tea Frappe (Regular)', unit: 'cup', defaultPrice: 88 },
        { name: 'Matcha Green Tea Frappe (Premium)', unit: 'cup', defaultPrice: 108 },
        { name: 'Salted Caramel Frappe (Regular)', unit: 'cup', defaultPrice: 88 },
        { name: 'Salted Caramel Frappe (Premium)', unit: 'cup', defaultPrice: 108 },
        { name: 'Strawberry Cheesecake Frappe (Regular)', unit: 'cup', defaultPrice: 88 },
        { name: 'Strawberry Cheesecake Frappe (Premium)', unit: 'cup', defaultPrice: 108 },
        { name: 'Mango Cheesecake Frappe (Regular)', unit: 'cup', defaultPrice: 88 },
        { name: 'Mango Cheesecake Frappe (Premium)', unit: 'cup', defaultPrice: 108 },
        { name: 'Strawberry Cream Frappe (Regular)', unit: 'cup', defaultPrice: 88 },
        { name: 'Strawberry Cream Frappe (Premium)', unit: 'cup', defaultPrice: 98 },
        { name: 'Cookies & Cream Frappe (Regular)', unit: 'cup', defaultPrice: 88 },
        { name: 'Cookies & Cream Frappe (Premium)', unit: 'cup', defaultPrice: 98 },
        { name: 'Rocky Road Frappe (Regular)', unit: 'cup', defaultPrice: 88 },
        { name: 'Rocky Road Frappe (Premium)', unit: 'cup', defaultPrice: 98 },
        { name: 'Choco Fudge Frappe (Regular)', unit: 'cup', defaultPrice: 88 },
        { name: 'Choco Mousse Frappe (Regular)', unit: 'cup', defaultPrice: 88 },
        { name: 'Coffee Crumble Frappe (Regular)', unit: 'cup', defaultPrice: 88 },
        { name: 'Vanilla Cream Frappe (Regular)', unit: 'cup', defaultPrice: 88 }
    ],
    'Snack & Appetizer': [
        { name: 'Cheesy Nachos', unit: 'serving', defaultPrice: 150 },
        { name: 'Nachos Supreme', unit: 'serving', defaultPrice: 180 },
        { name: 'French Fries', unit: 'serving', defaultPrice: 90 },
        { name: 'Clubhouse Sandwich', unit: 'sandwich', defaultPrice: 120 },
        { name: 'Fish and Fries', unit: 'serving', defaultPrice: 160 },
        { name: 'Cheesy Dynamite Lumpia', unit: 'piece', defaultPrice: 25 },
        { name: 'Lumpiang Shanghai', unit: 'piece', defaultPrice: 20 }
    ],
    'Budget Meals Served with Rice': [
        { name: 'Fried Chicken', unit: 'meal', defaultPrice: 95 },
        { name: 'Buttered Honey Chicken', unit: 'meal', defaultPrice: 105 },
        { name: 'Buttered Spicy Chicken', unit: 'meal', defaultPrice: 105 },
        { name: 'Tinapa Rice', unit: 'meal', defaultPrice: 85 },
        { name: 'Tuyo Pesto', unit: 'meal', defaultPrice: 80 },
        { name: 'Fried Rice', unit: 'serving', defaultPrice: 50 },
        { name: 'Plain Rice', unit: 'bowl', defaultPrice: 25 }
    ],
    'Specialties': [
        { name: 'Sinigang (Pork)', unit: 'serving', defaultPrice: 280 },
        { name: 'Sinigang (Shrimp)', unit: 'serving', defaultPrice: 320 },
        { name: 'Paknet (Pakbet w/ Bagnet)', unit: 'serving', defaultPrice: 260 },
        { name: 'Buttered Shrimp', unit: 'serving', defaultPrice: 300 },
        { name: 'Special Bulalo (good for 2-3 Persons)', unit: 'pot', defaultPrice: 450 },
        { name: 'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)', unit: 'pot', defaultPrice: 850 }
    ],
};

// ==================== DOM ELEMENTS CACHE ====================
const elements = {
    itemModal: document.getElementById('itemModal'),
    modalTitle: document.getElementById('modalTitle'),
    itemForm: document.getElementById('itemForm'),
    closeModal: document.getElementById('closeModal'),
    itemId: document.getElementById('itemId'),
    itemName: document.getElementById('itemName'),
    itemCategory: document.getElementById('itemCategories'),
    itemUnit: document.getElementById('itemUnit'),
    currentStock: document.getElementById('currentStock'),
    minimumStock: document.getElementById('minimumStock'),
    maximumStock: document.getElementById('maximumStock'),
    itemPrice: document.getElementById('itemPrice'),
    addNewItem: document.getElementById('addNewItem'),
    saveItemBtn: document.querySelector('.modal-footer .btn-primary'),
    cancelBtn: document.querySelector('.modal-footer .btn-secondary'),
    navLinks: document.querySelectorAll('.nav-link[data-section]'),
    categoryItems: document.querySelectorAll('.category-item[data-category]'),
    menuGrid: document.getElementById('menuGrid'),
    dashboardGrid: document.getElementById('dashboardGrid'),
    totalProducts: document.getElementById('totalProducts'),
    lowStock: document.getElementById('lowStock'),
    outOfStock: document.getElementById('outOfStock'),
    menuValue: document.getElementById('menuValue'),
    totalMenuItems: document.getElementById('totalMenuItems'),
    currentCategoryTitle: document.getElementById('currentCategoryTitle'),
    missingIngredientsModal: document.getElementById('missingIngredientsModal'),
    closeMissingIngredientsModal: document.getElementById('closeMissingIngredientsModal'),
    closeMissingIngredientsBtn: document.getElementById('closeMissingIngredientsBtn'),
    missingProductName: document.getElementById('missingProductName'),
    missingIngredientsList: document.getElementById('missingIngredientsList')
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Menu Management System initializing...');
    
    try {
        loadNotificationsFromLocalStorage();
        console.log('✅ Notifications loaded from localStorage');
        
        addNotificationStyles();
        initializeNotificationSystem();
        console.log('✅ Notification system initialized');
        
        initializeEventListeners();
        initializeCategoryDropdown();
        console.log('✅ Event listeners initialized');
        
        // Clear any fallback data - we only use MongoDB
        allMenuItems = [];
        console.log('✅ Using MongoDB only - no fallback products');
        
        // Reset inventory to use MongoDB only
        resetInventoryToZero();
        console.log('✅ All inventory from MongoDB only - No fallback data');
        
        currentInventoryCache = [];
        lastInventoryCacheTime = Date.now();
        console.log(`📦 Inventory initialized - Loading from MongoDB`);
        
        showSection('dashboard');
        console.log('✅ Dashboard section displayed');
        
        connectToNotificationServer();
        console.log('✅ Real-time connections initiated');
        
        // Fetch menu items from MongoDB
        await fetchMenuItems();
        
        console.log(`✅ Menu Management System initialized with ${allMenuItems.length} products from MongoDB!`);
        
        // Listen for stock requests from staff.js (different page/window)
        listenForStockRequests();
        
    } catch (error) {
        console.error('❌ Critical error during initialization:', error);
        showToast('System initialized. Please ensure MongoDB is connected.', 'warning');
    }
});

// ==================== CONNECT TO NOTIFICATION SERVER - DISABLED ====================
function connectToNotificationServer() {
    console.log('ℹ️ Real-time notifications disabled - using periodic refresh only');
    // Real-time EventSource connections disabled to prevent duplicate data
}

// ==================== HANDLE STOCK REQUEST FROM STAFF ====================
function handleStockRequest(data) {
    const { productName, quantity, unit, requestedBy, timestamp } = data;
    
    const requestNotification = {
        id: Date.now() + Math.random(),
        productName: productName,
        quantity: quantity,
        unit: unit,
        requestedBy: requestedBy || 'Staff',
        message: `📦 Stock Request: ${quantity} ${unit} of ${productName}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString(),
        fullDateTime: new Date().toISOString(),
        read: false,
        fulfilled: false,
        type: 'stock_request'
    };
    
    stockRequestNotifications.unshift(requestNotification);
    hasNewStockRequests = true;
    stockRequestCount = stockRequestNotifications.filter(r => !r.read && !r.fulfilled).length;
    
    updateNotificationBadge();
    renderNotifications();
    saveNotificationsToLocalStorage();
    
    // Also save to localStorage for cross-page communication
    saveStockRequestToLocalStorage(requestNotification);
    // Refresh dashboard to show the request
    if (currentSection === 'dashboard') {
        renderDashboardGrid();
    }
}

// ==================== SAVE STOCK REQUEST TO LOCALSTORAGE ====================
function saveStockRequestToLocalStorage(request) {
    try {
        // Get existing requests
        let existingRequests = [];
        const stored = localStorage.getItem('staffStockRequests');
        if (stored) {
            existingRequests = JSON.parse(stored);
        }
        
        // Add new request
        existingRequests.unshift(request);
        
        // Keep only last 50 requests
        if (existingRequests.length > 50) {
            existingRequests = existingRequests.slice(0, 50);
        }
        
        // Save back to localStorage
        localStorage.setItem('staffStockRequests', JSON.stringify(existingRequests));
        
        // Update count
        const currentCount = parseInt(localStorage.getItem('stockRequestCount')) || 0;
        localStorage.setItem('stockRequestCount', (currentCount + 1).toString());
        
        // Save last request for quick access
        localStorage.setItem('lastStockRequest', JSON.stringify(request));
        
        console.log('💾 Stock request saved to localStorage');
    } catch (error) {
        console.error('Error saving stock request to localStorage:', error);
    }
}

// ==================== LISTEN FOR STOCK REQUESTS FROM STAFF ====================
function listenForStockRequests() {
    console.log('🎧 Initializing stock request listener...');
    
    // Check localStorage for stock requests from staff.js
    const lastStockRequest = localStorage.getItem('lastStockRequest');
    const staffStockRequestCount = parseInt(localStorage.getItem('stockRequestCount')) || 0;
    
    console.log('📦 Staff stock requests from localStorage:', staffStockRequestCount);
    
    if (staffStockRequestCount > 0) {
        updateStockRequestBadgeFromStaff(staffStockRequestCount);
        console.log('📢 Found pending stock requests from staff:', staffStockRequestCount);
        
        // Load pending requests into our array
        loadPendingStockRequests();
    }
    
    // Periodic fetch from MongoDB to keep dashboard updated
    setInterval(async () => {
        if (currentSection === 'dashboard') {
            try {
                const response = await fetch('/api/stock-requests/pending');
                if (response.ok) {
                    const result = await response.json();
                    const pendingCount = (result.data || []).length;
                    console.log('📊 MongoDB pending requests:', pendingCount);
                    
                    // Update badge with count from MongoDB
                    if (pendingCount > 0) {
                        updateStockRequestBadgeFromStaff(pendingCount);
                    }
                    
                    // Re-render dashboard with latest data
                    await renderDashboardGrid();
                }
            } catch (error) {
                console.error('Error fetching stock requests from MongoDB:', error);
            }
        }
    }, 2000); // Check every 2 seconds when on dashboard
    
    // Listen for custom events from staff.js (same window communication)
    window.addEventListener('staffStockRequest', (e) => {
        console.log('📡 Custom event received from staff.js:', e.detail);
        
        // Add to our notifications array
        if (e.detail) {
            stockRequestNotifications.unshift(e.detail);
            hasNewStockRequests = true;
            stockRequestCount = stockRequestNotifications.filter(r => !r.read && !r.fulfilled).length;
            
            updateNotificationBadge();
            renderNotifications();
            saveNotificationsToLocalStorage();
        }
        
        // Refresh dashboard to show pending requests
        if (currentSection === 'dashboard') {
            renderDashboardGrid();
        }
    });
    
    // Listen for changes to localStorage (staff page sends request)
    window.addEventListener('storage', (e) => {
        console.log('💾 Storage event detected:', e.key, '=', e.newValue);
        
        if (e.key === 'stockRequestCount') {
            const newCount = parseInt(e.newValue) || 0;
            console.log('📢 Stock request count changed to:', newCount);
            
            if (newCount > 0) {
                updateStockRequestBadgeFromStaff(newCount);
                
                // Load the new request
                loadPendingStockRequests();
                
                // Refresh dashboard to show pending requests
                if (currentSection === 'dashboard') {
                    renderDashboardGrid();
                }
                
                console.log('✅ Badge updated from storage event');
            }
        } else if (e.key === 'lastStockRequest' && e.newValue) {
            // New stock request received
            try {
                const newRequest = JSON.parse(e.newValue);
                
                // Check if we already have this request
                const exists = stockRequestNotifications.some(r => 
                    r.productName === newRequest.productName && 
                    r.timestamp === newRequest.timestamp
                );
                
                if (!exists) {
                    stockRequestNotifications.unshift(newRequest);
                    hasNewStockRequests = true;
                    stockRequestCount = stockRequestNotifications.filter(r => !r.read && !r.fulfilled).length;
                    
                    updateNotificationBadge();
                    renderNotifications();
                    saveNotificationsToLocalStorage();
                    
                    showToast(`📦 New stock request: ${newRequest.quantity} ${newRequest.unit} of ${newRequest.productName}`, 'info', 8000);
                    
                    if (currentSection === 'dashboard') {
                        renderDashboardGrid();
                    }
                }
            } catch (error) {
                console.error('Error parsing lastStockRequest:', error);
            }
        }
    });
    
    // Also check periodically for updates
    const checkInterval = setInterval(() => {
        const count = parseInt(localStorage.getItem('stockRequestCount')) || 0;
        const badge = document.getElementById('notificationBadge');
        
        if (badge) {
            const currentBadgeCount = parseInt(badge.textContent.replace('+', '')) || 0;
            if (count > 0 && currentBadgeCount < (count + notificationCount + stockRequestCount)) {
                console.log('⏰ Periodic check: updating badge with staff count:', count);
                updateStockRequestBadgeFromStaff(count);
                
                // Load any pending requests we might have missed
                loadPendingStockRequests();
                
                if (currentSection === 'dashboard') {
                    renderDashboardGrid();
                }
            }
        }
    }, 2000);
    
}

// ==================== LOAD PENDING STOCK REQUESTS ====================
function loadPendingStockRequests() {
    try {
        const stored = localStorage.getItem('staffStockRequests');
        if (stored) {
            const requests = JSON.parse(stored);
            let added = 0;
            
            requests.forEach(request => {
                // Check if we already have this request
                const exists = stockRequestNotifications.some(r => 
                    r.id === request.id || 
                    (r.productName === request.productName && 
                     r.timestamp === request.timestamp)
                );
                
                if (!exists) {
                    stockRequestNotifications.push(request);
                    added++;
                }
            });
            
            if (added > 0) {
                console.log(`📦 Added ${added} new stock requests from localStorage`);
                
                // Sort by date (newest first)
                stockRequestNotifications.sort((a, b) => 
                    new Date(b.fullDateTime || b.date) - new Date(a.fullDateTime || a.date)
                );
                
                hasNewStockRequests = true;
                stockRequestCount = stockRequestNotifications.filter(r => !r.read && !r.fulfilled).length;
                
                updateNotificationBadge();
                renderNotifications();
                saveNotificationsToLocalStorage();
            }
        }
    } catch (error) {
        console.error('Error loading pending stock requests:', error);
    }
}

// ==================== FULFILL STOCK REQUEST ====================
async function fulfillStockRequest(requestIndex) {
    try {
        console.log(`🔄 Fulfilling stock request at index: ${requestIndex}`);
        showToast('⏳ Marking request as fulfilled...', 'info', 2000);
        
        // Get the request from MongoDB
        const response = await fetch('/api/stock-requests/pending');
        if (!response.ok) {
            throw new Error('Failed to fetch pending requests');
        }
        
        const result = await response.json();
        const pendingRequests = result.data || [];
        
        if (requestIndex >= pendingRequests.length) {
            showToast('❌ Request not found', 'error');
            return;
        }
        
        const request = pendingRequests[requestIndex];
        console.log(`📦 Fulfilling: ${request.productName} (${request.requestedQuantity} units)`);
        
        // Call fulfill endpoint
        const fulfillResponse = await fetch('/api/stock-requests/fulfill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                productName: request.productName,
                productId: request.productId,
                quantity: request.requestedQuantity,
                unit: request.unit || 'units'
            })
        });
        
        if (!fulfillResponse.ok) {
            const errorData = await fulfillResponse.json();
            throw new Error(errorData.message || 'Failed to fulfill request');
        }
        
        const fulfillResult = await fulfillResponse.json();

        // Refresh the dashboard to remove the fulfilled request
        await renderDashboardGrid();
        
    } catch (error) {
        console.error('❌ Error fulfilling stock request:', error);
        showToast(`❌ Error: ${error.message}`, 'error', 3000);
    }
}

// ==================== GET STAFF REQUESTS FROM LOCALSTORAGE ====================
function getStaffRequestsFromLocalStorage() {
    try {
        const stored = localStorage.getItem('staffStockRequests');
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('Error getting staff requests:', error);
    }
    return [];
}

// ==================== REMOVE STAFF REQUEST FROM LOCALSTORAGE ====================
function removeStaffRequestFromLocalStorage(request) {
    try {
        const stored = localStorage.getItem('staffStockRequests');
        if (stored) {
            let requests = JSON.parse(stored);
            
            // Filter out the fulfilled request
            requests = requests.filter(r => 
                !(r.id === request.id || 
                  (r.productName === request.productName && r.timestamp === request.timestamp))
            );
            
            // Save back to localStorage
            localStorage.setItem('staffStockRequests', JSON.stringify(requests));
            
            // Update count
            localStorage.setItem('stockRequestCount', requests.length.toString());
        }
    } catch (error) {
        console.error('Error removing staff request:', error);
    }
}

// ==================== UPDATE NOTIFICATION BADGE FROM STAFF REQUEST ====================
function updateStockRequestBadgeFromStaff(staffCount) {
    console.log('🔄 Updating badge with staff stock request count:', staffCount);
    
    const badge = document.getElementById('notificationBadge');
    if (!badge) {
        // Try to find or create the badge
        const notificationBtn = document.querySelector('.notification-icon');
        if (notificationBtn && !notificationBtn.querySelector('#notificationBadge')) {
            const newBadge = document.createElement('span');
            newBadge.id = 'notificationBadge';
            newBadge.className = 'notification-badge';
            newBadge.setAttribute('style', 'display: inline-flex !important; visibility: visible !important;');
            notificationBtn.appendChild(newBadge);
        }
        return;
    }
    
    // Get current count from menu notifications
    const menuCount = (notificationCount || 0) + (stockRequestCount || 0);
    // Add staff count to menu count
    const totalCount = menuCount + staffCount;
    
    console.log('📊 Calculation: Menu count:', menuCount, '+ Staff count:', staffCount, '= Total:', totalCount);
    
    // Always show badge if there are notifications
    if (totalCount > 0) {
        badge.textContent = totalCount > 99 ? '99+' : totalCount;
        badge.setAttribute('style', 'display: inline-flex !important; visibility: visible !important;');
        
        // Pulse animation
        badge.style.animation = 'none';
        setTimeout(() => {
            badge.style.animation = 'pulse 2s infinite';
        }, 10);
        
        console.log('✅ Badge element text updated to:', badge.textContent);
    }
}

// ==================== NOTIFICATION STYLES ====================
function addNotificationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .notification-badge {
            position: absolute;
            top: -5px;
            right: -5px;
            background: #dc3545;
            color: white;
            font-size: 11px;
            font-weight: bold;
            border-radius: 50%;
            min-width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 4px;
            animation: pulse 2s infinite;
        }
        
        .stock-request-badge {
            position: absolute;
            top: -5px;
            right: 15px;
            background: #ff9800;
            color: white;
            font-size: 11px;
            font-weight: bold;
            border-radius: 50%;
            min-width: 18px;
            height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 4px;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }

        .notification-item {
            padding: 15px;
            border-bottom: 1px solid #eee;
            cursor: pointer;
            transition: background 0.2s;
            position: relative;
        }
        
        .notification-item:hover {
            background: #f5f5f5;
        }
        
        .notification-item.unread {
            background: #fff8e1;
            border-left: 4px solid #ff9800;
        }
        
        .notification-item.stock-request {
            background: #e3f2fd;
            border-left: 4px solid #2196f3;
        }
        
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            z-index: 9999;
            opacity: 0;
            transform: translateX(100%);
            transition: opacity 0.3s, transform 0.3s;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .toast-success { background: #28a745; }
        .toast-error { background: #dc3545; }
        .toast-warning { background: #ffc107; color: #212529; }
        .toast-info { background: #17a2b8; }
        
        .show {
            opacity: 1 !important;
            transform: translateX(0) !important;
        }

        #notificationNavItem {
            position: relative;
            list-style: none;
            margin-left: auto;
        }

        .notification-icon {
            position: relative;
            display: flex;
            align-items: center;
            cursor: pointer;
            padding: 8px 12px;
            border-radius: 4px;
            transition: background 0.2s;
        }
        
        .notification-icon:hover {
            background: rgba(0,0,0,0.05);
        }
        
        .notification-icon i {
            font-size: 20px;
            color: #333;
            margin-right: 8px;
        }
        
        .notification-icon span {
            font-size: 14px;
            color: #333;
        }
        
        .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            display: inline-block;
        }
        
        .status-available {
            background: #d4edda;
            color: #155724;
        }
        
        .status-low {
            background: #fff3cd;
            color: #856404;
        }
        
        .status-out {
            background: #f8d7da;
            color: #721c24;
        }
        
        .status-medium {
            background: #cce5ff;
            color: #004085;
        }
        
        .stock-progress {
            width: 100%;
            height: 8px;
            background: #eee;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 5px;
        }
        
        .progress-bar {
            height: 100%;
            background: #28a745;
            transition: width 0.3s;
        }
        
        .progress-bar.warning {
            background: #ffc107;
        }
        
        .progress-bar.danger {
            background: #dc3545;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .menu-card {
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .menu-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .stock-request-card {
            border-left: 4px solid #2196f3;
            background: #e3f2fd;
            margin-bottom: 15px;
        }
        
        .quick-add-section {
            background: #f8f9fa;
            border-top: 1px solid #dee2e6;
            padding: 15px;
            margin-top: 15px;
            border-radius: 0 0 8px 8px;
        }
        
        .quick-add-title {
            font-size: 13px;
            font-weight: 600;
            color: #495057;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .quick-add-controls {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        
        .quick-add-input {
            flex: 1;
            padding: 8px;
            border: 1px solid #ced4da;
            border-radius: 4px;
            font-size: 13px;
        }
        
        .quick-add-input:focus {
            border-color: #28a745;
            outline: none;
            box-shadow: 0 0 0 2px rgba(40, 167, 69, 0.25);
        }
        
        .quick-add-btn {
            padding: 8px 16px;
            background: #28a745;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: background 0.2s;
            white-space: nowrap;
        }
        
        .quick-add-btn:hover {
            background: #218838;
        }
        
        .quick-add-btn:disabled {
            background: #6c757d;
            cursor: not-allowed;
        }

        .missing-ingredients-list {
            list-style: none;
            padding: 0;
            margin: 15px 0;
            max-height: 300px;
            overflow-y: auto;
        }
        
        .missing-ingredients-list li {
            padding: 12px 15px;
            margin-bottom: 8px;
            background: #fff8f8;
            border-left: 4px solid #dc3545;
            border-radius: 4px;
            color: #721c24;
            font-size: 14px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .missing-ingredients-list li:before {
            content: "❌";
            margin-right: 10px;
            font-size: 12px;
        }
        
        .stock-request-badge {
            display: inline-block;
            background: #2196f3;
            color: white;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 11px;
            margin-left: 8px;
        }
    `;
    document.head.appendChild(style);
}

// ==================== INITIALIZE NOTIFICATION SYSTEM ====================
function initializeNotificationSystem() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;
    
    const existingNavItem = document.getElementById('notificationNavItem');
    if (existingNavItem) existingNavItem.remove();
    
    const notificationNavItem = document.createElement('li');
    notificationNavItem.id = 'notificationNavItem';
    notificationNavItem.style.cssText = 'position: relative; list-style: none; margin-left: auto;';
    
    const notificationBtn = document.createElement('a');
    notificationBtn.href = '#';
    notificationBtn.className = 'nav-link notification-icon';
    
    const totalNotifications = notificationCount + stockRequestCount;
    const badgeDisplay = totalNotifications > 0 ? 'flex' : 'none';
    
    notificationBtn.innerHTML = `
        <i class="fas fa-bell"></i>
        <span>Notifications</span>
        <span id="notificationBadge" class="notification-badge" style="display: ${badgeDisplay};">${totalNotifications > 99 ? '99+' : totalNotifications}</span>
        ${stockRequestCount > 0 ? `<span id="stockRequestBadge" class="stock-request-badge" style="display: ${stockRequestCount > 0 ? 'flex' : 'none'};">📦 ${stockRequestCount}</span>` : ''}
    `;
    notificationBtn.addEventListener('click', function(e) {
        e.preventDefault();
        toggleNotificationModal();
    });
    
    notificationNavItem.appendChild(notificationBtn);
    navLinks.appendChild(notificationNavItem);
    
    let notificationContainer = document.getElementById('notificationContainer');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notificationContainer';
        notificationContainer.style.cssText = `
            position: fixed;
            top: 70px;
            right: 20px;
            width: 450px;
            max-height: 600px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 1000;
            display: none;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid #ddd;
        `;
        
        const notificationHeader = document.createElement('div');
        notificationHeader.style.cssText = `
            padding: 15px 20px;
            background: #f8f9fa;
            border-bottom: 1px solid #ddd;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        const headerTitle = document.createElement('h3');
        headerTitle.textContent = 'Notifications';
        headerTitle.style.cssText = 'margin: 0; font-size: 16px; font-weight: 600; color: #333; display: flex; align-items: center; gap: 8px;';
        headerTitle.innerHTML = `<i class="fas fa-bell" style="color: #007bff;"></i> System Alerts & Stock Requests`;
        
        const clearAllBtn = document.createElement('button');
        clearAllBtn.textContent = 'Clear All';
        clearAllBtn.style.cssText = `
            background: none;
            border: 1px solid #dc3545;
            color: #dc3545;
            cursor: pointer;
            font-size: 12px;
            padding: 6px 12px;
            border-radius: 4px;
            transition: all 0.2s;
            font-weight: 500;
        `;
        clearAllBtn.addEventListener('mouseenter', function() {
            this.style.background = '#dc3545';
            this.style.color = 'white';
        });
        clearAllBtn.addEventListener('mouseleave', function() {
            this.style.background = 'none';
            this.style.color = '#dc3545';
        });
        clearAllBtn.addEventListener('click', clearAllNotifications);
        
        notificationHeader.appendChild(headerTitle);
        notificationHeader.appendChild(clearAllBtn);
        
        // Add tabs for different notification types
        const tabsContainer = document.createElement('div');
        tabsContainer.style.cssText = `
            display: flex;
            border-bottom: 1px solid #ddd;
            background: #f8f9fa;
        `;
        
        const allTab = document.createElement('button');
        allTab.textContent = 'All';
        allTab.style.cssText = `
            flex: 1;
            padding: 12px;
            border: none;
            background: ${currentNotificationTab === 'all' ? '#007bff' : 'transparent'};
            color: ${currentNotificationTab === 'all' ? 'white' : '#333'};
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
        `;
        allTab.addEventListener('click', () => switchNotificationTab('all'));
        
        const alertsTab = document.createElement('button');
        alertsTab.textContent = `Alerts ${notificationCount > 0 ? `(${notificationCount})` : ''}`;
        alertsTab.style.cssText = `
            flex: 1;
            padding: 12px;
            border: none;
            background: ${currentNotificationTab === 'alerts' ? '#007bff' : 'transparent'};
            color: ${currentNotificationTab === 'alerts' ? 'white' : '#333'};
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
        `;
        alertsTab.addEventListener('click', () => switchNotificationTab('alerts'));
        
        const requestsTab = document.createElement('button');
        requestsTab.textContent = `Stock Requests ${stockRequestCount > 0 ? `(${stockRequestCount})` : ''}`;
        requestsTab.style.cssText = `
            flex: 1;
            padding: 12px;
            border: none;
            background: ${currentNotificationTab === 'requests' ? '#007bff' : 'transparent'};
            color: ${currentNotificationTab === 'requests' ? 'white' : '#333'};
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
        `;
        requestsTab.addEventListener('click', () => switchNotificationTab('requests'));
        
        tabsContainer.appendChild(allTab);
        tabsContainer.appendChild(alertsTab);
        tabsContainer.appendChild(requestsTab);
        
        const notificationList = document.createElement('div');
        notificationList.id = 'notificationList';
        notificationList.style.cssText = 'flex: 1; overflow-y: auto; max-height: 400px; padding: 10px;';
        
        const emptyState = document.createElement('div');
        emptyState.id = 'notificationEmptyState';
        emptyState.style.cssText = 'padding: 40px 20px; text-align: center; color: #666;';
        emptyState.innerHTML = `
            <div style="font-size: 64px; margin-bottom: 20px;"></div>
            <h3 style="margin-bottom: 10px; color: #333; font-size: 18px;">No notifications</h3>
            <p style="margin: 0; color: #999; font-size: 14px;">When alerts or stock requests occur, they will appear here</p>
        `;
        notificationList.appendChild(emptyState);
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        closeBtn.style.cssText = `
            padding: 12px;
            background: #f8f9fa;
            border: none;
            border-top: 1px solid #ddd;
            cursor: pointer;
            color: #333;
            font-size: 14px;
            font-weight: 500;
            transition: background 0.2s;
        `;
        closeBtn.addEventListener('mouseenter', function() {
            this.style.background = '#e9ecef';
        });
        closeBtn.addEventListener('mouseleave', function() {
            this.style.background = '#f8f9fa';
        });
        closeBtn.addEventListener('click', toggleNotificationModal);
        
        notificationContainer.appendChild(notificationHeader);
        notificationContainer.appendChild(tabsContainer);
        notificationContainer.appendChild(notificationList);
        notificationContainer.appendChild(closeBtn);
        
        document.body.appendChild(notificationContainer);
    }
    
    window.currentNotificationTab = 'all';
}

let currentNotificationTab = 'all';

function switchNotificationTab(tab) {
    currentNotificationTab = tab;
    
    // Update tab styles
    const tabs = document.querySelectorAll('#notificationContainer button[style*="flex: 1"]');
    if (tabs.length >= 3) {
        tabs[0].style.background = tab === 'all' ? '#007bff' : 'transparent';
        tabs[0].style.color = tab === 'all' ? 'white' : '#333';
        tabs[1].style.background = tab === 'alerts' ? '#007bff' : 'transparent';
        tabs[1].style.color = tab === 'alerts' ? 'white' : '#333';
        tabs[2].style.background = tab === 'requests' ? '#007bff' : 'transparent';
        tabs[2].style.color = tab === 'requests' ? 'white' : '#333';
    }
    
    renderNotifications();
}

// ==================== NOTIFICATION FUNCTIONS ====================
function toggleNotificationModal() {
    const notificationContainer = document.getElementById('notificationContainer');
    if (!notificationContainer) return;
    
    if (isNotificationModalOpen) {
        notificationContainer.style.display = 'none';
        isNotificationModalOpen = false;
    } else {
        notificationContainer.style.display = 'flex';
        isNotificationModalOpen = true;
        
        // Mark all as read when opening
        hasNewNotifications = false;
        hasNewStockRequests = false;
        
        notifications.forEach(notification => { 
            notification.read = true; 
        });
        
        stockRequestNotifications.forEach(request => {
            request.read = true;
        });
        
        updateNotificationBadge();
        renderNotifications();
        saveNotificationsToLocalStorage();
    }
}

function addNotification(message, type = 'info', productName = '') {
    const notification = {
        id: Date.now() + Math.random(),
        productName: productName,
        message: message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString(),
        fullDateTime: new Date().toISOString(),
        read: false,
        type: type,
        fulfilled: false
    };
    
    notifications.unshift(notification);
    hasNewNotifications = true;
    notificationCount = notifications.filter(n => !n.read && !n.fulfilled).length;
    
    updateNotificationBadge();
    renderNotifications();
    saveNotificationsToLocalStorage();
    
    const typeEmoji = { 
        'success': '✅', 
        'error': '❌', 
        'warning': '⚠️',
        'info': 'ℹ️'
    }[type] || 'ℹ️';
    
    showToast(`${typeEmoji} ${message}`, type);
}

function handleLowStockAlert(data) {
    addNotification(
        `Low stock alert: ${data.productName} - Only ${data.currentStock} ${data.unit} left`,
        'warning',
        data.productName
    );
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;
    
    const stockRequestBadge = document.getElementById('stockRequestBadge');
    
    notificationCount = notifications.filter(n => !n.read && !n.fulfilled).length;
    stockRequestCount = stockRequestNotifications.filter(r => !r.read && !r.fulfilled).length;
    
    // 🔑 IMPORTANT: Include staff stock request count from localStorage
    const staffStockRequestCount = parseInt(localStorage.getItem('stockRequestCount')) || 0;
    
    const totalCount = notificationCount + stockRequestCount + staffStockRequestCount;
    
    if (totalCount > 0) {
        badge.textContent = totalCount > 99 ? '99+' : totalCount;
        badge.style.display = 'flex';
        badge.style.animation = 'pulse 1s infinite';
    } else {
        badge.style.display = 'none';
        badge.style.animation = 'none';
    }
    
    if (stockRequestBadge) {
        const totalStockRequests = stockRequestCount + staffStockRequestCount;
        if (totalStockRequests > 0) {
            stockRequestBadge.textContent = `📦 ${totalStockRequests}`;
            stockRequestBadge.style.display = 'flex';
        } else {
            stockRequestBadge.style.display = 'none';
        }
    }
}

function renderNotifications() {
    const notificationList = document.getElementById('notificationList');
    const emptyState = document.getElementById('notificationEmptyState');
    
    if (!notificationList) return;
    
    notificationList.innerHTML = '';
    
    let itemsToShow = [];
    
    if (currentNotificationTab === 'all') {
        itemsToShow = [...notifications.filter(n => !n.fulfilled), ...stockRequestNotifications.filter(r => !r.fulfilled)]
            .sort((a, b) => new Date(b.fullDateTime) - new Date(a.fullDateTime));
    } else if (currentNotificationTab === 'alerts') {
        itemsToShow = notifications.filter(n => !n.fulfilled)
            .sort((a, b) => new Date(b.fullDateTime) - new Date(a.fullDateTime));
    } else if (currentNotificationTab === 'requests') {
        itemsToShow = stockRequestNotifications.filter(r => !r.fulfilled)
            .sort((a, b) => new Date(b.fullDateTime) - new Date(a.fullDateTime));
    }
    
    if (itemsToShow.length === 0) {
        notificationList.appendChild(emptyState);
        return;
    }
    
    itemsToShow.forEach(item => {
        const notificationItem = document.createElement('div');
        
        if (item.type === 'stock_request') {
            notificationItem.className = `notification-item stock-request ${!item.read ? 'unread' : ''}`;
        } else {
            notificationItem.className = `notification-item ${!item.read ? 'unread' : ''}`;
        }
        
        notificationItem.style.cssText = `
            padding: 15px;
            border-bottom: 1px solid #eee;
            cursor: pointer;
            transition: all 0.2s;
            margin-bottom: 5px;
            border-radius: 4px;
            position: relative;
        `;
        
        let typeEmoji = '📋';
        let typeIcon = '';
        
        if (item.type === 'stock_request') {
            typeEmoji = '📦';
            typeIcon = '<span style="background: #2196f3; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; margin-left: 8px;">Stock Request</span>';
        } else {
            const typeEmojiMap = {
                'success': '✅',
                'error': '❌',
                'warning': '⚠️',
                'info': 'ℹ️'
            };
            typeEmoji = typeEmojiMap[item.type] || '📋';
        }
        
        const timeDisplay = item.fullDateTime ? 
            new Date(item.fullDateTime).toLocaleString() : 
            `${item.date} ${item.timestamp}`;
        
        let detailsHtml = '';
        if (item.type === 'stock_request' && item.quantity) {
            detailsHtml = `
                <div style="margin-top: 8px; padding: 8px; background: #e3f2fd; border-radius: 4px; font-size: 13px;">
                    <span style="font-weight: 600;">Quantity:</span> ${item.quantity} ${item.unit || ''}
                    ${item.requestedBy ? `<br><span style="font-weight: 600;">Requested by:</span> ${item.requestedBy}` : ''}
                </div>
            `;
        }
        
        // Determine button text and style based on item type
        let buttonHtml = '';
        if (item.type === 'stock_request') {
            buttonHtml = `<button class="notification-done" onclick="dismissNotification('${item.id}')" style="
                background: #4caf50;
                border: none;
                color: white;
                padding: 6px 16px;
                border-radius: 4px;
                font-size: 11px;
                cursor: pointer;
                font-weight: 600;
            ">Done</button>`;
        } else {
            buttonHtml = `<button class="notification-dismiss" onclick="dismissNotification('${item.id}')" style="
                background: none;
                border: 1px solid #6c757d;
                color: #6c757d;
                padding: 2px 8px;
                border-radius: 4px;
                font-size: 11px;
                cursor: pointer;
            ">Dismiss</button>`;
        }

        notificationItem.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                <div style="font-weight: 600; color: #333; font-size: 14px; display: flex; align-items: center; gap: 8px;">
                    ${typeEmoji} ${item.productName || 'System Notification'}
                    ${typeIcon}
                </div>
                ${!item.read ? '<span style="color: #ff9800; font-size: 12px;">● New</span>' : ''}
            </div>
            <div style="color: #666; font-size: 13px; margin-bottom: 8px;">
                ${item.message}
            </div>
            ${detailsHtml}
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="color: #999; font-size: 11px;">
                    <i class="far fa-clock"></i> ${timeDisplay}
                </div>
                ${buttonHtml}
            </div>
        `;
        
        notificationItem.addEventListener('click', function(e) {
            if (e.target.tagName === 'BUTTON') return;
            
            item.read = true;
            updateNotificationBadge();
            renderNotifications();
            saveNotificationsToLocalStorage();
        });
        
        notificationList.appendChild(notificationItem);
    });
}

function dismissNotification(notificationId) {
    // Check in regular notifications
    let notification = notifications.find(n => n.id === notificationId);
    if (notification) {
        notification.fulfilled = true;
        notification.read = true;
    } else {
        // Check in stock request notifications
        notification = stockRequestNotifications.find(r => r.id === notificationId);
        if (notification) {
            notification.fulfilled = true;
            notification.read = true;
        }
    }
    
    updateNotificationBadge();
    renderNotifications();
    saveNotificationsToLocalStorage();
    
    showToast('Notification dismissed', 'info');
    event.stopPropagation();
}

function clearAllNotifications() {
    if (notifications.length === 0 && stockRequestNotifications.length === 0) return;
    
    if (confirm('Mark all notifications as dismissed?')) {
        notifications.forEach(notification => {
            notification.fulfilled = true;
            notification.read = true;
        });
        
        stockRequestNotifications.forEach(request => {
            request.fulfilled = true;
            request.read = true;
        });
        
        notificationCount = 0;
        stockRequestCount = 0;
        hasNewNotifications = false;
        hasNewStockRequests = false;
        
        updateNotificationBadge();
        renderNotifications();
        saveNotificationsToLocalStorage();
        
        showToast('✅ All notifications cleared', 'success');
    }
}

// ==================== FETCH INVENTORY FROM MONGODB ====================
async function fetchInventoryFromMongoDB() {
    try {
        console.log('🔍 Fetching inventory from MongoDB...');
        
        // Try the main API endpoint
        const response = await fetch(`${BACKEND_URL}/api/inventory`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        
        if (!response.ok) {
            console.warn(`⚠️ Inventory API error ${response.status}`);
            // Try fallback endpoint if main one fails
            console.log('   📌 Trying fallback inventory endpoint...');
            try {
                const fallbackResponse = await fetch(`${BACKEND_URL}/api/menu/recipes`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                });
                if (fallbackResponse.ok) {
                    const fallbackData = await fallbackResponse.json();
                    console.log('   ✅ Using fallback endpoint');
                    return fallbackData.inventory || [];
                }
            } catch (fallbackError) {
                console.warn('   ❌ Fallback endpoint also failed');
            }
            return [];
        }
        
        const data = await response.json();
        
        // Handle different response formats
        let inventoryItems = [];
        if (Array.isArray(data)) {
            inventoryItems = data;
        } else if (data && data.success && Array.isArray(data.data)) {
            inventoryItems = data.data;
        } else if (data && Array.isArray(data.items)) {
            inventoryItems = data.items;
        }
        
        console.log(`📦 Loaded ${inventoryItems.length} inventory items from MongoDB`);
        return inventoryItems;
    } catch (error) {
        console.error('❌ Error fetching inventory from MongoDB:', error.message);
        console.warn('   ⚠️ Database connection failed - Using local ingredientInventory as fallback');
        // Use local ingredientInventory as fallback when database is unreachable
        if (typeof ingredientInventory !== 'undefined' && ingredientInventory) {
            const fallbackItems = Object.values(ingredientInventory).map(ing => ({
                itemName: ing.name,
                name: ing.name,
                currentStock: ing.current,
                unit: ing.unit
            }));
            console.log(`✅ Loaded ${fallbackItems.length} items from local ingredientInventory cache`);
            return fallbackItems;
        }
        return [];
    }
}

// ==================== CALCULATE MAX STOCK BASED ON INGREDIENTS ====================
async function calculateMaxStockBasedOnIngredients(itemName) {
    try {
        console.log(`🧮 Calculating max stock for "${itemName}" based on current ingredient inventory...`);
        
        // Check if recipe exists in local mapping first
        const localRecipe = productIngredientMap[itemName];
        let ingredientRequirements = {};
        
        if (localRecipe && localRecipe.ingredients) {
            // Use local recipe
            ingredientRequirements = localRecipe.ingredients;
            console.log(`📋 Using local recipe with ${Object.keys(ingredientRequirements).length} ingredients`);
        } else {
            // Try to fetch from server
            try {
                const recipeCheck = await fetch(`/api/menu/check-recipe/${encodeURIComponent(itemName)}`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    credentials: 'include'
                });
                
                if (recipeCheck.ok) {
                    const recipeData = await recipeCheck.json();
                    if (recipeData.hasRecipe && recipeData.ingredients && recipeData.ingredients.length > 0) {
                        // Server returns array, convert to object for consistency
                        ingredientRequirements = {};
                        recipeData.ingredients.forEach(ing => {
                            ingredientRequirements[ing] = 1; // Default requirement
                        });
                        console.log(`📋 Using server recipe with ${recipeData.ingredients.length} ingredients`);
                    } else {
                        console.log(`⚠️ No recipe found for "${itemName}" on server`);
                        return null;
                    }
                } else {
                    console.log(`⚠️ Could not fetch recipe for "${itemName}" from server`);
                    return null;
                }
            } catch (e) {
                console.log(`⚠️ Error fetching recipe from server: ${e.message}`);
                return null;
            }
        }
        
        // If recipe has no ingredients, no limit
        if (Object.keys(ingredientRequirements).length === 0) {
            console.log(`ℹ️ "${itemName}" has no ingredients - no stock limit`);
            return null;
        }
        
        // Get current inventory
        const inventoryItems = await fetchInventoryFromMongoDB();
        let actualInventory = inventoryItems;
        
        // If database fetch returns empty, log warning
        if (!actualInventory || actualInventory.length === 0) {
            console.warn(`⚠️ No inventory data available from database or local cache`);
            return null;
        }
        
        // Calculate max possible quantity for each ingredient
        const calculationDetails = [];
        let maxPossibleByIngredient = [];
        let limitingIngredient = null;
        
        for (const [ingredientName, requiredAmount] of Object.entries(ingredientRequirements)) {
            // Find ingredient in inventory - normalize the name for matching
            const normalizedIngredientName = ingredientName.replace(/_/g, ' ').toLowerCase();
            
            const inventoryItem = actualInventory.find(item => {
                const itemNameLower = (item.itemName || item.name || '').toLowerCase();
                return itemNameLower === normalizedIngredientName;
            });
            
            if (!inventoryItem) {
                console.log(`❌ CRITICAL: Ingredient not found in inventory: "${ingredientName}"`);
                return 0; // Missing ingredient = can't make any
            }
            
            const currentStock = parseFloat(inventoryItem.currentStock || 0);
            const unit = inventoryItem.unit || 'unit';
            
            if (currentStock <= 0) {
                console.log(`❌ CRITICAL: ${ingredientName} is out of stock (0 ${unit})`);
                return 0; // Out of stock ingredient = can't make any
            }
            
            // Calculate how many units of the product we can make with this ingredient
            const maxFromThisIngredient = Math.floor(currentStock / requiredAmount);
            
            calculationDetails.push({
                ingredient: ingredientName,
                currentStock: currentStock,
                unit: unit,
                requiredPerUnit: requiredAmount,
                maxPossible: maxFromThisIngredient
            });
            
            console.log(`   ✓ ${ingredientName}: ${currentStock}${unit} ÷ ${requiredAmount}${unit}/unit = ${maxFromThisIngredient} units`);
            
            maxPossibleByIngredient.push(maxFromThisIngredient);
        }
        
        // The limiting factor is the ingredient with the smallest max
        const maxPossible = Math.min(...maxPossibleByIngredient);
        
        // Find which ingredient is limiting
        for (const detail of calculationDetails) {
            if (detail.maxPossible === maxPossible) {
                limitingIngredient = detail;
                break;
            }
        }
        
        console.log(`\n📊 CALCULATION SUMMARY:`);
        console.log(`   Product: "${itemName}"`);
        console.log(`   Max Stock: ${maxPossible} units`);
        if (limitingIngredient) {
            console.log(`   Limiting Factor: ${limitingIngredient.ingredient} (${limitingIngredient.currentStock} / ${limitingIngredient.requiredPerUnit} = ${maxPossible})`);
        }
        console.log(`\n✅ "${itemName}" can have max ${maxPossible} units based on current ingredients\n`);
        
        // Store calculation details for display in UI
        window.lastMaxStockCalculation = {
            itemName: itemName,
            maxStock: maxPossible,
            limitingIngredient: limitingIngredient,
            allCalculations: calculationDetails
        };
        
        return maxPossible;
        
    } catch (error) {
        console.error(`❌ Error calculating max stock:`, error);
        return null;
    }
}

// ==================== CHECK INGREDIENT AVAILABILITY ====================
async function checkIngredientAvailability(itemName) {
    try {
        console.log(`🔍 Checking ingredient availability for: ${itemName}`);
        
        const recipe = productIngredientMap[itemName];
        
        // If no recipe found in local map - CHECK SERVER'S recipeMapping
        if (!recipe) {
            console.log(`⚠️ No recipe found in productIngredientMap for "${itemName}"`);
            console.log(`   Checking if recipe exists on server...`);
            
            // Try to fetch from server to see if recipe is defined there
            try {
                const serverCheckResponse = await fetch(`/api/menu/check-recipe/${encodeURIComponent(itemName)}`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    credentials: 'include'
                });
                
                if (serverCheckResponse.ok) {
                    const recipeData = await serverCheckResponse.json();
                    console.log(`   Server response:`, recipeData);
                    
                    // Check if recipe exists on server
                    if (recipeData.hasRecipe === true && recipeData.ingredients && recipeData.ingredients.length > 0) {
                        console.log(`✅ Recipe found on server for "${itemName}":`, recipeData.ingredients);
                        
                        // Fetch inventory and check availability
                        const inventoryItems = await fetchInventoryFromMongoDB();
                        
                        if (!Array.isArray(inventoryItems) || inventoryItems.length === 0) {
                            console.warn(`⚠️ No inventory data available from MongoDB - Blocking product creation until inventory is set up`);
                            // ⚠️ CHANGED: Return false when inventory is empty
                            return {
                                available: false,
                                missingIngredients: recipeData.ingredients.map(ing => `${ing} (NOT IN INVENTORY - Please add ingredients to inventory first)`),
                                availableIngredients: [],
                                allIngredientsPresent: false,
                                requiredIngredients: recipeData.ingredients
                            };
                        }
                        
                        // Check each ingredient
                        const missingIngredients = [];
                        const availableIngredients = [];
                        
                        for (const ingredientName of recipeData.ingredients) {
                            const normalizedIngredientName = ingredientName.replace(/_/g, ' ');
                            
                            const dbInventoryItem = inventoryItems.find(item => {
                                const itemNameToCheck = item.itemName || item.name || '';
                                return itemNameToCheck.toLowerCase() === normalizedIngredientName.toLowerCase();
                            });
                            
                            if (!dbInventoryItem) {
                                console.warn(`   ❌ NOT FOUND in inventory: ${ingredientName}`);
                                
                                // Check if this is a soda item and auto-add it
                                if (await autoAddMissingSodaItem(normalizedIngredientName)) {
                                    console.log(`   ✅ Auto-added missing soda: ${normalizedIngredientName}`);
                                    availableIngredients.push(ingredientName);
                                } else {
                                    missingIngredients.push(`${normalizedIngredientName} (NOT IN INVENTORY)`);
                                }
                            } else {
                                const currentStock = parseFloat(dbInventoryItem.currentStock || 0);
                                const unit = dbInventoryItem.unit || 'unit';
                                
                                if (currentStock <= 0) {
                                    console.warn(`   ❌ OUT OF STOCK: ${ingredientName}`);
                                    missingIngredients.push(`${ingredientName} - OUT OF STOCK (Have: ${currentStock} ${unit})`);
                                } else {
                                    console.log(`   ✅ SUFFICIENT STOCK: ${ingredientName} (${currentStock} ${unit})`);
                                    availableIngredients.push(ingredientName);
                                }
                            }
                        }
                        
                        const hasAllIngredients = missingIngredients.length === 0;
                        return {
                            available: hasAllIngredients,
                            missingIngredients: missingIngredients,
                            availableIngredients: availableIngredients,
                            allIngredientsPresent: hasAllIngredients,
                            requiredIngredients: recipeData.ingredients
                        };
                    } else {
                        // Recipe not found on server
                        console.warn(`❌ No recipe defined for "${itemName}" on server`);
                        return {
                            available: false,
                            missingIngredients: [`No recipe defined for "${itemName}" - Add recipe mapping to server.js recipeMapping`],
                            availableIngredients: [],
                            allIngredientsPresent: false,
                            requiredIngredients: []
                        };
                    }
                } else {
                    console.warn(`⚠️ Could not verify recipe on server for "${itemName}" - HTTP ${serverCheckResponse.status}`);
                    return {
                        available: false,
                        missingIngredients: [`Could not verify recipe for "${itemName}" on server`],
                        availableIngredients: [],
                        allIngredientsPresent: false,
                        requiredIngredients: []
                    };
                }
            } catch (e) {
                console.warn(`⚠️ Could not check server for recipe: ${e.message}`);
                return {
                    available: false,
                    missingIngredients: [`Error checking recipe: ${e.message}`],
                    availableIngredients: [],
                    allIngredientsPresent: false,
                    requiredIngredients: []
                };
            }
        }
        
        // Recipe found in local productIngredientMap - proceed with normal checks
        
        // If recipe exists but has no ingredients
        if (!recipe.ingredients || Object.keys(recipe.ingredients).length === 0) {
            console.log(`ℹ️ No ingredients defined for "${itemName}" - Product has no ingredient requirements`);
            return {
                available: true,
                missingIngredients: [],
                availableIngredients: [],
                allIngredientsPresent: true,
                requiredIngredients: []
            };
        }
        
        console.log(`📋 Recipe for ${itemName}:`, recipe.ingredients);
        
        const missingIngredients = [];
        const availableIngredients = [];
        
        // Fetch inventory from MongoDB
        const inventoryItems = await fetchInventoryFromMongoDB();
        
        if (!Array.isArray(inventoryItems) || inventoryItems.length === 0) {
            console.warn(`⚠️ No inventory data available from MongoDB - Blocking product creation until inventory is set up`);
            // ⚠️ CHANGED: Return false when inventory is empty
            return {
                available: false,
                missingIngredients: Object.keys(recipe.ingredients).map(ing => `${ing} (NOT IN INVENTORY - Please add ingredients to inventory first)`),
                availableIngredients: [],
                allIngredientsPresent: false,
                requiredIngredients: Object.keys(recipe.ingredients)
            };
        }
        
        for (const [ingredientName, requiredAmount] of Object.entries(recipe.ingredients)) {
            console.log(`   Checking ingredient: ${ingredientName} (required: ${requiredAmount})`);
            
            const normalizedIngredientName = ingredientName.replace(/_/g, ' ');
            
            // Find in inventory
            const dbInventoryItem = inventoryItems.find(item => {
                const itemNameToCheck = item.itemName || item.name || '';
                return itemNameToCheck.toLowerCase() === normalizedIngredientName.toLowerCase();
            });
            
            if (!dbInventoryItem) {
                console.warn(`   ❌ NOT FOUND in inventory: ${ingredientName}`);
                missingIngredients.push(`${normalizedIngredientName} (NOT IN INVENTORY)`);
                continue;
            }
            
            const currentStock = parseFloat(dbInventoryItem.currentStock || 0);
            const unit = dbInventoryItem.unit || 'unit';
            
            console.log(`   Found in inventory: ${ingredientName} - Current: ${currentStock} ${unit}, Required: ${requiredAmount}`);
            
            if (currentStock <= 0) {
                console.warn(`   ❌ OUT OF STOCK: ${ingredientName}`);
                missingIngredients.push(`${ingredientName} - OUT OF STOCK (Have: ${currentStock} ${unit})`);
            } else if (currentStock < requiredAmount) {
                console.warn(`   ⚠️ INSUFFICIENT STOCK: ${ingredientName}`);
                missingIngredients.push(`${ingredientName} - INSUFFICIENT STOCK (Need: ${requiredAmount} ${unit}, Have: ${currentStock} ${unit})`);
            } else {
                console.log(`   ✅ SUFFICIENT STOCK: ${ingredientName}`);
                availableIngredients.push(ingredientName);
            }
        }
        
        const hasAllIngredients = missingIngredients.length === 0;
        console.log(`\n📊 Availability Result for "${itemName}": Available: ${hasAllIngredients ? '✅' : '❌'}\n`);
        
        return {
            available: hasAllIngredients,
            missingIngredients: missingIngredients,
            availableIngredients: availableIngredients,
            allIngredientsPresent: hasAllIngredients,
            requiredIngredients: Object.keys(recipe.ingredients)
        };
    } catch (error) {
        console.error('❌ Error checking ingredient availability:', error);
        // STRICT: Do NOT allow product if there's an error checking ingredients
        return {
            available: false,
            missingIngredients: [`Error verifying ingredients: ${error.message}`],
            availableIngredients: [],
            allIngredientsPresent: false,
            requiredIngredients: []
        };
    }
}

// ==================== CLOSE MISSING INGREDIENTS MODAL ====================
function closeMissingIngredientsModal() {
    console.log('🔴 Closing missing ingredients modal');
    const modal = document.getElementById('missingIngredientsModal');
    if (modal) {
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.style.opacity = '0';
    }
}

// ==================== SHOW MISSING INGREDIENTS MODAL ====================
function showMissingIngredientsModal(itemName, missingList) {
    console.log(`📋 Showing missing ingredients for: ${itemName}`, missingList);
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('missingIngredientsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'missingIngredientsModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            visibility: visible;
            opacity: 1;
        `;
        document.body.appendChild(modal);
    }
    
    // Update modal content
    const contentArea = document.getElementById('missingIngredientsContent');
    let modalHTML = `
        <div style="background: white; border-radius: 12px; overflow: hidden; max-width: 500px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
            <!-- Header Section -->
            <div style="background: #4e8a6a; padding: 20px 30px; display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 35px; flex-shrink: 0;">⚠️</div>
                <div style="flex: 1;">
                    <h2 style="margin: 0; color: white; font-size: 20px; font-weight: 600;">Missing Ingredients</h2>
                    <p style="margin: 5px 0 0 0; color: #e8f5e9; font-size: 13px;">Cannot add stock for: <strong>${escapeHtml(itemName)}</strong></p>
                </div>
            </div>
            
            <!-- Body Section -->
            <div style="padding: 30px;">
                <div style="background: #fff5f5; border-left: 4px solid #e74c3c; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 12px 0; color: #e74c3c; font-size: 14px; font-weight: 600;">Required Ingredients Unavailable:</h4>
                    <ul style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px;">
    `;
    
    if (Array.isArray(missingList) && missingList.length > 0) {
        missingList.forEach(item => {
            modalHTML += `
                        <li style="color: #e74c3c; margin: 0; font-size: 14px; display: flex; align-items: center; gap: 10px; line-height: 1.4;">
                            <span style="flex-shrink: 0; display: inline-block; width: 18px; text-align: center;">❌</span><span>${escapeHtml(item)}</span>
                        </li>
            `;
        });
    } else {
        modalHTML += `
                        <li style="color: #e74c3c; margin: 0; font-size: 14px; display: flex; align-items: center; gap: 10px; line-height: 1.4;">
                            <span style="flex-shrink: 0; display: inline-block; width: 18px; text-align: center;">❌</span><span>Some ingredients are out of stock or insufficient</span>
                        </li>
        `;
    }
    
    modalHTML += `
                    </ul>
                </div>
                    
                <div style="display: flex; gap: 10px;">
                    <button onclick="closeMissingIngredientsModal()" style="
                        flex: 1;
                        padding: 12px 20px;
                        border: 1px solid #ddd;
                        background: #f8f9fa;
                        color: #333;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: all 0.2s;
                    ">Close</button>
                </div>
            </div>
        </div>
    `;
    
    modal.innerHTML = modalHTML;
    modal.style.display = 'flex';
    modal.style.visibility = 'visible';
    modal.style.opacity = '1';
    
    // Close modal when clicking outside
    modal.onclick = function(event) {
        if (event.target === modal) {
            closeMissingIngredientsModal();
        }
    };
}

// ==================== SHOW PRODUCT MISSING INGREDIENTS MODAL ====================
async function showProductMissingIngredientsModal(productName) {
    console.log(`📋 Showing missing ingredients for: ${productName}`);
    
    const modal = document.getElementById('productMissingIngredientsModal');
    if (!modal) {
        console.error('Modal not found');
        return;
    }
    
    // Show loading state
    const contentArea = document.getElementById('productMissingContent');
    if (contentArea) {
        contentArea.innerHTML = '<div style="text-align: center; padding: 30px;"><p>Loading ingredient data...</p></div>';
    }
    
    modal.style.display = 'flex';
    
    try {
        // Check ingredient availability for this specific product
        const availability = await checkIngredientAvailability(productName);
        
        // Set product name and status
        const productTitle = document.getElementById('productMissingTitle');
        const statusIcon = availability.available ? '✓' : '❌';
        const statusColor = availability.available ? '#27ae60' : '#e74c3c';
        
        if (productTitle) {
            productTitle.innerHTML = `<span style="color: ${statusColor}; font-size: 20px;">${statusIcon}</span> ${escapeHtml(productName)}`;
        }
        
        // Render the content
        if (contentArea) {
            let html = '<div>';
            
            // Available Ingredients
            if (availability.availableIngredients && availability.availableIngredients.length > 0) {
                html += `
                    <div style="margin-bottom: 20px;">
                        <h4 style="margin: 0 0 10px 0; color: #27ae60; font-size: 14px; font-weight: 600;">✓ Available Ingredients:</h4>
                        <ul style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px;">
                `;
                availability.availableIngredients.forEach(ing => {
                    html += `<li style="color: #27ae60; margin: 0; font-size: 14px; display: flex; align-items: center; gap: 10px; line-height: 1.4;">
                                <span style="flex-shrink: 0; display: inline-block; width: 18px; text-align: center;">✓</span><span>${escapeHtml(ing)}</span>
                            </li>`;
                });
                html += `
                        </ul>
                    </div>
                `;
            }
            
            // Missing Ingredients
            if (availability.missingIngredients && availability.missingIngredients.length > 0) {
                html += `
                    <div>
                        <h4 style="margin: 0 0 10px 0; color: #e74c3c; font-size: 14px; font-weight: 600;">❌ Missing Ingredients:</h4>
                        <ul style="margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px;">
                `;
                availability.missingIngredients.forEach(ing => {
                    html += `<li style="color: #e74c3c; margin: 0; font-size: 14px; display: flex; align-items: center; gap: 10px; line-height: 1.4;">
                                <span style="flex-shrink: 0; display: inline-block; width: 18px; text-align: center;">❌</span><span>${escapeHtml(ing)}</span>
                            </li>`;
                });
                html += `
                        </ul>
                    </div>
                `;
            }
            
            // If all available, show success message
            if (availability.available && (!availability.missingIngredients || availability.missingIngredients.length === 0)) {
                html = `
                    <div style="text-align: center; padding: 30px; color: #27ae60;">
                        <div style="font-size: 48px; margin-bottom: 15px;">✅</div>
                        <h3>All Ingredients Available!</h3>
                        <p>${escapeHtml(productName)} has all required ingredients in stock.</p>
                    </div>
                `;
            }
            
            html += '</div>';
            contentArea.innerHTML = html;
        }
    } catch (error) {
        console.error('Error loading product data:', error);
        if (contentArea) {
            contentArea.innerHTML = `<div style="text-align: center; padding: 30px; color: #e74c3c;"><p>Error loading ingredient data: ${error.message}</p></div>`;
        }
    }
}

// ==================== SHOW ALL PRODUCTS MISSING INGREDIENTS ====================
async function showAllProductsMissingIngredientsModal() {
    console.log('📋 Loading missing ingredients for all products...');
    
    const modal = document.getElementById('allProductsMissingIngredientsModal');
    if (!modal) {
        console.error('Modal not found');
        return;
    }
    
    // Show loading state
    const contentArea = document.getElementById('allProductsMissingContent');
    if (contentArea) {
        contentArea.innerHTML = '<div style="text-align: center; padding: 30px;"><p>Loading product data...</p></div>';
    }
    
    modal.style.display = 'flex';
    
    try {
        // Get all unique products from the recipe mapping
        const allProducts = Object.keys(productIngredientMap || {});
        
        if (allProducts.length === 0) {
            if (contentArea) {
                contentArea.innerHTML = '<div style="text-align: center; padding: 30px; color: #999;"><p>No products found</p></div>';
            }
            return;
        }
        
        // Fetch inventory once
        const inventoryItems = await fetchInventoryFromMongoDB();
        
        // Check each product for missing ingredients
        const productsList = [];
        
        for (const productName of allProducts) {
            const availability = await checkIngredientAvailability(productName);
            
            if (!availability.available || availability.missingIngredients.length > 0) {
                productsList.push({
                    name: productName,
                    available: availability.available,
                    missingIngredients: availability.missingIngredients || [],
                    availableIngredients: availability.availableIngredients || [],
                    requiredIngredients: availability.requiredIngredients || []
                });
            }
        }
        
        // Render the modal content
        if (contentArea) {
            if (productsList.length === 0) {
                contentArea.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #27ae60;">
                        <div style="font-size: 48px; margin-bottom: 15px;">✅</div>
                        <h3>All Products Ready!</h3>
                        <p>All products have their required ingredients in stock.</p>
                    </div>
                `;
            } else {
                let html = '<div style="max-height: 600px; overflow-y: auto;">';
                
                productsList.forEach(product => {
                    const statusColor = product.available ? '#27ae60' : '#e74c3c';
                    const statusIcon = product.available ? '✓' : '❌';
                    
                    html += `
                        <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 6px; background-color: #f9f9f9;">
                            <h4 style="margin: 0 0 10px 0; color: #333;">
                                <span style="color: ${statusColor}; font-size: 18px;">${statusIcon}</span> 
                                ${escapeHtml(product.name)}
                            </h4>
                            
                            <div style="margin-left: 10px;">
                                ${product.availableIngredients.length > 0 ? `
                                    <div style="margin-bottom: 10px;">
                                        <p style="margin: 0 0 5px 0; font-size: 12px; font-weight: 600; color: #27ae60;">✓ Available Ingredients:</p>
                                        <ul style="margin: 5px 0; padding-left: 20px; font-size: 13px;">
                                            ${product.availableIngredients.map(ing => `<li style="color: #27ae60;">${escapeHtml(ing)}</li>`).join('')}
                                        </ul>
                                    </div>
                                ` : ''}
                                
                                ${product.missingIngredients.length > 0 ? `
                                    <div>
                                        <p style="margin: 0 0 5px 0; font-size: 12px; font-weight: 600; color: #e74c3c;">❌ Missing Ingredients:</p>
                                        <ul style="margin: 5px 0; padding-left: 20px; font-size: 13px;">
                                            ${product.missingIngredients.map(ing => `<li style="color: #e74c3c;">${escapeHtml(ing)}</li>`).join('')}
                                        </ul>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
                });
                
                html += '</div>';
                contentArea.innerHTML = html;
            }
        }
    } catch (error) {
        console.error('Error loading products:', error);
        if (contentArea) {
            contentArea.innerHTML = `<div style="text-align: center; padding: 30px; color: #e74c3c;"><p>Error loading product data: ${error.message}</p></div>`;
        }
    }
}

// ==================== CHECK INGREDIENT AVAILABILITY FOR UI (IMMEDIATE FEEDBACK) ====================
// This version is specifically for UI feedback when selecting a product
// It shows ALL ingredients as missing when inventory is empty, helping users understand what needs to be stocked
async function checkIngredientAvailabilityForUI(itemName) {
    try {
        console.log(`🔍 [UI] Checking ingredient availability for: ${itemName}`);
        
        const recipe = productIngredientMap[itemName];
        
        // If no recipe found in local map - CHECK SERVER'S recipeMapping
        if (!recipe) {
            console.log(`⚠️ [UI] No recipe found in productIngredientMap for "${itemName}"`);
            console.log(`   [UI] Checking if recipe exists on server...`);
            
            // Try to fetch from server to see if recipe is defined there
            try {
                const serverCheckResponse = await fetch(`/api/menu/check-recipe/${encodeURIComponent(itemName)}`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    credentials: 'include'
                });
                
                if (serverCheckResponse.ok) {
                    const recipeData = await serverCheckResponse.json();
                    console.log(`   [UI] Server response:`, recipeData);
                    
                    // Check if recipe exists on server
                    if (recipeData.hasRecipe === true && recipeData.ingredients && recipeData.ingredients.length > 0) {
                        console.log(`✅ [UI] Recipe found on server for "${itemName}":`, recipeData.ingredients);
                        
                        // Fetch inventory and check availability
                        let inventoryItems = await fetchInventoryFromMongoDB();
                        
                        // If database fetch failed, use local ingredientInventory as fallback
                        if (!Array.isArray(inventoryItems) || inventoryItems.length === 0) {
                            console.warn(`⚠️ [UI] No inventory from MongoDB - Using local ingredientInventory fallback`);
                            inventoryItems = Object.values(ingredientInventory).map(ing => ({
                                itemName: ing.name,
                                name: ing.name,
                                currentStock: ing.current,
                                unit: ing.unit
                            }));
                            console.log(`✅ [UI] Using ${inventoryItems.length} ingredients from local cache`);
                        }
                        
                        if (!Array.isArray(inventoryItems) || inventoryItems.length === 0) {
                            console.warn(`⚠️ [UI] Still no inventory data available - Showing ALL ingredients as missing (for UI feedback)`);
                            // When inventory is empty, show ALL ingredients as missing for UI feedback
                            return {
                                available: false, // ← KEY DIFFERENCE: false instead of true
                                missingIngredients: recipeData.ingredients.map(ing => `${ing} (NOT IN INVENTORY)`),
                                availableIngredients: [],
                                allIngredientsPresent: false,
                                requiredIngredients: recipeData.ingredients,
                                hasRecipe: true,
                                source: 'server'
                            };
                        }
                        
                        // Check each ingredient against actual inventory
                        const missingIngredients = [];
                        const availableIngredients = [];
                        
                        console.log(`📦 [UI] Checking ${recipeData.ingredients.length} ingredients against ${inventoryItems.length} inventory items`);
                        console.log(`   Available inventory items:`, inventoryItems.map(i => ({ name: i.itemName || i.name, stock: i.currentStock })));
                        
                        for (const ingredientName of recipeData.ingredients) {
                            const normalizedIngredientName = ingredientName.replace(/_/g, ' ');
                            
                            console.log(`   🔍 Looking for ingredient: "${ingredientName}" (normalized: "${normalizedIngredientName}")`);
                            
                            const dbInventoryItem = inventoryItems.find(item => {
                                const itemNameToCheck = item.itemName || item.name || '';
                                const isMatch = itemNameToCheck.toLowerCase() === normalizedIngredientName.toLowerCase();
                                if (!isMatch) {
                                    console.log(`      ❌ No match with: "${itemNameToCheck}"`);
                                }
                                return isMatch;
                            });
                            
                            if (!dbInventoryItem) {
                                console.warn(`   ❌ [UI] NOT FOUND in inventory: ${ingredientName}`);
                                missingIngredients.push(`${normalizedIngredientName} (NOT IN INVENTORY)`);
                            } else {
                                const currentStock = parseFloat(dbInventoryItem.currentStock || 0);
                                const unit = dbInventoryItem.unit || 'unit';
                                
                                if (currentStock <= 0) {
                                    console.warn(`   ❌ [UI] OUT OF STOCK: ${ingredientName}`);
                                    missingIngredients.push(`${ingredientName} - OUT OF STOCK (Have: ${currentStock} ${unit})`);
                                } else {
                                    console.log(`   ✅ [UI] SUFFICIENT STOCK: ${ingredientName} (${currentStock} ${unit})`);
                                    availableIngredients.push(ingredientName);
                                }
                            }
                        }
                        
                        const hasAllIngredients = missingIngredients.length === 0;
                        return {
                            available: hasAllIngredients,
                            missingIngredients: missingIngredients,
                            availableIngredients: availableIngredients,
                            allIngredientsPresent: hasAllIngredients,
                            requiredIngredients: recipeData.ingredients,
                            hasRecipe: true,
                            source: 'server'
                        };
                    } else {
                        // Recipe not found on server
                        console.warn(`❌ [UI] No recipe defined for "${itemName}" on server`);
                        return {
                            available: false,
                            missingIngredients: [`No recipe defined for "${itemName}" - Add recipe mapping to server.js recipeMapping`],
                            availableIngredients: [],
                            allIngredientsPresent: false,
                            requiredIngredients: [],
                            hasRecipe: false,
                            source: 'server'
                        };
                    }
                } else {
                    console.warn(`⚠️ [UI] Could not verify recipe on server for "${itemName}" - HTTP ${serverCheckResponse.status}`);
                    return {
                        available: false,
                        missingIngredients: [`Could not verify recipe for "${itemName}" on server`],
                        availableIngredients: [],
                        allIngredientsPresent: false,
                        requiredIngredients: [],
                        hasRecipe: false,
                        source: 'server'
                    };
                }
            } catch (e) {
                console.warn(`⚠️ [UI] Could not check server for recipe: ${e.message}`);
                return {
                    available: false,
                    missingIngredients: [`Error checking recipe: ${e.message}`],
                    availableIngredients: [],
                    allIngredientsPresent: false,
                    requiredIngredients: [],
                    hasRecipe: false,
                    source: 'server'
                };
            }
        }
        
        // Recipe found in local productIngredientMap
        
        // If recipe exists but has no ingredients
        if (!recipe.ingredients || Object.keys(recipe.ingredients).length === 0) {
            console.log(`ℹ️ [UI] No ingredients defined for "${itemName}" - Product has no ingredient requirements`);
            return {
                available: true,
                missingIngredients: [],
                availableIngredients: [],
                allIngredientsPresent: true,
                requiredIngredients: [],
                hasRecipe: true,
                source: 'local'
            };
        }
        
        console.log(`📋 [UI] Recipe for ${itemName}:`, recipe.ingredients);
        
        const missingIngredients = [];
        const availableIngredients = [];
        
        // Fetch inventory from MongoDB
        let inventoryItems = await fetchInventoryFromMongoDB();
        
        // If database fetch returns empty, log warning
        if (!Array.isArray(inventoryItems) || inventoryItems.length === 0) {
            console.warn(`⚠️ [UI] No inventory data available from database or local cache`);
            // Return error indicating no inventory data
            return {
                available: false,
                missingIngredients: [],
                availableIngredients: [],
                allIngredientsPresent: false,
                requiredIngredients: [],
                hasRecipe: true,
                source: 'database',
                error: 'No inventory data available'
            };
        }
        
        // Check each ingredient
        for (const [ingredientName, requiredAmount] of Object.entries(recipe.ingredients)) {
            console.log(`   [UI] Checking ingredient: ${ingredientName} (required: ${requiredAmount})`);
            
            const normalizedIngredientName = ingredientName.replace(/_/g, ' ');
            
            // Find in inventory
            const dbInventoryItem = inventoryItems.find(item => {
                const itemNameToCheck = item.itemName || item.name || '';
                return itemNameToCheck.toLowerCase() === normalizedIngredientName.toLowerCase();
            });
            
            if (!dbInventoryItem) {
                console.warn(`   ❌ [UI] NOT FOUND in inventory: ${ingredientName}`);
                missingIngredients.push(`${normalizedIngredientName} (NOT IN INVENTORY)`);
                continue;
            }
            
            const currentStock = parseFloat(dbInventoryItem.currentStock || 0);
            const unit = dbInventoryItem.unit || 'unit';
            
            console.log(`   [UI] Found in inventory: ${ingredientName} - Current: ${currentStock} ${unit}, Required: ${requiredAmount}`);
            
            if (currentStock <= 0) {
                console.warn(`   ❌ [UI] OUT OF STOCK: ${ingredientName}`);
                missingIngredients.push(`${ingredientName} - OUT OF STOCK (Have: ${currentStock} ${unit})`);
            } else if (currentStock < requiredAmount) {
                console.warn(`   ⚠️ [UI] INSUFFICIENT STOCK: ${ingredientName}`);
                missingIngredients.push(`${ingredientName} - INSUFFICIENT STOCK (Need: ${requiredAmount} ${unit}, Have: ${currentStock} ${unit})`);
            } else {
                console.log(`   ✅ [UI] SUFFICIENT STOCK: ${ingredientName}`);
                availableIngredients.push(ingredientName);
            }
        }
        
        const hasAllIngredients = missingIngredients.length === 0;
        console.log(`\n📊 [UI] Availability Result for "${itemName}": Available: ${hasAllIngredients ? '✅' : '❌'}\n`);
        
        return {
            available: hasAllIngredients,
            missingIngredients: missingIngredients,
            availableIngredients: availableIngredients,
            allIngredientsPresent: hasAllIngredients,
            requiredIngredients: Object.keys(recipe.ingredients),
            hasRecipe: true,
            source: 'local'
        };
    } catch (error) {
        console.error('❌ [UI] Error checking ingredient availability:', error);
        return {
            available: false,
            missingIngredients: [`Error: ${error.message}`],
            availableIngredients: [],
            allIngredientsPresent: false,
            requiredIngredients: [],
            hasRecipe: false,
            source: 'local'
        };
    }
}

// ==================== SHOW TOAST ====================
function showToast(message, type = 'success', duration = 5000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    toast.style.cssText = `
        margin-bottom: 10px;
        padding: 16px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        display: flex;
        align-items: flex-start;
        gap: 12px;
        word-wrap: break-word;
        word-break: break-word;
        max-width: 100%;
        animation: slideIn 0.3s ease;
    `;
    
    const icon = document.createElement('i');
    icon.className = `fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}`;
    icon.style.cssText = 'flex-shrink: 0; margin-top: 2px;';
    
    const textSpan = document.createElement('span');
    textSpan.textContent = message;
    textSpan.style.cssText = 'flex: 1;';
    
    toast.appendChild(icon);
    toast.appendChild(textSpan);
    
    container.appendChild(toast);
    
    console.log(`📢 Toast [${type}]: ${message}`);
    
    setTimeout(() => { toast.classList.add('show'); }, 10);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }, duration);
}

// ==================== SHOW MISSING INGREDIENTS MODAL ====================

// ==================== SHOW RECIPE NOT FOUND MODAL ====================
function showRecipeNotFoundModal(productName) {
    console.log(`⚠️ Displaying recipe not found modal for: ${productName}`);
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('recipeNotFoundModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'recipeNotFoundModal';
        modal.className = 'modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            z-index: 1001;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            align-items: center;
            justify-content: center;
        `;
        
        modal.innerHTML = `
            <div class="modal-content" style="
                background: white;
                padding: 25px;
                border-radius: 12px;
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            ">
                <div class="modal-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 2px solid #f0f0f0;
                    padding-bottom: 15px;
                    margin-bottom: 20px;
                ">
                    <h2 style="margin: 0; color: #ff6b6b; font-size: 24px;">
                        <i class="fas fa-ban"></i> Recipe Not Found
                    </h2>
                    <button id="closeRecipeNotFoundModal" style="
                        background: none;
                        border: none;
                        font-size: 28px;
                        cursor: pointer;
                        color: #666;
                    ">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="font-size: 16px; margin-bottom: 15px; color: #333;">
                        No recipe has been defined for <strong id="recipeNotFoundProductName">${productName}</strong> yet.
                    </p>
                    <div style="
                        background: #fff3cd;
                        padding: 15px;
                        border-radius: 8px;
                        border-left: 4px solid #ffc107;
                        margin-bottom: 20px;
                    ">
                        <p style="margin: 0; color: #856404; font-size: 14px;">
                            <i class="fas fa-info-circle"></i> <strong>Instructions:</strong> Please add ingredients to the recipe first before adding this product to inventory.
                        </p>
                    </div>
                    <div style="
                        background: #f8f9fa;
                        padding: 15px;
                        border-radius: 8px;
                        border-left: 4px solid #6c757d;
                    ">
                        <p style="margin: 0; color: #495057; font-size: 13px;">
                            <i class="fas fa-wrench"></i> To define the recipe, update the <code style="background: #e9ecef; padding: 2px 6px; border-radius: 3px;">recipeMapping</code> object in <code style="background: #e9ecef; padding: 2px 6px; border-radius: 3px;">server.js</code> with the required ingredients.
                        </p>
                    </div>
                </div>
                <div class="modal-footer" style="
                    margin-top: 25px;
                    text-align: right;
                    border-top: 2px solid #f0f0f0;
                    padding-top: 20px;
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                ">
                    <button id="closeRecipeNotFoundBtn" class="btn btn-primary" style="
                        padding: 12px 30px;
                        background: #007bff;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 16px;
                        font-weight: 500;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='#0056b3'" onmouseout="this.style.background='#007bff'">
                        ✓ OK
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    // ✅ ALWAYS attach event listeners (outside the if block so they work every time modal is shown)
    const closeBtn = document.getElementById('closeRecipeNotFoundBtn');
    const closeModalBtn = document.getElementById('closeRecipeNotFoundModal');
    
    // Remove old listeners by cloning and replacing
    if (closeBtn) {
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        newCloseBtn.addEventListener('click', function(e) {
            console.log('✓ OK button clicked on recipe not found modal');
            e.preventDefault();
            e.stopPropagation();
            closeRecipeNotFoundModal();
        });
    }
    
    if (closeModalBtn) {
        const newCloseModalBtn = closeModalBtn.cloneNode(true);
        closeModalBtn.parentNode.replaceChild(newCloseModalBtn, closeModalBtn);
        newCloseModalBtn.addEventListener('click', function(e) {
            console.log('✕ Close button clicked on recipe not found modal');
            e.preventDefault();
            e.stopPropagation();
            closeRecipeNotFoundModal();
        });
    }
    
    // Handle modal background click
    modal.onclick = function(e) {
        if (e.target === modal) {
            closeRecipeNotFoundModal();
        }
    };
    
    // Update modal content with product name
    document.getElementById('recipeNotFoundProductName').textContent = productName;
    
    // Show modal
    console.log('📋 Showing recipe not found modal');
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function closeRecipeNotFoundModal() {
    const modal = document.getElementById('recipeNotFoundModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
            isModalOpen = false; // Reset the modal flag when closing
        }, 150);
    }
}

// ==================== INITIALIZE EVENT LISTENERS ====================
function initializeEventListeners() {
    console.log('🔌 Initializing event listeners...');
    
    if (elements.addNewItem) {
        elements.addNewItem.addEventListener('click', openAddModal);
    }
    
    const addFirstItemBtn = document.getElementById('addFirstItemBtn');
    if (addFirstItemBtn) addFirstItemBtn.addEventListener('click', openAddModal);
    
    const addFirstMenuBtn = document.getElementById('addFirstMenuBtn');
    if (addFirstMenuBtn) addFirstMenuBtn.addEventListener('click', openAddModal);
    
    if (elements.saveItemBtn) {
        elements.saveItemBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            await handleSaveItem();
        });
    }
    
    if (elements.cancelBtn) elements.cancelBtn.addEventListener('click', closeModal);
    if (elements.closeModal) elements.closeModal.addEventListener('click', closeModal);
    
    if (elements.itemCategory) {
        elements.itemCategory.addEventListener('change', function() {
            updateFromCategory();
            if (elements.itemName) elements.itemName.value = '';
            if (elements.itemUnit) elements.itemUnit.value = '';
            if (elements.itemPrice) elements.itemPrice.value = '';
        });
    }
    
    if (elements.itemName) {
        elements.itemName.addEventListener('change', function() {
            updateFromItemNameSelect();
        });
    }
    
    if (elements.itemModal) {
        elements.itemModal.addEventListener('click', (e) => {
            if (e.target === elements.itemModal) closeModal();
        });
    }
    
    if (elements.itemForm) {
        elements.itemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleSaveItem();
        });
    }
    
    if (elements.navLinks && elements.navLinks.length > 0) {
        elements.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                showSection(section);
            });
        });
    }
    
    if (elements.categoryItems && elements.categoryItems.length > 0) {
        elements.categoryItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const category = item.getAttribute('data-category');
                const fullname = item.getAttribute('data-fullname');
                filterByCategory(category, fullname);
            });
        });
    }
    
    // Close missing ingredients modal when clicking outside
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('missingIngredientsModal');
        if (modal && e.target === modal) {
            closeMissingIngredientsModal();
        }
    });
}

// ==================== INITIALIZE CATEGORY DROPDOWN ====================
function initializeCategoryDropdown() {
    if (!elements.itemCategory) return;
    
    elements.itemCategory.innerHTML = '<option value="">Select Category</option>';
    
    Object.keys(categoryDisplayNames).forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = categoryDisplayNames[category];
        elements.itemCategory.appendChild(option);
    });
}

// ==================== CATEGORY DROPDOWN FUNCTIONS ====================
function populateItemNamesByCategory(category = null) {
    const itemNameSelect = elements.itemName;
    if (!itemNameSelect) return;
    
    itemNameSelect.innerHTML = '<option value="">Select Product</option>';
    
    if (!category || category.trim() === '') return;
    
    const categoryItems = menuDatabase[category] || [];
    
    if (categoryItems.length === 0) return;
    
    const sortedItems = [...categoryItems].sort((a, b) => a.name.localeCompare(b.name));
    
    sortedItems.forEach(item => {
        const option = document.createElement('option');
        option.value = item.name;
        option.textContent = item.name;
        option.dataset.unit = item.unit;
        option.dataset.price = item.defaultPrice;
        itemNameSelect.appendChild(option);
    });
}

// ==================== UPDATE FROM ITEM NAME SELECT ====================
async function updateFromItemNameSelect() {
    const itemName = elements.itemName.value;
    
    if (!itemName || itemName.trim() === '' || itemName === 'Select Product') return;
    
    const selectedOption = elements.itemName.options[elements.itemName.selectedIndex];
    const unit = selectedOption.dataset.unit;
    const price = selectedOption.dataset.price;
    
   
    if (itemName.includes('Soda') || itemName.includes('Mismo')) {
        if (elements.itemUnit) {
            elements.itemUnit.value = 'plastic_bottle';
        }
    } else if (unit && elements.itemUnit) {
        elements.itemUnit.value = unit;
    }
    
    if (price && elements.itemPrice) elements.itemPrice.value = price;
    
    
    if (!elements.itemId || !elements.itemId.value) {
        console.log(`\n🧮 Auto-calculating max stock for "${itemName}" based on ingredients...\n`);
        
       
        const availabilityCheck = await checkIngredientAvailabilityForUI(itemName);
        
        
        if (availabilityCheck) {
            missingIngredientsData[itemName] = {
                productName: itemName,
                missing: availabilityCheck.missingIngredients || [],
                available: availabilityCheck.availableIngredients || []
            };
            console.log(`✅ Stored ingredient data for "${itemName}":`, missingIngredientsData[itemName]);
        } else {
            console.warn(`⚠️ No availabilityCheck returned for "${itemName}"`);
        }
        
        const maxStock = await calculateMaxStockBasedOnIngredients(itemName);
        
        if (elements.maximumStock) {
            // Remove any existing helper text
            const existingHelper = document.getElementById('maxStockHelper');
            if (existingHelper) {
                existingHelper.remove();
            }
            
            if (maxStock !== null && maxStock > 0) {
                // SUCCESS: Ingredients available
                elements.maximumStock.value = maxStock;
                elements.maximumStock.readOnly = true;
                elements.maximumStock.style.backgroundColor = '#e8f5e9';
                elements.maximumStock.style.borderColor = '#4caf50';
                elements.maximumStock.style.color = '#1b5e20';
                elements.maximumStock.title = 'Auto-calculated based on available ingredients';
                
                // Also set current stock to 0
                if (elements.currentStock) {
                    elements.currentStock.value = '0';
                    elements.currentStock.max = maxStock;
                }
                
                // Create detailed helper text with calculation breakdown
                // Show ingredient details link for all products with calculated max stock
                const helper = document.createElement('div');
                helper.id = 'maxStockHelper';
                helper.style.cssText = `
                    display: block;
                    margin-top: 8px;
                    padding: 10px;
                    background: #e3f2fd;
                    border-left: 4px solid #2196f3;
                    border-radius: 3px;
                    font-size: 12px;
                    color: #1565c0;
                    line-height: 1.5;
                `;
                
                // Only show the link to view ingredient details, no breakdown in the form
                let detailsHTML = `<small style="cursor: pointer; color: #2196f3; text-decoration: underline; font-weight: 600;" onclick="showProductMissingIngredientsModal('${itemName}')">📦 View ingredient details</small>`;
                helper.innerHTML = detailsHTML;
                elements.maximumStock.parentNode.appendChild(helper);
                
            } else if (maxStock === 0) {
                // ERROR: Missing or insufficient ingredients
                elements.maximumStock.value = '0';
                elements.maximumStock.readOnly = true;
                elements.maximumStock.style.backgroundColor = '#ffebee';
                elements.maximumStock.style.borderColor = '#dc3545';
                elements.maximumStock.style.color = '#c62828';
                elements.maximumStock.title = 'Cannot create - insufficient ingredients';
                
                // Create warning helper text
                const helper = document.createElement('div');
                helper.id = 'maxStockHelper';
                helper.style.cssText = `
                    display: block;
                    margin-top: 8px;
                    padding: 10px;
                    background: #e3f2fd;
                    border-left: 4px solid #2196f3;
                    border-radius: 3px;
                    font-size: 12px;
                    color: #1565c0;
                `;
                helper.innerHTML = `<small style="cursor: pointer; color: #2196f3; text-decoration: underline; font-weight: 600;" onclick="showProductMissingIngredientsModal('${itemName}')">📦 View ingredient details</small>`;
                elements.maximumStock.parentNode.appendChild(helper);
                
            } else {
                // No recipe or no ingredients, allow manual entry
                elements.maximumStock.value = '';
                elements.maximumStock.readOnly = false;
                elements.maximumStock.style.backgroundColor = '';
                elements.maximumStock.style.borderColor = '';
                elements.maximumStock.style.color = '';
                elements.maximumStock.title = 'Enter maximum stock manually';
                elements.maximumStock.placeholder = 'Enter maximum stock';
                
                // Create info helper text with link to view ingredients for THIS product
                const helper = document.createElement('div');
                helper.id = 'maxStockHelper';
                helper.style.cssText = `
                    display: block;
                    margin-top: 8px;
                    padding: 10px;
                    background: #e3f2fd;
                    border-left: 4px solid #2196f3;
                    border-radius: 3px;
                    font-size: 12px;
                    color: #1565c0;
                `;
                helper.innerHTML = `<small style="cursor: pointer; color: #2196f3; text-decoration: underline; font-weight: 600;" onclick="showProductMissingIngredientsModal('${itemName}')">📦 View Missing Ingredients</small>`;
                elements.maximumStock.parentNode.appendChild(helper);
            }
        }
    }
}

function updateFromCategory() {
    const category = elements.itemCategory.value;
    
    if (!category || category.trim() === '' || category === 'Select Category') {
        if (elements.itemName) elements.itemName.innerHTML = '<option value="">Select Product</option>';
        if (elements.itemUnit) elements.itemUnit.value = '';
        if (elements.itemPrice) elements.itemPrice.value = '';
        return;
    }
    
    updateUnitOptions(category);
    populateItemNamesByCategory(category);
    
    if (elements.itemName) elements.itemName.value = '';
    if (elements.itemUnit) elements.itemUnit.value = '';
    if (elements.itemPrice) elements.itemPrice.value = '';
}

function updateUnitOptions(category) {
    const unitSelect = elements.itemUnit;
    if (!unitSelect) return;
    
    const availableUnits = categoryUnitsMapping[category] || ['pcs'];
    const currentUnit = unitSelect.value;
    
    unitSelect.innerHTML = '<option value="">Select Unit</option>';
    
    availableUnits.forEach(unit => {
        const option = document.createElement('option');
        option.value = unit;
        option.textContent = unitDisplayLabels[unit] || unit.charAt(0).toUpperCase() + unit.slice(1);
        unitSelect.appendChild(option);
    });
    
    if (currentUnit && availableUnits.includes(currentUnit)) {
        unitSelect.value = currentUnit;
    } else if (availableUnits.length > 0) {
        const defaultUnits = {
            'Rice': 'plate',
            'Sizzling': 'sizzling plate',
            'Party': 'tray',
            'Drink': 'glass',
            'Cafe': 'cup',
            'Milk Tea': 'cup',
            'Frappe': 'cup',
            'Snack & Appetizer': 'serving',
            'Budget Meals Served with Rice': 'meal',
            'Specialties': 'serving',
        };
        unitSelect.value = defaultUnits[category] || availableUnits[0];
    }
}

// ==================== FORMATTING FUNCTIONS ====================
function formatNumber(num) {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return new Intl.NumberFormat('en-US').format(num);
}

function formatCurrency(amount) {
    if (amount === undefined || amount === null || isNaN(amount)) return '₱0.00';
    const numAmount = parseFloat(amount);
    return '₱' + numAmount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function getCategoryDisplayName(category) {
    return categoryDisplayNames[category] || category;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== FETCH MENU ITEMS ====================
async function fetchMenuItems() {
    try {
        console.log('🔍 Fetching menu items from API...');
        
        const response = await fetch('/api/menu', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        });
        
        if (response.status === 401) {
            console.warn('⚠️ Unauthorized - session expired');
            showToast('Session expired. Please login again.', 'error');
            setTimeout(() => { window.location.href = '/login'; }, 2000);
            return false;
        }
        
        if (!response.ok) {
            console.warn(`⚠️ API error ${response.status} - ${response.statusText}`);
            return false;
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.warn('⚠️ Response is not JSON');
            return false;
        }
        
        const data = await response.json();
        
        if (data && data.success && Array.isArray(data.data)) {
            allMenuItems = data.data || [];
            console.log(`✅ ${allMenuItems.length} items loaded from API`);
            
            // Save to localStorage as backup only
            try {
                localStorage.setItem('menuItems_backup', JSON.stringify(allMenuItems));
                localStorage.setItem('menuItems_lastUpdate', new Date().toISOString());
            } catch (e) {
                console.warn('⚠️ Could not save to localStorage:', e);
            }
            
            updateAllUIComponents();
            
            retryCount = 0;
            
            return true;
        } else {
            console.warn('⚠️ API response data invalid or missing');
            return false;
        }
    } catch (error) {
        console.error('❌ Network error fetching menu items:', error.message);
        return false;
    }
}

// ==================== MODAL FUNCTIONS ====================
function openAddModal() {
    if (isModalOpen) return;
    
    console.log(`📦 Opening Add New Product Modal`);
    
    isModalOpen = true;
    const modal = elements.itemModal;
    
    // Clear calculation helper text and data
    const existingHelper = document.getElementById('maxStockHelper');
    if (existingHelper) {
        existingHelper.remove();
    }
    window.lastMaxStockCalculation = null;
    
    if (elements.modalTitle) elements.modalTitle.textContent = 'Add New Product';
    if (elements.itemForm) elements.itemForm.reset();
    if (elements.itemId) elements.itemId.value = '';
    
    // Reset max stock field for fresh calculation on product selection
    if (elements.maximumStock) {
        elements.maximumStock.value = '';
        elements.maximumStock.placeholder = 'Auto-calculated from ingredients';
        elements.maximumStock.readOnly = false;
        elements.maximumStock.style.backgroundColor = '';
        elements.maximumStock.style.borderColor = '';
        elements.maximumStock.style.color = '';
        elements.maximumStock.title = 'Select a product above to auto-calculate maximum stock';
    }
    
    if (elements.currentStock) {
        elements.currentStock.value = '0';
        elements.currentStock.readOnly = false;
        elements.currentStock.style.backgroundColor = '';
        elements.currentStock.style.borderColor = '';
        elements.currentStock.style.color = '';
        elements.currentStock.title = 'Current quantity in stock';
    }
    if (elements.minimumStock) elements.minimumStock.value = '20';
    if (elements.itemPrice) elements.itemPrice.value = '';
    
    if (elements.itemCategory) {
        elements.itemCategory.value = '';
        updateFromCategory();
    }
    
    if (elements.itemName) {
        elements.itemName.value = '';
    }
    
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
        if (elements.itemCategory) elements.itemCategory.focus();
    }, 10);
}

async function openEditModal(itemId) {
    if (isModalOpen) return;
    
    const item = allMenuItems.find(i => i._id === itemId);
    if (!item) {
        showToast('Product not found', 'error');
        return;
    }
    
    isModalOpen = true;
    const modal = elements.itemModal;
    
    if (elements.modalTitle) elements.modalTitle.textContent = 'Edit Product';
    if (elements.itemId) elements.itemId.value = item._id;
    
    if (elements.itemCategory) {
        elements.itemCategory.value = item.category;
        updateUnitOptions(item.category);
        populateItemNamesByCategory(item.category);
        
        setTimeout(() => {
            if (elements.itemName) {
                for (let i = 0; i < elements.itemName.options.length; i++) {
                    if (elements.itemName.options[i].value === item.name || elements.itemName.options[i].value === item.itemName) {
                        elements.itemName.selectedIndex = i;
                        break;
                    }
                }
                
                if (!elements.itemName.value && (item.name || item.itemName)) {
                    const option = document.createElement('option');
                    option.value = item.name || item.itemName;
                    option.textContent = item.name || item.itemName;
                    elements.itemName.appendChild(option);
                    elements.itemName.value = item.name || item.itemName;
                }
            }
            
            if (elements.itemUnit) elements.itemUnit.value = item.unit || '';
            if (elements.itemPrice) elements.itemPrice.value = item.price || '';
            if (elements.currentStock) {
                elements.currentStock.value = item.currentStock || 0;
                elements.currentStock.readOnly = true;
                elements.currentStock.style.backgroundColor = '#f0f0f0';
                elements.currentStock.style.borderColor = '#ccc';
                elements.currentStock.style.color = '#666';
                elements.currentStock.title = 'Current stock cannot be changed when editing. Use "Add Stock" to adjust inventory.';
            }
            if (elements.minimumStock) elements.minimumStock.value = item.minStock || 20;
            if (elements.maximumStock) {
                elements.maximumStock.value = item.maxStock || 200;
                elements.maximumStock.readOnly = false;
                elements.maximumStock.style.backgroundColor = '';
                elements.maximumStock.title = '';
            }
            
            if (elements.itemName) elements.itemName.dispatchEvent(new Event('change'));
        }, 150);
    }
    
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
        if (elements.itemName) elements.itemName.focus();
    }, 10);
}

function closeModal() {
    if (elements.itemModal) {
        elements.itemModal.classList.remove('show');
        setTimeout(() => {
            elements.itemModal.style.display = 'none';
            isModalOpen = false;
        }, 150);
    }
}

// ==================== SAVE MENU ITEM ====================
async function handleSaveItem() {
    const formData = {
        itemId: elements.itemId ? elements.itemId.value : '',
        itemName: elements.itemName ? elements.itemName.value : '',
        category: elements.itemCategory ? elements.itemCategory.value : '',
        unit: elements.itemUnit ? elements.itemUnit.value : '',
        currentStock: elements.currentStock ? elements.currentStock.value : '0',
        minStock: elements.minimumStock ? elements.minimumStock.value : '20',
        maxStock: elements.maximumStock ? elements.maximumStock.value : '200',
        price: elements.itemPrice ? elements.itemPrice.value : '0'
    };
    
    console.log('📝 FormData collected:', {
        itemPrice_element_exists: !!elements.itemPrice,
        itemPrice_element_id: elements.itemPrice ? elements.itemPrice.id : 'N/A',
        itemPrice_value: formData.price,
        itemPrice_value_type: typeof formData.price,
        allFormData: formData
    });
    
    if (!formData.itemName || formData.itemName.trim() === '' || formData.itemName === 'Select Product') {
        showToast('Please select a product from the dropdown list', 'error');
        if (elements.itemName) {
            elements.itemName.focus();
            elements.itemName.style.borderColor = '#dc3545';
        }
        return;
    }
    
    if (!formData.category || formData.category.trim() === '' || formData.category === 'Select Category') {
        showToast('Please select a category from the dropdown', 'error');
        if (elements.itemCategory) {
            elements.itemCategory.focus();
            elements.itemCategory.style.borderColor = '#dc3545';
        }
        return;
    }
    
    const price = parseFloat(formData.price);
    console.log('💰 Price validation:', {
        formData_price: formData.price,
        parsed_price: price,
        is_NaN: isNaN(price),
        is_greater_than_zero: price > 0
    });
    
    if (isNaN(price) || price <= 0) {
        showToast('Please enter a valid price (must be a number greater than 0)', 'error');
        if (elements.itemPrice) {
            elements.itemPrice.focus();
            elements.itemPrice.style.borderColor = '#dc3545';
        }
        return;
    }
    
    if (!formData.unit || formData.unit.trim() === '' || formData.unit === 'Select Unit') {
        showToast('Please select a unit from the dropdown', 'error');
        if (elements.itemUnit) {
            elements.itemUnit.focus();
            elements.itemUnit.style.borderColor = '#dc3545';
        }
        return;
    }
    
    const maxStock = parseInt(formData.maxStock);
    const minStock = parseInt(formData.minStock);
    const currentStock = parseInt(formData.currentStock);
    
    if (isNaN(maxStock) || maxStock <= 0) {
        if (elements.maximumStock) elements.maximumStock.focus();
        return;
    }
    
    if (isNaN(minStock) || minStock < 0) {
        showToast('Minimum stock must be 0 or greater', 'error');
        if (elements.minimumStock) elements.minimumStock.focus();
        return;
    }
    
    if (maxStock <= minStock) {
        showToast('Maximum stock must be greater than minimum stock', 'error');
        if (elements.maximumStock) elements.maximumStock.focus();
        return;
    }
    
    if (currentStock > maxStock) {
        showToast('Current stock cannot exceed maximum stock', 'error');
        if (elements.currentStock) elements.currentStock.focus();
        return;
    }
    
    if (currentStock < 0) {
        showToast('Current stock cannot be negative', 'error');
        if (elements.currentStock) elements.currentStock.focus();
        return;
    }
    
    // Check ingredients EVERY TIME before saving (new items AND stock additions)
    console.log(`\n🔍 ========== CHECKING INGREDIENTS FOR: ${formData.itemName} ==========`);
    
    const availabilityCheck = await checkIngredientAvailability(formData.itemName);
    
    // STRICT: If ingredients are missing OR can't be verified, BLOCK creation/stock addition
    if (!availabilityCheck.available) {
        console.warn(`❌ Cannot save product - ingredients missing or insufficient`);
        
        // Check if recipe exists at all
        if (!availabilityCheck.requiredIngredients || availabilityCheck.requiredIngredients.length === 0) {
            // No recipe found - show recipe not found modal
            console.warn(`❌ No recipe defined for "${formData.itemName}"`);
            showRecipeNotFoundModal(formData.itemName);
        } else {
            // Recipe exists but ingredients are missing - show error toast
            console.warn(`❌ Missing ingredients for "${formData.itemName}"`);
            showToast(`❌ Missing required ingredients: ${availabilityCheck.missingIngredients.join(', ')}`, 'error');
        }
        
        return; // Stop the save process - DO NOT CREATE/UPDATE MENU ITEM
    }
    
    // Additional check: Verify that the max stock doesn't exceed what ingredients can support
    const maxPossibleStock = await calculateMaxStockBasedOnIngredients(formData.itemName);
    
    if (maxPossibleStock !== null && maxPossibleStock < maxStock) {
        showToast(
            `❌ Maximum stock (${maxStock}) exceeds what ingredients can support (${maxPossibleStock}). Please reduce max stock.`,
            'error'
        );
        if (elements.maximumStock) {
            elements.maximumStock.value = maxPossibleStock;
            elements.maximumStock.focus();
        }
        return;
    }
    
    console.log(`✅ All ingredients available! Proceeding to save...`);
    
    await saveMenuItem(formData);
}

async function saveMenuItem(itemData) {
    const isEdit = itemData.itemId && itemData.itemId.trim() !== '';
    
    const saveBtn = elements.saveItemBtn;
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;
    
    try {
        const payload = {
            name: itemData.itemName,
            itemName: itemData.itemName,
            category: itemData.category,
            unit: itemData.unit,
            currentStock: Number(itemData.currentStock),
            minStock: Number(itemData.minStock),
            maxStock: Number(itemData.maxStock),
            price: Number(itemData.price),
            itemType: 'finished',
            isActive: true
        };
        
        console.log('📤 Sending payload to server:', {
            currentStock: payload.currentStock,
            minStock: payload.minStock,
            maxStock: payload.maxStock,
            price: payload.price,
            allPayload: payload
        });
        
        let url, method;
        
        if (isEdit) {
            url = `/api/menu/${itemData.itemId}`;
            method = 'PUT';
        } else {
            url = '/api/menu';
            method = 'POST';
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload),
            credentials: 'include'
        });
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Invalid server response format');
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`Server error ${response.status}: ${data.message || 'Unknown error'}`);
        }
        
        if (data.success) {
            const action = isEdit ? 'updated' : 'added';
            console.log(`✅ Product ${action} successfully!`, {
                productName: itemData.itemName,
                currentStock: itemData.currentStock,
                price: itemData.price,
                serverResponse: data
            });
            showToast(`Product ${action} successfully!`, 'success');
            closeModal();
            await fetchMenuItems();
            updateCategoryCounts();
            
            saveInventoryStockValues();
            
        } else {
            throw new Error(data.message || 'Failed to save product');
        }
    } catch (error) {
        console.error('❌ Error saving product:', error);
        showToast(`Error: ${error.message}`, 'error');
    } finally {
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

// ==================== DELETE MENU ITEM ====================
async function deleteMenuItem(itemId, event) {
    // Validate itemId
    if (!itemId || itemId.trim() === '') {
        console.error('❌ Invalid itemId provided');
        showToast('Error: Invalid product ID', 'error');
        return;
    }

    // Find the product in allMenuItems for confirmation
    const productToDelete = allMenuItems.find(item => item._id === itemId);
    if (!productToDelete) {
        console.warn(`⚠️ Product not found in allMenuItems: ${itemId}`);
        showToast('Product not found in local data', 'error');
        return;
    }

    const productName = productToDelete.name || 'Unknown Product';
    
    if (!confirm(`Are you sure you want to delete "${productName}"? This action cannot be undone.`)) {
        return;
    }
    
    console.log(`🗑️ Deleting product: ${productName} (ID: ${itemId})`);
    
    // Get the button element - either from event or by searching the DOM
    let deleteBtn = null;
    if (event && event.target) {
        deleteBtn = event.target;
    } else {
        // Search for the delete button by finding it in the product card
        deleteBtn = document.querySelector(`[onclick*="deleteMenuItem('${itemId}')"]`);
    }
    
    if (!deleteBtn) {
        console.warn('⚠️ Delete button not found, proceeding with deletion');
    } else {
        deleteBtn.style.opacity = '0.5';
        deleteBtn.style.pointerEvents = 'none';
    }
    
    try {
        console.log(`📡 Sending DELETE request to /api/menu/${itemId}`);
        console.log(`📋 Product ID format: ${itemId} (length: ${itemId.length})`);
        
        const response = await fetch(`/api/menu/${itemId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        
        console.log(`📊 Response status: ${response.status}`);
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            console.error(`❌ Invalid response type: ${contentType}`);
            throw new Error('Invalid server response format');
        }
        
        const data = await response.json();
        console.log(`📋 Response data:`, data);
        
        if (!response.ok) {
            console.error(`❌ Server error ${response.status}: ${data.message}`);
            throw new Error(`Server error ${response.status}: ${data.message || 'Unknown error'}`);
        }
        
        if (data.success) {
            console.log(`✅ Product "${productName}" deleted successfully from MongoDB`);
            showToast(`Product "${productName}" deleted successfully!`, 'success');
            
            // Remove from local array
            allMenuItems = allMenuItems.filter(item => item._id !== itemId);
            console.log(`✅ Product removed from allMenuItems (${allMenuItems.length} items remaining)`);
            
            // Update UI
            updateAllUIComponents();
            updateCategoryCounts();
            
            console.log(`✅ Changes saved`);
        } else {
            throw new Error(data.message || 'Delete failed');
        }
    } catch (error) {
        console.error('❌ Error deleting product:', error);
        console.error(`❌ Error details:`, error.stack);
        showToast(`Failed to delete product: ${error.message}`, 'error');
        addNotification(`Delete failed for product: ${productName}`, 'error', itemId);
    } finally {
        if (deleteBtn) {
            deleteBtn.style.opacity = '1';
            deleteBtn.style.pointerEvents = 'auto';
        }
    }
}

// ==================== UPDATE UI COMPONENTS ====================
function updateAllUIComponents() {
    if (currentSection === 'dashboard') {
        updateDashboardStats();
        renderDashboardGrid();
    } else if (currentSection === 'menu') {
        renderMenuGrid();
    }
    updateCategoryCounts();
}

function updateDashboardStats() {
    if (!allMenuItems || !Array.isArray(allMenuItems)) {
        const totalEl = document.getElementById('totalProducts');
        const lowEl = document.getElementById('lowStock');
        const outEl = document.getElementById('outOfStock');
        const inEl = document.getElementById('inStock');
        const valueEl = document.getElementById('menuValue');
        
        if (totalEl) totalEl.textContent = '0';
        if (lowEl) lowEl.textContent = '0';
        if (outEl) outEl.textContent = '0';
        if (inEl) inEl.textContent = '0';
        if (valueEl) valueEl.textContent = '₱0';
        return;
    }
    
    const totalMenuItems = allMenuItems.length;
    
    const lowStockItems = allMenuItems.filter(item => {
        const currentStock = item.currentStock || 0;
        const minStock = item.minStock || 0;
        return currentStock > 0 && currentStock <= minStock;
    }).length;
    
    const outOfStockItems = allMenuItems.filter(item => (item.currentStock || 0) === 0).length;
    const inStockItems = allMenuItems.filter(item => (item.currentStock || 0) > (item.minStock || 0)).length;
    
    const menuValueTotal = allMenuItems.reduce((total, item) => {
        const price = item.price || item.price || 0;
        const stock = item.currentStock || 0;
        return total + (price * stock);
    }, 0);
    
    const totalEl = document.getElementById('totalProducts');
    const lowEl = document.getElementById('lowStock');
    const outEl = document.getElementById('outOfStock');
    const inEl = document.getElementById('inStock');
    const valueEl = document.getElementById('menuValue');
    
    if (totalEl) totalEl.textContent = formatNumber(totalMenuItems);
    if (lowEl) lowEl.textContent = formatNumber(lowStockItems);
    if (outEl) outEl.textContent = formatNumber(outOfStockItems);
    if (inEl) inEl.textContent = formatNumber(inStockItems);
    if (valueEl) valueEl.textContent = formatCurrency(menuValueTotal);
}

function updateCategoryCounts() {
    if (!allMenuItems || !Array.isArray(allMenuItems)) return;
    
    const categories = {
        'all': allMenuItems.length,
        'Rice': allMenuItems.filter(item => item.category === 'Rice').length,
        'Sizzling': allMenuItems.filter(item => item.category === 'Sizzling').length,
        'Party': allMenuItems.filter(item => item.category === 'Party').length,
        'Drink': allMenuItems.filter(item => item.category === 'Drink').length,
        'Cafe': allMenuItems.filter(item => item.category === 'Cafe').length,
        'Milk Tea': allMenuItems.filter(item => item.category === 'Milk Tea').length,
        'Frappe': allMenuItems.filter(item => item.category === 'Frappe').length,
        'Snack & Appetizer': allMenuItems.filter(item => item.category === 'Snack & Appetizer').length,
        'Budget Meals Served with Rice': allMenuItems.filter(item => item.category === 'Budget Meals Served with Rice').length,
        'Specialties': allMenuItems.filter(item => item.category === 'Specialties').length,
    };
    
    if (elements.categoryItems && elements.categoryItems.length > 0) {
        elements.categoryItems.forEach(item => {
            const category = item.getAttribute('data-category');
            const countElement = item.querySelector('.category-count');
            if (countElement) {
                countElement.textContent = categories[category] || 0;
            }
        });
    }
}

function showSection(section) {
    document.querySelectorAll('.section-content').forEach(sec => {
        sec.classList.remove('active-section');
    });
    
    const targetSection = document.getElementById(section);
    if (targetSection) targetSection.classList.add('active-section');
    
    if (elements.navLinks && elements.navLinks.length > 0) {
        elements.navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === section) {
                link.classList.add('active');
            }
        });
    }
    
    currentSection = section;
    
    if (section === 'dashboard') {
        updateDashboardStats();
        renderDashboardGrid();
    } else if (section === 'menu') {
        renderMenuGrid();
    }
}

function filterByCategory(category, fullname) {
    currentCategory = category;
    
    if (elements.categoryItems && elements.categoryItems.length > 0) {
        elements.categoryItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-category') === category) {
                item.classList.add('active');
            }
        });
    }
    
    if (elements.currentCategoryTitle) {
        elements.currentCategoryTitle.textContent = fullname || 'Product Menu';
    }
    
    if (currentSection === 'menu') {
        renderMenuGrid();
    }
}

// ==================== RENDER MENU GRID (FIXED VERSION) ====================
function renderMenuGrid() {
    if (!elements.menuGrid) return;
    
    if (!allMenuItems || !Array.isArray(allMenuItems) || allMenuItems.length === 0) {
        elements.menuGrid.innerHTML = `
            <div class="empty-state">
                <h3>No products found</h3>
                <p>Click "Add New Product" to create your first menu item.</p>
                <button class="btn btn-primary" onclick="openAddModal()">Add New Product</button>
            </div>
        `;
        return;
    }
    
    let filteredItems = [...allMenuItems];
    
    if (currentCategory !== 'all') {
        filteredItems = allMenuItems.filter(item => item.category === currentCategory);
    }
    
    if (filteredItems.length === 0) {
        elements.menuGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon"></div>
                <h3>No products in this category</h3>
                <p>Add products to this category using the "Add New Product" button</p>
                <button class="btn btn-primary" onclick="openAddModal()">Add New Product</button>
            </div>
        `;
        return;
    }
    
    const gridHTML = filteredItems.map(item => {
        const itemName = item.name || item.itemName || 'Unnamed Product';
        // Get price directly from database (field name is 'price')
        const itemPrice = item.price;
        const currentStock = item.currentStock || 0;
        const maxStock = item.maxStock || 100;
        const minStock = item.minStock || 5;
        const unit = item.unit || 'unit';
        const displayUnit = unitDisplayLabels[unit] || unit;
        const itemValue = itemPrice * currentStock;
        const stockPercentage = maxStock > 0 ? ((currentStock / maxStock) * 100) : 0;
        
        let stockClass = '';
        let progressClass = '';
        let statusText = '';
        let statusClass = '';
        
        if (currentStock === 0) {
            stockClass = 'out-of-stock';
            progressClass = 'danger';
            statusText = 'Out of Stock';
            statusClass = 'status-out';
        } else if (currentStock <= minStock) {
            stockClass = 'low-stock';
            progressClass = 'warning';
            statusText = 'Low Stock';
            statusClass = 'status-low';
        } else {
            statusText = 'In Stock';
            statusClass = 'status-available';
        }
        
        // Calculate max allowed to add
        const maxCanAdd = maxStock - currentStock;
        // Determine if button should be disabled
        const isAddDisabled = maxCanAdd <= 0;
        
        return `
        <div class="menu-card ${stockClass}">
            <div class="card-header">
                <h4>${escapeHtml(itemName)}</h4>
                <div class="card-actions">
                    <button class="btn-icon edit" onclick="openEditModal('${item._id}')" title="Edit product">✏️</button>
                    <button class="btn-icon delete" onclick="deleteMenuItem('${item._id}', event)" title="Delete product">🗑️</button>
                </div>
            </div>
            <div class="card-body">
                <div class="card-info"><span class="label">Category:</span> ${getCategoryDisplayName(item.category)}</div>
                <div class="card-info"><span class="label">Selling Price:</span> ₱${itemPrice.toFixed(2)}</div>
                <div class="card-info"><span class="label">Unit:</span> ${displayUnit}</div>
                
                <div style="margin: 12px 0 8px;">
                    <div style="display: flex; justify-content: space-between; font-size: 13px;">
                        <span><span class="label">Current Stock:</span> <strong>${currentStock}</strong> ${displayUnit}</span>
                        <span><span class="label">Max:</span> ${maxStock}</span>
                    </div>
                    <div class="stock-progress">
                        <div class="progress-bar ${progressClass}" style="width: ${Math.min(stockPercentage, 100)}%"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-top: 4px;">
                        <span class="status-badge ${statusClass}">
                            ${statusText}
                        </span>
                        <span><span class="label">Min:</span> ${minStock} ${displayUnit}</span>
                    </div>
                </div>
            </div>
            
            <!-- Quick Add Stock Section - FIXED: Button is NEVER disabled based on stock status -->
            <div class="quick-add-section">
                <div class="quick-add-title">
                    <i class="fas fa-plus-circle" style="color: #28a745;"></i>
                    <span>Add Stock</span>
                </div>
                <div class="quick-add-controls">
                    <input type="number" 
                           id="addStock-${item._id}" 
                           class="quick-add-input" 
                           placeholder="Qty to add"
                           min="1"
                           max="${maxCanAdd}"
                           step="1"
                           value="1"
                           ${isAddDisabled ? 'disabled' : ''}>
                    <button class="quick-add-btn" 
                            onclick="quickAddStock('${item._id}', '${escapeHtml(itemName).replace(/'/g, "\\'")}')"
                            ${isAddDisabled ? 'disabled' : ''}
                            title="${isAddDisabled ? 'Cannot add - Max stock reached' : 'Add stock'}">
                        Add
                    </button>
                </div>
                ${isAddDisabled ?
                    '<div style="font-size: 11px; color: #dc3545; margin-top: 5px;">⚠️ Max stock reached</div>' : 
                    `<div style="font-size: 11px; color: #6c757d; margin-top: 5px;">Can add up to ${maxCanAdd} ${displayUnit}</div>`
                }
            </div>
        </div>
        `;
    }).join('');
    
    elements.menuGrid.innerHTML = gridHTML;
}

// ==================== RENDER DASHBOARD GRID ====================
// Make sure this runs when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing dashboard...');
    
    // Initialize elements
    initializeElements();
    
    // Load dashboard data from MongoDB
    loadDashboardData();
});

// Initialize elements object
function initializeElements() {
    window.elements = {
        dashboardGrid: document.getElementById('dashboard-grid'),
        totalProducts: document.getElementById('total-products'),
        lowStockCount: document.getElementById('low-stock-count'),
        outOfStockCount: document.getElementById('out-of-stock-count'),
        inStockCount: document.getElementById('in-stock-count'),
        totalValue: document.getElementById('total-value')
    };
    console.log('Elements initialized:', elements);
}

async function loadDashboardData() {
    try {
        console.log('Loading dashboard data from MongoDB...');
        
        // Fetch menu items from MongoDB
        await fetchMenuItems();
        
        // Use debounced render to prevent blinking
        debouncedRenderDashboardGrid();
        
        // Update stats from MongoDB data
        await updateInventoryStats();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        if (elements.dashboardGrid) {
            elements.dashboardGrid.innerHTML = `
                <div class="empty-state">
                    <h3>Error Loading Data from Database</h3>
                    <p>Please check your connection and try again.</p>
                </div>
            `;
        }
    }
}

// Debounced version to prevent rapid re-renders
function debouncedRenderDashboardGrid() {
    // Clear any pending render
    if (dashboardRenderTimeout) {
        clearTimeout(dashboardRenderTimeout);
    }
    
    // Set a new debounced render
    dashboardRenderTimeout = setTimeout(() => {
        renderDashboardGrid();
    }, DASHBOARD_RENDER_DEBOUNCE);
}

async function renderDashboardGrid() {
    if (!elements.dashboardGrid) {
        console.error('Dashboard grid element not found');
        return;
    }
    
    // Prevent rapid consecutive renders
    const now = Date.now();
    if (now - lastDashboardRenderTime < DASHBOARD_RENDER_DEBOUNCE) {
        console.log('⏱️ Skipping render - too soon after last render');
        return;
    }
    lastDashboardRenderTime = now;
    
    try {
        // Fetch menu items from MongoDB if not already loaded
        if (!window.allMenuItems || !Array.isArray(window.allMenuItems)) {
            await fetchMenuItems();
        }
        
        // Get pending stock requests from MongoDB
        let pendingStockRequests = [];
        let staffRequestCount = 0;
        
        try {
            console.log('Fetching pending stock requests from MongoDB...');
            const response = await fetch('/api/stock-requests/pending');
            console.log('MongoDB response status:', response.status);
            
            if (response.ok) {
                const result = await response.json();
                console.log('MongoDB stock requests result:', result);
                
                // Handle different response formats
                if (result.success && result.data && Array.isArray(result.data)) {
                    pendingStockRequests = result.data;
                    staffRequestCount = pendingStockRequests.length;
                } else if (result.data && Array.isArray(result.data)) {
                    pendingStockRequests = result.data;
                    staffRequestCount = pendingStockRequests.length;
                } else if (Array.isArray(result)) {
                    pendingStockRequests = result;
                    staffRequestCount = pendingStockRequests.length;
                }
                
                console.log(`Found ${staffRequestCount} pending stock requests in MongoDB`);
                
                // Format the requests for display
                pendingStockRequests = pendingStockRequests.map(req => ({
                    _id: req._id,
                    productName: req.productName || 'Unknown Product',
                    quantity: req.requestedQuantity || req.quantity || 0,
                    unit: req.unit || 'unit',
                    requestedBy: req.requestedBy || req.staffName || 'Staff',
                    staffId: req.staffId || '',
                    timestamp: req.requestDate || req.createdAt ? 
                        new Date(req.requestDate || req.createdAt).toLocaleTimeString() : 
                        new Date().toLocaleTimeString(),
                    date: req.requestDate || req.createdAt ? 
                        new Date(req.requestDate || req.createdAt).toLocaleDateString() : 
                        new Date().toLocaleDateString(),
                    message: `Stock request for ${req.requestedQuantity || req.quantity || 0} ${req.unit || 'unit'} of ${req.productName || 'Unknown Product'}`,
                    status: req.status || 'pending',
                    notes: req.notes || '',
                    productId: req.productId || ''
                }));
                
                // ✅ SHOW MODAL IF THERE ARE PENDING REQUESTS
                if (staffRequestCount > 0) {
                    console.log('📋 Showing stock requests modal with', staffRequestCount, 'requests');
                    showStockRequestsModal(pendingStockRequests);
                }
                
            } else {
                console.error('Failed to fetch pending stock requests from MongoDB:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('MongoDB error response:', errorText);
            }
        } catch (error) {
            console.error('Error fetching stock requests from MongoDB:', error);
        }
        
        // ✅ DASHBOARD GRID NOW SHOWS EMPTY
        elements.dashboardGrid.innerHTML = '';
        console.log('Dashboard grid cleared');
        
    } catch (error) {
        console.error('Error in renderDashboardGrid:', error);
        elements.dashboardGrid.innerHTML = `
            <div class="empty-state">
                <h3>Error Loading Dashboard</h3>
                <p>Please try again later.</p>
            </div>
        `;
    }
}

// ==================== STOCK REQUESTS MODAL ====================
function showStockRequestsModal(pendingRequests) {
    console.log(`📋 Creating stock requests modal with ${pendingRequests.length} requests`);
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('stockRequestsModal');
    
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'stockRequestsModal';
        modal.className = 'modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            z-index: 1002;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.6);
            align-items: center;
            justify-content: center;
            padding: 20px;
        `;
        
        modal.innerHTML = `
            <div class="modal-content" style="
                background: white;
                padding: 0;
                border-radius: 12px;
                max-width: 700px;
                width: 100%;
                max-height: 85vh;
                overflow: hidden;
                box-shadow: 0 10px 50px rgba(0,0,0,0.3);
                display: flex;
                flex-direction: column;
            ">
                <div class="modal-header" style="
                    background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
                    color: white;
                    padding: 20px 25px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: none;
                    flex-shrink: 0;
                ">
                    <h2 style="margin: 0; font-size: 24px; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-inbox"></i> Pending Stock Requests
                    </h2>
                    <button id="closeStockRequestsModal" style="
                        background: none;
                        border: none;
                        font-size: 28px;
                        cursor: pointer;
                        color: white;
                        opacity: 0.9;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    " title="Close modal">&times;</button>
                </div>
                
                <div id="stockRequestsContainer" class="modal-body" style="
                    padding: 20px 25px;
                    max-height: calc(85vh - 130px);
                    overflow-y: auto;
                    flex: 1;
                "></div>
                
                <div class="modal-footer" style="
                    padding: 15px 25px;
                    background: #f5f5f5;
                    border-top: 1px solid #e0e0e0;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    flex-shrink: 0;
                ">
                    <button id="closeStockRequestsBtn" class="btn btn-primary" style="
                        padding: 12px 30px;
                        background: #2196f3;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 16px;
                        font-weight: 500;
                        transition: all 0.3s ease;
                    " onmouseover="this.style.background='#1976d2'" onmouseout="this.style.background='#2196f3'">
                        Close
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    // Populate requests in the modal
    const container = document.getElementById('stockRequestsContainer');
    
    const requestsHTML = pendingRequests.map((request) => {
        const productName = request.productName || 'Unknown Product';
        const quantity = request.quantity || 0;
        const unit = request.unit || 'unit';
        const requestedBy = request.requestedBy || 'Staff';
        const timestamp = request.timestamp || new Date().toLocaleTimeString();
        const date = request.date || new Date().toLocaleDateString();
        const notes = request.notes ? `<div style="font-size: 12px; color: #666; margin-top: 8px;"><i>📝 Notes: ${escapeHtml(request.notes)}</i></div>` : '';
        
        return `
        <div class="stock-request-item" style="
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 15px;
            background: #fafafa;
            border-left: 4px solid #2196f3;
        ">
            <div style="display: flex; align-items: flex-start; gap: 15px;">
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 8px 0; color: #1976d2; font-size: 16px;">
                        ${escapeHtml(productName)}
                        <span style="background: #2196f3; color: white; font-size: 10px; padding: 2px 8px; border-radius: 12px; margin-left: 10px;">PENDING</span>
                    </h4>
                    
                    <div style="font-size: 13px; color: #666; margin-bottom: 10px;">
                        <div><span style="font-weight: 600;">Requested by:</span> ${escapeHtml(requestedBy)}</div>
                        <div><span style="font-weight: 600;">Date & Time:</span> ${date} ${timestamp}</div>
                        <div><span style="font-weight: 600;">Stock Requested:</span> <span style="color: #2196f3; font-weight: 700; font-size: 14px;">${quantity} ${unit}</span></div>
                        <div><span style="font-weight: 600;">Request ID:</span> ${request._id ? request._id.slice(-8) : 'N/A'}</div>
                    </div>
                    
                    ${notes}
                    
                    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px;">
                        <button class="confirm-btn" data-request-id="${request._id}" data-product-name="${escapeHtml(productName)}" data-quantity="${quantity}" style="
                            background: #4caf50;
                            border: none;
                            color: white;
                            padding: 8px 16px;
                            border-radius: 4px;
                            font-size: 13px;
                            cursor: pointer;
                            font-weight: 600;
                            transition: all 0.3s ease;
                        " title="Approve this stock request">
                            ✓ Confirm
                        </button>
                        <button class="reject-btn" data-request-id="${request._id}" style="
                            background: #f44336;
                            border: none;
                            color: white;
                            padding: 8px 16px;
                            border-radius: 4px;
                            font-size: 13px;
                            cursor: pointer;
                            font-weight: 600;
                            transition: all 0.3s ease;
                        " title="Reject this stock request">
                            ✕ Reject
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
    
    container.innerHTML = requestsHTML;
    
    // Attach confirm button listeners
    setTimeout(() => {
        document.querySelectorAll('.confirm-btn').forEach((btn, index) => {
            const requestId = btn.dataset.requestId;
            const productName = btn.dataset.productName;
            const quantity = parseInt(btn.dataset.quantity);
            
            console.log(`Setting up confirm button ${index}:`, {requestId, productName, quantity});
            
            btn.addEventListener('mouseover', function() {
                this.style.background = '#45a049';
            });
            btn.addEventListener('mouseout', function() {
                this.style.background = '#4caf50';
            });
            btn.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('✅ Confirm button clicked:', {requestId, productName, quantity});
                await confirmStockRequest(requestId, productName, quantity);
            });
        });

        // Attach reject button listeners
        document.querySelectorAll('.reject-btn').forEach((btn, index) => {
            const requestId = btn.dataset.requestId;
            console.log(`Setting up reject button ${index}:`, {requestId});
            
            btn.addEventListener('mouseover', function() {
                this.style.background = '#d32f2f';
            });
            btn.addEventListener('mouseout', function() {
                this.style.background = '#f44336';
            });
            btn.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('✕ Reject button clicked:', {requestId});
                await rejectStockRequest(requestId);
            });
        });
    }, 100);
    
    // Attach event listeners
    const closeBtn = document.getElementById('closeStockRequestsBtn');
    const closeModalBtn = document.getElementById('closeStockRequestsModal');
    
    if (closeBtn) {
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        newCloseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            closeStockRequestsModal();
        });
    }
    
    if (closeModalBtn) {
        const newCloseModalBtn = closeModalBtn.cloneNode(true);
        closeModalBtn.parentNode.replaceChild(newCloseModalBtn, closeModalBtn);
        newCloseModalBtn.addEventListener('click', function(e) {
            e.preventDefault();
            closeStockRequestsModal();
        });
    }
    
    // Handle modal background click
    modal.onclick = function(e) {
        if (e.target === modal) {
            closeStockRequestsModal();
        }
    };
    
    // Show modal
    console.log('📋 Showing stock requests modal');
    modal.style.display = 'flex';
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

function closeStockRequestsModal() {
    const modal = document.getElementById('stockRequestsModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 150);
    }
}

// Function to confirm stock request
async function confirmStockRequest(requestId, productName, requestedQuantity) {
    if (!requestId) {
        showToast('❌ Invalid request ID', 'error');
        return;
    }
    
    try {
        console.log('✅ Confirming stock request:', requestId);
        console.log(`📦 Request details:`, {
            productName,
            requestedQuantity,
            requestId
        });
        
        // Simply confirm the request in the database
        const confirmResponse = await fetch(`/api/stock-requests/${requestId}/confirm`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (confirmResponse.ok) {
            const result = await confirmResponse.json();
            console.log('✅ Stock request confirmed:', result);
            
            // Show success message
            showToast(`✅ Stock request for ${productName} confirmed successfully!`, 'success');
            
            // Close the modal immediately
            closeStockRequestsModal();
            // Remove the modal from DOM completely
            const modal = document.getElementById('stockRequestsModal');
            if (modal) {
                modal.remove();
            }
            
            // Reload pending requests to show updated list
            console.log('🔄 Reloading pending stock requests...');
            try {
                const pendingResponse = await fetch('/api/stock-requests/pending', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                });
                
                if (pendingResponse.ok) {
                    const pendingData = await pendingResponse.json();
                    const pendingRequests = Array.isArray(pendingData) ? pendingData : pendingData.data || [];
                    console.log(`📋 Fetched ${pendingRequests.length} pending requests`);
                    
                    // If there are more pending requests, show the modal again
                    if (pendingRequests.length > 0) {
                        console.log('📋 Showing updated pending requests modal');
                        showStockRequestsModal(pendingRequests);
                    }
                }
            } catch (pendingError) {
                console.warn('⚠️ Error fetching pending requests:', pendingError.message);
            }
            
            // Force refresh dashboard
            lastDashboardLoadTime = 0;
            renderDashboardGrid();
        } else {
            const error = await confirmResponse.text();
            throw new Error(`Failed to confirm: ${error}`);
        }
    } catch (error) {
        console.error('❌ Error confirming stock request:', error);
        showToast(`❌ Error: ${error.message}`, 'error');
    }
}

// Function to reject stock request
async function rejectStockRequest(requestId) {
    if (!requestId) {
        showToast('❌ Invalid request ID', 'error');
        return;
    }
    
    try {
        console.log('❌ Rejecting stock request:', requestId);
        
        const response = await fetch(`/api/stock-requests/${requestId}/reject`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('❌ Stock request rejected:', result);
            
            // Show success message
            showToast('✅ Stock request rejected successfully.', 'success');
            
            // Close the modal immediately
            closeStockRequestsModal();
            // Remove the modal from DOM completely
            const modal = document.getElementById('stockRequestsModal');
            if (modal) {
                modal.remove();
            }
            
            // Reload pending requests to show updated list
            console.log('🔄 Reloading pending stock requests...');
            try {
                const pendingResponse = await fetch('/api/stock-requests/pending', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                });
                
                if (pendingResponse.ok) {
                    const pendingData = await pendingResponse.json();
                    const pendingRequests = Array.isArray(pendingData) ? pendingData : pendingData.data || [];
                    console.log(`📋 Fetched ${pendingRequests.length} pending requests`);
                    
                    // If there are more pending requests, show the modal again
                    if (pendingRequests.length > 0) {
                        console.log('📋 Showing updated pending requests modal');
                        showStockRequestsModal(pendingRequests);
                    }
                }
            } catch (pendingError) {
                console.warn('⚠️ Error fetching pending requests:', pendingError.message);
            }
            
            // Force refresh
            lastDashboardLoadTime = 0;
            renderDashboardGrid();
        } else {
            const error = await response.text();
            throw new Error(`Failed to reject: ${error}`);
        }
    } catch (error) {
        console.error('❌ Error rejecting stock request:', error);
        showToast(`❌ Error: ${error.message}`, 'error');
    }
}

// Function to show notifications
function showNotification(message, type = 'info') {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.custom-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `custom-notification notification-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        border-radius: 4px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        z-index: 9999;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: slideIn 0.3s ease;
    `;
    
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 18px;
            padding: 0 5px;
        ">×</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

// Function to update inventory stats
async function updateInventoryStats() {
    try {
        if (!window.allMenuItems) return;
        
        const totalProducts = window.allMenuItems.length;
        const lowStock = window.allMenuItems.filter(item => {
            const currentStock = item.currentStock || 0;
            const minStock = item.minStock || 0;
            return currentStock <= minStock && currentStock > 0;
        }).length;
        
        const outOfStock = window.allMenuItems.filter(item => {
            const currentStock = item.currentStock || 0;
            return currentStock === 0;
        }).length;
        
        const inStock = window.allMenuItems.filter(item => {
            const currentStock = item.currentStock || 0;
            return currentStock > 0;
        }).length;
        
        const totalValue = window.allMenuItems.reduce((sum, item) => {
            return sum + ((item.price || 0) * (item.currentStock || 0));
        }, 0);
        
        // Update DOM elements
        if (elements.totalProducts) elements.totalProducts.textContent = totalProducts;
        if (elements.lowStockCount) elements.lowStockCount.textContent = lowStock;
        if (elements.outOfStockCount) elements.outOfStockCount.textContent = outOfStock;
        if (elements.inStockCount) elements.inStockCount.textContent = inStock;
        if (elements.totalValue) elements.totalValue.textContent = `₱${totalValue.toFixed(2)}`;
        
    } catch (error) {
        console.error('Error updating inventory stats:', error);
    }
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// ==================== ADD STOCK CONFIRMATION MODAL ====================
function showAddStockConfirmModal(itemName, currentStock, newStock, unit, quantity, onConfirm) {
    // Remove any existing modal
    const existingModal = document.getElementById('addStockConfirmModal');
    if (existingModal) existingModal.remove();
    
    // Create modal overlay
    const modal = document.createElement('div');
    modal.id = 'addStockConfirmModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 40px;
        border-radius: 12px;
        max-width: 450px;
        width: 90%;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        position: relative;
        animation: slideUp 0.3s ease;
    `;
    
    // Add animation styles
    if (!document.getElementById('addStockModalStyles')) {
        const style = document.createElement('style');
        style.id = 'addStockModalStyles';
        style.textContent = `
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Close button (X)
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
        position: absolute;
        top: 15px;
        right: 15px;
        background: none;
        border: none;
        font-size: 28px;
        color: #999;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
    `;
    closeBtn.onmouseover = () => closeBtn.style.color = '#333';
    closeBtn.onmouseout = () => closeBtn.style.color = '#999';
    modalContent.appendChild(closeBtn);
    
    modalContent.innerHTML += `
        <div style="text-align: center; margin-top: 10px;">
            <div style="font-size: 48px; margin-bottom: 20px;">📦</div>
            <h2 style="color: #333; margin: 0 0 15px 0; font-size: 22px;">Add Stock</h2>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px; text-align: left;">
                <p style="color: #666; margin: 8px 0; font-size: 14px;">
                    <strong>Product:</strong> ${escapeHtml(itemName)}
                </p>
                <p style="color: #666; margin: 8px 0; font-size: 14px;">
                    <strong>Quantity to Add:</strong> ${quantity} ${unit}
                </p>
                <p style="color: #666; margin: 8px 0; font-size: 14px;">
                    <strong>Current Stock:</strong> ${currentStock} ${unit}
                </p>
                <p style="color: #27ae60; margin: 8px 0; font-size: 14px; font-weight: 600;">
                    <strong>New Stock:</strong> ${newStock} ${unit}
                </p>
            </div>
            
            <p style="color: #666; margin-bottom: 30px; font-size: 14px;">
                Are you sure you want to add this stock?
            </p>
            
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button id="rejectStockBtn" style="
                    flex: 1;
                    padding: 12px 20px;
                    background: #f0f0f0;
                    color: #666;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 600;
                    transition: all 0.2s ease;
                " onmouseover="this.style.background='#e0e0e0'" onmouseout="this.style.background='#f0f0f0'">
                    Reject
                </button>
                <button id="confirmStockBtn" style="
                    flex: 1;
                    padding: 12px 20px;
                    background: #27ae60;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 600;
                    transition: all 0.2s ease;
                " onmouseover="this.style.background='#229954'" onmouseout="this.style.background='#27ae60'">
                    Confirm
                </button>
            </div>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Event listeners
    const confirmBtn = document.getElementById('confirmStockBtn');
    const rejectBtn = document.getElementById('rejectStockBtn');
    
    const closeModal = () => {
        modal.remove();
    };
    
    confirmBtn.addEventListener('click', () => {
        closeModal();
        onConfirm();
    });
    
    rejectBtn.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);
    
    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Close on Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            document.removeEventListener('keydown', handleEscape);
            closeModal();
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// ==================== QUICK ADD STOCK FUNCTION (FIXED VERSION) ====================
async function quickAddStock(itemId, itemName) {
    console.log(`🚀 quickAddStock called for: ${itemName} (${itemId})`);
    
    let inputElement = document.getElementById(`addStock-${itemId}`);
    
    if (!inputElement) {
        console.error(`❌ Input element not found for ID: addStock-${itemId}`);
        showToast('❌ Input element not found', 'error');
        return;
    }
    
    const quantityToAdd = parseInt(inputElement.value) || 0;
    console.log(`📊 Quantity to add: ${quantityToAdd}`);
    
    if (quantityToAdd <= 0) {
        showToast('❌ Please enter a quantity greater than 0', 'error');
        return;
    }
    
    const product = allMenuItems.find(p => p._id === itemId);
    if (!product) {
        console.error(`❌ Product not found with ID: ${itemId}`);
        showToast(`❌ Product "${itemName}" not found`, 'error');
        return;
    }
    
    console.log(`📦 Product found:`, {
        name: product.name || product.itemName,
        currentStock: product.currentStock,
        maxStock: product.maxStock,
        unit: product.unit
    });
    
    const currentStock = product.currentStock || 0;
    const maxStock = product.maxStock || 100;
    const newStock = currentStock + quantityToAdd;
    const unit = product.unit || 'unit';
    
    // Check if would exceed max stock
    if (newStock > maxStock) {
        showToast(`❌ Would exceed max stock (${maxStock}). Current: ${currentStock}, Can add: ${maxStock - currentStock}`, 'warning');
        return;
    }
    
    // ============= MANDATORY GLOBAL INGREDIENT CHECK =============
    // APPLY TO ALL PRODUCTS - Block if ANY ingredient is out of stock
    try {
        console.log(`🔍 Performing GLOBAL ingredient availability check for "${itemName}"...`);
        
        // Use the existing checkIngredientAvailability function which handles:
        // 1. Local recipe mapping
        // 2. Server-side recipe mapping
        // 3. MongoDB inventory validation
        const availabilityCheck = await checkIngredientAvailability(product.name || product.itemName);
        
        console.log(`📊 Availability check result:`, availabilityCheck);
        
        if (!availabilityCheck.available) {
            // BLOCK: Product has missing or out-of-stock ingredients
            const missingList = availabilityCheck.missingIngredients;
            console.warn(`🚫 BLOCKING stock addition - Missing/Out-of-stock ingredients:\n  • ${missingList.join('\n  • ')}`);
            
            // Show the missing ingredients modal with the missing list
            showMissingIngredientsModal(itemName, missingList);
            return; // STOP HERE - DO NOT ADD STOCK
        }
        
        // WARN if there are low stock ingredients
        if (availabilityCheck.availableIngredients && availabilityCheck.availableIngredients.length > 0) {
            console.log(`✅ All required ingredients are available`);
        }
        
        console.log(`✅ Global ingredient check PASSED - proceeding with stock addition`);
        
    } catch (error) {
        console.error('❌ Error during global ingredient check:', error);
        // STRICT: If there's an error checking ingredients, BLOCK the addition for safety
        console.warn(`🚫 BLOCKING: Error verifying ingredients: ${error.message}`);
        showToast(`❌ Cannot verify ingredients. Stock addition blocked for safety. Error: ${error.message}`, 'error', 10000);
        return; // BLOCK on error - don't risk it
    }
    // ============= END OF INGREDIENT CHECK =============
    
    // ✅ PROCEED WITH STOCK ADDITION - Show modal confirmation
    showAddStockConfirmModal(itemName, currentStock, newStock, unit, quantityToAdd, async () => {
        // On confirm callback
        try {
            console.log(`📦 ADDING STOCK: ${quantityToAdd} ${unit} to "${itemName}"`);
            
            const response = await fetch(`/api/menu/${itemId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    name: product.name || product.itemName,
                    itemName: product.name || product.itemName,
                    category: product.category,
                    price: product.price,
                    unit: product.unit,
                    currentStock: newStock,
                    minStock: product.minStock,
                    maxStock: product.maxStock,
                    image: product.image || 'default_food.jpg'
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Server error ${response.status}`);
            }
            
            const responseData = await response.json();
            console.log(`✅ MongoDB UPDATED: ${itemName} stock is now ${newStock}`);
            
            // Update local product
            product.currentStock = newStock;
            
            // Reset input
            inputElement.value = '1';
            inputElement.max = maxStock - newStock;
            
            // Show notification (only once - no duplicate)
            addNotification(
                `Added ${quantityToAdd} ${unit} to "${itemName}" (New: ${newStock} ${unit})`,
                'success',
                itemName
            );
            
            // Refresh UI
            renderMenuGrid();
            updateDashboardStats();
            await fetchMenuItems();
            
            console.log(`✅ Stock added and saved to MongoDB`);
            
        } catch (error) {
            console.error('❌ Error adding stock:', error);
            showToast(`❌ Error: ${error.message}`, 'error');
        }
    })
}

// ==================== QUICK ADD STOCK FOR REQUEST ====================
function quickAddStockForRequest(productName, quantity, unit) {
    // Find the product in allMenuItems
    const product = allMenuItems.find(p => 
        (p.name && p.name.toLowerCase().includes(productName.toLowerCase())) ||
        (p.itemName && p.itemName.toLowerCase().includes(productName.toLowerCase()))
    );
    
    if (!product) {
        showToast(`❌ Product "${productName}" not found in menu`, 'error');
        return;
    }
    
    // Navigate to menu section and open quick add for this product
    showSection('menu');
    
    // Filter to show the category containing this product
    if (product.category) {
        currentCategory = product.category;
        filterByCategory(product.category, getCategoryDisplayName(product.category));
    }
    
    // Wait a bit for the menu to render, then set the quick add value
    setTimeout(() => {
        const inputElement = document.getElementById(`addStock-${product._id}`);
        if (inputElement) {
            inputElement.value = quantity;
            inputElement.focus();
            inputElement.style.borderColor = '#28a745';
        }
    }, 300);
}

// ==================== AUTO ADD MISSING SODA ITEMS ====================
async function autoAddMissingSodaItem(ingredientName) {
    // Check if this is a soda item that should be auto-added
    const sodaPatterns = [
        /^soda.*1\.5l.*coke$/i,
        /^soda.*1\.5l.*coke zero$/i,
        /^soda.*1\.5l.*sprite$/i,
        /^soda.*1\.5l.*royal$/i,
        /^soda.*\(mismo\).*coke$/i,
        /^soda.*\(mismo\).*sprite$/i,
        /^soda.*\(mismo\).*royal$/i
    ];
    
    const isSoda = sodaPatterns.some(pattern => pattern.test(ingredientName));
    
    if (!isSoda) {
        return false; // Not a soda, don't auto-add
    }
    
    console.log(`🧊 Auto-adding missing soda item: ${ingredientName}`);
    
    // Determine soda details based on name
    let sodaData = {
        itemName: ingredientName,
        category: 'Beverages',
        currentStock: 50,
        minStock: 10,
        maxStock: 100,
        unit: 'bottles',
        description: `${ingredientName} bottle`
    };
    
    // Adjust for 1.5L vs Mismo
    if (ingredientName.toLowerCase().includes('1.5l')) {
        sodaData.unit = 'bottles';
        sodaData.description = `1.5L ${ingredientName.replace('Soda 1.5L ', '')} bottle`;
    } else if (ingredientName.toLowerCase().includes('(mismo)')) {
        sodaData.unit = 'bottles';
        sodaData.currentStock = 100;
        sodaData.maxStock = 200;
        sodaData.description = `${ingredientName} bottle`;
    }
    
    try {
        const response = await fetch('/api/inventory/add-item', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(sodaData)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log(`✅ Successfully auto-added soda: ${ingredientName}`, result);
            
            // Show notification
            addNotification(`Auto-added missing soda: ${ingredientName}`, 'success');
            
            return true;
        } else {
            const error = await response.json();
            console.error(`❌ Failed to auto-add soda ${ingredientName}:`, error);
            return false;
        }
    } catch (error) {
        console.error(`❌ Error auto-adding soda ${ingredientName}:`, error);
        return false;
    }
}

// ==================== LOGOUT ====================
function handleLogout() {
    // Show logout confirmation modal
    showLogoutConfirmation(() => {
        // On confirm
        fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        })
        .then(() => { window.location.href = '/login'; })
        .catch(error => {
            console.error('Logout error:', error);
            window.location.href = '/login';
        });
    }, () => {
        // On cancel
        console.log('🔙 Logout cancelled');
    });
}

// ==================== GLOBAL EXPORTS ====================
window.handleLogout = handleLogout;
window.openAddModal = openAddModal;
window.openEditModal = openEditModal;
window.deleteMenuItem = deleteMenuItem;
window.toggleNotificationModal = toggleNotificationModal;
window.clearAllNotifications = clearAllNotifications;
window.dismissNotification = dismissNotification;
window.quickAddStock = quickAddStock;
window.quickAddStockForRequest = quickAddStockForRequest;
window.fulfillStockRequest = fulfillStockRequest;
window.ingredientInventory = ingredientInventory;
window.servingwareInventory = servingwareInventory;
window.closeMissingIngredientsModal = closeMissingIngredientsModal;
window.checkIngredientAvailability = checkIngredientAvailability;
window.showMissingIngredientsModal = showMissingIngredientsModal;
window.showProductMissingIngredientsModal = showProductMissingIngredientsModal;
window.showAllProductsMissingIngredientsModal = showAllProductsMissingIngredientsModal;
window.resetInventoryToZero = resetInventoryToZero;
window.fetchInventoryFromMongoDB = fetchInventoryFromMongoDB;
window.debouncedRenderDashboardGrid = debouncedRenderDashboardGrid;
window.renderDashboardGrid = renderDashboardGrid;
window.loadDashboardData = loadDashboardData;
window.confirmStockRequest = confirmStockRequest;
window.rejectStockRequest = rejectStockRequest;
window.showStockRequestsModal = showStockRequestsModal;
window.closeStockRequestsModal = closeStockRequestsModal;

console.log('✅ Menu Management System loaded with integrated stock management!');
console.log('📦 Products appear immediately in Product Menu with quick-add stock controls');
console.log('🚫 Products cannot be added unless all ingredients are available in inventory');
console.log('📡 Using actual inventory from MongoDB - No fallback data');
console.log('🔔 Stock request notifications from staff appear in modal popup');
console.log('⏱️ Dashboard render optimized with debouncing to prevent blinking');
console.log('🧮 Max stock is auto-calculated based on current ingredient inventory');
console.log('📋 Stock requests modal displays all pending requests with confirm/reject buttons'); 