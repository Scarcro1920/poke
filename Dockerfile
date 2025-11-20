# Base Node 18 officielle (Debian Bullseye)
FROM node:18-bullseye

# Set working directory
WORKDIR /poketube
COPY . /poketube

# Expose Render port
ENV PORT=6003
EXPOSE $PORT

# Installer build tools pour node-gyp
RUN apt-get update && apt-get install -y build-essential python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

# Installer les dépendances npm
RUN npm install --legacy-peer-deps

# Lancer le serveur
CMD ["npm", "start"]
