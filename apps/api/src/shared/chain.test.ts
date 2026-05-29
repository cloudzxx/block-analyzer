import { describe, it, expect } from "bun:test"
import { detectChain, isEthereumAddress, isSolanaAddress } from "./chain"

describe("isEthereumAddress", () => {
  it("returns true for valid Ethereum address", () => {
    expect(isEthereumAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")).toBe(true)
  })

  it("returns false for non-Ethereum address", () => {
    expect(isEthereumAddress("notAnAddress")).toBe(false)
  })

  it("returns true for all-lowercase hex address", () => {
    expect(isEthereumAddress("0x742d35cc6634c0532925a3b844b5d0f1c0a4c1e0")).toBe(true)
  })
})

describe("isSolanaAddress", () => {
  it("returns true for valid Solana address (base58, 44 chars)", () => {
    expect(isSolanaAddress("7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV")).toBe(true)
  })

  it("returns false for non-base58 string", () => {
    expect(isSolanaAddress("0x123")).toBe(false)
  })
})

describe("detectChain", () => {
  it("returns ethereum for 0x addresses", () => {
    expect(detectChain("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")).toBe("ethereum")
  })

  it("returns solana for base58 addresses", () => {
    expect(detectChain("7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV")).toBe("solana")
  })

  it("returns null for unrecognized input", () => {
    expect(detectChain("hello world")).toBeNull()
  })
})
