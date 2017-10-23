FROM node:8.1.3

RUN mkdir -p /src/
COPY package.json /src/
WORKDIR /src/
RUN npm install --only=prod

COPY ./ /src/
WORKDIR /src/

ENTRYPOINT ["node", "app.js"]