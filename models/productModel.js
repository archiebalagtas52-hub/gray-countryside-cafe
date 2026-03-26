import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  productName: { 
    type: String, 
    required: true,
    unique: true,
    trim: true,
    index: true,
    minlength: 3
  },
  price: { 
    type: Number, 
    required: true,
    min: 0
  },
  cost: {
    type: Number,
    default: 0,
    min: 0
  },
  status: { 
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active',
    index: true
  },
  category: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category',
    required: true,
    index: true
  },
  brand: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Brand'
  },
  sku: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  description: String,
  image: String,
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  minStock: {
    type: Number,
    default: 10,
    min: 0
  },
  maxStock: {
    type: Number,
    default: 100,
    min: 0
  },
  unit: {
    type: String,
    default: 'pcs'
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  tags: [String],
  supplier: {
    type: String,
    sparse: true
  }
}, { 
  collection: 'products',
  timestamps: true 
});

// Index for frequently queried fields
productSchema.index({ productName: 1, category: 1 });
productSchema.index({ status: 1, stock: 1 });
productSchema.index({ createdAt: -1 });

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export default Product;