const cron = require("node-cron");
const DailyCron = require("./getDailyData");

cron.schedule("0 */8 * * *", (req, res) => {
  DailyCron.getContractsData(req, res);
});
