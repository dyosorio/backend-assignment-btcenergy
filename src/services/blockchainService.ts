import axios from 'axios';
import DataLoader from 'dataloader';
import redisClient from '../utils/redisClient';

const BASE_URL = 'https://blockchain.info';

interface Block {
  size: number;
}

export const blockchainService = {
  energyConsumptionLoader: new DataLoader<string, number>(async (blockHashes: readonly string[]) => {
    const blockSizes = await blockchainService.fetchBlockSizesWithCache(blockHashes as string[]);

    const results: number[] = [];
    const blocksToFetch: string[] = [];

    blockSizes.forEach((size, index) => {
      if (size !== null) {
        results[index] = size * 4.56;
      } else {
        blocksToFetch.push(blockHashes[index]);
        results[index] = 0; 
      }
    });

    if (blocksToFetch.length > 0) {
      const fetchedBlocks = await Promise.all(
        blocksToFetch.map(async (blockHash) => {
          const block = await blockchainService.fetchBlock(blockHash);
          if (block && typeof block.size === 'number') {
            await redisClient.set(`block:${blockHash}`, block.size.toString(), 'EX', 60 * 60 * 24 * 7);
            return block.size * 4.56;
          } else {
            console.warn(`Skipping invalid or missing block: ${blockHash}`);
            return 0;
          }
        })
      );

      let fetchIndex = 0;
      blockSizes.forEach((size, index) => {
        if (size === null) {
          results[index] = fetchedBlocks[fetchIndex];
          fetchIndex += 1;
        }
      });
    }

    return results;
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

  async fetchBlockSizesWithCache(blockHashes: string[]): Promise<(number | null)[]> {
    const keys = blockHashes.map(hash => `block:${hash}`);

    try {
      const cachedSizes: (string | null)[] = await redisClient.mget(keys);

      return cachedSizes.map(size => (size !== null ? parseFloat(size) : null));
    } catch (error) {
      console.error('Error fetching block sizes from Redis:', error);
      return blockHashes.map(() => null);
    }
  },

  async fetchBlocksForDate(dateInMillis: number) {
    try {
      const response = await axios.get(`${BASE_URL}/blocks/${dateInMillis}?format=json`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch blocks for date: ${dateInMillis}`, error);
      return [];
    }
  },

  async getTotalEnergyConsumption(days: number): Promise<number> {
    const now = Date.now();
    const millisPerDay = 24 * 60 * 60 * 1000;
    const batchSize = 5;

    const generateTimestamps = (start: number, count: number) =>
      Array.from({ length: count }, (_, j) => now - (start + j) * millisPerDay);

    const calculateEnergyForBlocks = async (blockHashes: string[]): Promise<number> => {
      const energies = await blockchainService.energyConsumptionLoader.loadMany(blockHashes);

      const validEnergies = energies.filter((energy): energy is number => !(energy instanceof Error));

      return validEnergies.reduce((sum, energy) => sum + energy, 0);
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