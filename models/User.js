import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
    minlength: 3
  },
  fullName: {
    type: String,
    trim: true,
    default: ''
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['admin', 'staff', 'manager'],
    default: 'staff',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  createdBy: String,
  notes: String
}, { 
  timestamps: true,
  collection: 'users'
});

export default mongoose.models.User || mongoose.model('User', userSchema);