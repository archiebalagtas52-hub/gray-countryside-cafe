import mongoose from "mongoose";

// Sales Data Schema (for dashboard and analytics)
const salesDataSchema = new mongoose.Schema({
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'daily',
    required: true
  },
  date: {
    type: String,
    required: true
  },
  fullDate: {
    type: Date,
    required: true,
    index: true
  },
  dayOfWeek: {
    type: String,
    required: true
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
  items: {
    type: Map,
    of: {
      quantity: Number,
      price: Number,
      revenue: Number
    },
    default: {}
  },
  paymentBreakdown: {
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
  orderTypes: {
    dineIn: {
      type: Number,
      default: 0,
      min: 0
    },
    takeOut: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  topProducts: [{
    name: String,
    quantity: Number,
    revenue: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'salesData',
  timestamps: true
});

// Index for efficient queries
salesDataSchema.index({ fullDate: -1 });
salesDataSchema.index({ fullDate: 1, dayOfWeek: 1 });
salesDataSchema.index({ period: 1, fullDate: 1 });
salesDataSchema.index({ period: 1 });

export const SalesData = mongoose.model("SalesData", salesDataSchema);
export default SalesData;