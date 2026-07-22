const bcrypt = require("bcrypt");

const userRepository = require("../repositories/user.repository");
const refreshRepository = require("../repositories/refresh-token.repository");

const jwt = require("../utils/jwt");
const { sha256 } = require("../utils/crypto");

async function register(data) {

    const existing = await userRepository.findByEmail(data.email);

    if (existing)
        throw new Error("Email already exists");

    const passwordHash = await bcrypt.hash(data.password, 12);

    await userRepository.create({
        email: data.email,
        username: data.username,
        passwordHash
    });

}

async function login(data) {

    const user = await userRepository.findByEmail(data.email);

    if (!user)
        throw new Error("Invalid credentials");

    const validPassword = await bcrypt.compare(
        data.password,
        user.password_hash
    );

    if (!validPassword)
        throw new Error("Invalid credentials");

    const accessToken = jwt.generateAccessToken(user);

    const refreshToken = jwt.generateRefreshToken(user);

    await refreshRepository.create({

        userId: user.id,

        tokenHash: sha256(refreshToken),

        expiresAt: new Date(
            Date.now() +
            30 * 24 * 60 * 60 * 1000
        ),

        deviceName: "Unknown",

        ipAddress: data.ipAddress,

        userAgent: data.userAgent

    });

    return {
        accessToken,
        refreshToken
    };

}

async function refresh(data) {

    const { token, ipAddress, userAgent } = data;

    // 1. Verify the JWT signature
    let payload;
    try {
        payload = jwt.verifyRefreshToken(token);
    } catch (err) {
        throw new Error("Invalid or expired refresh token");
    }

    // 2. Look up the token hash in the database
    const tokenHash = sha256(token);
    const storedToken = await refreshRepository.findByHash(tokenHash);

    if (!storedToken) {
        throw new Error("Refresh token not found or already revoked");
    }

    // 3. Check expiry
    if (new Date(storedToken.expires_at) < new Date()) {
        await refreshRepository.revoke(storedToken.id);
        throw new Error("Refresh token expired");
    }

    // 4. Revoke the old refresh token (rotation)
    await refreshRepository.revoke(storedToken.id);

    // 5. Fetch user to generate new tokens
    const user = await userRepository.findById(storedToken.user_id);
    if (!user) {
        throw new Error("User not found");
    }

    // 6. Issue new token pair
    const newAccessToken = jwt.generateAccessToken(user);
    const newRefreshToken = jwt.generateRefreshToken(user);

    await refreshRepository.create({
        userId: user.id,
        tokenHash: sha256(newRefreshToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        deviceName: "Unknown",
        ipAddress,
        userAgent
    });

    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
    };

}

module.exports = {
    register,
    login,
    refresh
};