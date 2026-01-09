/**
 * @swagger
 * /metrics/host-metrics:
 *   get:
 *     summary: Get host system metrics (admin only)
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Host system metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cpuLoad:
 *                   type: array
 *                   items:
 *                     type: number
 *                   description: CPU load averages (1, 5, 15 min)
 *                 totalMem:
 *                   type: integer
 *                   description: Total system memory (bytes)
 *                 freeMem:
 *                   type: integer
 *                   description: Free system memory (bytes)
 *                 cpuTemp:
 *                   type: number
 *                   nullable: true
 *                   description: CPU temperature in Celsius (null if unavailable)
 *                 disk:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     size:
 *                       type: string
 *                     used:
 *                       type: string
 *                     avail:
 *                       type: string
 *                     percent:
 *                       type: string
 *                 uptime:
 *                   type: number
 *                   description: System uptime in seconds
 *                 platform:
 *                   type: string
 *                 arch:
 *                   type: string
 *                 hostname:
 *                   type: string
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin privileges required
 */
const express = require("express");
const os = require("os");
const fs = require("fs");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const adminMiddleware = require("../middleware/admin");

// Helper to get CPU temperature (Linux, RPi)
function getCpuTemperature() {
  try {
    const tempStr = fs.readFileSync(
      "/sys/class/thermal/thermal_zone0/temp",
      "utf8"
    );
    return parseInt(tempStr, 10) / 1000;
  } catch (e) {
    return null;
  }
}

// Helper to get disk space (root fs)
function getDiskSpace() {
  try {
    const { execSync } = require("child_process");
    const output = execSync("df -h / | tail -1", { encoding: "utf8" });
    const parts = output.split(/\s+/);
    return {
      size: parts[1],
      used: parts[2],
      avail: parts[3],
      percent: parts[4],
    };
  } catch (e) {
    return null;
  }
}

// Require authentication and admin privileges for all metrics endpoints
router.use(authMiddleware);
router.use(adminMiddleware);

router.get("/host-metrics", (req, res) => {
  const cpuLoad = os.loadavg();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const cpuTemp = getCpuTemperature();
  const disk = getDiskSpace();

  res.json({
    cpuLoad,
    totalMem,
    freeMem,
    cpuTemp,
    disk,
    uptime: os.uptime(),
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
  });
});

module.exports = router;
