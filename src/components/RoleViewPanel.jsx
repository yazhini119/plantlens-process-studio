import { BarChart3, ClipboardCheck, FileSearch, Wrench } from 'lucide-react'
import { getConnections, getEquipmentList } from '../services/plantlensApi'

function healthFromNode(node) {
  if (node.status === 'origin' || node.status === 'alarm') return 61
  if (node.status === 'downstream' || node.status === 'impacted') return 76
  if (node.status === 'inactive') return 88
  return 94
}

function summarizeProductionLoss(kpis) {
  const bottles = kpis.find((item) => item.label === 'Bottles/min')?.value ?? '18'
  return `${Math.max(0, 24 - Number.parseFloat(bottles || 0)).toFixed(0)} bottles/min at risk`
}

export function RoleViewPanel({ role, layout, kpis, selectedDetails, onShowHistory, onFocusAffected }) {
  if (role === 'operator' || role === 'engineer') return null

  const equipment = getEquipmentList(layout)
  const connections = getConnections(layout)
  const healthItems = equipment.slice(0, 5).map((node) => ({
    tag: node.tag,
    label: node.label,
    score: healthFromNode(node),
    status: node.status,
  }))

  if (role === 'maintenance') {
    return (
      <aside className="role-view-panel maintenance-view-panel">
        <header>
          <div>
            <span>Maintenance View</span>
            <strong>Health, tickets, and service actions</strong>
          </div>
          <Wrench size={16} />
        </header>
        <div className="role-health-list">
          {healthItems.map((item) => (
            <article key={item.tag}>
              <div>
                <strong>{item.tag}</strong>
                <span>{item.label}</span>
              </div>
              <em className={item.score < 70 ? 'critical' : item.score < 85 ? 'warning' : ''}>{item.score}%</em>
            </article>
          ))}
        </div>
        <div className="role-action-grid">
          <button type="button" onClick={onFocusAffected}>
            <ClipboardCheck size={14} />
            Show service assets
          </button>
          <button type="button" onClick={onShowHistory}>
            <FileSearch size={14} />
            Service history
          </button>
        </div>
        <div className="role-note">
          <span>Open ticket</span>
          <strong>{selectedDetails?.tag ?? layout.insight.origin}: inspect suction line, filter blockage, pump wear, and downstream fill impact.</strong>
        </div>
      </aside>
    )
  }

  return (
    <aside className="role-view-panel manager-view-panel">
      <header>
        <div>
          <span>Manager View</span>
          <strong>KPI summary and incident reporting</strong>
        </div>
        <BarChart3 size={16} />
      </header>
      <div className="manager-kpi-grid">
        {kpis.map((item) => (
          <article key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>
      <div className="role-note">
        <span>Production loss</span>
        <strong>{summarizeProductionLoss(kpis)}</strong>
      </div>
      <div className="role-note">
        <span>Incident report</span>
        <strong>{layout.insight.title}. {connections.length} structured connections available for RCA traceability.</strong>
      </div>
      <div className="role-action-grid">
        <button type="button" onClick={onShowHistory}>
          <FileSearch size={14} />
          RCA report
        </button>
        <button type="button" onClick={onFocusAffected}>
          <ClipboardCheck size={14} />
          Impact summary
        </button>
      </div>
    </aside>
  )
}
