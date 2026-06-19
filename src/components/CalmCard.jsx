import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  BellRing,
  ChevronDown,
  ChevronUp,
  ClipboardPlus,
  FileJson,
  GripHorizontal,
  History,
  Maximize2,
  Minimize2,
  Save,
  SearchCheck,
  Shield,
} from 'lucide-react'
import { useProject } from '../store/projectStore'

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function CalmCard({
  layout: layoutProp,
  selectedNode: selectedNodeProp,
  issues: issuesProp,
  onFocusOrigin,
  onFocusAffected,
  onShowHistory,
}) {
  const { state, dispatch, activeLayout: activeLayoutFromStore, selectedNode: selectedNodeFromStore, activeLayoutIssues: issuesFromStore } = useProject()
  const [dragging, setDragging] = useState(false)
  const [insightOpen, setInsightOpen] = useState(false)
  const [ticketCreated, setTicketCreated] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)
  const cardRef = useRef(null)
  const { cardPosition, calmMinimized, showJson, jsonDraft, jsonError } = state.ui
  const activeLayout = layoutProp ?? activeLayoutFromStore
  const selectedNode = selectedNodeProp ?? selectedNodeFromStore
  const activeLayoutIssues = issuesProp ?? issuesFromStore

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const rect = card.getBoundingClientRect()
    const maxX = Math.max(8, window.innerWidth - rect.width - 8)
    const maxY = Math.max(8, window.innerHeight - rect.height - 8)
    const nextPosition = {
      x: clamp(cardPosition.x, 8, maxX),
      y: clamp(cardPosition.y, 8, maxY),
    }

    if (nextPosition.x !== cardPosition.x || nextPosition.y !== cardPosition.y) {
      dispatch({ type: 'set-card-position', position: nextPosition })
    }
  }, [cardPosition.x, cardPosition.y, calmMinimized, dispatch, insightOpen])

  const startDrag = (event) => {
    const card = event.currentTarget.closest('.calm-card')
    if (!card) return

    event.preventDefault()
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
    const expandedWidth = Math.min(330, window.innerWidth - 24)
    const expandedHeight = Math.min(420, window.innerHeight - 24)
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
      <section
        ref={cardRef}
        className={`calm-card minimized calm-card-dock ${dragging ? 'dragging' : ''}`}
        style={{ left: cardPosition.x, top: cardPosition.y }}
      >
        <span className="dock-grip" onPointerDown={startDrag} title="Drag calm card">
          <GripHorizontal size={16} />
        </span>
        <button className="dock-summary" onClick={reopenCard} title="Open calm card">
          <span className="dock-copy">
            <span>Calm Card</span>
            <strong>{activeLayout.insight.title}</strong>
          </span>
        </button>
        <button className="dock-action" onClick={reopenCard} title="Open calm card">
          <Maximize2 size={16} />
        </button>
      </section>
    )
  }

  return (
    <section ref={cardRef} className={`calm-card calm-card-compact ${insightOpen ? 'rca-open' : ''} ${dragging ? 'dragging' : ''}`} style={{ left: cardPosition.x, top: cardPosition.y }}>
      <header className="calm-card-grip">
        <span className="grip-handle" onPointerDown={startDrag}>
          <GripHorizontal size={17} />
        </span>
        <div className="grip-title" onPointerDown={startDrag}>
          <span>Calm Card</span>
          <strong>{activeLayout.insight.title}</strong>
        </div>
        <button className="card-action" title="Minimize calm card" onClick={() => dispatch({ type: 'set-calm-minimized', value: true })}>
          <Minimize2 size={16} />
          <span>Minimize</span>
        </button>
      </header>

      <div className="insight-strip">
        <div><span>Severity</span><strong className="danger">{activeLayout.insight.severity}</strong></div>
        <div><span>Origin</span><strong className="danger">{activeLayout.insight.origin}</strong></div>
        <div><span>Confidence</span><strong className="good">{activeLayout.insight.confidence}</strong></div>
      </div>

      <button className="calm-primary-action" onClick={() => { setInsightOpen(true); onFocusOrigin?.() }}>
        <Activity size={15} />
        <span>Open RCA</span>
      </button>

      {insightOpen ? (
        <>
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

          <div className="brief-row">
            {activeLayoutIssues.length ? <AlertTriangle size={18} /> : <Activity size={18} />}
            <p>{activeLayoutIssues.length ? activeLayoutIssues[0].message : activeLayout.insight.whatIsHappening}</p>
          </div>

          <div className="calm-actions">
            <button className="calm-action" onClick={() => onFocusAffected?.()}>
              <SearchCheck size={15} />
              <span>Show affected</span>
            </button>
            <button className="calm-action" onClick={() => setTicketCreated((value) => !value)}>
              <ClipboardPlus size={15} />
              <span>{ticketCreated ? 'Ticket drafted' : 'Create ticket'}</span>
            </button>
            <button className="calm-action" onClick={() => setAcknowledged((value) => !value)}>
              <BellRing size={15} />
              <span>{acknowledged ? 'Acknowledged' : 'Acknowledge'}</span>
            </button>
            <button className="calm-action" onClick={() => onShowHistory?.()}>
              <History size={15} />
              <span>History</span>
            </button>
          </div>

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

          <button className="insight-toggle" onClick={() => setInsightOpen(false)}>
            <ChevronUp size={15} />
            Hide RCA details
          </button>

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
        </>
      ) : (
        <button className="insight-toggle compact" onClick={() => setInsightOpen(true)}>
          <ChevronDown size={15} />
          Details
        </button>
      )}
    </section>
  )
}
