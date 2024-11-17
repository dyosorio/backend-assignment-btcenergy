import { schemaComposer } from 'graphql-compose';
import './schemas/blockSchema'; 
import './schemas/transactionSchema'; 

schemaComposer.Query.addFields({
  hello: {
    type: 'String!',
    resolve: () => 'Hi there, good luck with the assignment!',
  },
});

export const schema = schemaComposer.buildSchema();