// An error the client is meant to see: its message and status code go straight into the response.
// Usage: throw new AppError('Leave request not found', 404);
class AppError extends Error {
  constructor(message, statusCode = 500, errors) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    if (errors) this.errors = errors;
  }
}

module.exports = AppError;
