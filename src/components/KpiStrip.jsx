import { HugeiconsIcon } from '@hugeicons/react'
import ChartLineData01Icon from '@hugeicons/core-free-icons/ChartLineData01Icon'
import DashboardSpeed02Icon from '@hugeicons/core-free-icons/DashboardSpeed02Icon'
import ViewIcon from '@hugeicons/core-free-icons/ViewIcon'
import { GripHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useProject } from '../store/projectStore'

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function KpiStrip({ items, collapsed = false, onToggle }) {
  const { state, dispatch } = useProject()
  const panelRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const { signalTrayPosition } = state.ui

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    const nextPosition = {
      x: clamp(signalTrayPosition.x, 8, Math.max(8, window.innerWidth - rect.width - 8)),
      y: clamp(signalTrayPosition.y, 8, Math.max(8, window.innerHeight - rect.height - 8)),
    }
    if (nextPosition.x !== signalTrayPosition.x || nextPosition.y !== signalTrayPosition.y) {
      dispatch({ type: 'set-signal-tray-position', position: nextPosition })
    }
  }, [collapsed, dispatch, signalTrayPosition.x, signalTrayPosition.y])

  const startDrag = (event) => {
    const panel = panelRef.current
    if (!panel) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = panel.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const origin = { ...signalTrayPosition }
    setDragging(true)

    const move = (moveEvent) => {
      dispatch({
        type: 'set-signal-tray-position',
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
    const primary = items[0]
    return (
      <section ref={panelRef} className={`signal-tray-dock ${dragging ? 'dragging' : ''}`} style={{ left: signalTrayPosition.x, top: signalTrayPosition.y }}>
        <span className="overlay-grip" onPointerDown={startDrag} title="Move signals">
          <GripHorizontal size={15} />
        </span>
        <button type="button" onClick={onToggle} title="Open live signal tray">
          <HugeiconsIcon icon={DashboardSpeed02Icon} size={18} strokeWidth={1.8} />
          <span>Signals</span>
          <strong>{primary ? `${primary.label}: ${primary.value}` : 'Open'}</strong>
          <HugeiconsIcon icon={ViewIcon} size={16} strokeWidth={1.8} />
        </button>
      </section>
    )
  }

  return (
    <section ref={panelRef} className={`kpi-strip ${dragging ? 'dragging' : ''}`} style={{ left: signalTrayPosition.x, top: signalTrayPosition.y }}>
      <button className="signal-tray-close" type="button" onClick={onToggle} title="Collapse live signal tray">
        <span className="overlay-grip" onPointerDown={startDrag} title="Move signals">
          <GripHorizontal size={14} />
        </span>
        <HugeiconsIcon icon={ChartLineData01Icon} size={16} strokeWidth={1.8} />
        <span>Live signals</span>
      </button>
      {items.map((item) => (
        <article key={item.label} className={`kpi-card ${item.tone ?? 'normal'}`}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </section>
  )
}
