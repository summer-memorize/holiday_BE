const express = require("express");
const router = express.Router();

const Holiday = require("./holiday");

router.use("/holiday", Holiday);
router.get("/ping", async (req, res) => {
  res.status(200).send("pong");
});

module.exports = router;
