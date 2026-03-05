FROM node:20-alpine

WORKDIR /app

# Create a non-root user
RUN addgroup -S llmpot && adduser -S llmpot -G llmpot

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN chown -R llmpot:llmpot /app

USER llmpot

# Expose internal high ports for non-root execution
EXPOSE 8000 8443 8080 9200

CMD ["node", "src/index.js"]
