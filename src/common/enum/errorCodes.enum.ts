export enum PostgresErrorCode {
  UniqueViolation = '23505',
}

export enum ErrorMessage {
  InternalServerError = 'An internal server error occurred.',
  InvalidCredentials = 'Invalid credentials provided.',
  UserAlreadyExists = 'A user with this email already exists.',
  SecretsNotFound = 'Required secrets not found.',
  UserNotFound = 'User not found.',
  SomethingWentWrong = 'Something went wrong. Please try again later.',

  // New additions
  Unauthorized = 'You are not authorized to perform this action.',
  ForbiddenAccess = 'Access to this resource is forbidden.',
  TokenMissing = 'Authentication token is missing.',
  TokenInvalid = 'Authentication token is invalid or expired.',
  RoleNotAllowed = 'You do not have the required role to access this resource.',
}
