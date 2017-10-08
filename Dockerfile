FROM node:6-alpine
MAINTAINER Tyler Battle <tbattle@boundlessgeo.com>

RUN apk add --no-cache git python
RUN npm install -g bower grunt-cli karma

WORKDIR /usr/src/app

COPY package.json ./
RUN npm install

COPY .bowerrc ./
COPY bower.json ./
COPY bower-local ./bower-local
RUN bower install --allow-root

COPY . .
RUN grunt

CMD set -ex \
    && npm install \
    && bower install --allow-root \
    && grunt
