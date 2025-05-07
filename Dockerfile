FROM node:22-slim
WORKDIR /app
COPY yarn.lock package.json ./

RUN yarn install
COPY . .
RUN yarn build

CMD ["node", "build/index.js"]
