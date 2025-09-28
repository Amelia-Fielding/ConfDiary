import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task("accounts", "Prints the list of accounts", async (taskArgs, hre: HardhatRuntimeEnvironment) => {
  const accounts = await hre.ethers.getSigners();

  console.log("\n🔑 Hardhat Test Accounts:");
  console.log("=" .repeat(80));
  
  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    const balance = await account.provider.getBalance(account.address);
    
    console.log(`\n账户 ${i}:`);
    console.log(`  地址:    ${account.address}`);
    console.log(`  私钥:    ${(hre.network.config as any).accounts?.mnemonic ? 
      '使用助记词 (见下方)' : '不可用'}`);
    console.log(`  余额:    ${hre.ethers.formatEther(balance)} ETH`);
  }

  // 显示助记词
  const networkConfig = hre.network.config as any;
  if (networkConfig.accounts?.mnemonic) {
    console.log("\n🔐 助记词 (Mnemonic):");
    console.log("=" .repeat(80));
    console.log(`${networkConfig.accounts.mnemonic}`);
    console.log("\n⚠️  注意: 这些是测试账户，仅用于本地开发！");
  }

  console.log("\n📋 MetaMask 导入说明:");
  console.log("=" .repeat(80));
  console.log("1. 打开MetaMask");
  console.log("2. 点击账户图标 → 添加账户或硬件钱包");
  console.log("3. 选择 '导入账户'");
  console.log("4. 输入上面的私钥或使用助记词");
  console.log("5. 切换网络到 'Localhost 8545'");
  console.log("");
});