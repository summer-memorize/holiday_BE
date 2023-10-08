const mongoose = require("mongoose");

const { Schema } = mongoose;
const holidaySchema = new Schema({
  dateName: {
    // 공휴일 이름(예: 추석, 개천절)
    type: String,
    required: true,
  },
  isHoliday: {
    // 휴일 여부(단순 기념일의 경우 쉬지 않는 경우도 있음)
    type: Boolean,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
});

module.exports = mongoose.model("Holiday", holidaySchema);
