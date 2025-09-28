import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { HDNodeWallet, Mnemonic } from "ethers";

task("generate-accounts", "生成全新的测试账户", async (taskArgs, hre: HardhatRuntimeEnvironment) => {
  // 生成新的助记词
  const mnemonic = Mnemonic.fromEntropy(hre.ethers.randomBytes(16));
  const mnemonicPhrase = mnemonic.phrase;
  
  console.log("\n🆕 全新的ConfDiary测试账户");
  console.log("=" .repeat(80));
  console.log("🔐 新助记词:", mnemonicPhrase);
  console.log("🌐 网络: Localhost 8545 (Chain ID: 31337)");
  console.log("");

  // 生成10个账户
  const accounts = [];
  for (let i = 0; i < 10; i++) {
    const wallet = HDNodeWallet.fromPhrase(mnemonicPhrase, undefined, `m/44'/60'/0'/0/${i}`);
    accounts.push({
      index: i,
      address: wallet.address,
      privateKey: wallet.privateKey,
    });
  }

  // 显示账户信息
  console.log("📋 账户列表:");
  console.log("-" .repeat(80));
  accounts.forEach(account => {
    console.log(`账户 ${account.index}:`);
    console.log(`  地址: ${account.address}`);
    console.log(`  私钥: ${account.privateKey}`);
    console.log("");
  });

  console.log("💰 为这些账户充值测试ETH:");
  console.log("=" .repeat(80));
  
  // 获取当前的签名者（有钱的账户）
  const [deployer] = await hre.ethers.getSigners();
  const deployerBalance = await deployer.provider.getBalance(deployer.address);
  
  console.log(`资金来源账户: ${deployer.address}`);
  console.log(`可用余额: ${hre.ethers.formatEther(deployerBalance)} ETH`);
  console.log("");

  // 为每个新账户转账
  console.log("开始转账...");
  for (const account of accounts) {
    try {
      const tx = await deployer.sendTransaction({
        to: account.address,
        value: hre.ethers.parseEther("1000"), // 每个账户1000 ETH
      });
      
      await tx.wait();
      console.log(`✅ 账户 ${account.index} (${account.address}) +1000 ETH`);
    } catch (error) {
      console.log(`❌ 账户 ${account.index} 转账失败:`, error);
    }
  }

  console.log("");
  console.log("📱 MetaMask 导入指南:");
  console.log("=" .repeat(80));
  console.log("方法1: 导入助记词");
  console.log(`  助记词: ${mnemonicPhrase}`);
  console.log("");
  console.log("方法2: 导入单个私钥");
  console.log("  选择上面任意一个私钥导入");
  console.log("");
  console.log("🌐 网络配置:");
  console.log("  网络名称: Localhost 8545");
  console.log("  RPC URL: http://localhost:8545");
  console.log("  链ID: 31337");
  console.log("  货币符号: ETH");
  console.log("");
  console.log("⚠️  这些是全新的测试账户，每个都有1000 ETH用于测试！");
});



