#!/usr/bin/env node

import { ethers } from 'ethers';

async function checkHardhatNode() {
  try {
    console.log('🔍 Checking if Hardhat node is running...');
    
    const provider = new ethers.JsonRpcProvider('http://localhost:8545');
    
    // Try to get client version
    const clientVersion = await provider.send('web3_clientVersion', []);
    
    if (clientVersion.includes('hardhat')) {
      console.log('✅ Hardhat node is running');
      console.log(`   Client: ${clientVersion}`);
      
      // Try to get network info
      try {
        const network = await provider.getNetwork();
        console.log(`   Chain ID: ${network.chainId}`);
        console.log(`   Network Name: ${network.name}`);
      } catch (error) {
        console.log('   Network info not available');
      }
      
      // Check if it's an FHEVM node
      try {
        const metadata = await provider.send('fhevm_relayer_metadata', []);
        console.log('🔐 FHEVM Hardhat node detected');
        console.log(`   ACL Address: ${metadata.ACLAddress}`);
        console.log(`   KMS Verifier: ${metadata.KMSVerifierAddress}`);
        console.log(`   Input Verifier: ${metadata.InputVerifierAddress}`);
      } catch (error) {
        console.log('⚠️  Standard Hardhat node (not FHEVM)');
      }
      
      process.exit(0);
    } else {
      console.log('❌ Node is running but not Hardhat');
      console.log(`   Client: ${clientVersion}`);
      process.exit(1);
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ No node running on localhost:8545');
      console.log('   Please start Hardhat node with: npx hardhat node');
    } else {
      console.log('❌ Error checking node:', error.message);
    }
    process.exit(1);
  }
}

checkHardhatNode();



