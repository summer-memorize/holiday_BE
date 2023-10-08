const express = require("express");
// const axios = require("axios");
// const fetch = require("node-fetch");
const request = require("request");
const Holiday = require("../schemas/holiday");
const SaveResult = require("../schemas/saveResult");
const router = express.Router();

const openApiKey = process.env.OPEN_API_KEY;

router.get("/", async (req, res, next) => {
  try {
    const yyyymmddNumToDate = num => {
      const year = parseInt(num / 10000);
      const month = parseInt((num % 10000) / 100);
      const day = parseInt(num % 100);
      return new Date(year, month - 1, day);
    };

    let restDayUrl = "http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo";
    let anniversaryUrl = "http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getAnniversaryInfo";
    let queryParams = "?" + encodeURIComponent("serviceKey") + "=" + openApiKey;
    queryParams += "&" + encodeURIComponent("numOfRows") + "=" + encodeURIComponent("50"); /* */
    queryParams += "&" + encodeURIComponent("solYear") + "=" + encodeURIComponent(req.query.year); /* */
    queryParams += "&" + encodeURIComponent("solMonth") + "=" + encodeURIComponent(req.query.month); /* */
    queryParams += "&" + encodeURIComponent("_type") + "=" + encodeURIComponent("json"); /* */

    // 해당 month 저장 됐는지 확인
    const saveResult = await SaveResult.findOne({
      year: req.query.year,
      month: req.query.month,
    });

    // request 2개 완료 여부 체크
    let isComplete = 0;

    // 공휴일 정보
    const getRestDayInfo = async () => {
      request(
        {
          url: restDayUrl + queryParams,
          method: "GET",
        },
        async function (error, response, body) {
          if (error) {
            console.error(222, "공휴일 정보 에러", error?.code, "\r\n");
            await getRestDayInfo();
          } else {
            console.log(123, "개수: ", JSON.parse(body).response.body.totalCount);

            // db 저장
            if (JSON.parse(body).response.body.totalCount > 0) {
              let holidayData = JSON.parse(body).response.body.items.item;

              if (!Array.isArray(holidayData)) holidayData = [holidayData];

              holidayData.map(item => {
                item.date = yyyymmddNumToDate(item.locdate);
                item.isHoliday = true;
              });

              await Holiday.insertMany(holidayData);
            }

            // saveResult findOneAndUpdate
            await SaveResult.findOneAndUpdate(
              { year: req.query.year, month: req.query.month },
              { isRestDaySaved: true },
              { new: true, upsert: true, setDefaultsOnInsert: true }
            );

            isComplete++;

            console.log(12121212, "isComplete 개수:", isComplete);

            if (isComplete === 2) {
              const holidayInfo = await Holiday.find({
                date: {
                  $gte: new Date(req.query.year, req.query.month - 2, 15),
                  $lte: new Date(req.query.year, req.query.month, 15),
                },
              }).sort("date");

              res.status(200).json({ data: holidayInfo });
            }
          }
        }
      );

      // try {
      //   const response = await fetch(restDayUrl + queryParams);

      //   // db 저장
      //   const holidayData = (await response.json()).response.body.items.item;

      //   if (!Array.isArray(holidayData)) holidayData = [holidayData];

      //   holidayData.map(item => {
      //     item.date = yyyymmddNumToDate(item.locdate);
      //     item.isHoliday = item.isHoliday === "Y" ? true : false;
      //   });

      //   await Holiday.insertMany(holidayData);

      //   // saveResult findOneAndUpdate
      //   await SaveResult.findOneAndUpdate(
      //     { year: req.query.year, month: req.query.month },
      //     { isRestDaySaved: true },
      //     { new: true, upsert: true, setDefaultsOnInsert: true }
      //   );
      // } catch (error) {
      //   console.error(222, "공휴일 정보 에러", error, "\r\n");
      //   await getRestDayInfo();
      // }
    };

    // 기념일 정보
    const getAnniversaryInfo = async () => {
      request(
        {
          url: anniversaryUrl + queryParams,
          method: "GET",
        },
        async function (error, response, body) {
          if (error) {
            console.error(444, "기념일 정보 에러", error?.code, "\r\n");
            await getAnniversaryInfo();
          } else {
            console.log(123, "개수: ", JSON.parse(body).response.body.totalCount);

            // db 저장
            if (JSON.parse(body).response.body.totalCount > 0) {
              let anniversaryData = JSON.parse(body).response.body.items.item;

              if (!Array.isArray(anniversaryData)) anniversaryData = [anniversaryData];

              anniversaryData.map(item => {
                item.date = yyyymmddNumToDate(item.locdate);
                item.isHoliday = false;
              });

              await Holiday.insertMany(anniversaryData);
            }

            // saveResult findOneAndUpdate
            await SaveResult.findOneAndUpdate(
              { year: req.query.year, month: req.query.month },
              { isAnniversarySaved: true },
              { new: true, upsert: true, setDefaultsOnInsert: true }
            );

            isComplete++;

            console.log(12121212, "isComplete 개수:", isComplete);

            if (isComplete === 2) {
              const holidayInfo = await Holiday.find({
                date: {
                  $gte: new Date(req.query.year, req.query.month - 2, 15),
                  $lte: new Date(req.query.year, req.query.month, 15),
                },
              }).sort("date");

              res.status(200).json({ data: holidayInfo });
            }
          }
        }
      );

      // try {
      //   const response = await fetch(anniversaryUrl + queryParams);

      //   // db 저장
      //   const anniversaryData = (await response.json()).response.body.items.item;

      //   if (!Array.isArray(anniversaryData)) anniversaryData = [anniversaryData];

      //   anniversaryData.map(item => {
      //     item.date = yyyymmddNumToDate(item.locdate);
      //     item.isHoliday = item.isHoliday === "Y" ? true : false;
      //   });

      //   await Holiday.insertMany(anniversaryData);

      //   // saveResult findOneAndUpdate;
      //   await SaveResult.findOneAndUpdate(
      //     { year: req.query.year, month: req.query.month },
      //     { isAnniversarySaved: true },
      //     { new: true, upsert: true, setDefaultsOnInsert: true }
      //   );
      // } catch (error) {
      //   console.error(444, "기념일 정보 에러", error, "\r\n");
      //   await getAnniversaryInfo();
      // }
    };

    // saveResult 없으면
    if (!saveResult || !saveResult.isRestDaySaved) {
      await getRestDayInfo();
    }

    if (!saveResult || !saveResult.isAnniversarySaved) {
      await getAnniversaryInfo();
    }

    if (saveResult && saveResult.isRestDaySaved && saveResult.isAnniversarySaved) {
      const holidayInfo = await Holiday.find({
        date: {
          $gte: new Date(req.query.year, req.query.month - 2, 15),
          $lte: new Date(req.query.year, req.query.month, 15),
        },
      }).sort("date");

      res.status(200).json({ data: holidayInfo });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
