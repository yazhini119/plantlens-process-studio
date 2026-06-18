import { GripHorizontal, X } from 'lucide-react'
import { useState } from 'react'
import { useProject } from '../store/projectStore'

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function ParameterDrawer() {
  const { state, dispatch, selectedNode, activeNodeParameters, activeNodeValues } = useProject()
  const [dragging, setDragging] = useState(false)

  if (!selectedNode) return null

  const { drawerPosition } = state.ui

  const startDrag = (event) => {
    const drawer = event.currentTarget.closest('.parameter-drawer')
    if (!drawer) return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = drawer.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const origin = { ...drawerPosition }
    setDragging(true)

    const move = (moveEvent) => {
      dispatch({
        type: 'set-drawer-position',
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

  return (
    <aside className={`parameter-drawer ${dragging ? 'dragging' : ''}`} style={{ left: drawerPosition.x, top: drawerPosition.y }}>
      <div className="drawer-header">
        <div className="drawer-handle" onPointerDown={startDrag}>
          <GripHorizontal size={16} />
          <span>{selectedNode.tag}</span>
          <strong>{selectedNode.label} parameters</strong>
        </div>
        <button
          type="button"
          title="Close parameter details"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => dispatch({ type: 'select-node', nodeId: null })}
        >
          <X size={18} />
        </button>
      </div>
      <p>{selectedNode.description}</p>
      <div className="parameter-list">
        {activeNodeParameters.map((parameter) => {
          const value = activeNodeValues[parameter] ?? ''
          const alarm = value === 'ACTIVE' || (parameter.includes('Alarm') && value !== 'Inactive' && value !== 'Normal')

          return (
            <label className={`parameter-row ${alarm ? 'alarm' : ''}`} key={parameter}>
              <span>{parameter}</span>
              <input
                aria-label={`${parameter} value`}
                value={value}
                onChange={(event) =>
                  dispatch({
                    type: 'set-parameter',
                    nodeId: selectedNode.id,
                    parameter,
                    value: event.target.value,
                  })}
              />
            </label>
          )
        })}
      </div>
    </aside>
  )
}
