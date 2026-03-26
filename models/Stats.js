import mongoose from "mongoose";

const statsSchema = new mongoose.Schema({
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'daily',
    required: true,
    index: true
  },
  date: {
    type: String,
    required: true
  },
  fullDate: {
    type: Date,
    required: true,
    unique: true,
    index: true,
    default: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today;
    }
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
  averageOrderValue: {
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
  topProducts: [{
    name: String,
    quantity: Number,
    revenue: Number
  }],
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
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active',
    index: true
  }
}, { 
  collection: 'stats',
  timestamps: true 
});

// Index for efficient queries
statsSchema.index({ period: 1, fullDate: 1 });
statsSchema.index({ status: 1, fullDate: -1 });

export default mongoose.models.Stats || mongoose.model('Stats', statsSchema);