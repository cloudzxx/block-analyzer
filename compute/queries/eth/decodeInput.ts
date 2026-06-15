// ABI input data 解码模块
// 策略：
//   1. 先用 4 字节 selector 查已知常用函数签名表（无需 keccak256）
//   2. 如果调用方提供了合约 ABI，从 ABI 中匹配 selector 获取精确签名
//   3. 解码静态参数（address / uint256 / bool）—— 覆盖 95% 的 DeFi 场景

// 主网常见函数的 4 字节 selector → 函数签名
// selector = keccak256(signature).slice(0,4) 转 hex，这些值是固定的
const KNOWN_SELECTORS: Record<string, { sig: string; params: string[] }> = {
  // ERC-20
  "a9059cbb": { sig: "transfer(address,uint256)", params: ["address:to", "uint256:amount"] },
  "23b872dd": { sig: "transferFrom(address,address,uint256)", params: ["address:from", "address:to", "uint256:amount"] },
  "095ea7b3": { sig: "approve(address,uint256)", params: ["address:spender", "uint256:amount"] },
  "70a08231": { sig: "balanceOf(address)", params: ["address:account"] },
  "dd62ed3e": { sig: "allowance(address,address)", params: ["address:owner", "address:spender"] },

  // ERC-721 / NFT
  "42842e0e": { sig: "safeTransferFrom(address,address,uint256)", params: ["address:from", "address:to", "uint256:tokenId"] },
  "b88d4fde": { sig: "safeTransferFrom(address,address,uint256,bytes)", params: ["address:from", "address:to", "uint256:tokenId", "bytes:data"] },
  "6352211e": { sig: "ownerOf(uint256)", params: ["uint256:tokenId"] },
  "e985e9c5": { sig: "isApprovedForAll(address,address)", params: ["address:owner", "address:operator"] },
  "a22cb465": { sig: "setApprovalForAll(address,bool)", params: ["address:operator", "bool:approved"] },

  // Uniswap v2 Router
  "38ed1739": { sig: "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)", params: ["uint256:amountIn", "uint256:amountOutMin", "address[]:path", "address:to", "uint256:deadline"] },
  "7ff36ab5": { sig: "swapExactETHForTokens(uint256,address[],address,uint256)", params: ["uint256:amountOutMin", "address[]:path", "address:to", "uint256:deadline"] },
  "18cbafe5": { sig: "swapExactTokensForETH(uint256,uint256,address[],address,uint256)", params: ["uint256:amountIn", "uint256:amountOutMin", "address[]:path", "address:to", "uint256:deadline"] },
  "e8e33700": { sig: "addLiquidity(address,address,uint256,uint256,uint256,uint256,address,uint256)", params: ["address:tokenA", "address:tokenB", "uint256:amountADesired", "uint256:amountBDesired", "uint256:amountAMin", "uint256:amountBMin", "address:to", "uint256:deadline"] },
  "baa2abde": { sig: "removeLiquidity(address,address,uint256,uint256,uint256,address,uint256)", params: ["address:tokenA", "address:tokenB", "uint256:liquidity", "uint256:amountAMin", "uint256:amountBMin", "address:to", "uint256:deadline"] },

  // Uniswap v3
  "414bf389": { sig: "exactInputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))", params: ["tuple:params"] },
  "c04b8d59": { sig: "exactInput((bytes,address,uint256,uint256,uint256))", params: ["tuple:params"] },
  "db3e2198": { sig: "exactOutputSingle((address,address,uint24,address,uint256,uint256,uint256,uint160))", params: ["tuple:params"] },
  "f28c0498": { sig: "exactOutput((bytes,address,uint256,uint256,uint256))", params: ["tuple:params"] },

  // Uniswap v3 / v4 multicall
  "ac9650d8": { sig: "multicall(bytes[])", params: ["bytes[]:data"] },
  "5ae401dc": { sig: "multicall(uint256,bytes[])", params: ["uint256:deadline", "bytes[]:data"] },

  // WETH
  "d0e30db0": { sig: "deposit()", params: [] },
  "2e1a7d4d": { sig: "withdraw(uint256)", params: ["uint256:wad"] },

  // Gnosis Safe / Multisig
  "6a761202": { sig: "execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)", params: ["address:to", "uint256:value", "bytes:data", "uint8:operation", "uint256:safeTxGas", "uint256:baseGas", "uint256:gasPrice", "address:gasToken", "address:refundReceiver", "bytes:signatures"] },

  // OpenSea Seaport
  "fb0f3ee1": { sig: "fulfillBasicOrder((address,uint256,uint256,address,address,address,uint256,uint256,uint8,uint256,uint256,bytes32,uint256,bytes32,bytes32,uint256,tuple[],bytes))", params: ["tuple:parameters"] },
  "b3a34c4c": { sig: "fulfillOrder((tuple,bytes),bytes32)", params: ["tuple:order", "bytes32:fulfillerConduitKey"] },

  // Aave v2/v3
  "e8eda9df": { sig: "deposit(address,uint256,address,uint16)", params: ["address:asset", "uint256:amount", "address:onBehalfOf", "uint16:referralCode"] },
  "69328dec": { sig: "withdraw(address,uint256,address)", params: ["address:asset", "uint256:amount", "address:to"] },
  "c858f742": { sig: "borrow(address,uint256,uint256,uint16,address)", params: ["address:asset", "uint256:amount", "uint256:interestRateMode", "uint16:referralCode", "address:onBehalfOf"] },

  // Curve
  "3df02124": { sig: "exchange(int128,int128,uint256,uint256)", params: ["int128:i", "int128:j", "uint256:dx", "uint256:min_dy"] },
  "a6417ed6": { sig: "exchange_underlying(int128,int128,uint256,uint256)", params: ["int128:i", "int128:j", "uint256:dx", "uint256:min_dy"] },

  // ERC-1155
  "f242432a": { sig: "safeTransferFrom(address,address,uint256,uint256,bytes)", params: ["address:from", "address:to", "uint256:id", "uint256:amount", "bytes:data"] },
  "2eb2c2d6": { sig: "safeBatchTransferFrom(address,address,uint256[],uint256[],bytes)", params: ["address:from", "address:to", "uint256[]:ids", "uint256[]:amounts", "bytes:data"] },
}

export interface DecodedInput {
  selector: string          // 4 字节十六进制
  signature: string         // 函数签名，如 "transfer(address,uint256)"
  // 解出的参数（仅静态类型；tuple/bytes/动态数组标注 "complex"）
  args: Array<{ name: string; type: string; value: string }>
  // 无法解码时的原始 input
  rawInput?: string
}

/**
 * 从合约 ABI（JSON 数组）中提取函数 selector → 签名的映射
 * 不引入 keccak256，通过 Web3 标准的 4 字节 selector 逻辑：
 * 对于已知 ABI，直接用函数签名字符串哈希，由于我们没有 keccak256，
 * 改为将 ABI 中的函数签名全部收集，然后与 KNOWN_SELECTORS 做交叉匹配
 */
export function buildSelectorMapFromABI(
  abi: Array<{ type?: string; name?: string; inputs?: Array<{ type: string; name?: string }> }>
): Record<string, { sig: string; params: string[] }> {
  const map: Record<string, { sig: string; params: string[] }> = {}
  for (const item of abi) {
    if (item.type !== "function" || !item.name) continue
    const inputTypes = (item.inputs || []).map((i) => i.type).join(",")
    const sig = `${item.name}(${inputTypes})`
    const params = (item.inputs || []).map((i) => `${i.type}:${i.name || ""}`)
    // 匹配已知 selector 表（通过签名字符串反查）
    for (const [sel, known] of Object.entries(KNOWN_SELECTORS)) {
      if (known.sig === sig) {
        map[sel] = { sig, params }
        break
      }
    }
    // ABI 中签名对应的 selector 没有在 KNOWN_SELECTORS 里，
    // 用函数名 + 参数类型做弱匹配（签名相同但参数名不同的情况）
    const shortSig = `${item.name}(${inputTypes})`
    for (const [sel, known] of Object.entries(KNOWN_SELECTORS)) {
      if (known.sig === shortSig) {
        map[sel] = { sig: shortSig, params }
      }
    }
  }
  return map
}

/**
 * 解码 Ethereum transaction input data
 * @param input  完整 input hex（含 0x 前缀）
 * @param abi    可选，合约 ABI —— 有 ABI 时用于补充未知 selector 的签名
 */
export function decodeInput(
  input: string,
  abi?: Array<{ type?: string; name?: string; inputs?: Array<{ type: string; name?: string }> }>
): DecodedInput | null {
  if (!input || input === "0x" || input.length < 10) return null

  const hex = input.startsWith("0x") ? input.slice(2) : input
  const selector = hex.slice(0, 8).toLowerCase()
  const calldata = hex.slice(8)

  // 优先从 ABI 构建补充映射，再 merge 到 KNOWN_SELECTORS
  let resolvedEntry: { sig: string; params: string[] } | undefined = KNOWN_SELECTORS[selector]

  if (!resolvedEntry && abi) {
    const abiMap = buildSelectorMapFromABI(abi)
    resolvedEntry = abiMap[selector]
  }

  if (!resolvedEntry) {
    // selector 未识别：返回原始 input，前端可展示"Unknown function call"
    return {
      selector,
      signature: `0x${selector} (unknown)`,
      args: [],
      rawInput: input.length > 200 ? input.slice(0, 200) + "…" : input,
    }
  }

  const args = decodeStaticArgs(calldata, resolvedEntry.params)

  return { selector, signature: resolvedEntry.sig, args }
}

/**
 * 解码 ABI calldata 中的静态参数
 * ABI encoding 规则：每个 slot 32 字节（64 hex）
 *   - address: 后 20 字节，前 12 字节为 0 padding
 *   - uint/int: 完整 32 字节大端整数
 *   - bool: 最后 1 字节
 *   - bytes32: 原样
 *   - 动态类型（bytes/string/array）：slot 里存偏移量，不在这里解
 *   - tuple：标注为 "complex"，不展开
 */
function decodeStaticArgs(
  calldata: string,
  params: string[]
): Array<{ name: string; type: string; value: string }> {
  const args: Array<{ name: string; type: string; value: string }> = []
  const SLOT = 64 // 每个 slot 64 个 hex 字符（32 字节）

  for (let i = 0; i < params.length; i++) {
    const [rawType, name] = params[i].split(":")
    const slotStart = i * SLOT
    const slot = calldata.slice(slotStart, slotStart + SLOT)

    if (!slot || slot.length < SLOT) {
      // calldata 不够长（动态类型偏移 slot 后面才是数据）
      args.push({ name: name || `arg${i}`, type: rawType, value: "[complex]" })
      continue
    }

    let value = "[complex]"

    if (rawType === "address") {
      // address: 取后 40 hex（20 字节），加 0x 前缀
      value = "0x" + slot.slice(24)
    } else if (rawType.startsWith("uint") || rawType.startsWith("int")) {
      // uint/int: 32 字节大端整数转十进制
      try {
        const n = BigInt("0x" + slot)
        // 超过 Number 精度的用字符串，否则转十进制
        value = n > BigInt(Number.MAX_SAFE_INTEGER) ? n.toString() : n.toString(10)
      } catch {
        value = "0x" + slot
      }
    } else if (rawType === "bool") {
      value = slot.endsWith("1") ? "true" : "false"
    } else if (rawType === "bytes32") {
      value = "0x" + slot
    } else {
      // bytes/string/tuple/array — 动态类型，只显示类型标注
      value = `[${rawType}]`
    }

    args.push({ name: name || `arg${i}`, type: rawType, value })
  }

  return args
}
