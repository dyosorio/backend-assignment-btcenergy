import { schemaComposer } from 'graphql-compose';

export const TransactionEnergyTC = schemaComposer.createObjectTC({
  name: 'TransactionEnergy',
  fields: {
    transactionHash: 'String!',
    energyConsumed: 'Float!',
  },
});

schemaComposer.Query.addFields({
  energyPerTransaction: {
    type: '[TransactionEnergy!]!', 
    args: {
      blockHash: 'String!', 
      limit: { type: 'Int', defaultValue: 15 }, 
      offset: { type: 'Int', defaultValue: 0 }, 
    },
    resolve: async (_, { blockHash, limit, offset }) => {
      const axios = require('axios');
      const ENERGY_PER_BYTE = 4.56;

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
        console.error('Error in energyPerTransaction resolver:', error);
        throw new Error('Failed to fetch energy consumption for transactions.');
      }
    },
  },
});
