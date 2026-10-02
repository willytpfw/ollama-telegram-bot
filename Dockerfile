ARG BUILD_FROM=ghcr.io/home-assistant/base:latest
FROM ${BUILD_FROM}

# Node.js y npm (la imagen base de HA no los trae)
RUN apk add --no-cache nodejs npm

WORKDIR /app

# Dependencias primero, para aprovechar la caché de Docker
COPY package*.json ./
RUN npm install --omit=dev && ls node_modules/axios

# Código de la aplicación
COPY index.js ./

# Script de inicio
COPY run.sh /run.sh
RUN chmod a+x /run.sh

CMD [ "/run.sh" ]