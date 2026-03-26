import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  description: String,
  image: String,
  displayOrder: {
    type: Number,
    default: 0
  }
}, { 
  timestamps: true,
  collection: 'categories'
});

export default mongoose.models.Category || mongoose.model('Category', categorySchema);