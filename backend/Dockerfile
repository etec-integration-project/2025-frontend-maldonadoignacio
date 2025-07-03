# Usar una imagen base de Node.js
FROM node:18-alpine

# Crear y establecer el directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install
RUN npm install --save-dev @babel/core @babel/eslint-parser eslint-plugin-vue
RUN npm install -g dotenv-cli

# Copiar el resto del código fuente
COPY . .

# Exponer el puerto
EXPOSE 3000

# Comando para ejecutar la aplicación
CMD ["dotenv", "--", "npm", "start"]
