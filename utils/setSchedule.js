const schedule = require("node-schedule");
const request = require("request");
const Holiday = require("../schemas/holiday");
require("dotenv").config();

const openApiKey = process.env.OPEN_API_KEY;

//* 0시 10분 1초마다 이뤄지는 일
const rule = new schedule.RecurrenceRule();
const ss = 1;
const mm = 10;
const hh = 0;
rule.second = ss;
rule.minute = mm;
rule.hour = hh;

const updateHolidayInfoJob = () => {
  try {
    schedule.scheduleJob(rule, async () => {
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
                  item.isHoliday = true;
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

module.exports = { updateHolidayInfoJob };
