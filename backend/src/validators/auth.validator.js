const { body } = require("express-validator");

const registerValidator = [

    body("email")
        .isEmail(),

    body("username")
        .isLength({
            min: 3,
            max: 30
        }),

    body("password")
        .isLength({
            min: 8
        })

];

module.exports = {
    registerValidator
};