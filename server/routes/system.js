const express = require("express");
const asyncHandler = require("../middleware/asyncHandler");
const { getApiRoot, getHealth } = require("../controllers/systemController");

const router = express.Router();

router.get("/", asyncHandler(getApiRoot));
router.get("/health", asyncHandler(getHealth));

module.exports = router;
