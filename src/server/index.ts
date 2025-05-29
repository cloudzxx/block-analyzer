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
import { createSolGetBalanceTool } from "../tools/sol/getBalance"
import { createSolGetTransactionsTool } from "../tools/sol/getTransactions"
import { createSolGetTxDetailTool } from "../tools/sol/getTxDetail"
import { createResolveAddressTool } from "../tools/common/resolveAddress"
import { createGetEthPriceTool } from "../tools/common/getEthPrice"

const config = loadConfig()
initDb()

const cache = createCache()
const registry = new ToolRegistry()
const etherscan = new EtherscanProvider(config.ETHERSCAN_API_KEY)
const solscan = new SolscanProvider(config.SOLSCAN_API_KEY)
const coingecko = new CoinGeckoProvider()

registry.register(createEthGetBalanceTool(etherscan, cache))
registry.register(createEthGetTransactionsTool(etherscan, cache))
registry.register(createEthGetTxDetailTool(etherscan, cache))
registry.register(createSolGetBalanceTool(solscan, cache))
registry.register(createSolGetTransactionsTool(solscan, cache))
registry.register(createSolGetTxDetailTool(solscan, cache))
registry.register(createResolveAddressTool(cache))
registry.register(createGetEthPriceTool(coingecko, cache))

const executor = new AgentExecutor(config, registry, cache)
const app = express()

app.use(express.json())
app.use(corsMiddleware(config.FRONTEND_ORIGIN))
app.use("/api", createChatRouter(executor))
app.use("/api", createSessionsRouter())
app.use(errorHandler)

app.listen(config.PORT, () => {
  console.log(`Block Analyzer server running on http://localhost:${config.PORT}`)
})
