const { ethers, getNamedAccounts } = require("hardhat");
const { getWeth, AMOUNT } = require("../scripts/getWeth.js");

async function main() {
    await getWeth();
    const { deployer } = await getNamedAccounts();
    const lendingPool = await getLendingPool(deployer);
    console.log(`LendingPool address : ${lendingPool.address}`);
    const wethTokenAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    await approveToken(wethTokenAddress, lendingPool.address, AMOUNT, deployer);
    console.log("Depositiing ...");
    await lendingPool.deposit(wethTokenAddress, AMOUNT, deployer, 0);
    console.log("Deposited");
    let { availableBorrowsETH, totalDebtETH } = await getBorrowUserData(lendingPool, deployer);
    const daiPrice = await getDaiPrice();
    const amountDaiToBorrow = availableBorrowsETH.toString() * 0.95 * (1 / daiPrice.toNumber());
    const amountDaiToBorrowWei = ethers.utils.parseEther(amountDaiToBorrow.toString());
    console.log(`You can borrow ${amountDaiToBorrowWei} Dai`);
    const daiTokenAddress = "0x6b175474e89094c44da98b954eedeac495271d0f";
    await borrowDai(lendingPool, daiTokenAddress, amountDaiToBorrowWei, deployer);
    await getBorrowUserData(lendingPool, deployer);
    await repayDai(lendingPool, daiTokenAddress, amountDaiToBorrowWei, deployer);
    await getBorrowUserData(lendingPool, deployer);
}
async function repayDai(lendingPool, daiTokenAddress, amount, account) {
    console.log("Repaying ...");
    await approveToken(daiTokenAddress, lendingPool.address, amount, account);
    const tx = await lendingPool.repay(daiTokenAddress, amount, 1, account);
    await tx.wait(1);
    console.log("Repaid !");
}
async function borrowDai(lendingPool, daiTokenAddress, amountDaiToBorrowWei, account) {
    console.log("Borrowing ....");
    const tx = await lendingPool.borrow(daiTokenAddress, amountDaiToBorrowWei, 1, 0, account);
    await tx.wait(1);
    console.log("Dai Borrowed !")
}
async function getDaiPrice() {
    const priceFeed = await ethers.getContractAt("AggregatorV3Interface", "0x773616E4d11A78F511299002da57A0a94577F1f4");
    const price = (await priceFeed.latestRoundData())[1];
    return price;
}
async function getBorrowUserData(lendingPool, account) {
    const { totalCollateralETH, totalDebtETH, availableBorrowsETH } = await lendingPool.getUserAccountData(account);
    console.log(`You have ${totalCollateralETH} worth of ETH deposited`);
    console.log(`You have ${totalDebtETH} worth of ETH borrowed`);
    console.log(`You can borrow ${availableBorrowsETH} worth of ETH`);
    return { availableBorrowsETH, totalDebtETH };
}
async function getLendingPool(account) {
    const lendingPoolAddressesProvider = await ethers.getContractAt("ILendingPoolAddressesProvider",
        "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5", account);
    const lendingPoolAddress = await lendingPoolAddressesProvider.getLendingPool();
    const lendingPool = await ethers.getContractAt("ILendingPool", lendingPoolAddress, account);
    return lendingPool;
}
async function approveToken(tokenAddress, spenderAddress, amountToSpend, account) {
    const erc20Token = await ethers.getContractAt("IERC20", tokenAddress, account);
    const tx = await erc20Token.approve(spenderAddress, amountToSpend);
    await tx.wait(1);
    console.log("Token Approved");
}
main().then(() => {
    process.exit(0);
}).catch((e) => {
    console.log(e);
    process.exit(1);
})
