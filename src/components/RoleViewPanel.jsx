import { BarChart3, ClipboardCheck, FileSearch, ShieldCheck, Wrench } from 'lucide-react'
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

function maintenanceNote(layout, selectedDetails) {
  const tag = selectedDetails?.tag ?? layout.insight.origin
  if (layout.kind === 'power-panel') {
    return `${tag}: verify MCB/fuse continuity, MFM polarity, inverter output, VFD status, RS485 termination, and motor temperature/vibration inputs.`
  }
  return `${tag}: inspect suction line, filter blockage, pump wear, and downstream fill impact.`
}

function impactSummary(layout, kpis) {
  if (layout.kind === 'power-panel') {
    const energy = kpis.find((item) => item.label === 'Energy Usage')?.value ?? 'live load'
    return `Inverter-drive chain under watch: ${energy}, motor/load stability, and RS485 telemetry risk.`
  }
  return summarizeProductionLoss(kpis)
}

export function RoleViewPanel({ role, layout, kpis, selectedDetails, onShowHistory, onFocusAffected }) {
  const equipment = getEquipmentList(layout)
  const connections = getConnections(layout)
  const healthItems = equipment.slice(0, 5).map((node) => ({
    tag: node.tag,
    label: node.label,
    score: healthFromNode(node),
    status: node.status,
  }))

  if (role === 'operator') {
    return (
      <aside className="role-view-panel operator-view-panel">
        <header>
          <div>
            <span>Operator View</span>
            <strong>Run status and safe actions</strong>
          </div>
          <ShieldCheck size={16} />
        </header>
        <div className="role-note">
          <span>Can see</span>
          <strong>Ready state, event timeline, live parameters, RCA summary, and HMI-safe checks.</strong>
        </div>
        <div className="role-note">
          <span>Approval request</span>
          <strong>Request maintenance approval for physical inspection; engineering approval is required before wiring or JSON changes.</strong>
        </div>
        <div className="role-action-grid">
          <button type="button" onClick={onShowHistory}>
            <FileSearch size={14} />
            Event history
          </button>
          <button type="button" onClick={onFocusAffected}>
            <ClipboardCheck size={14} />
            Guided check
          </button>
        </div>
      </aside>
    )
  }

  if (role === 'engineer') {
    return (
      <aside className="role-view-panel engineer-view-panel">
        <header>
          <div>
            <span>Engineer View</span>
            <strong>Topology, validation, and publish control</strong>
          </div>
          <Wrench size={16} />
        </header>
        <div className="role-note">
          <span>Can see</span>
          <strong>Full 3D topology, stencils, cable routes, validation issues, JSON configuration, and role preview.</strong>
        </div>
        <div className="role-note">
          <span>Approval authority</span>
          <strong>Approve configuration and wiring model changes after validation shows ready.</strong>
        </div>
        <div className="role-action-grid">
          <button type="button" onClick={onFocusAffected}>
            <ClipboardCheck size={14} />
            Validate path
          </button>
          <button type="button" onClick={onShowHistory}>
            <FileSearch size={14} />
            Change trail
          </button>
        </div>
      </aside>
    )
  }

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
          <strong>{maintenanceNote(layout, selectedDetails)}</strong>
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
        <span>{layout.kind === 'power-panel' ? 'Operational impact' : 'Production loss'}</span>
        <strong>{impactSummary(layout, kpis)}</strong>
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
