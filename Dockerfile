FROM ghcr.io/home-assistant/base:latest

WORKDIR /app

# Copiar package.json antes de instalar dependencias
COPY package.json .

RUN npm install

# Copiar tu código
COPY index.js .

# Copiar script de inicio
COPY run.sh /run.sh
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]
