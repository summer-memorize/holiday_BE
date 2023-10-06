const express = require("express");
const morgan = require("morgan");
const connect = require("./schemas");
require("dotenv").config();

const app = express();

const port = process.env.PORT || 8888;
app.set("port", port);
connect();

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.listen(app.get("port"), () => {
  console.log(app.get("port"), "번 포트에서 대기중", `\r\n http://localhost:${port}/ping`);
});
