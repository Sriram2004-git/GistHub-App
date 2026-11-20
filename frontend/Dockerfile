# Multi‑stage build for the GistHub React frontend
# ---------------------------------------------------
# Builder stage – use Node 24 (Alpine) to install dependencies and produce the static bundle.
FROM node:24-alpine AS builder

# Working directory inside the container
WORKDIR /app

# Copy only lockfile and package.json first for deterministic layer caching
COPY package.json package-lock.json ./

# Build‑time API base URL – defaults to the local backend URL.
ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Install exact dependencies (no dev‑deps are needed for the production bundle)
RUN npm ci --silent

# Copy the rest of the source code (excluding files listed in .dockerignore)
COPY . .

# Produce the production assets – this creates a `dist/` folder.
RUN npm run build

# ---------------------------------------------------
# Production stage – serve the static files with a lightweight Nginx.
FROM nginx:alpine

# Use the custom Nginx configuration that handles React Router.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built assets from the builder stage.
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose the default HTTP port.
EXPOSE 80

# Run Nginx in the foreground.
CMD ["nginx", "-g", "daemon off;"]
