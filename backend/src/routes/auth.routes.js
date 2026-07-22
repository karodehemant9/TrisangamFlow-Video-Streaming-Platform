const express = require("express");

const router = express.Router();

const controller = require("../controllers/auth.controller");
const validate = require("../middleware/validate.middleware");
const {
    registerValidator, loginValidator
} = require("../validators/auth.validator");

router.post(
    "/register",
    registerValidator,
    validate,
    controller.register
);

router.post(
    "/login",
    loginValidator,
    validate,
    controller.login
);

router.post(
    "/refresh",
    controller.refresh
);

module.exports = router;