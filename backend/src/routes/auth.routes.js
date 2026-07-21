const express = require("express");

const router = express.Router();

const controller = require("../controllers/auth.controller");
const validate = require("../middleware/validate.middleware");
const {
    registerValidator
} = require("../validators/auth.validator");

router.post(
    "/register",
    registerValidator,
    validate,
    controller.register
);

module.exports = router;