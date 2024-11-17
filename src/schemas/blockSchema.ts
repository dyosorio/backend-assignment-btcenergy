import { schemaComposer } from 'graphql-compose';

export const BlockSchema = schemaComposer.createObjectTC({
  name: 'Block',
  fields: {
    hash: 'String!',
    height: 'Int!',
    time: 'Int!',
    size: 'Int!',
    transactions: '[Transaction!]',
  },
});

schemaComposer.Query.addFields({
  blockEnergyConsumption: {
    type: 'Float!',
    args: {
      blockHash: 'String!',
    },
    resolve: async (_, { blockHash }, { blockchainService }) =>
      blockchainService.getEnergyConsumptionPerBlock(blockHash),
  },
  totalEnergyConsumption: {
    type: 'Float!',
    args: {
      days: 'Int!',
    },
    resolve: async (_, { days }, { blockchainService }) =>
      blockchainService.getTotalEnergyConsumption(days),
  },
});

export { schemaComposer };