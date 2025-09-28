#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const contractsArtifactsPath = path.resolve(__dirname, '../../fhevm-hardhat-template/artifacts/contracts');
const deploymentsPath = path.resolve(__dirname, '../../fhevm-hardhat-template/deployments');
const abiOutputPath = path.resolve(__dirname, '../abi');

// Ensure output directory exists
if (!fs.existsSync(abiOutputPath)) {
  fs.mkdirSync(abiOutputPath, { recursive: true });
}

function generateABI() {
  console.log('🔧 Generating ABI files...');

  // Generate ConfDiary ABI
  const confDiaryArtifactPath = path.join(contractsArtifactsPath, 'ConfDiary.sol/ConfDiary.json');
  
  if (fs.existsSync(confDiaryArtifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(confDiaryArtifactPath, 'utf8'));
    
    // Generate ABI file
    const abiContent = `// This file is auto-generated. Do not edit manually.
export const ConfDiaryABI = {
  abi: ${JSON.stringify(artifact.abi, null, 2)}
} as const;

export type ConfDiaryABI = typeof ConfDiaryABI.abi;
`;

    fs.writeFileSync(path.join(abiOutputPath, 'ConfDiaryABI.ts'), abiContent);
    console.log('✅ Generated ConfDiaryABI.ts');
  } else {
    console.warn('⚠️  ConfDiary artifact not found. Please compile contracts first.');
  }
}

function generateAddresses() {
  console.log('🔧 Generating address mappings...');

  const addresses = {};

  // Check for deployments
  if (fs.existsSync(deploymentsPath)) {
    const networks = fs.readdirSync(deploymentsPath);
    
    for (const network of networks) {
      const networkPath = path.join(deploymentsPath, network);
      if (fs.statSync(networkPath).isDirectory()) {
        const confDiaryPath = path.join(networkPath, 'ConfDiary.json');
        
        if (fs.existsSync(confDiaryPath)) {
          const deployment = JSON.parse(fs.readFileSync(confDiaryPath, 'utf8'));
          
          // Map common network names to chain IDs
          const chainIdMap = {
            'localhost': 31337,
            'hardhat': 31337,
            'sepolia': 11155111,
            'mainnet': 1,
          };
          
          const chainId = chainIdMap[network] || parseInt(network);
          
          addresses[chainId] = {
            address: deployment.address,
            chainId: chainId,
            chainName: network,
          };
        }
      }
    }
  }

  // Generate addresses file
  const addressContent = `// This file is auto-generated. Do not edit manually.
export const ConfDiaryAddresses = ${JSON.stringify(addresses, null, 2)} as const;

export type ConfDiaryAddresses = typeof ConfDiaryAddresses;
`;

  fs.writeFileSync(path.join(abiOutputPath, 'ConfDiaryAddresses.ts'), addressContent);
  console.log('✅ Generated ConfDiaryAddresses.ts');
  
  if (Object.keys(addresses).length === 0) {
    console.warn('⚠️  No deployments found. Please deploy contracts first.');
  } else {
    console.log('📍 Found deployments for chains:', Object.keys(addresses).join(', '));
  }
}

function generateIndex() {
  const indexContent = `// This file is auto-generated. Do not edit manually.
export * from './ConfDiaryABI';
export * from './ConfDiaryAddresses';
`;

  fs.writeFileSync(path.join(abiOutputPath, 'index.ts'), indexContent);
  console.log('✅ Generated index.ts');
}

// Main execution
try {
  generateABI();
  generateAddresses();
  generateIndex();
  console.log('🎉 ABI generation completed successfully!');
} catch (error) {
  console.error('❌ Error generating ABI files:', error);
  process.exit(1);
}



