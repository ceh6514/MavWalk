FROM node:20-alpine

# Install sqlite3 CLI so db.js initialization works in the container
RUN apk add --no-cache sqlite

# Create app directory
WORKDIR /srv

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy the rest of the backend code
COPY . .

ENV NODE_ENV=production

# Cloud Run injects PORT; server.js already uses process.env.PORT || 3001
CMD ["npm", "start"]

