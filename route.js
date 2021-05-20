const express = require("express");
// const bodyParser = require('body-parser');
const syncRoute = require("./modules/sync/syncRoute");

// Routes Path

const app = express.Router();

// Routes
app.use("/api/v1/sync", syncRoute);
app.all("/*", (req, res) =>
  res.status(404).json({ message: "Invalid Request" })
);

module.exports = app;
