# Docker

## Prerequisites

- [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/) installed and running
- Logged in to Docker Hub: `docker login`

---

## Build and run locally (for testing)

Builds a local image for your current machine only (not pushed anywhere) and starts the container.

```bat
build-local.bat
```

The script will:
1. Stop and remove any existing `finny` container
2. Remove the old `finny:local` image
3. Build a fresh image
4. Start the container and print the assigned port

Your data is preserved — the `finny_data` volume is not removed.

---

## Publish to Docker Hub

Builds for **both Windows/Linux (amd64) and Raspberry Pi (arm64)** and pushes to Docker Hub.

Before running, set the version in `build-and-push.bat`:

```bat
set VERSION=1.0.0
```

Then run:

```bat
build-and-push.bat
```

This pushes two tags simultaneously — `sebmolinari/finny:1.0.0` and `sebmolinari/finny:latest`. Clients pulling `latest` always get the newest version; clients can also pin to a specific version (e.g. `finny:1.0.0`) if they want to control when they update.

First run takes ~20-40 min (compiles native SQLite for both architectures). Subsequent runs are faster due to layer cache.

---

## Client setup (any machine)

Users only need Docker installed and a `.env` file. Send them `.env.example`.

1. Install Docker:
   - Windows/Mac: [Docker Desktop](https://www.docker.com/products/docker-desktop/)
   - Raspberry Pi / Linux: `curl -fsSL https://get.docker.com | sh`

2. Create a `.env` file from the example and fill in:

```bash
DB_KEY=their-chosen-password            # min 8 chars, write it down
JWT_SECRET=generate-a-32-char-secret    # run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

3. Run:

**Windows/Mac:**
```bat
docker run -d -p 0:5000 -v C:\finny-data:/app/data --env-file .env --restart unless-stopped --name finny sebmolinari/finny:latest
docker port finny 5000
```

**Raspberry Pi / Linux:**
```bash
docker run -d -p 0:5000 -v ~/finny-data:/app/data --env-file .env --restart unless-stopped --name finny sebmolinari/finny:latest
docker port finny 5000
```

Open `http://localhost:<assigned-port>`.

### Storage strategy

The database file is stored directly on the host machine — accessible outside Docker at any time.

| Platform | Path |
|----------|------|
| Windows/Mac | `C:\finny-data\database.db` |
| Raspberry Pi / Linux | `~/finny-data/database.db` |

**To back up**, copy the file to a safe location:

**Windows/Mac:**
```bat
copy C:\finny-data\database.db C:\backups\database.db
```

**Raspberry Pi / Linux:**
```bash
cp ~/finny-data/database.db ~/backups/database.db
```

**To restore**, stop the container, replace the file, and restart.

### Pull updates

```bat
docker stop finny
docker rm finny
docker pull sebmolinari/finny:latest
```

Then run the same `docker run` command from step 3. Data is preserved — the local folder is not removed.
