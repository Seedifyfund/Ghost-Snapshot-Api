const syncMiddleware = {};

syncMiddleware.checkMiddleware = async (req, res, next) => {
  if (!req.query.endBlock) {
    return res.status(400).json({
      status: false,
      message: "End block is required",
    });
  } else {
    return next();
  }
};

module.exports = syncMiddleware;
