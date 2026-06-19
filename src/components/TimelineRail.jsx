import { useEffect, useRef, useState } from 'react'
import { Clock3, GripHorizontal, Maximize2, Minimize2 } from 'lucide-react'
import { useProject } from '../store/projectStore'

export function TimelineRail({ items, highlighted = false, collapsed = false, onToggle }) {
  const { state, dispatch } = useProject()
  const { timelinePosition } = state.ui
  const panelRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    const nextPosition = {
      x: clamp(timelinePosition.x, 8, Math.max(8, window.innerWidth - rect.width - 8)),
      y: clamp(timelinePosition.y, 8, Math.max(8, window.innerHeight - rect.height - 8)),
    }
    if (nextPosition.x !== timelinePosition.x || nextPosition.y !== timelinePosition.y) {
      dispatch({ type: 'set-timeline-position', position: nextPosition })
    }
  }, [collapsed, dispatch, timelinePosition.x, timelinePosition.y])

  const startDrag = (event) => {
    const panel = panelRef.current
    if (!panel) return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = panel.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const origin = { ...timelinePosition }
    setDragging(true)

    const move = (moveEvent) => {
      dispatch({
        type: 'set-timeline-position',
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

  if (collapsed) {
    return (
      <section ref={panelRef} className={`timeline-dock ${dragging ? 'dragging' : ''}`} style={{ left: timelinePosition.x, top: timelinePosition.y }}>
        <span className="overlay-grip" onPointerDown={startDrag} title="Move timeline">
          <GripHorizontal size={15} />
        </span>
        <button onClick={onToggle} type="button">
          <Clock3 size={15} />
          <span>Timeline</span>
          <Maximize2 size={15} />
        </button>
      </section>
    )
  }

  return (
    <section ref={panelRef} className={`timeline-rail ${highlighted ? 'highlighted' : ''} ${dragging ? 'dragging' : ''}`} style={{ left: timelinePosition.x, top: timelinePosition.y }}>
      <header>
        <div className="timeline-title">
          <span className="overlay-grip" onPointerDown={startDrag} title="Move timeline">
            <GripHorizontal size={15} />
          </span>
          <Clock3 size={16} />
          <strong>Event timeline</strong>
        </div>
        <button className="icon-chip" title="Collapse timeline" onClick={onToggle} type="button">
          <Minimize2 size={15} />
        </button>
      </header>
      <div className="timeline-list">
        {items.map((item) => (
          <article key={`${item.time}-${item.event}`} className="timeline-item">
            <span>{item.time}</span>
            <strong>{item.event}</strong>
          </article>
        ))}
      </div>
    </section>
  )
}
