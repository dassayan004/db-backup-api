import { ArgumentsHost, Catch } from '@nestjs/common';
import { GqlArgumentsHost, GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

@Catch(GraphQLError)
export class GrapghQLExceptionFilter implements GqlExceptionFilter {
  catch(exception: GraphQLError, host: ArgumentsHost) {
    GqlArgumentsHost.create(host);

    return new GraphQLError(exception.message, {
      extensions: {
        code: exception.extensions?.code || 'INTERNAL_SERVER_ERROR',
        status: exception.extensions?.status || 500,
      },
    });
  }
}
