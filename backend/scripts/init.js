require("dotenv").config();
const axios = require("axios");
const readline = require("readline");
const fs = require("fs");
const path = require("path");

// Get base URL from environment or use default
const API_BASE_URL = "http://localhost:5000/api/v1";

// Setup readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Promisify readline question
const question = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

// Load data from JSON file
function loadDataFile() {
  const dataFilePath = path.join(__dirname, "init-data.json");

  if (!fs.existsSync(dataFilePath)) {
    console.error(`❌ Data file not found: ${dataFilePath}`);
    console.log(
      "\nPlease create init-data.json based on init-data.example.json"
    );
    process.exit(1);
  }

  try {
    const fileContent = fs.readFileSync(dataFilePath, "utf8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`❌ Error reading or parsing data file: ${error.message}`);
    process.exit(1);
  }
}

// Initialize brokers
async function initBrokers(token, brokers) {
  console.log("\nCreating brokers...");

  const brokerIds = {};
  for (const broker of brokers) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/brokers`,
        {
          name: broker.name,
          description: broker.description,
          website: broker.website,
          active: broker.active ?? 1,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      brokerIds[broker.name] = response.data.id;
    } catch (error) {
      console.error(
        `Error creating broker ${broker.name}:`,
        error.response?.data?.message || error.message
      );
    }
  }
  console.log(`✓ ${Object.keys(brokerIds).length} brokers created`);

  return brokerIds;
}

async function initAssets(token, assets) {
  console.log("\nCreating transaction assets...");

  const assetIds = {};
  for (const asset of assets) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/assets`,
        {
          symbol: asset.symbol,
          name: asset.name,
          asset_type: asset.type,
          currency: asset.currency,
          price_source: asset.price_source,
          price_symbol: asset.price_symbol,
          active: asset.active ?? 1,
          price_factor: asset.price_factor,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      assetIds[asset.symbol] = response.data.id;
    } catch (error) {
      console.error(
        `Error creating asset ${asset.symbol}:`,
        error.response?.data?.message || error.message
      );
    }
  }
  console.log(`✓ ${Object.keys(assetIds).length} assets created`);

  return assetIds;
}

async function initPriceData(assetIds, token, priceHistory) {
  console.log("\nCreating price data...");
  // Fix: Define bulkPriceData before using it
  const bulkPriceData = [];

  for (const symbol in priceHistory) {
    const assetId = assetIds[symbol];
    if (!assetId) {
      console.log(`⚠ Warning: Asset ${symbol} not found, skipping price data`);
      continue;
    }

    priceHistory[symbol].forEach((priceEntry) => {
      bulkPriceData.push({
        asset_id: assetId,
        date: priceEntry.date,
        price: priceEntry.price,
        source: "manual",
      });
    });
  }

  // Insert all price data using API
  let successCount = 0;
  for (const symbol in priceHistory) {
    const assetId = assetIds[symbol];
    if (!assetId) {
      console.log(`⚠ Warning: Asset ${symbol} not found, skipping price data`);
      continue;
    }

    for (const priceEntry of priceHistory[symbol]) {
      try {
        await axios.post(
          `${API_BASE_URL}/assets/${assetId}/prices`,
          {
            date: priceEntry.date,
            price: priceEntry.price,
            source: "manual",
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        successCount++;
      } catch (error) {
        console.error(
          `Error creating price for ${symbol} on ${priceEntry.date}:`,
          error.response?.data?.message || error.message
        );
      }
    }
  }

  if (successCount > 0) {
    console.log(
      `✓ ${successCount} price data points created for ${
        Object.keys(priceHistory).length
      } assets`
    );
  } else {
    console.log("⚠ No price data created");
  }
}

// Delete functions
async function deleteTransactions(token) {
  console.log("Deleting transactions...");
  try {
    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
      const txResponse = await axios.get(
        `${API_BASE_URL}/transactions?limit=100`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const transactions = txResponse.data.data || [];

      if (transactions.length === 0) {
        hasMore = false;
        break;
      }

      for (const tx of transactions) {
        try {
          await axios.delete(`${API_BASE_URL}/transactions/${tx.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          totalDeleted++;
        } catch (err) {
          console.error(`Error deleting transaction ${tx.id}:`, err.message);
        }
      }
    }
    console.log(`✓ Deleted ${totalDeleted} transactions\n`);
  } catch (error) {
    console.log("⚠ Could not delete transactions:", error.message, "\n");
  }
}

async function deletePriceData(token) {
  console.log("Deleting price data...");
  try {
    const assetsResponse = await axios.get(
      `${API_BASE_URL}/assets?includeInactive=true`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const assets = assetsResponse.data || [];
    let priceCount = 0;
    for (const asset of assets) {
      try {
        const pricesResponse = await axios.get(
          `${API_BASE_URL}/assets/${asset.id}/prices`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const prices = pricesResponse.data || [];
        for (const price of prices) {
          try {
            await axios.delete(
              `${API_BASE_URL}/assets/${asset.id}/prices/${price.id}`,
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            priceCount++;
          } catch (err) {
            console.error(`Error deleting price ${price.id}:`, err.message);
          }
        }
      } catch (err) {
        console.error(
          `Error fetching prices for asset ${asset.id}:`,
          err.message
        );
      }
    }
    console.log(`✓ Deleted ${priceCount} price data points\n`);
  } catch (error) {
    console.log("⚠ Could not delete price data:", error.message, "\n");
  }
}

async function deleteAssets(token) {
  console.log("Deleting assets...");
  try {
    const assetsResponse = await axios.get(
      `${API_BASE_URL}/assets?includeInactive=true`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const assets = assetsResponse.data || [];
    for (const asset of assets) {
      try {
        await axios.delete(`${API_BASE_URL}/assets/${asset.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error(`Error deleting asset ${asset.id}:`, err.message);
      }
    }
    console.log(`✓ Deleted ${assets.length} assets\n`);
  } catch (error) {
    console.log("⚠ Could not delete assets:", error.message, "\n");
  }
}

async function deleteBrokers(token) {
  console.log("Deleting brokers...");
  try {
    const brokersResponse = await axios.get(
      `${API_BASE_URL}/brokers?includeInactive=true`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const brokers = brokersResponse.data || [];
    for (const broker of brokers) {
      try {
        await axios.delete(`${API_BASE_URL}/brokers/${broker.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error(`Error deleting broker ${broker.id}:`, err.message);
      }
    }
    console.log(`✓ Deleted ${brokers.length} brokers\n`);
  } catch (error) {
    console.log("⚠ Could not delete brokers:", error.message, "\n");
  }
}

async function deleteAllocationTargets(token) {
  console.log("Deleting allocation targets...");
  try {
    const targetsResponse = await axios.get(
      `${API_BASE_URL}/allocation/targets`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const targets = targetsResponse.data.targets || [];
    for (const target of targets) {
      try {
        await axios.delete(`${API_BASE_URL}/allocation/targets/${target.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error(
          `Error deleting allocation target ${target.id}:`,
          err.message
        );
      }
    }
    console.log(`✓ Deleted ${targets.length} allocation targets\n`);
  } catch (error) {
    console.log("⚠ Could not delete allocation targets:", error.message, "\n");
  }
}

async function cleanupAuditLogs(token) {
  console.log("Cleaning up audit logs...");
  try {
    const cleanupResponse = await axios.delete(
      `${API_BASE_URL}/audit/cleanup?days=0`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log(`✓ ${cleanupResponse.data.message}\n`);
  } catch (error) {
    console.log("⚠ Could not cleanup audit logs:", error.message, "\n");
  }
}

// Delete all data
async function deleteAllData(token) {
  console.log("\nClearing existing data...");
  console.log("This may take a moment...\n");

  console.log("1/6");
  await deleteTransactions(token);

  console.log("2/6");
  await deletePriceData(token);

  console.log("3/6");
  await deleteAssets(token);

  console.log("4/6");
  await deleteBrokers(token);

  console.log("5/6");
  await deleteAllocationTargets(token);

  console.log("6/6");
  await cleanupAuditLogs(token);

  console.log("✓ All deletions completed. Starting data creation...\n");
}

// Main initialization function
async function main() {
  console.log("Initializing database via API...\n");
  console.log("⚠️  Make sure the backend server is running on", API_BASE_URL);
  console.log("");

  try {
    // Get login credentials
    const username = await question("Enter username: ");
    const password = await question("Enter password: ");

    // Login to get token
    console.log("\nAuthenticating...");
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username,
      password,
    });

    const token = loginResponse.data.token;
    console.log("✓ Authentication successful\n");

    // Ask for confirmation before clearing data
    const confirm = await question(
      "⚠️  This will DELETE all data.\nAre you sure you want to continue? (yes/no): "
    );

    if (confirm.toLowerCase() !== "yes") {
      console.log("\nOperation cancelled.");
      rl.close();
      process.exit(0);
    }

    // Load data from file
    console.log("Loading data from init-data.json...");
    const data = loadDataFile();
    console.log(
      `✓ Loaded ${data.brokers.length} brokers, ${data.assets.length} assets, ${
        Object.keys(data.priceHistory).length
      } price histories\n`
    );

    // Clear existing data via API (call the delete function)
    await deleteAllData(token);

    // Initialize data via API
    const brokerIds = await initBrokers(token, data.brokers);
    const assetIds = await initAssets(token, data.assets);
    await initPriceData(assetIds, token, data.priceHistory);

    console.log("\n✓ Database initialized successfully with sample data!");
  } catch (error) {
    if (error.response) {
      console.error(
        "❌ API Error:",
        error.response.status,
        error.response.data?.message || error.message
      );
    } else if (error.code === "ECONNREFUSED") {
      console.error(
        "❌ Connection refused. Make sure the backend server is running."
      );
    } else {
      console.error("❌ Error initializing database:", error.message);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
