module.exports = {
  BAD_REQUEST: {
    statusCode: 400,
    message: "잘못된 요청입니다.",
  },
  // 401
  UNAUTHORIZED: {
    statusCode: 401,
    message: "로그인이 필요합니다.",
  },
  // 403
  FORBIDDEN: {
    statusCode: 403,
    message: "권한이 없습니다.",
  },
  // 404
  NOT_FOUND: {
    statusCode: 404,
    message: "찾을 수 없습니다.",
  },
  // 409
  CONFLICT: {
    statusCode: 409,
    message: "이미 존재하는 데이터입니다.",
  },
  // 500
  INTERNAL_SERVER_ERROR: {
    statusCode: 500,
    message: "서버 에러. 관리자에게 문의 바랍니다.",
  },
  // 503
  SERVICE_UNAVAILABLE: {
    statusCode: 503,
    message: "서비스를 사용할 수 없습니다.",
  },
};
