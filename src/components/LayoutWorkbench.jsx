import { useMemo, useRef, useState } from 'react'
import { Boxes, CopyPlus, Eye, EyeOff, Focus, Layers3, Link2, MousePointerClick, RotateCcw, Save, Trash2 } from 'lucide-react'
import { getNodeParameterValue, getNodePosition, resolveRoutePoints } from '../data/defaultConfig'
import { getStencilDefinition, nextTag } from '../data/stencils'
import { getStencilLibrary } from '../services/plantlensApi'
import { useProject } from '../store/projectStore'

const SCALE = 42
const PADDING = 48
const STATUS_OPTIONS = ['inactive', 'normal', 'origin', 'alarm', 'downstream']
const STARTER_STENCIL_IDS = [
  'tank',
  'pump',
  'flowSensor',
  'conveyor',
  'filler',
  'capper',
  'packaging',
  'valve',
  'motor',
  'compressor',
  'heatExchanger',
  'skid',
  'controlPanel',
  'sensor',
  'pipeSegment',
]
const CONNECTION_TYPES = [
  { id: 'processFlow', label: 'Process Flow' },
  { id: 'signal', label: 'Signal/Data' },
  { id: 'power', label: 'Power' },
  { id: 'alarmDependency', label: 'Alarm Dependency' },
  { id: 'utilityLine', label: 'Utility Line' },
]

function snap(value, step = 0.25) {
  return Math.round(value / step) * step
}

function clone(value) {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value))
}

function createStencilDraft(stencil, project, library) {
  const defaultLabel = stencil.label.replace(' / Labeling', '')
  return {
    tag: nextTag(stencil.id, project, library),
    label: defaultLabel,
    status: stencil.family === 'sensor' ? 'normal' : 'inactive',
    parameters: clone(stencil.defaults?.parameters ?? {}),
  }
}

function buildProjectWithPendingTag(project, activeLayoutId, tag) {
  return {
    ...project,
    layouts: project.layouts.map((layout) =>
      layout.id === activeLayoutId ? { ...layout, nodes: [...layout.nodes, { tag }] } : layout,
    ),
  }
}

export function LayoutWorkbench() {
  const { state, dispatch, activeLayout, selectedNode, activeLayoutIssues } = useProject()
  const dragRef = useRef(null)
  const backendStencilLibrary = useMemo(() => getStencilLibrary(), [])
  const libraryStencils = useMemo(
    () =>
      STARTER_STENCIL_IDS.map((stencilId) => state.project.library[stencilId] ?? backendStencilLibrary.find((stencil) => stencil.id === stencilId)).filter(Boolean),
    [backendStencilLibrary, state.project.library],
  )
  const [selectedStencilId, setSelectedStencilId] = useState(() => libraryStencils[0]?.id ?? 'genericMachine')
  const [connectionType, setConnectionType] = useState('processFlow')
  const [connectionSourceId, setConnectionSourceId] = useState(null)
  const [draftState, setDraftState] = useState(() => {
    const initialStencil = getStencilDefinition(libraryStencils[0]?.id ?? 'genericMachine', state.project.library)
    return {
      stencilId: initialStencil.id,
      draft: createStencilDraft(initialStencil, state.project, state.project.library),
    }
  })
  const availableStencilIds = useMemo(() => new Set(libraryStencils.map((stencil) => stencil.id)), [libraryStencils])
  const resolvedSelectedStencilId = availableStencilIds.has(selectedStencilId) ? selectedStencilId : (libraryStencils[0]?.id ?? 'genericMachine')

  const selectStencil = (stencilId) => {
    const stencil = getStencilDefinition(stencilId, state.project.library)
    setSelectedStencilId(stencilId)
    setDraftState({
      stencilId,
      draft: createStencilDraft(stencil, state.project, state.project.library),
    })
  }

  const selectedStencil = getStencilDefinition(resolvedSelectedStencilId, state.project.library)
  const stencilParameters = selectedStencil.parameters ?? []
  const draft =
    draftState.stencilId === resolvedSelectedStencilId
      ? draftState.draft
      : createStencilDraft(selectedStencil, state.project, state.project.library)

  const setDraft = (updater) => {
    setDraftState((current) => {
      const baseDraft =
        current.stencilId === resolvedSelectedStencilId
          ? current.draft
          : createStencilDraft(selectedStencil, state.project, state.project.library)

      return {
        stencilId: resolvedSelectedStencilId,
        draft: typeof updater === 'function' ? updater(baseDraft) : updater,
      }
    })
  }

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

  const canvasToProject = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return [
      snap(bounds.minX + (event.clientX - rect.left - PADDING) / SCALE),
      0,
      snap(bounds.minZ + (event.clientY - rect.top - PADDING) / SCALE),
    ]
  }

  const selectedNodeStencil = selectedNode ? getStencilDefinition(selectedNode.stencilId, state.project.library) : null
  const selectedNodeParameters = selectedNodeStencil?.parameters ?? []
  const selectedNodeRoutes = selectedNode
    ? activeLayout.routes.filter((route) => route.from.nodeId === selectedNode.id || route.to.nodeId === selectedNode.id)
    : []

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

  const resetDraft = () => {
    setDraftState({
      stencilId: resolvedSelectedStencilId,
      draft: createStencilDraft(selectedStencil, state.project, state.project.library),
    })
  }

  const insertStencil = () => {
    dispatch({
      type: 'add-stencil-node',
      stencilId: selectedStencil.id,
      payload: {
        tag: draft.tag,
        label: draft.label,
        status: draft.status,
        parameters: draft.parameters,
      },
    })

    const projectedDocument = buildProjectWithPendingTag(state.project, activeLayout.id, draft.tag)
    setDraftState({
      stencilId: resolvedSelectedStencilId,
      draft: createStencilDraft(selectedStencil, projectedDocument, state.project.library),
    })
  }

  const dropStencil = (event) => {
    event.preventDefault()
    const stencilId = event.dataTransfer.getData('application/plantlens-stencil') || resolvedSelectedStencilId
    const stencil = getStencilDefinition(stencilId, state.project.library)
    dispatch({
      type: 'add-stencil-node',
      stencilId,
      payload: {
        tag: nextTag(stencilId, state.project, state.project.library),
        label: stencil.label.replace(' / Labeling', ''),
        status: stencil.family === 'sensor' ? 'normal' : 'inactive',
        position: canvasToProject(event),
      },
    })
  }

  const handleNodeClick = (node) => {
    dispatch({ type: 'select-node', nodeId: node.id })
    if (state.project.views.activeTool !== 'connect') return

    if (!connectionSourceId || connectionSourceId === node.id) {
      setConnectionSourceId(node.id)
      return
    }

    dispatch({
      type: 'add-route-between-nodes',
      fromNodeId: connectionSourceId,
      toNodeId: node.id,
      connectionType,
    })
    setConnectionSourceId(null)
  }

  const updateSelectedField = (field, value) => {
    if (!selectedNode) return
    dispatch({ type: 'update-node-field', nodeId: selectedNode.id, field, value })
  }

  const updateSelectedParameter = (parameter, value) => {
    if (!selectedNode) return
    dispatch({ type: 'set-parameter', nodeId: selectedNode.id, parameter, value })
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

        <section className="library-editor">
          <div className="library-editor-header">
            <div>
              <span>{selectedStencil.family}</span>
              <strong>{selectedStencil.label}</strong>
            </div>
          </div>

          <label className="library-field">
            <span>Tag</span>
            <input
              value={draft.tag}
              onChange={(event) => setDraft((current) => ({ ...current, tag: event.target.value }))}
            />
          </label>

          <label className="library-field">
            <span>Label</span>
            <input
              value={draft.label}
              onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
            />
          </label>

          <label className="library-field">
            <span>Status</span>
            <select
              value={draft.status}
              onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>

          <div className="library-parameter-panel">
            {stencilParameters.map((parameter) => (
              <label className="library-parameter-row" key={parameter}>
                <span>{parameter}</span>
                <input
                  value={draft.parameters[parameter] ?? ''}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      parameters: {
                        ...current.parameters,
                        [parameter]: event.target.value,
                      },
                    }))}
                />
              </label>
            ))}
          </div>

          <div className="library-actions">
            <button type="button" className="icon-chip" onClick={resetDraft} title="Reset stencil data">
              <RotateCcw size={15} />
            </button>
            <button type="button" className="library-insert" onClick={insertStencil}>
              Insert stencil
            </button>
          </div>
        </section>

        <div className="library-list">
          {libraryStencils.map((stencil) => (
            <button
              key={stencil.id}
              className={`library-item ${resolvedSelectedStencilId === stencil.id ? 'active' : ''}`}
              onClick={() => selectStencil(stencil.id)}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData('application/plantlens-stencil', stencil.id)
                event.dataTransfer.effectAllowed = 'copy'
              }}
              title={`Configure ${stencil.label}`}
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
            <select
              className="connection-type-select"
              value={connectionType}
              onChange={(event) => setConnectionType(event.target.value)}
              title="Connection type"
            >
              {CONNECTION_TYPES.map((type) => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>
            <button
              className={`icon-chip ${state.project.views.activeTool === 'connect' ? 'active' : ''}`}
              title={connectionSourceId ? 'Click destination equipment to finish connection' : 'Connect equipment by clicking source and destination'}
              onClick={() => {
                setConnectionSourceId(null)
                dispatch({ type: 'set-active-tool', tool: 'connect' })
              }}
            >
              <Link2 size={16} />
            </button>
            <button className="icon-chip" title="Duplicate selected asset" onClick={() => dispatch({ type: 'duplicate-selected-node' })} disabled={!selectedNode}>
              <CopyPlus size={16} />
            </button>
            <button className="icon-chip danger" title="Delete selected asset" onClick={() => dispatch({ type: 'delete-selected-node' })} disabled={!selectedNode}>
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        <div className="workbench-canvas-scroll">
          <div
            className={`workbench-canvas ${state.project.views.showGrid ? 'show-grid' : ''}`}
            style={{ width: canvasWidth, height: canvasHeight }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={dropStencil}
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
                  className={`layout-node ${selected ? 'selected' : ''} ${connectionSourceId === node.id ? 'connection-source' : ''} ${node.status} ${node.attachments.length ? 'attached' : ''}`}
                  style={{ left: point.x, top: point.y }}
                  onClick={() => handleNodeClick(node)}
                  onPointerDown={(event) => startDrag(event, node)}
                  title={node.attachments.length ? `${node.tag} is attached to a host anchor` : node.tag}
                >
                  {selected || state.project.views.activeTool === 'connect' ? (
                    <>
                      <span className="node-port node-port-in" />
                      <span className="node-port node-port-out" />
                    </>
                  ) : null}
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
            <span>Configuration</span>
            <strong>{selectedNode ? selectedNode.tag : 'Select equipment'}</strong>
          </div>
          <MousePointerClick size={16} />
        </header>

        {selectedNode ? (
          <section className="equipment-config-panel">
            <label className="library-field">
              <span>Tag name</span>
              <input value={selectedNode.tag} onChange={(event) => updateSelectedField('tag', event.target.value)} />
            </label>
            <label className="library-field">
              <span>Equipment type</span>
              <input value={selectedNodeStencil?.label ?? selectedNode.stencilId} readOnly />
            </label>
            <label className="library-field">
              <span>Label</span>
              <input value={selectedNode.label} onChange={(event) => updateSelectedField('label', event.target.value)} />
            </label>
            <label className="library-field">
              <span>Status</span>
              <select value={selectedNode.status} onChange={(event) => updateSelectedField('status', event.target.value)}>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="library-field">
              <span>Process area</span>
              <select value={selectedNode.layerId ?? 'process'} onChange={(event) => updateSelectedField('layerId', event.target.value)}>
                {activeLayout.layers.map((layer) => (
                  <option key={layer.id} value={layer.id}>{layer.label}</option>
                ))}
              </select>
            </label>

            <div className="config-field-grid">
              <label className="library-field">
                <span>Normal operating range</span>
                <input
                  value={selectedNode.overrides.parameters['Normal Operating Range'] ?? ''}
                  placeholder={selectedNodeParameters[0] ? `${selectedNodeParameters[0]} nominal` : 'Nominal range'}
                  onChange={(event) => updateSelectedParameter('Normal Operating Range', event.target.value)}
                />
              </label>
              <label className="library-field">
                <span>Alarm limit</span>
                <input
                  value={selectedNode.overrides.parameters['Alarm Limit'] ?? ''}
                  placeholder="High/low limit"
                  onChange={(event) => updateSelectedParameter('Alarm Limit', event.target.value)}
                />
              </label>
              <label className="library-field">
                <span>Sensor value mapping</span>
                <input
                  value={selectedNode.overrides.parameters['Sensor Value Mapping'] ?? ''}
                  placeholder="Tag source or historian point"
                  onChange={(event) => updateSelectedParameter('Sensor Value Mapping', event.target.value)}
                />
              </label>
              <label className="library-field">
                <span>Maintenance notes</span>
                <textarea
                  value={selectedNode.overrides.parameters['Maintenance Notes'] ?? ''}
                  placeholder="Inspection, spare, or PM note"
                  onChange={(event) => updateSelectedParameter('Maintenance Notes', event.target.value)}
                />
              </label>
            </div>

            <button className="library-insert full-width" type="button" onClick={() => dispatch({ type: 'set-active-tool', tool: 'select' })}>
              <Save size={15} />
              Save equipment
            </button>

            <div className="route-manager">
              <div className="route-manager-title">
                <span>Structured connections</span>
                <strong>{selectedNodeRoutes.length} linked</strong>
              </div>
              {selectedNodeRoutes.length ? (
                selectedNodeRoutes.map((route) => {
                  const peerNodeId = route.from.nodeId === selectedNode.id ? route.to.nodeId : route.from.nodeId
                  const peer = activeLayout.nodes.find((node) => node.id === peerNodeId)
                  return (
                    <div className="route-manager-card" key={route.id}>
                      <div className="route-manager-row">
                        <span>{route.connectionType ?? route.medium}</span>
                        <strong>{route.from.nodeId === selectedNode.id ? 'to' : 'from'} {peer?.tag ?? 'Unknown'}</strong>
                        <button className="icon-chip danger" type="button" onClick={() => dispatch({ type: 'delete-route', routeId: route.id })}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <label className="library-field compact">
                        <span>Connection label</span>
                        <input
                          value={route.label ?? ''}
                          placeholder="Product feed, PLC signal, utility air"
                          onChange={(event) => dispatch({ type: 'update-route-field', routeId: route.id, field: 'label', value: event.target.value })}
                        />
                      </label>
                      <div className="route-edit-grid">
                        <label className="library-field compact">
                          <span>Type</span>
                          <select
                            value={route.connectionType ?? 'processFlow'}
                            onChange={(event) => dispatch({ type: 'update-route-field', routeId: route.id, field: 'connectionType', value: event.target.value })}
                          >
                            {CONNECTION_TYPES.map((type) => (
                              <option key={type.id} value={type.id}>{type.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="library-field compact">
                          <span>Direction</span>
                          <select
                            value={route.direction ?? 'forward'}
                            onChange={(event) => dispatch({ type: 'update-route-field', routeId: route.id, field: 'direction', value: event.target.value })}
                          >
                            <option value="forward">Source to target</option>
                            <option value="reverse">Target to source</option>
                            <option value="bidirectional">Bidirectional</option>
                          </select>
                        </label>
                        <label className="library-field compact">
                          <span>Source</span>
                          <select
                            value={route.from.nodeId}
                            onChange={(event) => dispatch({ type: 'update-route-field', routeId: route.id, field: 'fromNodeId', value: event.target.value })}
                          >
                            {activeLayout.nodes.map((node) => (
                              <option key={node.id} value={node.id}>{node.tag}</option>
                            ))}
                          </select>
                        </label>
                        <label className="library-field compact">
                          <span>Target</span>
                          <select
                            value={route.to.nodeId}
                            onChange={(event) => dispatch({ type: 'update-route-field', routeId: route.id, field: 'toNodeId', value: event.target.value })}
                          >
                            {activeLayout.nodes.map((node) => (
                              <option key={node.id} value={node.id}>{node.tag}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="route-manager-empty">Use Connect mode, click source equipment, then click destination equipment.</div>
              )}
            </div>
          </section>
        ) : (
          <div className="config-empty">
            Drag a stencil into the canvas or click equipment to configure it.
          </div>
        )}

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
