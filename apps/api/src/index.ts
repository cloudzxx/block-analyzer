import express from "express"
import { loadConfig } from "@shared/config"
import { initDb } from "@storage/warehouse/index"
import { corsMiddleware } from "./middleware/cors"
import { errorHandler } from "./middleware/error"
import { createChatRouter } from "./routes/chat"
import { createSessionsRouter } from "./routes/sessions"
import { ToolRegistry } from "@compute/agent/registry"
import { AgentExecutor } from "@compute/agent/executor"
import { createCache } from "@storage/cache/lru"
import { EtherscanProvider } from "@ingest/adapters/etherscan"
import { SolscanProvider } from "@ingest/adapters/solscan"
import { CoinGeckoProvider } from "@ingest/adapters/coingecko"
import { createEthGetBalanceTool } from "@compute/queries/eth/getBalance"
import { createEthGetTransactionsTool } from "@compute/queries/eth/getTransactions"
import { createEthGetTxDetailTool } from "@compute/queries/eth/getTxDetail"
import { createEthGetTokenBalanceTool } from "@compute/queries/eth/getTokenBalance"
import { createEthGetTokenTransfersTool } from "@compute/queries/eth/getTokenTransfers"
import { createEthGetContractABITool } from "@compute/queries/eth/getContractABI"
import { createEthGetGasPriceTool } from "@compute/queries/eth/getGasPrice"
import { createEthGetNFTsTool } from "@compute/queries/eth/getNFTs"
import { createEthGetTopHoldersTool } from "@compute/queries/eth/getTopHolders"
import { createSolGetBalanceTool } from "@compute/queries/sol/getBalance"
import { createSolGetTransactionsTool } from "@compute/queries/sol/getTransactions"
import { createSolGetTxDetailTool } from "@compute/queries/sol/getTxDetail"
import { createSolGetTokenBalancesTool } from "@compute/queries/sol/getTokenBalances"
import { createSolGetTokenTransfersTool } from "@compute/queries/sol/getTokenTransfers"
import { createSolGetAccountInfoTool } from "@compute/queries/sol/getAccountInfo"
import { createResolveAddressTool } from "@compute/queries/common/resolveAddress"
import { createGetEthPriceTool } from "@compute/queries/common/getEthPrice"
import { createResolveENSTool } from "@compute/queries/common/resolveENS"
import { createSearchTokenTool } from "@compute/queries/common/searchToken"
import { createAnalysisRouter } from "./routes/analysis"
import { AnalysisExecutor as AnalysisExecutorClass } from "@compute/analytics/executor"

// === 应用入口：初始化所有依赖并启动 Express 服务 ===

// 1. 配置
const config = loadConfig()
initDb("apps/api/data/data.db")

// 2. 基础设施
const cache = createCache()
const registry = new ToolRegistry()

// 3. 区块链数据源（Provider）
const etherscan = new EtherscanProvider(config.ETHERSCAN_API_KEY, config.ETHERSCAN_CHAIN_ID)
const solscan = new SolscanProvider(config.SOLSCAN_API_KEY, config.SOLSCAN_CLUSTER)
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

// 生产环境：serve 前端编译后的静态文件
app.use(express.static("apps/web/dist"))
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile("apps/web/dist/index.html", { root: process.cwd() })
})

app.use(errorHandler)

app.listen(config.PORT, () => {
  console.log(`Block Analyzer server running on http://localhost:${config.PORT}`)
})
