import { useState, useEffect, useCallback } from "react"
import type { SavedAddress, Chain } from "../types"

const STORAGE_KEY = "block-analyzer-addresses"

function load(): SavedAddress[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
  } catch { return [] }
}

export function useSavedAddresses() {
  const [addresses, setAddresses] = useState<SavedAddress[]>(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses))
  }, [addresses])

  const add = useCallback((label: string, address: string, chain: Chain) => {
    setAddresses((prev) => [...prev, { id: crypto.randomUUID(), label, address, chain }])
  }, [])

  const remove = useCallback((id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id))
  }, [])

  return { addresses, add, remove }
}
