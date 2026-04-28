# Etapa 1: construir la app
FROM node:20-alpine as build
WORKDIR /app
ARG VITE_API_URL=https://api.38.224.68.30.nip.io/api
ENV VITE_API_URL=$VITE_API_URL
COPY package*.json ./
RUN npm install
COPY . .
RUN date && npm run build
# Etapa 2: servir con nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]