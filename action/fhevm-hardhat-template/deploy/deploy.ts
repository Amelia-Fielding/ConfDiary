import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedConfDiary = await deploy("ConfDiary", {
    from: deployer,
    log: true,
    waitConfirmations: 1,
  });

  console.log(`ConfDiary contract deployed to: ${deployedConfDiary.address}`);
  console.log(`Deployed by: ${deployer}`);
  console.log(`Transaction hash: ${deployedConfDiary.transactionHash}`);
};

export default func;
func.id = "deploy_confDiary";
func.tags = ["ConfDiary"];


