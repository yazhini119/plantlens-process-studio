/* eslint-disable react-hooks/set-state-in-effect, react-hooks/static-components */
import { useEffect, useRef, useState } from 'react'
import { BarChart3, ClipboardCheck, FileSearch, GripHorizontal, Maximize2, Minimize2, ShieldCheck, Wrench, X } from 'lucide-react'
import { getConnections, getEquipmentList } from '../services/plantlensApi'
import { useProject } from '../store/projectStore'

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

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
  const { state, dispatch } = useProject()
  const panelRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const [closed, setClosed] = useState(false)
  const { rolePanelPosition } = state.ui
  const equipment = getEquipmentList(layout)
  const connections = getConnections(layout)
  const healthItems = equipment.slice(0, 5).map((node) => ({
    tag: node.tag,
    label: node.label,
    score: healthFromNode(node),
    status: node.status,
  }))

  useEffect(() => {
    setClosed(false)
    setMinimized(false)
  }, [role])

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    const nextPosition = {
      x: clamp(rolePanelPosition.x, 8, Math.max(8, window.innerWidth - rect.width - 8)),
      y: clamp(rolePanelPosition.y, 8, Math.max(8, window.innerHeight - rect.height - 8)),
    }
    if (nextPosition.x !== rolePanelPosition.x || nextPosition.y !== rolePanelPosition.y) {
      dispatch({ type: 'set-role-panel-position', position: nextPosition })
    }
  }, [dispatch, rolePanelPosition.x, rolePanelPosition.y, minimized, maximized, role])

  const startDrag = (event) => {
    const panel = panelRef.current
    if (!panel) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = panel.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const origin = { ...rolePanelPosition }
    setDragging(true)

    const move = (moveEvent) => {
      dispatch({
        type: 'set-role-panel-position',
        position: {
          x: clamp(origin.x + moveEvent.clientX - startX, 8, window.innerWidth - rect.width - 8),
          y: clamp(origin.y + moveEvent.clientY - startY, 8, window.innerHeight - rect.height - 8),
        },
      })
    }

    const stop = () => {
      setDragging(false)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }

  const windowClassName = `role-view-panel ${role}-view-panel ${dragging ? 'dragging' : ''} ${minimized ? 'minimized' : ''} ${maximized ? 'maximized' : ''}`
  const windowStyle = maximized
    ? { left: 18, top: 92 }
    : { left: rolePanelPosition.x, top: rolePanelPosition.y }

  const roleTitle = {
    operator: 'Operator View',
    engineer: 'Engineer View',
    maintenance: 'Maintenance View',
    manager: 'Manager View',
  }[role] ?? 'Role View'

  const roleSubtitle = {
    operator: 'Run status and safe actions',
    engineer: 'Topology, validation, and publish control',
    maintenance: 'Health, tickets, and service actions',
    manager: 'KPI summary and incident reporting',
  }[role] ?? 'Designation details'

  const RoleShell = ({ children, icon }) => {
    if (closed) {
      return (
        <aside ref={panelRef} className={`role-view-panel role-dock ${dragging ? 'dragging' : ''}`} style={{ left: rolePanelPosition.x, top: rolePanelPosition.y }}>
          <span className="overlay-grip" onPointerDown={startDrag} title="Move role view">
            <GripHorizontal size={15} />
          </span>
          <button type="button" onClick={() => setClosed(false)}>
            <span>{roleTitle}</span>
            <strong>Open</strong>
          </button>
        </aside>
      )
    }

    return (
      <aside ref={panelRef} className={windowClassName} style={windowStyle}>
        <header className="role-window-header">
          <span className="overlay-grip" onPointerDown={startDrag} title="Move role view">
            <GripHorizontal size={15} />
          </span>
          <div>
            <span>{roleTitle}</span>
            <strong>{roleSubtitle}</strong>
          </div>
          {icon}
          <button type="button" title={minimized ? 'Restore role view' : 'Minimize role view'} onClick={() => setMinimized((value) => !value)}>
            {minimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
          </button>
          <button type="button" title={maximized ? 'Restore role view' : 'Maximize role view'} onClick={() => setMaximized((value) => !value)}>
            <Maximize2 size={15} />
          </button>
          <button type="button" title="Close role view" onClick={() => setClosed(true)}>
            <X size={15} />
          </button>
        </header>
        {minimized ? null : children}
      </aside>
    )
  }

  if (role === 'operator') {
    return (
      <RoleShell icon={<ShieldCheck size={16} />}>
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
      </RoleShell>
    )
  }

  if (role === 'engineer') {
    return (
      <RoleShell icon={<Wrench size={16} />}>
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
      </RoleShell>
    )
  }

  if (role === 'maintenance') {
    return (
      <RoleShell icon={<Wrench size={16} />}>
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
      </RoleShell>
    )
  }

  return (
    <RoleShell icon={<BarChart3 size={16} />}>
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
    </RoleShell>
  )
}
