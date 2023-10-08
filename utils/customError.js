class CustomError extends Error {
  constructor(codeName) {
    super();
    this.codeName = codeName;
  }
}

module.exports = CustomError;
