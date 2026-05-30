import { describe, it, expect } from "bun:test"
import { buildSystemPrompt } from "./prompt"

describe("buildSystemPrompt", () => {
  it("returns a non-empty string", () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toBeString()
    expect(prompt.length).toBeGreaterThan(100)
  })

  it("includes the selected chain and its tool prefix", () => {
    const ethPrompt = buildSystemPrompt("ethereum")
    expect(ethPrompt).toContain("Ethereum")
    expect(ethPrompt).toContain("eth-prefixed")

    const solPrompt = buildSystemPrompt("solana")
    expect(solPrompt).toContain("Solana")
    expect(solPrompt).toContain("sol-prefixed")
  })

  it("defaults to Ethereum when chain is not provided", () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toContain("Ethereum")
    expect(prompt).toContain("eth-prefixed")
  })

  it("contains instruction to use tools", () => {
    const prompt = buildSystemPrompt("ethereum")
    expect(prompt).toContain("tool")
  })

  it("contains instruction about USD valuation", () => {
    const prompt = buildSystemPrompt("ethereum")
    expect(prompt.toLowerCase()).toContain("usd")
  })
})
