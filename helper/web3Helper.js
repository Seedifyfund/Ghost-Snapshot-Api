var Web3 = require("web3");

provider = `https://bsc-dataseed.binance.org/`;

web3 = new Web3(new Web3.providers.HttpProvider(provider));

web3.getConractDetails = async (abi, address, userAddress, blockNumber) => {
  const contract = new web3.eth.Contract(abi, address);

  console.log("contract.methods", contract.methods);

  console.log(contract.methods.balanceOf(userAddress).call({}, blockNumber));

  return contract.methods.balanceOf(userAddress).call({}, blockNumber);
  //   const getStakedBalance = await contract.methods.stakedBalance().call();
  //   const getRate = await contract.methods.rate().call();

  //   return {
  //     bnfLocked: web3.utils.fromWei(getStakedBalance),
  //     apy: (+getRate / (multiplier * 100)) * 12,
  //   };
};

module.exports = web3;
