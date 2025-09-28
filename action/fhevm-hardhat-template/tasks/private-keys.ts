import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { HDNodeWallet } from "ethers";

task("private-keys", "显示测试账户的私钥", async (taskArgs, hre: HardhatRuntimeEnvironment) => {
  const mnemonic = "test test test test test test test test test test test junk";
  
  console.log("\n🔑 ConfDiary 测试账户信息");
  console.log("=" .repeat(80));
  console.log("助记词:", mnemonic);
  console.log("网络: Localhost 8545 (Chain ID: 31337)");
  console.log("");

  // 生成前10个账户的详细信息
  for (let i = 0; i < 10; i++) {
    const wallet = HDNodeWallet.fromPhrase(mnemonic, undefined, `m/44'/60'/0'/0/${i}`);
    const balance = await hre.ethers.provider.getBalance(wallet.address);
    
    console.log(`账户 ${i}:`);
    console.log(`  地址:    ${wallet.address}`);
    console.log(`  私钥:    ${wallet.privateKey}`);
    console.log(`  余额:    ${hre.ethers.formatEther(balance)} ETH`);
    console.log("");
  }

  console.log("📱 MetaMask 快速导入:");
  console.log("=" .repeat(80));
  console.log("方法1: 使用助记词");
  console.log("  1. MetaMask → 设置 → 安全和隐私 → 显示密钥短语");
  console.log("  2. 输入助记词: test test test test test test test test test test test junk");
  console.log("");
  console.log("方法2: 导入单个账户");
  console.log("  1. MetaMask → 添加账户 → 导入账户");
  console.log("  2. 粘贴上面任意一个私钥");
  console.log("");
  console.log("🌐 添加本地网络:");
  console.log("  网络名称: Localhost 8545");
  console.log("  RPC URL: http://localhost:8545");
  console.log("  链ID: 31337");
  console.log("  货币符号: ETH");
  console.log("");
  console.log("⚠️  重要提醒: 这些私钥仅用于本地测试，切勿在主网使用！");
});



