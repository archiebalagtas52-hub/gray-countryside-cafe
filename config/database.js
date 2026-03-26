import mongoose from "mongoose";

let isConnected = false;
const MAX_RETRIES = 3;
let retryCount = 0;

export const connectDB = async () => {
  if (isConnected) {
    console.log("✅ Using existing database connection");
    return;
  }
  
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error("❌ MONGODB_URI not defined in environment variables");
    }
    
    console.log("🔄 Connecting to MongoDB Atlas...");
    
    const connection = await mongoose.connect(mongoURI, {
      retryWrites: true,
      w: "majority",
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
    });
    
    isConnected = true;
    retryCount = 0;
    console.log("✅ MongoDB Atlas Connected Successfully");
    console.log(`📊 Database: ${connection.connection.db.databaseName}`);
    console.log(`🏠 Host: ${connection.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on("connected", () => {
      console.log("✅ Mongoose connected to MongoDB");
    });
    
    mongoose.connection.on("error", (err) => {
      console.error("❌ Mongoose connection error:", err);
      isConnected = false;
    });
    
    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ Mongoose disconnected from MongoDB");
      isConnected = false;
    });
    
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    isConnected = false;
    retryCount++;
    
    if (retryCount < MAX_RETRIES) {
      console.log(`🔄 Retrying connection (${retryCount}/${MAX_RETRIES}) in 3 seconds...`);
      setTimeout(() => connectDB(), 3000);
    } else {
      console.error("❌ Failed to connect after maximum retries");
      process.exit(1);
    }
  }
};

// Keep Product schema here temporarily
const productSchema = new mongoose.Schema({
  itemName: String,
  category: String,
  price: Number,
  stock: Number,
  image: String,
  status: String,
  isActive: Boolean
});

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

const customerSchema = new mongoose.Schema({
  customerId: String,
  name: String,
  totalOrders: Number,
  totalSpent: Number,
  lastOrderDate: Date
}, { timestamps: true });

export const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);