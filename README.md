# Finny — Docker Setup

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) or Docker Engine (Linux/Raspberry Pi)
  - Raspberry Pi / Linux: `curl -fsSL https://get.docker.com | sh`

---

## First-time setup

1. Create a `.env` file in your data folder and fill in the required values:

**Windows/Mac:** `C:\finny-data\.env`
**Raspberry Pi / Linux:** `~/finny-data/.env`

```
DB_KEY=<your-database-password>   # min 8 chars
JWT_SECRET=<a-random-string>      # min 32 chars
```

To enable email notifications, add these optional values:

```
EMAIL_ENABLED=true
EMAIL_USER=your-email@example.com
EMAIL_APP_PASSWORD=your-app-password
```

2. Run the container:

**Windows/Mac:**

```bat
docker run -d -p 5000:5000 -v C:\finny-data:/app/data --env-file C:\finny-data\.env --restart unless-stopped --name finny sebmolinari/finny:latest
docker port finny 5000
```

**Raspberry Pi / Linux:**

```bash
docker run -d -p 5000:5000 -v ~/finny-data:/app/data --env-file ~/finny-data/.env --restart unless-stopped --name finny sebmolinari/finny:latest
docker port finny 5000
```

3. Open `http://localhost:<port shown above>`.

> **Custom port:** Replace `-p 5000:5000` with `-p <your-port>:5000` to expose Finny on a different host port (e.g. `-p 8080:5000`). Use `-p 0:5000` to let Docker pick a free port automatically — run `docker port finny 5000` afterwards to see which one was assigned.

---

## Data

Your database is stored directly on the host — accessible outside Docker at any time.

| Platform             | File location               |
| -------------------- | --------------------------- |
| Windows/Mac          | `C:\finny-data\database.db` |
| Raspberry Pi / Linux | `~/finny-data/database.db`  |

---

## Updates

```bash
docker stop finny
docker rm finny
docker pull sebmolinari/finny:latest
```

Then run the same `docker run` command from setup step 2. Your data is preserved.
