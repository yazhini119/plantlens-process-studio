import { useMemo, useRef } from 'react'
import { Boxes, CopyPlus, Eye, EyeOff, Focus, Layers3 } from 'lucide-react'
import { getNodeParameterValue, getNodePosition, resolveRoutePoints } from '../data/defaultConfig'
import { equipmentStencils } from '../data/stencils'
import { useProject } from '../store/projectStore'

const SCALE = 42
const PADDING = 48

function snap(value, step = 0.25) {
  return Math.round(value / step) * step
}

export function LayoutWorkbench() {
  const { state, dispatch, activeLayout, selectedNode, activeLayoutIssues } = useProject()
  const dragRef = useRef(null)

  const issueCountByNode = useMemo(
    () =>
      activeLayoutIssues.reduce((result, issue) => {
        result[issue.entityId] = (result[issue.entityId] ?? 0) + 1
        return result
      }, {}),
    [activeLayoutIssues],
  )

  const bounds = useMemo(() => {
    const layoutPoints = [
      ...activeLayout.nodes.map((node) => getNodePosition(node, activeLayout, state.project.library)),
      ...activeLayout.routes.flatMap((route) => resolveRoutePoints(route, activeLayout, state.project.library)),
    ]

    if (!layoutPoints.length) {
      return { minX: -8, maxX: 8, minZ: -3, maxZ: 3 }
    }

    return layoutPoints.reduce(
      (result, [x, , z]) => ({
        minX: Math.min(result.minX, x),
        maxX: Math.max(result.maxX, x),
        minZ: Math.min(result.minZ, z),
        maxZ: Math.max(result.maxZ, z),
      }),
      { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity },
    )
  }, [activeLayout, state.project.library])

  const canvasWidth = Math.max(760, Math.round((bounds.maxX - bounds.minX) * SCALE + PADDING * 2))
  const canvasHeight = Math.max(300, Math.round((bounds.maxZ - bounds.minZ) * SCALE + PADDING * 2))

  const projectToCanvas = (point) => ({
    x: (point[0] - bounds.minX) * SCALE + PADDING,
    y: (point[2] - bounds.minZ) * SCALE + PADDING,
  })

  const startDrag = (event, node) => {
    dispatch({ type: 'select-node', nodeId: node.id })
    if (state.project.views.activeTool !== 'move' || node.attachments.length > 0) return

    event.currentTarget.setPointerCapture(event.pointerId)
    const start = getNodePosition(node, activeLayout, state.project.library)

    dragRef.current = {
      nodeId: node.id,
      origin: start,
      cursor: { x: event.clientX, y: event.clientY },
      current: start,
    }

    const move = (moveEvent) => {
      if (!dragRef.current) return
      const dx = (moveEvent.clientX - dragRef.current.cursor.x) / SCALE
      const dz = (moveEvent.clientY - dragRef.current.cursor.y) / SCALE
      dragRef.current.current = [
        snap(dragRef.current.origin[0] + dx),
        dragRef.current.origin[1],
        snap(dragRef.current.origin[2] + dz),
      ]
      dispatch({
        type: 'move-node',
        nodeId: dragRef.current.nodeId,
        position: dragRef.current.current,
        trackHistory: false,
      })
    }

    const stop = () => {
      if (dragRef.current) {
        dispatch({
          type: 'move-node',
          nodeId: dragRef.current.nodeId,
          position: dragRef.current.current,
          trackHistory: true,
        })
      }
      dragRef.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }

  return (
    <section className="workbench">
      <aside className="workbench-sidebar">
        <header className="subpanel-header">
          <div>
            <span>Stencil library</span>
            <strong>Reusable equipment blocks</strong>
          </div>
          <Boxes size={16} />
        </header>
        <div className="library-list">
          {equipmentStencils.map((stencil) => (
            <button
              key={stencil.id}
              className="library-item"
              onClick={() => dispatch({ type: 'add-stencil-node', stencilId: stencil.id })}
              title={`Insert ${stencil.label}`}
            >
              <span>{stencil.tagPrefix}</span>
              <strong>{stencil.label}</strong>
              <small>{stencil.family}</small>
            </button>
          ))}
        </div>
      </aside>

      <section className="workbench-main">
        <header className="workbench-header">
          <div className="layout-meta">
            <span>Active layout</span>
            <input
              key={activeLayout.id}
              className="layout-title-input"
              defaultValue={activeLayout.name}
              onBlur={(event) => dispatch({ type: 'rename-layout', name: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur()
                }
              }}
            />
          </div>
          <div className="workbench-actions">
            <button className="icon-chip" title="Duplicate selected asset" onClick={() => dispatch({ type: 'duplicate-selected-node' })} disabled={!selectedNode}>
              <CopyPlus size={16} />
            </button>
          </div>
        </header>

        <div className="workbench-canvas-scroll">
          <div
            className={`workbench-canvas ${state.project.views.showGrid ? 'show-grid' : ''}`}
            style={{ width: canvasWidth, height: canvasHeight }}
          >
            <svg className="route-overlay" viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}>
              {activeLayout.routes.map((route) => {
                const points = resolveRoutePoints(route, activeLayout, state.project.library).map(projectToCanvas)
                if (points.length < 2) return null

                return (
                  <polyline
                    key={route.id}
                    points={points.map((point) => `${point.x},${point.y}`).join(' ')}
                    className={`layout-route ${route.state}`}
                    data-dashed={route.style?.dashed ? 'true' : 'false'}
                  />
                )
              })}
            </svg>

            {activeLayout.nodes.map((node) => {
              const point = projectToCanvas(getNodePosition(node, activeLayout, state.project.library))
              const selected = selectedNode?.id === node.id

              return (
                <button
                  key={node.id}
                  className={`layout-node ${selected ? 'selected' : ''} ${node.status} ${node.attachments.length ? 'attached' : ''}`}
                  style={{ left: point.x, top: point.y }}
                  onClick={() => dispatch({ type: 'select-node', nodeId: node.id })}
                  onPointerDown={(event) => startDrag(event, node)}
                  title={node.attachments.length ? `${node.tag} is attached to a host anchor` : node.tag}
                >
                  <span className="layout-node-tag">{node.tag}</span>
                  <strong>{node.label}</strong>
                  <small>{getNodeParameterValue(node, node.headlineMetric) || node.headlineMetric}</small>
                  {issueCountByNode[node.id] ? <em>{issueCountByNode[node.id]}</em> : null}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      <aside className="workbench-rail">
        <header className="subpanel-header">
          <div>
            <span>Layers</span>
            <strong>Visibility and isolation</strong>
          </div>
          <Layers3 size={16} />
        </header>

        <div className="layer-list">
          {activeLayout.layers.map((layer) => (
            <div className="layer-row" key={layer.id}>
              <button className={`layer-chip ${state.project.views.isolatedLayerId === layer.id ? 'active' : ''}`} onClick={() => dispatch({ type: 'isolate-layer', layerId: layer.id })}>
                <Focus size={14} />
                <span>{layer.label}</span>
              </button>
              <button className="icon-chip" onClick={() => dispatch({ type: 'toggle-layer-visibility', layerId: layer.id })} title={`Toggle ${layer.label}`}>
                {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            </div>
          ))}
        </div>

        <header className="subpanel-header secondary">
          <div>
            <span>Validation</span>
            <strong>{activeLayoutIssues.length ? `${activeLayoutIssues.length} open checks` : 'Layout is clean'}</strong>
          </div>
        </header>
        <div className="validation-list">
          {activeLayoutIssues.length ? (
            activeLayoutIssues.map((issue) => (
              <button
                key={issue.id}
                className={`validation-item ${issue.severity}`}
                onClick={() => dispatch({ type: 'select-node', nodeId: issue.entityId.startsWith('route-') ? null : issue.entityId })}
              >
                <span>{issue.severity}</span>
                <strong>{issue.message}</strong>
              </button>
            ))
          ) : (
            <div className="validation-item ready">
              <span>ready</span>
              <strong>Ports, tags, and attachments are currently valid.</strong>
            </div>
          )}
        </div>
      </aside>
    </section>
  )
}
