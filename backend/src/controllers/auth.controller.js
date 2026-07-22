const authService = require("../services/auth.service");

async function register(req, res, next) {

    try {

        await authService.register(req.body);

        return res.status(201).json({
            success: true,
            message: "User registered"
        });

    } catch (err) {
        next(err);
    }

}

async function login(req, res, next) {

    try {

        const tokens = await authService.login({

            ...req.body,

            ipAddress: req.ip,

            userAgent: req.get("user-agent")

        });

        res.cookie(
            "refreshToken",
            tokens.refreshToken,
            {
                httpOnly: true,
                sameSite: "strict",
                secure: false,
                maxAge: 30 * 24 * 60 * 60 * 1000
            }
        );

        return res.json({

            success: true,

            accessToken: tokens.accessToken

        });

    } catch (err) {

        next(err);

    }

}

async function refresh(req, res, next) {

    try {

        const token = req.cookies.refreshToken;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No refresh token provided"
            });
        }

        const tokens = await authService.refresh({
            token,
            ipAddress: req.ip,
            userAgent: req.get("user-agent")
        });

        res.cookie(
            "refreshToken",
            tokens.refreshToken,
            {
                httpOnly: true,
                sameSite: "strict",
                secure: false,
                maxAge: 30 * 24 * 60 * 60 * 1000
            }
        );

        return res.json({
            success: true,
            accessToken: tokens.accessToken
        });

    } catch (err) {
        // For refresh failures, always return 401
        return res.status(401).json({
            success: false,
            message: err.message || "Failed to refresh token"
        });
    }

}

module.exports = {
    register,
    login,
    refresh
};