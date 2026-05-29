import express from "express"
import { loadConfig } from "../shared/config"
import { initDb } from "../db/index"
import { corsMiddleware } from "./middleware/cors"
import { errorHandler } from "./middleware/error"
import { createChatRouter } from "./routes/chat"
import { createSessionsRouter } from "./routes/sessions"
import { ToolRegistry } from "../agent/registry"
import { AgentExecutor } from "../agent/executor"
import { createCache } from "../cache/lru"
import { EtherscanProvider } from "../providers/etherscan"
import { SolscanProvider } from "../providers/solscan"
import { CoinGeckoProvider } from "../providers/coingecko"
import { createEthGetBalanceTool } from "../tools/eth/getBalance"
import { createEthGetTransactionsTool } from "../tools/eth/getTransactions"
import { createEthGetTxDetailTool } from "../tools/eth/getTxDetail"
import { createEthGetTokenBalanceTool } from "../tools/eth/getTokenBalance"
import { createEthGetTokenTransfersTool } from "../tools/eth/getTokenTransfers"
import { createEthGetContractABITool } from "../tools/eth/getContractABI"
import { createEthGetGasPriceTool } from "../tools/eth/getGasPrice"
import { createEthGetNFTsTool } from "../tools/eth/getNFTs"
import { createEthGetTopHoldersTool } from "../tools/eth/getTopHolders"
import { createSolGetBalanceTool } from "../tools/sol/getBalance"
import { createSolGetTransactionsTool } from "../tools/sol/getTransactions"
import { createSolGetTxDetailTool } from "../tools/sol/getTxDetail"
import { createSolGetTokenBalancesTool } from "../tools/sol/getTokenBalances"
import { createSolGetTokenTransfersTool } from "../tools/sol/getTokenTransfers"
import { createSolGetAccountInfoTool } from "../tools/sol/getAccountInfo"
import { createResolveAddressTool } from "../tools/common/resolveAddress"
import { createGetEthPriceTool } from "../tools/common/getEthPrice"
import { createResolveENSTool } from "../tools/common/resolveENS"
import { createSearchTokenTool } from "../tools/common/searchToken"
import { createAnalysisRouter } from "./routes/analysis"
import { AnalysisExecutor as AnalysisExecutorClass } from "../analysis/executor"

// === 应用入口：初始化所有依赖并启动 Express 服务 ===

// 1. 配置
const config = loadConfig()
initDb()

// 2. 基础设施
const cache = createCache()
const registry = new ToolRegistry()

// 3. 区块链数据源（Provider）
const etherscan = new EtherscanProvider(config.ETHERSCAN_API_KEY)
const solscan = new SolscanProvider(config.SOLSCAN_API_KEY)
const coingecko = new CoinGeckoProvider()

// 4. 注册 19 个工具（9 ETH + 6 SOL + 4 通用）
registry.register(createEthGetBalanceTool(etherscan, cache))
registry.register(createEthGetTransactionsTool(etherscan, cache))
registry.register(createEthGetTxDetailTool(etherscan, cache))
registry.register(createEthGetTokenBalanceTool(etherscan, cache))
registry.register(createEthGetTokenTransfersTool(etherscan, cache))
registry.register(createEthGetContractABITool(etherscan, cache))
registry.register(createEthGetGasPriceTool(etherscan, cache))
registry.register(createEthGetNFTsTool(etherscan, cache))
registry.register(createEthGetTopHoldersTool(etherscan, cache))
registry.register(createSolGetBalanceTool(solscan, cache))
registry.register(createSolGetTransactionsTool(solscan, cache))
registry.register(createSolGetTxDetailTool(solscan, cache))
registry.register(createSolGetTokenBalancesTool(solscan, cache))
registry.register(createSolGetTokenTransfersTool(solscan, cache))
registry.register(createSolGetAccountInfoTool(solscan, cache))
registry.register(createResolveAddressTool(cache))
registry.register(createGetEthPriceTool(coingecko, cache))
registry.register(createResolveENSTool(cache))
registry.register(createSearchTokenTool(cache))

// 5. Agent 与分析执行器
const executor = new AgentExecutor(config, registry, cache)
const analysisExecutor = new AnalysisExecutorClass(config, cache)

// 6. Express 应用
const app = express()
app.use(express.json())
app.use(corsMiddleware(config.FRONTEND_ORIGIN))
app.use("/api", createChatRouter(executor))
app.use("/api", createSessionsRouter())
app.use("/api", createAnalysisRouter(analysisExecutor))
app.use(errorHandler)

app.listen(config.PORT, () => {
  console.log(`Block Analyzer server running on http://localhost:${config.PORT}`)
})
