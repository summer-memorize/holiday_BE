const mongoose = require("mongoose");

const { Schema } = mongoose;
const saveResultSchema = new Schema({
  year: {
    type: Number,
    required: true,
  },
  month: {
    type: Number,
    required: true,
  },
  isRestDaySaved: {
    type: Boolean,
  },
  isAnniversarySaved: {
    type: Boolean,
  },
});

module.exports = mongoose.model("SaveResult", saveResultSchema);
