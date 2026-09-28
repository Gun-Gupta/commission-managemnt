/**
 * Creates a custom application error with an HTTP status code.
 * @param {string} message - Human-readable error message
 * @param {number} statusCode - HTTP status code
 */
const createError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

module.exports = { createError };
