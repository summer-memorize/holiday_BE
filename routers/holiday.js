const express = require("express");
// const axios = require("axios");
// const fetch = require("node-fetch");
const request = require("request");
const joi = require("joi");
const Holiday = require("../schemas/holiday");
const SaveResult = require("../schemas/saveResult");
const router = express.Router();

const openApiKey = process.env.OPEN_API_KEY;

router.get("/", async (req, res, next) => {
  try {
    const yearValidation = joi
      .string()
      .min(4)
      .max(4)
      .regex(/^(19[0-9]{2}|2[0-2][0-9]{2}|2300)$/)
      .trim()
      .required();
    const monthValidation = joi
      .string()
      .min(2)
      .max(2)
      .regex(/^(0[1-9]|1[0-2])$/)
      .trim()
      .required();
    const holidaySchema = joi.object({
      year: yearValidation,
      month: monthValidation,
    });

    const { year, month } = await holidaySchema.validateAsync(req.query);

    // 2023년 기준 2005년부터 2025년까지 공휴일 정보만 있음
    // TODO: 미래의 연도는 하드코딩으로 넣으면 안 될 듯. 수정 필요
    if (parseInt(year) < 2005 || parseInt(year) > 2025) return res.status(200).json({ data: [] });

    const yyyymmddNumToDate = num => {
      const year = parseInt(num / 10000);
      const month = parseInt((num % 10000) / 100);
      const day = parseInt(num % 100);
      const utcDate = new Date(year, month - 1, day);
      const kstOffset = 9 * 60 * 60 * 1000;
      const kstDate = new Date(utcDate.getTime() + kstOffset);

      return kstDate;
    };

    let restDayUrl = "http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo";
    let anniversaryUrl = "http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getAnniversaryInfo";
    let queryParams = "?" + encodeURIComponent("serviceKey") + "=" + openApiKey;
    queryParams += "&" + encodeURIComponent("numOfRows") + "=" + encodeURIComponent("50"); /* */
    queryParams += "&" + encodeURIComponent("solYear") + "=" + encodeURIComponent(year); /* */
    queryParams += "&" + encodeURIComponent("solMonth") + "=" + encodeURIComponent(month); /* */
    queryParams += "&" + encodeURIComponent("_type") + "=" + encodeURIComponent("json"); /* */

    // 해당 month 저장 됐는지 확인
    const saveResult = await SaveResult.findOne({
      year,
      month,
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
            console.log(123, "공휴일 개수: ", JSON.parse(body).response.body.totalCount);

            // db 저장
            if (JSON.parse(body).response.body.totalCount > 0) {
              let holidayData = JSON.parse(body).response.body.items.item;

              if (!Array.isArray(holidayData)) holidayData = [holidayData];

              holidayData.map(async item => {
                item.date = yyyymmddNumToDate(item.locdate);
                await Holiday.findOneAndUpdate(
                  { dateName: item.dateName, date: item.date, isHoliday: true },
                  {},
                  { new: true, upsert: true, setDefaultsOnInsert: true }
                );
              });
            }

            // saveResult findOneAndUpdate
            await SaveResult.findOneAndUpdate(
              { year, month },
              { isRestDaySaved: true },
              { new: true, upsert: true, setDefaultsOnInsert: true }
            );

            isComplete++;

            console.log(12121212, "isComplete 개수:", isComplete);

            if (isComplete === 2 || (isComplete === 1 && saveResult.isAnniversarySaved)) {
              const holidayInfo = await Holiday.find({
                date: {
                  $gte: new Date(year, month - 2, 15),
                  $lte: new Date(year, month, 15),
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
      //     { year, month },
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
            console.log(123, "기념일 개수: ", JSON.parse(body).response.body.totalCount);

            // db 저장
            if (JSON.parse(body).response.body.totalCount > 0) {
              let anniversaryData = JSON.parse(body).response.body.items.item;

              if (!Array.isArray(anniversaryData)) anniversaryData = [anniversaryData];

              anniversaryData.map(async item => {
                item.date = yyyymmddNumToDate(item.locdate);
                await Holiday.findOneAndUpdate(
                  { dateName: item.dateName, date: item.date, isHoliday: false },
                  {},
                  { new: true, upsert: true, setDefaultsOnInsert: true }
                );
              });
            }

            // saveResult findOneAndUpdate
            await SaveResult.findOneAndUpdate(
              { year, month },
              { isAnniversarySaved: true },
              { new: true, upsert: true, setDefaultsOnInsert: true }
            );

            isComplete++;

            console.log(12121212, "isComplete 개수:", isComplete);

            if (isComplete === 2 || (isComplete === 1 && saveResult.isRestDaySaved)) {
              const holidayInfo = await Holiday.find({
                date: {
                  $gte: new Date(year, month - 2, 15),
                  $lte: new Date(year, month, 15),
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
      //     { year, month },
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
          $gte: new Date(year, month - 2, 15),
          $lte: new Date(year, month, 15),
        },
      }).sort("date");

      res.status(200).json({ data: holidayInfo });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
