// authMiddleware.js
import jwt from 'jsonwebtoken';

// Verify token middleware
export const verifyToken = (req, res, next) => {
    try {
        // Get token from cookies or headers
        const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'Access denied. No token provided.' });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// Verify admin middleware
export const verifyAdmin = (req, res, next) => {
    try {
        // Assuming user role is stored in req.user after verifyToken
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin only.' });
        }
        next();
    } catch (error) {
        console.error('Admin verification error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Export as default object (since you're importing as default in server.js)
export default { verifyToken, verifyAdmin };