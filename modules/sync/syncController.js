const axios = require("axios");
const get = require("../../");
const syncHelper = require("./syncHelper");
const Utils = require("../../helper/utils");
const { resolve, reject } = require("bluebird");
const { getBakeryFarmBalance, getToshDishDetails } = require("./syncHelper");
const blockNo = require("../../result/block.json");
const syncController = {};

// get all contract details
syncController.getDataFromContract = async (req, res) => {
  try {
    const startBlock = +req.query.startBlock;
    const endBlock = +req.query.endBlock;
    const emailId = req.query.email;

    let finalData = [];

    res.status(200).send({
      message: "All Request received ",
      status: true,
    });

    const getSeedifyBalance = await syncHelper.getSeedifyBalance(
      startBlock,
      endBlock
    );

    const getLiquidityBalance = await syncHelper.getLiquidityBalance(
      startBlock,
      endBlock
    );

    const getFarmingBalance = await syncHelper.getFarmingBalance(
      startBlock,
      endBlock
    );

    const getBakeryBalance = await syncHelper.getBakeryFarmBalance(
      startBlock,
      endBlock
    );

    const getToshBalance = await syncHelper.getToshFarmBalance(
      startBlock,
      endBlock
    );

    const getSlpBalance = await syncHelper.slpBalance(startBlock, endBlock);

    if (getSeedifyBalance.length) {
      finalData = getSeedifyBalance;
    }

    if (getLiquidityBalance.length) {
      finalData = await syncController.checkData(
        finalData,
        getLiquidityBalance,
        "liquidity"
      );
    }

    if (getFarmingBalance.length) {
      finalData = await syncController.checkData(
        finalData,
        getFarmingBalance,
        "farming"
      );
    }

    if (getBakeryBalance.length) {
      finalData = await syncController.checkData(
        finalData,
        getBakeryBalance,
        "bakery"
      );
    }

    if (getToshBalance.length) {
      finalData = await syncController.checkData(
        finalData,
        getToshBalance,
        "tosh"
      );
    }

    if (getSlpBalance.length) {
      finalData = await syncController.checkData(
        finalData,
        getSlpBalance,
        "slp"
      );
    }

    Utils.sendEmail(
      finalData,
      `Summation of fund balance from block ${startBlock} to ${endBlock}`,
      emailId
    );

    // return res.status(200).send({
    //   message: "List ",
    //   status: true,
    //   data: finalData,
    // });
  } catch (err) {
    console.log("err", err);
    return res.status(500).send({
      message: "Something went wrong ",
      status: false,
      error: `${err.message ? err.message : null}`,
    });
  }
};
// combine the array
syncController.checkData = (data, checkData, type) => {
  return new Promise(async (resolve, reject) => {
    if (!data.length && checkData.length) {
      resolve(checkData);
    } else if (data.length && !checkData.length) {
      resolve(data);
    } else {
      const result = data;
      const itreateResult = (i) => {
        if (i < checkData.length) {
          const checkAddressAvalaible = result.findIndex(
            (x) =>
              x.address.toLowerCase().trim() ===
              checkData[i].address.toLowerCase().trim()
          );
          if (checkAddressAvalaible >= 0) {
            const totalBalance =
              +result[checkAddressAvalaible].balance + +checkData[i].balance;
            result[checkAddressAvalaible].balance = totalBalance;
            result[checkAddressAvalaible].tier =
              syncHelper.getUserTier(totalBalance);
            itreateResult(i + 1);
          } else {
            result.push(checkData[i]);
            itreateResult(i + 1);
          }
        } else {
          resolve(result);
        }
      };
      itreateResult(0);
    }
  });
};

// get seedify token balance
syncController.getSeddifyContract = async (req, res) => {
  try {
    const address = "0x477bc8d23c634c154061869478bce96be6045d12";
    const startBlock = 5172421;
    const endBlock = +req.query.endBlock;
    const emailId = req.query.email;
    const finalData = await syncHelper.getDataFromBScScanForSeedify(
      startBlock,
      endBlock,
      address
    );

    let seedifyDataFromBSc = [];

    res.status(200).send({
      message: "seedify contract details",
      status: true,
    });

    seedifyDataFromBSc = await syncHelper.getSeddifyContractDetails(
      finalData,
      address,
      endBlock,
      "seedify"
    );

    Utils.sendEmail(
      seedifyDataFromBSc,
      `Seedify fund balance from block ${startBlock} to ${endBlock}`,
      emailId
    );
  } catch (err) {
    console.log("err is:", err);
    // return res.status(500).send({
    //   message: "Something went wrong",
    //   err: `${err.message}?${err.message}:${null}`,
    //   status: false,
    // });
  }
};

// get liquidity balance
syncController.getLiquidityContract = async (req, res) => {
  try {
    const address = "0x74fa517715c4ec65ef01d55ad5335f90dce7cc87";
    const startBlock = 6801618;
    const endBlock = +req.query.endBlock;
    const emailId = req.query.email;
    const getTotalSupplyUrl = `https://api.bscscan.com/api?module=stats&action=tokensupply&contractaddress=${address}&apikey=${process.env.BSC_API_KEY}`;
    const tokenBalanceUrl = `https://api.bscscan.com/api?module=account&action=tokenbalance&contractaddress=0x477bc8d23c634c154061869478bce96be6045d12&address=${address}&tag=latest&apikey=${process.env.BSC_API_KEY}`;
    const url = `${process.env.BSC_API_URL}?module=account&action=txlist&address=${address}&startblock=${startBlock}&endblock=${endBlock}&sort=desc&apikey=${process.env.BSC_API_KEY}`;

    let seedifyDataFromBSc = [];

    const getTotalSupply = await axios.get(getTotalSupplyUrl);
    const getTokenBalance = await axios.get(tokenBalanceUrl);

    const getDataFromBSc = await syncHelper.getDataFromBScScanForLiquidiy(
      startBlock,
      endBlock,
      address
    );

    res.status(200).send({
      message: "liquidity contract details",
      status: true,
    });

    seedifyDataFromBSc = await syncHelper.getSeddifyContractDetails(
      getDataFromBSc,
      address,
      endBlock,
      "liquidity"
    );

    if (seedifyDataFromBSc.length) {
      const tokenSupply = +getTotalSupply.data.result / Math.pow(10, 18);
      const tokenBalance = +getTokenBalance.data.result / Math.pow(10, 18);

      const itreateSeedifyBalance = (i) => {
        if (i < seedifyDataFromBSc.length) {
          const transactionCount = seedifyDataFromBSc[i].balance / tokenSupply;
          const total = transactionCount * tokenBalance;
          // seedifyDataFromBSc[i].liquidity = seedifyDataFromBSc[i].balance;
          seedifyDataFromBSc[i].balance = total;
          seedifyDataFromBSc[i].tier = syncHelper.getUserTier(total);
          itreateSeedifyBalance(i + 1);
        } else {
          Utils.sendEmail(
            seedifyDataFromBSc,
            `Liquidity fund balance from block ${startBlock} to ${endBlock}`,
            emailId
          );

          // return res.status(200).send({
          //   data: seedifyDataFromBSc,
          //   message: "liquidity contract details",
          //   status: true,
          // });
        }
      };
      itreateSeedifyBalance(0);
    } else {
      Utils.sendEmail(
        seedifyDataFromBSc,
        `Liquidity fund balance from block ${startBlock} to ${endBlock}`,
        emailId
      );
      // return res.status(200).send({
      //   data: seedifyDataFromBSc,
      //   message: "liquidity contract details",
      //   status: true,
      // });
    }
  } catch (err) {
    return res.status(500).send({
      message: "Something went wrong",
      err: `${err.message}?${err.message}:${null}`,
      status: false,
    });
  }
};

// get farming balance
syncController.getFarmingContract = async (req, res) => {
  try {
    const address = "0xfEa9D9fa5BF949015172250fd4768f45eB65F75A";
    const liquidityAddress = "0x74fa517715c4ec65ef01d55ad5335f90dce7cc87";
    const startBlock = 6882632;
    const endBlock = +req.query.endBlock;
    const emailId = req.query.email;

    //api.bscscan.com/api?module=stats&action=tokensupply&contractaddress=0x33338c4fdb9a4a18c5c280c30338acda1b244425&apikey=YourApiKeyToken

    const getTotalSupplyUrl = `https://api.bscscan.com/api?module=stats&action=tokensupply&contractaddress=${liquidityAddress}&apikey=${process.env.BSC_API_KEY}`;
    const tokenBalanceUrl = `https://api.bscscan.com/api?module=account&action=tokenbalance&contractaddress=0x477bc8d23c634c154061869478bce96be6045d12&address=${liquidityAddress}&tag=latest&apikey=${process.env.BSC_API_KEY}`;
    // const url = `${process.env.BSC_API_URL}?module=logs&action=getLogs&address=${address}&fromBlock=${startBlock}&toBlock=${endBlock}&topic0=0xdd2a19c3bdd089cbe77c04f5655f83de0504d6140d12c8667646f55d0557c4dc&sort=desc&apikey=${process.env.BSC_API_KEY}`;
    // const farmingUrl = `${process.env.BSC_API_URL}?module=logs&action=getLogs&address=${address}&fromBlock=${startBlock}&toBlock=${endBlock}&topic0=0x933735aa8de6d7547d0126171b2f31b9c34dd00f3ecd4be85a0ba047db4fafef&sort=desc&apikey=${process.env.BSC_API_KEY}`;

    const getTotalSupply = await axios.get(getTotalSupplyUrl);

    const getTokenBalance = await axios.get(tokenBalanceUrl);

    const farmingData = await syncHelper.getDataFromBScScanForFarming(
      startBlock,
      endBlock,
      address,
      true
    );
    const withdrawData = await syncHelper.getDataFromBScScanForFarming(
      startBlock,
      endBlock,
      address,
      false
    );

    res.status(200).send({
      message: "liquidity contract details",
      status: true,
    });

    const tokenSupply = +getTotalSupply.data.result / Math.pow(10, 18);
    const tokenBalance = +getTokenBalance.data.result / Math.pow(10, 18);

    const getFarmingData = await syncHelper.getFarmingDetails(
      farmingData,
      tokenSupply,
      tokenBalance
    );
    const getwithDrawnData = await syncHelper.getFarmingDetails(
      withdrawData,
      tokenSupply,
      tokenBalance
    );

    if (getwithDrawnData.length) {
      for (let i = 0; i < getwithDrawnData.length; i++) {
        const checkAddress = getFarmingData.findIndex(
          (x) =>
            x.address === getwithDrawnData[i].address.toLocaleLowerCase().trim()
        );

        if (checkAddress >= 0) {
          const balance =
            getFarmingData[checkAddress].balance - getwithDrawnData[i].balance;
          getFarmingData[checkAddress].balance = balance;
          getFarmingData.tier = await syncHelper.getUserTier(balance);
        }
      }

      for (let j = 0; j < getFarmingData.length; j++) {
        getFarmingData[j].tier = syncHelper.getUserTier(
          getFarmingData[j].balance
        );
      }
    }

    Utils.sendEmail(
      getFarmingData,
      `Farming fund balance from block ${startBlock} to ${endBlock}`,
      emailId
    );

    // return res.status(200).send({
    //   data: getFarmingData,
    //   message: "farming contract details",
    //   status: true,
    // });
  } catch (err) {
    console.log("error is:", err);
    return res.status(500).send({
      message: "Something went wrong",
      err: `${err.message}?${err.message}:${null}`,
      status: false,
    });
  }
};

syncController.getResults = async (req, res) => {
  try {
    return new Promise(async (resolve, reject) => {
      const getResults = await axios.get(url);
      if (getResults.status === 200) {
        resolve(getResults.data.result);
      } else {
        resolve([]);
      }
    });
  } catch (err) {}
};

// get bakery tokens
syncController.getBakeryDetails = async (req, res) => {
  try {
    const address = "0x23a5dB7F53a9cC7b89d7d8AB682D4957a584D5Cb";
    const liquidityAddress = "0x782f3f0d2b321d5ab7f15cd1665b95ec479dcfa5";
    const startBlock = 6186192;
    const endBlock = +req.query.endBlock;
    const emailId = req.query.email;

    const getTotalSupplyUrl = `https://api.bscscan.com/api?module=stats&action=tokensupply&contractaddress=${liquidityAddress}&apikey=${process.env.BSC_API_KEY}`;
    const tokenBalanceUrl = `https://api.bscscan.com/api?module=account&action=tokenbalance&contractaddress=0x477bc8d23c634c154061869478bce96be6045d12&address=${liquidityAddress}&tag=latest&apikey=${process.env.BSC_API_KEY}`;

    const getTotalSupply = await axios.get(getTotalSupplyUrl);
    const getTokenBalance = await axios.get(tokenBalanceUrl);
    const farmingData = await syncHelper.getDataFromBScScanForFarming(
      startBlock,
      endBlock,
      address,
      true
    );
    const withdrawData = await syncHelper.getDataFromBScScanForFarming(
      startBlock,
      endBlock,
      address,
      false
    );

    res.status(200).send({
      message: "Bakery contract details",
      status: true,
    });

    const tokenSupply = +getTotalSupply.data.result / Math.pow(10, 18);
    const tokenBalance = +getTokenBalance.data.result / Math.pow(10, 18);

    const getFarmingData = await syncHelper.getFarmingDetails(
      farmingData,
      tokenSupply,
      tokenBalance
    );
    const getwithDrawnData = await syncHelper.getFarmingDetails(
      withdrawData,
      tokenSupply,
      tokenBalance
    );

    if (getwithDrawnData.length) {
      for (let i = 0; i < getwithDrawnData.length; i++) {
        const checkAddress = getFarmingData.findIndex(
          (x) =>
            x.address === getwithDrawnData[i].address.toLocaleLowerCase().trim()
        );

        if (checkAddress >= 0) {
          const balance =
            getFarmingData[checkAddress].balance - getwithDrawnData[i].balance;
          getFarmingData[checkAddress].balance = balance;
          getFarmingData.tier = await syncHelper.getUserTier(balance);
        }
      }

      for (let j = 0; j < getFarmingData.length; j++) {
        getFarmingData[j].tier = syncHelper.getUserTier(
          getFarmingData[j].balance
        );
      }
    }

    Utils.sendEmail(
      getFarmingData,
      `Bakery swap balance from block ${startBlock} to ${endBlock}`,
      emailId
    );
  } catch (err) {
    console.log("error is:", err);
    return res.status(500).send({
      message: "Something went wrong",
      err: `${err.message}?${err.message}:${null}`,
      status: false,
    });
  }
};

// get tosdis fund balance

syncController.getToshDishDetails = async (req, res) => {
  try {
    console.log("tosh dish called");
    const address = "0x23a5dB7F53a9cC7b89d7d8AB682D4957a584D5Cb";
    const startBlock = 6186192;
    const endBlock = +req.query.endBlock;
    const emailId = req.query.email;

    const farmingData = await syncHelper.getDataFromBScScanForFarming(
      startBlock,
      endBlock,
      address,
      true
    );

    const withdrawData = await syncHelper.getDataFromBScScanForFarming(
      startBlock,
      endBlock,
      address,
      false
    );

    res.status(200).send({
      message: "Tosdis   contract details",
      status: true,
    });

    const getFarmingData = await syncHelper.getToshDishDetails(farmingData);

    const getwithDrawnData = await syncHelper.getFarmingDetails(withdrawData);

    if (getwithDrawnData.length) {
      for (let i = 0; i < getwithDrawnData.length; i++) {
        const checkAddress = getFarmingData.findIndex(
          (x) =>
            x.address === getwithDrawnData[i].address.toLocaleLowerCase().trim()
        );

        if (checkAddress >= 0) {
          const balance =
            getFarmingData[checkAddress].balance - getwithDrawnData[i].balance;
          getFarmingData[checkAddress].balance = balance ? balance : 0;
          getFarmingData.tier = await syncHelper.getUserTier(balance);
        }
      }

      for (let j = 0; j < getFarmingData.length; j++) {
        getFarmingData[j].tier = syncHelper.getUserTier(
          getFarmingData[j].balance
        );
      }
    }

    Utils.sendEmail(
      getFarmingData,
      `Tosdis balance from block ${startBlock} to ${endBlock}`,
      emailId
    );
  } catch (err) {
    console.log("error is:", err);
    return res.status(500).send({
      message: "Something went wrong",
      err: `${err.message}?${err.message}:${null}`,
      status: false,
    });
  }
};

// get slp balance

syncController.getSlpBalance = async (req, res) => {
  try {
    const startBlock = 6186192;
    const endBlock = +req.query.endBlock;
    const emailId = req.query.email;

    res.status(200).send({
      message: "Julswap contract details",
      status: true,
    });

    const getData = await syncHelper.slpBalance(startBlock, endBlock);

    Utils.sendEmail(
      getData,
      `Julswap balance from block ${startBlock} to ${endBlock}`,
      emailId
    );
  } catch (err) {
    console.log("err is:", err);
  }
};

// get latest block synched
syncController.getLastestBlockSynched = async (req, res) => {
  try {
    res.status(200).send({
      message: "All Request received ",
      status: true,
      blockNo: blockNo.endBlock,
    });
  } catch (err) {
    return res.status(500).send({
      message: "Some thing went worng please try again later ",
      status: false,
    });
  }
};
module.exports = syncController;
