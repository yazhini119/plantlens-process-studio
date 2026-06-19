import { GripHorizontal, Maximize2, Minimize2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { buildClusterGroups, buildMiniMapBounds } from '../data/presentationModel'
import { resolveRoutePoints } from '../data/defaultConfig'
import { useProject } from '../store/projectStore'

const WIDTH = 220
const HEIGHT = 140
const PADDING = 18

function statusColor(status) {
  switch (status) {
    case 'origin':
      return '#d62d2d'
    case 'warning':
      return '#d8ab2f'
    case 'impacted':
      return '#d67b1f'
    case 'downstream':
      return '#efb23a'
    case 'inactive':
      return '#8a9299'
    default:
      return '#17805e'
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

export function MiniMap({ layout, library, selectedNodeId, sceneViewport, onFocusNode, collapsed = false, onToggle }) {
  const { state, dispatch } = useProject()
  const { miniMapPosition } = state.ui
  const panelRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const bounds = useMemo(() => buildMiniMapBounds(layout, library), [layout, library])
  const clusters = useMemo(() => buildClusterGroups(layout), [layout])
  const showClusters = sceneViewport.zoom < 56

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    const nextPosition = {
      x: clamp(miniMapPosition.x, 8, Math.max(8, window.innerWidth - rect.width - 8)),
      y: clamp(miniMapPosition.y, 8, Math.max(8, window.innerHeight - rect.height - 8)),
    }
    if (nextPosition.x !== miniMapPosition.x || nextPosition.y !== miniMapPosition.y) {
      dispatch({ type: 'set-minimap-position', position: nextPosition })
    }
  }, [collapsed, dispatch, miniMapPosition.x, miniMapPosition.y])

  const startDrag = (event) => {
    const panel = panelRef.current
    if (!panel) return

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = panel.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const origin = { ...miniMapPosition }
    setDragging(true)

    const move = (moveEvent) => {
      dispatch({
        type: 'set-minimap-position',
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

  const project = (point) => {
    const width = Math.max(1, bounds.maxX - bounds.minX)
    const height = Math.max(1, bounds.maxZ - bounds.minZ)
    return {
      x: ((point[0] - bounds.minX) / width) * (WIDTH - PADDING * 2) + PADDING,
      y: ((point[2] - bounds.minZ) / height) * (HEIGHT - PADDING * 2) + PADDING,
    }
  }

  const viewport = (() => {
    const zoomFactor = Math.max(0.18, Math.min(0.66, 62 / sceneViewport.zoom * 0.34))
    const width = Math.max(34, (WIDTH - PADDING * 2) * zoomFactor)
    const height = Math.max(24, (HEIGHT - PADDING * 2) * zoomFactor * 0.58)
    const target = project([sceneViewport.target[0], 0, sceneViewport.target[2]])
    return {
      x: Math.max(PADDING, Math.min(WIDTH - PADDING - width, target.x - width / 2)),
      y: Math.max(PADDING, Math.min(HEIGHT - PADDING - height, target.y - height / 2)),
      width,
      height,
    }
  })()

  if (collapsed) {
    return (
      <section ref={panelRef} className={`mini-map mini-map-collapsed ${dragging ? 'dragging' : ''}`} style={{ left: miniMapPosition.x, top: miniMapPosition.y }}>
        <span className="overlay-grip" onPointerDown={startDrag} title="Move mini-map">
          <GripHorizontal size={15} />
        </span>
        <button onClick={onToggle} type="button">
          <span>Mini-map</span>
          <strong>Open</strong>
          <Maximize2 size={15} />
        </button>
      </section>
    )
  }

  return (
    <section ref={panelRef} className={`mini-map ${dragging ? 'dragging' : ''}`} style={{ left: miniMapPosition.x, top: miniMapPosition.y }}>
      <header>
        <span className="overlay-grip" onPointerDown={startDrag} title="Move mini-map">
          <GripHorizontal size={15} />
        </span>
        <div>
          <span>Mini-map</span>
          <strong>{layout.name}</strong>
        </div>
        <button className="icon-chip" title="Collapse mini-map" onClick={onToggle} type="button">
          <Minimize2 size={15} />
        </button>
      </header>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mini-map-canvas">
        {layout.routes.map((route) => {
          const points = resolveRoutePoints(route, layout, library).map(project)
          if (points.length < 2) return null
          return (
            <polyline
              key={route.id}
              points={points.map((point) => `${point.x},${point.y}`).join(' ')}
              className={`mini-route ${route.state}`}
            />
          )
        })}

        <rect
          className="mini-viewport"
          x={viewport.x}
          y={viewport.y}
          width={viewport.width}
          height={viewport.height}
          rx="10"
        />

        {showClusters
          ? clusters.map((cluster) => {
            const point = project(cluster.position)
            return (
              <g key={cluster.id}>
                <rect x={point.x - 36} y={point.y - 11} width="72" height="22" rx="11" className={`mini-cluster ${cluster.severity}`} />
                <text x={point.x} y={point.y + 4} textAnchor="middle">{cluster.label}</text>
              </g>
            )
          })
          : layout.nodes.map((node) => {
            const point = project(node.transform.position)
            const selected = selectedNodeId === node.id
            return (
              <g key={node.id} onClick={() => onFocusNode(node.id)} className="mini-node-hit">
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={selected ? 7 : 5}
                  fill={statusColor(node.status)}
                  stroke={selected ? '#0d1013' : '#f7f8f8'}
                  strokeWidth={selected ? 2.4 : 1.4}
                />
              </g>
            )
          })}
      </svg>
    </section>
  )
}
