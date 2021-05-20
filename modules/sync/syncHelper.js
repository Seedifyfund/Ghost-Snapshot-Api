const axios = require("axios");
const _ = require("lodash");
const fs = require("fs");
const { resolve } = require("bluebird");

const syncHelper = {};

syncHelper.getSeddifyContractDetails = async (
  data,
  address,
  endBlock,
  contractType
) => {
  return new Promise((resolve, reject) => {
    try {
      const result = [];
      const blockData = data;

      if (blockData.length) {
        console.log("block data", blockData.length);
        const itreateBlocks = async (i) => {
          console.log("i is:", i);
          if (i < blockData.length) {
            const fromAddress = blockData[i].from.trim();
            const requiredAddress = fromAddress.substring(2, address.length);

            // get balance for seedify token

            const data = {
              jsonrpc: "2.0",
              method: "eth_call",
              params: [
                {
                  to: address,
                  data: `0x70a08231000000000000000000000000${requiredAddress}`,
                },
                `0x${endBlock.toString(16).toUpperCase()}`,
              ],
              id: 67,
            };
            const config = {
              method: "post",
              url: "https://bsc-private-dataseed1.nariox.org",
              headers: {
                "Content-Type": "application/json",
              },
              data: JSON.stringify(data),
            };
            const fetchDetails = await axios(config);

            if (!fetchDetails.data.error) {
              const weiBalance = parseInt(fetchDetails.data.result, 16);
              let seedifyBalance = (weiBalance / Math.pow(10, 18)).toFixed(2);

              // if (contractType === "liquidity") {
              //   seedifyBalance *= 20.54;
              // }

              result.push({
                address: blockData[i].from.toLowerCase(),
                balance: seedifyBalance,
                tier: await syncHelper.getUserTier(seedifyBalance),
              });
            } else {
              result.push({
                address: blockData[i].from.toLowerCase(),
                balance: 0,
                tier: "tier0",
              });
            }

            itreateBlocks(i + 1);
          } else {
            resolve(result);
          }
        };
        itreateBlocks(0);
      } else {
        resolve(result);
      }
    } catch (err) {
      reject(err);
    }
  });
};

syncHelper.getUserTier = (balance) => {
  if (+balance >= 100 && +balance <= 999) {
    return "tier1";
  } else if (+balance >= 1000 && +balance <= 9999) {
    return "tier2";
  } else if (+balance >= 10000 && +balance <= 99999) {
    return "tier3";
  } else if (+balance >= 100000) {
    return "tier4";
  } else {
    return "tier0";
  }
};

syncHelper.getFarmingDetails = (data, totalSupply, totalBalance) => {
  return new Promise((resolve, reject) => {
    const finalValues = [];
    try {
      if (data.length) {
        const itreateBlocks = (i) => {
          if (i < data.length) {
            const address = data[i].topics[1];
            const userAddress = address
              ? `0x${address.substring(26, address.length)}`
              : null;
            const transactionData = data[i].data.substring(2, 66);

            const transactionCount =
              parseInt(transactionData, 16) / Math.pow(10, 18);

            const totalSupplyCount = transactionCount / totalSupply;

            const transaction = totalSupplyCount * totalBalance;

            if (finalValues.length) {
              const checkAddressAvalaible = finalValues.findIndex(
                (x) => x.address === userAddress.toLocaleLowerCase().trim()
              );
              if (checkAddressAvalaible > 0) {
                const balance =
                  finalValues[checkAddressAvalaible].balance + transaction;
                finalValues[checkAddressAvalaible].balance = +balance;
                finalValues.tier = syncHelper.getUserTier(+balance);
                itreateBlocks(i + 1);
              } else {
                finalValues.push({
                  address: userAddress.toLowerCase(),
                  balance: +transaction,
                  tier: syncHelper.getUserTier(transaction),
                });
                itreateBlocks(i + 1);
              }
            } else {
              finalValues.push({
                address: userAddress.toLowerCase(),
                balance: +transaction,
                tier: syncHelper.getUserTier(transaction),
              });
              itreateBlocks(i + 1);
            }
          } else {
            resolve(finalValues);
          }
        };
        itreateBlocks(0);
      } else {
        resolve(finalValues);
      }
    } catch (err) {
      reject(err);
    }
  });
};

// get seddify balance from start block to end block

syncHelper.getSeedifyBalance = (start, end) => {
  return new Promise(async (resolve, reject) => {
    try {
      const address = "0x477bc8d23c634c154061869478bce96be6045d12";
      const startBlock = 5172421;
      const endBlock = end;

      const finalData = await syncHelper.getDataFromBScScanForSeedify(
        startBlock,
        endBlock,
        address
      );

      let seedifyDataFromBSc = [];

      seedifyDataFromBSc = await syncHelper.getSeddifyContractDetails(
        finalData,
        address,
        endBlock,
        "seedify"
      );

      // let data = JSON.stringify(seedifyDataFromBSc);
      // fs.writeFileSync("./csv/seedify.json", data);

      resolve(seedifyDataFromBSc);

      // Utils.sendEmail(
      //   seedifyDataFromBSc,
      //   `Seedify fund balance from block ${startBlock} to ${endBlock}`,
      //   emailId
      // );
    } catch (err) {
      console.log("error is:", err);
      resolve([]);
      // return res.status(500).send({
      //   message: "Something went wrong",
      //   err: `${err.message}?${err.message}:${null}`,
      //   status: false,
      // });
    }
  });
};

// get liquidity balance

syncHelper.getLiquidityBalance = (start, end) => {
  return new Promise(async (resolve, reject) => {
    try {
      const address = "0x74fa517715c4ec65ef01d55ad5335f90dce7cc87";
      const startBlock = 6801618;
      const endBlock = end;

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
            const transactionCount =
              seedifyDataFromBSc[i].balance / tokenSupply;
            const total = transactionCount * tokenBalance;
            // seedifyDataFromBSc[i].liquidity = seedifyDataFromBSc[i].balance;
            seedifyDataFromBSc[i].balance = total;
            seedifyDataFromBSc[i].tier = syncHelper.getUserTier(total);
            itreateSeedifyBalance(i + 1);
          } else {
            // save it to json file
            // let data = JSON.stringify(seedifyDataFromBSc);
            // fs.writeFileSync("./csv/liquidity.json", data);
            resolve(seedifyDataFromBSc);
          }
        };
        itreateSeedifyBalance(0);
      } else {
        resolve([]);
      }
    } catch (err) {
      resolve([]);
      // return res.status(500).send({
      //   message: "Something went wrong",
      //   err: `${err.message}?${err.message}:${null}`,
      //   status: false,
      // });
    }
  });
};

// farming contract

syncHelper.getFarmingBalance = (start, end) => {
  console.log("get farmig called");
  return new Promise(async (resolve, reject) => {
    try {
      const address = "0xfEa9D9fa5BF949015172250fd4768f45eB65F75A";
      const liquidityAddress = "0x74fa517715c4ec65ef01d55ad5335f90dce7cc87";
      const startBlock = 6882632;
      const endBlock = end;

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
              x.address ===
              getwithDrawnData[i].address.toLocaleLowerCase().trim()
          );

          if (checkAddress >= 0) {
            getFarmingData[checkAddress].balance -= getwithDrawnData[i].balance;
          }
        }

        for (let j = 0; j < getFarmingData.length; j++) {
          getFarmingData[j].tier = syncHelper.getUserTier(
            getFarmingData[j].balance
          );
        }
      }

      resolve(getFarmingData);

      // return res.status(200).send({
      //   data: getFarmingData,
      //   message: "farming contract details",
      //   status: true,
      // });
    } catch (err) {
      resolve([]);
    }
  });
};

syncHelper.getDataFromBScScanForSeedify = (startBlock, endBlock, address) => {
  return new Promise(async (resolve, reject) => {
    try {
      let start = startBlock;
      let end = endBlock;

      console.log("start is:", start, end);

      const finalData = [];

      const getResults = async (i) => {
        console.log("I is", i);
        const url = `${process.env.BSC_API_URL}?module=account&action=txlist&address=${address}&startblock=${start}&endblock=${end}&sort=desc&apikey=${process.env.BSC_API_KEY}`;

        const getResult = await axios.get(url);
        if (getResult.status === 200) {
          const seedifyData = getResult.data.result;

          if (seedifyData.length) {
            finalData.push(...seedifyData);

            if (
              seedifyData.length >= 10000 &&
              seedifyData[seedifyData.length - 1].blockNumber + 1 > startBlock
            ) {
              start = startBlock;
              end = seedifyData[seedifyData.length - 1].blockNumber;

              console.log("start and end is:", start, end);
              getResults(i + 1);
            } else {
              // console.log("final data is:", _.uniq(finalData, "from"));

              const dedupThings = Array.from(
                finalData.reduce((m, t) => m.set(t.from, t), new Map()).values()
              );

              resolve(dedupThings);
            }
          } else {
            resolve(finalData);
          }
        } else {
          resolve([]);
        }
      };
      getResults(0);
    } catch (err) {
      resolve([]);
    }
  });
};

syncHelper.getDataFromBScScanForLiquidiy = (startBlock, endBlock, address) => {
  return new Promise(async (resolve, reject) => {
    try {
      let start = startBlock;
      let end = endBlock;
      const finalData = [];

      const getResults = async (i) => {
        const url = `${process.env.BSC_API_URL}?module=account&action=txlist&address=${address}&startblock=${start}&endblock=${end}&sort=desc&apikey=${process.env.BSC_API_KEY}`;

        const getResult = await axios.get(url);
        if (getResult.status === 200) {
          const seedifyData = getResult.data.result;

          if (seedifyData.length) {
            finalData.push(...finalData, ...seedifyData);

            if (
              seedifyData.length >= 10000 &&
              seedifyData[seedifyData.length - 1].blockNumber + 1 > startBlock
            ) {
              start = startBlock;
              end = seedifyData[seedifyData.length - 1].blockNumber;
              getResults(i + 1);
            } else {
              const dedupThings = Array.from(
                finalData.reduce((m, t) => m.set(t.from, t), new Map()).values()
              );

              resolve(dedupThings);
            }
          } else {
            resolve(finalData);
          }
        } else {
          resolve([]);
        }
      };
      getResults(0);
    } catch (err) {
      resolve([]);
    }
  });
};

syncHelper.getDataFromBScScanForFarming = (
  startBlock,
  endBlock,
  address,
  status
) => {
  return new Promise(async (resolve, reject) => {
    try {
      let start = startBlock;
      let end = endBlock;
      const finalData = [];

      const getResults = async (i) => {
        const url = status
          ? `${process.env.BSC_API_URL}?module=logs&action=getLogs&address=${address}&fromBlock=${start}&toBlock=${end}&topic0=0xdd2a19c3bdd089cbe77c04f5655f83de0504d6140d12c8667646f55d0557c4dc&sort=desc&apikey=${process.env.BSC_API_KEY}`
          : `${process.env.BSC_API_URL}?module=logs&action=getLogs&address=${address}&fromBlock=${start}&toBlock=${end}&topic0=0x933735aa8de6d7547d0126171b2f31b9c34dd00f3ecd4be85a0ba047db4fafef&sort=desc&apikey=${process.env.BSC_API_KEY}`;

        const getResult = await axios.get(url);

        if (getResult.status === 200) {
          const seedifyData = getResult.data.result;

          if (seedifyData.length) {
            finalData.push(...finalData, ...seedifyData);

            if (
              seedifyData.length >= 1000 &&
              parseInt(seedifyData[0].blockNumber, 16) + 1 > startBlock
            ) {
              start = startBlock;
              end = parseInt(seedifyData[0].blockNumber, 16) + 1;
              getResults(i + 1);
            } else {
              resolve(_.uniq(finalData, "from"));
            }
          } else {
            resolve(_.uniq(finalData, "from"));
          }
        } else {
          resolve([]);
        }
      };
      getResults(0);
    } catch (err) {
      console.log("error is:", err);
      resolve([]);
    }
  });
};

syncHelper.getBakeryFarmBalance = (start, end) => {
  return new Promise(async (resolve, reject) => {
    try {
      const address = " 0x23a5dB7F53a9cC7b89d7d8AB682D4957a584D5Cb";
      const liquidityAddress = "0x782f3f0d2b321d5ab7f15cd1665b95ec479dcfa5";
      const startBlock = 6186192;
      const endBlock = end;

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
              x.address ===
              getwithDrawnData[i].address.toLocaleLowerCase().trim()
          );

          if (checkAddress >= 0) {
            getFarmingData[checkAddress].balance -= getwithDrawnData[i].balance;
          }
        }

        for (let j = 0; j < getFarmingData.length; j++) {
          getFarmingData[j].tier = syncHelper.getUserTier(
            getFarmingData[j].balance
          );
        }
      }

      resolve(getFarmingData);

      // return res.status(200).send({
      //   data: getFarmingData,
      //   message: "farming contract details",
      //   status: true,
      // });
    } catch (err) {
      resolve([]);
    }
  });
};

// get toshdish details

syncHelper.getToshDishDetails = (data) => {
  try {
    return new Promise((resolve, reject) => {
      const finalValues = [];
      try {
        if (data.length) {
          const itreateBlocks = (i) => {
            if (i < data.length) {
              const address = data[i].topics[1];
              const userAddress = address
                ? `0x${address.substring(26, address.length)}`
                : null;
              const transactionData = data[i].data.substring(2, 66);

              const transaction =
                parseInt(transactionData, 16) / Math.pow(10, 18);

              if (finalValues.length) {
                const checkAddressAvalaible = finalValues.findIndex(
                  (x) => x.address === userAddress.toLocaleLowerCase().trim()
                );
                if (checkAddressAvalaible > 0) {
                  const balance =
                    finalValues[checkAddressAvalaible].balance + transaction;
                  finalValues[checkAddressAvalaible].balance = +balance;
                  finalValues.tier = syncHelper.getUserTier(+balance);
                  itreateBlocks(i + 1);
                } else {
                  finalValues.push({
                    address: userAddress.toLowerCase(),
                    balance: +transaction ? transaction : 0,
                    tier: syncHelper.getUserTier(transaction),
                  });
                  itreateBlocks(i + 1);
                }
              } else {
                finalValues.push({
                  address: userAddress.toLowerCase(),
                  balance: +transaction ? transaction : 0,
                  tier: syncHelper.getUserTier(transaction),
                });
                itreateBlocks(i + 1);
              }
            } else {
              resolve(finalValues);
            }
          };
          itreateBlocks(0);
        } else {
          resolve(finalValues);
        }
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {}
};

// get tosh Dish

syncHelper.getToshFarmBalance = async (start, end) => {
  try {
    return new Promise(async (resolve, reject) => {
      const address = "0x23a5dB7F53a9cC7b89d7d8AB682D4957a584D5Cb";
      const startBlock = 6186192;
      const endBlock = +end;

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

      const getFarmingData = await syncHelper.getToshDishDetails(farmingData);

      const getwithDrawnData = await syncHelper.getFarmingDetails(withdrawData);

      if (getwithDrawnData.length) {
        for (let i = 0; i < getwithDrawnData.length; i++) {
          const checkAddress = getFarmingData.findIndex(
            (x) =>
              x.address ===
              getwithDrawnData[i].address.toLocaleLowerCase().trim()
          );

          if (checkAddress >= 0) {
            const balance =
              getFarmingData[checkAddress].balance -
              getwithDrawnData[i].balance;
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

      resolve(getFarmingData);
    });
  } catch (err) {
    resolve([]);
  }
};

syncHelper.slpBalance = (start, end) => {
  console.log("SLP FUNCTION CALLED ===>");
  return new Promise(async (resolve, reject) => {
    try {
      const address = "0x8Bfc43020aa402f2028c54CD3D73b622c15719d3";
      const liquidityAddress = "0xF94FD45b0c7F2b305040CeA4958A9Ab8Ee73e1F4";
      const startBlock = 6186192;
      const endBlock = end;

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
              x.address ===
              getwithDrawnData[i].address.toLocaleLowerCase().trim()
          );

          if (checkAddress >= 0) {
            getFarmingData[checkAddress].balance -= getwithDrawnData[i].balance;
          }
        }

        for (let j = 0; j < getFarmingData.length; j++) {
          getFarmingData[j].tier = syncHelper.getUserTier(
            getFarmingData[j].balance
          );
        }
      }

      resolve(getFarmingData);

      // return res.status(200).send({
      //   data: getFarmingData,
      //   message: "farming contract details",
      //   status: true,
      // });
    } catch (err) {
      resolve([]);
    }
  });
};

module.exports = syncHelper;
