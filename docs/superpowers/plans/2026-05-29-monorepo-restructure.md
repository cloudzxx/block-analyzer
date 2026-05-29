# Monorepo DApp Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure flat `src/` into monorepo with `apps/api/` (backend, layers) + `apps/web/` (frontend, features)

**Architecture:** Keep backend layers exact, reorganize frontend by feature domain

**Tech Stack:** Bun, Express, Vite, React 19, TypeScript

---

### Task 1: Create monorepo directory scaffold

**Files:**
- Create: `apps/api/src/`
- Create: `apps/api/data/`
- Create: `apps/web/`
- Create: `packages/` (placeholder)

- [ ] **Step 1: Create directories**

```bash
mkdir -p apps/api/src apps/api/data apps/web packages
```

- [ ] **Step 2: Create `apps/api/package.json`**

Content:
```json
{
  "name": "block-analyzer-api",
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "test": "bun test",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "express": "^5.1.0",
    "lru-cache": "^11.0.0"
  },
  "devDependencies": {
    "@types/express": "^5.0.0",
    "typescript": "^5.7.0",
    "@types/bun": "latest"
  }
}
```

- [ ] **Step 3: Create `apps/api/tsconfig.json`**

Content:
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["bun"]
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/package.json apps/api/tsconfig.json
git commit -m "chore: scaffold apps/api with package.json and tsconfig"
```

---

### Task 2: Move all backend source files into `apps/api/src/`

**Files:**
- Move: `src/{agent,analysis,cache,db,providers,tools,server}/` → `apps/api/src/`
- Move: `src/shared/` → `apps/api/src/shared/`
- Move: `src/server/index.ts` → `apps/api/src/index.ts`

None of the backend files change content — only location. All relative imports within the backend (`../shared/`, `../../providers/`, etc.) are preserved because the directory depth is the same.

- [ ] **Step 1: Move directories**

```bash
for dir in agent analysis cache db providers tools server; do
  mv src/$dir apps/api/src/$dir
done
mv src/shared apps/api/src/shared
```

- [ ] **Step 2: Rename entry point**

`apps/api/src/server/index.ts` → `apps/api/src/index.ts` (top-level entry is cleaner)

```bash
git mv apps/api/src/server/index.ts apps/api/src/index.ts
```

- [ ] **Step 3: Update the import in `apps/api/src/index.ts`**

The entry point previously imported routes from `./routes/...` — since it moved from `server/` to `apps/api/src/`, the relative import `./routes/chat` stays the same because routes are also now at `apps/api/src/routes/chat`.

No import changes needed.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/
git rm -r src/agent src/analysis src/cache src/db src/providers src/tools src/server src/shared
git commit -m "refactor: move backend sources into apps/api/src"
```

---

### Task 3: Move frontend sources into `apps/web/`

**Files:**
- Move: `src/frontend/` → `apps/web/`

- [ ] **Step 1: Move entire frontend directory**

```bash
mv src/frontend apps/web
```

- [ ] **Step 2: Update `apps/web/package.json` name**

Change `"name": "block-analyzer-frontend"` to `"name": "block-analyzer-web"`.

- [ ] **Step 3: Update `apps/web/vite.config.ts` proxy path**

The dev proxy `/api → localhost:3030` stays — no change needed since backend port is unchanged.

- [ ] **Step 4: Remove old `src/` if empty**

```bash
rmdir src 2>/dev/null || true
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/
git rm -r src/frontend
git commit -m "refactor: move frontend into apps/web"
```

---

### Task 4: Restructure frontend into feature-based organization

**Files:**
- Create: `apps/web/src/features/chat/components/`
- Create: `apps/web/src/features/chat/hooks/`
- Create: `apps/web/src/features/analysis/components/`
- Create: `apps/web/src/features/analysis/hooks/`
- Create: `apps/web/src/features/sessions/components/`
- Create: `apps/web/src/features/sessions/hooks/`
- Create: `apps/web/src/components/ui/`
- Create: `apps/web/src/hooks/` (shared)
- Create: `apps/web/src/services/`
- Create: `apps/web/src/constants/`

**Current → Target mapping:**

| Current path | Target path |
|---|---|
| components/ChatMessage.tsx + .module.css | features/chat/components/ |
| components/ToolCallCard.tsx | features/chat/components/ |
| components/BalanceCard.tsx | features/chat/components/ |
| components/TransactionTable.tsx | features/chat/components/ |
| components/PriceCard.tsx | features/chat/components/ |
| hooks/useChat.ts | features/chat/hooks/ |
| components/AnalyzeView.tsx | features/analysis/components/ |
| components/AnalyzeInput.tsx | features/analysis/components/ |
| components/AnalyzeProgress.tsx | features/analysis/components/ |
| components/AnalysisReport.tsx | features/analysis/components/ |
| components/ReportOverview.tsx | features/analysis/components/ |
| components/ReportActivity.tsx | features/analysis/components/ |
| components/ReportCounterparties.tsx | features/analysis/components/ |
| components/ReportRisk.tsx | features/analysis/components/ |
| components/ReportInsights.tsx | features/analysis/components/ |
| hooks/useAnalysis.ts | features/analysis/hooks/ |
| components/SessionList.tsx | features/sessions/components/ |
| hooks/useSessions.ts | features/sessions/hooks/ |
| components/TopBar.tsx + .module.css | components/ui/ |
| components/Sidebar.tsx + .module.css | components/ui/ |
| components/PillRow.tsx + .module.css | components/ui/ |
| components/AddressBadge.tsx | components/ui/ |
| components/CapabilitiesShowcase.tsx | components/ui/ |
| components/QueryTemplates.tsx | components/ui/ |
| components/SavedAddresses.tsx | components/ui/ |
| hooks/useChain.ts | hooks/ (shared) |
| hooks/useSavedAddresses.ts | hooks/ (shared) |
| types/index.ts | types/ (keep) + extract data → constants/ |
| (new) | services/api.ts |
| App.tsx, App.module.css, index.css, main.tsx, vite-env.d.ts | same level (src/) |

- [ ] **Step 1: Create all target directories**

```bash
cd apps/web/src
mkdir -p features/chat/components features/chat/hooks
mkdir -p features/analysis/components features/analysis/hooks
mkdir -p features/sessions/components features/sessions/hooks
mkdir -p components/ui hooks services constants
```

- [ ] **Step 2: Move chat feature files**

```bash
git mv components/ChatMessage.tsx features/chat/components/
git mv components/ChatMessage.module.css features/chat/components/
git mv components/ToolCallCard.tsx features/chat/components/
git mv components/BalanceCard.tsx features/chat/components/
git mv components/TransactionTable.tsx features/chat/components/
git mv components/PriceCard.tsx features/chat/components/
git mv hooks/useChat.ts features/chat/hooks/
```

- [ ] **Step 3: Move analysis feature files**

```bash
git mv components/AnalyzeView.tsx features/analysis/components/
git mv components/AnalyzeInput.tsx features/analysis/components/
git mv components/AnalyzeProgress.tsx features/analysis/components/
git mv components/AnalysisReport.tsx features/analysis/components/
git mv components/ReportOverview.tsx features/analysis/components/
git mv components/ReportActivity.tsx features/analysis/components/
git mv components/ReportCounterparties.tsx features/analysis/components/
git mv components/ReportRisk.tsx features/analysis/components/
git mv components/ReportInsights.tsx features/analysis/components/
git mv hooks/useAnalysis.ts features/analysis/hooks/
```

- [ ] **Step 4: Move sessions feature files**

```bash
git mv components/SessionList.tsx features/sessions/components/
git mv hooks/useSessions.ts features/sessions/hooks/
```

- [ ] **Step 5: Move shared UI components**

```bash
git mv components/TopBar.tsx components/ui/
git mv components/TopBar.module.css components/ui/
git mv components/Sidebar.tsx components/ui/
git mv components/Sidebar.module.css components/ui/
git mv components/PillRow.tsx components/ui/
git mv components/PillRow.module.css components/ui/
git mv components/AddressBadge.tsx components/ui/
git mv components/CapabilitiesShowcase.tsx components/ui/
git mv components/QueryTemplates.tsx components/ui/
git mv components/SavedAddresses.tsx components/ui/
```

- [ ] **Step 6: Extract constants from types/index.ts**

Create `constants/index.ts`:
```typescript
import type { QuickAction, QueryTemplate, Capability } from "../types"

export const QUICK_ACTIONS: QuickAction[] = [
  { name: "eth_getBalance", description: "Check ETH balance", chain: "ethereum", example: "0x..." },
  { name: "sol_getBalance", description: "Check SOL balance", chain: "solana", example: "7Ec..." },
  { name: "eth_getTransactions", description: "Recent ETH transactions", chain: "ethereum", example: "0x..." },
  { name: "sol_getTransactions", description: "Recent SOL transactions", chain: "solana", example: "7Ec..." },
]

export const QUERY_TEMPLATES: QueryTemplate[] = [
  { name: "Analyze Wallet", template: "Analyze this wallet: {{address}}", chain: "both" },
  { name: "Check Balance", template: "What is the balance of {{address}}?", chain: "both" },
  { name: "Recent Activity", template: "Show me recent transactions for {{address}}", chain: "both" },
]

export const CAPABILITIES: Capability[] = [
  { name: "eth_getBalance", description: "Check ETH balance (Ethereum)", chain: "ethereum", example: "0x..." },
  { name: "eth_getTransactions", description: "Recent ETH transactions", chain: "ethereum", example: "0x..." },
  { name: "eth_getTxDetail", description: "Transaction details", chain: "ethereum", example: "0x..." },
  { name: "eth_getTokenBalance", description: "ERC-20 token balance", chain: "ethereum", example: "0x..." },
  { name: "eth_getTokenTransfers", description: "ERC-20 token transfers", chain: "ethereum", example: "0x..." },
  { name: "eth_getContractABI", description: "Contract ABI", chain: "ethereum", example: "0x..." },
  { name: "eth_getGasPrice", description: "Current gas price", chain: "ethereum", example: "" },
  { name: "eth_getNFTs", description: "NFT holdings", chain: "ethereum", example: "0x..." },
  { name: "eth_getTopHolders", description: "Top token holders", chain: "ethereum", example: "0x..." },
  { name: "sol_getBalance", description: "Check SOL balance", chain: "solana", example: "7Ec..." },
  { name: "sol_getTransactions", description: "Recent SOL transactions", chain: "solana", example: "7Ec..." },
  { name: "sol_getTxDetail", description: "Transaction details (Solana)", chain: "solana", example: "5x..." },
  { name: "sol_getTokenBalances", description: "SPL token balances", chain: "solana", example: "7Ec..." },
  { name: "sol_getTokenTransfers", description: "SPL token transfers", chain: "solana", example: "7Ec..." },
  { name: "sol_getAccountInfo", description: "Account info (Solana)", chain: "solana", example: "7Ec..." },
  { name: "getEthPrice", description: "ETH/SOL → USD price", chain: "both", example: "" },
  { name: "resolveAddress", description: "Auto-detect chain from address", chain: "both", example: "0x... or 7Ec..." },
  { name: "resolveENS", description: "ENS name → address", chain: "ethereum", example: "vitalik.eth" },
  { name: "searchToken", description: "Search token by symbol/name", chain: "both", example: "USDC" },
]
```

- [ ] **Step 7: Strip data from types/index.ts**

Current `types/index.ts` contains both interface definitions AND data arrays (`QUICK_ACTIONS`, `QUERY_TEMPLATES`, `CAPABILITIES`). Remove the data arrays to leave only interfaces:

```typescript
export interface QuickAction {
  name: string
  description: string
  chain: string
  example: string
}

export interface QueryTemplate {
  name: string
  template: string
  chain: string
}

export interface Capability {
  name: string
  description: string
  chain: string
  example: string
}
```

(Remove the const arrays and their exports.)

- [ ] **Step 8: Create `services/api.ts`**

Lightweight fetch wrapper for API calls:
```typescript
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json() as Promise<T>
}

export function apiPostSSE(path: string, body: unknown): EventSource {
  // SSE via fetch + ReadableStream (used by useChat/useAnalysis hooks)
  throw new Error("Use fetch + ReadableStream directly in hooks")
}
```

- [ ] **Step 9: Move shared hooks**

```bash
git mv hooks/useChain.ts hooks/useChain.ts  # stays in hooks/ is correct
git mv hooks/useSavedAddresses.ts hooks/useSavedAddresses.ts  # stays
```

These are already at the right level.

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/
git commit -m "refactor: reorganize frontend into features/ + components/ui/ + constants/"
```

---

### Task 5: Update frontend imports

**Files:**
- Modify: `apps/web/src/App.tsx` (all component imports + constants)
- Modify: `apps/web/src/App.module.css` (CSS module imports unchanged — bundled via Vite)
- Modify: `apps/web/src/features/chat/components/ChatMessage.tsx`
- Modify: `apps/web/src/features/analysis/components/AnalyzeView.tsx`
- Modify: `apps/web/src/features/analysis/components/AnalysisReport.tsx`
- Modify: `apps/web/src/components/ui/Sidebar.tsx`
- Modify: `apps/web/src/components/ui/TopBar.tsx`
- Modify: `apps/web/src/components/ui/PillRow.tsx`

All import paths in these files reference `./components/Xxx` or `./hooks/Xxx` — they need updating to the new paths.

- [ ] **Step 1: Update `App.tsx` imports**

Current imports and their new paths:
```
./components/TopBar → ./components/ui/TopBar
./components/Sidebar → ./components/ui/Sidebar
./components/PillRow → ./components/ui/PillRow
./components/ChatMessage → ./features/chat/components/ChatMessage
./components/ToolCallCard → ./features/chat/components/ToolCallCard
./components/AnalyzeView → ./features/analysis/components/AnalyzeView
./components/AnalyzeInput → ./features/analysis/components/AnalyzeInput
./hooks/useChat → ./features/chat/hooks/useChat
./hooks/useAnalysis → ./features/analysis/hooks/useAnalysis
./hooks/useChain → ./hooks/useChain
./types → ./types
```

Replace all imports in `App.tsx` to match.

- [ ] **Step 2: Update `Sidebar.tsx` imports**

```
./SessionList → ../features/sessions/components/SessionList
./SavedAddresses → ./SavedAddresses  (same dir)
./QueryTemplates → ./QueryTemplates  (same dir)
./CapabilitiesShowcase → ./CapabilitiesShowcase (same dir)
./hooks/useSessions → ../features/sessions/hooks/useSessions
./hooks/useChain → ../hooks/useChain
```

- [ ] **Step 3: Update `ChatMessage.tsx` imports**

```
./BalanceCard → ./BalanceCard  (same dir now)
./TransactionTable → ./TransactionTable  (same dir)
./PriceCard → ./PriceCard  (same dir)
./ToolCallCard → ./ToolCallCard  (same dir)
../types → ../../types
```

- [ ] **Step 4: Update `AnalyzeView.tsx` imports**

```
./AnalyzeInput → ./AnalyzeInput  (same dir)
./AnalyzeProgress → ./AnalyzeProgress  (same dir)
./AnalysisReport → ./AnalysisReport  (same dir)
../hooks/useAnalysis → ../hooks/useAnalysis  (same relative)
```

- [ ] **Step 5: Update `AnalysisReport.tsx` imports**

```
./ReportOverview → ./ReportOverview  (same dir)
./ReportActivity → ./ReportActivity  (same dir)
./ReportCounterparties → ./ReportCounterparties  (same dir)
./ReportRisk → ./ReportRisk  (same dir)
./ReportInsights → ./ReportInsights  (same dir)
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/
git commit -m "refactor: update frontend imports for new feature-based structure"
```

---

### Task 6: Update root configuration files

**Files:**
- Modify: `package.json` (root — workspace setup, scripts)
- Modify: `.gitignore` (new paths, data/ location)
- Create: `apps/web/tsconfig.json` (already exists from move, update if needed)

- [ ] **Step 1: Update root `package.json`**

Replace with workspace setup:
```json
{
  "name": "block-analyzer",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev:api": "bun --watch apps/api/src/index.ts",
    "dev:web": "cd apps/web && bun run dev",
    "dev": "concurrently \"bun run dev:api\" \"bun run dev:web\"",
    "test": "bun test apps/api",
    "test:web": "cd apps/web && bun run build",
    "lint": "cd apps/api && tsc --noEmit"
  },
  "devDependencies": {
    "concurrently": "^9.0.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Update `.gitignore`**

```
node_modules/
dist/
.env
apps/api/data/*.db*
apps/api/data/*.db-shm
apps/api/data/*.db-wal
.superpowers/
```

- [ ] **Step 3: Update `apps/web/tsconfig.json`**

Ensure paths are correct after the move (the `include: ["src"]` is already correct relative to `apps/web/`).

- [ ] **Step 4: Commit**

```bash
git add package.json .gitignore apps/web/tsconfig.json
git commit -m "chore: update root configuration for monorepo workspaces"
```

---

### Task 7: Verify everything works

- [ ] **Step 1: Run backend tests**

```bash
cd apps/api && bun test
```
Expected: All 81+ tests pass.

- [ ] **Step 2: Type-check backend**

```bash
cd apps/api && tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Type-check frontend**

```bash
cd apps/web && tsc --noEmit
```
Expected: No errors.

- [ ] **Step 4: Build frontend**

```bash
cd apps/web && bun run build
```
Expected: vite build succeeds, outputs to `dist/`.

- [ ] **Step 5: Quick smoke test (start backend)**

```bash
cd apps/api && timeout 3 bun run src/index.ts 2>&1 || true
```
Expected: Server starts, "Server running on port 3030" in output (or error about missing API keys).

- [ ] **Step 6: Fix any failures**

If any step fails, fix the issue (likely an import path or tsconfig misconfiguration) and re-run.

- [ ] **Step 7: Commit any fixes**

```bash
git add -A
git commit -m "fix: correct import paths and configs after restructure"
```
