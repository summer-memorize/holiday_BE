# Node.js LTS 버전
FROM node:lts

# 앱 디렉터리 생성
WORKDIR /app

# 앱 의존성을 설치 
# package.json과 package-lock.json 파일을 복사
COPY package*.json ./

# package.json에 있는 프로젝트 의존성 설치
RUN npm install

# 앱 소스 추가
COPY app.js ./

# 디폴트 값 설정
ENV PORT 8080

# 앱이 해당 포트에서 실행될 것임을 명시하기
EXPOSE $PORT

# 앱 실행
CMD [ "node", "app.js" ]