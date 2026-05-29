import { useState, useCallback } from "react"
import type { Chain } from "../types"

export function useChain(defaultChain: Chain = "ethereum") {
  const [chain, setChain] = useState<Chain>(defaultChain)

  const toggleChain = useCallback(() => {
    setChain((c) => (c === "ethereum" ? "solana" : "ethereum"))
  }, [])

  return { chain, setChain, toggleChain }
}
