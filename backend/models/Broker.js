const db = require("../config/database");
const {
  fromValueScale,
  QUANTITY_SCALE,
  PRICE_SCALE,
} = require("../utils/valueScale");

class Broker {
  static create(userId, name, description, website, active, createdBy) {
    const stmt = db.prepare(`
      INSERT INTO brokers (user_id, name, description, website, active, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      userId,
      name,
      description,
      website,
      active,
      createdBy,
    );
    return result.lastInsertRowid;
  }

  static update(id, userId, data, updatedBy) {
    const { name, description, website, active } = data;
    const stmt = db.prepare(`
      UPDATE brokers
      SET name = ?,
          description = ?,
          website = ?,
          active = ?,
          updated_by = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);

    stmt.run(name, description, website, active, updatedBy, id, userId);
  }

  static delete(id, userId) {
    const stmt = db.prepare(`
      DELETE FROM brokers WHERE id = ? AND user_id = ?
    `);
    const result = stmt.run(id, userId);
    return result.changes > 0;
  }
  static findById(id, userId) {
    const stmt = db.prepare(`
      SELECT * FROM brokers WHERE id = ? AND user_id = ?
    `);
    return stmt.get(id, userId);
  }

  static findByUser(userId, options = {}) {
    const { includeInactive = false } = options;
    let query = `
      SELECT 
        b.*,
        u_created.username AS created_by_username,
        u_updated.username AS updated_by_username
      FROM brokers b
      LEFT JOIN users u_created ON b.created_by = u_created.id
      LEFT JOIN users u_updated ON b.updated_by = u_updated.id
      WHERE b.user_id = ?
    `;

    if (!includeInactive) {
      query += ` AND b.active = 1`;
    }

    query += ` ORDER BY b.name ASC`;

    const stmt = db.prepare(query);
    return stmt.all(userId);
  }

  static getBrokerHoldings(userId, options = {}) {
    const { includeInactive = false } = options;

    // Get all brokers
    let brokersQuery = `SELECT b.id, b.name FROM brokers b WHERE b.user_id = ?`;
    if (!includeInactive) {
      brokersQuery += ` AND b.active = 1`;
    }
    brokersQuery += ` ORDER BY b.name`;

    const brokersStmt = db.prepare(brokersQuery);
    const brokers = brokersStmt.all(userId);

    // Get all transactions with latest prices (buy, sell, and transfers)
    const transactionsQuery = `
      SELECT
        t.broker_id,
        t.destination_broker_id,
        t.transaction_type,
        t.quantity,
        p.price
      FROM transactions t
      LEFT JOIN assets a ON t.asset_id = a.id
      LEFT JOIN price_data p ON p.asset_id = a.id
        AND p.date = (
          SELECT MAX(date)
          FROM price_data
          WHERE asset_id = a.id
        )
      WHERE t.user_id = ? AND t.transaction_type IN ('buy', 'sell', 'transfer')
    `;

    const transactionsStmt = db.prepare(transactionsQuery);
    const transactions = transactionsStmt.all(userId);

    // Calculate current value per broker
    const brokerValues = {};
    brokers.forEach((broker) => {
      brokerValues[broker.id] = { name: broker.name, current_value: 0 };
    });

    transactions.forEach((tx) => {
      if (!tx.price || !tx.quantity) return;

      const quantity = fromValueScale(tx.quantity, QUANTITY_SCALE);
      const price = fromValueScale(tx.price, PRICE_SCALE);

      if (tx.transaction_type === "buy" || tx.transaction_type === "sell") {
        if (!tx.broker_id || !brokerValues[tx.broker_id]) return;
        const signedQty = tx.transaction_type === "buy" ? quantity : -quantity;
        brokerValues[tx.broker_id].current_value += signedQty * price;
      } else if (tx.transaction_type === "transfer") {
        // Outgoing: reduce source broker's exposure
        if (tx.broker_id && brokerValues[tx.broker_id]) {
          brokerValues[tx.broker_id].current_value -= quantity * price;
        }
        // Incoming: increase destination broker's exposure
        if (tx.destination_broker_id && brokerValues[tx.destination_broker_id]) {
          brokerValues[tx.destination_broker_id].current_value += quantity * price;
        }
      }
    });

    return Object.values(brokerValues);
  }
}

module.exports = Broker;
