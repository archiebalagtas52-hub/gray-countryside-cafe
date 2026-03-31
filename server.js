import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from 'url';
import http from 'http';
import mongoose from "mongoose";
import { connectDB } from "./config/database.js";
import { WebSocketServer } from "ws";

import User from "./models/User.js";
import Category from "./models/categoryModel.js";
import InventoryItem from "./models/InventoryItem.js";
import Product from "./models/Product.js";
import Order from "./models/Order.js";
import MenuItem from "./models/Menuitem.js";
import Customer from "./models/Customer.js";
import StockRequest from "./models/StockRequest.js";
import Stats from "./models/Stats.js";
import StockDeduction from "./models/StockDeduction.js";
import StaffAssignment from "./models/staffassignModel.js";
import StockTransfer from "./models/StocktransferModel.js";
import Settings from "./models/SettingsModel.js";
import { SalesData } from "./models/salesdata.js";

import stockTransferRoute from "./routes/stockTransferroute.js";
import staffRoutes from "./routes/staffroute.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import mongoDBInventoryService from "./services/mongoDBInventoryService.js";
import revenueBreakdownService from "./services/revenueBreakdownService.js";

dotenv.config();

const BUSINESS_INFO = {
    name: "G'RAY COUNTRYSIDE CAFÉ",
    address: "IPO Road, Barangay Minuyan Proper",
    city: "City of San Jose Del Monte, Bulacan",
    receiptHeader: "BESTLINK COLLEGE OF THE PHILIPPINES",
    contact: "(+63) 123-456-7890",
    vatRegNo: "VAT-Reg-TIN: 123-456-789-000",
    permitNo: "BTRCP-2024-00123"
};

const verifyToken = (req, res, next) => {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ 
                success: false, 
                message: "Access denied. No token provided." 
            });
        }
        return res.redirect('/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ 
                success: false, 
                message: "Invalid token" 
            });
        }
        res.clearCookie("token");
        return res.redirect('/login');
    }
};

const verifyAdmin = (req, res, next) => {
    if (!req.user) {
        return res.redirect('/login');
    }
    
    if (req.user.role !== 'admin') {
        if (req.path.startsWith('/api/')) {
            return res.status(403).json({ 
                success: false, 
                message: "Access denied. Admin privileges required." 
            });
        }
        return res.redirect('/staffdashboard');
    }
    next();
};

const CONFIG = {
    LOW_STOCK_THRESHOLD: 5,
    JWT_EXPIRY: "365d",
    SERVER_PORT: process.env.PORT || 5050,
    REQUIRED_ENV_VARS: ['JWT_SECRET', 'MONGODB_URI'],
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_TIME: 5 * 60 * 1000 // 5 minutes in milliseconds
};

// ==================== 🔐 LOGIN ATTEMPT TRACKING ====================
const loginAttempts = new Map(); // { username: { attempts: number, lockedUntil: timestamp } }

function getLoginAttempts(username) {
    return loginAttempts.get(username) || { attempts: 0, lockedUntil: null };
}

function recordFailedAttempt(username) {
    const current = getLoginAttempts(username);
    current.attempts += 1;
    
    // Lock account after max attempts
    if (current.attempts >= CONFIG.MAX_LOGIN_ATTEMPTS) {
        current.lockedUntil = Date.now() + CONFIG.LOCKOUT_TIME;
        console.log(`🔒 Account locked for ${username} until ${new Date(current.lockedUntil)}`);
    }
    
    loginAttempts.set(username, current);
}

function resetLoginAttempts(username) {
    loginAttempts.delete(username);
    console.log(`✅ Login attempts reset for ${username}`);
}

function isAccountLocked(username) {
    const current = getLoginAttempts(username);
    
    if (!current.lockedUntil) {
        return false;
    }
    
    // Check if lockout time has expired
    if (Date.now() > current.lockedUntil) {
        resetLoginAttempts(username);
        return false;
    }
    
    return true;
}

function getRemainingLockoutTime(username) {
    const current = getLoginAttempts(username);
    if (!current.lockedUntil) return 0;
    
    const remaining = current.lockedUntil - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

CONFIG.REQUIRED_ENV_VARS.forEach(varName => {
    if (!process.env[varName]) {
        console.error(`❌ ERROR: ${varName} not defined in .env file`);
        process.exit(1);
    }
});

const recipeMapping = {
    // ================ MEAT & POULTRY ================
    'Pork': [
        'Korean Spicy Bulgogi (Pork)',
        'Korean Salt and Pepper (Pork)',
        'Crispy Pork Lechon Kawali',
        'Pork Shanghai',
        'Sinigang (Pork)',
        'Sizzling Pork Sisig',
        'Sizzling Liempo',
        'Sizzling Porkchop',
        'Special Bulalo (good for 2-3 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)'
    ],
    'Pork belly': [
        'Crispy Pork Lechon Kawali',
        'Sizzling Liempo'
    ],
    'Pork Chop': [
        'Sizzling Porkchop'
    ],
    'Ground Pork': [
        'Pork Shanghai',
        'Lumpian Shanghai (M)',
        'Lumpian Shanghai (L)',
        'Lumpian Shanghai (M)',
        'Spaghetti',
        'Spaghetti (S)',
        'Spaghetti (M)',
        'Spaghetti (L)'
    ],
    'Chicken': [
        'Buttered Honey Chicken',
        'Buttered Spicy Chicken',
        'Chicken Adobo',
        'Fried Chicken',
        'Sizzling Fried Chicken',
        'Clubhouse Sandwich',
        'Pancit Bihon (S)',
        'Pancit Bihon (M)',
        'Pancit Bihon (L)',
        'Pancit Canton (S)',
        'Pancit Canton (M)',
        'Pancit Canton (L)'
    ],
    'Fried chicken': [
        'Fried Chicken',
        'Sizzling Fried Chicken',
        'Clubhouse Sandwich'
    ],
    'Chicken Wings': [
        'Chicken Buffalo Wings'
    ],
    'Cream dory': [
        'Cream Dory Fish Fillet',
        'Fish and Fries'
    ],
    'Fish fillet': [
        'Fish and Fries',
        'Cream Dory Fish Fillet'
    ],
    'Shrimp': [
        'Sinigang (Shrimp)',
        'Buttered Shrimp'
    ],
    'Bagnet': [
        'Paknet (Pakbet w/ Bagnet)'
    ],
    'Tinapa': [
        'Tinapa Rice',
        'Tinapa Rice (Small)',
        'Tinapa Rice (Medium)',
        'Tinapa Rice (Large)'
    ],
    'Tuyo': [
        'Tuyo Pesto',
        'Tuyo Pesto (Small)',
        'Tuyo Pesto (Medium)',
        'Tuyo Pesto (Large)'
    ],
    'Beef Shank': [
        'Special Bulalo',
        'Special Bulalo (good for 2-3 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)'
    ],
    'Bacon': [
        'Creamy Carbonara'
    ],

    // ================ FRESH PRODUCE ================
    'Garlic': [
        'Korean Spicy Bulgogi (Pork)',
        'Korean Salt and Pepper (Pork)',
        'Crispy Pork Lechon Kawali',
        'Sizzling Pork Sisig',
        'Sizzling Liempo',
        'Sizzling Porkchop',
        'Sizzling Fried Chicken',
        'Pork Shanghai',
        'Chicken Adobo',
        'Fried Chicken',
        'Cream Dory Fish Fillet',
        'Buttered Honey Chicken',
        'Buttered Spicy Chicken',
        'Sinigang (Pork)',
        'Sinigang (Shrimp)',
        'Paknet (Pakbet w/ Bagnet)',
        'Buttered Shrimp',
        'Special Bulalo (good for 2-3 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)',
        'Pancit Bihon (S)',
        'Pancit Bihon (M)',
        'Pancit Bihon (L)',
        'Pancit Canton (S)',
        'Pancit Canton (M)',
        'Pancit Canton (L)',
        'Spaghetti (S)',
        'Spaghetti (M)',
        'Spaghetti (L)',
        'Creamy Carbonara (S)',
        'Creamy Carbonara (M)',
        'Creamy Carbonara (L)',
        'Fried Rice (S)',
        'Fried Rice (M)',
        'Fried Rice (L)',
        'Tinapa Rice',
        'Tuyo Pesto (S)',
        'Tuyo Pesto (M)',
        'Tuyo Pesto (L)',
        'Cheesy Nachos',
        'Nachos Supreme',
        'French Fries',
        'Clubhouse Sandwich',
        'Fish and Fries',
        'Cheesy Dynamite Lumpia',
        'Lumpia Shanghai (S)',
        'Lumpia Shanghai (M)',    
        'Lumpia Shanghai (L)'
    ],

    'Onion': [
        'Korean Spicy Bulgogi (Pork)',
        'Korean Salt and Pepper (Pork)',
        'Crispy Pork Lechon Kawali',
        'Sizzling Pork Sisig',
        'Pork Shanghai',
        'Chicken Adobo',
        'Sinigang (Pork)',
        'Sinigang (Shrimp)',
        'Paknet (Pakbet w/ Bagnet)',
        'Special Bulalo (good for 2-3 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)',
        'Pancit Bihon (S)',
        'Pancit Bihon (M)',
        'Pancit Bihon (L)',
        'Pancit Canton (S)',
        'Pancit Canton (M)',
        'Pancit Canton (L)',
        'Spaghetti (S)',
        'Spaghetti (M)',
        'Spaghetti (L)',
        'Fried Rice (S)',
        'Fried Rice (M)',
        'Fried Rice (L)',
        'Cheesy Nachos',
        'Nachos Supreme',
        'Clubhouse Sandwich',
        'Lumpia Shanghai (S)',
        'Lumpia Shanghai (M)',   
        'Lumpia Shanghai (L)',
    ],
    'Chili': [
        'Korean Spicy Bulgogi (Pork)',
        'Korean Salt and Pepper (Pork)',
        'Sizzling Pork Sisig',
        'Sinigang (Pork)',
        'Sinigang (Shrimp)',
        'Cheesy Dynamite Lumpia'
    ],
    'Chili flakes': [
        'Buttered Spicy Chicken',
        'Korean Spicy Bulgogi (Pork)',
        'Korean Salt and Pepper (Pork)'
    ],
    'Calamansi': [
        'Sizzling Pork Sisig',
        'Sinigang (Pork)',
        'Sinigang (Shrimp)',
        'Buttered Shrimp',
        'Cucumber Lemonade',
        'Blue Lemonade',
        'Calamansi Juice (Glass)',
        'Calamansi Juice (Pitcher)'
    ],
    'Lemon': [
        'Cucumber Lemonade',
        'Cucumber Lemonade (Glass)',
        'Cucumber Lemonade (Pitcher)',
        'Blue Lemonade',
        'Blue Lemonade (Glass)',
        'Blue Lemonade (Pitcher)',
        'Hot Ceylon Tea Lemon'
    ],
    'Lemon juice': [
        'Cucumber Lemonade (Glass)',
        'Cucumber Lemonade (Pitcher)',
        'Blue Lemonade (Glass)',
        'Blue Lemonade (Pitcher)',
        'Tuyo Pesto (S)',
        'Tuyo Pesto (M)',
        'Tuyo Pesto (L)'
    ],
    'Tomato': [
        'Chicken Adobo',
        'Sinigang (Pork)',
        'Sinigang (Shrimp)',
        'Paknet (Pakbet w/ Bagnet)',
        'Spaghetti (S)',
        'Spaghetti (M)',
        'Spaghetti (L)',
        'Nachos Supreme',
        'Clubhouse Sandwich'
    ],
    'Tomato sauce': [
        'Spaghetti (S)',
        'Spaghetti (M)',
        'Spaghetti (L)'
    ],
    'Cucumber': [
        'Cucumber Lemonade',
        'Cucumber Lemonade (Glass)',
        'Cucumber Lemonade (Pitcher)',
        'Paknet (Pakbet w/ Bagnet)'
    ],
    'Corn': [
        'Special Bulalo',
        'Special Bulalo (good for 2-3 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)',
        'Paknet (Pakbet w/ Bagnet)'
    ],
    'Corn on the Cob': [
        'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 3-4 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 1-2 Persons)'
    ],
    'Potato': [
        'Special Bulalo (good for 2-3 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)',
        'Paknet (Pakbet w/ Bagnet)',
        'French Fries',
        'Fish and Fries'
    ],
    'Carrot': [
        'Pork Shanghai',
        'Special Bulalo (good for 2-3 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)',
        'Paknet (Pakbet w/ Bagnet)',
        'Pancit Bihon (S)',
        'Pancit Bihon (M)',
        'Pancit Bihon (L)',
        'Pancit Canton (S)',
        'Pancit Canton (M)',
        'Pancit Canton (L)',
        'Lumpia Shanghai (S)',
        'Lumpia Shanghai (M)',
        'Lumpia Shanghai (L)'
    ],

    'Cabbage': [
        'Special Bulalo (good for 2-3 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)',
        'Pancit Bihon (S)',
        'Pancit Bihon (M)',
        'Pancit Bihon (L)',
        'Pancit Canton (S)',
        'Pancit Canton (M)',
        'Pancit Canton (L)'
    ],
    'Kangkong': [
        'Sinigang (Pork)',
        'Sinigang (Shrimp)'
    ],
    'Radish': [
        'Sinigang (Pork)'
    ],
    'Eggplant': [
        'Paknet (Pakbet w/ Bagnet)'
    ],
    'Squash': [
        'Paknet (Pakbet w/ Bagnet)'
    ],
    'Okra': [
        'Paknet (Pakbet w/ Bagnet)'
    ],
    'Ampalaya': [
        'Paknet (Pakbet w/ Bagnet)'
    ],
    'Pork hocks': [
        'Kare-Kare (S)',
        'Kare-Kare (M)',
        'Kare-Kare (L)'
    ],
    'Green Beans': [
        'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)'
    ],
    'Pechay': [
        'Special Bulalo (good for 2-3 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)'
    ],
    'Siling green': [
        'Cheesy Dynamite Lumpia'
    ],
    'Lettuce': [
        'Clubhouse Sandwich'
    ],

    // ================ DAIRY & EGGS ================
    'Egg': [
        'Sizzling Pork Sisig',
        'Pork Shanghai',
        'Fried Chicken',
        'Cream Dory Fish Fillet',
        'Fried Rice (S)',
        'Fried Rice (M)',
        'Fried Rice (L)',
        'Tinapa Rice',
        'Clubhouse Sandwich',
        'Fish and Fries',
        'Lumpia Shanghai (S)',
        'Lumpia Shanghai (M)',
        'Lumpia Shanghai (L)',
       ],
    'Butter': [
        'Buttered Honey Chicken',
        'Buttered Spicy Chicken',
        'Buttered Shrimp',
        'Cream Dory Fish Fillet',
        'Creamy Carbonara (S)',
        'Creamy Carbonara (M)',
        'Creamy Carbonara (L)',
        'Chicken Buffalo Wings (S)',
        'Chicken Buffalo Wings (M)',
        'Chicken Buffalo Wings (L)'
    ],
    'Mayonnaise': [
        'Sizzling Pork Sisig',
        'Clubhouse Sandwich'
    ],
    'Cream': [
        'Cream Dory Fish Fillet',
        'Creamy Carbonara (S)',
        'Creamy Carbonara (M)',
        'Creamy Carbonara (L)'
    ],
    
    
    'Milk': [
        'Café Latte (Tall)',
        'Café Latte (Grande)',
        'Caramel Macchiato (Tall)',
        'Caramel Macchiato (Grande)',
        'Iced Café Latte (Tall)',
        'Iced Café Latte (Grande)',
        'Iced Mocha Latte (Tall)',
        'Iced Mocha Latte (Grande)',
        'Iced Vanilla Latte (Tall)',
        'Iced Vanilla Latte (Grande)',
        'Iced Caramel Macchiato (Tall)',
        'Iced Caramel Macchiato (Grande)',
        'Iced White Chocolate (Tall)',
        'Iced White Chocolate (Grande)',
        'Iced Dark Chocolate (Tall)',
        'Iced Dark Chocolate (Grande)',
        'Cappuccino (Tall)',
        'Cappuccino (Grande)',
        'Mocha Latte (Tall)',
        'Mocha Latte (Grande)',
        'Vanilla Latte (Tall)',
        'Vanilla Latte (Grande)',
        'Green Tea Latte (Tall)',
        'Green Tea Latte (Grande)',
        'White Chocolate (Tall)',
        'White Chocolate (Grande)',
        'Green Tea Matcha (Tall)',
        'Green Tea Matcha (Grande)',
        'Milk Tea (Regular)',
        'Milk Tea (HC)',
        'Milk Tea (MC)',
        'Caramel Milk Tea (Regular)',
        'Caramel Milk Tea (HC)',
        'Caramel Milk Tea (MC)',
        'Cookies & Cream Milk Tea (Regular)',
        'Cookies & Cream Milk Tea (HC)',
        'Cookies & Cream Milk Tea (MC)',
        'Dark Choco Milk Tea (Regular)',
        'Dark Choco Milk Tea (HC)',
        'Dark Choco Milk Tea (MC)',
        'Okinawa Milk Tea (Regular)',
        'Okinawa Milk Tea (HC)',
        'Okinawa Milk Tea (MC)',
        'Wintermelon Milk Tea (Regular)',
        'Wintermelon Milk Tea (HC)',
        'Wintermelon Milk Tea (MC)',
        'Matcha Green Tea Milk Tea (Regular)',
        'Matcha Green Tea Milk Tea (HC)',
        'Matcha Green Tea Milk Tea (MC)'
    ],
    'Cheese': [
        'Cheesy Nachos',
        'Nachos Supreme',
        'Cheesy Dynamite Lumpia',
        'Spaghetti (S)',
        'Spaghetti (M)',
        'Spaghetti (L)',
        'Creamy Carbonara (S)',
        'Creamy Carbonara (M)',
        'Creamy Carbonara (L)'
    ],
    'Cheese sauce': [
        'Cheesy Nachos',
        'Nachos Supreme',
        'Cheesy Dynamite Lumpia'
    ],

    // ================ PANTRY STAPLES ================
    'Gochujang': [
        'Korean Spicy Bulgogi (Pork)',
        'Korean Salt and Pepper (Pork)'
    ],
    'Sesame oil': [
        'Korean Spicy Bulgogi (Pork)',
        'Korean Salt and Pepper (Pork)',
        'Buttered Honey Chicken',
        'Buttered Spicy Chicken',
        'Fried Rice (S)',
        'Fried Rice (M)',
        'Fried Rice (L)'
    ],
    'Soy sauce': [
        'Korean Spicy Bulgogi (Pork)',
        'Korean Salt and Pepper (Pork)',
        'Chicken Adobo',
        'Sizzling Pork Sisig',
        'Sizzling Liempo',
        'Sizzling Porkchop',
        'Buttered Honey Chicken',
        'Buttered Spicy Chicken',
        'Pancit Bihon (S)',
        'Pancit Bihon (M)',
        'Pancit Bihon (L)',
        'Pancit Canton (S)',
        'Pancit Canton (M)',
        'Pancit Canton (L)',
        'Fried Rice (S)',
        'Fried Rice (M)',
        'Fried Rice (L)'
    ],
    'Oyster sauce': [
        'Sizzling Pork Sisig',
        'Pancit Bihon (S)',
        'Pancit Bihon (M)',
        'Pancit Bihon (L)',
        'Pancit Canton (S)',
        'Pancit Canton (M)',
        'Pancit Canton (L)'
    ],
    'Vinegar': [
        'Chicken Adobo'
    ],
    'Shrimp paste': [
        'Sinigang (Pork)',
        'Sinigang (Shrimp)',
        'Paknet (Pakbet w/ Bagnet)',
        'Tuyo Pesto (S)',
        'Tuyo Pesto (M)',
        'Tuyo Pesto (L)'
    ],
    'Fish Sauce': [
        'Special Bulalo (good for 2-3 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)'
    ],
    'Tamarind mix': [
        'Sinigang (Pork)',
        'Sinigang (Shrimp)'
    ],
    'Cooking oil': [
        'Korean Spicy Bulgogi (Pork)',
        'Korean Salt and Pepper (Pork)',
        'Crispy Pork Lechon Kawali',
        'Pork Shanghai',
        'Sizzling Pork Sisig',
        'Sizzling Liempo',
        'Sizzling Porkchop',
        'Sizzling Fried Chicken',
        'Fried Chicken',
        'Budget Fried Chicken',
        'Cream Dory Fish Fillet',
        'Buttered Honey Chicken',
        'Buttered Spicy Chicken',
        'Fish and Fries',
        'French Fries',
        'French Fries (Small)',
        'French Fries (Medium)',
        'French Fries (Large)',
        'Cheesy Dynamite Lumpia',
        'Lumpia Shanghai (S)',
        'Lumpia Shanghai (M)',
        'Fried Rice',
        'Fried Rice (Small)',
        'Fried Rice (Medium)',
        'Fried Rice (Large)',
        'Tinapa Rice',
        'Tinapa Rice (Small)',
        'Tinapa Rice (Medium)',
        'Tinapa Rice (Large)',
        'Tuyo Pesto',
        'Tuyo Pesto (Small)',
        'Tuyo Pesto (Medium)',
        'Tuyo Pesto (Large)',
        'Cheesy Nachos',
        'Cheesy Nachos (Small)',
        'Cheesy Nachos (Medium)',
        'Cheesy Nachos (Large)',
        'Nachos Supreme',
        'Nachos Supreme (Small)',
        'Nachos Supreme (Medium)',
        'Nachos Supreme (Large)',
        'Pancit Bihon',
        'Pancit Bihon (S)',
        'Pancit Bihon (M)',
        'Pancit Bihon (L)',
        'Pancit Canton + Bihon (Mixed)',
        'Pancit Canton (S)',
        'Pancit Canton (M)',
        'Pancit Canton (L)',
        'Spaghetti',
        'Spaghetti (S)',
        'Spaghetti (M)',
        'Spaghetti (L)',
        'Paknet (Pakbet w/ Bagnet)',
        'Buttered Shrimp'
    ],
    'Salt': [
        'Korean Spicy Bulgogi (Pork)',
        'Korean Salt and Pepper (Pork)',
        'Crispy Pork Lechon Kawali',
        'Sizzling Pork Sisig',
        'Sizzling Liempo',
        'Sizzling Porkchop',
        'Sizzling Fried Chicken',
        'Fried Chicken',
        'Budget Fried Chicken',
        'Cream Dory Fish Fillet',
        'Buttered Honey Chicken',
        'Buttered Spicy Chicken',
        'Fish and Fries',
        'French Fries',
        'French Fries (Small)',
        'French Fries (Medium)',
        'French Fries (Large)',
        'Chicken Adobo',
        'Sinigang (Pork)',
        'Sinigang (Shrimp)',
        'Paknet (Pakbet w/ Bagnet)',
        'Buttered Shrimp',
        'Special Bulalo',
        'Special Bulalo (good for 2-3 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)',
        'Fried Rice',
        'Fried Rice (Small)',
        'Fried Rice (Medium)',
        'Fried Rice (Large)',
        'Plain Rice',
        'Plain Rice (Small)',
        'Plain Rice (Medium)',
        'Plain Rice (Large)',
        'Tinapa Rice',
        'Tinapa Rice (Small)',
        'Tinapa Rice (Medium)',
        'Tinapa Rice (Large)',
        'Tuyo Pesto',
        'Tuyo Pesto (Small)',
        'Tuyo Pesto (Medium)',
        'Tuyo Pesto (Large)',
        'Pancit Bihon',
        'Pancit Bihon (S)',
        'Pancit Bihon (M)',
        'Pancit Bihon (L)',
        'Pancit Canton + Bihon (Mixed)',
        'Pancit Canton (S)',
        'Pancit Canton (M)',
        'Pancit Canton (L)'
    ],
    'Black pepper': [
        'Korean Spicy Bulgogi (Pork)',
        'Korean Salt and Pepper (Pork)',
        'Sizzling Pork Sisig',
        'Sizzling Liempo',
        'Sizzling Porkchop',
        'Sizzling Fried Chicken',
        'Fried Chicken',
        'Budget Fried Chicken',
        'Cream Dory Fish Fillet',
        'Buttered Honey Chicken',
        'Buttered Spicy Chicken',
        'Chicken Adobo',
        'Fish and Fries',
        'Sinigang (Pork)',
        'Sinigang (Shrimp)',
        'Paknet (Pakbet w/ Bagnet)',
        'Buttered Shrimp',
        'Pancit Bihon',
        'Pancit Bihon (S)',
        'Pancit Bihon (M)',
        'Pancit Bihon (L)',
        'Pancit Canton + Bihon (Mixed)',
        'Pancit Canton (S)',
        'Pancit Canton (M)',
        'Pancit Canton (L)'
    ],
    'Paprika': [
        'Fried Chicken',
        'Budget Fried Chicken',
        'Sizzling Fried Chicken'
    ],
    'Peppercorn': [
        'Korean Salt and Pepper (Pork)',
        'Crispy Pork Lechon Kawali',
        'Chicken Adobo',
        'Special Bulalo',
        'Special Bulalo (good for 2-3 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 3-4 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 1-2 Persons)'
    ],
    'Cornstarch': [
        'Korean Salt and Pepper (Pork)',
        'Crispy Pork Lechon Kawali',
        'Pork Shanghai',
        'Lumpia Shanghai (S)',
        'Lumpia Shanghai (M)',
        'Cheesy Dynamite Lumpia'
    ],
    'Bay leaves': [
        'Crispy Pork Lechon Kawali',
        'Chicken Adobo',
        'Sinigang (Pork)',
        'Sinigang (Shrimp)',
        'Special Bulalo',
        'Special Bulalo (good for 2-3 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)'
    ],
    'Honey': [
        'Buttered Honey Chicken',
        'Cucumber Lemonade (Glass)',
        'Cucumber Lemonade (Pitcher)',
        'Blue Lemonade (Glass)',
        'Blue Lemonade (Pitcher)',
        'Red Tea (Glass)',
        'Red Tea (Pitcher)'
    ],
    'Sugar': [
        'Korean Spicy Bulgogi (Pork)',
        'Buttered Honey Chicken',
        'Buttered Shrimp',
        'Cucumber Lemonade (Glass)',
        'Cucumber Lemonade (Pitcher)',
        'Blue Lemonade (Glass)',
        'Blue Lemonade (Pitcher)',
        'Red Tea (Glass)',
        'Red Tea (Pitcher)',
        'Calamansi Juice (Glass)',
        'Calamansi Juice (Pitcher)',
        'Café Americano (Tall)',
        'Café Americano (Grande)',
        'Espresso (Tall)',
        'Espresso (Grande)',
        'Café Latte (Tall)',
        'Café Latte (Grande)',
        'Caramel Macchiato (Tall)',
        'Caramel Macchiato (Grande)',
        'Iced Caramel Macchiato (Tall)',
        'Iced Caramel Macchiato (Grande)',
        'Cappuccino (Tall)',
        'Cappuccino (Grande)',
        'Mocha Latte (Tall)',
        'Mocha Latte (Grande)',
        'Iced Mocha Latte (Tall)',
        'Iced Mocha Latte (Grande)',
        'Vanilla Latte (Tall)',
        'Vanilla Latte (Grande)',
        'Iced Vanilla Latte (Tall)',
        'Iced Vanilla Latte (Grande)',
        'Iced Café Latte (Tall)',
        'Iced Café Latte (Grande)',
        'White Chocolate (Tall)',
        'White Chocolate (Grande)',
        'Iced White Chocolate (Tall)',
        'Iced White Chocolate (Grande)',
        'Iced Dark Chocolate (Tall)',
        'Iced Dark Chocolate (Grande)',
        'Green Tea Latte (Tall)',
        'Green Tea Latte (Grande)',
        'Green Tea Matcha (Tall)',
        'Green Tea Matcha (Grande)',
        'Black Tea (Tall)',
        'Black Tea (Grande)',
        'Lemon Tea (Tall)',
        'Lemon Tea (Grande)',
        'Peppermint Tea (Tall)',
        'Peppermint Tea (Grande)',
        'Milk Tea (Regular)',
        'Milk Tea (HC)',
        'Milk Tea (MC)',
        'Caramel Milk Tea (Regular)',
        'Caramel Milk Tea (HC)',
        'Caramel Milk Tea (MC)',
        'Cookies & Cream Milk Tea (Regular)',
        'Cookies & Cream Milk Tea (HC)',
        'Cookies & Cream Milk Tea (MC)',
        'Dark Choco Milk Tea (Regular)',
        'Dark Choco Milk Tea (HC)',
        'Dark Choco Milk Tea (MC)',
        'Okinawa Milk Tea (Regular)',
        'Okinawa Milk Tea (HC)',
        'Okinawa Milk Tea (MC)',
        'Wintermelon Milk Tea (Regular)',
        'Wintermelon Milk Tea (HC)',
        'Wintermelon Milk Tea (MC)',
        'Matcha Green Tea Milk Tea (Regular)',
        'Matcha Green Tea Milk Tea (HC)',
        'Matcha Green Tea Milk Tea (MC)',
        'Matcha Green Tea Frappe (Regular)',
        'Matcha Green Tea Frappe (Premium)',
        'Salted Caramel Frappe (Regular)',
        'Salted Caramel Frappe (Premium)',
        'Strawberry Cheesecake Frappe (Regular)',
        'Strawberry Cheesecake Frappe (Premium)',
        'Mango Cheesecake Frappe (Regular)',
        'Mango Cheesecake Frappe (Premium)',
        'Strawberry Cream Frappe (Regular)',
        'Strawberry Cream Frappe (Premium)',
        'Cookies & Cream Frappe (Regular)',
        'Cookies & Cream Frappe (Premium)',
        'Rocky Road Frappe (Regular)',
        'Rocky Road Frappe (Premium)',
        'Choco Fudge Frappe (Regular)',
        'Choco Mousse Frappe (Regular)',
        'Coffee Crumble Frappe (Regular)',
        'Vanilla Cream Frappe (Regular)',
        'Fried Rice (S)',
        'Fried Rice (M)',
        'Fried Rice (L)',
        'Spaghetti (S)',
        'Spaghetti (M)',
        'Spaghetti (L)'
    ],
    'Breadcrumbs': [
        'Pork Shanghai',
        'Lumpia Shanghai (S)',
        'Lumpia Shanghai (M)',
        'Fried Chicken',
        'Cream Dory Fish Fillet',
        'Fish and Fries'
    ],
    'Flour': [
        'Pork Shanghai',
        'Lumpia Shanghai (S)',
        'Lumpia Shanghai (M)',
        'Sizzling Fried Chicken',
        'Fried Chicken',
        'Cream Dory Fish Fillet',
        'Fish and Fries',
        'French Fries'
    ],
    'Gravy': [
        'Sizzling Fried Chicken',
        'Clubhouse Sandwich'
    ],
    'Ground meat': [
        'Spaghetti',
        'Spaghetti (S)',
        'Spaghetti (M)',
        'Spaghetti (L)',
        'Nachos Supreme',
        'Nachos Supreme (Small)',
        'Nachos Supreme (Medium)',
        'Nachos Supreme (Large)',
        'Lumpia Shanghai (S)',
        'Lumpia Shanghai (M)',  
        'Lumpia Shanghai (L)'
    ],

    'Hotdog': [
        'Spaghetti',
        'Spaghetti (S)',
        'Spaghetti (M)',
        'Spaghetti (L)'
    ],
    'Sweet tomato sauce': [
        'Spaghetti',
        'Spaghetti (S)',
        'Spaghetti (M)',
        'Spaghetti (L)',
        'Spaghetti (Filipino Style)',
        'Spaghetti (Filipino Style) (S)',
        'Spaghetti (Filipino Style) (M)',
        'Spaghetti (Filipino Style) (L)'
    ],
    'Vegetables': [
        'Special Bulalo',
        'Special Bulalo (good for 2-3 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)',
        'Paknet (Pakbet w/ Bagnet)',
        'Lumpia Shanghai (S)',
        'Lumpia Shanghai (M)', 
        'Lumpia Shanghai (L)',  
     ],

    'Water': [
        'Special Bulalo',
        'Special Bulalo (good for 2-3 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)',
        'Sinigang (Pork)',
        'Sinigang (Shrimp)',
        'Paknet (Pakbet w/ Bagnet)',
        'Fried Rice',
        'Fried Rice (Small)',
        'Fried Rice (Medium)',
        'Fried Rice (Large)',
        'Plain Rice',
        'Plain Rice (Small)',
        'Plain Rice (Medium)',
        'Plain Rice (Large)',
        'Cucumber Lemonade',
        'Cucumber Lemonade (Glass)',
        'Cucumber Lemonade (Pitcher)',
        'Blue Lemonade',
        'Blue Lemonade (Glass)',
        'Blue Lemonade (Pitcher)',
        'Red Tea',
        'Red Tea (Glass)',
        'Red Tea Tall',
        'Red Tea (Tall)',
        'Red Tea Glass',
        'Red Tea (L)',
        'Calamansi Juice (Glass)',
        'Calamansi Juice (Pitcher)',
        'Cafe Americano',
        'Cafe Americano Tall',
        'Cafe Americano (Glass)',
        'Cafe Americano (L)'
    ],
    'Beef broth': [
        'Special Bulalo',
        'Special Bulalo (good for 2-3 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 3-4 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 1-2 Persons)'
    ],
    'Chicken broth': [
        'Special Bulalo',
        'Special Bulalo (good for 2-3 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)',
        'Pancit Canton + Bihon (Mixed)',
        'Pancit Canton (S)',
        'Pancit Canton (M)',
        'Pancit Canton (L)'
    ],
    'Ham': [
        'Clubhouse Sandwich'
    ],

    // ================ NOODLES, PASTA & RICE ================
    'Pancit canton': [
        'Pancit Canton + Bihon (Mixed)',
        'Pancit Canton (S)',
        'Pancit Canton (M)',
        'Pancit Canton (L)'
    ],
    'Pancit Bihon': [
        'Pancit Bihon',
        'Pancit Bihon (S)',
        'Pancit Bihon (M)',
        'Pancit Bihon (L)',
        'Pancit Canton + Bihon (Mixed)'
    ],
    'Bihon noodles': [
        'Pancit Canton + Bihon (Mixed)',
        'Pancit Canton (S)',
        'Pancit Canton (M)',
        'Pancit Canton (L)',
        'Pancit Bihon',
        'Pancit Bihon (S)',
        'Pancit Bihon (M)',
        'Pancit Bihon (L)'
    ],
    'Rice noodles': [
        'Pancit Bihon',
        'Pancit Bihon (S)',
        'Pancit Bihon (M)',
        'Pancit Bihon (L)'
    ],
    'Spaghetti pasta': [
        'Spaghetti',
        'Spaghetti (S)',
        'Spaghetti (M)',
        'Spaghetti (L)',
        'Spaghetti (Filipino Style)',
        'Spaghetti (Filipino Style) (S)',
        'Spaghetti (Filipino Style) (M)',
        'Spaghetti (Filipino Style) (L)',
        'Creamy Carbonara'
    ],
    'Pasta': [
        'Tuyo Pesto (S)',
        'Tuyo Pesto (M)',
        'Tuyo Pesto (L)'
    ],
    'Rice': [
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
        'Tinapa Rice',
        'Tuyo Pesto (S)',
        'Tuyo Pesto (M)',
        'Tuyo Pesto (L)',
        'Fried Rice (S)',
        'Fried Rice (M)',
        'Fried Rice (L)',
        'Plain Rice',
        'Sinigang (Pork)',
        'Sinigang (Shrimp)',
        'Paknet (Pakbet w/ Bagnet)',
        'Buttered Shrimp',
        'Special Bulalo (good for 2-3 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)'
    ],

    // ================ BEVERAGE BASES ================
    'Cucumber': [
        'Cucumber Lemonade',
        'Cucumber Lemonade (Glass)',
        'Cucumber Lemonade (Pitcher)'
    ],
    'Lemon': [
        'Cucumber Lemonade',
        'Cucumber Lemonade (Glass)',
        'Cucumber Lemonade (Pitcher)',
        'Blue Lemonade',
        'Blue Lemonade (Glass)',
        'Blue Lemonade (Pitcher)',
        'Hot Ceylon Tea Lemon'
    ],
    'Lemon juice': [
        'Cucumber Lemonade',
        'Cucumber Lemonade (Glass)',
        'Cucumber Lemonade (Pitcher)',
        'Blue Lemonade',
        'Blue Lemonade (Glass)',
        'Blue Lemonade (Pitcher)'
    ],
    'Blue syrup': [
        'Blue Lemonade',
        'Blue Lemonade (Glass)',
        'Blue Lemonade (Pitcher)'
    ],
    'Black tea': [
        'Red Tea (Glass)',
        'Red Tea (Pitcher)',
        'Milk Tea (Regular)',
        'Milk Tea (HC)',
        'Milk Tea (MC)'
    ],
    'Tea': [
        'Red Tea (Glass)',
        'Red Tea (Pitcher)',
        'Milk Tea (Regular)',
        'Milk Tea (HC)',
        'Milk Tea (MC)',
        'Matcha Green Tea Milk Tea (Regular)',
        'Matcha Green Tea Milk Tea (HC)',
        'Matcha Green Tea Milk Tea (MC)'
    ],
    'Red tea': [
        'Red Tea (Glass)',
        'Red Tea (Pitcher)'
    ],
    'Peppermint tea': [
        'Hot Ceylon Tea Peppermint'
    ],
    'Coffee beans': [
        'Cafe Americano',
        'Cafe Americano Tall',
        'Cafe Americano Grande',
        'Cafe Americano Hot',
        'Cafe Americano (Glass)',
        'Cafe Americano (L)',
        'Café Americano (Grande)',
        'Café Americano (Tall)',
        'Café Americano Hot (Grande)',
        'Café Americano Hot (Tall)',
        'Cafe Latte',
        'Cafe Latte Tall',
        'Cafe Latte Grande',
        'Cafe Latte (Glass)',
        'Cafe Latte (L)',
        'Café Latte',
        'Café Latte (Grande)',
        'Café Latte (Tall)',
        'Caramel Macchiato',
        'Caramel Macchiato Tall',
        'Caramel Macchiato Grande',
        'Caramel Macchiato (Glass)',
        'Caramel Macchiato (L)',
        'Caramel Macchiato Hot',
        'Caramel Macchiato Hot (Grande)',
        'Caramel Macchiato Hot (Tall)',
        'Iced Caramel Macchiato',
        'Iced Caramel Macchiato (Grande)',
        'Iced Caramel Macchiato (Tall)',
        'Espresso',
        'Espresso (Grande)',
        'Espresso (Tall)',
        'Espresso Hot',
        'Cappuccino',
        'Cappuccino (Grande)',
        'Cappuccino (Tall)',
        'Mocha',
        'Mocha (Grande)',
        'Mocha (Tall)',
        'Iced Americano',
        'Iced Americano (Grande)',
        'Iced Americano (Tall)',
        'Iced Latte',
        'Iced Latte (Grande)',
        'Iced Latte (Tall)',
        'Iced Mocha',
        'Iced Mocha (Grande)',
        'Iced Mocha (Tall)',
        'Vanilla Latte',
        'Vanilla Latte (Grande)',
        'Vanilla Latte (Tall)',
        'Mocha Latte',
        'Mocha Latte (Grande)',
        'Mocha Latte (Tall)',
        'Iced Mocha Latte',
        'Iced Mocha Latte (Grande)',
        'Iced Mocha Latte (Tall)',
        'Iced Vanilla Latte',
        'Iced Vanilla Latte (Grande)',
        'Iced Vanilla Latte (Tall)',
        'Iced Café Latte',
        'Iced Café Latte (Grande)',
        'Iced Café Latte (Tall)'
    ],
    'Chocolate Coffee Beans': [
        'Chocolate Coffee Frappe',
        'Chocolate Coffee Crumbles Frappe'
    ],
    'Espresso': [
        'Cafe Americano',
        'Cafe Americano Tall',
        'Cafe Americano Grande',
        'Cafe Americano Hot',
        'Cafe Americano (Glass)',
        'Cafe Americano (L)',
        'Café Americano (Grande)',
        'Café Americano (Tall)',
        'Café Americano Hot (Grande)',
        'Café Americano Hot (Tall)',
        'Cafe Latte',
        'Cafe Latte Tall',
        'Cafe Latte Grande',
        'Cafe Latte (Glass)',
        'Cafe Latte (L)',
        'Café Latte',
        'Café Latte (Grande)',
        'Café Latte (Tall)',
        'Caramel Macchiato',
        'Caramel Macchiato Tall',
        'Caramel Macchiato Grande',
        'Caramel Macchiato (Glass)',
        'Caramel Macchiato (L)',
        'Caramel Macchiato Hot',
        'Caramel Macchiato Hot (Grande)',
        'Caramel Macchiato Hot (Tall)',
        'Iced Caramel Macchiato',
        'Iced Caramel Macchiato (Grande)',
        'Iced Caramel Macchiato (Tall)',
        'Espresso',
        'Espresso (Grande)',
        'Espresso (Tall)',
        'Espresso Hot',
        'Cappuccino',
        'Cappuccino (Grande)',
        'Cappuccino (Tall)',
        'Mocha',
        'Mocha (Grande)',
        'Mocha (Tall)',
        'Iced Americano',
        'Iced Americano (Grande)',
        'Iced Americano (Tall)',
        'Iced Latte',
        'Iced Latte (Grande)',
        'Iced Latte (Tall)',
        'Iced Mocha',
        'Iced Mocha (Grande)',
        'Iced Mocha (Tall)',
        'Vanilla Latte',
        'Vanilla Latte (Grande)',
        'Vanilla Latte (Tall)',
        'Mocha Latte',
        'Mocha Latte (Grande)',
        'Mocha Latte (Tall)',
        'Iced Mocha Latte',
        'Iced Mocha Latte (Grande)',
        'Iced Mocha Latte (Tall)',
        'Iced Vanilla Latte',
        'Iced Vanilla Latte (Grande)',
        'Iced Vanilla Latte (Tall)',
        'Iced Café Latte',
        'Iced Café Latte (Grande)',
        'Iced Café Latte (Tall)',
        'Caramel Macchiato Hot'
    ],
    'Matcha powder': [
        'Matcha Green Tea',
        'Matcha Green Tea Tall',
        'Matcha Green Tea HC',
        'Matcha Green Tea MC',
        'Matcha Green Tea (Glass)',
        'Matcha Green Tea (L)',
        'Matcha Regular HC',
        'Green Tea Latte Hot',
        'Green Tea Matcha Hot',
        'Green Tea Matcha (Grande)',
        'Green Tea Matcha (Tall)',
        'Green Tea Matcha Iced',
        'Matcha Green Tea Frappe',
        'Matcha Green Tea Milk Tea',
        'Matcha Green Tea Milk Tea HC',
        'Matcha Green Tea Milk Tea MC',
        'Matcha Green Tea Milk Tea (Glass)',
        'Matcha Green Tea Milk Tea (L)'
    ],
    'Matcha Green Tea Powder': [
        'Matcha Green Tea',
        'Matcha Green Tea Tall',
        'Matcha Green Tea HC',
        'Matcha Green Tea MC',
        'Matcha Regular HC',
        'Matcha Green Tea (Glass)',
        'Matcha Green Tea (L)',
        'Matcha Green Tea (HC)'
    ],
    'Caramel syrup': [
        'Caramel Macchiato',
        'Caramel Macchiato Tall',
        'Caramel Macchiato Grande',
        'Caramel Macchiato (Glass)',
        'Caramel Macchiato (L)',
        'Salted Caramel Frappe'
    ],
    'Caramel Sauce': [
        'Caramel Macchiato Grande',
        'Caramel Macchiato Tall',
        'Caramel Macchiato (Glass)',
        'Caramel Macchiato (L)',
        'Salted Caramel Frappe',
        'Caramel Macchiato Hot',

    
    ],
    'Vanilla syrup': [
        'Cafe Latte',
        'Cafe Latte Tall',
        'Cafe Latte Grande',
        'Cafe Latte (Glass)',
        'Cafe Latte (L)',
        'Caramel Macchiato',
        'Caramel Macchiato Tall',
        'Caramel Macchiato Grande',
        'Caramel Macchiato (Glass)',
        'Caramel Macchiato (L)',
        'Vanilla Latte Hot',
        'Vanilla Latte',
        'Vanilla Latte (Grande)',
        'Vanilla Latte (Tall)',
        'Iced Vanilla Latte',
        'Iced Vanilla Latte (Grande)',
        'Iced Vanilla Latte (Tall)',
        'Caramel Macchiato Hot'
    ],
    'White chocolate syrup': [
        'White Chocolate Hot',
        'White Chocolate',
        'White Chocolate (Grande)',
        'White Chocolate (Tall)',
        'Iced White Chocolate Latte',
        'Iced White Chocolate',
        'Iced White Chocolate (Grande)',
        'Iced White Chocolate (Tall)'
    ],
    'Dark chocolate syrup': [
        'Iced Dark Chocolate',
        'Iced Dark Chocolate (Grande)',
        'Iced Dark Chocolate (Tall)'
    ],
    'Chocolate syrup': [
        'Cookies & Cream HC',
        'Cookies & Cream MC',
        'Cookies and Cream MC',
        'Cookies & Cream (Glass)',
        'Cookies & Cream (L)',
        'Rocky Road Frappe (Premium)',
        'Choco Fudge Frappe (Regular)',
        'Dark Choco Milk Tea'
    ],
    'Strawberry syrup': [
        'Strawberry & Cream HC',
        'Strawberry and Cream MC',
        'Strawberry & Cream (Glass)',
        'Strawberry & Cream (L)',
        'Strawberry Cheesecake Frappe',
        'Strawberry Cream Frappe'
    ],
    'Mango flavor': [
        'Mango cheese cake HC',
        'Mango cheese cake MC',
        'Mango Cheesecake Frappe'
    ],
    'Mango syrup': [
        'Mango Cheesecake Frappe'
    ],
    'Mango puree': [
        'Mango Cheesecake Frappe'
    ],
    'Okinawa syrup': [
        'Okinawa Milk Tea'
    ],
    'Wintermelon syrup': [
        'Wintermelon Milk Tea'
    ],
    'Cookie crumbs': [
        'Cookies & Cream HC',
        'Cookies & Cream MC',
        'Cookies and Cream MC',
        'Cookies & Cream (Glass)',
        'Cookies & Cream (L)',
        'Cookies & Cream Frappe',
        'Coffee Crumble Frappe',
        'Cookie & Cream Milk Tea'
    ],
    'Tapioca pearls': [
        'Milk Tea Regular HC',
        'Milk Tea Regular MC',
        'Milk Tea Regular HC (Glass)',
        'Milk Tea Regular HC (Large)',
        'Caramel Milk Tea',
        'Cookies & Cream Milk Tea',
        'Dark Choco Milk Tea',
        'Okinawa Milk Tea',
        'Wintermelon Milk Tea',
        'Matcha Green Tea Milk Tea',
        'Cookies & Cream HC',
        'Cookies & Cream MC',
        'Cookies & Cream (Glass)',
        'Cookies & Cream (L)',
        'Strawberry & Cream HC',
        'Strawberry & Cream (Glass)',
        'Strawberry & Cream (L)',
        'Mango cheese cake HC',
        'Mango cheese cake MC'
    ],

    'Steamed milk': [
        'Cafe Latte',
        'Cafe Latte Tall',
        'Cafe Latte Grande',
        'Cafe Latte (Glass)',
        'Cafe Latte (L)',
        'Café Latte',
        'Café Latte (Grande)',
        'Café Latte (Tall)',
        'Caramel Macchiato',
        'Caramel Macchiato Tall',
        'Caramel Macchiato Grande',
        'Caramel Macchiato (Glass)',
        'Caramel Macchiato (L)',
        'Caramel Macchiato Hot',
        'Caramel Macchiato Hot (Grande)',
        'Caramel Macchiato Hot (Tall)',
        'Iced Caramel Macchiato',
        'Iced Caramel Macchiato (Grande)',
        'Iced Caramel Macchiato (Tall)',
        'Cappuccino',
        'Cappuccino (Grande)',
        'Cappuccino (Tall)',
        'Cappuccino Hot',
        'Mocha',
        'Mocha (Grande)',
        'Mocha (Tall)',
        'Mocha Latte Hot',
        'Mocha Latte',
        'Mocha Latte (Grande)',
        'Mocha Latte (Tall)',
        'Iced Mocha Latte',
        'Iced Mocha Latte (Grande)',
        'Iced Mocha Latte (Tall)',
        'Vanilla Latte Hot',
        'Vanilla Latte',
        'Vanilla Latte (Grande)',
        'Vanilla Latte (Tall)',
        'Iced Vanilla Latte',
        'Iced Vanilla Latte (Grande)',
        'Iced Vanilla Latte (Tall)',
        'Iced Latte',
        'Iced Latte (Grande)',
        'Iced Latte (Tall)',
        'Iced Mocha',
        'Iced Mocha (Grande)',
        'Iced Mocha (Tall)',
        'Iced Café Latte',
        'Iced Café Latte (Grande)',
        'Iced Café Latte (Tall)',
        'White Chocolate',
        'White Chocolate (Grande)',
        'White Chocolate (Tall)',
        'Iced White Chocolate',
        'Iced White Chocolate (Grande)',
        'Iced White Chocolate (Tall)',
        'Iced Dark Chocolate',
        'Iced Dark Chocolate (Grande)',
        'Iced Dark Chocolate (Tall)'
    ],
    'Milk Foam': [
        'Cafe Latte',
        'Cappuccino Hot',
    ],
    'Hot water': [
        'Cafe Americano',
        'Cafe Americano Tall',
        'Cafe Americano Grande',
        'Cafe Americano (Glass)',
        'Cafe Americano (L)',
        'Café Americano (Grande)',
        'Café Americano (Tall)',
        'Café Americano Hot (Grande)',
        'Café Americano Hot (Tall)',
        'Espresso',
        'Espresso (Grande)',
        'Espresso (Tall)',
        'Espresso Hot',
        'Hot Ceylon Tea Black',
        'Hot Ceylon Tea Lemon',
        'Hot Ceylon Tea Peppermint',
        'Red Tea',
        'Red Tea (Glass)',
        'Red Tea Tall',
        'Red Tea (Tall)',
        'Red Tea Glass',
        'Red Tea (L)',
        'Black Tea (Grande)',
        'Black Tea (Tall)',
        'Lemon Tea',
        'Lemon Tea (Grande)',
        'Lemon Tea (Tall)',
        'Peppermint Tea',
        'Peppermint Tea (Grande)',
        'Peppermint Tea (Tall)',
        'Matcha Green Tea',
        'Matcha Green Tea Tall',
        'Matcha Green Tea HC',
        'Matcha Green Tea MC',
        'Matcha Green Tea (Glass)',
        'Matcha Green Tea (L)',
        'Matcha Regular HC',
        'Matcha',
        'Matcha Green Tea (HC)',
        'White Chocolate Hot',
        'Green Tea Latte Hot',
        'Green Tea Latte',
        'Green Tea Latte (Grande)',
        'Green Tea Latte (Tall)',
        'Green Tea Matcha Hot',
        'Green Tea Matcha',
        'Green Tea Matcha (Grande)',
        'Green Tea Matcha (Tall)',
        'Hot Ceylon Tea Black',
        'Hot Ceylon Tea Lemon',
        'Hot Ceylon Tea Peppermint',
        'Cafe Americano Hot',
        'Caramel Macchiato Hot',
        'Caramel Macchiato Hot (Grande)',
        'Caramel Macchiato Hot (Tall)',
        'Vanilla Latte Hot',
        'Vanilla Latte',
        'Vanilla Latte (Grande)',
        'Vanilla Latte (Tall)',
        'Mocha Latte Hot',
        'Mocha',
        'Mocha (Grande)',
        'Mocha (Tall)',
        'Cappuccino',
        'Cappuccino (Grande)',
        'Cappuccino (Tall)',
        'Matcha Green Tea Milk Tea',
        'Matcha Green Tea Milk Tea (Glass)',
        'Matcha Green Tea Milk Tea (L)',
        'Matcha Green Tea Milk Tea HC',
        'Matcha Green Tea Milk Tea MC'

    ],
    'Ice': [
        'Iced Cafe Latte',
        'Iced Cafe Latte (Grande)',
        'Iced Cafe Latte (Tall)',
        'Iced Mocha Latte',
        'Iced Mocha Latte (Grande)',
        'Iced Mocha Latte (Tall)',
        'Iced Vanilla Latte',
        'Iced Vanilla Latte (Grande)',
        'Iced Vanilla Latte (Tall)',
        'Iced Caramel Macchiato',
        'Iced Caramel Macchiato (Grande)',
        'Iced Caramel Macchiato (Tall)',
        'Iced White Chocolate Latte',
        'Iced White Chocolate',
        'Iced White Chocolate (Grande)',
        'Iced White Chocolate (Tall)',
        'Iced Dark Chocolate',
        'Iced Dark Chocolate (Grande)',
        'Iced Dark Chocolate (Tall)',
        'Iced Americano',
        'Iced Americano (Grande)',
        'Iced Americano (Tall)',
        'Iced Latte',
        'Iced Latte (Grande)',
        'Iced Latte (Tall)',
        'Iced Mocha',
        'Iced Mocha (Grande)',
        'Iced Mocha (Tall)',
        'Iced Café Latte',
        'Iced Café Latte (Grande)',
        'Iced Café Latte (Tall)',
        'Cucumber Lemonade',
        'Cucumber Lemonade (Glass)',
        'Cucumber Lemonade (Pitcher)',
        'Blue Lemonade',
        'Blue Lemonade (Glass)',
        'Blue Lemonade (Pitcher)',
        'Red Tea',
        'Red Tea (Glass)',
        'Red Tea Tall',
        'Red Tea (Tall)',
        'Red Tea Glass',
        'Red Tea (L)',
        'Calamansi Juice (Glass)',
        'Calamansi Juice (Pitcher)',
        'Milk Tea Regular HC',
        'Milk Tea Regular MC',
        'Milk Tea Regular HC (Glass)',
        'Milk Tea Regular HC (Large)',
        'Milk Tea Regular HC Regular MC',
        'Matcha Green Tea HC',
        'Matcha Green Tea MC',
        'Matcha Regular HC',
        'Matcha Green Tea (Glass)',
        'Matcha Green Tea (L)',
        'Cookies & Cream HC',
        'Cookies & Cream MC',
        'Cookies and Cream MC',
        'Cookies & Cream (Glass)',
        'Cookies & Cream (L)',
        'Strawberry & Cream HC',
        'Strawberry and Cream MC',
        'Strawberry & Cream (Glass)',
        'Strawberry & Cream (L)',
        'Mango cheese cake HC',
        'Mango cheese cake MC',
        'Soda (Glass)',
        'Soda (L)',
        'Matcha Green Tea Frappe',
        'Salted Caramel Frappe',
        'Strawberry Cheesecake Frappe',
        'Mango Cheesecake Frappe',
        'Strawberry Cream Frappe',
        'Cookies & Cream Frappe',
        'Rocky Road Frappe (Premium)',
        'Choco Fudge Frappe (Regular)',
        'Choco Mousse Frappe Regular',
        'Coffee Crumble Frappe',
        'Vanilla Cream Frappe',
        'Matcha Green Tea Milk Tea',
        'Matcha Green Tea Milk Tea (Glass)',
        'Matcha Green Tea Milk Tea (L)',
        'Matcha Green Tea Milk Tea HC',
        'Matcha Green Tea Milk Tea MC'
    ],
    'Carbonated water': [
        'Soda (Glass)',
        'Soda (Mismo)',
        'Soda (L)',
        'Soda 1.5L Coke',
        'Soda 1.5L Sprite',
        'Soda 1.5L Royal',
        'Soda 1.5L Coke Zero'
    ],
    'Coke syrup': [
        'Soda (Mismo) Coke',
        'Soda 1.5L Coke'
    ],
    'Sprite syrup': [
        'Soda (Mismo) Sprite',
        'Soda 1.5L Sprite'
    ],
    'Royal syrup': [
        'Soda (Mismo) Royal',
        'Soda 1.5L Royal'
    ],
    'Coke zero syrup': [
        'Soda 1.5L Coke Zero'
    ],

    // ================ SNACKS & SIDES ================
    'Nacho chips': [
        'Cheesy Nachos',
        'Cheesy Nachos (Small)',
        'Cheesy Nachos (Medium)',
        'Cheesy Nachos (Large)',
        'Nachos Supreme',
        'Nachos Supreme (Small)',
        'Nachos Supreme (Medium)',
        'Nachos Supreme (Large)'
    ],
    'Tortilla chips': [
        'Cheesy Nachos',
        'Nachos Supreme'
    ],
    'Lumpia wrapper': [
        'Lumpia Shanghai (S)',
        'Lumpia Shanghai (M)',
        'Cheesy Dynamite Lumpia',
        'Pork Shanghai'
    ],
    'French fries': [
        'French Fries',
        'French Fries (Small)',
        'French Fries (Medium)',
        'French Fries (Large)',
        'Fish and Fries'
    ],
    'Bread': [
        'Clubhouse Sandwich'
    ],

    // ================ FLAVORINGS & ADDITIVES ================
    'Frappe base': [
        'Cookies & Cream HC',
        'Cookies & Cream MC',
        'Cookies and Cream MC',
        'Strawberry & Cream HC',
        'Mango cheese cake HC',
        'Matcha Green Tea Frappe',
        'Salted Caramel Frappe',
        'Strawberry Cheesecake Frappe',
        'Mango Cheesecake Frappe',
        'Strawberry Cream Frappe',
        'Cookies & Cream Frappe',
        'Rocky Road Frappe (Premium)',
        'Choco Fudge Frappe (Regular)',
        'Choco Mousse Frappe Regular',
        'Coffee Crumble Frappe',
        'Vanilla Cream Frappe'
    ],
    'Whipped cream': [
        'Cookies & Cream HC',
        'Cookies & Cream MC',
        'Cookies and Cream MC',
        'Strawberry & Cream HC',
        'Mango cheese cake HC',
        'Matcha Green Tea Frappe',
        'Salted Caramel Frappe',
        'Strawberry Cheesecake Frappe',
        'Mango Cheesecake Frappe',
        'Strawberry Cream Frappe',
        'Cookies & Cream Frappe',
        'Rocky Road Frappe (Premium)',
        'Choco Fudge Frappe (Regular)',
        'Choco Mousse Frappe Regular',
        'Coffee Crumble Frappe',
        'Vanilla Cream Frappe'
    ],
    'Chocolate sauce': [
        'Cookies & Cream HC',
        'Cookies & Cream MC',
        'Cookies and Cream MC',
        'Rocky Road Frappe (Premium)',
        'Choco Fudge Frappe (Regular)'
    ],
    'Chocolate mousse': [
        'Choco Mousse Frappe Regular'
    ],
    'Graham crumbs': [
        'Strawberry Cheesecake Frappe',
        'Mango Cheesecake Frappe'
    ],
    'Marshmallows': [
        'Rocky Road Frappe (Premium)'
    ],
    'Nuts': [
        'Rocky Road Frappe (Premium)'
    ],
    'Herbs': [
        'Tuyo Pesto',
        'Tuyo Pesto (Small)',
        'Tuyo Pesto (Medium)',
        'Tuyo Pesto (Large)'
    ],
    'Sweetener': [
        'Matcha Green Tea HC',
        'Matcha Green Tea MC'
    ],

    // ================ PACKAGING ================
    'Plastic Cups': [
        // ========== COFFEE ==========
        'Cafe Americano',
        'Cafe Americano Tall',
        'Cafe Americano Grande',
        'Cafe Americano (Glass)',
        'Cafe Americano (L)',
        'Cafe Americano Hot',
        'Cafe Latte',
        'Cafe Latte Tall',
        'Cafe Latte Grande',
        'Cafe Latte (Glass)',
        'Cafe Latte (L)',
        'Caramel Macchiato',
        'Caramel Macchiato Tall',
        'Caramel Macchiato Grande',
        'Caramel Macchiato (Glass)',
        'Caramel Macchiato (L)',
        'Caramel Macchiato Hot',
        'Espresso Hot',
        'Cappuccino Hot',
        'Mocha Latte Hot',
        'Vanilla Latte Hot',
        'Iced Cafe Latte',
        'Iced Mocha Latte',
        'Iced Vanilla Latte',
        'Iced Caramel Macchiato',
        // ========== MILK TEA ==========
        'Milk Tea Regular HC',
        'Milk Tea Regular MC',
        'Milk Tea Regular HC (Glass)',
        'Milk Tea Regular HC (Large)',
        'Milk Tea Regular HC Regular MC',
        'Caramel Milk Tea',
        'Cookies & Cream Milk Tea',
        'Dark Choco Milk Tea',
        'Okinawa Milk Tea',
        'Wintermelon Milk Tea',
        'Matcha Green Tea Milk Tea',
        // ========== MATCHA & TEA ==========
        'Matcha Green Tea',
        'Matcha Green Tea Tall',
        'Matcha Green Tea HC',
        'Matcha Green Tea MC',
        'Matcha Green Tea (Glass)',
        'Matcha Green Tea (L)',
        'Matcha Green Tea (HC)',
        'Matcha Regular HC',
        'Green Tea Latte Hot',
        'Green Tea Matcha Hot',
        'Green Tea Matcha Iced',
        'Red Tea',
        'Red Tea (Glass)',
        'Red Tea Tall',
        'Red Tea (Tall)',
        'Red Tea Glass',
        'Red Tea (L)',
        'Hot Ceylon Tea Black',
        'Hot Ceylon Tea Lemon',
        'Hot Ceylon Tea Peppermint',
        // ========== CREAMS & DRINKS ==========
        'Cookies & Cream HC',
        'Cookies & Cream MC',
        'Cookies & Cream (Glass)',
        'Cookies & Cream (L)',
        'Cookies and Cream MC',
        'Strawberry & Cream HC',
        'Strawberry and Cream MC',
        'Strawberry & Cream (Glass)',
        'Strawberry & Cream (L)',
        'Mango cheese cake HC',
        'Mango cheese cake MC',
        'White Chocolate Hot',
        'Iced White Chocolate Latte',
        'Iced Dark Chocolate',
        // ========== FRAPPES ==========
        'Cookies & Cream Frappe',
        'Strawberry & Cream Frappe',
        'Strawberry Cheesecake Frappe',
        'Mango Cheesecake Frappe',
        'Strawberry Cream Frappe',
        'Rocky Road Frappe (Premium)',
        'Choco Fudge Frappe (Regular)',
        'Choco Mousse Frappe Regular',
        'Coffee Crumble Frappe',
        'Vanilla Cream Frappe',
        'Matcha Green Tea Frappe',
        'Salted Caramel Frappe',
        // ========== BEVERAGES & JUICES ==========
        'Cucumber Lemonade',
        'Cucumber Lemonade (Glass)',
        'Cucumber Lemonade (Pitcher)',
        'Blue Lemonade',
        'Blue Lemonade (Glass)',
        'Blue Lemonade (Pitcher)',
        'Calamansi Juice (Glass)',
        'Calamansi Juice (Pitcher)',
        'Soda',
        'Soda (Glass)',
        'Soda (Mismo)',
        'Soda (L)',
        'Soda 1.5L Coke',
        'Soda 1.5L Sprite',
        'Soda 1.5L Royal',
        'Soda 1.5L Coke Zero',
        'Soda (Mismo) Coke',
        'Soda (Mismo) Sprite',
        'Soda (Mismo) Royal'
    ],
    'Lid': [
        'Cafe Americano',
        'Cafe Americano Tall',
        'Cafe Americano Grande',
        'Cafe Americano (Glass)',
        'Cafe Americano (L)',
        'Cafe Latte',
        'Cafe Latte Tall',
        'Cafe Latte Grande',
        'Cafe Latte (Glass)',
        'Cafe Latte (L)',
        'Caramel Macchiato',
        'Caramel Macchiato Tall',
        'Caramel Macchiato Grande',
        'Caramel Macchiato (Glass)',
        'Caramel Macchiato (L)',
        'Espresso Hot',
        'Cappuccino Hot',
        'Mocha Latte Hot',
        'Vanilla Latte Hot',
        'Green Tea Latte Hot',
        'White Chocolate Hot',
        'Green Tea Matcha Hot',
        'Hot Ceylon Tea Black',
        'Hot Ceylon Tea Lemon',
        'Hot Ceylon Tea Peppermint'
    ],

    'Rounded Lid': [
        'Milk Tea Regular HC',
        'Milk Tea Regular MC',
        'Caramel Milk Tea',
        'Cookies & Cream Milk Tea',
        'Dark Choco Milk Tea'
    ],

    'Boba straws': [
        'Milk Tea Regular HC',
        'Milk Tea Regular MC',
        'Milk Tea Regular HC (Glass)',
        'Milk Tea Regular HC (Large)',
        'Caramel Milk Tea',
        'Cookies & Cream Milk Tea',
        'Dark Choco Milk Tea',
        'Okinawa Milk Tea',
        'Wintermelon Milk Tea',
        'Matcha Green Tea Milk Tea',
        'Matcha Green Tea Frappe',
        'Salted Caramel Frappe',
        'Strawberry Cheesecake Frappe',
        'Mango Cheesecake Frappe',
        'Strawberry Cream Frappe',
        'Cookies & Cream Frappe',
        'Rocky Road Frappe (Premium)',
        'Choco Fudge Frappe (Regular)',
        'Choco Mousse Frappe Regular',
        'Coffee Crumble Frappe',
        'Vanilla Cream Frappe',
        'Cucumber Lemonade',
        'Cucumber Lemonade (Glass)',
        'Cucumber Lemonade (Pitcher)',
        'Blue Lemonade',
        'Blue Lemonade (Glass)',
        'Blue Lemonade (Pitcher)',
        'Red Tea',
        'Red Tea (Glass)',
        'Red Tea Tall',
        'Red Tea (Tall)',
        'Red Tea Glass',
        'Red Tea (L)',
        'Calamansi Juice (Glass)',
        'Calamansi Juice (Pitcher)',
        'Milk Tea Regular HC',
        'Milk Tea Regular MC',
        'Milk Tea Regular HC (Glass)',
        'Milk Tea Regular HC (Large)',
        'Milk Tea Regular HC Regular MC',
        'Matcha Green Tea HC',
        'Matcha Green Tea MC',
        'Matcha Green Tea (Glass)',
        'Matcha Green Tea (L)',
        'Cookies & Cream HC',
        'Cookies & Cream MC',
        'Cookies and Cream MC',
        'Cookies & Cream (Glass)',
        'Cookies & Cream (L)',
        'Strawberry & Cream HC',
        'Strawberry and Cream MC',
        'Strawberry & Cream (Glass)',
        'Strawberry & Cream (L)',
        'Mango cheese cake HC',
        'Mango cheese cake MC',
        'Soda (Glass)',
        'Soda (Mismo)',
        'Soda (L)',
        'Iced Cafe Latte',
        'Iced Mocha Latte',
        'Iced Vanilla Latte',
        'Iced Caramel Macchiato',
        'Iced White Chocolate Latte',
        'Iced Dark Chocolate',
        'Matcha Green Tea Frappe',
        'Salted Caramel Frappe',
        'Strawberry Cheesecake Frappe',
        'Mango Cheesecake Frappe',
        'Strawberry Cream Frappe',
        'Cookies & Cream Frappe',
        'Rocky Road Frappe (Premium)',
        'Choco Fudge Frappe (Regular)',
        'Choco Mousse Frappe Regular',
        'Coffee Crumble Frappe',
        'Vanilla Cream Frappe'
    ],

    'Napkins': [
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
        'Cheesy Nachos',
        'Cheesy Nachos (Small)',
        'Cheesy Nachos (Medium)',
        'Cheesy Nachos (Large)',
        'Nachos Supreme',
        'Nachos Supreme (Small)',
        'Nachos Supreme (Medium)',
        'Nachos Supreme (Large)',
        'French Fries',
        'French Fries (Small)',
        'French Fries (Medium)',
        'French Fries (Large)',
        'Clubhouse Sandwich',
        'Fish and Fries',
        'Cheesy Dynamite Lumpia',
        'Lumpia Shanghai (S)',
        'Lumpia Shanghai (M)',
        'Tinapa Rice',
        'Tinapa Rice (Small)',
        'Tinapa Rice (Medium)',
        'Tinapa Rice (Large)',
        'Tuyo Pesto',
        'Tuyo Pesto (Small)',
        'Tuyo Pesto (Medium)',
        'Tuyo Pesto (Large)',
        'Sinigang (Pork)',
        'Sinigang (Shrimp)',
        'Paknet (Pakbet w/ Bagnet)',
        'Buttered Shrimp',
        'Special Bulalo',
        'Special Bulalo (good for 2-3 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)',
        'Pancit Bihon',
        'Pancit Bihon (S)',
        'Pancit Bihon (M)',
        'Pancit Bihon (L)',
        'Pancit Canton + Bihon (Mixed)',
        'Pancit Canton (S)',
        'Pancit Canton (M)',
        'Pancit Canton (L)',
        'Spaghetti',
        'Spaghetti (S)',
        'Spaghetti (M)',
        'Spaghetti (L)',
        'Fried Rice',
        'Fried Rice (Small)',
        'Fried Rice (Medium)',
        'Fried Rice (Large)',
        'Plain Rice',
        'Plain Rice (Small)',
        'Plain Rice (Medium)',
        'Plain Rice (Large)'
    ],

    'Food containers': [
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
        'Pancit Bihon',
        'Pancit Canton + Bihon (Mixed)',
        'Cheesy Nachos',
        'Cheesy Nachos (Small)',
        'Cheesy Nachos (Medium)',
        'Cheesy Nachos (Large)',
        'Nachos Supreme',
        'Nachos Supreme (Small)',
        'Nachos Supreme (Medium)',
        'Nachos Supreme (Large)',
        'French Fries',
        'French Fries (Small)',
        'French Fries (Medium)',
        'French Fries (Large)',
        'Clubhouse Sandwich',
        'Fish and Fries',
        'Cheesy Dynamite Lumpia',
        'Lumpia Shanghai (S)',
        'Lumpia Shanghai (M)',
        'Fried Rice',
        'Fried Rice (Small)',
        'Fried Rice (Medium)',
        'Fried Rice (Large)',
        'Plain Rice',
        'Plain Rice (Small)',
        'Plain Rice (Medium)',
        'Plain Rice (Large)',
        'Tinapa Rice',
        'Tinapa Rice (Small)',
        'Tinapa Rice (Medium)',
        'Tinapa Rice (Large)',
        'Tuyo Pesto',
        'Tuyo Pesto (Small)',
        'Tuyo Pesto (Medium)',
        'Tuyo Pesto (Large)',
        'Sinigang (Pork)',
        'Sinigang (Shrimp)',
        'Paknet (Pakbet w/ Bagnet)',
        'Buttered Shrimp',
        'Special Bulalo',
        'Special Bulalo (good for 2-3 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)'
    ],

    'Pitcher': [
        'Cucumber Lemonade (Pitcher)',
        'Blue Lemonade (Pitcher)',
        'Red Tea (Pitcher)',
        'Calamansi Juice (Pitcher)'
    ],
    'Plastic bottle': [
        'Soda (Mismo)',
        'Soda (Mismo) Coke',
        'Soda (Mismo) Sprite',
        'Soda (Mismo) Royal',
        'Soda 1.5L',
        'Soda 1.5L Coke',
        'Soda 1.5L Coke Zero',
        'Soda 1.5L Sprite',
        'Soda 1.5L Royal'
    ],

    // ================ MENU ITEM ALIASES ================
    'Cafe Americano': [
        'Espresso',
        'Hot water',
        'Plastic Cups',
        'Lid',
        'Sleeve'
    ],
    'Cafe Americano Tall': [
        'Espresso',
        'Hot water',
        'Plastic Cups',
        'Lid',
        'Sleeve'
    ],
    'Cafe Americano Grande': [
        'Espresso',
        'Hot water',
        'Plastic Cups',
        'Lid',
        'Sleeve'
    ],
    'Cafe Americano (Glass)': [
        'Espresso',
        'Hot water',
        'Plastic Cups',
        'Lid',
        'Sleeve'
    ],
    'Cafe Americano (L)': [
        'Espresso',
        'Hot water',
        'Plastic Cups',
        'Lid',
        'Sleeve'
    ],
    'Cafe Latte': [
        'Espresso',
        'Steamed milk',
        'Vanilla syrup',
        'Plastic Cups',
        'Lid',
        'Sleeve'
    ],
    'Cafe Latte Tall': [
        'Espresso',
        'Steamed milk',
        'Vanilla syrup',
        'Plastic Cups',
        'Lid',
        'Sleeve'
    ],
    'Cafe Latte Grande': [
        'Espresso',
        'Steamed milk',
        'Vanilla syrup',
        'Plastic Cups',
        'Lid',
        'Sleeve'
    ],
    'Cafe Latte (Glass)': [
        'Espresso',
        'Steamed milk',
        'Vanilla syrup',
        'Plastic Cups',
        'Lid',
        'Sleeve'
    ],
    'Cafe Latte (L)': [
        'Espresso',
        'Steamed milk',
        'Vanilla syrup',
        'Plastic Cups',
        'Lid',
        'Sleeve'
    ],
    'Caramel Macchiato': [
        'Espresso',
        'Steamed milk',
        'Caramel syrup',
        'Vanilla syrup',
        'Plastic Cups',
        'Lid',
        'Sleeve'
    ],
    'Caramel Macchiato Tall': [
        'Espresso',
        'Steamed milk',
        'Caramel syrup',
        'Vanilla syrup',
        'Plastic Cups',
        'Lid',
        'Sleeve'
    ],
    'Caramel Macchiato Grande': [
        'Espresso',
        'Steamed milk',
        'Caramel syrup',
        'Vanilla syrup',
        'Plastic Cups',
        'Lid',
        'Sleeve'
    ],
    'Caramel Macchiato (Glass)': [
        'Espresso',
        'Steamed milk',
        'Caramel syrup',
        'Vanilla syrup',
        'Plastic Cups',
        'Lid',
        'Sleeve'
    ],
    'Caramel Macchiato (L)': [
        'Espresso',
        'Steamed milk',
        'Caramel syrup',
        'Vanilla syrup',
        'Plastic Cups',
        'Lid',
        'Sleeve'
    ],
    'Red Tea': [
        'Black tea',
        'Hot water',
        'Honey',
        'Sugar',
        'Plastic Cups',
        'Straws'
    ],
    'Red Tea Tall': [
        'Black tea',
        'Hot water',
        'Honey',
        'Sugar',
        'Plastic Cups',
        'Straws'
    ],
    'Red Tea (Tall)': [
        'Black tea',
        'Hot water',
        'Honey',
        'Sugar',
        'Plastic Cups',
        'Straws'
    ],
    'Red Tea Glass': [
        'Black tea',
        'Hot water',
        'Honey',
        'Sugar',
        'Plastic Cups',
        'Straws'
    ],
    'Red Tea (Glass)': [
        'Black tea',
        'Hot water',
        'Honey',
        'Sugar',
        'Plastic Cups',
        'Straws'
    ],
    'Red Tea (L)': [
        'Black tea',
        'Hot water',
        'Honey',
        'Sugar',
        'Plastic Cups',
        'Straws'
    ],
    'Milk Tea Regular HC': [
        'tea',
        'Milk',
        'Sugar',
        'Tapioca pearls',
        'Plastic Cups',
        'Boba straws',
        'Ice'
    ],
    'Milk Tea Regular HC Tall': [
        'tea',
        'Milk',
        'Sugar',
        'Tapioca pearls',
        'Plastic Cups',
        'Boba straws',
        'Ice'
    ],
    'Milk Tea Regular HC Regular': [
        'tea',
        'Milk',
        'Sugar',
        'Tapioca pearls',
        'Plastic Cups',
        'Boba straws',
        'Ice'
    ],
    'Milk Tea Regular HC Large': [
        'tea',
        'Milk',
        'Sugar',
        'Tapioca pearls',
        'Plastic Cups',
        'Boba straws',
        'Ice'
    ],
    'Milk Tea Regular HC (Glass)': [
        'Tea',
        'Milk',
        'Sugar',
        'Tapioca pearls',
        'Plastic Cups',
        'Boba straws',
        'Ice'
    ],
    'Milk Tea Regular HC (Large)': [
        'Tea',
        'Milk',
        'Sugar',
        'Tapioca pearls',
        'Plastic Cups',
        'Boba straws',
        'Ice'
    ],
    'Milk Tea Regular HC Regular MC': [
        'tea',
        'Milk',
        'Sugar',
        'Tapioca pearls',
        'Plastic Cups',
        'Boba straws',
        'Ice'
    ],
    'Milk Tea Regular MC': [
        'tea',
        'Milk',
        'Sugar',
        'Tapioca pearls',
        'Plastic Cups',
        'Boba straws',
        'Ice'
    ],
    'Matcha': [
        'Matcha powder',
        'Hot water',
        'Milk',
        'Sugar'
    ],
    'Matcha Green Tea': [
        'Matcha powder',
        'Hot water',
        'Milk',
        'Sugar'
    ],
    'Matcha Green Tea Tall': [
        'Matcha powder',
        'Hot water',
        'Milk',
        'Sugar'
    ],
    'Matcha Green Tea HC': [
        'Matcha powder',
        'Hot water',
        'Milk',
        'Sugar'
    ],
    'Matcha Green Tea MC': [
        'Matcha powder',
        'Hot water',
        'Milk',
        'Sugar'
    ],
    'Matcha Green Tea (Glass)': [
        'Matcha powder',
        'Hot water',
        'Milk',
        'Sugar'
    ],
    'Matcha Green Tea (L)': [
        'Matcha powder',
        'Hot water',
        'Milk',
        'Sugar'
    ],
    'Matcha Green Tea (HC)': [
        'Matcha powder',
        'Hot water',
        'Milk',
        'Sugar'
    ],
    'Matcha Regular HC': [
        'Matcha powder',
        'Hot water',
        'Milk',
        'Sugar'
    ],
    'Cookies & Cream HC': [
        'Milk',
        'Cream',
        'Cookie crumbs',
        'Ice',
        'Sugar',
        'Frappe base',
        'Whipped cream',
        'Chocolate syrup',
        'Plastic Cups',
        'Boba straws'
    ],
    'Cookies & Cream MC': [
        'Milk',
        'Cream',
        'Cookie crumbs',
        'Ice',
        'Sugar',
        'Frappe base',
        'Whipped cream',
        'Chocolate syrup',
        'Plastic Cups',
        'Boba straws'
    ],
    'Cookies and Cream MC': [
        'Milk',
        'Cream',
        'Cookie crumbs',
        'Ice',
        'Sugar',
        'Frappe base',
        'Whipped cream',
        'Chocolate syrup',
        'Plastic Cups',
        'Boba straws'
    ],
    'Cookies & Cream (Glass)': [
        'Milk',
        'Cream',
        'Cookie crumbs',
        'Tapioca pearls',
        'Sugar',
        'Plastic Cups',
        'Boba straws'
    ],
    'Cookies & Cream (L)': [
        'Milk',
        'Cream',
        'Cookie crumbs',
        'Tapioca pearls',
        'Sugar',
        'Plastic Cups',
        'Boba straws'
    ],
    'Strawberry & Cream HC': [
        'Milk',
        'Cream',
        'Strawberry syrup',
        'Ice',
        'Sugar',
        'Frappe base',
        'Whipped cream',
        'Plastic Cups',
        'Boba straws'
    ],
    'Strawberry and Cream MC': [
        'Milk',
        'Cream',
        'Strawberry syrup',
        'Ice',
        'Sugar',
        'Frappe base',
        'Whipped cream',
        'Plastic Cups',
        'Boba straws'
    ],
    'Strawberry & Cream (Glass)': [
        'Milk',
        'Cream',
        'Strawberry syrup',
        'Tapioca pearls',
        'Sugar',
        'Plastic Cups',
        'Boba straws'
    ],
    'Strawberry & Cream (L)': [
        'Milk',
        'Cream',
        'Strawberry syrup',
        'Tapioca pearls',
        'Sugar',
        'Plastic Cups',
        'Boba straws'
    ],
    'Mango cheese cake HC': [
        'Milk',
        'Cream',
        'Mango flavor',
        'Cream cheese flavor',
        'Ice',
        'Sugar',
        'Frappe base',
        'Whipped cream',
        'Tapioca pearls',
        'Plastic Cups'
    ],
    'Mango cheese cake MC': [
        'Milk',
        'Cream',
        'Mango flavor',
        'Cream cheese flavor',
        'Ice',
        'Sugar',
        'Frappe base',
        'Whipped cream',
        'Tapioca pearls',
        'Plastic Cups'
    ],
    'Blue Lemonade (Glass)': [
        'Lemon juice',
        'Blue syrup',
        'Plastic Cups',
        'Straws'
    ],
    'Blue Lemonade (L)': [
        'Lemon juice',
        'Blue syrup',
        'Plastic Cups',
        'Straws'
    ],
    'Blue Lemonade (Pitcher)': [
        'Lemon juice',
        'Blue syrup',
        'Pitcher',
        'Ice',
        'Straws'
    ],
    'Cucumber Lemonade (Glass)': [
        'Lemon juice',
        'Cucumber',
        'Honey',
        'Sugar',
        'Plastic Cups',
        'Straws'
    ],
    'Cucumber Lemonade (L)': [
        'Lemon juice',
        'Cucumber',
        'Honey',
        'Sugar',
        'Plastic Cups',
        'Straws'
    ],
    'Cucumber Lemonade (Pitcher)': [
        'Lemon juice',
        'Cucumber',
        'Honey',
        'Sugar',
        'Pitcher',
        'Ice',
        'Straws'
    ],
    'Soda (Glass)': [
        'Carbonated water',
        'Ice',
        'Plastic Cups'
    ],
    'Soda (Mismo)': [
        'Carbonated water',
        'Ice',
        'Plastic bottle'
    ],
    'Soda (L)': [
        'Carbonated water',
        'Ice',
        'Plastic Cups'
    ],
    'Soda 1.5L': [
        'Carbonated water',
        'Plastic bottle'
    ],

    // ================ TRAY VARIANTS ================
    'Tray (S)': [
        'Pancit Canton (S)',
        'Spaghetti (S)',
        'Pancit Bihon (S)'
    ],
    'Tray (M)': [
        'Pancit Canton (M)',
        'Spaghetti (M)',
        'Pancit Bihon (M)'
    ],
    'Tray (L)': [
        'Pancit Canton (L)',
        'Spaghetti (L)',
        'Pancit Bihon (L)'
    ],

    // ================ PANCIT & SPAGHETTI VARIANTS ================
    'Pancit Bihon (S)': [
        'Garlic',
        'Onion',
        'Carrots',
        'pancit bihon',
        'Soy sauce',
        'Oyster sauce',
        'Cooking oil',
        'Salt',
        'Black pepper',
        'Tray (S)'
    ],
    'Pancit Bihon (M)': [
        'Garlic',
        'Onion',
        'Carrots',
        'pancit bihon',
        'Soy sauce',
        'Oyster sauce',
        'Cooking oil',
        'Salt',
        'Black pepper',
        'Tray (M)'
    ],
    'Pancit Bihon (L)': [
        'Garlic',
        'Onion',
        'Carrots',
        'pancit bihon',
        'Soy sauce',
        'Oyster sauce',
        'Cooking oil',
        'Salt',
        'Black pepper',
        'Tray (L)'
    ],
    'Pancit Canton (S)': [
        'Pancit canton',
        'Garlic',
        'Onion',
        'Carrots',
        'Soy sauce',
        'Oyster sauce',
        'Cooking oil',
        'Salt',
        'Black pepper',
        'Tray (S)'
    ],
    'Pancit Canton (M)': [
        'Pancit canton',
        'Garlic',
        'Onion',
        'Carrots',
        'Soy sauce',
        'Oyster sauce',
        'Cooking oil',
        'Salt',
        'Black pepper',
        'Tray (M)'
    ],
    'Pancit Canton (L)': [
        'Pancit canton',
        'Garlic',
        'Onion',
        'Carrots',
        'Soy sauce',
        'Oyster sauce',
        'Cooking oil',
        'Salt',
        'Black pepper',
        'Tray (L)'
    ],
    'Pancit Canton + Bihon (Mixed)': [
        'Garlic',
        'Onion',
        'Carrots',
        'Pancit canton',
        'pancit bihon',
        'Soy sauce',
        'Oyster sauce',
        'Cooking oil',
        'Salt',
        'Black pepper'
    ],
    'Pancit Canton + Bihon (Mixed) (S)': [
        'Garlic',
        'Onion',
        'Carrot',
        'Pancit canton',
        'pancit bihon',
        'Soy sauce',
        'Oyster sauce',
        'Cooking oil',
        'Salt',
        'Black pepper',
        'Tray (S)'
    ],
    'Pancit Canton + Bihon (Mixed) (M)': [
        'Garlic',
        'Onion',
        'Carrot',
        'Pancit canton',
        'pancit bihon',
        'Soy sauce',
        'Oyster sauce',
        'Cooking oil',
        'Salt',
        'Black pepper',
        'Tray (M)'
    ],
    'Pancit Canton + Bihon (Mixed) (L)': [
        'Garlic',
        'Onion',
        'Carrot',
        'Pancit canton',
        'pancit bihon',
        'Soy sauce',
        'Oyster sauce',
        'Cooking oil',
        'Salt',
        'Black pepper',
        'Tray (L)'
    ],
    'Spaghetti (Filipino Style)': [
        'Spaghetti pasta',
        'Garlic',
        'Onion',
        'Tomato',
        'Sweet tomato sauce',
        'Cooking oil',
        'Salt',
        'Sugar'
    ],
    'Spaghetti (Filipino Style) (S)': [
        'Spaghetti pasta',
        'Garlic',
        'Onion',
        'Tomato',
        'Sweet tomato sauce',
        'Cooking oil',
        'Salt',
        'Sugar',
        'Tray (S)'
    ],
    'Spaghetti (Filipino Style) (M)': [
        'Spaghetti pasta',
        'Garlic',
        'Onion',
        'Tomato',
        'Sweet tomato sauce',
        'Cooking oil',
        'Salt',
        'Sugar',
        'Tray (M)'
    ],
    'Spaghetti (Filipino Style) (L)': [
        'Spaghetti pasta',
        'Garlic',
        'Onion',
        'Tomato',
        'Sweet tomato sauce',
        'Cooking oil',
        'Salt',
        'Sugar',
        'Tray (L)'
    ],
    'Spaghetti (S)': [
        'Spaghetti pasta',
        'Sweet tomato sauce',
        'Ground meat',
        'Hotdog',
        'Cheese',
        'Garlic',
        'Onion',
        'Cooking oil',
        'Tray (S)'
    ],
    'Spaghetti (M)': [
        'Spaghetti pasta',
        'Sweet tomato sauce',
        'Ground meat',
        'Hotdog',
        'Cheese',
        'Garlic',
        'Onion',
        'Cooking oil',
        'Tray (M)'
    ],
    'Spaghetti (L)': [
        'Spaghetti pasta',
        'Sweet tomato sauce',
        'Ground meat',
        'Hotdog',
        'Cheese',
        'Garlic',
        'Onion',
        'Cooking oil',
        'Tray (L)'
    ],

    // ================ RICE VARIANTS ================
    'Plain Rice (Small)': [
        'Rice',
        'Salt',
        'Water'
    ],
    'Plain Rice (Medium)': [
        'Rice',
        'Salt',
        'Water'
    ],
    'Plain Rice (Large)': [
        'Rice',
        'Salt',
        'Water'
    ],
    'Fried Rice (Small)': [
        'Rice',
        'Egg',
        'Garlic',
        'Onion',
        'Sesame oil',
        'Soy sauce',
        'Sugar',
        'Cooking oil'
    ],
    'Fried Rice (Medium)': [
        'Rice',
        'Egg',
        'Garlic',
        'Onion',
        'Sesame oil',
        'Soy sauce',
        'Sugar',
        'Cooking oil'
    ],
    'Fried Rice (Large)': [
        'Rice',
        'Egg',
        'Garlic',
        'Onion',
        'Sesame oil',
        'Soy sauce',
        'Sugar',
        'Cooking oil'
    ],

    // ================ SNACK VARIANTS ================
    'French Fries (Small)': [
        'French fries',
        'Salt',
        'Cooking oil'
    ],
    'French Fries (Medium)': [
        'French fries',
        'Salt',
        'Cooking oil'
    ],
    'French Fries (Large)': [
        'French fries',
        'Salt',
        'Cooking oil'
    ],
    'Cheesy Nachos (Small)': [
        'Nacho chips',
        'Cheese sauce',
        'Onion',
        'Cooking oil'
    ],
    'Cheesy Nachos (Medium)': [
        'Nacho chips',
        'Cheese sauce',
        'Onion',
        'Cooking oil'
    ],
    'Cheesy Nachos (Large)': [
        'Nacho chips',
        'Cheese sauce',
        'Onion',
        'Cooking oil'
    ],
    'Nachos Supreme (Small)': [
        'Nacho chips',
        'Cheese sauce',
        'Onion',
        'Cheese',
        'Cooking oil'
    ],
    'Nachos Supreme (Medium)': [
        'Nacho chips',
        'Cheese sauce',
        'Onion',
        'Cheese',
        'Cooking oil'
    ],
    'Nachos Supreme (Large)': [
        'Nacho chips',
        'Cheese sauce',
        'Onion',
        'Cheese',
        'Cooking oil'
    ],

    // ================ RICE MEAL VARIANTS ================
    'Tinapa Rice (Small)': [
        'Rice',
        'Tinapa',
        'Salt',
        'Cooking oil'
    ],
    'Tinapa Rice (Medium)': [
        'Rice',
        'Tinapa',
        'Salt',
        'Cooking oil'
    ],
    'Tinapa Rice (Large)': [
        'Rice',
        'Tinapa',
        'Salt',
        'Cooking oil'
    ],
    'Tuyo Pesto (Small)': [
        'Rice',
        'Tuyo',
        'Shrimp paste',
        'Lemon juice',
        'Cooking oil'
    ],
    'Tuyo Pesto (Medium)': [
        'Rice',
        'Tuyo',
        'Shrimp paste',
        'Lemon juice',
        'Cooking oil'
    ],
    'Tuyo Pesto (Large)': [
        'Rice',
        'Tuyo',
        'Shrimp paste',
        'Lemon juice',
        'Cooking oil'
    ],

    // ================ ADDITIONAL MENU ITEMS ================
    'Creamy Carbonara': [
        'Spaghetti pasta',
        'Bacon',
        'Cream',
        'Milk',
        'Cheese',
        'Egg',
        'Garlic',
        'Butter',
        'Black pepper'
    ],
    'Kare-Kare': [
        'Oxtail',
        'Banana flower bud',
        'Pechay',
        'String beans',
        'Eggplant',
        'Ground peanuts',
        'Peanut butter',
        'Shrimp paste',
        'Water',
        'Annatto oil',
        'Toasted ground rice',
        'Garlic',
        'Onion',
        'Salt',
        'Pepper'
    ],
    'Chicken Buffalo Wings': [
        'Chicken Wings',
        'Flour',
        'Cornstarch',
        'Buffalo sauce',
        'Butter',
        'Garlic',
        'Cooking oil',
        'Salt',
        'Black pepper'
    ],
    'Chicken Buffalo Wings (S)': [
        'Chicken',
        'Flour',
        'Cornstarch',
        'Butter',
        'Garlic',
        'Cooking Oil',
        'Salt',
        'Black Pepper',
        'Plates',
        'Napkins',
        'Plastic Utensils Set'
    ],
    'Chicken Buffalo Wings (M)': [
        'Chicken',
        'Flour',
        'Cornstarch',
        'Butter',
        'Garlic',
        'Cooking Oil',
        'Salt',
        'Black Pepper',
        'Plates',
        'Napkins',
        'Plastic Utensils Set'
    ],
    'Chicken Buffalo Wings (L)': [
        'Chicken',
        'Flour',
        'Cornstarch',
        'Butter',
        'Garlic',
        'Cooking Oil',
        'Salt',
        'Black Pepper',
        'Plates',
        'Napkins',
        'Plastic Utensils Set'
    ],
    'Caramel Milk Tea': [
        'Black tea',
        'Milk',
        'Caramel syrup',
        'Sugar',
        'Tapioca pearls',
        'Ice',
        'Plastic Cups',
        'Boba straws'
    ],
    'Cookies & Cream Milk Tea': [
        'Black tea',
        'Milk',
        'Cookie crumbs',
        'Sugar',
        'Tapioca pearls',
        'Ice',
        'Plastic Cups',
        'Boba straws'
    ],
    'Dark Choco Milk Tea': [
        'Black tea',
        'Milk',
        'Chocolate syrup',
        'Sugar',
        'Tapioca pearls',
        'Ice',
        'Plastic Cups',
        'Boba straws'
    ],
    'Okinawa Milk Tea': [
        'Black tea',
        'Milk',
        'Okinawa syrup',
        'Sugar',
        'Tapioca pearls',
        'Ice',
        'Plastic Cups',
        'Boba straws'
    ],
    'Wintermelon Milk Tea': [
        'Wintermelon syrup',
        'Milk',
        'Sugar',
        'Tapioca pearls',
        'Ice',
        'Plastic Cups',
        'Boba straws'
    ],
    'Matcha Green Tea Milk Tea': [
        'Matcha powder',
        'Milk',
        'Sugar',
        'Tapioca pearls',
        'Ice',
        'Plastic Cups',
        'Boba straws'
    ],
    'Espresso Hot': [
        'Coffee beans',
        'Water',
        'Plastic Cups'
    ],
    'Cappuccino Hot': [
        'Espresso',
        'Steamed milk',
        'Milk foam',
        'Plastic Cups'
    ],
    'Mocha Latte Hot': [
        'Espresso',
        'Chocolate syrup',
        'Steamed milk',
        'Plastic Cups'
    ],
    'Vanilla Latte Hot': [
        'Espresso',
        'Vanilla syrup',
        'Steamed milk',
        'Plastic Cups'
    ],
    'Caramel Macchiato Hot': [
        'Espresso',
        'Milk',
        'Vanilla syrup',
        'Caramel sauce',
        'Hot water'
    ],
    'Green Tea Latte Hot': [
        'Matcha powder',
        'Steamed milk',
        'Sugar',
        'Plastic Cups'
    ],
    'White Chocolate Hot': [
        'White chocolate syrup',
        'Steamed milk',
        'Cream',
        'Plastic Cups'
    ],
    'Green Tea Matcha Hot': [
        'Matcha powder',
        'Steamed milk',
        'Sugar',
        'Plastic Cups'
    ],
    'Hot Ceylon Tea Black': [
        'Black tea',
        'Hot water',
        'Sugar',
        'Plastic Cups'
    ],
    'Hot Ceylon Tea Lemon': [
        'Black tea',
        'Lemon',
        'Hot water',
        'Sugar',
        'Plastic Cups'
    ],
    'Hot Ceylon Tea Peppermint': [
        'Peppermint tea',
        'Hot water',
        'Honey',
        'Plastic Cups'
    ],
    'Iced Cafe Latte': [
        'Espresso',
        'Milk',
        'Ice',
        'Sugar',
        'Plastic Cups',
        'Straws'
    ],
    'Iced Mocha Latte': [
        'Espresso',
        'Chocolate syrup',
        'Milk',
        'Ice',
        'Sugar',
        'Plastic Cups',
        'Straws'
    ],
    'Iced Vanilla Latte': [
        'Espresso',
        'Vanilla syrup',
        'Milk',
        'Ice',
        'Plastic Cups',
        'Straws'
    ],
    'Iced Caramel Macchiato': [
        'Espresso',
        'Vanilla syrup',
        'Caramel syrup',
        'Milk',
        'Ice',
        'Plastic Cups',
        'Straws'
    ],
    'Iced White Chocolate Latte': [
        'White chocolate syrup',
        'Milk',
        'Ice',
        'Plastic Cups',
        'Straws'
    ],
    'Iced Dark Chocolate': [
        'Dark chocolate syrup',
        'Milk',
        'Ice',
        'Plastic Cups',
        'Straws'
    ],
    'Matcha Green Tea Frappe': [
        'Matcha powder',
        'Milk',
        'Ice cream',
        'Ice',
        'Sugar',
        'Whipped cream',
        'Plastic Cups',
        'Boba straws'
    ],
    'Salted Caramel Frappe': [
        'Coffee',
        'Caramel syrup',
        'Milk',
        'Ice cream',
        'Ice',
        'Sugar',
        'Salt',
        'Whipped cream',
        'Plastic Cups',
        'Boba straws'
    ],
    'Strawberry Cheesecake Frappe': [
        'Strawberry syrup',
        'Cream cheese',
        'Milk',
        'Ice cream',
        'Ice',
        'Sugar',
        'Whipped cream',
        'Graham crumbs',
        'Plastic Cups',
        'Boba straws'
    ],
    'Mango Cheesecake Frappe': [
        'Mango puree',
        'Cream cheese',
        'Milk',
        'Ice cream',
        'Ice',
        'Sugar',
        'Whipped cream',
        'Graham crumbs',
        'Plastic Cups',
        'Boba straws'
    ],
    'Strawberry Cream Frappe': [
        'Strawberry syrup',
        'Milk',
        'Ice cream',
        'Ice',
        'Sugar',
        'Whipped cream',
        'Plastic Cups',
        'Boba straws'
    ],
    'Cookies & Cream Frappe': [
        'Coffee',
        'Cookie crumbs',
        'Milk',
        'Ice cream',
        'Ice',
        'Sugar',
        'Whipped cream',
        'Chocolate syrup',
        'Plastic Cups',
        'Boba straws',
    ],
    'Rocky Road Frappe (Premium)': [
        'Chocolate syrup',
        'Milk',
        'Ice cream',
        'Ice',
        'Sugar',
        'Marshmallows',
        'Nuts',
        'Whipped cream',
        'Plastic Cups',
        'Boba straws'
    ],
    'Choco Fudge Frappe (Regular) (Regular)': [
        'Chocolate syrup',
        'Milk',
        'Ice cream',
        'Ice',
        'Sugar',
        'Whipped cream',
        'Chocolate sauce',
        'Plastic Cups',
        'Boba straws'
    ],
    'Choco Mousse Frappe Regular ': [
        'Chocolate syrup',
        'Chocolate mousse',
        'Milk',
        'Ice',
        'Sugar',
        'Whipped cream',
        'Plastic Cups',
        'Boba straws'
    ],
    'Coffee Crumble Frappe': [
        'Coffee',
        'Milk',
        'Ice cream',
        'Ice',
        'Cookie crumbs',
        'Sugar',
        'Whipped cream',
        'Plastic Cups',
        'Boba straws'
    ],
    'Chocolate Coffee Frappe': [
        'Chocolate Coffee Beans',
        'Milk',
        'Ice cream',
        'Ice',
        'Sugar',
        'Whipped cream',
        'Plastic Cups',
        'Boba straws'
    ],
    'Chocolate Coffee Crumbles Frappe': [
        'Chocolate Coffee Beans',
        'Milk',
        'Ice cream',
        'Ice',
        'Cookie crumbs',
        'Sugar',
        'Whipped cream',
        'Plastic Cups',
        'Boba straws'
    ],
    'Vanilla Cream Frappe': [
        'Vanilla syrup',
        'Milk',
        'Ice cream',
        'Ice',
        'Whipped cream',
        'Plastic Cups',
        'Boba straws'
    ],

    'Oxtail ': [
        'Kare-Kare'
    ],

    'Peanut butter': [
        'Kare-Kare'
    ],

    'Tripe': [
        'Kare-Kare'
    ],

    'Bagoong': [
        'Kare-Kare'
    ],

    'Banana flower bud': [
        'Kare-Kare'
    ],

    'Pechay': [
        'Kare-Kare'
    ],

    'String beans': [
        'Kare-Kare'
    ],

    'Eggplant': [
        'Kare-Kare'
    ],

    'Ground peanuts': [
        'Kare-Kare'
    ],

    'Shrimp paste': [
        'Kare-Kare',
        'Sinigang (Shrimp)',
        'Paknet (Pakbet w/ Bagnet)'
    ],

    'Annatto oil': [
        'Kare-Kare'
    ],

    'Toasted ground rice': [
        'Kare-Kare'
    ],

    'Pepper': [
        'Kare-Kare'
    ],

    'Water': [
        'Kare-Kare',
        'Special Bulalo',
        'Special Bulalo (good for 2-3 Persons)',
        'Special Bulalo Buy 1 Take 1 (good for 6-8 Persons)',
        'Sinigang (Pork)',
        'Sinigang (Shrimp)',
        'Paknet (Pakbet w/ Bagnet)',
        'Fried Rice',
        'Fried Rice (Small)',
        'Fried Rice (Medium)',
        'Fried Rice (Large)',
        'Plain Rice',
        'Plain Rice (Small)',
        'Plain Rice (Medium)',
        'Plain Rice (Large)',
        'Cucumber Lemonade',
        'Cucumber Lemonade (Glass)',
        'Cucumber Lemonade (Pitcher)',
        'Blue Lemonade',
        'Blue Lemonade (Glass)',
        'Blue Lemonade (Pitcher)',
        'Red Tea',
        'Red Tea (Glass)',
        'Red Tea Tall',
        'Red Tea (Tall)',
        'Red Tea Glass',
        'Red Tea (L)',
        'Calamansi Juice (Glass)',
        'Calamansi Juice (Pitcher)',
        'Cafe Americano',
        'Cafe Americano Tall',
        'Cafe Americano (Glass)',
        'Cafe Americano (L)',
        'Matcha Green Tea Milk Tea',
        'Matcha Green Tea Milk Tea (Glass)',
        'Matcha Green Tea Milk Tea (L)',
        'Matcha Green Tea Milk Tea HC',
        'Matcha Green Tea Milk Tea MC',
        'Spaghetti (S)',
        'Spaghetti (M)',
        'Spaghetti (L)',
    ],

    'Caramel syrup': [
        'Caramel Macchiato',
        'Caramel Macchiato Tall',
        'Caramel Macchiato Grande',
        'Caramel Macchiato (Glass)',
        'Caramel Macchiato (L)',
        'Caramel Milk Tea',
        'Iced Caramel Macchiato'
    ],

    'Collins Glass': [
        'Blue Lemonade (Glass)',
        'Cucumber Lemonade (Glass)',
        'Soda (Glass)',
        'Red Tea (Glass)',
        'Cafe Americano (Glass)',
        'Cafe Latte (Glass)',
        'Caramel Macchiato (Glass)',
        'Caramel Macchiato Glass',
        'Matcha Green Tea (Glass)',
        'Matcha Green Tea (Glass)',
        'Cookies & Cream (Glass)',
        'Strawberry & Cream (Glass)',
        'Blue Lemonade (Glass)',
        'Cucumber Lemonade (Glass)'
    ],

    // ================ SODAS & MISMO BEVERAGES ================
    'Soda 1.5L Coke': [
        'Soda 1.5L Coke'
    ],
    'Soda 1.5L Coke Zero': [
        'Soda 1.5L Coke Zero'
    ],
    'Soda 1.5L Sprite': [
        'Soda 1.5L Sprite'
    ],
    'Soda 1.5L Royal': [
        'Soda 1.5L Royal'
    ],
    'Soda (Mismo) Coke': [
        'Soda (Mismo) Coke'
    ],
    'Soda (Mismo) Sprite': [
        'Soda (Mismo) Sprite'
    ],
    'Soda (Mismo) Royal': [
        'Soda (Mismo) Royal'
    ],

    
};

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

console.log(`✅ reverseRecipeMapping created with ${Object.keys(reverseRecipeMapping).length} dishes`);
console.log(`📦 Sample dishes:`, Object.keys(reverseRecipeMapping).slice(0, 20));

class HelperFunctions {
    static generateCustomerId() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let id = 'CUST-';
        for (let i = 0; i < 6; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }

    static generateOrderNumber(orderCount) {
        const today = new Date();
        const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
        return `ORD-${dateStr}-${(orderCount + 1).toString().padStart(4, '0')}`;
    }

    static formatDate(date) {
        return new Date(date).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    static getTodayDateRange() {
        
        const now = new Date();
        const phtOffset = 8 * 60 * 60 * 1000; 
        const phtNow = new Date(now.getTime() + phtOffset);
        
       
        const year = phtNow.getUTCFullYear();
        const month = phtNow.getUTCMonth();
        const date = phtNow.getUTCDate();
        
        const startOfDay = new Date(Date.UTC(year, month, date, 0, 0, 0, 0));
        const endOfDay = new Date(Date.UTC(year, month, date, 23, 59, 59, 999));
        
        const phtDisplay = startOfDay.toLocaleString('en-PH', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'Asia/Manila'
        });
        
        console.log(`⏰ Date Range (PHT): ${phtDisplay} to ${endOfDay.toLocaleString('en-PH', { 
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'Asia/Manila'
        })}`);
        console.log(`   UTC: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);
        
        return { startOfDay, endOfDay };
    }

    static generateReceipt(order, customer = null) {
        const orderTime = new Date(order.createdAt || new Date());
        const receiptId = order.orderNumber || `ORD-${Date.now()}`;
        
        return {
            businessName: BUSINESS_INFO.name,
            address: BUSINESS_INFO.address,
            city: BUSINESS_INFO.city,
            header: BUSINESS_INFO.receiptHeader,
            receiptNo: receiptId,
            date: orderTime.toLocaleDateString('en-PH'),
            time: orderTime.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
            customerId: customer ? customer.customerId : 'Walk-in',
            items: order.items || [],
            subtotal: order.subtotal || 0,
            tax: order.tax || 0,
            total: order.total || 0,
            paymentMethod: order.payment?.method || 'cash',
            amountPaid: order.payment?.amountPaid || 0,
            change: order.payment?.change || 0,
            cashier: order.cashier || 'System',
            footer: "Thank you for visiting G'RAY COUNTRYSIDE CAFÉ!",
            permitNo: BUSINESS_INFO.permitNo,
            vatRegNo: BUSINESS_INFO.vatRegNo
        };
    }

    static calculateVAT(subtotal) {
        const vatRate = 0.12;
        const vat = subtotal * vatRate;
        const net = subtotal - vat;
        return { vat, net };
    }
}

class RecipeManager {
    static async checkProductAvailability(productName) {
        try {
            const requiredIngredients = reverseRecipeMapping[productName];
            if (!requiredIngredients || requiredIngredients.length === 0) {
                return { 
                    available: true, 
                    reason: 'No recipe constraints',
                    requiredIngredients: [] 
                };
            }
            
            let allAvailable = true;
            const missingIngredients = [];
            const availableIngredients = [];
            
            for (const ingredient of requiredIngredients) {
                const inventoryItem = await InventoryItem.findOne({
                    itemName: { $regex: new RegExp(`^${ingredient}$`, 'i') },
                    itemType: 'raw',
                    isActive: true
                });
                
                if (!inventoryItem) {
                    allAvailable = false;
                    missingIngredients.push(`${ingredient} (not found in inventory)`);
                } else if (inventoryItem.currentStock <= 0) {
                    allAvailable = false;
                    missingIngredients.push(`${ingredient} (out of stock)`);
                } else {
                    availableIngredients.push({
                        ingredient,
                        currentStock: inventoryItem.currentStock,
                        minStock: inventoryItem.minStock
                    });
                }
            }
            
            return {
                available: allAvailable,
                missingIngredients,
                requiredIngredients,
                availableIngredients
            };
        } catch (error) {
            console.error('Error checking product availability:', error);
            return { 
                available: false, 
                error: error.message,
                requiredIngredients: [] 
            };
        }
    }

    static async updateRelatedMenuItems(rawIngredientName) {
        try {
            const possibleDishes = recipeMapping[rawIngredientName];
            if (!possibleDishes || possibleDishes.length === 0) return;
            
            for (const dish of possibleDishes) {
                const menuItem = await MenuItem.findOne({
                    itemName: { $regex: new RegExp(`^${dish}$`, 'i') }
                });
                
                if (menuItem) {
                    const availability = await this.checkProductAvailability(dish);
                    
                    if (availability.available && menuItem.status === 'out_of_stock') {
                        menuItem.status = 'available';
                        menuItem.updatedAt = new Date();
                        menuItem.requiredIngredients = availability.requiredIngredients || [];
                        await menuItem.save();
                        
                        const product = await Product.findOne({
                            itemName: { $regex: new RegExp(`^${dish}$`, 'i') }
                        });
                        
                        if (product) {
                            product.status = 'available';
                            await product.save();
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error updating related menu items:', error);
        }
    }

    static async checkAffectedMenuItems(rawIngredientName) {
        try {
            const possibleDishes = recipeMapping[rawIngredientName];
            if (!possibleDishes || possibleDishes.length === 0) return;
            
            const inventoryItem = await InventoryItem.findOne({
                itemName: { $regex: new RegExp(`^${rawIngredientName}$`, 'i') },
                itemType: 'raw'
            });
            
            if (!inventoryItem || inventoryItem.currentStock <= 0) {
                for (const dish of possibleDishes) {
                    const availability = await this.checkProductAvailability(dish);
                    
                    if (!availability.available) {
                        await MenuItem.findOneAndUpdate(
                            { itemName: { $regex: new RegExp(`^${dish}$`, 'i') } },
                            { 
                                status: 'out_of_stock',
                                updatedAt: new Date()
                            }
                        );
                        
                        await Product.findOneAndUpdate(
                            { itemName: { $regex: new RegExp(`^${dish}$`, 'i') } },
                            { status: 'out_of_stock' }
                        );
                    }
                }
            }
        } catch (error) {
            console.error('Error checking affected menu items:', error);
        }
    }

    static async getRecipeDetails(dishName) {
        try {
            const requiredIngredients = reverseRecipeMapping[dishName] || [];
            const ingredientDetails = [];
            
            for (const ingredient of requiredIngredients) {
                const inventoryItem = await InventoryItem.findOne({
                    itemName: { $regex: new RegExp(`^${ingredient}$`, 'i') },
                    itemType: 'raw'
                });
                
                ingredientDetails.push({
                    ingredient,
                    available: inventoryItem ? inventoryItem.currentStock > 0 : false,
                    currentStock: inventoryItem ? inventoryItem.currentStock : 0,
                    minStock: inventoryItem ? inventoryItem.minStock : 0,
                    unit: inventoryItem ? inventoryItem.unit : 'unit'
                });
            }
            
            return {
                dishName,
                requiredIngredients: ingredientDetails,
                totalIngredients: requiredIngredients.length,
                availableIngredients: ingredientDetails.filter(i => i.available).length
            };
        } catch (error) {
            console.error('Error getting recipe details:', error);
            return {
                dishName,
                requiredIngredients: [],
                totalIngredients: 0,
                availableIngredients: 0,
                error: error.message
            };
        }
    }
}

class DashboardStats {
    static async getStats() {
        try {
            console.log('📊 Calculating dashboard statistics...');
            const { startOfDay, endOfDay } = HelperFunctions.getTodayDateRange();
            
            const totalOrders = await Order.countDocuments({ status: 'completed' });
            console.log(`📦 Total Orders: ${totalOrders}`);
            
            const todaysOrders = await Order.countDocuments({ 
                status: 'completed',
                createdAt: { $gte: startOfDay, $lte: endOfDay }
            });
            console.log(`📦 Today's Orders: ${todaysOrders}`);
            
            const totalCustomers = await Customer.countDocuments();
            console.log(`👥 Total Customers: ${totalCustomers}`);
            
            const totalMenuItems = await MenuItem.countDocuments({ isActive: true });
            const availableMenuItems = await MenuItem.countDocuments({ 
                status: 'available', 
                isActive: true 
            });
            console.log(`🍽️ Total Menu Items: ${totalMenuItems}, Available: ${availableMenuItems}`);
            
            const totalInventoryItems = await InventoryItem.countDocuments();
            const inventoryLowStock = await InventoryItem.countDocuments({ 
                currentStock: { $gt: 0, $lt: CONFIG.LOW_STOCK_THRESHOLD }, 
                isActive: true 
            });
            const inventoryOutOfStock = await InventoryItem.countDocuments({ 
                currentStock: 0, 
                isActive: true 
            });
            console.log(`📦 Total Inventory: ${totalInventoryItems}, Low Stock: ${inventoryLowStock}, Out of Stock: ${inventoryOutOfStock}`);
            
            const topSellingProducts = await Order.aggregate([
                { $unwind: '$items' },
                { $group: { 
                    _id: { 
                        $cond: [
                            { $and: [
                                { $ne: ['$items.itemName', null] },
                                { $ne: ['$items.itemName', ''] }
                            ]},
                            '$items.itemName',
                            { $cond: [
                                { $and: [
                                    { $ne: ['$items.name', null] },
                                    { $ne: ['$items.name', ''] }
                                ]},
                                '$items.name',
                                null
                            ]}
                        ]
                    },
                    totalQuantity: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
                }},
                { 
                    $match: { 
                        _id: { 
                            $ne: null, 
                            $ne: ''
                        }
                    }
                },
                { $sort: { totalQuantity: -1 } },
                { $limit: 10 }
            ]);
            console.log(`🔝 Top Selling Products from MongoDB: ${topSellingProducts.length} items`);
            if (topSellingProducts.length === 0) {
                console.log('⚠️ NO PRODUCTS FOUND - checking raw orders...');
                const sampleOrders = await Order.find().select('items').limit(3).lean();
                console.log('📦 Sample orders:', JSON.stringify(sampleOrders, null, 2));
            }
            topSellingProducts.forEach((item, idx) => {
                console.log(`   [${idx + 1}] ${item._id}: ${item.totalQuantity} units = ₱${item.totalRevenue.toFixed(2)}`);
            });
            
            const totalRevenueResult = await Order.aggregate([
                { $match: { status: 'completed' } },
                { $group: { _id: null, total: { $sum: '$total' } } }
            ]);
            const totalRevenue = totalRevenueResult[0]?.total || 0;
            console.log(`💰 Total Revenue: ₱${totalRevenue.toFixed(2)}`);
            
            const todaysRevenueResult = await Order.aggregate([
                { 
                    $match: { 
                        status: 'completed',
                        createdAt: { $gte: startOfDay, $lte: endOfDay }
                    } 
                },
                { $group: { _id: null, total: { $sum: '$total' } } }
            ]);
            const todaysRevenue = todaysRevenueResult[0]?.total || 0;
            console.log(`💰 Today's Revenue: ₱${todaysRevenue.toFixed(2)}`);
            
            const { vat: todaysVAT } = HelperFunctions.calculateVAT(todaysRevenue);
            const { vat: totalVAT } = HelperFunctions.calculateVAT(totalRevenue);
            
            const stats = {
                totalOrders,
                todaysOrders,
                totalCustomers,
                totalMenuItems,
                availableMenuItems,
                outOfStockMenuItems: totalMenuItems - availableMenuItems,
                totalInventoryItems,
                inventoryLowStock,
                inventoryOutOfStock,
                totalRevenue,
                todaysRevenue,
                totalVAT,
                todaysVAT,
                topSellingProducts,
                businessName: BUSINESS_INFO.name
            };
            
            console.log('✅ Statistics calculation complete:', {
                totalOrders,
                todaysOrders,
                totalCustomers,
                totalRevenue: `₱${totalRevenue.toFixed(2)}`,
                todaysRevenue: `₱${todaysRevenue.toFixed(2)}`
            });
            return stats;
            
        } catch (error) {
            console.error('❌ Error getting dashboard stats:', error);
            return this.getDefaultStats();
        }
    }

    static getDefaultStats() {
        return {
            totalOrders: 0,
            todaysOrders: 0,
            totalCustomers: 0,
            totalMenuItems: 0,
            availableMenuItems: 0,
            outOfStockMenuItems: 0,
            totalInventoryItems: 0,
            inventoryLowStock: 0,
            inventoryOutOfStock: 0,
            totalRevenue: 0,
            todaysRevenue: 0,
            totalVAT: 0,
            todaysVAT: 0,
            topSellingProducts: [],
            businessName: BUSINESS_INFO.name
        };
    }
}

class RealTimeManager {
    static adminClients = new Set();
    static staffClients = new Set();

    static addAdminClient(client) {
        this.adminClients.add(client);
    }

    static addStaffClient(client) {
        this.staffClients.add(client);
    }

    static removeAdminClient(client) {
        this.adminClients.delete(client);
    }

    static removeStaffClient(client) {
        this.staffClients.delete(client);
    }

    static broadcastToAdmins(data) {
        if (this.adminClients.size === 0) return;
        
        const eventData = `data: ${JSON.stringify(data)}\n\n`;
        const deadClients = [];
        
        this.adminClients.forEach(client => {
            if (!client.isAlive || client.res.writableEnded) {
                deadClients.push(client);
                return;
            }
            
            try {
                const canContinue = client.res.write(eventData);
                if (!canContinue) {
                    // Backpressure - pause
                    console.warn(`⚠️ Backpressure on admin client ${client.id}`);
                }
            } catch (error) {
                console.warn(`⚠️ Error writing to admin client ${client.id}:`, error.message);
                deadClients.push(client);
            }
        });
        
        // Clean up dead clients
        deadClients.forEach(client => {
            this.adminClients.delete(client);
        });
    }

    static broadcastToStaff(data) {
        if (this.staffClients.size === 0) return;
        
        const eventData = `data: ${JSON.stringify(data)}\n\n`;
        const deadClients = [];
        
        this.staffClients.forEach(client => {
            if (!client.isAlive || client.res.writableEnded) {
                deadClients.push(client);
                return;
            }
            
            try {
                const canContinue = client.res.write(eventData);
                if (!canContinue) {
                    // Backpressure - pause
                    console.warn(`⚠️ Backpressure on staff client ${client.id}`);
                }
            } catch (error) {
                console.warn(`⚠️ Error writing to staff client ${client.id}:`, error.message);
                deadClients.push(client);
            }
        });
        
        deadClients.forEach(client => {
            this.staffClients.delete(client);
        });
    }

    static sendOrderNotification(order) {
        const notification = {
            type: 'new_order',
            data: {
                id: order._id.toString(),
                orderNumber: order.orderNumber || `ORD-${Date.now()}`,
                total: order.total || 0,
                type: order.type || 'Dine In',
                paymentMethod: order.payment?.method || 'cash',
                timestamp: new Date().toLocaleTimeString('en-PH'),
                items: order.items?.length || 0,
                createdAt: order.createdAt || new Date(),
                customerId: order.customerId || null
            },
            message: `New order #${order.orderNumber} received!`
        };
        
        this.broadcastToAdmins(notification);
        this.broadcastToStaff(notification);
    }

    static async sendLowStockAlert(inventoryItem) {
        const lowStockCount = await InventoryItem.countDocuments({
            currentStock: { $lt: CONFIG.LOW_STOCK_THRESHOLD, $gte: 1 },
            isActive: true
        });

        this.broadcastToAdmins({
            type: 'low_stock_alert',
            data: {
                inventoryItemId: inventoryItem._id,
                itemName: inventoryItem.itemName,
                currentStock: inventoryItem.currentStock,
                minStock: inventoryItem.minStock,
                lowStockCount
            },
            message: `Low stock alert: ${inventoryItem.itemName} has only ${inventoryItem.currentStock} left!`
        });
    }

    static sendOutOfStockAlert(productData) {
        this.broadcastToAdmins({
            type: 'out_of_stock_alert',
            data: {
                productId: productData.productId,
                productName: productData.productName,
                category: productData.category,
                previousStock: productData.previousStock,
                timestamp: productData.timestamp
            },
            message: `🚨 OUT OF STOCK: ${productData.productName} is now completely out of stock! Please restock immediately.`,
            severity: 'critical'
        });
    }

    static async sendStatsUpdate() {
        try {
            const stats = await DashboardStats.getStats();
            
            this.broadcastToAdmins({
                type: 'stats_update',
                data: stats,
                message: 'Dashboard stats updated'
            });
            
            return stats;
        } catch (error) {
            console.error('Error sending stats update:', error);
            return null;
        }
    }
}

const initializeDatabase = async () => {
    try {
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            const hashedPassword = bcrypt.hashSync('admin123', 10);
            await User.create({
                username: 'admin',
                password: hashedPassword,
                role: 'admin',
                status: 'active',
                name: 'Administrator',
                email: 'admin@graycafe.com',
                phone: '+631234567890'
            });
        }
        
        const categoryCount = await Category.countDocuments();
        if (categoryCount === 0) {
            const defaultCategories = [
                { name: 'Rice Bowl Meals' },
                { name: 'Hot Sizzlers' },
                { name: 'Party Tray' },
                { name: 'Drinks' },
                { name: 'Coffee' },
                { name: 'Milk Tea'},
                { name: 'Frappe' },
                { name: 'Snacks & Appetizer' },
                { name: 'Budget Meals Served with Rice' },
                { name: 'Specialties' }
            ];
            await Category.insertMany(defaultCategories);
        }
        
        await MenuItem.deleteMany({
            $or: [
                { itemName: null },
                { itemName: '' },
                { itemName: undefined },
                { name: null },
                { name: '' },
                { name: undefined }
            ]
        });

        // ==================== INITIALIZE MISSING INVENTORY ITEMS ====================
        const missingItems = [
            { itemName: 'Banana Flower Bud', category: 'produce' },
            { itemName: 'Ground Peanuts', category: 'dry' },
            { itemName: 'Annatto oil', category: 'dry' },
            { itemName: 'Toasted Ground Rice', category: 'dry' }
        ];

        for (const item of missingItems) {
            const exists = await InventoryItem.findOne({
                itemName: { $regex: `^${item.itemName.trim()}$`, $options: 'i' }
            });

            if (!exists) {
                await InventoryItem.create({
                    itemName: item.itemName,
                    category: item.category,
                    currentStock: 0,
                    minStock: 10,
                    maxStock: 50,
                    unit: item.category === 'produce' ? 'kg' : 'pieces',
                    itemType: 'raw',
                    isActive: true,
                    status: 'out_of_stock'
                });
                console.log(`✅ Created missing inventory item: ${item.itemName}`);
            }
        }

    } catch (error) {
        console.error('Database initialization error:', error);
    }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

await connectDB();

await mongoDBInventoryService.initialize();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use('/images', express.static(path.join(__dirname, "images")));

// ==================== FAVICON HANDLER ====================
app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'favicon.ico'));
});

app.set("view engine", "ejs");
app.set('views', path.join(__dirname, 'views'));


app.use('/api/stock-transfers', stockTransferRoute);
app.use('/api/staff', staffRoutes);
app.use('/api/inventory', inventoryRoutes);

app.get('/api/list-pdfs', async (req, res) => {
    // Public access to list PDFs
    try {
        const pdfs = await PDF.find({ isActive: true })
            .select('_id name filename size pages uploadDate url category')
            .sort({ uploadDate: -1 })
            .limit(50);

        const formattedPdfs = pdfs.map(pdf => ({
            id: pdf._id,
            name: pdf.name,
            filename: pdf.filename,
            url: pdf.url,
            size: pdf.size,
            pages: pdf.pages,
            uploadDate: pdf.uploadDate,
            category: pdf.category
        }));

        res.json(formattedPdfs);
    } catch (error) {
        console.error('Error listing PDFs:', error);
        res.status(500).json({ error: error.message });
    }
});

app.use('/api/stock-transfers', verifyToken);
app.use('/api/staff', verifyToken);

app.get('/api/menu', verifyToken, async (req, res) => {
    try {
        console.log('📋 API: Fetching all menu items with inventory check...');
        const menuItems = await MenuItem.find({}).lean();
        
        const formattedItems = await Promise.all(menuItems.map(async (item) => {
            const availability = await RecipeManager.checkProductAvailability(item.itemName || item.name);
            const currentStock = item.currentStock || 0;
            
            return {
                _id: item._id,
                itemId: item._id.toString(),
                name: item.itemName || item.name,
                itemName: item.itemName || item.name,
                category: item.category,
                price: item.price,
                currentStock: currentStock,
                minStock: item.minStock || 0,
                maxStock: item.maxStock || 0,
                unit: item.unit,
                image: item.image,
                isActive: item.isActive !== false && availability.available && currentStock > 0,
                status: (availability.available && currentStock > 0) ? 'available' : 'out_of_stock',
                itemType: item.itemType || 'finished',
                requiredIngredients: availability.requiredIngredients || [],
                missingIngredients: availability.missingIngredients || [],
                availableIngredients: availability.availableIngredients || []
            };
        }));
        
        const availableCount = formattedItems.filter(i => i.status === 'available').length;
        const outOfStockCount = formattedItems.filter(i => i.status === 'out_of_stock').length;
        
        console.log(`✅ Menu items loaded: ${availableCount} available, ${outOfStockCount} out of stock`);
        
        res.json({
            success: true,
            data: formattedItems,
            stats: {
                total: formattedItems.length,
                available: availableCount,
                outOfStock: outOfStockCount
            }
        });
    } catch (error) {
        console.error('❌ Error fetching menu items:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching menu items',
            error: error.message
        });
    }
});

app.get('/api/menu/:itemId', verifyToken, async (req, res) => {
    try {
        console.log(`📋 API: Fetching menu item ${req.params.itemId}...`);
        const menuItem = await MenuItem.findById(req.params.itemId).lean();
        
        if (!menuItem) {
            return res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }
        
        const availability = await RecipeManager.checkProductAvailability(menuItem.itemName || menuItem.name);
        
        const formatted = {
            _id: menuItem._id,
            itemId: menuItem._id.toString(),
            name: menuItem.itemName || menuItem.name,
            itemName: menuItem.itemName || menuItem.name,
            category: menuItem.category,
            price: menuItem.price,
            currentStock: menuItem.currentStock || 0,
            minStock: menuItem.minStock || 0,
            maxStock: menuItem.maxStock || 0,
            unit: menuItem.unit,
            image: menuItem.image,
            isActive: menuItem.isActive !== false && availability.available,
            status: availability.available ? 'available' : 'out_of_stock',
            itemType: menuItem.itemType || 'finished',
            requiredIngredients: availability.requiredIngredients || [],
            missingIngredients: availability.missingIngredients || []
        };
        
        res.json({
            success: true,
            data: formatted
        });
    } catch (error) {
        console.error('❌ Error fetching menu item:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching menu item',
            error: error.message
        });
    }
});

app.get('/api/menu/:itemName/availability', verifyToken, async (req, res) => {
    try {
        const itemName = decodeURIComponent(req.params.itemName);
        console.log(`📋 API: Checking availability for "${itemName}"...`);
        
        const availability = await RecipeManager.checkProductAvailability(itemName);
        
        res.json({
            success: true,
            itemName: itemName,
            available: availability.available,
            requiredIngredients: availability.requiredIngredients || [],
            missingIngredients: availability.missingIngredients || [],
            availableIngredients: availability.availableIngredients || []
        });
    } catch (error) {
        console.error('❌ Error checking menu item availability:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking availability',
            error: error.message
        });
    }
});

app.get('/api/menu/check-recipe/:itemName', verifyToken, async (req, res) => {
    try {
        const itemName = decodeURIComponent(req.params.itemName);
        
        console.log(`🔍 Checking recipe for menu item: "${itemName}"`);
        
        // Get ingredients by looking up in reverseRecipeMapping (dish name -> ingredients)
        const requiredIngredients = reverseRecipeMapping[itemName] || [];
        
        console.log(`   reverseRecipeMapping lookup for "${itemName}":`, requiredIngredients);
        
        if (requiredIngredients.length === 0) {
            // Also check if it's a direct key in recipeMapping (which maps ingredients to dishes)
            // This shouldn't happen for menu items, but let's be thorough
            console.warn(`⚠️ No recipe found in reverseRecipeMapping for: ${itemName}`);
            console.log(`   Available dishes in reverseRecipeMapping:`, Object.keys(reverseRecipeMapping).slice(0, 10), '...');
            
            return res.json({
                success: true,
                hasRecipe: false,
                itemName: itemName,
                ingredients: [],
                message: `No recipe defined for "${itemName}" - Add it to server.js recipeMapping`
            });
        }
        
        console.log(`✅ Recipe found for: "${itemName}" with ${requiredIngredients.length} ingredients:`, requiredIngredients);
        return res.json({
            success: true,
            hasRecipe: true,
            itemName: itemName,
            ingredients: requiredIngredients,
            message: `Recipe found with ${requiredIngredients.length} ingredients`
        });
    } catch (error) {
        console.error('❌ Error checking recipe:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking recipe',
            error: error.message
        });
    }
});

app.get('/api/menu/check-ingredients/:itemName', verifyToken, async (req, res) => {
    try {
        const itemName = decodeURIComponent(req.params.itemName);
        
        console.log(`📋 Checking ingredient availability for: "${itemName}"`);
        
        // Get required ingredients using reverseRecipeMapping
        const requiredIngredients = reverseRecipeMapping[itemName] || [];
        
        console.log(`   Required ingredients for "${itemName}":`, requiredIngredients);
        
        if (requiredIngredients.length === 0) {
            console.log(`ℹ️ No ingredients required for: ${itemName}`);
            return res.json({
                success: true,
                available: true,
                itemName: itemName,
                missingIngredients: [],
                insufficientIngredients: [],
                message: `No recipe found for "${itemName}"`
            });
        }
        
        // Get current inventory
        const inventoryItems = await InventoryItem.find({ 
            itemType: 'raw', 
            isActive: true 
        }).lean();
        
        const missingIngredients = [];
        const insufficientIngredients = [];
        const availableIngredients = [];
        
        for (const ingredientName of requiredIngredients) {
            const item = inventoryItems.find(inv => 
                inv.itemName.toLowerCase() === ingredientName.toLowerCase()
            );
            
            if (!item) {
                console.warn(`   ❌ NOT FOUND: ${ingredientName}`);
                missingIngredients.push({
                    ingredient: ingredientName,
                    reason: 'NOT IN INVENTORY'
                });
            } else if (parseFloat(item.currentStock || 0) <= 0) {
                console.warn(`   ❌ OUT OF STOCK: ${ingredientName}`);
                insufficientIngredients.push({
                    ingredient: ingredientName,
                    required: 1,
                    available: parseFloat(item.currentStock || 0),
                    unit: item.unit,
                    reason: 'OUT OF STOCK'
                });
            } else {
                console.log(`   ✅ AVAILABLE: ${ingredientName} (${item.currentStock} ${item.unit})`);
                availableIngredients.push({
                    ingredient: ingredientName,
                    available: parseFloat(item.currentStock)
                });
            }
        }
        
        const isAvailable = missingIngredients.length === 0 && insufficientIngredients.length === 0;
        
        return res.json({
            success: true,
            available: isAvailable,
            itemName: itemName,
            missingIngredients: missingIngredients,
            insufficientIngredients: insufficientIngredients,
            availableIngredients: availableIngredients,
            message: isAvailable ? 'All ingredients available' : 'Some ingredients are missing or insufficient'
        });
    } catch (error) {
        console.error('❌ Error checking ingredient availability:', error);
        res.status(500).json({
            success: false,
            available: false,
            message: 'Error checking ingredient availability',
            error: error.message
        });
    }
});

app.post('/api/menu', verifyToken, verifyAdmin, async (req, res) => {
    try {
        console.log('✏️ API: Creating new menu item...', JSON.stringify(req.body, null, 2));
        
        const { name, itemName, category, price, unit, currentStock, minStock, maxStock, image, isActive, itemType, requiredIngredients } = req.body;
        
        if (!name && !itemName) {
            console.error('❌ Validation failed: Item name is required');
            return res.status(400).json({
                success: false,
                message: 'Item name is required'
            });
        }
        
        if (!category) {
            console.error('❌ Validation failed: Category is required');
            return res.status(400).json({
                success: false,
                message: 'Category is required'
            });
        }
        
        const parsedPrice = Number(price) || 0;
        if (isNaN(parsedPrice)) {
            console.error('❌ Validation failed: Valid price is required, got:', price);
            return res.status(400).json({
                success: false,
                message: 'Valid price is required'
            });
        }
        
        const parsedCurrentStock = Number(currentStock) || 0;
        const parsedMinStock = Number(minStock) || 0;
        const parsedMaxStock = Number(maxStock) || 100;
        
        if (isNaN(parsedCurrentStock) || isNaN(parsedMinStock) || isNaN(parsedMaxStock)) {
            console.error('❌ Validation failed: Invalid stock numbers');
            return res.status(400).json({
                success: false,
                message: 'Invalid stock values'
            });
        }
        
        // Process required ingredients - support both array of strings and array of objects
        let processedIngredients = [];
        if (requiredIngredients && Array.isArray(requiredIngredients)) {
            processedIngredients = requiredIngredients.map(ing => {
                if (typeof ing === 'string') {
                    return { ingredientName: ing, quantity: 1, unit: 'piece' };
                } else if (typeof ing === 'object') {
                    return {
                        ingredientName: ing.ingredientName || ing.name || '',
                        quantity: Number(ing.quantity) || 1,
                        unit: ing.unit || 'piece'
                    };
                }
                return null;
            }).filter(ing => ing && ing.ingredientName);
        }
        
        const menuItem = new MenuItem({
            itemName: name || itemName,
            name: name || itemName,
            category,
            price: parsedPrice,
            unit: unit || 'piece',
            currentStock: parsedCurrentStock,
            minStock: parsedMinStock,
            maxStock: parsedMaxStock,
            image: image || 'default_food.jpg',
            isActive: isActive !== false,
            itemType: itemType || 'finished',
            requiredIngredients: processedIngredients
        });
        
        console.log('📝 MenuItem object created, saving to database...');
        console.log('📝 Required ingredients:', processedIngredients);
        
        try {
            await menuItem.save();
            console.log(`✅ Menu item saved successfully: ${menuItem._id}`);
        } catch (saveError) {
            console.error('❌ Mongoose save error:', saveError.message);
            console.error('❌ Validation errors:', saveError.errors || 'No validation errors');
            throw saveError;
        }
        
        const formatted = {
            _id: menuItem._id,
            itemId: menuItem._id.toString(),
            name: menuItem.itemName,
            itemName: menuItem.itemName,
            category: menuItem.category,
            price: menuItem.price,
            currentStock: menuItem.currentStock,
            minStock: menuItem.minStock,
            maxStock: menuItem.maxStock,
            unit: menuItem.unit,
            image: menuItem.image,
            isActive: menuItem.isActive,
            itemType: menuItem.itemType
        };
        
        console.log(`✅ Menu item created: ${menuItem._id}`);
        
        RealTimeManager.broadcastToAdmins({
            type: 'menu_update',
            action: 'created',
            item: formatted
        });
        
        res.status(201).json({
            success: true,
            message: 'Menu item created successfully',
            data: formatted
        });
    } catch (error) {
        console.error('❌ Error creating menu item:', error.message);
        console.error('❌ Full error object:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            errors: error.errors ? Object.keys(error.errors) : 'no validation errors'
        });
        res.status(500).json({
            success: false,
            message: 'Error creating menu item',
            error: error.message,
            errorName: error.name
        });
    }
});

app.put('/api/menu/:itemId', verifyToken, verifyAdmin, async (req, res) => {
    try {
        console.log(`✏️ API: Updating menu item ${req.params.itemId}...`, JSON.stringify(req.body, null, 2));
        
        const itemId = req.params.itemId;
        
        if (itemId.startsWith('fallback_')) {
            console.log(`⏭️ Skipping fallback item (not in MongoDB): ${itemId}`);
            return res.status(200).json({
                success: true,
                message: 'Fallback item - skipped',
                data: { _id: itemId }
            });
        }
        
        const { name, itemName, category, price, unit, currentStock, minStock, maxStock, image, isActive, itemType } = req.body;
        
        const parsedPrice = Number(price) || 0;
        if (isNaN(parsedPrice)) {
            console.error('❌ Validation failed: Valid price is required');
            return res.status(400).json({
                success: false,
                message: 'Valid price is required'
            });
        }
        
        const parsedCurrentStock = Number(currentStock) || 0;
        const parsedMinStock = Number(minStock) || 0;
        const parsedMaxStock = Number(maxStock) || 100;
        
        if (!itemId.match(/^[0-9a-fA-F]{24}$/)) {
            console.error(`❌ Invalid MongoDB ID: ${itemId}`);
            return res.status(400).json({
                success: false,
                message: 'Invalid menu item ID'
            });
        }
        
        // 🚫 CHECK: Block stock addition if item's REQUIRED INGREDIENTS are OUT OF STOCK (currentStock === 0)
        const existingMenuItem = await MenuItem.findById(itemId);
        if (!existingMenuItem) {
            console.warn(`⚠️ Menu item not found: ${itemId}`);
            return res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }
        
        // Check if any required ingredients are out of stock or missing
        const requiredIngredients = existingMenuItem.requiredIngredients || [];
        if (requiredIngredients.length > 0) {
            console.log(`🔍 Checking ingredient inventory for "${existingMenuItem.itemName}"...`);
            
            const outOfStockIngredients = [];
            const missingIngredients = [];
            
            for (const ingredientName of requiredIngredients) {
                const ingredient = await InventoryItem.findOne({
                    itemName: { $regex: new RegExp(`^${ingredientName}$`, 'i') },
                    isActive: true
                });
                
                if (!ingredient) {
                    // Ingredient not found in inventory
                    missingIngredients.push(ingredientName);
                    console.warn(`   ❌ Required ingredient "${ingredientName}" NOT FOUND in inventory`);
                } else if (ingredient.currentStock === 0) {
                    // Ingredient found but out of stock
                    outOfStockIngredients.push(ingredient.itemName);
                    console.warn(`   ⚠️ Required ingredient "${ingredient.itemName}" is OUT OF STOCK`);
                } else {
                    console.log(`   ✅ Required ingredient "${ingredient.itemName}" has stock: ${ingredient.currentStock}`);
                }
            }
            
            // If any required ingredient is out of stock or missing, block the stock addition
            const allBlockingIssues = [...outOfStockIngredients, ...missingIngredients];
            if (allBlockingIssues.length > 0) {
                const ingredientList = allBlockingIssues.join(', ');
                console.warn(`🚫 BLOCKED: Cannot add stock to "${existingMenuItem.itemName}" - Required ingredients are out of stock or missing: ${ingredientList}`);
                return res.status(403).json({
                    success: false,
                    message: `🚫 Cannot add stock to "${existingMenuItem.itemName}" - Required ingredient(s) are Out of Stock or Missing: ${ingredientList}. Please create/restock these items first in Inventory.`,
                    error: 'REQUIRED_INGREDIENTS_OUT_OF_STOCK',
                    outOfStockIngredients: outOfStockIngredients,
                    missingIngredients: missingIngredients
                });
            }
            
            console.log(`✅ All required ingredients are in stock - Can proceed`);
        }
        
        const menuItem = await MenuItem.findByIdAndUpdate(
            itemId,
            {
                itemName: name || itemName,
                name: name || itemName,
                category,
                price: parsedPrice,
                unit: unit || 'piece',
                currentStock: parsedCurrentStock,
                minStock: parsedMinStock,
                maxStock: parsedMaxStock,
                image: image || 'default_food.jpg',
                isActive: isActive !== false,
                itemType: itemType || 'finished'
            },
            { new: true, runValidators: true }
        );
        
        if (!menuItem) {
            console.warn(`⚠️ Menu item not found: ${itemId}`);
            return res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }
        
        console.log(`✅ Menu item updated successfully`);
        
        // 🧂 DEDUCT RAW INGREDIENTS FROM INVENTORY when stock is increased
        const previousStock = existingMenuItem.currentStock || 0;
        const quantityAdded = parsedCurrentStock - previousStock;
        
        console.log(`📦 Stock change: ${previousStock} → ${parsedCurrentStock} = ${quantityAdded} added`);
        
        if (quantityAdded > 0) {
            console.log(`🧂 Deducting ingredients for added stock: ${menuItem.itemName} (Qty: ${quantityAdded})`);
            
            // ✅ FIX: Use stored requiredIngredients first, then fall back to reverseRecipeMapping
            let ingredientsToDeduct = [];
            
            // Check if the menu item has stored required ingredients
            if (menuItem.requiredIngredients && menuItem.requiredIngredients.length > 0) {
                console.log(`✅ Using stored required ingredients from database`);
                ingredientsToDeduct = menuItem.requiredIngredients.map(ing => ing.ingredientName);
            } else {
                // Fall back to reverseRecipeMapping for backward compatibility
                console.log(`🧂 Looking for recipe in reverseRecipeMapping...`);
                ingredientsToDeduct = reverseRecipeMapping[menuItem.itemName] || [];
            }
            
            console.log(`🧂 Found ingredients:`, ingredientsToDeduct);
            
            try {
                if (ingredientsToDeduct.length === 0) {
                    console.log(`ℹ️ No ingredients required for: ${menuItem.itemName}`);
                    if (!menuItem.requiredIngredients || menuItem.requiredIngredients.length === 0) {
                        console.log(`🧂 Available recipes in reverseRecipeMapping:`, Object.keys(reverseRecipeMapping).slice(0, 10));
                    }
                } else {
                    for (const ingredientName of ingredientsToDeduct) {
                        try {
                            // Try to find ingredient - be flexible with itemType
                            const inventoryItem = await InventoryItem.findOne({
                                itemName: { $regex: new RegExp(`^${ingredientName}$`, 'i') },
                                isActive: true
                            });
                            
                            if (!inventoryItem) {
                                console.warn(`⚠️ Ingredient not found: ${ingredientName}`);
                                continue;
                            }
                            
                            const previousIngredientStock = inventoryItem.currentStock;
                            const newIngredientStock = Math.max(0, previousIngredientStock - quantityAdded);
                            
                            // Update stock
                            inventoryItem.currentStock = newIngredientStock;
                            
                            // Update status
                            if (newIngredientStock <= 0) {
                                inventoryItem.status = 'out_of_stock';
                            } else if (newIngredientStock <= inventoryItem.minStock) {
                                inventoryItem.status = 'low_stock';
                            } else {
                                inventoryItem.status = 'in_stock';
                            }
                            
                            // Record usage
                            inventoryItem.usageHistory.push({
                                quantity: quantityAdded,
                                notes: `Stock added to menu - ${menuItem.itemName}`,
                                usedBy: req.user?.username || 'Admin',
                                date: new Date()
                            });
                            
                            await inventoryItem.save();
                            
                            console.log(`  ✓ ${ingredientName}: ${previousIngredientStock} → ${newIngredientStock} ${inventoryItem.unit} [${inventoryItem.status}]`);
                            
                        } catch (err) {
                            console.error(`❌ Error deducting ingredient ${ingredientName}:`, err.message);
                        }
                    }
                }
            } catch (deductError) {
                console.warn(`⚠️ Ingredient deduction error:`, deductError.message);
                // Don't block stock update if deduction fails
            }
        }
        
        const formatted = {
            _id: menuItem._id,
            itemId: menuItem._id.toString(),
            name: menuItem.itemName,
            itemName: menuItem.itemName,
            category: menuItem.category,
            price: menuItem.price,
            currentStock: menuItem.currentStock,
            minStock: menuItem.minStock,
            maxStock: menuItem.maxStock,
            unit: menuItem.unit,
            image: menuItem.image,
            isActive: menuItem.isActive,
            itemType: menuItem.itemType
        };
        
        console.log(`✅ Menu item updated: ${menuItem._id}`);
        
        RealTimeManager.broadcastToAdmins({
            type: 'menu_update',
            action: 'updated',
            item: formatted
        });
        
        res.json({
            success: true,
            message: 'Menu item updated successfully',
            data: formatted
        });
    } catch (error) {
        console.error('❌ Error updating menu item:', error.message);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Error updating menu item',
            error: error.message
        });
    }
});

app.delete('/api/menu/:itemId', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const itemId = req.params.itemId;
        console.log(`🗑️ API: Deleting menu item ${itemId}...`);
        
        if (itemId.startsWith('fallback_')) {
            console.log(`⏭️ Skipping fallback item deletion (not in MongoDB): ${itemId}`);
            return res.status(200).json({
                success: true,
                message: 'Fallback item - skipped',
                data: { _id: itemId }
            });
        }
        
        if (!itemId.match(/^[0-9a-fA-F]{24}$/)) {
            console.error(`❌ Invalid MongoDB ID: ${itemId}`);
            return res.status(400).json({
                success: false,
                message: 'Invalid menu item ID'
            });
        }
        
        const menuItem = await MenuItem.findByIdAndDelete(itemId);
        
        if (!menuItem) {
            console.warn(`⚠️ Menu item not found: ${itemId}`);
            return res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }
        
        console.log(`✅ Menu item deleted: ${itemId}`);
        
        RealTimeManager.broadcastToAdmins({
            type: 'menu_update',
            action: 'deleted',
            itemId: itemId
        });
        
        res.json({
            success: true,
            message: 'Menu item deleted successfully'
        });
    } catch (error) {
        console.error('❌ Error deleting menu item:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting menu item',
            error: error.message
        });
    }
});

app.put('/api/menu/:itemId/stock', verifyToken, async (req, res) => {
    try {
        const itemId = req.params.itemId;
        const { currentStock } = req.body;
        
        console.log(`📦 Stock update request for ${itemId}: ${currentStock}`);
        
        const parsedStock = Number(currentStock);
        if (isNaN(parsedStock) || parsedStock < 0) {
            console.error('❌ Invalid stock value:', currentStock);
            return res.status(400).json({
                success: false,
                message: 'Stock must be a valid non-negative number'
            });
        }
        
        if (itemId.startsWith('fallback_') || itemId.startsWith('temp_')) {
            console.log(`⏭️ Skipping fallback/temp item (not in MongoDB): ${itemId}`);
            return res.status(200).json({
                success: true,
                message: 'Fallback item - no database update needed',
                data: { _id: itemId, currentStock: parsedStock }
            });
        }
        
        if (!itemId.match(/^[0-9a-fA-F]{24}$/)) {
            console.error(`❌ Invalid MongoDB ID: ${itemId}`);
            return res.status(400).json({
                success: false,
                message: 'Invalid menu item ID'
            });
        }
        
        // Get the old stock to calculate the quantity added
        const oldMenuItem = await MenuItem.findById(itemId);
        if (!oldMenuItem) {
            console.warn(`⚠️ Menu item not found: ${itemId}`);
            return res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }
        
        const previousStock = oldMenuItem.currentStock || 0;
        const quantityAdded = parsedStock - previousStock;
        
        console.log(`📦 Stock calculation: ${previousStock} → ${parsedStock} = ${quantityAdded} added`);
        
        const menuItem = await MenuItem.findByIdAndUpdate(
            itemId,
            { currentStock: parsedStock },
            { new: true, runValidators: false }
        );
        
        if (!menuItem) {
            console.warn(`⚠️ Menu item not found: ${itemId}`);
            return res.status(404).json({
                success: false,
                message: 'Menu item not found'
            });
        }
        
        console.log(`✅ Stock updated for ${itemId}: ${previousStock} → ${parsedStock} units (added: ${quantityAdded})`);
        
        // 🧂 DEDUCT RAW INGREDIENTS FROM INVENTORY when stock is added
        if (quantityAdded > 0) {
            console.log(`🧂 Deducting ingredients for added stock: ${menuItem.itemName} (Qty: ${quantityAdded})`);
            
            // ✅ FIX: Use stored requiredIngredients first, then fall back to reverseRecipeMapping
            let ingredientsToDeduct = [];
            
            // Check if the menu item has stored required ingredients
            if (menuItem.requiredIngredients && menuItem.requiredIngredients.length > 0) {
                console.log(`✅ Using stored required ingredients from database`);
                ingredientsToDeduct = menuItem.requiredIngredients.map(ing => ing.ingredientName);
            } else {
                // Fall back to reverseRecipeMapping for backward compatibility
                console.log(`🧂 Looking for recipe in reverseRecipeMapping...`);
                ingredientsToDeduct = reverseRecipeMapping[menuItem.itemName] || [];
            }
            
            console.log(`🧂 Found ingredients:`, ingredientsToDeduct);
            
            try {
                if (ingredientsToDeduct.length === 0) {
                    console.log(`ℹ️ No ingredients required for: ${menuItem.itemName}`);
                    if (!menuItem.requiredIngredients || menuItem.requiredIngredients.length === 0) {
                        console.log(`🧂 Available recipes in reverseRecipeMapping:`, Object.keys(reverseRecipeMapping).slice(0, 10));
                    }
                } else {
                    for (const ingredientName of ingredientsToDeduct) {
                        try {
                            // Try to find ingredient - be flexible with itemType
                            const inventoryItem = await InventoryItem.findOne({
                                itemName: { $regex: new RegExp(`^${ingredientName}$`, 'i') },
                                isActive: true
                            });
                            
                            if (!inventoryItem) {
                                console.warn(`⚠️ Ingredient not found: ${ingredientName}`);
                                continue;
                            }
                            
                            const previousIngredientStock = inventoryItem.currentStock;
                            const newIngredientStock = Math.max(0, previousIngredientStock - quantityAdded);
                            
                            // Update stock
                            inventoryItem.currentStock = newIngredientStock;
                            
                            // Update status
                            if (newIngredientStock <= 0) {
                                inventoryItem.status = 'out_of_stock';
                            } else if (newIngredientStock <= inventoryItem.minStock) {
                                inventoryItem.status = 'low_stock';
                            } else {
                                inventoryItem.status = 'in_stock';
                            }
                            
                            // Record usage
                            inventoryItem.usageHistory.push({
                                quantity: quantityAdded,
                                notes: `Stock added to menu - ${menuItem.itemName}`,
                                usedBy: req.user?.username || 'Admin',
                                date: new Date()
                            });
                            
                            await inventoryItem.save();
                            
                            console.log(`  ✓ ${ingredientName}: ${previousIngredientStock} → ${newIngredientStock} ${inventoryItem.unit} [${inventoryItem.status}]`);
                            
                        } catch (err) {
                            console.error(`❌ Error deducting ingredient ${ingredientName}:`, err.message);
                        }
                    }
                }
            } catch (deductError) {
                console.warn(`⚠️ Ingredient deduction error:`, deductError.message);
                // Don't block stock update if deduction fails
            }
        }
        
        res.status(200).json({
            success: true,
            message: 'Stock updated successfully',
            data: {
                _id: menuItem._id,
                name: menuItem.itemName,
                currentStock: menuItem.currentStock
            }
        });
    } catch (error) {
        console.error('❌ Error updating stock:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error updating stock',
            error: error.message
        });
    }
});

app.get('/api/admin/events', verifyToken, verifyAdmin, (req, res) => {
    // Set proper headers for Server-Sent Events
    res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*'
    });

    // Send initial connection message
    try {
        res.write('data: {"type": "connected", "message": "Connected to admin real-time updates"}\n\n');
    } catch (error) {
        console.error('❌ Error sending initial connection message:', error.message);
        res.end();
        return;
    }

    const clientId = Date.now() + Math.random();
    const client = {
        id: clientId,
        res: res,
        createdAt: new Date(),
        isAlive: true
    };
    
    // Track client connection time
    console.log(`✅ Admin client connected (${clientId})`);
    
    RealTimeManager.addAdminClient(client);

    // Send keep-alive comment every 25 seconds to prevent timeout
    const keepAliveInterval = setInterval(() => {
        if (!client.isAlive || res.writableEnded) {
            clearInterval(keepAliveInterval);
            return;
        }
        
        try {
            // Send keep-alive comment (not a data message)
            res.write(': keep-alive\n\n');
        } catch (error) {
            console.warn(`⚠️ Error sending keep-alive to admin client ${clientId}:`, error.message);
            clearInterval(keepAliveInterval);
            client.isAlive = false;
        }
    }, 25000);

    // Handle client disconnect
    req.on('close', () => {
        clearInterval(keepAliveInterval);
        client.isAlive = false;
        RealTimeManager.removeAdminClient(client);
        console.log(`❌ Admin client disconnected (${clientId})`);
    });

    // Handle errors
    req.on('error', (error) => {
        console.error(`❌ Admin EventSource error (${clientId}):`, error.message);
        clearInterval(keepAliveInterval);
        client.isAlive = false;
        RealTimeManager.removeAdminClient(client);
        try {
            res.end();
        } catch (e) {
            console.warn('⚠️ Error ending response:', e.message);
        }
    });

    res.on('error', (error) => {
        console.error(`❌ Admin response error (${clientId}):`, error.message);
        clearInterval(keepAliveInterval);
        client.isAlive = false;
        RealTimeManager.removeAdminClient(client);
    });
});

app.get('/api/staff/events', verifyToken, (req, res) => {
    // Set proper headers for Server-Sent Events
    res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*'
    });

    // Send initial connection message
    try {
        res.write('data: {"type": "connected", "message": "Connected to staff real-time updates"}\n\n');
    } catch (error) {
        console.error('❌ Error sending initial connection message:', error.message);
        res.end();
        return;
    }

    const clientId = Date.now() + Math.random();
    const client = {
        id: clientId,
        res: res,
        role: req.user.role,
        createdAt: new Date(),
        isAlive: true
    };
    
    // Track client connection time
    console.log(`✅ Staff client connected (${clientId}, role: ${req.user.role})`);
    
    RealTimeManager.addStaffClient(client);

    // Send keep-alive comment every 25 seconds to prevent timeout
    const keepAliveInterval = setInterval(() => {
        if (!client.isAlive || res.writableEnded) {
            clearInterval(keepAliveInterval);
            return;
        }
        
        try {
            // Send keep-alive comment (not a data message)
            res.write(': keep-alive\n\n');
        } catch (error) {
            console.warn(`⚠️ Error sending keep-alive to staff client ${clientId}:`, error.message);
            clearInterval(keepAliveInterval);
            client.isAlive = false;
        }
    }, 25000);

    // Handle client disconnect
    req.on('close', () => {
        clearInterval(keepAliveInterval);
        client.isAlive = false;
        RealTimeManager.removeStaffClient(client);
        console.log(`❌ Staff client disconnected (${clientId})`);
    });

    // Handle errors
    req.on('error', (error) => {
        console.error(`❌ Staff EventSource error (${clientId}):`, error.message);
        clearInterval(keepAliveInterval);
        client.isAlive = false;
        RealTimeManager.removeStaffClient(client);
        try {
            res.end();
        } catch (e) {
            console.warn('⚠️ Error ending response:', e.message);
        }
    });

    res.on('error', (error) => {
        console.error(`❌ Staff response error (${clientId}):`, error.message);
        clearInterval(keepAliveInterval);
        client.isAlive = false;
        RealTimeManager.removeStaffClient(client);
    });
});

app.get("/api/dashboard/stats", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const period = req.query.period || 'daily'; // daily, weekly, or monthly
        console.log(`📊 API: Fetching dashboard stats for period: ${period}...`);
        
        // If period query is provided, fetch from SalesData
        if (req.query.period) {
            try {
                const now = new Date();
                let startDate, endDate;
                
                if (period === 'daily') {
                    // Get today's data - from midnight to now + 1 day
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
                } else if (period === 'weekly') {
                    // Get this week's data (Sunday to now)
                    const dayOfWeek = now.getDay();
                    startDate = new Date(now);
                    startDate.setDate(now.getDate() - dayOfWeek);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(now);
                    endDate.setHours(23, 59, 59, 999);
                } else if (period === 'monthly') {
                    // Get this month's data
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    startDate.setHours(0, 0, 0, 0);
                    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                    endDate.setHours(23, 59, 59, 999);
                }
                
                console.log(`🔍 Querying ${period} sales data:`, {
                    period: period,
                    startDate: startDate.toISOString(),
                    endDate: endDate.toISOString()
                });
                
                const salesDataByPeriod = await SalesData.findOne({
                    period: period,
                    fullDate: { $gte: startDate, $lt: endDate }
                }).sort({ fullDate: -1 }).lean();
                
                if (salesDataByPeriod) {
                    console.log(`✅ Found ${period} sales data:`, {
                        totalOrders: salesDataByPeriod.totalOrders,
                        totalSales: salesDataByPeriod.totalSales,
                        totalCustomers: salesDataByPeriod.totalCustomers
                    });
                    return res.json({
                        success: true,
                        data: {
                            totalRevenue: salesDataByPeriod.totalSales || 0,
                            totalOrders: salesDataByPeriod.totalOrders || 0,
                            totalCustomers: salesDataByPeriod.totalCustomers || 0,
                            totalCosts: salesDataByPeriod.totalCosts || 0,
                            profit: salesDataByPeriod.profit || 0,
                            paymentBreakdown: salesDataByPeriod.paymentBreakdown || { cash: 0, gcash: 0 },
                            orderTypes: salesDataByPeriod.orderTypes || { dineIn: 0, takeOut: 0 },
                            topProducts: salesDataByPeriod.topProducts || [],
                            recentOrders: []
                        }
                    });
                } else {
                    console.log(`⚠️ No ${period} sales data found, returning zeros`);
                    return res.json({
                        success: true,
                        data: {
                            totalRevenue: 0,
                            totalOrders: 0,
                            totalCustomers: 0,
                            totalCosts: 0,
                            profit: 0,
                            paymentBreakdown: { cash: 0, gcash: 0 },
                            orderTypes: { dineIn: 0, takeOut: 0 },
                            topProducts: [],
                            recentOrders: []
                        }
                    });
                }
            } catch (periodError) {
                console.error(`❌ Error fetching ${period} sales data:`, periodError);
                // Fallback to general stats
            }
        }
        
        // Default: Fetch general dashboard stats
        const stats = await DashboardStats.getStats();
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('❌ Error fetching dashboard stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard stats',
            error: error.message
        });
    }
});

app.get("/api/inventory/status", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        const inventoryItems = await InventoryItem.find({ 
            isActive: true 
        })
        .sort({ currentStock: 1 })
        .limit(limit)
        .lean();
        
        const formattedItems = inventoryItems.map(item => ({
            ...item,
            unit: item.unit || 'pieces',
            itemName: item.itemName || item.name,
            currentStock: item.currentStock || 0,
            minStock: item.minStock || 5,
            maxStock: item.maxStock || 50
        }));
        
        console.log('📦 Inventory Status API Query:');
        console.log(`  - Limit: ${limit}`);
        console.log(`  - Items found: ${formattedItems.length}`);
        formattedItems.forEach((item, idx) => {
            console.log(`  [${idx + 1}] ${item.itemName} - Stock: ${item.currentStock} ${item.unit} (Active: ${item.isActive})`);
        });
        
        res.json({
            success: true,
            data: formattedItems,
            count: formattedItems.length
        });
    } catch (error) {
        console.error('❌ Error fetching inventory status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch inventory status'
        });
    }
});

app.get("/api/products/out-of-stock", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const outOfStockProducts = await Product.find({ stock: 0 })
            .select('itemName category price image stock')
            .sort({ updatedAt: -1 })
            .lean();
        
        console.log(`🚨 Out of Stock Products: ${outOfStockProducts.length} items`);
        
        res.json({
            success: true,
            data: outOfStockProducts,
            count: outOfStockProducts.length,
            message: `${outOfStockProducts.length} product(s) out of stock`
        });
    } catch (error) {
        console.error('❌ Error fetching out of stock products:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch out of stock products',
            error: error.message
        });
    }
});

app.get("/api/inventory", verifyToken, async (req, res) => {
    try {
        console.log('📦 API: /api/inventory - Fetching ALL inventory items for availability check...');
        
        const inventoryItems = await InventoryItem.find()
            .sort({ itemName: 1 })
            .lean();
        
        console.log(`📦 Inventory API returning ${inventoryItems.length} items`);
        
        if (inventoryItems.length > 0) {
            console.log('   Sample items:');
            inventoryItems.slice(0, 3).forEach(item => {
                console.log(`   - ${item.itemName}: stock=${item.currentStock}`);
            });
        }
        
        res.json({
            success: true,
            data: inventoryItems,
            count: inventoryItems.length
        });
    } catch (error) {
        console.error('❌ Error fetching inventory:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch inventory',
            error: error.message
        });
    }
});

app.get("/api/orders/today", verifyToken, verifyAdmin, async (req, res) => {
    try {
        // ✅ Default to 20 orders, max 100 for performance
        let limit = parseInt(req.query.limit) || 20;
        limit = Math.min(limit, 100); // Cap at 100
        
        const { startOfDay, endOfDay } = HelperFunctions.getTodayDateRange();
        
        console.log(`📋 Fetching up to ${limit} orders for today...`);
        
        let orders = await Order.find({ 
            status: 'completed',
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
        
        console.log(`📊 Found ${orders.length} completed orders today`);
        
        if (orders.length === 0) {
            console.log('⚠️ No orders today, fetching from last 7 days...');
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            orders = await Order.find({ 
                status: 'completed',
                createdAt: { $gte: sevenDaysAgo, $lte: endOfDay }
            })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
            
            console.log(`📊 Found ${orders.length} orders from last 7 days`);
        }
        
        res.json({
            success: true,
            data: orders,
            count: orders.length
        });
    } catch (error) {
        console.error('❌ Error fetching today\'s orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch today\'s orders'
        });
    }
});

app.get("/api/orders/top-items", verifyToken, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const days = parseInt(req.query.days) || 30;
        
        const dateRange = new Date();
        dateRange.setDate(dateRange.getDate() - days);
        
        console.log(`\n${'='.repeat(60)}`);
        console.log('📊 API: /api/orders/top-items');
        console.log(`${'='.repeat(60)}`);
        console.log(`⚙️ Parameters: limit=${limit}, days=${days}`);
        console.log(`📅 Date range: ${dateRange.toISOString().split('T')[0]} to today`);
        
        // First, check if there are ANY orders in the system
        const totalOrders = await Order.countDocuments();
        const completedOrders = await Order.countDocuments({ status: 'completed' });
        const recentOrders = await Order.countDocuments({ createdAt: { $gte: dateRange } });
        
        console.log(`📋 Database order counts:`);
        console.log(`   - Total orders: ${totalOrders}`);
        console.log(`   - Completed orders: ${completedOrders}`);
        console.log(`   - Recent (${days}d): ${recentOrders}`);
        
        // Get all orders first (regardless of status) to ensure we get data
        const topItems = await Order.aggregate([
            { 
                $match: { 
                    createdAt: { $gte: dateRange }
                } 
            },
            { $unwind: '$items' },
            { 
                $group: { 
                    _id: '$items.name',
                    totalQuantity: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                    count: { $sum: 1 }
                }
            },
            // Filter out null, empty strings, and "Unknown Item"
            { 
                $match: { 
                    _id: { 
                        $ne: null, 
                        $ne: '', 
                        $ne: 'Unknown Item'
                    }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: limit }
        ]);
        
        console.log(`✅ Aggregation returned: ${topItems.length} items`);
        
        if (topItems.length > 0) {
            console.log('📋 Top items found:');
            topItems.forEach((item, idx) => {
                console.log(`   [${idx + 1}] ${item._id}`);
                console.log(`       - Qty: ${item.totalQuantity}, Revenue: ₱${item.totalRevenue.toFixed(2)}`);
            });
        } else {
            console.warn('⚠️ No top items found in recent orders');
            console.log('🔍 Checking database structure...');
            
            const sampleOrder = await Order.findOne().lean();
            if (sampleOrder) {
                console.log('📦 Sample order found:');
                console.log(`   - ID: ${sampleOrder._id}`);
                console.log(`   - Status: ${sampleOrder.status}`);
                console.log(`   - Items count: ${sampleOrder.items?.length || 0}`);
                if (sampleOrder.items?.length > 0) {
                    console.log(`   - First item: ${sampleOrder.items[0].name} (qty: ${sampleOrder.items[0].quantity})`);
                }
            } else {
                console.warn('❌ NO ORDERS FOUND IN DATABASE - Dashboard will show empty state');
                console.log('💡 Tip: Create orders via the POS menu system');
            }
        }
        
        console.log(`${'='.repeat(60)}\n`);
        
        res.json({
            success: true,
            data: topItems,
            count: topItems.length,
            debug: { totalOrders, completedOrders, recentOrders }
        });
    } catch (error) {
        console.error('❌ Error fetching top selling items:', error);
        console.error(`Stack: ${error.stack}`);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch top selling items',
            error: error.message
        });
    }
});

app.get("/api/revenue/breakdown", verifyToken, verifyAdmin, async (req, res) => {
    try {
        console.log(`\n${'='.repeat(60)}`);
        console.log('📊 API: /api/revenue/breakdown REQUEST');
        console.log(`${'='.repeat(60)}`);
        
        const { startOfDay, endOfDay } = HelperFunctions.getTodayDateRange();
        
        console.log(`Date: ${startOfDay.toISOString().split('T')[0]}`);
        console.log(`Time Range: ${startOfDay.toLocaleString('en-PH')} to ${endOfDay.toLocaleString('en-PH')}`);
        
        const result = await revenueBreakdownService.calculateAndSaveToday({
            startOfDay,
            endOfDay
        });
        
        if (result.success) {
            console.log(`\n✅ API Response: SUCCESS`);
            console.log(`  Total Revenue: ₱${result.data.totalRevenue.toFixed(2)}`);
            console.log(`  Total Items: ${result.data.totalItems}`);
            console.log(`  Total Orders: ${result.data.totalOrders}`);
            console.log(`  Top Category: ${result.data.topCategory.name}`);
        } else {
            console.log(`\n❌ API Response: FAILED`);
            console.log(`  Error: ${result.message}`);
        }
        
        console.log(`${'='.repeat(60)}\n`);
        
        res.json(result);
        
    } catch (error) {
        console.error('❌ Error calculating revenue breakdown:', error);
        console.log(`${'='.repeat(60)}\n`);
        res.status(500).json({
            success: false,
            message: 'Failed to calculate revenue breakdown',
            error: error.message
        });
    }
});

app.get("/api/revenue/breakdown/date/:date", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const targetDate = new Date(req.params.date);
        const breakdown = await revenueBreakdownService.getBreakdownByDate(targetDate);
        
        if (!breakdown) {
            return res.status(404).json({
                success: false,
                message: 'No breakdown data found for this date'
            });
        }
        
        res.json({
            success: true,
            data: {
                breakdown: breakdown.breakdown,
                totalRevenue: breakdown.totalRevenue,
                totalOrders: breakdown.totalOrders,
                date: breakdown.dateString,
                lastUpdated: breakdown.lastUpdated
            }
        });
    } catch (error) {
        console.error('❌ Error fetching breakdown by date:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch breakdown'
        });
    }
});

app.get("/api/revenue/breakdown/history", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const breakdowns = await revenueBreakdownService.getHistoricalBreakdown(startDate, endDate);
        
        res.json({
            success: true,
            data: breakdowns,
            count: breakdowns.length,
            period: {
                start: startDate.toISOString().split('T')[0],
                end: endDate.toISOString().split('T')[0]
            }
        });
    } catch (error) {
        console.error('❌ Error fetching historical breakdown:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch historical breakdown'
        });
    }
});

app.get("/api/revenue/breakdown/top-categories", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const { startOfDay, endOfDay } = HelperFunctions.getTodayDateRange();
        
        const topCategories = await revenueBreakdownService.getTopCategories(limit, startOfDay, endOfDay);
        
        res.json({
            success: true,
            data: topCategories,
            count: topCategories.length
        });
    } catch (error) {
        console.error('❌ Error fetching top categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch top categories'
        });
    }
});

app.get("/api/sales/chart", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 7;
        
        const dates = [];
        const now = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            dates.push(date);
        }
        
        const salesData = [];
        
        for (const date of dates) {
            const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
            const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
            
            const daySales = await Order.aggregate([
                { 
                    $match: { 
                        status: 'completed',
                        createdAt: { $gte: startOfDay, $lte: endOfDay }
                    } 
                },
                { 
                    $group: { 
                        _id: null,
                        total: { $sum: '$total' },
                        count: { $sum: 1 }
                    }
                }
            ]);
            
            const dayName = date.toLocaleDateString('en-PH', { weekday: 'short' });
            salesData.push({
                label: dayName,
                value: daySales[0]?.total || 0,
                orders: daySales[0]?.count || 0,
                date: date.toISOString().split('T')[0]
            });
        }
        
        res.json({
            success: true,
            data: salesData,
            count: salesData.length
        });
    } catch (error) {
        console.error('❌ Error fetching sales chart data:', error);
        
        const fallbackData = generateFallbackSalesData();
        
        res.json({
            success: true,
            data: fallbackData,
            isFallback: true
        });
    }
});

function generateFallbackSalesData() {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const baseValue = 3000;
    
    return days.map((day, index) => {
        let multiplier = 1;
        switch (day) {
            case 'Mon': multiplier = 0.7; break;
            case 'Tue': multiplier = 0.8; break;
            case 'Wed': multiplier = 0.9; break;
            case 'Thu': multiplier = 1.0; break;
            case 'Fri': multiplier = 1.3; break;
            case 'Sat': multiplier = 1.5; break;
            case 'Sun': multiplier = 1.2; break;
        }
        
        const randomFactor = 0.8 + Math.random() * 0.4;
        const value = Math.round(baseValue * multiplier * randomFactor);
        
        return {
            label: day,
            value: value,
            orders: Math.round(value / 100),
            isFallback: true
        };
    });
}

app.post('/api/orders', verifyToken, async (req, res) => {
    try {
        const orderData = req.body;
        
        if (!orderData.items || !orderData.items.length) {
            return res.status(400).json({ 
                success: false, 
                message: "No items in order" 
            });
        }
        
        if (!orderData.total || orderData.total <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Total amount is required and must be greater than 0" 
            });
        }
        
        if (!orderData.payment || !orderData.payment.amountPaid) {
            return res.status(400).json({ 
                success: false, 
                message: "Payment amount is required" 
            });
        }
        
        const amountPaid = orderData.payment.amountPaid || 0;
        const total = orderData.total || 0;
        const change = amountPaid - total;
        
        if (change < 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Insufficient payment amount" 
            });
        }
        
        if (!orderData.type) {
            orderData.type = "Dine In";
        }
        
        const { startOfDay } = HelperFunctions.getTodayDateRange();
        const orderCount = await Order.countDocuments({
            createdAt: {
                $gte: startOfDay
            }
        });
        const orderNumber = HelperFunctions.generateOrderNumber(orderCount);
        
        console.log('🆕 Creating new order for G\'RAY COUNTRYSIDE CAFÉ:', {
            orderNumber: orderNumber,
            orderCountToday: orderCount,
            currentTime: new Date().toLocaleString('en-PH')
        });
        
        const processedItems = [];
        for (const item of orderData.items) {
            let finalItemName = item.itemName || item.name;
            let finalProductId = item.id || item.productId;
            let finalPrice = item.price;
            
            if (!finalItemName && finalProductId) {
                try {
                    const menuItem = await MenuItem.findById(finalProductId).lean();
                    if (menuItem) {
                        finalItemName = menuItem.itemName || menuItem.name;
                        finalPrice = menuItem.price || finalPrice;
                        console.log(`📌 Fetched item from MenuItem: ${finalItemName}`);
                    }
                } catch (err) {
                    console.warn(`⚠️ Could not fetch MenuItem ${finalProductId}: ${err.message}`);
                }
            }
            
            if (!finalItemName) {
                console.warn(`⚠️ Item has no name - using Unknown Item. Frontend data:`, item);
                finalItemName = "Unknown Item";
            }
            
            processedItems.push({
                name: finalItemName,
                price: finalPrice || 0,
                quantity: item.quantity || 1,
                size: item.size || "Regular",
                image: item.image || 'default_food.jpg',
                productId: finalProductId || null,
                vatable: item.vatable !== undefined ? item.vatable : true
            });
            
            console.log(`  ✓ Item: ${finalItemName} | Qty: ${item.quantity} | Price: ₱${finalPrice}`);
        }
        
        const subtotal = processedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const { vat, net } = HelperFunctions.calculateVAT(subtotal);
        
        let customerId = orderData.customerId;
        let customer = null;
        
        if (customerId) {
            customer = await Customer.findOne({ customerId: customerId });
        }
        
        if (!customer) {
            customerId = HelperFunctions.generateCustomerId();
            
            customer = new Customer({
                customerId: customerId,
                totalOrders: 1,
                totalSpent: orderData.total,
                lastOrderDate: new Date(),
                firstName: orderData.customerName?.split(' ')[0] || 'Customer',
                lastName: orderData.customerName?.split(' ')[1] || '',
                phone: orderData.customerPhone || ''
            });
            
            await customer.save();
        } else {
            customer.totalOrders += 1;
            customer.totalSpent += orderData.total;
            customer.lastOrderDate = new Date();
            await customer.save();
        }
        
        const order = new Order({
            orderNumber,
            items: processedItems,
            subtotal: subtotal,
            tax: vat,
            total: orderData.total,
            payment: {
                method: orderData.payment?.method || "cash",
                amountPaid: amountPaid,
                change: change,
                status: "completed"
            },
            type: orderData.type,
            status: "completed",
            notes: orderData.notes || "",
            customerId: customerId,
            cashier: req.user.username,
            createdAt: new Date()
        });
        
        const savedOrder = await order.save();
        
        console.log('✅ Order created successfully:', {
            orderId: savedOrder._id,
            orderNumber: savedOrder.orderNumber,
            customerId: customerId,
            itemCount: processedItems.length,
            total: savedOrder.total,
            vat: vat,
            createdAt: savedOrder.createdAt.toLocaleString('en-PH')
        });
        
        // 📊 Update daily sales data in MongoDB
        try {
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
            
            // Get or create daily sales record
            let dailySalesRecord = await SalesData.findOne({
                period: 'daily',
                fullDate: { $gte: startOfDay, $lt: endOfDay }
            });
            
            if (!dailySalesRecord) {
                // Create new daily record
                const dateStr = today.toLocaleDateString('en-US');
                const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];
                
                dailySalesRecord = new SalesData({
                    period: 'daily',
                    date: dateStr,
                    fullDate: startOfDay,
                    dayOfWeek: dayOfWeek,
                    totalOrders: 0,
                    totalSales: 0,
                    totalCosts: 0,
                    profit: 0,
                    totalCustomers: 0,
                    items: new Map(),
                    paymentBreakdown: { cash: 0, gcash: 0 },
                    orderTypes: { dineIn: 0, takeOut: 0 },
                    topProducts: []
                });
            }
            
            // Update daily record with new order data
            dailySalesRecord.totalOrders += 1;
            dailySalesRecord.totalSales += savedOrder.total;
            // Only count if this is a new customer for the day
            if (!dailySalesRecord.dailyCustomerIds) {
                dailySalesRecord.dailyCustomerIds = [];
            }
            if (!dailySalesRecord.dailyCustomerIds.includes(customerId)) {
                dailySalesRecord.totalCustomers += 1;
                dailySalesRecord.dailyCustomerIds.push(customerId);
            }
            
            // Update payment breakdown
            const paymentMethod = savedOrder.payment?.method || 'cash';
            if (paymentMethod === 'gcash' || paymentMethod === 'G-Cash') {
                dailySalesRecord.paymentBreakdown.gcash += savedOrder.total;
            } else {
                dailySalesRecord.paymentBreakdown.cash += savedOrder.total;
            }
            
            // Update order types
            if (savedOrder.type === 'Take Out' || savedOrder.type === 'Takeout') {
                dailySalesRecord.orderTypes.takeOut += 1;
            } else {
                dailySalesRecord.orderTypes.dineIn += 1;
            }
            
            // Update items sold
            for (const item of processedItems) {
                const itemName = item.name;
                if (!dailySalesRecord.items.has(itemName)) {
                    dailySalesRecord.items.set(itemName, {
                        quantity: 0,
                        price: item.price,
                        revenue: 0
                    });
                }
                const itemData = dailySalesRecord.items.get(itemName);
                itemData.quantity += item.quantity;
                itemData.revenue += item.price * item.quantity;
            }
            
            // Calculate profit (assuming 35% profit margin)
            dailySalesRecord.profit = dailySalesRecord.totalSales * 0.35;
            
            // Update top products (sort by revenue)
            const itemsArray = Array.from(dailySalesRecord.items.entries()).map(([name, data]) => ({
                name,
                quantity: data.quantity,
                revenue: data.revenue
            }));
            dailySalesRecord.topProducts = itemsArray.sort((a, b) => b.revenue - a.revenue).slice(0, 10);
            
            await dailySalesRecord.save();
            
            console.log('📊 Daily sales data updated:', {
                date: dailySalesRecord.date,
                totalOrders: dailySalesRecord.totalOrders,
                totalSales: dailySalesRecord.totalSales,
                totalCustomers: dailySalesRecord.totalCustomers
            });
        } catch (err) {
            console.error('❌ Error updating daily sales data:', err.message);
            // Don't fail the order if daily sales update fails
        }
        
        const receiptData = HelperFunctions.generateReceipt(savedOrder, customer);
        
        for (const item of processedItems) {
            try {
                const menuItem = await MenuItem.findOne({
                    $or: [
                        { itemName: { $regex: new RegExp(`^${item.name}$`, 'i') } },
                        { name: { $regex: new RegExp(`^${item.name}$`, 'i') } }
                    ]
                });
                
                if (menuItem) {
                    const quantitySold = item.quantity || 1;
                    const previousStock = menuItem.currentStock || 0;
                    
                    menuItem.currentStock = Math.max(0, previousStock - quantitySold);
                    
                    if (menuItem.currentStock <= 0) {
                        menuItem.status = 'out_of_stock';
                    } else if (menuItem.currentStock <= menuItem.minStock) {
                        menuItem.status = 'low_stock';
                    } else {
                        menuItem.status = 'in_stock';
                    }
                    
                    await menuItem.save();
                    
                    console.log(`📉 Updated inventory: ${item.name}`, {
                        quantitySold: quantitySold,
                        newStock: menuItem.currentStock,
                        status: menuItem.status
                    });
                } else {
                    console.warn(`⚠️ MenuItem not found for: ${item.name} (inventory not updated)`);
                }
            } catch (err) {
                console.error(`❌ Error updating inventory for ${item.name}:`, err.message);
            }
        }
        
        // 🆕 DEDUCT RAW INGREDIENTS FROM INVENTORY
        // 🚫 DISABLED: Deductions ONLY happen when products are created in inventory, NOT when customers buy
        // Ingredients are deducted at: POST /api/inventory/deduct-ingredients (when menu product is created)
        // This ensures inventory is only deducted once during product creation, not again during purchase
        console.log('ℹ️ Ingredient deduction DISABLED for customer orders - Only deducts when products are created');
        
        /* 
        // DISABLED CODE - DO NOT USE
        console.log('🧂 Processing raw ingredient deductions...');
        console.log(`🧂 DEBUG: reverseRecipeMapping has ${Object.keys(reverseRecipeMapping).length} dishes:`, Object.keys(reverseRecipeMapping).slice(0, 10));
        
        for (const item of processedItems) {
            try {
                console.log(`🔍 Looking for recipe for item: "${item.name}"`);
                
                // Try exact match first, then case-insensitive match
                let requiredIngredients = reverseRecipeMapping[item.name];
                
                if (!requiredIngredients) {
                    // Try case-insensitive match
                    const matchedDish = Object.keys(reverseRecipeMapping).find(
                        dish => dish.toLowerCase() === item.name.toLowerCase()
                    );
                    console.log(`   Exact match failed, trying case-insensitive. Found: "${matchedDish}"`);
                    requiredIngredients = matchedDish ? reverseRecipeMapping[matchedDish] : null;
                }
                
                if (!requiredIngredients || requiredIngredients.length === 0) {
                    console.log(`ℹ️ No ingredients required for: ${item.name}`);
                    continue;
                }
                
                console.log(`🔗 Deducting ingredients for: ${item.name} (Qty: ${item.quantity}) | Required: [${requiredIngredients.join(', ')}]`);
                
                for (const ingredientName of requiredIngredients) {
                    try {
                        // Try exact match first
                        let inventoryItem = await InventoryItem.findOne({
                            itemName: { $regex: new RegExp(`^${ingredientName}$`, 'i') },
                            itemType: 'raw',
                            isActive: true
                        });
                        
                        // If not found, try partial match (in case of naming variations)
                        if (!inventoryItem) {
                            inventoryItem = await InventoryItem.findOne({
                                itemName: { $regex: new RegExp(ingredientName, 'i') },
                                itemType: 'raw',
                                isActive: true
                            });
                        }
                        
                        if (!inventoryItem) {
                            console.warn(`⚠️ Raw ingredient not found in inventory: ${ingredientName}`);
                            continue;
                        }
                        
                        const quantityToDeduct = item.quantity || 1;
                        const previousStock = inventoryItem.currentStock;
                        const newStock = Math.max(0, previousStock - quantityToDeduct);
                        
                        // Update stock
                        inventoryItem.currentStock = newStock;
                        
                        // Update status based on new stock level
                        if (newStock <= 0) {
                            inventoryItem.status = 'out_of_stock';
                        } else if (newStock <= inventoryItem.minStock) {
                            inventoryItem.status = 'low_stock';
                        } else {
                            inventoryItem.status = 'in_stock';
                        }
                        
                        // Record usage in history
                        inventoryItem.usageHistory.push({
                            quantity: quantityToDeduct,
                            notes: `Deducted for order #${savedOrder.orderNumber} - ${item.name}`,
                            usedBy: req.user.username,
                            date: new Date()
                        });
                        
                        await inventoryItem.save();
                        
                        console.log(`  ✓ ${inventoryItem.itemName}: ${previousStock} → ${newStock} ${inventoryItem.unit} [${inventoryItem.status}]`);
                    } catch (err) {
                        console.error(`❌ Error deducting ingredient ${ingredientName}:`, err.message);
                    }
                }
            } catch (err) {
                console.error(`❌ Error processing ingredients for ${item.name}:`, err.message);
            }
        }
        */
        
        RealTimeManager.sendOrderNotification(savedOrder);
        RealTimeManager.sendStatsUpdate();
        
        res.json({
            success: true,
            message: "Order created successfully",
            data: {
                orderId: savedOrder._id,
                orderNumber: savedOrder.orderNumber,
                customerId: customerId,
                total: savedOrder.total,
                tax: vat,
                change: change,
                receipt: receiptData,
                itemsProcessed: processedItems.length,
                createdAt: savedOrder.createdAt
            }
        });
        
    } catch (error) {
        console.error('❌ Error creating order:', error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to create order"
        });
    }
});

// Get all orders
app.get('/api/orders', verifyToken, async (req, res) => {
    try {
        console.log('📦 API: Fetching all orders...');
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        
        // Build filter
        let filter = {};
        
        if (req.query.status) {
            filter.status = req.query.status;
        }
        
        if (req.query.customerId) {
            filter.customerId = req.query.customerId;
        }
        
        // Date range filtering
        if (req.query.startDate && req.query.endDate) {
            filter.createdAt = {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate)
            };
        }
        
        // Get total count for pagination
        const total = await Order.countDocuments(filter);
        
        // Fetch orders
        const orders = await Order.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        
        console.log(`✅ Orders fetched: ${orders.length} items (Page ${page}, Total: ${total})`);
        
        res.json({
            success: true,
            data: orders,
            pagination: {
                page: page,
                limit: limit,
                total: total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('❌ Error fetching orders:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders',
            error: error.message
        });
    }
});

app.get('/api/orders/:orderId/receipt', verifyToken, async (req, res) => {
    try {
        const orderId = req.params.orderId;
        
        const order = await Order.findById(orderId).lean();
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }
        
        const customer = await Customer.findOne({ 
            customerId: order.customerId 
        }).lean();
        
        const receiptData = HelperFunctions.generateReceipt(order, customer);
        
        res.json({
            success: true,
            data: receiptData
        });
    } catch (error) {
        console.error('Error generating receipt:', error);
        res.status(500).json({
            success: false,
            message: "Failed to generate receipt"
        });
    }
});

app.get('/api/customers', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        let query = {};
        if (search) {
            query.$or = [
                { customerId: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }
        
        const customers = await Customer.find(query)
            .sort({ lastOrderDate: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();
        
        const total = await Customer.countDocuments(query);
        
        res.json({
            success: true,
            data: customers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
});

app.get('/api/inventory', verifyToken, async (req, res) => {
    try {
        console.log('📦 API: Fetching inventory items...');
        const inventoryItems = await InventoryItem.find({}).lean();
        
        const formattedItems = inventoryItems.map(item => ({
            _id: item._id,
            itemId: item._id.toString(),
            itemName: item.itemName || item.name,
            category: item.category,
            currentStock: item.currentStock || 0,
            minStock: item.minStock || 0,
            maxStock: item.maxStock || 0,
            unit: item.unit,
            status: item.currentStock === 0 ? 'out_of_stock' : item.currentStock <= item.minStock ? 'low_stock' : 'in_stock',
            itemType: item.itemType || 'raw_ingredient',
            lastUpdated: item.updatedAt || item.createdAt,
            usageHistory: item.usageHistory || [],
            description: item.description || '',
            isActive: item.isActive !== false
        }));
        
        res.json({
            success: true,
            data: formattedItems,
            outOfStockCount: formattedItems.filter(i => i.status === 'out_of_stock').length,
            lowStockCount: formattedItems.filter(i => i.status === 'low_stock').length
        });
    } catch (error) {
        console.error('❌ Error fetching inventory:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching inventory',
            error: error.message
        });
    }
});

app.get('/api/inventory/name/:itemName', verifyToken, async (req, res) => {
    try {
        const itemName = decodeURIComponent(req.params.itemName);
        console.log(`🔍 API: Looking up inventory by name: "${itemName}"`);
        
        let item = null;
        let fromCollection = null;
        
        let inventoryItem = await InventoryItem.findOne({
            $expr: {
                $eq: [{ $toLower: '$itemName' }, itemName.toLowerCase().trim()]
            }
        }).lean();
        
        if (inventoryItem) {
            item = inventoryItem;
            fromCollection = 'InventoryItem (raw ingredient)';
        } else {
            console.log(`   ℹ️  Not found in raw ingredients, searching menu items...`);
            let menuItem = await MenuItem.findOne({
                $expr: {
                    $eq: [{ $toLower: '$itemName' }, itemName.toLowerCase().trim()]
                }
            }).lean();
            
            if (!menuItem) {
                menuItem = await MenuItem.findOne({
                    $expr: {
                        $eq: [{ $toLower: '$name' }, itemName.toLowerCase().trim()]
                    }
                }).lean();
            }
            
            if (menuItem) {
                item = menuItem;
                fromCollection = 'MenuItem (finished product)';
            }
        }
        
        if (!item) {
            console.warn(`⚠️ No item found for: "${itemName}" in any collection`);
            return res.status(404).json({
                success: false,
                message: `Item "${itemName}" not found in inventory or menu`
            });
        }
        
        const formatted = {
            _id: item._id,
            itemId: item._id.toString(),
            itemName: item.itemName || item.name,
            category: item.category,
            currentStock: item.currentStock || 0,
            minStock: item.minStock || 0,
            maxStock: item.maxStock || 0,
            unit: item.unit,
            status: item.currentStock === 0 ? 'out_of_stock' : item.currentStock <= item.minStock ? 'low_stock' : 'in_stock',
            itemType: item.itemType || 'finished',
            lastUpdated: item.updatedAt || item.createdAt,
            source: fromCollection
        };
        
        console.log(`✅ Found item: "${formatted.itemName}" from ${fromCollection}`);
        res.json({
            success: true,
            data: formatted
        });
    } catch (error) {
        console.error('❌ Error fetching item by name:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching item by name',
            error: error.message
        });
    }
});

app.get('/api/inventory/:itemId', verifyToken, async (req, res) => {
    try {
        console.log(`📦 API: Fetching inventory item ${req.params.itemId}...`);
        const inventoryItem = await InventoryItem.findById(req.params.itemId).lean();
        
        if (!inventoryItem) {
            return res.status(404).json({
                success: false,
                message: 'Inventory item not found'
            });
        }
        
        const formatted = {
            _id: inventoryItem._id,
            itemId: inventoryItem._id.toString(),
            itemName: inventoryItem.itemName || inventoryItem.name,
            category: inventoryItem.category,
            currentStock: inventoryItem.currentStock || 0,
            minStock: inventoryItem.minStock || 0,
            maxStock: inventoryItem.maxStock || 0,
            unit: inventoryItem.unit,
            status: inventoryItem.currentStock === 0 ? 'out_of_stock' : inventoryItem.currentStock <= inventoryItem.minStock ? 'low_stock' : 'in_stock',
            itemType: inventoryItem.itemType || 'raw_ingredient',
            lastUpdated: inventoryItem.updatedAt || inventoryItem.createdAt
        };
        
        res.json({
            success: true,
            data: formatted
        });
    } catch (error) {
        console.error('❌ Error fetching inventory item:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching inventory item',
            error: error.message
        });
    }
});

app.post('/api/inventory', verifyToken, verifyAdmin, async (req, res) => {
    try {
        console.log('📦 API: Creating new inventory item...', JSON.stringify(req.body, null, 2));
        
        const { itemName, category, unit, currentStock, minStock, maxStock, itemType, isWaste, wasteStatus, unitPrice, wasteNotes, wasteRecordedDate, description } = req.body;
        
        if (!itemName) {
            return res.status(400).json({
                success: false,
                message: 'Item name is required'
            });
        }
        
        if (!category) {
            return res.status(400).json({
                success: false,
                message: 'Category is required'
            });
        }
        
        const existingItem = await InventoryItem.findOne({
            itemName: { $regex: `^${itemName.trim()}$`, $options: 'i' }
        });
        
        if (existingItem) {
            console.warn(`⚠️ Duplicate ingredient detected: "${itemName}"`);
            return res.status(409).json({
                success: false,
                message: `Ingredient "${itemName}" already exists in inventory`,
                duplicate: true
            });
        }
        
        const parsedCurrentStock = Number(currentStock) || 0;
        const parsedMinStock = Number(minStock) || 0;
        const parsedMaxStock = Number(maxStock) || 100;
        
        const inventoryItem = new InventoryItem({
            itemName,
            category,
            unit: unit || 'piece',
            currentStock: parsedCurrentStock,
            minStock: parsedMinStock,
            maxStock: parsedMaxStock,
            itemType: itemType || 'raw_ingredient',
            isActive: true,
            // 🚨 Add waste-related fields
            isWaste: isWaste || false,
            wasteStatus: wasteStatus || null,
            unitPrice: unitPrice || 0,
            wasteNotes: wasteNotes || null,
            wasteRecordedDate: wasteRecordedDate || null,
            description: description || ''
        });
        
        await inventoryItem.save();
        
        const formatted = {
            _id: inventoryItem._id,
            itemId: inventoryItem._id.toString(),
            itemName: inventoryItem.itemName,
            category: inventoryItem.category,
            currentStock: inventoryItem.currentStock,
            minStock: inventoryItem.minStock,
            maxStock: inventoryItem.maxStock,
            unit: inventoryItem.unit,
            status: inventoryItem.currentStock === 0 ? 'out_of_stock' : 'in_stock',
            itemType: inventoryItem.itemType,
            // 🚨 Include waste fields in response
            isWaste: inventoryItem.isWaste,
            wasteStatus: inventoryItem.wasteStatus,
            unitPrice: inventoryItem.unitPrice,
            wasteNotes: inventoryItem.wasteNotes,
            wasteRecordedDate: inventoryItem.wasteRecordedDate,
            description: inventoryItem.description
        };
        
        console.log(`✅ Inventory item created: ${inventoryItem._id}`);
        
        RealTimeManager.broadcastToAdmins({
            type: 'inventory_update',
            action: 'created',
            item: formatted
        });
        
        res.status(201).json({
            success: true,
            message: 'Inventory item created successfully',
            data: formatted
        });
    } catch (error) {
        console.error('❌ Error creating inventory item:', error.message);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Error creating inventory item',
            error: error.message
        });
    }
});

app.put('/api/inventory/:itemId', verifyToken, verifyAdmin, async (req, res) => {
    try {
        console.log(`📦 API: Updating inventory item ${req.params.itemId}...`, JSON.stringify(req.body, null, 2));
        
        const { itemName, category, unit, currentStock, minStock, maxStock, itemType, isWaste, wasteStatus, unitPrice, wasteNotes, wasteRecordedDate, description } = req.body;
        const itemId = req.params.itemId;
        
        if (itemName) {
            const existingItem = await InventoryItem.findOne({
                _id: { $ne: itemId },
                itemName: { $regex: `^${itemName.trim()}$`, $options: 'i' }
            });
            
            if (existingItem) {
                console.warn(`⚠️ Duplicate ingredient detected during edit: "${itemName}"`);
                return res.status(409).json({
                    success: false,
                    message: `Another ingredient already has the name "${itemName}"`,
                    duplicate: true
                });
            }
        }
        
        const parsedCurrentStock = Number(currentStock) || 0;
        const parsedMinStock = Number(minStock) || 0;
        const parsedMaxStock = Number(maxStock) || 100;
        
        // 🚨 Build update object with waste fields
        const updateData = {
            itemName,
            category,
            unit: unit || 'piece',
            currentStock: parsedCurrentStock,
            minStock: parsedMinStock,
            maxStock: parsedMaxStock,
            itemType: itemType || 'raw_ingredient',
            isActive: true,
            // Include waste fields
            ...(isWaste !== undefined && { isWaste }),
            ...(wasteStatus && { wasteStatus }),
            ...(unitPrice !== undefined && { unitPrice }),
            ...(wasteNotes && { wasteNotes }),
            ...(wasteRecordedDate && { wasteRecordedDate }),
            ...(description && { description })
        };
        
        const inventoryItem = await InventoryItem.findByIdAndUpdate(
            itemId,
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!inventoryItem) {
            return res.status(404).json({
                success: false,
                message: 'Inventory item not found'
            });
        }
        
        const formatted = {
            _id: inventoryItem._id,
            itemId: inventoryItem._id.toString(),
            itemName: inventoryItem.itemName,
            category: inventoryItem.category,
            currentStock: inventoryItem.currentStock,
            minStock: inventoryItem.minStock,
            maxStock: inventoryItem.maxStock,
            unit: inventoryItem.unit,
            status: inventoryItem.currentStock === 0 ? 'out_of_stock' : inventoryItem.currentStock <= inventoryItem.minStock ? 'low_stock' : 'in_stock',
            itemType: inventoryItem.itemType,
            // 🚨 Include waste fields in response
            isWaste: inventoryItem.isWaste,
            wasteStatus: inventoryItem.wasteStatus,
            unitPrice: inventoryItem.unitPrice,
            wasteNotes: inventoryItem.wasteNotes,
            wasteRecordedDate: inventoryItem.wasteRecordedDate,
            description: inventoryItem.description
        };
        
        console.log(`✅ Inventory item updated: ${inventoryItem._id}`);
        
        RealTimeManager.broadcastToAdmins({
            type: 'inventory_update',
            action: 'updated',
            item: formatted
        });
        
        RealTimeManager.broadcastToStaff({
            type: 'inventory_update',
            action: 'stock_changed',
            itemName: itemName,
            currentStock: parsedCurrentStock,
            isOutOfStock: parsedCurrentStock === 0,
            isLowStock: parsedCurrentStock > 0 && parsedCurrentStock <= parsedMinStock
        });
        
        console.log(`🍽️ Checking affected menu items for "${itemName}"...`);
        await RecipeManager.updateRelatedMenuItems(itemName);
        
        res.json({
            success: true,
            message: 'Inventory item updated successfully',
            data: formatted
        });
    } catch (error) {
        console.error('❌ Error updating inventory item:', error.message);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Error updating inventory item',
            error: error.message
        });
    }
});

// 🧂 DEDUCT RAW INGREDIENTS WHEN MENU ITEM IS CREATED
app.post('/api/inventory/deduct-ingredients', verifyToken, async (req, res) => {
    try {
        const { itemName, quantity = 1, reason = 'Product created' } = req.body;
        
        if (!itemName) {
            return res.status(400).json({
                success: false,
                message: 'Item name is required'
            });
        }
        
        console.log(`🧂 API: Deducting ingredients for: ${itemName} (Qty: ${quantity})`);
        
        // Get required ingredients for this menu item
        const requiredIngredients = reverseRecipeMapping[itemName] || [];
        
        if (requiredIngredients.length === 0) {
            console.log(`ℹ️ No ingredients required for: ${itemName}`);
            return res.json({
                success: true,
                message: 'No ingredients to deduct',
                deductedIngredients: []
            });
        }
        
        const deductedIngredients = [];
        const failedIngredients = [];
        
        for (const ingredientName of requiredIngredients) {
            try {
                const inventoryItem = await InventoryItem.findOne({
                    itemName: { $regex: new RegExp(`^${ingredientName}$`, 'i') },
                    itemType: 'raw',
                    isActive: true
                });
                
                if (!inventoryItem) {
                    console.warn(`⚠️ Raw ingredient not found: ${ingredientName}`);
                    failedIngredients.push(`${ingredientName} (not in inventory)`);
                    continue;
                }
                
                const quantityToDeduct = quantity || 1;
                const previousStock = inventoryItem.currentStock;
                const newStock = Math.max(0, previousStock - quantityToDeduct);
                
                // Update stock
                inventoryItem.currentStock = newStock;
                
                // Update status
                if (newStock <= 0) {
                    inventoryItem.status = 'out_of_stock';
                } else if (newStock <= inventoryItem.minStock) {
                    inventoryItem.status = 'low_stock';
                } else {
                    inventoryItem.status = 'in_stock';
                }
                
                // Record usage
                inventoryItem.usageHistory.push({
                    quantity: quantityToDeduct,
                    notes: `${reason} - ${itemName}`,
                    usedBy: req.user?.username || 'Admin',
                    date: new Date()
                });
                
                await inventoryItem.save();
                
                deductedIngredients.push({
                    ingredient: ingredientName,
                    quantity: quantityToDeduct,
                    unit: inventoryItem.unit,
                    previousStock: previousStock,
                    newStock: newStock,
                    status: inventoryItem.status
                });
                
                console.log(`  ✓ ${ingredientName}: ${previousStock} → ${newStock} ${inventoryItem.unit} [${inventoryItem.status}]`);
                
            } catch (err) {
                console.error(`❌ Error deducting ingredient ${ingredientName}:`, err.message);
                failedIngredients.push(`${ingredientName} (error)`);
            }
        }
        
        res.json({
            success: true,
            message: `Deducted ingredients for ${itemName}`,
            deductedIngredients: deductedIngredients,
            failedIngredients: failedIngredients,
            totalDeducted: deductedIngredients.length
        });
        
    } catch (error) {
        console.error('❌ Error deducting ingredients:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error deducting ingredients',
            error: error.message
        });
    }
});

// 📊 RECORD MANUAL INGREDIENT USAGE
app.post('/api/inventory/:itemId/usage', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { itemId } = req.params;
        const { quantity, notes } = req.body;
        
        if (!quantity || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be greater than 0'
            });
        }
        
        console.log(`📊 Recording usage for item ${itemId}: -${quantity}`);
        
        // Find the inventory item
        const inventoryItem = await InventoryItem.findById(itemId);
        
        if (!inventoryItem) {
            return res.status(404).json({
                success: false,
                message: 'Inventory item not found'
            });
        }
        
        // Check if we have enough stock
        if (quantity > inventoryItem.currentStock) {
            return res.status(400).json({
                success: false,
                message: `Cannot deduct more than current stock (${inventoryItem.currentStock} ${inventoryItem.unit})`
            });
        }
        
        const previousStock = inventoryItem.currentStock;
        const newStock = previousStock - quantity;
        
        // Update stock
        inventoryItem.currentStock = newStock;
        
        // Update status
        if (newStock <= 0) {
            inventoryItem.status = 'out_of_stock';
        } else if (newStock <= inventoryItem.minStock) {
            inventoryItem.status = 'low_stock';
        } else {
            inventoryItem.status = 'in_stock';
        }
        
        // Record usage in history
        inventoryItem.usageHistory.push({
            quantity: quantity,
            notes: notes || 'Manual deduction',
            usedBy: req.user?.username || 'Admin',
            date: new Date()
        });
        
        // Save the changes
        await inventoryItem.save();
        
        console.log(`✅ Usage recorded: ${inventoryItem.itemName}: ${previousStock} → ${newStock} ${inventoryItem.unit}`);
        
        res.json({
            success: true,
            message: 'Usage recorded successfully',
            data: {
                itemName: inventoryItem.itemName,
                quantity: quantity,
                unit: inventoryItem.unit,
                previousStock: previousStock,
                newStock: newStock,
                status: inventoryItem.status
            }
        });
        
    } catch (error) {
        console.error('❌ Error recording usage:', error);
        res.status(500).json({
            success: false,
            message: 'Error recording usage',
            error: error.message
        });
    }
});

app.delete('/api/inventory/:itemId', verifyToken, verifyAdmin, async (req, res) => {
    try {
        console.log(`📦 API: Deleting inventory item ${req.params.itemId}...`);
        
        const inventoryItem = await InventoryItem.findByIdAndDelete(req.params.itemId);
        
        if (!inventoryItem) {
            return res.status(404).json({
                success: false,
                message: 'Inventory item not found'
            });
        }
        
        console.log(`✅ Inventory item deleted: ${req.params.itemId}`);
        
        RealTimeManager.broadcastToAdmins({
            type: 'inventory_update',
            action: 'deleted',
            itemId: req.params.itemId
        });
        
        res.json({
            success: true,
            message: 'Inventory item deleted successfully'
        });
    } catch (error) {
        console.error('❌ Error deleting inventory item:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting inventory item',
            error: error.message
        });
    }
});

app.get('/api/inventory/status/out-of-stock', verifyToken, async (req, res) => {
    try {
        console.log('🚨 API: Fetching out-of-stock items...');
        const outOfStockItems = await InventoryItem.find({ currentStock: { $lte: 0 } }).lean();
        
        const formatted = outOfStockItems.map(item => ({
            _id: item._id,
            itemName: item.itemName || item.name,
            category: item.category,
            currentStock: item.currentStock || 0,
            minStock: item.minStock || 0,
            unit: item.unit,
            status: 'out_of_stock'
        }));
        
        res.json({
            success: true,
            data: formatted,
            count: formatted.length
        });
    } catch (error) {
        console.error('❌ Error fetching out-of-stock items:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching out-of-stock items',
            error: error.message
        });
    }
});

app.get('/api/inventory/status/low-stock', verifyToken, async (req, res) => {
    try {
        console.log('⚠️ API: Fetching low-stock items...');
        const lowStockItems = await InventoryItem.find({
            $expr: { $and: [
                { $gt: ['$currentStock', 0] },
                { $lte: ['$currentStock', '$minStock'] }
            ]}
        }).lean();
        
        const formatted = lowStockItems.map(item => ({
            _id: item._id,
            itemName: item.itemName || item.name,
            category: item.category,
            currentStock: item.currentStock || 0,
            minStock: item.minStock || 0,
            unit: item.unit,
            status: 'low_stock'
        }));
        
        res.json({
            success: true,
            data: formatted,
            count: formatted.length
        });
    } catch (error) {
        console.error('❌ Error fetching low-stock items:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching low-stock items',
            error: error.message
        });
    }
});

app.get("/admindashboard", verifyToken, verifyAdmin, (req, res) => {
    res.redirect("/admindashboard/dashboard");
});

app.get("/admindashboard/dashboard", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const currentTime = new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
        const stats = await DashboardStats.getStats();
        
        res.render("dashboard", { 
            user: req.user,
            currentTime: currentTime,
            stats: stats,
            businessInfo: BUSINESS_INFO
        });
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.render("dashboard", {
            user: req.user,
            currentTime: new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
            stats: DashboardStats.getDefaultStats(),
            businessInfo: BUSINESS_INFO,
            error: "Failed to load dashboard"
        });
    }
});

app.get("/admindashboard/inventory", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [totalItems, lowStockCount, outOfStockCount] = await Promise.all([
            InventoryItem.countDocuments(),
            InventoryItem.countDocuments({ currentStock: { $gt: 0, $lt: CONFIG.LOW_STOCK_THRESHOLD }, isActive: true }),
            InventoryItem.countDocuments({ currentStock: 0, isActive: true })
        ]);
        
        const initialItems = await InventoryItem.find()
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();
        
        const allCategories = [
            'Meat & Poultry', 'Seafood', 'Dairy & Eggs', 'Vegetables & Fruits',
            'Dry Goods', 'Beverages', 'Packaging'
        ];
        
        res.render("Inventory", {
            user: req.user,
            stats: {
                totalItems,
                lowStockCount,
                outOfStockCount
            },
            initialItems: initialItems || [],
            allCategories,
            LOW_STOCK_THRESHOLD: CONFIG.LOW_STOCK_THRESHOLD,
            businessInfo: BUSINESS_INFO
        });
        
    } catch (error) {
        console.error('Error loading Inventory page:', error);
        res.render("Inventory", {
            user: req.user,
            stats: {
                totalItems: 0,
                lowStockCount: 0,
                outOfStockCount: 0
            },
            initialItems: [],
            allCategories: [],
            LOW_STOCK_THRESHOLD: CONFIG.LOW_STOCK_THRESHOLD,
            businessInfo: BUSINESS_INFO
        });
    }
});

app.get("/admindashboard/salesandreports", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const stats = await DashboardStats.getStats();
        res.render("salesandreports", {
            user: req.user,
            title: "Sales & Reports",
            stats: stats,
            businessInfo: BUSINESS_INFO
        });
    } catch (error) {
        console.error('Error loading sales and reports:', error);
        res.render("salesandreports", {
            user: req.user,
            title: "Sales & Reports",
            stats: DashboardStats.getDefaultStats(),
            businessInfo: BUSINESS_INFO
        });
    }
});

app.get("/admindashboard/orderhistory", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const stats = await DashboardStats.getStats();
        res.render("orderhistory", {
            user: req.user,
            stats: stats,
            businessInfo: BUSINESS_INFO
        });
    } catch (error) {
        console.error('Error loading order history:', error);
        res.render("orderhistory", {
            user: req.user,
            stats: DashboardStats.getDefaultStats(),
            businessInfo: BUSINESS_INFO
        });
    }
});

app.get("/admindashboard/addstaff", verifyToken, verifyAdmin, (req, res) => {
    res.render("addstaff", {
        user: req.user,
        businessInfo: BUSINESS_INFO
    });
});

app.get("/admindashboard/menumanagement", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [menuItems, categories, stats] = await Promise.all([
            MenuItem.find().sort({ itemName: 1 }).limit(50),
            MenuItem.distinct("category", { isActive: true }),
            DashboardStats.getStats()
        ]);
        
        res.render("menumanagement", {
            user: req.user,
            initialMenuItems: menuItems || [],
            categories: categories || [],
            stats: stats,
            businessInfo: BUSINESS_INFO
        });
    } catch (error) {
        console.error('Error loading menu management:', error);
        res.render("menumanagement", {
            user: req.user,
            initialMenuItems: [],
            categories: [],
            stats: DashboardStats.getDefaultStats(),
            businessInfo: BUSINESS_INFO
        });
    }
});

app.get('/api/infosettings/user', verifyToken, async (req, res) => {
    try {
        console.log('📝 API: /api/infosettings/user - Fetching user data');
        console.log('Token decoded user:', req.user);
        
        // Get the user ID from the token (could be _id or id)
        const userId = req.user._id || req.user.id || req.user.userId;
        
        if (!userId) {
            console.error('❌ No user ID found in token:', req.user);
            return res.status(401).json({
                success: false,
                message: 'Invalid token: No user ID'
            });
        }
        
        // Get user basic info
        const user = await User.findById(userId).select('-password');
        if (!user) {
            console.warn(`⚠️ User not found with ID: ${userId}`);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        console.log(`✅ User found: ${user.username}`);
        
        // Return only name and role
        res.json({
            success: true,
            data: {
                _id: user._id,
                name: user.fullName || user.name || user.username || '',
                role: user.role || 'user'
            }
        });
    } catch (error) {
        console.error('❌ Error fetching user data:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user data',
            error: error.message
        });
    }
});

// ==================== GET SETTINGS (FOR SETTINGS MODAL) ====================
app.get('/api/settings', verifyToken, async (req, res) => {
    try {
        console.log('📝 API: /api/settings - Fetching user settings');
        
        const userId = req.user._id || req.user.id || req.user.userId;
        
        if (!userId) {
            console.error('❌ No user ID found in token');
            return res.status(401).json({
                success: false,
                message: 'Invalid token: No user ID'
            });
        }
        
        // Get user from database
        const user = await User.findById(userId).select('fullName name username role');
        
        if (!user) {
            console.warn(`⚠️ User not found with ID: ${userId}`);
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        console.log(`✅ Settings fetched for user: ${user.username}`);
        
        res.json({
            success: true,
            data: {
                name: user.fullName || user.name || user.username || 'User',
                role: user.role || 'user',
                username: user.username
            }
        });
    } catch (error) {
        console.error('❌ Error fetching settings:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching settings',
            error: error.message
        });
    }
});

// Alternative user endpoints for compatibility
app.get('/api/user/profile', verifyToken, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id || req.user.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }
        
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        res.json({
            success: true,
            data: {
                _id: user._id,
                name: user.fullName || user.name || user.username || '',
                role: user.role || 'user'
            }
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ success: false, message: 'Error fetching profile' });
    }
});

// Update user profile - simplified to only update name
app.post('/api/infosettings/update', verifyToken, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id || req.user.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }
        
        const { name } = req.body;
        
        console.log('📝 Updating user name:', { userId, name });
        
        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Name is required'
            });
        }
        
        // Update user in database
        const user = await User.findByIdAndUpdate(
            userId,
            { 
                fullName: name,
                name: name,
                updatedAt: new Date()
            },
            { new: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        console.log(`✅ User name updated successfully for: ${user.username}`);
        
        res.json({
            success: true,
            message: 'Name updated successfully',
            data: {
                _id: user._id,
                name: user.fullName || user.name || user.username || '',
                role: user.role || 'user'
            }
        });
    } catch (error) {
        console.error('Error updating user name:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating name',
            error: error.message
        });
    }
});
app.get('/api/user', verifyToken, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id || req.user.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }
        
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        res.json({
            success: true,
            data: {
                _id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName || user.name || user.username,
                phone: user.phone || '',
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ success: false, message: 'Error fetching user' });
    }
});

// Current user endpoint (alias for /api/user)
app.get('/api/user/me', verifyToken, async (req, res) => {
    try {
        const userId = req.user._id || req.user.id || req.user.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }
        
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        res.json({
            success: true,
            data: {
                _id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName || user.name || user.username,
                phone: user.phone || '',
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error fetching current user:', error);
        res.status(500).json({ success: false, message: 'Error fetching current user' });
    }
});

app.get("/admindashboard/infosettings", verifyToken, verifyAdmin, (req, res) => {
    res.render("infosettings", {
        user: req.user,
        businessInfo: BUSINESS_INFO
    });
});

app.get("/admindashboard/settings", verifyToken, verifyAdmin, (req, res) => {
    res.redirect("/admindashboard/infosettings");
});

app.get("/admindashboard/pdf", verifyToken, (req, res) => {
    res.render("pdf", {
        user: req.user
    });
});

app.get("/admindashboard/pdf", verifyToken, (req, res) => {
    res.render("pdf", {
        user: req.user
    });
});

app.get("/admindashboard/stock", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [lowStockItems, outOfStockItems, stats] = await Promise.all([
            InventoryItem.find({
                itemType: 'raw',
                currentStock: { $lt: CONFIG.LOW_STOCK_THRESHOLD, $gte: 1 },
                isActive: true
            }).sort({ currentStock: 1 }).lean(),
            InventoryItem.find({
                itemType: 'raw',
                currentStock: 0,
                isActive: true
            }).sort({ itemName: 1 }).lean(),
            DashboardStats.getStats()
        ]);
        
        res.render("stock", {
            user: req.user,
            lowStockItems: lowStockItems || [],
            outOfStockItems: outOfStockItems || [],
            stats: stats,
            lowStockThreshold: CONFIG.LOW_STOCK_THRESHOLD,
            businessInfo: BUSINESS_INFO
        });
    } catch (error) {
        console.error('Error loading stock page:', error);
        res.render("stock", {
            user: req.user,
            lowStockItems: [],
            outOfStockItems: [],
            stats: DashboardStats.getDefaultStats(),
            lowStockThreshold: CONFIG.LOW_STOCK_THRESHOLD,
            businessInfo: BUSINESS_INFO
        });
    }
});

app.get("/admindashboard/recipes", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const sampleIngredients = Object.keys(recipeMapping).slice(0, 20);
        const sampleDishes = Object.keys(reverseRecipeMapping).slice(0, 20);
        const menuItems = await MenuItem.find({ isActive: true }).limit(10).lean();
        
        res.render("recipes", {
            user: req.user,
            totalIngredients: Object.keys(recipeMapping).length,
            totalDishes: Object.keys(reverseRecipeMapping).length,
            sampleIngredients,
            sampleDishes,
            menuItemsWithRecipes: menuItems || [],
            businessInfo: BUSINESS_INFO
        });
    } catch (error) {
        console.error('Error loading recipes page:', error);
        res.render("recipes", {
            user: req.user,
            totalIngredients: 0,
            totalDishes: 0,
            sampleIngredients: [],
            sampleDishes: [],
            menuItemsWithRecipes: [],
            businessInfo: BUSINESS_INFO
        });
    }
});

app.get("/admindashboard/customers", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [customers, stats] = await Promise.all([
            Customer.find().sort({ lastOrderDate: -1 }).limit(50).lean(),
            DashboardStats.getStats()
        ]);
        
        res.render("customers", {
            user: req.user,
            customers: customers || [],
            stats: stats,
            businessInfo: BUSINESS_INFO
        });
    } catch (error) {
        console.error('Error loading customers page:', error);
        res.render("customers", {
            user: req.user,
            customers: [],
            stats: DashboardStats.getDefaultStats(),
            businessInfo: BUSINESS_INFO
        });
    }
});

app.get("/staffdashboard", verifyToken, async (req, res) => {
    try {
        if (req.user.role === "admin") {
            return res.redirect("/admindashboard/dashboard");
        }

        const [menuItems, categories] = await Promise.all([
            MenuItem.find({ 
                status: 'available',
                isActive: true 
            }).sort({ itemName: 1 }).lean(),
            Category.find().lean()
        ]);
        
        res.render("staffdashboard", {
            user: req.user,
            products: menuItems || [],
            categories: categories || [],
            businessInfo: BUSINESS_INFO
        });
    } catch (err) {
        console.error('❌ Staff dashboard error:', err);
        res.render("staffdashboard", {
            user: req.user,
            products: [],
            categories: [],
            businessInfo: BUSINESS_INFO,
            error: "Failed to load menu items"
        });
    }
});

app.get("/requeststocks", verifyToken, async (req, res) => {
    try {
        if (req.user.role === "admin") {
            return res.redirect("/admindashboard/dashboard");
        }

        const menuItems = await MenuItem.find({ 
            isActive: true 
        }).sort({ itemName: 1 }).lean();
        
        res.render("requeststocks", {
            user: req.user,
            products: menuItems || [],
            businessInfo: BUSINESS_INFO
        });
    } catch (err) {
        console.error('❌ Request stocks page error:', err);
        res.render("requeststocks", {
            user: req.user,
            products: [],
            businessInfo: BUSINESS_INFO,
            error: "Failed to load products"
        });
    }
});

app.post("/register", async (req, res) => {
    try {
        const referer = req.headers.referer || req.headers.referrer;
        const isFormSubmission = referer && referer.includes('/admindashboard/addstaff');
        
        if (!isFormSubmission && req.headers['content-type'] && req.headers['content-type'].includes('application/x-www-form-urlencoded')) {
            return res.status(403).send(renderToast('Access denied. Use admin dashboard to register staff.', 'error', '/admindashboard'));
        }

        const { user, pass, role, name, email, phone } = req.body;
        
        if (!user || !pass) {
            return res.status(400).send(renderToast('Username and password are required', 'error'));
        }

        const existingUser = await User.findOne({ username: user });
        if (existingUser) {
            return res.status(409).send(renderToast('User already exists', 'error'));
        }

        const hashedPassword = bcrypt.hashSync(pass, 10);
        const newUser = new User({ 
            username: user, 
            password: hashedPassword, 
            role: role || "staff",
            status: "active",
            name: name || user,
            email: email || `${user}@graycafe.com`,
            phone: phone || ''
        });

        await newUser.save();
        
        res.status(201).send(renderToast('Staff Successfully Registered!', 'success', '/admindashboard/addstaff'));
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).send(renderToast(`Server error: ${err.message}`, 'error'));
    }
});

app.post("/login", async (req, res) => {
    try {
        const { user, pass } = req.body;

        // ==================== 🔒 CHECK IF ACCOUNT IS LOCKED ====================
        if (isAccountLocked(user)) {
            const remainingSeconds = getRemainingLockoutTime(user);
            const minutes = Math.ceil(remainingSeconds / 60);
            console.log(`🔒 Login attempt blocked for ${user}. Remaining lockout: ${minutes} minutes`);
            
            return res.render("login", {
                error: `Too many failed login attempts. Please try again in ${minutes} minute(s).`,
                businessInfo: BUSINESS_INFO,
                isLocked: true,
                remainingSeconds: remainingSeconds
            });
        }

        const existingUser = await User.findOne({ username: user });
        if (!existingUser) {
            recordFailedAttempt(user);
            const attempts = getLoginAttempts(user).attempts;
            
            console.log(`❌ Failed login attempt for ${user} (${attempts}/${CONFIG.MAX_LOGIN_ATTEMPTS})`);
            
            return res.render("login", {
                error: null,
                businessInfo: BUSINESS_INFO,
                isLocked: false,
                remainingSeconds: 0
            });
        }

        if (existingUser.status === "inactive") {
            recordFailedAttempt(user);
            console.log(`❌ Inactive account login attempt for ${user}`);
            
            return res.render("login", {
                error: null,
                businessInfo: BUSINESS_INFO,
                isLocked: false,
                remainingSeconds: 0
            });
        }

        const isMatch = bcrypt.compareSync(pass, existingUser.password);
        if (!isMatch) {
            recordFailedAttempt(user);
            const attempts = getLoginAttempts(user).attempts;
            const remaining = CONFIG.MAX_LOGIN_ATTEMPTS - attempts;
            
            console.log(`❌ Invalid password for ${user} (${attempts}/${CONFIG.MAX_LOGIN_ATTEMPTS})`);
            
            if (attempts >= CONFIG.MAX_LOGIN_ATTEMPTS) {
                return res.render("login", {
                    error: "Too many failed login attempts. Please try again in 5 minutes.",
                    businessInfo: BUSINESS_INFO,
                    isLocked: true,
                    remainingSeconds: CONFIG.LOCKOUT_TIME / 1000
                });
            }
            
            return res.render("login", {
                error: `Invalid password. (${remaining} attempts remaining)`,
                businessInfo: BUSINESS_INFO,
                isLocked: false,
                remainingSeconds: 0
            });
        }

        // ==================== ✅ SUCCESSFUL LOGIN ====================
        console.log(`✅ Successful login for ${user} (Role: ${existingUser.role})`);
        
        // Clear failed login attempts
        resetLoginAttempts(user);

        const token = jwt.sign(
            { 
                id: existingUser._id, 
                username: existingUser.username, 
                role: existingUser.role,
                name: existingUser.name
            },
            process.env.JWT_SECRET,
            { expiresIn: CONFIG.JWT_EXPIRY }
        );

        res.cookie("token", token, {
            httpOnly: true,
            sameSite: "strict",
            maxAge: 1000 * 60 * 60 * 24 * 365
        });

        // ==================== 🎯 REDIRECT TO DESIGNATED ROLE ====================
        if (existingUser.role === "admin") {
            console.log(`🔐 Redirecting ${user} to admin dashboard`);
            return res.redirect("/admindashboard/dashboard");
        } else if (existingUser.role === "staff") {
            console.log(`🔐 Redirecting ${user} to staff dashboard`);
            return res.redirect("/staffdashboard");
        } else {
            console.log(`⚠️ Unknown role for ${user}: ${existingUser.role}`);
            return res.redirect("/staffdashboard"); // Default to staff dashboard
        }

    } catch (err) {
        console.error('Login error:', err);
        res.render("login", {
            error: "Login error. Please try again.",
            businessInfo: BUSINESS_INFO,
            isLocked: false,
            remainingSeconds: 0
        });
    }
});

const renderToast = (message, type = 'info', redirectUrl = null) => {
    const bgColor = type === 'error' ? '#f8d7da' : type === 'success' ? '#d4edda' : '#d1ecf1';
    const borderColor = type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#0c5460';
    const textColor = type === 'error' ? '#721c24' : type === 'success' ? '#155724' : '#0c5460';
    const icon = type === 'error' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Info'}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .toast { padding: 16px 20px; border-radius: 8px; margin-bottom: 20px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: slideInRight 0.5s ease;
                        display: flex; align-items: center; gap: 12px; 
                        background-color: ${bgColor}; color: ${textColor}; border-left: 4px solid ${borderColor}; }
                @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="toast">
                    <span>${icon}</span>
                    <span>${message}</span>
                </div>
            </div>
            <script>
                setTimeout(() => {
                    ${redirectUrl ? `window.location.href = '${redirectUrl}'` : 'history.back()'}
                }, 2500);
            </script>
        </body>
        </html>
    `;
};

app.post("/api/stock-requests", verifyToken, async (req, res) => {
    try {
        console.log('📡 Stock request received. Body:', JSON.stringify(req.body, null, 2));
        let { productId, productName, requestedQuantity, unit, priority, requestedBy, status } = req.body;
        
        console.log('🔍 Before parsing - requestedQuantity:', requestedQuantity, 'Type:', typeof requestedQuantity);
        
        if (requestedQuantity !== null && requestedQuantity !== undefined) {
            requestedQuantity = Number(requestedQuantity);
        }
        
        console.log('🔍 After parsing - requestedQuantity:', requestedQuantity, 'Type:', typeof requestedQuantity);
        console.log('✓ Extracted fields:', { productName, requestedQuantity, unit, priority, isNaN: isNaN(requestedQuantity) });
        
        if (!productName || productName.trim() === '') {
            console.error('❌ Missing productName:', productName);
            return res.status(400).json({ 
                success: false, 
                message: "Missing required field: productName",
                received: { productName, requestedQuantity }
            });
        }
        
        if (requestedQuantity === undefined || requestedQuantity === null || isNaN(requestedQuantity)) {
            console.error('❌ Invalid requestedQuantity:', requestedQuantity);
            return res.status(400).json({ 
                success: false, 
                message: "Missing or invalid required field: requestedQuantity must be a number",
                received: { productName, requestedQuantity }
            });
        }
        
        if (requestedQuantity <= 0) {
            console.error('❌ requestedQuantity must be greater than 0:', requestedQuantity);
            return res.status(400).json({ 
                success: false, 
                message: "requestedQuantity must be greater than 0",
                received: { productName, requestedQuantity }
            });
        }
        
        const existingPendingRequest = await StockRequest.findOne({
            productName: productName,
            status: 'pending'
        });
        
        if (existingPendingRequest) {
            const hoursOld = (Date.now() - new Date(existingPendingRequest.requestDate)) / (1000 * 60 * 60);
            
            if (hoursOld < 24) {
                console.log(`🔄 Updating existing pending request for: ${productName} (${hoursOld.toFixed(1)} hours old)`);
                console.log(`📝 Old quantity: ${existingPendingRequest.requestedQuantity}, New quantity: ${requestedQuantity}`);
                
                existingPendingRequest.requestedQuantity = requestedQuantity;
                existingPendingRequest.requestDate = new Date();
                await existingPendingRequest.save();
                
                return res.status(200).json({
                    success: true,
                    message: `Stock request for ${productName} updated with quantity: ${requestedQuantity}`,
                    updated: true,
                    data: existingPendingRequest,
                    hoursOld: hoursOld
                });
            } else {
                console.log(`🗑️ Removing stale stock request for: ${productName} (${hoursOld.toFixed(1)} hours old)`);
                await StockRequest.deleteOne({ _id: existingPendingRequest._id });
            }
        }
        
        console.log('📦 Creating StockRequest object with:', {
            productName,
            requestedQuantity,
            unit: unit || 'units',
            priority: priority || 'medium'
        });
        
        const requestObj = {
            productName: productName.trim(),
            requestedQuantity: requestedQuantity,
            unit: unit || 'units',
            priority: priority || 'medium',
            requestedBy: requestedBy || 'staff',
            status: status || 'pending',
            requestDate: new Date()
        };
        
        if (productId && productId.trim) {
            productId = productId.trim();
        }
        if (productId) {
            requestObj.productId = productId;
            console.log('📦 Using productId:', productId);
        } else {
            console.log('📦 No productId provided, using productName as identifier');
        }
        
        const stockRequest = new StockRequest(requestObj);
        
        console.log('💾 Attempting to save to MongoDB...');
        await stockRequest.save();
        console.log(`✅ Stock request SAVED to MongoDB: ${productName} x${requestedQuantity} - ID: ${stockRequest._id}`);
        
        const notification = {
            type: 'stock_request',
            title: `📦 Stock Request from Staff`,
            message: `Staff requested ${requestedQuantity} ${unit} of ${productName}`,
            productName: productName,
            requestedQuantity: requestedQuantity,
            unit: unit,
            priority: priority,
            status: 'pending',
            requestId: stockRequest._id,
            timestamp: new Date(),
            data: stockRequest
        };
        
        RealTimeManager.broadcastToAdmins(notification);
        console.log(`📢 Notification broadcasted: Stock request for ${productName}`);
        
        res.status(201).json({
            success: true,
            message: "Stock request submitted successfully",
            data: stockRequest
        });
    } catch (error) {
        console.error("❌ Error creating stock request:", error.message);
        console.error("Error type:", error.constructor.name);
        console.error("Stack trace:", error.stack);
        
        if (error.name === 'ValidationError') {
            const validationErrors = Object.entries(error.errors).map(([field, err]) => ({
                field,
                message: err.message
            }));
            console.error('🔴 Validation errors:', validationErrors);
            
            return res.status(400).json({
                success: false,
                message: "Validation error",
                validationErrors,
                error: error.message
            });
        }
        
        if (error.code === 11000) {
            console.error('🔴 Duplicate key error:', error.keyPattern);
            return res.status(400).json({
                success: false,
                message: "Duplicate request",
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: "Failed to create stock request",
            error: error.message,
            details: error.toString()
        });
    }
});

app.post("/api/stock-requests/fulfill", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { notificationId, productId, productName, quantity, unit, newStock } = req.body;
        
        console.log(`\n📦 ========== FULFILLING STOCK REQUEST ==========`);
        console.log(`Product: ${productName}`);
        console.log(`Quantity: ${quantity} ${unit}`);
        console.log(`New Stock: ${newStock}`);
        console.log(`================================================\n`);
        
        if (!productName || !quantity || quantity <= 0) {
            console.error(`❌ Validation failed: Invalid productName or quantity`);
            return res.status(400).json({
                success: false,
                message: 'productName and quantity (>0) are required'
            });
        }
        
        const stockRequest = await StockRequest.findOne({
            productName: productName,
            status: 'pending'
        });
        
        if (!stockRequest) {
            console.error(`❌ Stock request not found for: ${productName}`);
            return res.status(404).json({
                success: false,
                message: `No pending stock request found for ${productName}`
            });
        }
        
        stockRequest.status = 'fulfilled';
        stockRequest.fulfilledDate = new Date();
        stockRequest.fulfilledQuantity = quantity;
        
        await stockRequest.save();
        console.log(`✅ Stock request marked as fulfilled`);
        
        try {
            const menuItem = await MenuItem.findOne({
                $or: [
                    { name: productName },
                    { itemName: productName },
                    { _id: productId }
                ]
            });
            
            if (menuItem) {
                const oldStock = menuItem.currentStock || 0;
                menuItem.currentStock = quantity;
                await menuItem.save();
                console.log(`✅ Updated menu item stock: ${oldStock} → ${menuItem.currentStock} (SET to requested quantity)`);
            } else {
                console.warn(`⚠️ Menu item not found for: ${productName}`);
            }
        } catch (menuUpdateError) {
            console.error(`❌ Error updating menu item stock:`, menuUpdateError.message);
        }
        
        const stockUpdateNotification = {
            type: 'stock_fulfilled',
            title: `📦 Stock Request Fulfilled`,
            message: `${quantity} ${unit} of ${productName} has been added to inventory`,
            productName: productName,
            quantity: quantity,
            unit: unit,
            newStock: newStock,
            status: 'fulfilled',
            timestamp: new Date(),
            data: stockRequest
        };
        
        RealTimeManager.broadcastToStaff(stockUpdateNotification);
        console.log(`📢 Stock fulfilled notification broadcasted to staff: ${productName}`);
        
        res.status(200).json({
            success: true,
            message: `Stock request fulfilled successfully`,
            data: {
                productName: productName,
                quantity: quantity,
                unit: unit,
                newStock: newStock,
                fulfilledDate: stockRequest.fulfilledDate
            }
        });
        
    } catch (error) {
        console.error("Error fulfilling stock request:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fulfill stock request",
            error: error.message
        });
    }
});

app.delete("/api/stock-requests/clear-old-pending", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const result = await StockRequest.deleteMany({
            status: 'pending',
            requestDate: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });
        
        res.status(200).json({
            success: true,
            message: `Cleared ${result.deletedCount} old pending stock requests`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error("Error clearing old pending requests:", error);
        res.status(500).json({
            success: false,
            message: "Failed to clear old pending requests",
            error: error.message
        });
    }
});

app.delete("/api/stock-requests/clear-all-pending", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const result = await StockRequest.deleteMany({
            status: 'pending'
        });
        
        console.log(`🗑️ Cleared all ${result.deletedCount} pending stock requests`);
        
        res.status(200).json({
            success: true,
            message: `Cleared all ${result.deletedCount} pending stock requests`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error("Error clearing all pending requests:", error);
        res.status(500).json({
            success: false,
            message: "Failed to clear all pending requests",
            error: error.message
        });
    }
});

app.get("/api/stock-requests/debug/pending-list", async (req, res) => {
    try {
        const pendingRequests = await StockRequest.find({ status: 'pending' }).sort({ requestDate: -1 });
        
        res.status(200).json({
            success: true,
            count: pendingRequests.length,
            requests: pendingRequests.map(req => ({
                id: req._id,
                productName: req.productName,
                quantity: req.requestedQuantity,
                requestedAt: req.requestDate,
                hoursOld: ((Date.now() - new Date(req.requestDate)) / (1000 * 60 * 60)).toFixed(1)
            }))
        });
    } catch (error) {
        console.error("Error fetching pending requests:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch pending requests",
            error: error.message
        });
    }
});

app.delete("/api/stock-requests/debug/pending/:productName", async (req, res) => {
    try {
        const result = await StockRequest.deleteOne({
            productName: req.params.productName,
            status: 'pending'
        });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: `No pending request found for ${req.params.productName}`
            });
        }
        
        console.log(`🗑️ Deleted pending request for: ${req.params.productName}`);
        
        res.status(200).json({
            success: true,
            message: `Deleted pending request for ${req.params.productName}`
        });
    } catch (error) {
        console.error("Error deleting pending request:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete pending request",
            error: error.message
        });
    }
});

app.get("/api/stock-requests/pending", verifyToken, async (req, res) => {
    try {
        const pendingRequests = await StockRequest.find({ status: 'pending' })
            .sort({ requestDate: -1 })
            .lean();
        
        res.status(200).json({
            success: true,
            data: pendingRequests
        });
    } catch (error) {
        console.error("Error fetching pending stock requests:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch stock requests",
            error: error.message
        });
    }
});

app.get("/api/stock-requests", verifyToken, async (req, res) => {
    try {
        const query = {};
        if (req.query.status) {
            query.status = req.query.status;
        }
        
        console.log(`📡 Fetching stock requests with query:`, query);
        
        const requests = await StockRequest.find(query)
            .sort({ requestDate: -1 })
            .lean();
        
        console.log(`✅ Found ${requests.length} stock requests`);
        
        res.status(200).json({
            success: true,
            data: requests
        });
    } catch (error) {
        console.error("Error fetching stock requests:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch stock requests",
            error: error.message
        });
    }
});

app.put("/api/stock-requests/:id", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, fulfilledQuantity, notes } = req.body;
        
        const stockRequest = await StockRequest.findByIdAndUpdate(
            id,
            {
                status,
                fulfilledQuantity: fulfilledQuantity || 0,
                fulfilledDate: status === 'fulfilled' ? new Date() : undefined,
                notes: notes || ''
            },
            { new: true }
        );
        
        if (!stockRequest) {
            return res.status(404).json({
                success: false,
                message: "Stock request not found"
            });
        }
        
        console.log(`✅ Stock request updated: ${stockRequest.productName} - Status: ${status}`);
        
        if (status === 'fulfilled') {
            const notification = {
                type: 'stock_request_fulfilled',
                title: `✅ Stock Request Fulfilled`,
                message: `Your request for ${stockRequest.productName} has been fulfilled!`,
                productName: stockRequest.productName,
                productId: stockRequest.productId,
                requestId: stockRequest._id,
                fulfilledQuantity: fulfilledQuantity || stockRequest.requestedQuantity,
                timestamp: new Date()
            };
            
            RealTimeManager.broadcastToStaff(notification);
            console.log(`📢 Fulfillment notification broadcasted: ${stockRequest.productName}`);
        }
        
        res.status(200).json({
            success: true,
            message: "Stock request updated successfully",
            data: stockRequest
        });
    } catch (error) {
        console.error("Error updating stock request:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update stock request",
            error: error.message
        });
    }
});

// Confirm stock request
app.put("/api/stock-requests/:id/confirm", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { productStock } = req.body; // Optional: frontend can send current stock to calculate new stock
        
        const stockRequest = await StockRequest.findById(id);
        
        if (!stockRequest) {
            return res.status(404).json({
                success: false,
                message: "Stock request not found"
            });
        }
        
        console.log(`\n📦 ========== CONFIRMING STOCK REQUEST ==========`);
        console.log(`Request ID: ${id}`);
        console.log(`Product: ${stockRequest.productName}`);
        console.log(`Quantity: ${stockRequest.requestedQuantity}`);
        
        // Update the stock request status
        stockRequest.status = 'approved';
        stockRequest.confirmedDate = new Date();
        stockRequest.confirmedBy = req.user._id;
        await stockRequest.save();
        
        console.log(`✅ Stock request status updated to approved`);
        
        // Try to update the actual product stock
        try {
            const MenuItem = mongoose.model('MenuItem');
            
            // Try to find by productName first
            let product = await MenuItem.findOne({ 
                $or: [
                    { name: stockRequest.productName },
                    { itemName: stockRequest.productName }
                ]
            });
            
            if (product) {
                const currentStock = product.currentStock || 0;
                const newStock = currentStock + stockRequest.requestedQuantity;
                
                console.log(`📊 Product found: ${product.name || product.itemName}`);
                console.log(`Current stock: ${currentStock} → New stock: ${newStock}`);
                
                // Update product stock
                product.currentStock = newStock;
                await product.save();
                
                console.log(`✅ Product stock updated successfully`);
                stockRequest.stockUpdatedFlag = true;
                await stockRequest.save();
            } else {
                console.warn(`⚠️ Product not found for: ${stockRequest.productName}`);
                console.log(`Available product names to check:`, stockRequest.productName);
            }
        } catch (updateError) {
            console.warn(`⚠️ Could not auto-update product stock:`, updateError.message);
            // Don't fail the request - just log the warning
        }
        
        console.log(`================================================\n`);
        
        res.status(200).json({
            success: true,
            message: "Stock request confirmed successfully",
            data: stockRequest
        });
    } catch (error) {
        console.error("Error confirming stock request:", error);
        res.status(500).json({
            success: false,
            message: "Failed to confirm stock request",
            error: error.message
        });
    }
});

// Reject stock request
app.put("/api/stock-requests/:id/reject", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        
        const stockRequest = await StockRequest.findByIdAndUpdate(
            id,
            {
                status: 'rejected',
                rejectedDate: new Date(),
                rejectedBy: req.user._id,
                rejectionReason: reason || 'No reason provided'
            },
            { new: true }
        );
        
        if (!stockRequest) {
            return res.status(404).json({
                success: false,
                message: "Stock request not found"
            });
        }
        
        console.log(`❌ Stock request rejected: ${stockRequest._id}`);
        
        res.status(200).json({
            success: true,
            message: "Stock request rejected successfully",
            data: stockRequest
        });
    } catch (error) {
        console.error("Error rejecting stock request:", error);
        res.status(500).json({
            success: false,
            message: "Failed to reject stock request",
            error: error.message
        });
    }
});

app.delete("/api/stock-requests/:id", verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const stockRequest = await StockRequest.findByIdAndDelete(id);
        
        if (!stockRequest) {
            return res.status(404).json({
                success: false,
                message: "Stock request not found"
            });
        }
        
        res.status(200).json({
            success: true,
            message: "Stock request deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting stock request:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete stock request",
            error: error.message
        });
    }
});

app.get('/images/default_food.jpg', (req, res) => {
    res.sendFile(path.join(__dirname, 'images', 'default_food.png'));
});

app.get("/logout", (req, res) => {
    res.clearCookie("token");
    res.redirect("/login?logout=true");
});

// API endpoint for logout (used by frontend)
app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.json({ 
        success: true, 
        message: "Logged out successfully" 
    });
});

app.get('/login', (req, res) => {
    res.render('login', { 
        businessInfo: BUSINESS_INFO,
        error: null,
        isLocked: false,
        remainingSeconds: 0
    });
});

app.get('/', (req, res) => {
    const token = req.cookies.token;
    
    if (!token) {
        return res.redirect('/login');
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if (decoded.role === 'admin') {
            return res.redirect('/admindashboard/dashboard');
        } else {
            return res.redirect('/staffdashboard');
        }
    } catch (error) {
        res.clearCookie("token");
        return res.redirect('/login');
    }
});

let staffClients = [];

app.post('/api/admin/notify-out-of-stock', verifyToken, async (req, res) => {
    try {
        const { productName, productId, timestamp, notifiedFrom } = req.body;
        
        console.log(`🚨 OUT OF STOCK NOTIFICATION: ${productName} (ID: ${productId})`);
        console.log(`   Notified by: ${notifiedFrom}`);
        console.log(`   Timestamp: ${timestamp}`);
        
        const notification = {
            type: 'out_of_stock_alert',
            severity: 'critical',
            productName: productName,
            productId: productId,
            message: `🚨 ${productName} is OUT OF STOCK!`,
            timestamp: timestamp,
            notifiedFrom: notifiedFrom
        };
        
        RealTimeManager.broadcastToAdmins(notification);
        
        res.json({
            success: true,
            message: `Notification sent to admins about ${productName}`,
            notification: notification
        });
    } catch (error) {
        console.error('❌ Error sending out of stock notification:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending notification',
            error: error.message
        });
    }
});

app.post('/api/staff/inventory/receive', async (req, res) => {
    try {
        const transferData = req.body;
        console.log('📦 Direct staff inventory update:', transferData);
        
        let sentCount = 0;
        staffClients.forEach(client => {
            try {
                client.res.write(`data: ${JSON.stringify(transferData)}\n\n`);
                sentCount++;
            } catch (e) {
                console.error(`❌ Error sending to client ${client.id}:`, e);
            }
        });
        
        res.json({ 
            success: true, 
            message: 'Staff inventory updated',
            clientsNotified: sentCount
        });
    } catch (error) {
        console.error('❌ Error updating staff inventory:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/admin/emit-stock-transfer', async (req, res) => {
    try {
        const transferData = req.body;
        console.log('📡 Emitting stock transfer event to staff:', transferData);
        
        const notification = {
            type: 'stock_transfer',
            action: 'stock_received',
            itemName: transferData.itemName,
            itemId: transferData.itemId,
            quantitySent: transferData.quantitySent,
            unit: transferData.unit,
            newStaffStock: transferData.newStaffStock,
            timestamp: transferData.timestamp,
            transferredBy: transferData.transferredBy
        };
        
        RealTimeManager.broadcastToStaff(notification);
        console.log(`✅ Stock transfer broadcasted to all staff: ${transferData.itemName} x${transferData.quantitySent}`);
        
        res.json({ success: true, message: 'Stock transfer event emitted successfully' });
    } catch (error) {
        console.error('❌ Error emitting stock transfer event:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: '/ws' });

const staffWebSocketConnections = new Set();

// ======================== NOTIFICATION ENDPOINTS ========================

// Send profile update notification
app.post('/api/notify/profile-update', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const user = req.user;
        const { email, fullName, phone } = req.body;
        
        console.log(`📧 Sending profile update email to ${email}...`);
        
        const updatedData = {
            fullName: fullName || user.username,
            email: email,
            phone: phone
        };
        
        const emailSent = await notificationService.sendProfileUpdateEmail(email, updatedData);
        
        // Try to send SMS if phone number is provided
        let smsSent = false;
        if (phone) {
            smsSent = await notificationService.sendSMSToAdmin(
                phone,
                `Hello ${updatedData.fullName}, your profile was updated at ${new Date().toLocaleTimeString('en-PH')}. - G'RAY CAFÉ POS`
            );
        }
        
        res.json({
            success: true,
            message: 'Notifications sent',
            emailSent: emailSent,
            smsSent: smsSent,
            timestamp: new Date().toLocaleString('en-PH')
        });
    } catch (error) {
        console.error('❌ Error sending notification:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending notification',
            error: error.message
        });
    }
});

// Send password change notification
app.post('/api/notify/password-change', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const user = req.user;
        const { email, fullName, phone } = req.body;
        
        console.log(`📧 Sending password change email to ${email}...`);
        
        const emailSent = await notificationService.sendPasswordChangeEmail(email, fullName || user.username);
        
        // Try to send SMS if phone number is provided
        let smsSent = false;
        if (phone) {
            smsSent = await notificationService.sendSMSToAdmin(
                phone,
                `⚠️ Your password was changed at ${new Date().toLocaleTimeString('en-PH')}. If not you, contact admin immediately. - G'RAY CAFÉ POS`
            );
        }
        
        res.json({
            success: true,
            message: 'Password change notifications sent',
            emailSent: emailSent,
            smsSent: smsSent,
            timestamp: new Date().toLocaleString('en-PH')
        });
    } catch (error) {
        console.error('❌ Error sending password change notification:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending password change notification',
            error: error.message
        });
    }
});

// Generic email endpoint
app.post('/api/notify/send-email', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { email, subject, htmlContent } = req.body;
        
        if (!email || !subject || !htmlContent) {
            return res.status(400).json({
                success: false,
                message: 'Email, subject, and content are required'
            });
        }
        
        console.log(`📧 Sending custom email to ${email}...`);
        
        const sent = await notificationService.sendEmailToAdmin(email, subject, htmlContent);
        
        if (sent) {
            res.json({
                success: true,
                message: 'Email sent successfully',
                email: email
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Failed to send email'
            });
        }
    } catch (error) {
        console.error('❌ Error sending custom email:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending email',
            error: error.message
        });
    }
});

// Generic SMS endpoint
app.post('/api/notify/send-sms', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { phone, message } = req.body;
        
        if (!phone || !message) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and message are required'
            });
        }
        
        console.log(`📱 Sending SMS to ${phone}...`);
        
        const sent = await notificationService.sendSMSToAdmin(phone, message);
        
        res.json({
            success: true,
            message: 'SMS notification processed',
            phone: phone,
            sent: sent
        });
    } catch (error) {
        console.error('❌ Error sending SMS:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending SMS',
            error: error.message
        });
    }
});

wss.on('connection', (ws, req) => {
    const url = req.url;
    
    if (url.includes('/ws/staff')) {
        staffWebSocketConnections.add(ws);
        console.log(`✅ Staff WebSocket connected. Total: ${staffWebSocketConnections.size}`);
        
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                console.log('📨 WebSocket message from staff:', data);
            } catch (e) {
                console.error('Error parsing WebSocket message:', e);
            }
        });
        
        ws.on('close', () => {
            staffWebSocketConnections.delete(ws);
            console.log(`❌ Staff WebSocket disconnected. Total: ${staffWebSocketConnections.size}`);
        });
    }
    
    if (url.includes('/ws/admin')) {
        console.log('✅ Admin WebSocket connected');
        
        ws.on('close', () => {
            console.log('❌ Admin WebSocket disconnected');
        });
    }
});

server.listen(CONFIG.SERVER_PORT, () => {
    console.log(`✅ Server is running at http://localhost:${CONFIG.SERVER_PORT}`);
    console.log(`✅ WebSocket server running on ws://localhost:${CONFIG.SERVER_PORT}/ws`);
});