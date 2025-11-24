# AVS Service Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy source code
COPY . .

# Expose no ports (AVS is a background service)

# Start the AVS service
CMD ["npm", "start"]
