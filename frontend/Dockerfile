# ---------- Build mərhələsi ----------
FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Boş origin → axios "/api", SignalR "/hubs/..." işlədir; nginx proxy edir
ENV VITE_API_ORIGIN=""
RUN npm run build

# ---------- İşləmə mərhələsi (nginx) ----------
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
