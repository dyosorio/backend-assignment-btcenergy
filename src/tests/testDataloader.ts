import { blockchainService } from "../services/blockchainService";

async function testDataloader() {
  const blockHashes = [
    '000000000000000000021bf09c625a94345ceefa0585b295c7df7d13f781bbfe',
    '00000000000000000001e60c06e779b4afa5304d75ea0141f6bd2fffa31d80fc',
    '00000000000000000000558deeee2290ddb5f22f89944bfe817c93ff149c0cc1', 
    '000000000000000000015bd93bafb7323e9dcb6c9189ff76947d3636f9ea6995',
    '000000000000000000025d63e89c929a0fd4114daba382ff7080b79c58a4f2dd',
  ];

  console.log('Batch 1: Requesting energy consumption for hashes 1, 2, 3');
  const results1 = await Promise.all(
    blockHashes.slice(0, 3).map((hash) => blockchainService.energyConsumptionLoader.load(hash))
  );

  console.log('Batch 2: Requesting energy consumption for hash 1 (cached) and hash 4');
  const results2 = await Promise.all(
    blockHashes.slice(0, 4).map((hash) => blockchainService.energyConsumptionLoader.load(hash))
  );

  console.log('Results from Batch 1:', results1);
  console.log('Results from Batch 2:', results2);
}

testDataloader();
