export class SalesOrderError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "SalesOrderError";
    this.statusCode = statusCode;
  }
}
