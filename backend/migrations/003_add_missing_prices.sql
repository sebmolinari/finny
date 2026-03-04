-- =============================================================
-- Migration 003: add missing price data
-- Generated: 2026-03-04T00:00:56.589Z
-- Prices fetched automatically from Yahoo Finance where possible.
-- Prices are stored as integer (float × 10^6, e.g. $1.23 → 1230000).
-- ⚠️  Lines ending with '-- ?' still need a manual price.
--    Then apply via the migration runner (server startup) or:
--      node scripts/migrationRunner.js
-- =============================================================

-- FCI:BRZ (asset_id=11) — FCI Brasil
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (11, '2026-01-05', 1444965); -- manual: 1.444965
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (11, '2025-11-07', 1447118); -- manual: 1.447118

-- FCI:RFD2 (asset_id=12) — Renta Fija Dólares II
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (12, '2025-12-30', 1278437); -- manual: 1.278437
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (12, '2025-11-07', 1273405); -- manual: 1.273405

-- VWRA (asset_id=30) — Vanguard FTSE All-World
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (30, '2025-12-11', 169339996); -- yahoo(VWRA.L): $169.339996
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (30, '2025-12-05', 168880005); -- yahoo(VWRA.L): $168.880005
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (30, '2025-12-03', 168179993); -- yahoo(VWRA.L): $168.179993
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (30, '2025-11-25', 165100006); -- yahoo(VWRA.L): $165.100006

-- JPEA (asset_id=15) — JPMorgan Equity Premium Income
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (15, '2025-11-26', 6445000); -- yahoo(JPEA.L): $6.445000

-- AGGU (asset_id=2) — iShares Core Total USD Bond Market
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (2, '2025-11-26', 5819000); -- yahoo(AGGU.L): $5.819000

-- EMB (asset_id=9) — iShares J.P. Morgan USD Emerging Markets Bond
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (9, '2025-11-26', 96699997); -- yahoo(EMB): $96.699997
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (9, '2025-11-07', 96019997); -- yahoo(EMB): $96.019997
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (9, '2025-10-07', 95050003); -- yahoo(EMB): $95.050003
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (9, '2025-09-08', 94750000); -- yahoo(EMB): $94.750000
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (9, '2025-09-05', 94760002); -- yahoo(EMB): $94.760002
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (9, '2025-08-11', 93500000); -- yahoo(EMB): $93.500000
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (9, '2025-08-07', 93379997); -- yahoo(EMB): $93.379997
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (9, '2025-07-25', 92720001); -- yahoo(EMB): $92.720001

-- BCBA:SPY (asset_id=4) — SPY Buenos Aires
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (4, '2025-11-14', 34982578); -- manual: $34.982578
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (4, '2025-10-30', 34607509); -- manual: $34.607509
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (4, '2025-09-04', 32363636); -- manual: $32.363636
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (4, '2025-07-30', 31150943); -- manual: $31.150943
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (4, '2025-07-10', 31338583); -- manual: $31.338583

-- S30S5 (asset_id=21) — Letras del Tesoro V30/09/25
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (21, '2025-07-25', 116550); -- manual: 0.116550
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (21, '2025-05-06', 118174); -- manual: 0.118174

-- NVDA (asset_id=19) — NVIDIA Corporation
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (19, '2024-12-30', 137490005); -- yahoo(NVDA): $137.490005
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (19, '2024-10-04', 124919998); -- yahoo(NVDA): $124.919998
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (19, '2024-08-19', 130000000); -- yahoo(NVDA): $130.000000
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (19, '2024-07-01', 124300003); -- yahoo(NVDA): $124.300003
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (19, '2024-02-13', 72127998); -- yahoo(NVDA): $72.127998

-- META (asset_id=16) — Meta Platforms Inc.
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (16, '2024-12-30', 591239990); -- yahoo(META): $591.239990
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (16, '2024-09-27', 567359985); -- yahoo(META): $567.359985
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (16, '2024-08-19', 529280029); -- yahoo(META): $529.280029
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (16, '2024-06-27', 519559998); -- yahoo(META): $519.559998
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (16, '2024-04-19', 481070007); -- yahoo(META): $481.070007
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (16, '2024-03-27', 493859985); -- yahoo(META): $493.859985
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (16, '2024-03-25', 503019989); -- yahoo(META): $503.019989
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (16, '2024-02-13', 460119995); -- yahoo(META): $460.119995

-- BND (asset_id=5) — Vanguard Total Bond Market
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (5, '2024-12-30', 72029999); -- yahoo(BND): $72.029999
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (5, '2024-12-05', 73510002); -- yahoo(BND): $73.510002
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (5, '2024-11-06', 72410004); -- yahoo(BND): $72.410004
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (5, '2024-09-13', 75440002); -- yahoo(BND): $75.440002
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (5, '2024-09-06', 75050003); -- yahoo(BND): $75.050003
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (5, '2024-08-19', 74339996); -- yahoo(BND): $74.339996

-- VOO (asset_id=28) — Vanguard S&P 500
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (28, '2024-12-27', 547080017); -- yahoo(VOO): $547.080017
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (28, '2024-10-04', 526650024); -- yahoo(VOO): $526.650024
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (28, '2024-08-19', 514349976); -- yahoo(VOO): $514.349976
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (28, '2024-07-25', 494779999); -- yahoo(VOO): $494.779999
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (28, '2024-07-01', 501279999); -- yahoo(VOO): $501.279999
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (28, '2024-06-14', 498980011); -- yahoo(VOO): $498.980011
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (28, '2024-05-23', 483440002); -- yahoo(VOO): $483.440002
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (28, '2024-05-13', 478769989); -- yahoo(VOO): $478.769989
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (28, '2024-04-30', 461429993); -- yahoo(VOO): $461.429993
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (28, '2024-04-19', 455100006); -- yahoo(VOO): $455.100006
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (28, '2024-04-10', 472649994); -- yahoo(VOO): $472.649994
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (28, '2024-03-28', 480700012); -- yahoo(VOO): $480.700012
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (28, '2024-03-06', 468619995); -- yahoo(VOO): $468.619995
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (28, '2024-03-06', 468619995); -- yahoo(VOO): $468.619995
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (28, '2024-02-13', 453970001); -- yahoo(VOO): $453.970001

-- GOOGL (asset_id=13) — Alphabet Inc. Class A
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (13, '2024-12-17', 195419998); -- yahoo(GOOGL): $195.419998
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (13, '2024-09-16', 158059998); -- yahoo(GOOGL): $158.059998
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (13, '2024-08-19', 166669998); -- yahoo(GOOGL): $166.669998
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (13, '2024-06-18', 175089996); -- yahoo(GOOGL): $175.089996
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (13, '2024-04-19', 154089996); -- yahoo(GOOGL): $154.089996
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (13, '2024-03-25', 150070007); -- yahoo(GOOGL): $150.070007
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (13, '2024-02-13', 145139999); -- yahoo(GOOGL): $145.139999

-- MSFT (asset_id=17) — Microsoft Corporation
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (17, '2024-12-13', 447269989); -- yahoo(MSFT): $447.269989
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (17, '2024-09-13', 430589996); -- yahoo(MSFT): $430.589996
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (17, '2024-08-19', 421529999); -- yahoo(MSFT): $421.529999
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (17, '2024-06-14', 442570007); -- yahoo(MSFT): $442.570007
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (17, '2024-04-19', 399119995); -- yahoo(MSFT): $399.119995
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (17, '2024-03-25', 422859985); -- yahoo(MSFT): $422.859985
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (17, '2024-03-25', 422859985); -- yahoo(MSFT): $422.859985
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (17, '2024-02-13', 406320007); -- yahoo(MSFT): $406.320007

-- RZABD (asset_id=20) — ON RIZOBACTER S.10 CL.B V28/11/27
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (20, '2024-11-22', 1000000); -- manual: 1.000000

-- AAPL (asset_id=1) — Apple Inc.
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (1, '2024-11-15', 225000000); -- yahoo(AAPL): $225.000000
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (1, '2024-08-19', 225889999); -- yahoo(AAPL): $225.889999
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (1, '2024-08-16', 226050003); -- yahoo(AAPL): $226.050003
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (1, '2024-05-17', 189869995); -- yahoo(AAPL): $189.869995
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (1, '2024-04-19', 165000000); -- yahoo(AAPL): $165.000000
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (1, '2024-03-25', 170850006); -- yahoo(AAPL): $170.850006
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (1, '2024-02-13', 185039993); -- yahoo(AAPL): $185.039993

-- BRK.B (asset_id=7) — Berkshire Hathaway Inc. Class B
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (7, '2024-08-19', 448769989); -- yahoo(BRK-B): $448.769989
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (7, '2024-04-19', 405079987); -- yahoo(BRK-B): $405.079987
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (7, '2024-03-25', 409920013); -- yahoo(BRK-B): $409.920013
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (7, '2024-02-13', 394799988); -- yahoo(BRK-B): $394.799988

-- AMZN (asset_id=3) — Amazon.com Inc.
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (3, '2024-08-19', 178220001); -- yahoo(AMZN): $178.220001
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (3, '2024-04-30', 175000000); -- yahoo(AMZN): $175.000000
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (3, '2024-04-19', 174630005); -- yahoo(AMZN): $174.630005
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (3, '2024-03-25', 179710007); -- yahoo(AMZN): $179.710007
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (3, '2024-02-13', 168639999); -- yahoo(AMZN): $168.639999

-- ETH (asset_id=10) — Ethereum
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (10, '2023-12-03', 2215000000); -- manual: $2215.000000
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (10, '2023-11-01', 1846220000); -- manual: $1846.220000

-- BTC (asset_id=8) — Bitcoin
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (8, '2023-11-01', 35422890000); -- manual: $35422.890000

-- NEXO (asset_id=18) — Nexo Token
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (18, '2022-03-17', 2220000); -- manual: $2.22

-- JPM (asset_id=14) — JPMorgan Chase & Co.
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (14, '2016-10-31', 69260002); -- yahoo(JPM): $69.260002
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (14, '2016-08-01', 63799999); -- yahoo(JPM): $63.799999
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (14, '2016-05-02', 63790001); -- yahoo(JPM): $63.790001
INSERT OR IGNORE INTO price_data (asset_id, date, price) VALUES (14, '2016-01-19', 57009998); -- yahoo(JPM): $57.009998

-- End of missing prices migration