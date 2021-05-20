const express = require("express");
const SyncMiddleware = require("./syncMiddleware");
const DailyCron = require("../cron/getDailyData");
const SyncCtr = require("./syncController");

const syncRoute = express.Router();
// get all contract balances
const getDataFromContract = [
  SyncMiddleware.checkMiddleware,
  SyncCtr.getDataFromContract,
];
syncRoute.get("/list", getDataFromContract);

// get seedify contract details

const seddifyContract = [
  SyncMiddleware.checkMiddleware,
  SyncCtr.getSeddifyContract,
];
syncRoute.get("/seedify", seddifyContract);

// get liquidity contract details
const liquidyContract = [
  SyncMiddleware.checkMiddleware,
  SyncCtr.getLiquidityContract,
];
syncRoute.get("/liquidity", liquidyContract);

// get farming data

const farmingContract = [
  SyncMiddleware.checkMiddleware,
  SyncCtr.getFarmingContract,
];
syncRoute.get("/farming", farmingContract);

// get bakery token details
const bakerytoken = [SyncMiddleware.checkMiddleware, SyncCtr.getBakeryDetails];
syncRoute.get("/bakery", bakerytoken);

// get bakery token details
const toshDishToken = [
  SyncMiddleware.checkMiddleware,
  SyncCtr.getToshDishDetails,
];
syncRoute.get("/tosdis", toshDishToken);

// get slp balance
const slpToken = [SyncMiddleware.checkMiddleware, SyncCtr.getSlpBalance];
syncRoute.get("/slp", slpToken);

// get latest block No
const getLatestBlockNo = [SyncCtr.getLastestBlockSynched];
syncRoute.get("/getLatestBlock", getLatestBlockNo);

// fire daily sron
const fireDailyCron = [DailyCron.getContractsData];
syncRoute.get("/fireDaily", fireDailyCron);
module.exports = syncRoute;
