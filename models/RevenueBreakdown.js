import mongoose from "mongoose";

const revenueBreakdownSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  dateString: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  breakdown: {
    'Coffee': {
      amount: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
      items: [{ name: String, quantity: Number, amount: Number }]
    },
    'Snacks & Appetizers': {
      amount: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
      items: [{ name: String, quantity: Number, amount: Number }]
    },
    'Rice Bowl Meals': {
      amount: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
      items: [{ name: String, quantity: Number, amount: Number }]
    },
    'Hot Sizzlers': {
      amount: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
      items: [{ name: String, quantity: Number, amount: Number }]
    },
    'Party Platters': {
      amount: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
      items: [{ name: String, quantity: Number, amount: Number }]
    },
    'Budget Meals': {
      amount: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
      items: [{ name: String, quantity: Number, amount: Number }]
    },
    'Specialty Dishes': {
      amount: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
      items: [{ name: String, quantity: Number, amount: Number }]
    },
    'Milk Tea': {
      amount: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
      items: [{ name: String, quantity: Number, amount: Number }]
    },
    'Frappe': {
      amount: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
      items: [{ name: String, quantity: Number, amount: Number }]
    },
    'Beverages': {
      amount: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
      items: [{ name: String, quantity: Number, amount: Number }]
    },
    'Other': {
      amount: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
      items: [{ name: String, quantity: Number, amount: Number }]
    }
  },
  totalRevenue: {
    type: Number,
    required: true,
    default: 0
  },
  totalItems: {
    type: Number,
    default: 0
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  topCategory: {
    name: String,
    amount: Number,
    percentage: Number
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true,
  collection: 'revenueBreakdowns'
});

export default mongoose.models.RevenueBreakdown || mongoose.model('RevenueBreakdown', revenueBreakdownSchema);
