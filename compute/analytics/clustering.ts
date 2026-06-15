import type { AnalysisReport } from "./types"

// MEV / 私有订单流（Flashbots）行为识别
//
// 设计思路 —— 区分两类截然不同的 MEV 参与者：
//   1. 搜索者机器人 (searcher bot)：跑套利/三明治/清算，特征是同块多笔交易、
//      抢占区块顶部 (transactionIndex 0)、高失败率（竞价失败的机会会 revert）、
//      通过私有 relay 提交（gasPrice=0 + coinbase 转账支付矿工）。
//   2. 受保护用户 (protected user)：使用 Flashbots Protect RPC 私有提交交易，
//      避免被三明治攻击。这是「好」行为，不是机器人，不应判为风险。
//
// 仅凭 Etherscan txlist 可获取的字段做确定性判断，不臆测。

export interface EthTxForClustering {
  hash: string
  from: string
  to: string
  value: string            // wei
  timeStamp: string
  blockNumber: string
  gasPrice: string         // wei（EIP-1559 后为 effective gas price）
  gasUsed?: string
  transactionIndex: string
  isError?: string         // "1" = reverted
}

export type MevClassification =
  | "none"
  | "protected_user"       // 用 Flashbots Protect 自保的普通用户
  | "mev_active"           // 有 MEV 行为但不足以判定为机器人
  | "searcher_bot"         // 套利/三明治/清算搜索者机器人

export interface MevAnalysis {
  classification: MevClassification
  // 通过私有 relay 提交的交易数（gasPrice=0 且成功落块）
  privateTxCount: number
  // 同块多笔交易的区块（批量提交 / bundle 特征）
  multiTxBlocks: Array<{ blockNumber: string; txCount: number }>
  // 落在区块顶部 (index 0) 的交易数 —— 套利/清算需要抢先
  topOfBlockCount: number
  // 失败交易数与占比 —— 搜索者竞价失败会大量 revert
  failedTxCount: number
  failedRatio: number
  signals: Array<{ label: string; severity: "info" | "warning" | "critical" }>
}

const PRIVATE_GAS_PRICE = "0"

export function analyzeMevPatterns(
  txs: EthTxForClustering[],
  accountType?: AnalysisReport["accountType"],
): MevAnalysis {
  const empty: MevAnalysis = {
    classification: "none",
    privateTxCount: 0,
    multiTxBlocks: [],
    topOfBlockCount: 0,
    failedTxCount: 0,
    failedRatio: 0,
    signals: [],
  }
  if (txs.length === 0) return empty

  // 按区块分组，统计每块交易数
  const blockTxCount = new Map<string, number>()
  let privateTxCount = 0
  let topOfBlockCount = 0
  let failedTxCount = 0

  for (const tx of txs) {
    const block = tx.blockNumber || ""
    if (block) blockTxCount.set(block, (blockTxCount.get(block) || 0) + 1)

    const failed = tx.isError === "1"
    if (failed) failedTxCount++

    // 私有 relay 信号：成功落块但 gasPrice=0（公共内存池矿工不会打包 0 gas 交易，
    // 说明通过 Flashbots/builder 私有订单流提交，矿工费用以 coinbase 转账支付）
    if (tx.gasPrice === PRIVATE_GAS_PRICE && !failed) privateTxCount++

    // 区块顶部：套利/清算机器人需抢占第一个位置
    if (tx.transactionIndex === "0") topOfBlockCount++
  }

  const multiTxBlocks = [...blockTxCount.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .map(([blockNumber, txCount]) => ({ blockNumber, txCount }))

  const failedRatio = txs.length > 0 ? failedTxCount / txs.length : 0

  // 决策树分类
  const isContract = accountType?.type === "contract"
  const heavyBatching = multiTxBlocks.length >= 2
  const aggressivePositioning = topOfBlockCount >= 3
  const highFailureRate = failedRatio >= 0.3 && txs.length >= 5

  let classification: MevClassification = "none"

  if ((heavyBatching || aggressivePositioning) && (highFailureRate || isContract || privateTxCount >= 3)) {
    // 同块批量 / 抢顶部，叠加高失败率或合约账户或大量私有提交 → 搜索者机器人
    classification = "searcher_bot"
  } else if (heavyBatching || aggressivePositioning || privateTxCount >= 3) {
    classification = "mev_active"
  } else if (privateTxCount > 0) {
    // 仅有少量私有提交、无批量/抢位特征 → 用 Flashbots Protect 自保的普通用户
    classification = "protected_user"
  }

  const signals = buildSignals({
    classification,
    privateTxCount,
    multiTxBlocks,
    topOfBlockCount,
    failedTxCount,
    failedRatio,
  })

  return {
    classification,
    privateTxCount,
    multiTxBlocks,
    topOfBlockCount,
    failedTxCount,
    failedRatio,
    signals,
  }
}

function buildSignals(a: Omit<MevAnalysis, "signals">): MevAnalysis["signals"] {
  const signals: MevAnalysis["signals"] = []

  if (a.classification === "searcher_bot") {
    signals.push({
      label: `MEV searcher bot pattern: ${a.multiTxBlocks.length} multi-tx blocks, ${a.topOfBlockCount} top-of-block placements, ${(a.failedRatio * 100).toFixed(0)}% failed tx`,
      severity: "warning",
    })
  } else if (a.classification === "mev_active") {
    signals.push({
      label: `MEV-active behavior: ${a.multiTxBlocks.length} multi-tx blocks, ${a.privateTxCount} private-relay tx`,
      severity: "info",
    })
  } else if (a.classification === "protected_user") {
    signals.push({
      label: `Uses private order flow (Flashbots Protect) — ${a.privateTxCount} tx submitted privately to avoid sandwich attacks`,
      severity: "info",
    })
  }

  if (a.privateTxCount > 0 && a.classification !== "protected_user") {
    signals.push({
      label: `${a.privateTxCount} transactions via private relay (gasPrice 0, builder-paid)`,
      severity: "info",
    })
  }

  if (a.failedRatio >= 0.3 && a.failedTxCount >= 3) {
    signals.push({
      label: `High failed-tx ratio (${(a.failedRatio * 100).toFixed(0)}%) — consistent with competitive MEV bidding`,
      severity: "info",
    })
  }

  return signals
}
