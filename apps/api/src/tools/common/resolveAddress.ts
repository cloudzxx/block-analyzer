import type { Tool, ToolContext, ToolResult } from "../types"
import type { Cache } from "../../cache/lru"
import { detectChain } from "../../shared/chain"

export function createResolveAddressTool(cache: Cache): Tool {
  return {
    name: "resolveAddress",
    description: "Analyze a user-provided string and determine if it is an Ethereum address, Solana address, or neither.",
    parameters: {
      type: "object",
      properties: { input: { type: "string", description: "The address or identifier to analyze" } },
      required: ["input"],
    },
    async execute(args: Record<string, unknown>): Promise<ToolResult> {
      const input = (args.input as string).trim()
      const chain = detectChain(input)
      if (!chain) {
        return { success: false, error: `Unable to recognize "${input}" as a valid Ethereum or Solana address.` }
      }
      return { success: true, data: { chain, address: input, normalized: chain === "ethereum" ? input.toLowerCase() : input } }
    },
  }
}
