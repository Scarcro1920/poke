FROM debian:stable

# Workdir
WORKDIR /poketube
COPY . /poketube

# Expose le port fourni par Render
ENV PORT=6003
EXPOSE $PORT

# Installer dépendances système
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    ca-certificates \
    python3 \
    python3-pip \
    python3-distutils \
    build-essential

# Installer Node.js 18 via NodeSource
RUN mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
      | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_18.x nodistro main" \
      > /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && apt-get install -y nodejs npm

# Installer les dépendances npm
RUN npm install --legacy-peer-deps

# Lancer l’application sur Render
CMD ["npm", "start"]
