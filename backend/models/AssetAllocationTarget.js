const db = require("../config/database");
const logger = require("../utils/logger");

class AssetAllocationTarget {
  /**
   * Create or update allocation target (upsert)
   * @param {number} userId - User ID
   * @param {string|null} assetType - Asset type (for type-level allocation)
   * @param {number|null} assetId - Asset ID (for asset-level allocation)
   * @param {number} targetPercentage - Target percentage (0-100)
   * @param {string|null} notes - Optional notes
   * @param {number} createdBy - User ID who created/updated the target
   */
  static upsert(
    userId,
    assetType,
    assetId,
    targetPercentage,
    notes,
    createdBy,
  ) {
    try {
      // Validate that either assetType or assetId is provided, but not both
      if ((assetType && assetId) || (!assetType && !assetId)) {
        throw new Error(
          "Must provide either asset_type or asset_id, not both or neither",
        );
      }

      // Validate target percentage
      if (targetPercentage < 0 || targetPercentage > 100) {
        throw new Error("Target percentage must be between 0 and 100");
      }

      // Check if target exists
      const existing = assetType
        ? this.getByAssetType(userId, assetType)
        : this.getByAssetId(userId, assetId);

      if (existing) {
        // Update existing
        const stmt = db.prepare(`
          UPDATE asset_allocation_targets
          SET target_percentage = ?,
              notes = ?,
              updated_by = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ? AND ${assetType ? "asset_type = ?" : "asset_id = ?"}
        `);
        stmt.run(
          targetPercentage,
          notes,
          createdBy,
          userId,
          assetType || assetId,
        );
        return assetType
          ? this.getByAssetType(userId, assetType)
          : this.getByAssetId(userId, assetId);
      } else {
        // Insert new
        const stmt = db.prepare(`
          INSERT INTO asset_allocation_targets (
            user_id, asset_type, asset_id, target_percentage, notes, created_by
          ) VALUES (?, ?, ?, ?, ?, ?)
        `);
        const result = stmt.run(
          userId,
          assetType,
          assetId,
          targetPercentage,
          notes,
          createdBy,
        );
        return this.getById(result.lastInsertRowid, userId);
      }
    } catch (error) {
      logger.error(`Error upserting allocation target: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete allocation target
   */
  static delete(id, userId) {
    try {
      const stmt = db.prepare(`
        DELETE FROM asset_allocation_targets
        WHERE id = ? AND user_id = ?
      `);
      const result = stmt.run(id, userId);
      return result.changes > 0;
    } catch (error) {
      logger.error(`Error deleting allocation target ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete allocation target by asset type
   */
  static deleteByAssetType(userId, assetType) {
    try {
      const stmt = db.prepare(`
        DELETE FROM asset_allocation_targets
        WHERE user_id = ? AND asset_type = ? AND asset_id IS NULL
      `);
      const result = stmt.run(userId, assetType);
      return result.changes > 0;
    } catch (error) {
      logger.error(
        `Error deleting allocation target for ${assetType}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Delete allocation target by asset ID
   */
  static deleteByAssetId(userId, assetId) {
    try {
      const stmt = db.prepare(`
        DELETE FROM asset_allocation_targets
        WHERE user_id = ? AND asset_id = ? AND asset_type IS NULL
      `);
      const result = stmt.run(userId, assetId);
      return result.changes > 0;
    } catch (error) {
      logger.error(
        `Error deleting allocation target for asset ${assetId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Batch upsert multiple allocation targets
   */
  static batchUpsert(userId, targets, createdBy) {
    try {
      // Separate type-level and asset-level targets
      const typeTargets = targets.filter((t) => t.asset_type && !t.asset_id);
      const assetTargets = targets.filter((t) => !t.asset_type && t.asset_id);

      // Validate type-level targets don't exceed 100%
      const totalTypePercentage = typeTargets.reduce(
        (sum, t) => sum + t.target_percentage,
        0,
      );
      if (totalTypePercentage > 100) {
        throw new Error(
          `Total type-level allocation exceeds 100% (got ${totalTypePercentage.toFixed(
            2,
          )}%)`,
        );
      }

      // Validate asset-level targets don't exceed 100% within each asset type
      // First, we need to get the asset_type for each asset_id
      const Asset = require("./Asset");
      const assetsByType = {};

      assetTargets.forEach((target) => {
        const asset = Asset.findById(target.asset_id);
        if (!asset) {
          throw new Error(`Asset with ID ${target.asset_id} not found`);
        }

        if (!assetsByType[asset.asset_type]) {
          assetsByType[asset.asset_type] = [];
        }
        assetsByType[asset.asset_type].push(target);
      });

      // Validate each asset type's asset-level allocations
      for (const [assetType, assets] of Object.entries(assetsByType)) {
        const totalAssetPercentage = assets.reduce(
          (sum, t) => sum + t.target_percentage,
          0,
        );
        if (totalAssetPercentage > 100) {
          throw new Error(
            `Asset-level allocation for ${assetType} exceeds 100% (got ${totalAssetPercentage.toFixed(
              2,
            )}%)`,
          );
        }
      }

      // Use transaction for atomicity
      const upsertTransaction = db.transaction((userId, targets, createdBy) => {
        for (const target of targets) {
          this.upsert(
            userId,
            target.asset_type || null,
            target.asset_id || null,
            target.target_percentage,
            target.notes || null,
            createdBy,
          );
        }
      });

      upsertTransaction(userId, targets, createdBy);
      return this.getAllByUser(userId);
    } catch (error) {
      logger.error(
        `Error batch upserting allocation targets: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get all allocation targets for a user
   */
  static getAllByUser(userId, excludeAssetTypes = []) {
    try {
      // Build base query and params
      let whereClause = "aat.user_id = ?";
      const params = [userId];

      if (excludeAssetTypes && excludeAssetTypes.length > 0) {
        const placeholders = excludeAssetTypes.map(() => "?").join(", ");
        // Exclude type-level targets where asset_type is in the excluded list
        whereClause += ` AND (aat.asset_type IS NULL OR aat.asset_type NOT IN (${placeholders}))`;
        // Also exclude joined asset rows where asset.asset_type is in excluded list
        whereClause += ` AND (a.asset_type IS NULL OR a.asset_type NOT IN (${placeholders}))`;
        params.push(...excludeAssetTypes, ...excludeAssetTypes);
      }

      const stmt = db.prepare(`
        SELECT 
          aat.*,
          a.symbol,
          a.name AS asset_name,
          a.asset_type AS asset_asset_type
        FROM asset_allocation_targets aat
        LEFT JOIN assets a ON aat.asset_id = a.id
        WHERE ${whereClause}
        ORDER BY 
          CASE WHEN aat.asset_type IS NOT NULL THEN 0 ELSE 1 END,
          aat.asset_type ASC,
          a.symbol ASC
      `);
      return stmt.all(...params);
    } catch (error) {
      logger.error(
        `Error getting allocation targets for user ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get single allocation target by ID
   */
  static getById(id, userId) {
    try {
      const stmt = db.prepare(`
        SELECT * FROM asset_allocation_targets
        WHERE id = ? AND user_id = ?
      `);
      return stmt.get(id, userId);
    } catch (error) {
      logger.error(`Error getting allocation target ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get allocation target by asset type
   */
  static getByAssetType(userId, assetType) {
    try {
      const stmt = db.prepare(`
        SELECT * FROM asset_allocation_targets
        WHERE user_id = ? AND asset_type = ? AND asset_id IS NULL
      `);
      return stmt.get(userId, assetType);
    } catch (error) {
      logger.error(
        `Error getting allocation target for ${assetType}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get allocation target by asset ID
   */
  static getByAssetId(userId, assetId) {
    try {
      const stmt = db.prepare(`
        SELECT 
          aat.*,
          a.symbol,
          a.name AS asset_name,
          a.asset_type AS asset_asset_type
        FROM asset_allocation_targets aat
        JOIN assets a ON aat.asset_id = a.id
        WHERE aat.user_id = ? AND aat.asset_id = ? AND aat.asset_type IS NULL
      `);
      return stmt.get(userId, assetId);
    } catch (error) {
      logger.error(
        `Error getting allocation target for asset ${assetId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Validate total allocation doesn't exceed 100%
   * For type-level: validates total across all types
   * For asset-level: validates total within the asset's type
   */
  static validateTotalAllocation(
    userId,
    excludeAssetType = null,
    excludeAssetId = null,
    excludeAssetTypes = [],
  ) {
    try {
      let stmt;
      let total;

      if (excludeAssetType) {
        // Validating type-level targets only
        // Build query excluding specified asset types as well
        let where = `user_id = ? AND asset_type IS NOT NULL AND asset_id IS NULL AND asset_type != ?`;
        const params = [userId, excludeAssetType];
        if (excludeAssetTypes && excludeAssetTypes.length > 0) {
          const placeholders = excludeAssetTypes.map(() => "?").join(", ");
          where += ` AND asset_type NOT IN (${placeholders})`;
          params.push(...excludeAssetTypes);
        }
        stmt = db.prepare(`
          SELECT SUM(target_percentage) as total
          FROM asset_allocation_targets
          WHERE ${where}
        `);
        total = stmt.get(...params).total || 0;
      } else if (excludeAssetId) {
        // Validating asset-level targets within their asset type
        // First get the asset's type
        const Asset = require("./Asset");
        const asset = Asset.findById(excludeAssetId);
        if (!asset) {
          throw new Error(`Asset with ID ${excludeAssetId} not found`);
        }

        // Build query and params
        let where = `aat.user_id = ? AND aat.asset_id IS NOT NULL AND a.asset_type = ? AND aat.asset_id != ?`;
        const params = [userId, asset.asset_type, excludeAssetId];
        if (excludeAssetTypes && excludeAssetTypes.length > 0) {
          const placeholders = excludeAssetTypes.map(() => "?").join(", ");
          where += ` AND a.asset_type NOT IN (${placeholders})`;
          params.push(...excludeAssetTypes);
        }
        stmt = db.prepare(`
          SELECT SUM(aat.target_percentage) as total
          FROM asset_allocation_targets aat
          JOIN assets a ON aat.asset_id = a.id
          WHERE ${where}
        `);
        total = stmt.get(...params).total || 0;
      } else {
        // Get total for type-level only (asset-level is within type, doesn't count toward 100%)
        let where = `user_id = ? AND asset_type IS NOT NULL AND asset_id IS NULL`;
        const params = [userId];
        if (excludeAssetTypes && excludeAssetTypes.length > 0) {
          const placeholders = excludeAssetTypes.map(() => "?").join(", ");
          where += ` AND asset_type NOT IN (${placeholders})`;
          params.push(...excludeAssetTypes);
        }
        stmt = db.prepare(`
          SELECT SUM(target_percentage) as total
          FROM asset_allocation_targets
          WHERE ${where}
        `);
        total = stmt.get(...params).total || 0;
      }

      return {
        total,
        isValid: total <= 100,
        remaining: 100 - total,
      };
    } catch (error) {
      logger.error(`Error validating total allocation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all asset-level targets grouped by asset type with their totals
   */
  static getAssetTargetsByType(userId) {
    try {
      const stmt = db.prepare(`
        SELECT 
          a.asset_type,
          aat.asset_id,
          aat.target_percentage,
          a.symbol,
          a.name
        FROM asset_allocation_targets aat
        JOIN assets a ON aat.asset_id = a.id
        WHERE aat.user_id = ? AND aat.asset_id IS NOT NULL
        ORDER BY a.asset_type, a.symbol
      `);
      const results = stmt.all(userId);

      // Group by asset type
      const grouped = {};
      results.forEach((row) => {
        if (!grouped[row.asset_type]) {
          grouped[row.asset_type] = {
            assets: [],
            total: 0,
          };
        }
        grouped[row.asset_type].assets.push(row);
        grouped[row.asset_type].total += row.target_percentage;
      });

      return grouped;
    } catch (error) {
      logger.error(`Error getting asset targets by type: ${error.message}`);
      throw error;
    }
  }
}

module.exports = AssetAllocationTarget;
