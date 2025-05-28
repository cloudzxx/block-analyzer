export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
  ) {
    super(message)
    this.name = "AppError"
  }
}

export class ConfigError extends AppError {
  constructor(message: string) {
    super(message, "CONFIG_ERROR", 500)
    this.name = "ConfigError"
  }
}

export class ProviderError extends AppError {
  constructor(message: string, statusCode: number = 502) {
    super(message, "PROVIDER_ERROR", statusCode)
    this.name = "ProviderError"
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400)
    this.name = "ValidationError"
  }
}
