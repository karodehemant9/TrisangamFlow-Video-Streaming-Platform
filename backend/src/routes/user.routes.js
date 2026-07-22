const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth.middleware");

const controller = require("../controllers/user.controller");

router.get(
    "/me",
    auth,
    controller.me
);

module.exports = router;