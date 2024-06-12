# Use an official Node.js runtime as a parent image
FROM node:18

# Set the working directory in the container
WORKDIR /usr/src/app

RUN npm install -g yarn
# Copy the package.json and package-lock.json files to the container
COPY package*.json ./

# Install dependencies
RUN yarn

# Copy the rest of the application code to the container
COPY . .

# Build the NestJS application
RUN yarn run build

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the application
CMD ["yarn", "run", "start:prod"]