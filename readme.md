# T3 Stack Project

**Development environment:** macOS  
PostgreSQL (running in Docker)
Next.js app run locally for easy development

**Target environment:** Debian 13
PostgreSQL run inside Docker container
Next.js app run inside Docker container


## Tech Stack

- PostgreSQL (running in Docker)
- Next.js
- tRPC
- shadcn/ui
- Tailwind CSS
- TypeScript
- Drizzle ORM

---

## Mac Setup

### 1. Install Docker

```bash
brew install colima docker docker-compose
colima start --cpu 2 --memory 4
docker ps
```

Start with emulation support for x86_64 (AMD64):

```bash
colima start --arch aarch64 --vm-type=vz --vz-rosetta
```

### 2. Run the PostgreSQL Docker Container

```bash
docker-compose up -d
```

---

## Debian Setup

### 1. Install Docker

Update apt and install tools:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
```

Create the directory for the key:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
```

Download the GPG key:

```bash
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

Add the Docker repo:

```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  bookworm stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

Install Docker Engine:

```bash
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Create the docker group (usually exists already):

```bash
sudo groupadd docker
```

Add your current user to the group:

```bash
sudo usermod -aG docker $USER
```

Apply the changes (log out and log back in, OR run this command):

```bash
newgrp docker
```

Test Docker:

```bash
docker compose version
```