FROM node:8.7

RUN mkdir -p /src/
COPY package.json /src/
WORKDIR /src/
RUN npm install --only=prod

COPY ./ /src/
WORKDIR /src/

ENTRYPOINT ["node", "app.js"]