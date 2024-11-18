import axios from 'axios';
import DataLoader from 'dataloader';
import redisClient from '../utils/redisClient';

const BASE_URL = 'https://blockchain.info';

interface Block {
  size: number;
}

export const blockchainService = {
  energyConsumptionLoader: new DataLoader<string, number>(async (blockHashes: readonly string[]) => {
    const blockSizes = await Promise.all(
      blockHashes.map(async (blockHash): Promise<number> => {
        const blockSize = await blockchainService.fetchBlockSizeWithCache(blockHash);

        if (blockSize === null) {
          console.warn(`Skipping invalid or missing block: ${blockHash}`);
          return 0;
        }

        return blockSize;
      })
    );

    return blockSizes.map((size) => size * 4.56);
  }),

  async fetchBlock(blockHash: string): Promise<Block | null> {
    try {
      const response = await axios.get(`${BASE_URL}/rawblock/${blockHash}`);
      console.log('Block Data:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch block data for hash: ${blockHash}`, error);
      return null;
    }
  },

  async fetchBlockSizeWithCache(blockHash: string): Promise<number | null> {
    // Check if block size is already cached
    const cachedSize = await redisClient.get(`block:${blockHash}`);
    if (cachedSize !== null) {
      return parseFloat(cachedSize);
    }

    // Fetch block data if not cached
    const block = await blockchainService.fetchBlock(blockHash);
    if (block && typeof block.size === 'number') {
      await redisClient.set(`block:${blockHash}`, block.size.toString(), 'EX', 60 * 60 * 24 * 7); // Cache for 7 days
      return block.size;
    }

    return null;
  },

  async fetchBlocksForDate(dateInMillis: number) {
    const response = await axios.get(`${BASE_URL}/blocks/${dateInMillis}?format=json`);
    return response.data;
  },

  async getTotalEnergyConsumption(days: number): Promise<number> {
    const now = Date.now();
    const millisPerDay = 24 * 60 * 60 * 1000;
    const batchSize = 5;

    const generateTimestamps = (start: number, count: number) =>
      Array.from({ length: count }, (_, j) => now - (start + j) * millisPerDay);

    const calculateEnergyForBlocks = async (blockHashes: string[]): Promise<number> => {
      const blockSizes = await Promise.all(
        blockHashes.map(async (hash) => {
          const size = await blockchainService.fetchBlockSizeWithCache(hash);
          return size ? size * 4.56 : 0; 
        })
      );

      return blockSizes.reduce((sum, energy) => sum + energy, 0); 
    };

    const calculateBatchEnergy = async (timestamps: number[]): Promise<number> => {
      const blocksDataArray = await Promise.all(
        timestamps.map((timestamp) => blockchainService.fetchBlocksForDate(timestamp))
      );

      const blockHashes = blocksDataArray.flatMap((blocksData) =>
        blocksData?.map((block: any) => block.hash) || []
      );

      return calculateEnergyForBlocks(blockHashes);
    };

    let totalEnergy = 0;

    for (let batchStart = 0; batchStart < days; batchStart += batchSize) {
      const batchDays = Math.min(batchSize, days - batchStart);
      const timestamps = generateTimestamps(batchStart, batchDays);
      const batchEnergy = await calculateBatchEnergy(timestamps);
      totalEnergy += batchEnergy;
    }

    console.log(`Total Energy Consumption: ${totalEnergy}`);
    return totalEnergy;
  },
};