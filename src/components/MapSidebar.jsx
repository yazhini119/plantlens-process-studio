import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  BellRing,
  ClipboardPlus,
  History,
  Layers3,
  SearchCheck,
  ShieldAlert,
  Wrench,
  X,
} from 'lucide-react'

const PANEL_TABS = ['Overview', 'Live Data', 'RCA', 'Maintenance']

const DATA_PROFILES = {
  'Pump Pressure': { normal: '2.0-2.8 bar', alarm: '< 1.5 bar', trend: [2.4, 2.2, 1.9, 1.5, 1.1] },
  'Flow Rate': { normal: '165-190 L/min', alarm: '< 140 L/min', trend: [180, 171, 158, 139, 122] },
  'Fill Volume': { normal: '515-525 mL', alarm: '< 510 mL', trend: [520, 517, 512, 506, 502] },
  'Fill Time': { normal: '1.2-1.5 s', alarm: '> 1.7 s', trend: [1.3, 1.4, 1.5, 1.7, 1.8] },
  'Capper Torque': { normal: '1.0-1.4 N m', alarm: '> 2.4 N m', trend: [1.2, 1.5, 2.1, 3.0, 3.8] },
  'Packaging Count': { normal: '>= 1,220', alarm: '< 1,200', trend: [1246, 1232, 1210, 1198, 1187] },
  'Rejected Products': { normal: '< 8', alarm: '> 20', trend: [2, 6, 12, 21, 27] },
}

function LayerToggle({ layer, onToggle }) {
  return (
    <label className="layer-toggle">
      <div>
        <span>{layer.label}</span>
        <strong>{layer.description}</strong>
      </div>
      <input type="checkbox" checked={layer.enabled} onChange={() => onToggle(layer.id)} />
    </label>
  )
}

function healthScore(statusLabel) {
  switch (statusLabel) {
    case 'Critical':
      return 42
    case 'Warning':
      return 68
    case 'Degraded':
      return 57
    case 'Impact spreading':
      return 62
    case 'Offline':
      return 18
    default:
      return 92
  }
}

function Sparkline({ values, tone = 'normal' }) {
  const points = values?.length ? values : [60, 62, 58, 64, 61]
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const polyline = points
    .map((value, index) => {
      const x = 8 + (index / Math.max(1, points.length - 1)) * 116
      const y = 38 - ((value - min) / span) * 28
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg className={`trend-sparkline ${tone}`} viewBox="0 0 132 48" aria-hidden="true">
      <polyline points={polyline} />
      <circle cx="124" cy={polyline.split(' ').at(-1)?.split(',')[1] ?? 20} r="3.2" />
    </svg>
  )
}

function LiveDataTable({ metrics, statusLabel }) {
  const score = healthScore(statusLabel)
  return (
    <div className="live-data-list">
      {metrics.map((metric) => {
        const profile = DATA_PROFILES[metric.label] ?? { normal: 'Within model band', alarm: 'Configured limit', trend: [score - 4, score - 2, score, score - 6, score] }
        return (
          <article className="live-data-row" key={metric.label}>
            <div>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
            <div>
              <span>Normal</span>
              <strong>{profile.normal}</strong>
            </div>
            <div>
              <span>Alarm limit</span>
              <strong>{profile.alarm}</strong>
            </div>
            <Sparkline values={profile.trend} tone={statusLabel === 'Normal' ? 'normal' : 'alarm'} />
          </article>
        )
      })}
    </div>
  )
}

function EquipmentTabs({ activeTab, onTabChange }) {
  return (
    <div className="equipment-tabs" role="tablist" aria-label="Equipment details">
      {PANEL_TABS.map((tab) => (
        <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => onTabChange(tab)} type="button">
          {tab}
        </button>
      ))}
    </div>
  )
}

export function MapSidebar({
  layout,
  selectedDetails,
  mapLayers,
  onToggleLayer,
  onClearSelection,
  onFocusOrigin,
  onFocusAffected,
  onShowHistory,
  clusters,
  onFocusNode,
  showLayers,
  showSections,
}) {
  const [actionState, setActionState] = useState({
    selectionId: '',
    ticketCreated: false,
    acknowledged: false,
  })
  const [activeTab, setActiveTab] = useState('Overview')
  const activeSelectionId = selectedDetails?.id ?? ''
  const ticketCreated = actionState.selectionId === activeSelectionId ? actionState.ticketCreated : false
  const acknowledged = actionState.selectionId === activeSelectionId ? actionState.acknowledged : false
  const score = selectedDetails ? healthScore(selectedDetails.statusLabel) : 0

  const layerItems = useMemo(
    () => [
      { id: 'processFlow', label: 'Process Flow', description: 'Product movement and route propagation', enabled: mapLayers.processFlow },
      { id: 'alarms', label: 'Alarms', description: 'Pulse, impact spread, and alarm emphasis', enabled: mapLayers.alarms },
      { id: 'sensors', label: 'Sensors', description: 'Live sensor values and instrument overlays', enabled: mapLayers.sensors },
      { id: 'maintenance', label: 'Maintenance', description: 'Health, wear, and service emphasis', enabled: mapLayers.maintenance },
      { id: 'energy', label: 'Energy', description: 'Power and loading overlays', enabled: mapLayers.energy },
      { id: 'safety', label: 'Safety', description: 'Shutdown and safety influence zones', enabled: mapLayers.safety },
    ],
    [mapLayers],
  )

  const highlightedAssets = layout.nodes.filter((node) => ['origin', 'warning', 'impacted', 'downstream'].includes(node.status))

  return (
    <>
      <aside className={`equipment-sheet ${selectedDetails ? 'open' : ''}`} aria-hidden={!selectedDetails}>
        {selectedDetails ? (
          <section className="map-panel equipment-panel">
            <header className="panel-header">
              <div>
                <span>Selected equipment</span>
                <strong>{selectedDetails.title}</strong>
              </div>
              <button className="icon-chip" title="Close equipment panel" onClick={onClearSelection}>
                <X size={16} />
              </button>
            </header>

            <EquipmentTabs activeTab={activeTab} onTabChange={setActiveTab} />

            {activeTab === 'Overview' ? (
              <>
                <div className="status-band">
                  <div className={`status-chip ${selectedDetails.statusLabel.toLowerCase().replace(/\s+/g, '-')}`}>{selectedDetails.statusLabel}</div>
                  <div className="status-copy">
                    <span>Risk</span>
                    <strong>{selectedDetails.risk}</strong>
                  </div>
                  <div className="status-copy">
                    <span>Health</span>
                    <strong>{score}%</strong>
                  </div>
                </div>

                <div className="map-metrics">
                  {selectedDetails.metrics.map((metric) => (
                    <article key={metric.label}>
                      <span>{metric.label}</span>
                      <strong>{metric.value}</strong>
                    </article>
                  ))}
                </div>

                <div className="equipment-story">
                  <article>
                    <span>Cause</span>
                    <strong>{selectedDetails.cause}</strong>
                  </article>
                  <article>
                    <span>Suggested action</span>
                    <strong>{selectedDetails.suggestedAction}</strong>
                  </article>
                </div>
              </>
            ) : null}

            {activeTab === 'Live Data' ? <LiveDataTable metrics={selectedDetails.metrics} statusLabel={selectedDetails.statusLabel} /> : null}

            {activeTab === 'RCA' ? (
              <div className="equipment-story">
                <article>
                  <span>Likely cause</span>
                  <strong>{selectedDetails.cause}</strong>
                </article>
                <article>
                  <span>Fault path</span>
                  <strong>{'P-201 -> FIT-401 -> F-401 -> C-501 -> PKG-601'}</strong>
                </article>
                <article>
                  <span>Recommended action</span>
                  <strong>{selectedDetails.suggestedAction}</strong>
                </article>
              </div>
            ) : null}

            {activeTab === 'Maintenance' ? (
              <div className="maintenance-panel">
                <div className="health-ring" style={{ '--health': `${score}%` }}>
                  <strong>{score}%</strong>
                  <span>Health score</span>
                </div>
                <article>
                  <span>Work priority</span>
                  <strong>{selectedDetails.risk === 'High' ? 'Inspect during current shift' : 'Monitor next operator round'}</strong>
                </article>
                <article>
                  <span>Recommended action</span>
                  <strong>{selectedDetails.suggestedAction}</strong>
                </article>
              </div>
            ) : null}

            <div className="map-action-grid">
              <button className="map-action" onClick={onFocusAffected}>
                <SearchCheck size={15} />
                <span>Show affected assets</span>
              </button>
              <button
                className="map-action"
                onClick={() =>
                  setActionState((current) => ({
                    selectionId: activeSelectionId,
                    ticketCreated: current.selectionId === activeSelectionId ? !current.ticketCreated : true,
                    acknowledged: current.selectionId === activeSelectionId ? current.acknowledged : false,
                  }))}
              >
                <ClipboardPlus size={15} />
                <span>{ticketCreated ? 'Ticket drafted' : 'Create ticket'}</span>
              </button>
              <button
                className="map-action"
                onClick={() =>
                  setActionState((current) => ({
                    selectionId: activeSelectionId,
                    ticketCreated: current.selectionId === activeSelectionId ? current.ticketCreated : false,
                    acknowledged: current.selectionId === activeSelectionId ? !current.acknowledged : true,
                  }))}
              >
                <BellRing size={15} />
                <span>{acknowledged ? 'Acknowledged' : 'Acknowledge'}</span>
              </button>
              <button className="map-action" onClick={onShowHistory}>
                <History size={15} />
                <span>History</span>
              </button>
            </div>
          </section>
        ) : null}
      </aside>

      {showLayers ? (
        <section className="map-panel dark-panel layer-popover">
          <header className="panel-header dark">
            <div>
              <span>Layers</span>
              <strong>Industrial overlays</strong>
            </div>
            <Layers3 size={16} />
          </header>
          <div className="layer-toggle-list">
            {layerItems.map((layer) => (
              <LayerToggle key={layer.id} layer={layer} onToggle={onToggleLayer} />
            ))}
          </div>
        </section>
      ) : null}

      {showSections ? (
        <section className="map-panel summary-popover">
          <header className="panel-header">
            <div>
              <span>Plant sections</span>
              <strong>Cluster quick focus</strong>
            </div>
            <Wrench size={16} />
          </header>
          <div className="cluster-list">
            {clusters.map((cluster) => (
              <button key={cluster.id} className={`cluster-chip ${cluster.severity}`} onClick={() => onFocusNode(cluster.nodeIds?.[0] ?? '')}>
                <strong>{cluster.label}</strong>
                <span>{cluster.count} assets</span>
              </button>
            ))}
          </div>
          <div className="summary-callout">
            <AlertTriangle size={15} />
            <strong>{highlightedAssets.length} affected assets currently visible in the active propagation chain.</strong>
          </div>
          <button className="map-origin-button" onClick={onFocusOrigin}>
            <ShieldAlert size={15} />
            <span>Focus root cause equipment</span>
          </button>
        </section>
      ) : null}
    </>
  )
}
