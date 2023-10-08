# holiday_BE

# API Documentation

## Introduction

공휴일 정보를 얻기 위한 API입니다.

## Base URL

`도메인 연결 전입니다. 잠시만 기다려 주세요.`

## Endpoints

### GET /holiday

`월별 공휴일 및 기념일 정보를 가져옵니다.
 이전달 중순부터 다음달 중순까지의 정보를 반환합니다.`

##### Query

- year : 공휴일 정보를 가져오려는 연도를 입력합니다. 2004년부터 2025년까지의 정보만 존재합니다. (예: 2023)
- month : 공휴일 정보를 가져오려는 월(月)을 두 자리 수로 입력합니다. (예: 09)

##### Response

status: 200 OK
`{ data: [
  {
    dateName: "추석",
    isHoliday: true,
    date: "2023-09-15T15:00:00.000Z"
  }
] }`
