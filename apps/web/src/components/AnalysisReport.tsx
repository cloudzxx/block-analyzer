import type { AnalysisReport as ReportType } from "../types"
import { ReportOverview } from "./ReportOverview"
import { ReportActivity } from "./ReportActivity"
import { ReportCounterparties } from "./ReportCounterparties"
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
      />
      <ReportActivity
        txCount={report.transactions.count}
        timeRange={report.transactions.timeRange}
        chain={report.chain}
      />
      <ReportCounterparties counterparties={report.transactions.topCounterparties} />
      <ReportRisk score={report.risk.score} flags={report.risk.flags} />
      <ReportInsights insights={report.insights} />
    </div>
  )
}
