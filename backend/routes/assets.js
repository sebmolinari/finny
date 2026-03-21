const express = require("express");
const router = express.Router();
const Asset = require("../models/Asset");
const PriceData = require("../models/PriceData");
const AuditLog = require("../models/AuditLog");
const PriceService = require("../services/priceService");
const authMiddleware = require("../middleware/auth");
const adminMiddleware = require("../middleware/admin");
const { validate } = require("../utils/validationMiddleware");
const {
  assetValidation,
  assetPriceValidation,
  bulkImportPricesValidation,
} = require("../middleware/validators/assetValidators");
const logger = require("../utils/logger");

/**
 * @swagger
 * /assets:
 *   get:
 *     summary: Get all assets
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: assetType
 *         schema:
 *           type: string
 *         description: Filter by asset type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by asset name or symbol
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *         description: Include inactive assets
 *     responses:
 *       200:
 *         description: List of assets
 *       500:
 *         description: Server error
 */
router.get("/", authMiddleware, (req, res) => {
  try {
    const { assetType, search, includeInactive } = req.query;
    const assets = Asset.getAll({
      assetType,
      search,
      includeInactive: includeInactive === "true",
    });
    res.json(assets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /assets/{id}:
 *   get:
 *     summary: Get a single asset by ID
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Asset details
 *       404:
 *         description: Asset not found
 *       500:
 *         description: Server error
 */
router.get("/:id", authMiddleware, (req, res) => {
  try {
    const asset = Asset.findById(req.params.id);
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }
    res.json(asset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /assets/symbol/{symbol}:
 *   get:
 *     summary: Get asset by symbol
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: symbol
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset symbol
 *     responses:
 *       200:
 *         description: Asset details
 *       404:
 *         description: Asset not found
 *       500:
 *         description: Server error
 */
router.get("/symbol/:symbol", authMiddleware, (req, res) => {
  try {
    const asset = Asset.findBySymbol(req.params.symbol);
    if (!asset) {
      return res.status(404).json({ message: "Asset not found" });
    }
    res.json(asset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /assets:
 *   post:
 *     summary: Create a new asset (Admin only)
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               symbol:
 *                 type: string
 *               name:
 *                 type: string
 *               asset_type:
 *                 type: string
 *               currency:
 *                 type: string
 *               price_source:
 *                 type: string
 *               price_symbol:
 *                 type: string
 *               price_factor:
 *                 type: number
 *               active:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Asset created
 *       400:
 *         description: Invalid input or asset already exists
 *       500:
 *         description: Server error
 */
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  validate(assetValidation),
  (req, res) => {
    try {
      const {
        symbol,
        name,
        asset_type,
        currency,
        price_source,
        price_symbol,
        price_factor,
      } = req.body;
      const active =
        req.body.active === undefined ? 1 : req.body.active ? 1 : 0;

      const id = Asset.create(
        symbol,
        name,
        asset_type,
        currency,
        price_source,
        price_symbol,
        active,
        price_factor,
        req.user.id,
      );
      const asset = Asset.findById(id);

      // Log asset creation
      AuditLog.logCreate(
        req.user.id,
        req.user.username,
        "assets",
        id,
        {
          symbol,
          name,
          asset_type,
          currency,
          price_source,
          price_symbol,
          active,
          price_factor,
        },
        req.ip,
        req.get("user-agent"),
      );

      res.status(201).json(asset);
    } catch (error) {
      if (error.message.includes("UNIQUE constraint failed")) {
        return res
          .status(400)
          .json({ message: "Asset with this symbol already exists" });
      }
      res.status(500).json({ message: error.message });
    }
  },
);

/**
 * @swagger
 * /assets/{id}:
 *   put:
 *     summary: Update an asset (Admin only)
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               asset_type:
 *                 type: string
 *               currency:
 *                 type: string
 *               price_source:
 *                 type: string
 *               price_symbol:
 *                 type: string
 *               price_factor:
 *                 type: number
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Asset updated
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Asset not found
 *       500:
 *         description: Server error
 */
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  validate(assetValidation),
  (req, res) => {
    try {
      const {
        name,
        asset_type,
        currency,
        price_source,
        price_symbol,
        price_factor,
      } = req.body;
      const active =
        req.body.active === undefined ? 1 : req.body.active ? 1 : 0;

      // Get old asset data for audit log
      const oldAsset = Asset.findById(req.params.id);
      if (!oldAsset) {
        return res.status(404).json({ message: "Asset not found" });
      }

      const oldValues = {
        name: oldAsset.name,
        asset_type: oldAsset.asset_type,
        currency: oldAsset.currency,
        price_source: oldAsset.price_source,
        price_symbol: oldAsset.price_symbol,
        active: oldAsset.active,
        price_factor: oldAsset.price_factor,
      };

      const updated = Asset.update(
        req.params.id,
        {
          name,
          asset_type,
          currency,
          price_source,
          price_symbol,
          active,
          price_factor,
        },
        req.user.id,
      );

      if (!updated) {
        return res.status(404).json({ message: "Asset not found" });
      }

      const asset = Asset.findById(req.params.id);

      // Log asset update
      AuditLog.logUpdate(
        req.user.id,
        req.user.username,
        "assets",
        parseInt(req.params.id),
        oldValues,
        {
          name,
          asset_type,
          currency,
          price_source,
          price_symbol,
          active,
          price_factor,
        },
        req.ip,
        req.get("user-agent"),
      );

      res.json(asset);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

/**
 * @swagger
 * /assets/{id}:
 *   delete:
 *     summary: Delete an asset (Admin only)
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Asset deleted successfully
 *       404:
 *         description: Asset not found
 *       500:
 *         description: Server error
 */
router.delete("/:id", authMiddleware, adminMiddleware, (req, res) => {
  try {
    // Get asset before deletion for audit log
    const asset = Asset.findById(req.params.id);

    const deleted = Asset.delete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: "Asset not found" });
    }

    // Log asset deletion
    if (asset) {
      AuditLog.logDelete(
        req.user.id,
        req.user.username,
        "assets",
        parseInt(req.params.id),
        {
          symbol: asset.symbol,
          name: asset.name,
          asset_type: asset.asset_type,
        },
        req.ip,
        req.get("user-agent"),
      );
    }

    res.json({ message: "Asset deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /assets/{id}/prices:
 *   get:
 *     summary: Get price history for an asset
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date (YYYY-MM-DD)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limit number of price records
 *     responses:
 *       200:
 *         description: Price history
 *       500:
 *         description: Server error
 */
router.get("/:id/prices", authMiddleware, (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;
    const prices = PriceData.findByAsset(req.params.id, {
      startDate,
      endDate,
      limit: parseInt(limit) || 365,
    });
    res.json(prices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /assets/{id}/price/latest:
 *   get:
 *     summary: Get latest price for an asset
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Latest price
 *       201:
 *         description: No price data available
 *       500:
 *         description: Server error
 */
router.get("/:id/price/latest", authMiddleware, (req, res) => {
  try {
    const price = PriceData.getLatestPrice(req.params.id);
    if (!price) {
      return res.status(200).json({ message: "No price data available" });
    }
    res.json(price);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /assets/{id}/prices:
 *   post:
 *     summary: Add price data for an asset (Admin only)
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *               price:
 *                 type: number
 *               source:
 *                 type: string
 *     responses:
 *       201:
 *         description: Price data created
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Price data already exists
 *       500:
 *         description: Server error
 */
router.post(
  "/:id/prices",
  authMiddleware,
  adminMiddleware,
  validate(assetPriceValidation),
  (req, res) => {
    try {
      const { date, price, source } = req.body;

      const id = PriceData.create(
        req.params.id,
        date,
        price,
        source,
        req.user.id,
      );

      const priceData = PriceData.findByAssetAndDate(req.params.id, date);

      // Log price data creation
      AuditLog.logCreate(
        req.user.id,
        req.user.username,
        "price_data",
        id,
        {
          asset_id: req.params.id,
          date,
          price,
          source: source,
        },
        req.ip,
        req.get("user-agent"),
      );

      res.status(201).json(priceData);
    } catch (error) {
      if (error.message.includes("already exists")) {
        return res.status(409).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  },
);

/**
 * @swagger
 * /assets/{id}/prices/{priceId}:
 *   put:
 *     summary: Update price data for an asset (Admin only)
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *       - in: path
 *         name: priceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Price entry ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               price:
 *                 type: number
 *               source:
 *                 type: string
 *     responses:
 *       200:
 *         description: Price data updated
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Price entry not found
 *       500:
 *         description: Server error
 */
router.put(
  "/:id/prices/:priceId",
  authMiddleware,
  adminMiddleware,
  validate(assetPriceValidation),
  (req, res) => {
    try {
      const { price, source } = req.body;

      // Get old price data for audit log
      const oldPriceData = PriceData.findById(req.params.priceId);

      if (!oldPriceData) {
        return res.status(404).json({ message: "Price entry not found" });
      }

      const updated = PriceData.update(
        req.params.priceId,
        price,
        source !== undefined ? source : oldPriceData.source,
        req.user.id,
      );

      if (!updated) {
        return res.status(404).json({ message: "Price entry not found" });
      }

      const priceData = PriceData.findById(req.params.priceId);

      // Log price data update
      AuditLog.logUpdate(
        req.user.id,
        req.user.username,
        "price_data",
        parseInt(req.params.priceId),
        { price: oldPriceData.price, source: oldPriceData.source },
        { price: priceData.price, source: priceData.source },
        req.ip,
        req.get("user-agent"),
      );

      res.json(priceData);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

/**
 * @swagger
 * /assets/{id}/prices/bulk:
 *   post:
 *     summary: Bulk import price data for an asset (Admin only)
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prices:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Bulk import completed
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post(
  "/:id/prices/bulk",
  authMiddleware,
  adminMiddleware,
  validate(bulkImportPricesValidation),
  (req, res) => {
    try {
      const { prices } = req.body;

      const priceData = prices.map((p) => ({
        asset_id: req.params.id,
        date: p.date,
        price: p.price,
        source: p.source,
      }));

      PriceData.bulkCreate(priceData);

      // Log bulk price import
      AuditLog.create({
        user_id: req.user.id,
        username: req.user.username,
        action_type: "import",
        table_name: "price_data",
        new_values: { asset_id: req.params.id, count: prices.length },
      });

      res.json({
        message: `${prices.length} price records imported successfully`,
        count: prices.length,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

/**
 * @swagger
 * /assets/{id}/prices/{priceId}:
 *   delete:
 *     summary: Delete a price entry for an asset (Admin only)
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *       - in: path
 *         name: priceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Price entry ID
 *     responses:
 *       200:
 *         description: Price entry deleted successfully
 *       404:
 *         description: Price entry not found
 *       500:
 *         description: Server error
 */
router.delete(
  "/:id/prices/:priceId",
  authMiddleware,
  adminMiddleware,
  (req, res) => {
    try {
      // Get price data before deletion for audit log
      const priceData = PriceData.findById(req.params.priceId);

      const deleted = PriceData.delete(req.params.priceId);

      if (!deleted) {
        return res.status(404).json({ message: "Price entry not found" });
      }

      // Log price data deletion
      if (priceData) {
        AuditLog.logDelete(
          req.user.id,
          req.user.username,
          "price_data",
          parseInt(req.params.priceId),
          {
            asset_id: priceData.asset_id,
            date: priceData.date,
            price: priceData.price,
          },
          req.ip,
          req.get("user-agent"),
        );
      }

      res.json({ message: "Price entry deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

/**
 * @swagger
 * /assets/prices/refresh-all:
 *   post:
 *     summary: Refresh prices for all assets (Admin only)
 *     tags: [Assets]
 *     security: []
 *     responses:
 *       200:
 *         description: Price refresh completed
 *       500:
 *         description: Server error
 */
router.post("/prices/refresh-all", async (req, res) => {
  try {
    const userId = req.user?.id ?? null;
    const username = req.user?.username ?? null;
    const results = await PriceService.refreshAllPrices(userId);

    await AuditLog.create({
      user_id: userId,
      username,
      action_type: "import",
      table_name: "price_data",
      new_values: {
        action: "refresh_all_prices",
        updated: results.updated,
        skipped: results.skipped,
        failed: results.failed,
        total: results.total,
      },
    });

    res.json({
      message: "Price refresh completed",
      results,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /assets/{id}/prices/refresh:
 *   post:
 *     summary: Refresh price for a single asset
 *     tags: [Assets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Asset ID
 *     responses:
 *       200:
 *         description: Price refresh result
 *       400:
 *         description: Asset is inactive or other error
 *       500:
 *         description: Server error
 */
router.post("/:id/prices/refresh", authMiddleware, async (req, res) => {
  try {
    const result = await PriceService.refreshAssetPrice(
      req.params.id,
      req.user.id,
    );

    // Log price refresh action
    if (result.success) {
      AuditLog.logCreate(
        req.user.id,
        req.user.username,
        "price_data",
        result.price.id,
        {
          asset_id: req.params.id,
          date: result.price.date,
          price: result.price.price,
          source: result.price.source,
        },
        req.ip,
        req.get("user-agent"),
      );
    }

    res.json(result);
  } catch (error) {
    if (error.message.includes("inactive")) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
