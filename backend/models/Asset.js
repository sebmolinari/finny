const db = require("../config/database");
const { fromValueScale, PRICE_SCALE } = require("../utils/valueScale");

class Asset {
  static create(
    symbol,
    name,
    assetType,
    currency,
    priceSource,
    priceSymbol,
    active,
    priceFactor,
    createdBy,
  ) {
    const stmt = db.prepare(
      "INSERT INTO assets (symbol, name, asset_type, currency, price_source, price_symbol, active, price_factor, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    );
    const result = stmt.run(
      symbol,
      name,
      assetType,
      currency,
      priceSource,
      priceSymbol,
      active,
      priceFactor,
      createdBy,
    );
    return result.lastInsertRowid;
  }

  static update(id, data, updatedBy) {
    const {
      name,
      asset_type,
      currency,
      price_source,
      price_symbol,
      active,
      price_factor,
    } = data;

    const stmt = db.prepare(
      "UPDATE assets SET name = ?, asset_type = ?, currency = ?, price_source = ?, price_symbol = ?, active = ?, price_factor = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    );
    const result = stmt.run(
      name,
      asset_type,
      currency,
      price_source,
      price_symbol,
      active,
      price_factor,
      updatedBy,
      id,
    );
    return result.changes > 0;
  }

  static delete(id) {
    const stmt = db.prepare("DELETE FROM assets WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  static findById(id) {
    const stmt = db.prepare("SELECT * FROM assets WHERE id = ?");
    return stmt.get(id);
  }

  static findBySymbol(symbol) {
    const stmt = db.prepare("SELECT * FROM assets WHERE symbol = ?");
    return stmt.get(symbol);
  }

  static getAll(options = {}) {
    const { assetType, search, includeInactive = false } = options;
    let query = `
      SELECT 
        a.*,
        p.price,
        p.date as price_date,
        p.created_at as price_created_at,
        p.updated_at as price_updated_at,
        u_created.username as created_by_username,
        u_updated.username as updated_by_username
      FROM assets a
      LEFT JOIN (
        SELECT asset_id, price, date, created_at, updated_at
        FROM price_data
        WHERE (asset_id, date) IN (
          SELECT asset_id, MAX(date)
          FROM price_data
          GROUP BY asset_id
        )
      ) p ON a.id = p.asset_id
      LEFT JOIN users u_created ON a.created_by = u_created.id
      LEFT JOIN users u_updated ON a.updated_by = u_updated.id
      WHERE 1=1
    `;
    const params = [];

    if (!includeInactive) {
      query += " AND a.active = 1";
    }

    if (assetType) {
      query += " AND a.asset_type = ?";
      params.push(assetType);
    }

    if (search) {
      query += " AND (a.symbol LIKE ? OR a.name LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    query += " ORDER BY a.symbol";

    const stmt = db.prepare(query);
    const results = stmt.all(...params);

    // Convert integer price to float
    return results.map((row) => ({
      ...row,
      currentPrice:
        row.price !== null && row.price !== undefined
          ? fromValueScale(row.price, PRICE_SCALE)
          : null,
    }));
  }

  static getLatestPrice(assetId) {
    const stmt = db.prepare(`
      SELECT price, date, created_at, updated_at, asset_id
      FROM price_data 
      WHERE asset_id = ? 
      ORDER BY date DESC 
      LIMIT 1
    `);
    const row = stmt.get(assetId);
    if (!row) return null;

    return {
      ...row,
      price: fromValueScale(row.price, PRICE_SCALE),
    };
  }

  static getDistinctAssetTypes() {
    return db
      .prepare("SELECT DISTINCT asset_type FROM assets WHERE asset_type IS NOT NULL")
      .all()
      .map((r) => r.asset_type.toLowerCase());
  }
}

module.exports = Asset;
