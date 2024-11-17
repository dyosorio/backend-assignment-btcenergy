import axios from 'axios';
import DataLoader from 'dataloader';

const BASE_URL = 'https://blockchain.info';

interface Transaction {
  size: number;
}

interface Block {
  tx: Transaction[];
}

export const blockchainService = {
  energyConsumptionLoader: new DataLoader<string, number>(async (blockHashes: readonly string[]) => {
    const totalSizes = await Promise.all(
      blockHashes.map(async (blockHash): Promise<number> => {
        const block: Block | null = await blockchainService.fetchBlock(blockHash);

        // Skip invalid blocks
        if (!block || !block.tx || !Array.isArray(block.tx)) {
          console.warn(`Skipping invalid or missing block: ${blockHash}`);
          return 0; 
        }

        // Sum transaction sizes in the block
        return block.tx.reduce((acc: number, tx: Transaction) => acc + (tx.size || 0), 0);
      })
    );
    // total transaction sizes for all blocks
    return totalSizes; 
  }),

  async fetchBlock(blockHash: string) {
    try {
      const response = await axios.get(`${BASE_URL}/rawblock/${blockHash}`);
      console.log('Block Data:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch block data for hash: ${blockHash}`, error);
      return null;
    }
  },

  async fetchTransaction(txHash: string) {
    const response = await axios.get(`${BASE_URL}/rawtx/${txHash}`);
    return response.data;
  },

  async fetchBlocksForDate(dateInMillis: number) {
    const response = await axios.get(`${BASE_URL}/blocks/${dateInMillis}?format=json`);
    return response.data;
  },

  async getTotalEnergyConsumption(days: number) {
    const now = Date.now();
    const millisPerDay = 24 * 60 * 60 * 1000;
    const batchSize = 10; 
    const cache = new Map(); 
    const generateTimestamps = (start: number, count: number) =>
      Array.from({ length: count }, (_, j) => now - (start + j) * millisPerDay);

      const calculateBatchEnergy = async (timestamps: number[]) => {
        const totalSizeByDay: { [timestamp: number]: number } = {}; 
        const cachedEnergies = timestamps.map((timestamp) => cache.get(timestamp) || 0);
        const missingTimestamps = timestamps.filter((timestamp) => !cache.has(timestamp));
      
        // Fetch missing blocks data
        const blocksDataArray = await Promise.all(
          missingTimestamps.map((timestamp) => this.fetchBlocksForDate(timestamp))
        );
      
        // Extract block hashes and map to their respective timestamps
        const blocksWithTimestamps = blocksDataArray.flatMap((blocksData, index) => {
          if (!blocksData || !Array.isArray(blocksData)) return []; 
          return blocksData.map((block: any) => ({ ...block, timestamp: missingTimestamps[index] }));
        });
      
        // Fetch all block data
        const blockDataArray = await Promise.all(
          blocksWithTimestamps.map(({ hash }) => blockchainService.fetchBlock(hash))
        );
      
        // Transaction sizes by day
        blocksWithTimestamps.forEach((block, index) => {
          const blockData = blockDataArray[index];
          const timestamp = block.timestamp;
      
          // Skip invalid blocks
          if (!blockData || !blockData.tx) {
            console.warn(`Skipping invalid or missing block data for timestamp: ${timestamp}`);
            return;
          }
      
          if (!timestamp) {
            console.error(`Timestamp is undefined for block:`, block);
            return;
          }
      
          if (!totalSizeByDay[timestamp]) totalSizeByDay[timestamp] = 0;
      
          // Sum transaction sizes
          const CHUNK_SIZE = 500;
          const chunkArray = (array: any[], size: number) =>
            Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
              array.slice(i * size, i * size + size)
            );
      
          const chunks = chunkArray(blockData.tx, CHUNK_SIZE);
          for (const chunk of chunks) {
            const chunkSize = chunk.reduce((sum, tx) => sum + (tx.size || 0), 0);
            totalSizeByDay[timestamp] += chunkSize;
          }
      
          console.log(`Total size for timestamp ${timestamp}:`, totalSizeByDay[timestamp]);
        });
      
        // Calculate energy per day and cache it
        const missingEnergies = Object.keys(totalSizeByDay).map((timestamp) => {
          const size = totalSizeByDay[+timestamp];
          if (isNaN(size)) {
            console.error(`Invalid size detected for timestamp ${timestamp}: ${size}`);
            return 0; 
          }
      
          const energy = size * 4.56;
          cache.set(+timestamp, energy);
          return energy;
        });
      
        // Combine cached and newly calculated energies
        return [...cachedEnergies, ...missingEnergies].reduce((sum, energy) => sum + energy, 0);
      };
      

    // Process batches
    const totalEnergy = await Array.from(
      { length: Math.ceil(days / batchSize) },
      (_, batchIndex) => batchIndex * batchSize
    ).reduce(async (accPromise, batchStart) => {
      const acc = await accPromise; // Accumulate result
      const batchDays = Math.min(batchSize, days - batchStart);
      const timestamps = generateTimestamps(batchStart, batchDays);
      const batchEnergy = await calculateBatchEnergy(timestamps);
      return acc + batchEnergy;
    }, Promise.resolve(0)); // Initial accumulator value

    console.log(`Total Energy Consumption: ${totalEnergy}`);
    return totalEnergy;
  },
};

