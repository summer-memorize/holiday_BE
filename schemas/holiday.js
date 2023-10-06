const mongoose = require("mongoose");

const { Schema } = mongoose;
const holidaySchema = new Schema({
  name: {
    // 공휴일 이름(예: 추석, 개천절)
    type: String,
    required: true,
  },
  year: {
    // 공휴일이 속한 연도(예: 2019)
    type: Number,
    required: true,
  },
  month: {
    // 공휴일이 속한 월(예: 9)
    type: Number,
    required: true,
  },
  date: {
    // 전체 날짜(yyyymmdd)
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("Holiday", holidaySchema);
