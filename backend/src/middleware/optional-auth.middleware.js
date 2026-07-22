const jwt = require("jsonwebtoken");

function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next();
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        req.user = decoded;
    } catch (err) {
        // If token is invalid, we just proceed as unauthenticated
        req.user = null;
    }
    
    next();
}

module.exports = optionalAuth;
