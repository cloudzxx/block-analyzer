import type { AnalysisReport as ReportType } from "@/types"
import { ReportOverview } from "./ReportOverview"
import { ReportActivity } from "./ReportActivity"
import { ReportTokenActivity } from "./ReportTokenActivity"
import { ReportCounterparties } from "./ReportCounterparties"
import { ReportMev } from "./ReportMev"
import { ReportRisk } from "./ReportRisk"
import { ReportInsights } from "./ReportInsights"

interface Props { report: ReportType }

export function AnalysisReport({ report }: Props) {
  return (
    <div style={{ maxWidth: 700, margin: "0 auto" }}>
      <ReportOverview
        label={report.label}
        address={report.address}
        resolvedAddress={report.resolvedAddress}
        balance={report.balance}
        chain={report.chain}
        accountType={report.accountType}
      />
      <ReportActivity
        txCount={report.transactions.count}
        timeRange={report.transactions.timeRange}
        chain={report.chain}
      />
      <ReportTokenActivity
        chain={report.chain}
        ethTransferVolume={report.transactions.ethTransferVolume}
        topTokens={report.transactions.topTokens}
        programActivity={report.transactions.programActivity}
        tokenTransferVolume={report.transactions.tokenTransferVolume}
      />
      <ReportCounterparties counterparties={report.transactions.topCounterparties} />
      <ReportMev mev={report.mev} />
      <ReportRisk score={report.risk.score} flags={report.risk.flags} />
      <ReportInsights insights={report.insights} />
    </div>
  )
}
