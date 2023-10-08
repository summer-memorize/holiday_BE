const mongoose = require("mongoose");
require("dotenv").config();

const dbUrl = `mongodb+srv://${process.env.DB_USER_NAME}:${process.env.DB_PASSWORD}@holiday.21ppix4.mongodb.net/?retryWrites=true&w=majority`;

const connect = () => {
  if (process.env.NODE_ENV !== "production") {
    mongoose.set("debug", false);
  }
  mongoose
    .connect(dbUrl, {
      dbName: "holiday",
      useNewUrlParser: true,
      // useCreateIndex: true,
    })
    .then(() => {
      console.log("몽고디비 연결 성공");
    })
    .catch(err => {
      console.error("몽고디비 연결 에러", err);
    });
};

mongoose.connection.on("error", error => {
  console.error("몽고디비 연결 에러", error);
});
mongoose.connection.on("disconnected", () => {
  console.error("몽고디비 연결이 끊겼습니다. 연결을 재시도합니다.");
  connect();
});

module.exports = connect;
