const bcrypt = require("bcrypt");

const repository = require("../repositories/user.repository");

async function register(data) {

    const existing = await repository.findByEmail(data.email);

    if (existing) {
        throw new Error("Email already exists");
    }

    const passwordHash = await bcrypt.hash(
        data.password,
        12
    );

    await repository.create({
        email: data.email,
        username: data.username,
        passwordHash
    });

    return;
}

module.exports = {
    register
};