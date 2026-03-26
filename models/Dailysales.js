import mongoose from "mongoose";

// Daily Sales Schema
const dailySalesSchema = new mongoose.Schema({
  dateKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    default: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today;
    },
    index: true
  },
  totalOrders: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSales: {
    type: Number,
    default: 0,
    min: 0
  },
  totalCosts: {
    type: Number,
    default: 0,
    min: 0
  },
  profit: {
    type: Number,
    default: 0
  },
  totalCustomers: {
    type: Number,
    default: 0,
    min: 0
  },
  dineInOrders: {
    type: Number,
    default: 0,
    min: 0
  },
  takeoutOrders: {
    type: Number,
    default: 0,
    min: 0
  },
  itemsSold: {
    type: Map,
    of: {
      quantity: Number,
      price: Number
    },
    default: {}
  },
  paymentMethods: {
    cash: {
      type: Number,
      default: 0,
      min: 0
    },
    gcash: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  topProducts: [{
    productId: mongoose.Schema.Types.ObjectId,
    name: String,
    quantity: Number,
    revenue: Number
  }],
  inventoryCosts: {
    type: Number,
    default: 0,
    min: 0
  },
  inventoryAdjustments: {
    itemsAdded: {
      type: Number,
      default: 0,
      min: 0
    },
    itemsRestocked: {
      type: Number,
      default: 0,
      min: 0
    },
    totalCost: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { 
  collection: 'dailySales',
  timestamps: true 
});


export const DailySales = mongoose.model("DailySales", dailySalesSchema);
