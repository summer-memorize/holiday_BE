const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const connect = require("./schemas");
const errorHandler = require("./utils/errorHandler");
const setSchedule = require("./utils/setSchedule");
const router = require("./routers");
require("dotenv").config();

const app = express();

const port = process.env.PORT || 3001;
app.set("port", port);
app.set("trust proxy", true);
connect();

app.use(
  morgan(
    ":remote-addr :remote-user :method :url HTTP/:http-version :status :res[content-length] :response-time :referrer :user-agent"
  )
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    credentials: true,
  })
);

setSchedule.updateHolidayInfoJob();
setSchedule.saveHolidayInfoJob();

app.use("/", router);
app.use(errorHandler);

app.listen(app.get("port"), () => {
  console.log(app.get("port"), "번 포트에서 대기중", `\r\n http://localhost:${port}/ping`);
});
