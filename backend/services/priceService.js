const axios = require("axios");
const PriceData = require("../models/PriceData");
const UserSettings = require("../models/UserSettings");
const Asset = require("../models/Asset");
const logger = require("../utils/logger");
const { getTodayInTimezone } = require("../utils/dateUtils");

class PriceService {
  /**
   * Fetch current price for a equity from Yahoo Finance
   */
  static async fetchYahooPrice(symbol) {
    try {
      // Using Yahoo Finance API (no auth required)
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
      const response = await axios.get(url, {
        params: {
          interval: "1d",
          range: "1d",
        },
        timeout: 5000,
      });

      const result = response.data?.chart?.result?.[0];
      if (!result) {
        throw new Error(`No data returned for ${symbol}`);
      }

      const meta = result.meta;
      const price = meta.regularMarketPrice || meta.previousClose;

      if (!price) {
        throw new Error(`No price available for ${symbol}`);
      }

      return {
        symbol,
        price: parseFloat(price.toFixed(6)),
        source: "yahoo",
      };
    } catch (error) {
      logger.error(
        `Failed to fetch price from Yahoo for ${symbol}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Fetch current price for crypto from CoinGecko
   */
  static async fetchCoinGeckoPrice(symbol) {
    try {
      // Map common symbols to CoinGecko IDs
      const cryptoMap = {
        BTC: "bitcoin",
        ETH: "ethereum",
        USDT: "tether",
        BNB: "binancecoin",
        SOL: "solana",
        XRP: "ripple",
        ADA: "cardano",
        DOGE: "dogecoin",
        MATIC: "matic-network",
        DOT: "polkadot",
        NEXO: "nexo",
      };

      const coinId = cryptoMap[symbol.toUpperCase()];
      if (!coinId) {
        logger.warn(`Crypto symbol ${symbol} not mapped to CoinGecko ID`);
        return null;
      }

      const url = `https://api.coingecko.com/api/v3/simple/price`;
      const response = await axios.get(url, {
        params: {
          ids: coinId,
          vs_currencies: "usd",
        },
        timeout: 5000,
      });

      const price = response.data?.[coinId]?.usd;
      if (!price) {
        throw new Error(`No price available for ${symbol}`);
      }

      return {
        symbol,
        price: parseFloat(price.toFixed(6)),
        source: "coingecko",
      };
    } catch (error) {
      logger.error(
        `Failed to fetch price from CoinGecko for ${symbol}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Fetch current price from DolarAPI
   * Fetches Argentine peso exchange rates from dolarapi.com
   */
  static async fetchDollarApiPrice(priceSymbol) {
    try {
      const url = `https://dolarapi.com/v1/dolares/${priceSymbol}`;
      const response = await axios.get(url, {
        timeout: 5000,
      });

      const data = response.data;
      if (!data || typeof data.venta !== "number") {
        throw new Error(`No valid 'venta' price available for ${priceSymbol}`);
      }

      return {
        symbol: priceSymbol,
        price: parseFloat(data.venta.toFixed(6)),
        source: "dolarapi",
      };
    } catch (error) {
      logger.error(
        `Failed to fetch price from DolarAPI for ${priceSymbol}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Fetch current price from Supabase (REST)
   * Expects env vars: SUPABASE_URL, SUPABASE_API_KEY
   * Uses the `latest_with_yesterday` view: returns [{ price, yesterday_price }]
   */
  static async fetchSupabasePrice(ticker, priceFactor) {
    try {
      const baseUrl = process.env.SUPABASE_URL;
      const apiKey = process.env.SUPABASE_API_KEY;

      if (!baseUrl || !apiKey) {
        throw new Error(
          "Missing SUPABASE_URL or SUPABASE_API_KEY env configuration",
        );
      }

      const url = `${baseUrl}/rest/v1/latest_with_yesterday`;
      const response = await axios.get(url, {
        params: {
          select: "price,yesterday_price",
          ticker: `eq.${ticker}`,
        },
        headers: {
          Accept: "application/json",
          apikey: apiKey,
        },
        timeout: 5000,
      });

      if (response.status !== 200) {
        throw new Error(`Supabase request failed: ${response.status}`);
      }

      const data = Array.isArray(response.data) ? response.data[0] : null;
      if (!data) {
        throw new Error("Supabase returned no data for ticker");
      }

      let price =
        typeof data.price === "number" && !isNaN(data.price)
          ? data.price
          : typeof data.yesterday_price === "number" &&
              !isNaN(data.yesterday_price)
            ? data.yesterday_price
            : null;

      if (price === null) {
        throw new Error("No price fields available from Supabase response");
      }

      // Apply price_factor if provided and > 0
      if (priceFactor && priceFactor > 0) {
        price = price / priceFactor;
      }

      return {
        symbol: ticker,
        price: parseFloat(Number(price).toFixed(6)),
        source: "supabase",
      };
    } catch (error) {
      logger.error(
        `Failed to fetch price from Supabase for ${ticker}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Fetch the closing price for a symbol on a specific historical date from Yahoo Finance.
   * Returns the raw float price on success, or null if unavailable.
   */
  static async fetchHistoricalPrice(priceSymbol, dateStr) {
    try {
      const date = new Date(dateStr + "T00:00:00Z");
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      const period1 = Math.floor(date.getTime() / 1000);
      const period2 = Math.floor(nextDate.getTime() / 1000);

      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${priceSymbol}`;
      const response = await axios.get(url, {
        params: { interval: "1d", period1, period2 },
        timeout: 8000,
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      const result = response.data?.chart?.result?.[0];
      if (!result) return null;

      // Prefer the closes array; fall back to meta prices
      const closes = result.indicators?.quote?.[0]?.close;
      if (closes && closes.length > 0) {
        const close = closes.find((c) => c != null);
        if (close != null) return close;
      }

      const fallback =
        result.meta?.regularMarketPrice ?? result.meta?.previousClose;
      return fallback ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch a series of daily closing prices for a Yahoo Finance symbol over a date range.
   * Returns an array of { date: "YYYY-MM-DD", price: float } sorted ascending.
   */
  static async fetchHistoricalPriceSeries(symbol, startDate, endDate) {
    try {
      const period1 = Math.floor(new Date(startDate + "T00:00:00Z").getTime() / 1000);
      const period2 = Math.floor(new Date(endDate + "T23:59:59Z").getTime() / 1000);

      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`;
      logger.info(`[Yahoo] Fetching price series for ${symbol} from ${startDate} to ${endDate}`);

      const response = await axios.get(url, {
        params: { interval: "1d", period1, period2 },
        timeout: 10000,
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      const result = response.data?.chart?.result?.[0];
      if (!result) {
        logger.warn(`[Yahoo] No chart result returned for ${symbol}`);
        return null;
      }

      const timestamps = result.timestamp || [];
      const closes = result.indicators?.quote?.[0]?.close || [];

      const series = [];
      for (let i = 0; i < timestamps.length; i++) {
        const price = closes[i];
        if (price == null) continue;
        const date = new Date(timestamps[i] * 1000).toISOString().split("T")[0];
        series.push({ date, price: parseFloat(price.toFixed(6)) });
      }

      if (series.length === 0) {
        logger.warn(`[Yahoo] Price series for ${symbol} returned 0 usable data points`);
        return null;
      }

      logger.info(`[Yahoo] Got ${series.length} data points for ${symbol} (${series[0].date} → ${series[series.length - 1].date})`);
      return series;
    } catch (error) {
      logger.error(`[Yahoo] Failed to fetch price series for ${symbol}: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetch price from the specified source
   */
  static async fetchPriceBySource(priceSymbol, priceSource, priceFactor) {
    switch (priceSource) {
      case "yahoo":
        return await this.fetchYahooPrice(priceSymbol);
      case "coingecko":
        return await this.fetchCoinGeckoPrice(priceSymbol);
      case "supabase":
        return await this.fetchSupabasePrice(priceSymbol, priceFactor);
      case "dolarapi":
        return await this.fetchDollarApiPrice(priceSymbol);
      default:
        logger.error(`Unknown price source: ${priceSource}`);
        return null;
    }
  }

  /**
   * Fetch price for an asset based on its configured source
   */
  static async fetchAssetPrice(asset) {
    // Use the asset's configured price source and symbol
    const priceSymbol = asset.price_symbol || asset.symbol;
    const priceSource = asset.price_source;
    const priceFactor = asset.price_factor;

    if (!priceSource) {
      throw new Error(`Asset ${asset.symbol} has no price source configured`);
    }

    return await this.fetchPriceBySource(priceSymbol, priceSource, priceFactor);
  }

  /**
   * Refresh prices for all assets
   * @param {number} userId - ID of the user performing the refresh
   */
  static async refreshAllPrices(userId) {
    const results = {
      total: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      errors: [],
    };

    try {
      const assets = Asset.getAll({ includeInactive: false });
      let timezone = null;

      if (userId) {
        const userSettings = await UserSettings.findByUserId(userId);
        timezone = userSettings.timezone;
      }

      results.total = assets.length;
      const today = getTodayInTimezone(timezone);

      for (const asset of assets) {
        try {
          // Skip manual price sources
          if (asset.price_source === "manual") {
            results.skipped++;
            logger.info(
              `Skipping ${asset.symbol} (${asset.name}) - manual price source`,
            );
            continue;
          }

          const priceData = await this.fetchAssetPrice(asset);
          if (!priceData) {
            results.failed++;
            results.errors.push(
              `Failed to fetch price for ${asset.symbol} (${asset.name})`,
            );
            continue;
          }

          // Check if price already exists for today
          const existing = PriceData.findByAssetAndDate(asset.id, today);

          if (existing) {
            // Update existing price
            PriceData.update(
              existing.id,
              priceData.price,
              priceData.source,
              userId,
            );
            logger.info(
              `Updated existing price for ${asset.symbol}: ${priceData.price}`,
            );
          } else {
            // Create new price entry
            PriceData.create(
              asset.id,
              today,
              priceData.price,
              priceData.source,
              userId,
            );
            logger.info(
              `Created new price for ${asset.symbol}: ${priceData.price}`,
            );
          }

          results.updated++;

          // Add small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (error) {
          results.failed++;
          results.errors.push(
            `Error updating ${asset.symbol}: ${error.message}`,
          );
          logger.error(`Error updating ${asset.symbol}: ${error.message}`);
        }
      }

      logger.info(
        `Price refresh completed: ${results.updated} updated, ${results.skipped} skipped, ${results.failed} failed out of ${results.total} total`,
      );
      return results;
    } catch (error) {
      logger.error(`Price refresh failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Refresh price for a single asset
   * @param {number} assetId - Asset ID to refresh price for
   * @param {number} userId - ID of the user performing the refresh
   */
  static async refreshAssetPrice(assetId, userId) {
    try {
      const asset = Asset.findById(assetId);
      const userSettings = await UserSettings.findByUserId(userId);
      const timezone = userSettings.timezone;

      if (!asset) {
        throw new Error("Asset not found");
      }

      // If price source is manual, just skip (don't fail)
      if (asset.price_source === "manual") {
        return {
          success: true,
          message: `Asset ${asset.symbol} has manual price source; price refresh skipped`,
          skipped: true,
        };
      }

      if (asset.active === 0) {
        throw new Error("Asset is inactive; price refresh skipped");
      }

      const today = getTodayInTimezone(timezone);

      const priceData = await this.fetchAssetPrice(asset);
      if (!priceData) {
        throw new Error(`Failed to fetch price for ${asset.symbol}`);
      }

      // Check if price already exists for today
      const existing = PriceData.findByAssetAndDate(asset.id, today);

      let savedPrice;
      if (existing) {
        // Update existing price
        PriceData.update(
          existing.id,
          priceData.price,
          priceData.source,
          userId,
        );
        savedPrice = PriceData.findById(existing.id);
        logger.info(
          `Updated existing price for ${asset.symbol}: ${priceData.price}`,
        );
      } else {
        // Create new price entry
        const priceId = PriceData.create(
          asset.id,
          today,
          priceData.price,
          priceData.source,
          userId,
        );
        savedPrice = PriceData.findById(priceId);
        logger.info(
          `Created new price for ${asset.symbol}: ${priceData.price}`,
        );
      }

      return {
        success: true,
        message: `Price updated successfully`,
        price: savedPrice,
      };
    } catch (error) {
      logger.error(
        `Failed to refresh price for asset ${assetId}: ${error.message}`,
      );
      throw error;
    }
  }
}

module.exports = PriceService;
