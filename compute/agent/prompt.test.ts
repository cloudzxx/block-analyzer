import { describe, it, expect } from "bun:test"
import { buildSystemPrompt } from "./prompt"

describe("buildSystemPrompt", () => {
  it("returns a non-empty string", () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toBeString()
    expect(prompt.length).toBeGreaterThan(100)
  })

  it("contains Ethereum and Solana mentions", () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toContain("Ethereum")
    expect(prompt).toContain("Solana")
  })

  it("contains instruction to use tools", () => {
    const prompt = buildSystemPrompt()
    expect(prompt).toContain("tool")
  })

  it("contains instruction about USD valuation", () => {
    const prompt = buildSystemPrompt()
    expect(prompt.toLowerCase()).toContain("usd")
  })
})
