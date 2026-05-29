// 错误基础类，包含错误码和 HTTP 状态码
// 错误层次：AppError → ConfigError | ProviderError | ValidationError
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

// 配置错误：环境变量缺失或格式错误时抛出
export class ConfigError extends AppError {
  constructor(message: string) {
    super(message, "CONFIG_ERROR", 500)
    this.name = "ConfigError"
  }
}

// 数据源错误：调用 Etherscan/Solscan/CoinGecko 失败时抛出
export class ProviderError extends AppError {
  constructor(message: string, statusCode: number = 502) {
    super(message, "PROVIDER_ERROR", statusCode)
    this.name = "ProviderError"
  }
}

// 参数校验错误：用户输入不合法时抛出
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400)
    this.name = "ValidationError"
  }
}
