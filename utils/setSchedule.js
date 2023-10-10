const schedule = require("node-schedule");
const request = require("request");
const Holiday = require("../schemas/holiday");
const SaveResult = require("../schemas/saveResult");
require("dotenv").config();

const openApiKey = process.env.OPEN_API_KEY;

const updateHolidayInfoJob = () => {
  try {
    schedule.scheduleJob("10 1 * * *", async () => {
      console.log("updateHolidayInfoJob", new Date());

      const yyyymmddNumToDate = num => {
        const year = parseInt(num / 10000);
        const month = parseInt((num % 10000) / 100);
        const day = parseInt(num % 100);
        return new Date(year, month - 1, day);
      };

      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;
      // TODO: 현재 달부터 미래 n개의 달까지 공휴일 정보 변경 된 거 있는지 확인해서 update

      let url = "http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo";
      let queryParams = "?" + encodeURIComponent("serviceKey") + "=" + openApiKey;
      queryParams += "&" + encodeURIComponent("numOfRows") + "=" + encodeURIComponent("10"); /* */
      queryParams += "&" + encodeURIComponent("solYear") + "=" + encodeURIComponent(year); /* */
      queryParams += "&" + encodeURIComponent("solMonth") + "=" + encodeURIComponent(month); /* */
      queryParams += "&" + encodeURIComponent("_type") + "=" + encodeURIComponent("json"); /* */
      console.log(123123, url + queryParams);

      // 해당 month에 저장된 공휴일 개수
      const holidayCount = await Holiday.countDocuments({
        isHoliday: true,
        date: {
          $gte: new Date(year, month - 1, 1),
          $lte: new Date(year, month, 0),
        },
      });

      const updateRestDayInfo = async () => {
        request(
          {
            url: url + queryParams,
            method: "GET",
          },
          async function (error, response, body) {
            if (error) {
              console.error(222, "공휴일 정보 요청 에러", error?.code, "\r\n");
              await updateRestDayInfo();
            } else {
              console.log(
                111,
                "찾아온 개수: ",
                JSON.parse(body).response.body.totalCount,
                "\r\n DB 개수:",
                holidayCount,
                "\r\n"
              );

              // db 저장
              if (JSON.parse(body).response.body.totalCount !== holidayCount) {
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

                console.log(333, "updateRestDayInfo 갱신 완료\r\n");
              }
            }
          }
        );
      };

      updateRestDayInfo();
    });
  } catch (err) {
    console.error(444, "updateHolidayInfoJob 에러\r\n", err);
  }
};

const saveHolidayInfoJob = () => {
  try {
    schedule.scheduleJob("30 2 * * *", async () => {
      console.log("saveHolidayInfoJob", new Date());

      const yyyymmddNumToDate = num => {
        const year = parseInt(num / 10000);
        const month = parseInt((num % 10000) / 100);
        const day = parseInt(num % 100);
        return new Date(year, month - 1, day);
      };

      const diffInDays = (today, pastDate) => Math.round(Math.abs((today - pastDate) / (1000 * 60 * 60 * 24)));

      // 저장 안 된 달 찾아서 저장
      const monthArr = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
      const startDay = new Date("2023-10-10"); // 2023년 10월 10일에 저장 시작
      let year, month;

      for (let j = 0, jl = monthArr.length; j < jl; j++) {
        year = 2006 + diffInDays(new Date(), startDay);
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

        let restDayUrl = "http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo";
        let anniversaryUrl = "http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getAnniversaryInfo";
        let queryParams = "?" + encodeURIComponent("serviceKey") + "=" + openApiKey;
        queryParams += "&" + encodeURIComponent("numOfRows") + "=" + encodeURIComponent("10"); /* */
        queryParams += "&" + encodeURIComponent("solYear") + "=" + encodeURIComponent(year); /* */
        queryParams += "&" + encodeURIComponent("solMonth") + "=" + encodeURIComponent(month); /* */
        queryParams += "&" + encodeURIComponent("_type") + "=" + encodeURIComponent("json"); /* */

        const saveRestDayInfo = async () => {
          request(
            {
              url: restDayUrl + queryParams,
              method: "GET",
            },
            async function (error, response, body) {
              if (error) {
                console.error(222, "scheduler 공휴일 정보 요청 에러", error?.code, "\r\n");
                await saveRestDayInfo();
              } else {
                console.log(123, year, month, "공휴일 개수: ", JSON.parse(body).response.body.totalCount);
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

                console.log(111, "scheduler saveRestDayInfo 갱신 완료\r\n");
              }
            }
          );
        };

        const saveAnniversaryInfo = async () => {
          request(
            {
              url: anniversaryUrl + queryParams,
              method: "GET",
            },
            async function (error, response, body) {
              if (error) {
                console.error(444, "scheduler 기념일 정보 요청 에러", error?.code, "\r\n");
                await saveAnniversaryInfo();
              } else {
                console.log(123, year, month, "기념일 개수: ", JSON.parse(body).response.body.totalCount);

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

                console.log(333, "scheduler saveAnniversaryInfo 갱신 완료\r\n");
              }
            }
          );
        };

        if (!saveResult?.isRestDaySaved) {
          saveRestDayInfo();
        }

        if (!saveResult?.isAnniversarySaved) {
          saveAnniversaryInfo();
        }

        console.log(555, year, month, "saveHolidayInfoJob 완료\r\n");
      }
    });
  } catch (err) {
    console.error(666, "saveHolidayInfoJob 에러\r\n", err);
  }
};

module.exports = { updateHolidayInfoJob, saveHolidayInfoJob };
