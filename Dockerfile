FROM node:current-alpine3.17

# Create app directory
WORKDIR /usr/src/app

# COPY package*.json
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy all files
COPY ./build .
COPY ./.env ./.env

# Expose port
EXPOSE 9999

# Run app
CMD ["node", "server.js"]