import { ethers } from "hardhat";

async function main() {
  const token = await ethers.deployContract("REYLDToken", ["0x0Bb18a1674044D7DfA9A72A1EE5a82f4e7f89b0E"]);

  await token.waitForDeployment();

  console.log(
    `REYLD token has deployed to ${token.target}. `
  );

  const name = await token.name()
  const symbol = await token.symbol()
  const decimals = await token.decimals()
  const totalSupply = await token.totalSupply()
  const owner = await token.owner()
  console.log(`Name: ${name}`)
  console.log(`Symbol: ${symbol}`)
  console.log(`Decimals: ${decimals}`)
  console.log(`Total Supply: ${totalSupply}`)
  console.log(`Owner: ${owner}`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
