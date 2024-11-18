import { schemaComposer } from 'graphql-compose';
import { transactionService } from '../services/transactionService';

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
      limit: { type: 'Int' },
      offset: { type: 'Int', defaultValue: 0 },
    },
    resolve: async (_, { blockHash, limit, offset }, { transactionService }) => {
      try {
        return await transactionService.getEnergyConsumptionForTransactions(blockHash, limit, offset);
      } catch (error) {
        console.error('Error in energyPerTransaction resolver:', error);
        throw new Error('Failed to fetch energy consumption for transactions.');
      }
    },
  },
});

export { schemaComposer };