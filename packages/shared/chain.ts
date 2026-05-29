const ETH_REGEX = /^0x[0-9a-fA-F]{40}$/
const SOL_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export function isEthereumAddress(input: string): boolean {
  return ETH_REGEX.test(input)
}

export function isSolanaAddress(input: string): boolean {
  return SOL_REGEX.test(input)
}

export type Chain = "ethereum" | "solana"

export function detectChain(input: string): Chain | null {
  if (isEthereumAddress(input)) return "ethereum"
  if (isSolanaAddress(input)) return "solana"
  return null
}
