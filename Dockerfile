FROM ghcr.io/home-assistant/base:latest

WORKDIR /app

COPY index.js .
RUN npm install

COPY run.sh /run.sh
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]
