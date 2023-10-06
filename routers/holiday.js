const express = require("express");
const axios = require("axios");
const Holiday = require("../schemas/holiday");
const router = express.Router();

const openApiKey = process.env.OPEN_API_KEY;

router.get("/", async (req, res, next) => {
  try {
    const holiday = await Holiday.find({
      year: req.query.year,
      month: req.query.month,
    });

    res.status(201).json(holiday);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
