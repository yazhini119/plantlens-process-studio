import { useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileJson,
  GripHorizontal,
  Maximize2,
  Minimize2,
  Save,
  Shield,
} from 'lucide-react'
import { getNodeParameterValue } from '../data/defaultConfig'
import { useProject } from '../store/projectStore'

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function CalmCard() {
  const { state, dispatch, activeLayout, selectedNode, activeLayoutIssues } = useProject()
  const [dragging, setDragging] = useState(false)
  const [insightOpen, setInsightOpen] = useState(false)
  const { cardPosition, calmMinimized, showJson, jsonDraft, jsonError } = state.ui

  const startDrag = (event) => {
    const card = event.currentTarget.closest('.calm-card')
    if (!card) return

    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = card.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const origin = { ...cardPosition }
    setDragging(true)

    const move = (moveEvent) => {
      dispatch({
        type: 'set-card-position',
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

  const reopenCard = () => {
    const expandedWidth = Math.min(380, window.innerWidth - 24)
    const expandedHeight = Math.min(540, window.innerHeight - 24)
    dispatch({
      type: 'set-card-position',
      position: {
        x: clamp(cardPosition.x, 8, window.innerWidth - expandedWidth - 8),
        y: clamp(cardPosition.y, 8, window.innerHeight - expandedHeight - 8),
      },
    })
    dispatch({ type: 'set-calm-minimized', value: false })
  }

  if (calmMinimized) {
    return (
      <button
        className="calm-card minimized calm-card-dock"
        style={{ left: cardPosition.x, top: cardPosition.y }}
        onClick={reopenCard}
        title="Open calm card"
      >
        <span className="dock-grip"><GripHorizontal size={16} /></span>
        <span className="dock-copy">
          <span>{activeLayout.name}</span>
          <strong>{activeLayout.insight.origin} - {activeLayout.insight.confidence}</strong>
        </span>
        <span className="dock-action">
          <Maximize2 size={16} />
          <span>Open</span>
        </span>
      </button>
    )
  }

  return (
    <section className={`calm-card ${dragging ? 'dragging' : ''}`} style={{ left: cardPosition.x, top: cardPosition.y }}>
      <header className="calm-card-grip">
        <span className="grip-handle" onPointerDown={startDrag}>
          <GripHorizontal size={17} />
        </span>
        <div className="grip-title" onPointerDown={startDrag}>
          <span>{activeLayout.name}</span>
          <strong>{activeLayout.insight.title}</strong>
        </div>
        <button className="card-action" title="Minimize calm card" onClick={() => dispatch({ type: 'set-calm-minimized', value: true })}>
          <Minimize2 size={16} />
          <span>Minimize</span>
        </button>
      </header>

      <div className="insight-strip">
        <div><span>Severity</span><strong className="danger">{activeLayout.insight.severity}</strong></div>
        <div><span>Confidence</span><strong className="good">{activeLayout.insight.confidence}</strong></div>
        <div><span>Origin</span><strong className="danger">{activeLayout.insight.origin}</strong></div>
      </div>

      <div className="asset-lines">
        <span>Affected assets</span>
        <strong>{activeLayout.insight.affectedAssets}</strong>
        <span>Next likely spread</span>
        <strong>{activeLayout.insight.nextSpread}</strong>
      </div>

      <div className="asset-lines compact">
        <span>Validation</span>
        <strong>{activeLayoutIssues.length ? `${activeLayoutIssues.length} issue${activeLayoutIssues.length === 1 ? '' : 's'}` : 'Ready'}</strong>
        <span>Selected</span>
        <strong>{selectedNode?.tag ?? 'None'}</strong>
      </div>

      <div className="panel-section">
        <div className="section-title">
          <h2>Assets</h2>
        </div>
        <div className="station-grid">
          {activeLayout.nodes.map((node, index) => (
            <button
              key={node.id}
              className={`parameter-card ${selectedNode?.id === node.id ? 'selected' : ''}`}
              onClick={() => dispatch({ type: 'select-node', nodeId: node.id })}
            >
              <span className="step">{index + 1}</span>
              <span className="metric">{node.headlineMetric}</span>
              <strong>{getNodeParameterValue(node, node.headlineMetric) || 'Live'}</strong>
            </button>
          ))}
        </div>
      </div>

      <div className="brief-row">
        {activeLayoutIssues.length ? <AlertTriangle size={18} /> : <Activity size={18} />}
        <p>{activeLayoutIssues.length ? activeLayoutIssues[0].message : activeLayout.insight.whatIsHappening}</p>
      </div>

      <button className="insight-toggle" onClick={() => setInsightOpen((value) => !value)}>
        {insightOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        {insightOpen ? 'Hide reasoning' : 'Open calm reasoning'}
      </button>

      {insightOpen && (
        <div className="calm-grid">
          <article>
            <span className="number">1</span>
            <h2>What is happening</h2>
            <Activity size={30} />
            <p>{activeLayout.insight.whatIsHappening}</p>
          </article>
          <article>
            <span className="number">2</span>
            <h2>Why it matters</h2>
            <Shield size={30} />
            <p>{activeLayout.insight.whyItMatters}</p>
          </article>
          <article>
            <span className="number">3</span>
            <h2>What could make this wrong</h2>
            <ul>
              {activeLayout.insight.whatCouldMakeThisWrong.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </article>
          <article>
            <span className="number">4</span>
            <h2>What to verify next</h2>
            <ol>
              {activeLayout.insight.verifyNext.map((item) => <li key={item}>{item}</li>)}
            </ol>
          </article>
        </div>
      )}

      <div className="json-bar">
        <button onClick={() => dispatch({ type: 'toggle-json' })}><FileJson size={15} /> Configure JSON</button>
        <button onClick={() => dispatch({ type: 'apply-json' })}><Save size={15} /> Apply</button>
      </div>
      {showJson && (
        <div className="json-editor">
          <textarea value={jsonDraft} onChange={(event) => dispatch({ type: 'set-json-draft', value: event.target.value })} spellCheck="false" />
          {jsonError && <p>{jsonError}</p>}
        </div>
      )}
    </section>
  )
}
