import axios from 'axios';

const ENERGY_PER_BYTE = 4.56;

export const transactionService = {
  async getEnergyConsumptionForTransactions(blockHash: string, limit?: number, offset: number = 0) {
    try {
      // Fetch block data
      const blockResponse = await axios.get(`https://blockchain.info/rawblock/${blockHash}`);
      const transactions = blockResponse.data.tx;

      // Handle optional pagination
      const paginatedTransactions = limit
        ? transactions.slice(offset, offset + limit) // Apply pag if limit 
        : transactions.slice(offset); // Return all trans starting from offset if no limit

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