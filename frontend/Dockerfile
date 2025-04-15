FROM node:20-slim

WORKDIR /usr/src/app

COPY package*.json ./

# Instalar dependencias incluyendo Babel y ESLint
RUN npm install
RUN npm install --save-dev @babel/core @babel/eslint-parser eslint-plugin-vue

COPY . .

EXPOSE 8080

# Modificamos el comando para escuchar en todas las interfaces
ENV HOST=0.0.0.0
CMD ["npm", "run", "serve", "--", "--port", "8080", "--host", "0.0.0.0", "--public", "0.0.0.0"] 