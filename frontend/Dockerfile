# Etapa 1: build
FROM node:20-alpine AS build
WORKDIR /app
ENV VITE_API_URL=https://api.38.224.68.30.nip.io/api
COPY package*.json ./
RUN npm install
COPY . .
ARG CACHEBUST=2
RUN npm run build

# Etapa 2: serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]