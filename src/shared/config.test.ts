import { describe, it, expect, beforeEach } from "bun:test"
import { loadConfig } from "./config"

describe("loadConfig", () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY
    delete process.env.ETHERSCAN_API_KEY
    delete process.env.SOLSCAN_API_KEY
    delete process.env.PORT
    delete process.env.OPENAI_MODEL
    delete process.env.FRONTEND_ORIGIN
  })

  it("throws when required keys are missing", () => {
    expect(() => loadConfig()).toThrow("OPENAI_API_KEY")
  })

  it("returns config with defaults when only required keys set", () => {
    process.env.OPENAI_API_KEY = "sk-test"
    process.env.ETHERSCAN_API_KEY = "eth-test"
    process.env.SOLSCAN_API_KEY = "sol-test"
    const cfg = loadConfig()
    expect(cfg.OPENAI_API_KEY).toBe("sk-test")
    expect(cfg.PORT).toBe(3000)
    expect(cfg.OPENAI_MODEL).toBe("gpt-4o")
    expect(cfg.FRONTEND_ORIGIN).toBe("http://localhost:5173")
  })

  it("reads custom PORT from env", () => {
    process.env.OPENAI_API_KEY = "sk-test"
    process.env.ETHERSCAN_API_KEY = "eth-test"
    process.env.SOLSCAN_API_KEY = "sol-test"
    process.env.PORT = "8080"
    const cfg = loadConfig()
    expect(cfg.PORT).toBe(8080)
  })
})
