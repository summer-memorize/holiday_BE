const schedule = require("node-schedule");
const axios = require("axios");
const Holiday = require("../schemas/holiday");
const SaveResult = require("../schemas/saveResult");
require("dotenv").config();

const openApiKey = process.env.OPEN_API_KEY;

const updateHolidayInfoJob = () => {
  try {
    schedule.scheduleJob("10 1 * * *", async () => {
      console.log("updateHolidayInfoJob", new Date());

      const yyyymmddNumToDate = (num) => {
        const year = parseInt(num / 10000);
        const month = parseInt((num % 10000) / 100);
        const day = parseInt(num % 100);
        const utcDate = new Date(year, month - 1, day);
        const kstOffset = 9 * 60 * 60 * 1000;
        const kstDate = new Date(utcDate.getTime() + kstOffset);

        return kstDate;
      };

      const year = new Date().getFullYear();
      let month = new Date().getMonth() + 1;

      // 1월부터 9월까지는 01, 02, 03, ... 09로 표기 해서 api 요청해야 함
      if (month < 10) month = "0" + month;

      const restDayUrl = `http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?numOfRows=50&_type=json&solYear=${year}&solMonth=${month}&ServiceKey=${openApiKey}`;

      // 해당 month에 저장된 공휴일 개수
      const holidayCount = await Holiday.countDocuments({
        isHoliday: true,
        date: {
          $gte: new Date(year, month - 1, 1),
          $lte: new Date(year, month, 0),
        },
      });

      const updateRestDayInfo = async () => {
        try {
          const { data } = await axios.get(restDayUrl);
          console.log(
            111,
            year,
            month,
            "찾아온 개수: ",
            data.response.body.totalCount,
            "\r\n DB 개수:",
            holidayCount,
            "\r\n"
          );

          // db 저장
          if (data.response.body.totalCount !== holidayCount) {
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

            console.log(333, year, month, "updateRestDayInfo 갱신 완료\r\n");
          }
        } catch (err) {
          console.error(222, year, month, "공휴일 정보 요청 에러", err?.code, "\r\n");
          if (err?.name === "AxiosError") await updateRestDayInfo();
        }
      };

      await updateRestDayInfo();
    });
  } catch (err) {
    console.error(444, "updateHolidayInfoJob 에러\r\n", err);
  }
};

const saveHolidayInfoJob = () => {
  try {
    schedule.scheduleJob("30 2 * * *", async () => {
      console.log("saveHolidayInfoJob", new Date());

      const yyyymmddNumToDate = (num) => {
        const year = parseInt(num / 10000);
        const month = parseInt((num % 10000) / 100);
        const day = parseInt(num % 100);
        const utcDate = new Date(year, month - 1, day);
        const kstOffset = 9 * 60 * 60 * 1000;
        const kstDate = new Date(utcDate.getTime() + kstOffset);

        return kstDate;
      };

      const diffInDays = (today, pastDate) => Math.round(Math.abs((today - pastDate) / (1000 * 60 * 60 * 24)));

      // 저장 안 된 달 찾아서 저장
      const monthArr = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
      const startDay = new Date("2023-10-10"); // 2023년 10월 10일에 저장 시작
      let year, month;

      for (let j = 0, jl = monthArr.length; j < jl; j++) {
        // year = 2006 + diffInDays(new Date(), startDay);
        year = 2018;
        month = monthArr[j];

        // 현재 공공데이터포털 api에서 2025년까지만 공휴일 정보 제공
        if (year === 2026) {
          console.log(777, "2025년 초과하여 saveHolidayInfoJob 종료\r\n");
          break;
        }

        const saveResult = await SaveResult.findOne({
          year,
          month,
        });

        const restDayUrl = `http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?numOfRows=50&_type=json&solYear=${year}&solMonth=${month}&ServiceKey=${openApiKey}`;
        const anniversaryUrl = `http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getAnniversaryInfo?numOfRows=50&_type=json&solYear=${year}&solMonth=${month}&ServiceKey=${openApiKey}`;

        const saveRestDayInfo = async () => {
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

            console.log(111, "scheduler saveRestDayInfo 갱신 완료\r\n");
          } catch (err) {
            console.error(222, year, month, "scheduler 공휴일 정보 요청 에러", err?.code, "\r\n");
            if (err?.name === "AxiosError") await saveRestDayInfo();
          }
        };

        const saveAnniversaryInfo = async () => {
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

            console.log(333, "scheduler saveAnniversaryInfo 갱신 완료\r\n");
          } catch (err) {
            // axios 에러 시 재요청
            console.error(444, year, month, "scheduler 기념일 정보 요청 에러", err?.code, "\r\n");
            if (err?.name === "AxiosError") await saveAnniversaryInfo();
          }
        };

        if (!saveResult?.isRestDaySaved) await saveRestDayInfo();

        if (!saveResult?.isAnniversarySaved) await saveAnniversaryInfo();

        console.log(555, year, month, "saveHolidayInfoJob 완료\r\n");
      }
    });
  } catch (err) {
    console.error(666, "saveHolidayInfoJob 에러\r\n", err);
  }
};

module.exports = { updateHolidayInfoJob, saveHolidayInfoJob };
