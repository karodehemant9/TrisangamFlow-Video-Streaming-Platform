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

module.exports = {
    register
};