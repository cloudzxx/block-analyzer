import { describe, it, expect, beforeEach } from "bun:test"
import { loadConfig } from "./config"

describe("loadConfig", () => {
  beforeEach(() => {
    delete process.env.LLM_API_KEY
    delete process.env.LLM_MODEL
    delete process.env.LLM_BASE_URL
    delete process.env.OPENAI_API_KEY
    delete process.env.OPENAI_MODEL
    delete process.env.OPENAI_BASE_URL
    delete process.env.ETHERSCAN_API_KEY
    delete process.env.SOLSCAN_API_KEY
    delete process.env.PORT
    delete process.env.FRONTEND_ORIGIN
  })

  it("throws when required keys are missing", () => {
    expect(() => loadConfig()).toThrow("LLM")
  })

  it("returns config with defaults when only required keys set", () => {
    process.env.LLM_API_KEY = "sk-test"
    process.env.ETHERSCAN_API_KEY = "eth-test"
    process.env.SOLSCAN_API_KEY = "sol-test"
    const cfg = loadConfig()
    expect(cfg.LLM_API_KEY).toBe("sk-test")
    expect(cfg.PORT).toBe(3000)
    expect(cfg.LLM_MODEL).toBe("gpt-4o")
    expect(cfg.FRONTEND_ORIGIN).toBe("http://localhost:5173")
    expect(cfg.LLM_BASE_URL).toBe("https://api.openai.com/v1")
  })

  it("reads LLM_ prefixed env vars", () => {
    process.env.LLM_API_KEY = "llm-key"
    process.env.LLM_MODEL = "MiniMax-M2.7"
    process.env.LLM_BASE_URL = "https://api.minimax.chat/v1"
    process.env.ETHERSCAN_API_KEY = "eth"
    process.env.SOLSCAN_API_KEY = "sol"
    const cfg = loadConfig()
    expect(cfg.LLM_API_KEY).toBe("llm-key")
    expect(cfg.LLM_MODEL).toBe("MiniMax-M2.7")
    expect(cfg.LLM_BASE_URL).toBe("https://api.minimax.chat/v1")
  })

  it("reads custom PORT from env", () => {
    process.env.LLM_API_KEY = "sk-test"
    process.env.ETHERSCAN_API_KEY = "eth-test"
    process.env.SOLSCAN_API_KEY = "sol-test"
    process.env.PORT = "8080"
    const cfg = loadConfig()
    expect(cfg.PORT).toBe(8080)
  })
})
