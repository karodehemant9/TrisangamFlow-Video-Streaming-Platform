const jwt = require("jsonwebtoken");

function generateAccessToken(user) {

    return jwt.sign(
        {
            userId: user.id
        },
        process.env.JWT_ACCESS_SECRET,
        {
            expiresIn: process.env.JWT_ACCESS_EXPIRES_IN
        }
    );

}

function generateRefreshToken(user) {

    return jwt.sign(
        {
            userId: user.id
        },
        process.env.JWT_REFRESH_SECRET,
        {
            expiresIn: process.env.JWT_REFRESH_EXPIRES_IN
        }
    );

}

function verifyRefreshToken(token) {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken
};