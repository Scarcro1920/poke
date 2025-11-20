FROM debian:stable

WORKDIR /poketube
COPY . /poketube

ENV PORT=6003
EXPOSE $PORT

# Installer dépendances système + build tools
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    ca-certificates \
    python3 \
    python3-pip \
    build-essential \
    make \
    g++ \
 && rm -rf /var/lib/apt/lists/*

# Installer setuptools (fournit distutils)
RUN python3 -m pip install --upgrade pip setuptools wheel

# Installer Node 18
RUN mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
      | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_18.x nodistro main" \
      > /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && apt-get install -y nodejs npm \
 && rm -rf /var/lib/apt/lists/*

# Installer les dépendances npm
RUN npm install --legacy-peer-deps

# Lancer le serveur
CMD ["npm", "start"]
