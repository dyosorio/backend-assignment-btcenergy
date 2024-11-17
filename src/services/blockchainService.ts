import axios from 'axios';
import DataLoader from 'dataloader';

const BASE_URL = 'https://blockchain.info';

interface Block {
  size: number;
}

export const blockchainService = {
  energyConsumptionLoader: new DataLoader<string, number>(async (blockHashes: readonly string[]) => {
    const blockSizes = await Promise.all(
      blockHashes.map(async (blockHash): Promise<number> => {
        const block: Block | null = await blockchainService.fetchBlock(blockHash);


        if (!block || typeof block.size !== 'number') {
          console.warn(`Skipping invalid or missing block: ${blockHash}`);
          return 0; 
        }

        return block.size;
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

  async fetchBlocksForDate(dateInMillis: number) {
    const response = await axios.get(`${BASE_URL}/blocks/${dateInMillis}?format=json`);
    return response.data;
  },

  async getTotalEnergyConsumption(days: number): Promise<number> {
    const now = Date.now();
    const millisPerDay = 24 * 60 * 60 * 1000;
    const batchSize = 5; 
    const cache = new Map<number, number>(); 

    const generateTimestamps = (start: number, count: number) =>
      Array.from({ length: count }, (_, j) => now - (start + j) * millisPerDay);

    const calculateBatchEnergy = async (timestamps: number[]) => {
      const cachedEnergies = timestamps.map((timestamp) => cache.get(timestamp) || 0);
      const missingTimestamps = timestamps.filter((timestamp) => !cache.has(timestamp));

      const blocksDataArray = await Promise.all(
        missingTimestamps.map((timestamp) => this.fetchBlocksForDate(timestamp))
      );

      const blockHashes = blocksDataArray.flatMap((blocksData) =>
        blocksData?.map((block: any) => block.hash) || []
      );

      const blockSizes = await Promise.all(
        blockHashes.map((hash) => this.fetchBlock(hash))
      );

      missingTimestamps.forEach((timestamp, index) => {
        const dailySize = blockSizes[index]?.size || 0;
        const energy = dailySize * 4.56;
        cache.set(timestamp, energy);
      });

      return [...cachedEnergies, ...missingTimestamps.map((t) => cache.get(t) || 0)].reduce(
        (sum, energy) => sum + energy,
        0
      );
    };


    const totalEnergy = await Array.from(
      { length: Math.ceil(days / batchSize) },
      (_, batchIndex) => batchIndex * batchSize
    ).reduce(async (accPromise, batchStart) => {
      const acc = await accPromise; 
      const batchDays = Math.min(batchSize, days - batchStart);
      const timestamps = generateTimestamps(batchStart, batchDays);
      const batchEnergy = await calculateBatchEnergy(timestamps);
      return acc + batchEnergy;
    }, Promise.resolve(0)); 

    console.log(`Total Energy Consumption: ${totalEnergy}`);
    return totalEnergy;
  },
};