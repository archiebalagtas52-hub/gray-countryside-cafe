import express from "express";
import { Product } from "../config/database.js";

const router = express.Router();

router.post("/Create", (req, res) => {
    const { productname, price, category } = req.body;

    if (!productname || !price) {
        return res.status(400).json({ message: "Name and price are required" });
    }

    res.status(201).json({
        id: Date.now(),
        productname,
        price,
        category
    });
});

router.get("/getAll", (req, res) => {
    res.json({ message: "Product route working" });
});

// Return structured actual menu used by the POS frontend
router.get('/actual-menu', async (req, res) => {
    try {
        const products = await Product.find({}).lean();

        const categories = {};

        for (const p of products) {
            const cat = p.category || 'Uncategorized';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push({
                name: p.name,
                productId: p._id,
                productStock: p.stock || 0,
                productStatus: p.status || (p.stock > 0 ? 'available' : 'out_of_stock'),
                defaultPrice: p.price || 0,
                image: p.image || 'default_food.jpg',
                unit: p.unit || 'piece',
                _id: p._id,
                vatable: p.vatable !== false
            });
        }

        const result = Object.entries(categories).map(([category, items]) => ({ category, items }));

        res.json({ success: true, data: { categories: result } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
