const db = require("../config/database");
const {
  PRICE_SCALE,
  toValueScale,
  fromValueScale,
} = require("../utils/valueScale");

class PriceData {
  static create(assetId, date, price, source, createdBy) {
    // Check if price already exists for this date
    const existing = this.findByAssetAndDate(assetId, date);
    if (existing) {
      throw new Error(`Price data already exists for ${date}`);
    }

    const _price = toValueScale(price, PRICE_SCALE);

    const stmt = db.prepare(`
      INSERT INTO price_data (asset_id, date, price, source, created_by)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(assetId, date, _price.value, source, createdBy);
    return result.lastInsertRowid;
  }

  static bulkCreate(priceData, createdBy) {
    const stmt = db.prepare(`
      INSERT INTO price_data (asset_id, date, price, source, created_by)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((items) => {
      for (const item of items) {
        try {
          const _price = toValueScale(item.price, PRICE_SCALE);
          stmt.run(
            item.asset_id,
            item.date,
            _price.value,
            item.source,
            createdBy,
          );
        } catch (error) {
          // Skip duplicates silently in bulk operations
          if (!error.message.includes("UNIQUE constraint failed")) {
            throw error;
          }
        }
      }
    });

    insertMany(priceData);
  }

  static update(id, price, source, updatedBy) {
    const _price = toValueScale(price, PRICE_SCALE);

    const stmt = db.prepare(`
      UPDATE price_data 
      SET price = ?, source = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    const result = stmt.run(_price.value, source, updatedBy, id);
    return result.changes > 0;
  }

  static delete(id) {
    const stmt = db.prepare("DELETE FROM price_data WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  static bulkDelete(ids) {
    const placeholders = ids.map(() => "?").join(",");
    const stmt = db.prepare(`DELETE FROM price_data WHERE id IN (${placeholders})`);
    const result = stmt.run(...ids);
    return result.changes;
  }

  // Helper: Map DB row to API response (convert integer to float)
  static _mapRowToApi(row) {
    if (!row) return null;
    return {
      ...row,
      price: fromValueScale(row.price, PRICE_SCALE),
    };
  }

  static findById(id) {
    const stmt = db.prepare("SELECT * FROM price_data WHERE id = ?");
    const row = stmt.get(id);
    return PriceData._mapRowToApi(row);
  }

  static findByAssetAndDate(assetId, date) {
    const stmt = db.prepare(
      "SELECT * FROM price_data WHERE asset_id = ? AND date = ?",
    );
    const row = stmt.get(assetId, date);
    return PriceData._mapRowToApi(row);
  }

  static findByAsset(assetId, options = {}) {
    const { startDate, endDate, limit = 365 } = options;

    let query = "SELECT * FROM price_data WHERE asset_id = ?";
    const params = [assetId];

    if (startDate) {
      query += " AND date >= ?";
      params.push(startDate);
    }

    if (endDate) {
      query += " AND date <= ?";
      params.push(endDate);
    }

    query += " ORDER BY date DESC LIMIT ?";
    params.push(limit);

    const stmt = db.prepare(query);
    const rows = stmt.all(...params);
    return rows.map(PriceData._mapRowToApi);
  }

  static getLatestPrice(assetId) {
    const stmt = db.prepare(`
      SELECT * FROM price_data 
      WHERE asset_id = ? 
      ORDER BY date DESC 
      LIMIT 1
    `);
    const row = stmt.get(assetId);
    return PriceData._mapRowToApi(row);
  }

  static getLatestPriceAsOf(assetId, asOfDate) {
    const stmt = db.prepare(`
      SELECT * FROM price_data 
      WHERE asset_id = ? AND date <= ?
      ORDER BY date DESC 
      LIMIT 1
    `);
    const row = stmt.get(assetId, asOfDate);
    return PriceData._mapRowToApi(row);
  }

  static getAssetPriceHistory(assetId, days = 30) {
    const stmt = db.prepare(`
      SELECT date, price 
      FROM price_data 
      WHERE asset_id = ? AND date >= date('now', '-' || ? || ' days')
      ORDER BY date ASC
    `);
    const rows = stmt.all(assetId, days);
    return rows.map((row) => ({
      date: row.date,
      price: fromValueScale(row.price, PRICE_SCALE),
    }));
  }
}

module.exports = PriceData;
