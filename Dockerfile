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
COPY . .

# 앱 실행
CMD [ "node", "app.js" ]