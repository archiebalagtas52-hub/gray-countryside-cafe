import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  image: {
    type: String,
    default: 'default_food.jpg'
  },
  status: {
    type: String,
    enum: ['in_stock', 'low_stock', 'out_of_stock'],
    default: 'in_stock'
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  unit: {
    type: String,
    default: 'piece'
  },
  description: String,
  sku: {
    type: String,
    unique: true,
    sparse: true
  },
  minStock: {
    type: Number,
    default: 10
  },
  maxStock: {
    type: Number,
    default: 100
  }
}, { 
  timestamps: true,
  collection: 'products'
});

export default mongoose.models.Product || mongoose.model('Product', productSchema);