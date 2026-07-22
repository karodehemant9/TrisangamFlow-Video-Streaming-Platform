const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {

    const authHeader = req.headers.authorization;

    if (!authHeader) {

        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });

    }

    const token = authHeader.split(" ")[1];

    if (!token) {

        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });

    }

    try {

        const payload = jwt.verify(
            token,
            process.env.JWT_ACCESS_SECRET
        );

        req.user = payload;

        next();

    } catch {

        return res.status(401).json({
            success: false,
            message: "Invalid token"
        });

    }

};