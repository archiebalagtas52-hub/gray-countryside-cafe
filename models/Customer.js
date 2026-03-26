import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
  customerId: {
    type: String,
    required: true,
    unique: true, // Add unique constraint if each customer has a unique ID
    index: true   // Add index for faster queries
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: String,
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  totalOrders: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  lastOrderDate: Date,
  // Add these fields for better customer management
  customerType: {
    type: String,
    enum: ['walk-in', 'regular', 'vip', 'corporate'],
    default: 'walk-in'
  },
  notes: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, { 
  collection: 'customers',
  timestamps: true 
});

// Add a method to update customer stats
customerSchema.methods.updateStats = function(orderTotal) {
  this.totalOrders += 1;
  this.totalSpent += orderTotal;
  this.lastOrderDate = new Date();
  
  // Automatically promote to 'regular' after 5 orders
  if (this.totalOrders >= 5 && this.customerType === 'walk-in') {
    this.customerType = 'regular';
  }
  
  // Promote to 'vip' after spending ₱5000
  if (this.totalSpent >= 5000 && this.customerType === 'regular') {
    this.customerType = 'vip';
  }
  
  return this.save();
};

// Static method to find or create customer
customerSchema.statics.findOrCreate = async function(customerData) {
  let customer;
  
  // Try to find by customerId first
  if (customerData.customerId) {
    customer = await this.findOne({ customerId: customerData.customerId });
  }
  
  // If not found by customerId, try by phone or email
  if (!customer && customerData.phone) {
    customer = await this.findOne({ phone: customerData.phone });
  }
  
  if (!customer && customerData.email) {
    customer = await this.findOne({ email: customerData.email });
  }
  
  // If still not found, create new customer
  if (!customer) {
    // Generate a customerId if not provided
    if (!customerData.customerId) {
      customerData.customerId = 'CUST-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }
    
    customer = await this.create(customerData);
  }
  
  return customer;
};

export default mongoose.models.Customer || mongoose.model('Customer', customerSchema);