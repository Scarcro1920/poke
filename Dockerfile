FROM debian:stable

# Workdir
WORKDIR /poketube
COPY . /poketube

# Expose port
EXPOSE 6003

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    ca-certificates \
    python3 \
    python3-pip \
    python3-distutils \
    python3.11-minimal \
    python3.11-distutils \
    build-essential

# Install NodeJS 18 (compatible node-expat)
RUN mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
    | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_18.x nodistro main" \
    > /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && apt-get install -y nodejs npm

# Install npm dependencies
RUN npm install --legacy-peer-deps

# Start server
CMD ["npm", "start"]
