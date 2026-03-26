import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  name: String,
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
  image: {
    type: String,
    default: 'default_food.jpg'
  },
  unit: {
    type: String,
    default: 'piece'
  },
  currentStock: {
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
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  itemType: {
    type: String,
    enum: ['finished', 'combo'],
    default: 'finished'
  },
  status: {
    type: String,
    enum: ['in_stock', 'low_stock', 'out_of_stock'],
    default: 'in_stock'
  },
  description: String,
  requiredIngredients: {
    type: [
      {
        ingredientName: String,
        quantity: {
          type: Number,
          default: 1
        },
        unit: {
          type: String,
          default: 'piece'
        }
      }
    ],
    default: []
  },
  availableIngredients: [String],
  missingIngredients: [String],
  inventoryItemId: mongoose.Schema.Types.ObjectId,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { 
  strict: false,
  timestamps: true,
  collection: 'menuItems'
});

export default mongoose.models.MenuItem || mongoose.model('MenuItem', menuItemSchema);