const express = require("express");
const axios = require("axios");
const joi = require("joi");
const Holiday = require("../schemas/holiday");
const SaveResult = require("../schemas/saveResult");
const { yyyymmddNumToDate } = require("../utils/date");
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

    // 2023년 기준 공공데이터포털에서 2005년부터 2025년까지 공휴일 정보만 제공
    const diffYear = () => new Date().getFullYear() - 2023;
    if (parseInt(year) < 2005 || parseInt(year) > 2025 + diffYear()) return res.status(200).json({ data: [] });

    const restDayUrl = `http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?numOfRows=50&_type=json&solYear=${year}&solMonth=${month}&ServiceKey=${openApiKey}`;
    const anniversaryUrl = `http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getAnniversaryInfo?numOfRows=50&_type=json&solYear=${year}&solMonth=${month}&ServiceKey=${openApiKey}`;

    // 해당 month 저장 됐는지 확인
    const saveResult = await SaveResult.findOne({
      year,
      month,
    });

    // request 2개 완료 여부 체크
    let isComplete = 0;

    // 공휴일 정보
    const getRestDayInfo = async () => {
      try {
        const { data } = await axios.get(restDayUrl);
        console.log(123, year, month, "공휴일 개수: ", data.response.body.totalCount);

        // db 저장
        if (data.response.body.totalCount > 0) {
          let holidayData = data.response.body.items.item;

          if (!Array.isArray(holidayData)) holidayData = [holidayData];

          holidayData.map(async (item) => {
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

        return { result: "complete" };
      } catch (err) {
        console.error(222, year, month, "공휴일 정보 에러", err?.code, "\r\n");
        err?.name === "AxiosError" ? await getRestDayInfo() : next(err);
      }
    };

    // 기념일 정보
    const getAnniversaryInfo = async () => {
      try {
        const { data } = await axios.get(anniversaryUrl);
        console.log(123, year, month, "기념일 개수: ", data.response.body.totalCount);

        // db 저장
        if (data.response.body.totalCount > 0) {
          let anniversaryData = data.response.body.items.item;

          if (!Array.isArray(anniversaryData)) anniversaryData = [anniversaryData];

          anniversaryData.map(async (item) => {
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

        return { result: "complete" };
      } catch (err) {
        // axios 에러 시 재요청
        console.error(444, year, month, "기념일 정보 에러", err?.code, "\r\n");
        err?.name === "AxiosError" ? await getAnniversaryInfo() : next(err);
      }
    };

    if (!saveResult?.isRestDaySaved) {
      const getRestDay = await getRestDayInfo();
      if (getRestDay?.result === "complete") isComplete++;
    } else isComplete++;

    if (!saveResult?.isAnniversarySaved) {
      const getAnniversary = await getAnniversaryInfo();
      if (getAnniversary?.result === "complete") isComplete++;
    } else isComplete++;

    if (isComplete === 2) {
      const holidayInfo = await Holiday.find({
        date: {
          $gte: new Date(year, month - 2, 15),
          $lte: new Date(year, month, 15),
        },
      }).sort("date");

      const data = holidayInfo.map((item) => {
        const { dateName, date, isHoliday } = item;
        return { dateName, date, isHoliday };
      });

      res.status(200).json({ data });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
