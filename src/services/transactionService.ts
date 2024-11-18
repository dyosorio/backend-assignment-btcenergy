import axios from 'axios';

const ENERGY_PER_BYTE = 4.56;

export const transactionService = {
  async getEnergyConsumptionForTransactions(blockHash: string, limit: number, offset: number) {
    try {
      // Fetch block data
      const blockResponse = await axios.get(`https://blockchain.info/rawblock/${blockHash}`);
      const transactions = blockResponse.data.tx;

      // Apply pagination
      const paginatedTransactions = transactions.slice(offset, offset + limit);

      // Include energy consumption
      return paginatedTransactions.map((tx: any) => ({
        transactionHash: tx.hash,
        energyConsumed: tx.size * ENERGY_PER_BYTE,
      }));
    } catch (error) {
      console.error('Error fetching transaction data:', error);
      throw new Error('Failed to fetch transactions for the block.');
    }
  },
};
