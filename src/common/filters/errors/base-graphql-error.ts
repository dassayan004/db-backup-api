import { GraphQLError } from 'graphql';

export class BaseGraphQLError extends GraphQLError {
  constructor(message: string, code: string, status = 400) {
    super(message, {
      extensions: {
        code,
        status,
      },
    });
  }
}
