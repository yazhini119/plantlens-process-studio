import { useEffect, useMemo, useRef, useState } from 'react'
import { Boxes, CopyPlus, Link2, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { getNodeParameterValue, getNodePosition, resolveRoutePoints } from '../data/defaultConfig'
import { getStencilDefinition, nextLayoutPosition, nextTag } from '../data/stencils'
import { getStencilLibrary } from '../services/plantlensApi'
import { useProject } from '../store/projectStore'

const SCALE = 42
const PADDING = 48
const STATUS_OPTIONS = ['inactive', 'normal', 'origin', 'alarm', 'downstream']
const STARTER_STENCIL_IDS = [
  'panelBackplate',
  'dcSource',
  'acMains',
  'fuseBlock',
  'mcbBreaker',
  'charger',
  'lithiumBattery',
  'solarInverter',
  'vfdDrive',
  'acMotorLoad',
  'acMfm',
  'dcMfm',
  'plcRack',
  'hmiPanel',
  'rs485Bus',
  'tempVibCard',
  'oipRollerConveyor',
  'oipRollerModule',
  'oipRollerCorner',
  'oipChainTransfer',
  'oipDiverter',
  'oipBladeStop',
  'oipDiffuseSensor',
  'oipLaserSensor',
  'oipPushButton',
  'oipGantry',
  'oipSixAxisRobot',
  'oipWallPanel',
  'oipIndustrialLight',
  'oipIndustrialFan',
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
  { id: 'dcPower', label: 'DC Power Cable' },
  { id: 'acPower', label: 'AC Power Cable' },
  { id: 'rs485', label: 'RS485 Cable' },
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

function isNearPosition(a, b, xGap = 3.1, zGap = 1.45) {
  return Math.abs(a[0] - b[0]) < xGap && Math.abs(a[2] - b[2]) < zGap
}

function StencilPreview({ stencil, style = null }) {
  const portCount = stencil.ports?.length ?? 0
  const anchorCount = stencil.anchors?.length ?? 0
  const isCadModel = stencil.renderer === 'openIndustryAsset' || stencil.source === 'Open Industry Project'

  return (
    <aside className="stencil-preview-popover" style={style} aria-label={`${stencil.label} preview`}>
      <div className={`stencil-preview-visual ${stencil.family}`} data-cad={isCadModel ? 'true' : 'false'}>
        <span className="preview-shadow" />
        <span className="preview-base" />
        <span className="preview-body" />
        <span className="preview-accent" />
        {stencil.family === 'sensor' ? <span className="preview-sensor-head" /> : null}
        {stencil.family === 'pump' || stencil.id.includes('Pump') ? <span className="preview-rotor" /> : null}
      </div>
      <div className="stencil-preview-copy">
        <span>{isCadModel ? '3D CAD model' : `${stencil.family} stencil`}</span>
        <strong>{stencil.label}</strong>
        <small>{stencil.tagPrefix} prefix | {portCount} ports | {anchorCount} anchors</small>
      </div>
    </aside>
  )
}

export function LayoutWorkbench() {
  const { state, dispatch, activeLayout, selectedNode, activeLayoutIssues } = useProject()
  const dragRef = useRef(null)
  const canvasScrollRef = useRef(null)
  const sidebarRef = useRef(null)
  const [canvasViewport, setCanvasViewport] = useState({ width: 0, height: 0 })
  const [draggingStencilId, setDraggingStencilId] = useState(null)
  const [dropPreview, setDropPreview] = useState(null)
  const [previewState, setPreviewState] = useState(null)
  const backendStencilLibrary = useMemo(() => getStencilLibrary(), [])
  const libraryStencils = useMemo(
    () =>
      STARTER_STENCIL_IDS.map((stencilId) => state.project.library[stencilId] ?? backendStencilLibrary.find((stencil) => stencil.id === stencilId)).filter(Boolean),
    [backendStencilLibrary, state.project.library],
  )
  const cadStencilCount = useMemo(
    () => libraryStencils.filter((stencil) => stencil.renderer === 'openIndustryAsset' || stencil.source === 'Open Industry Project').length,
    [libraryStencils],
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

  const showStencilPreview = (stencilId, event) => {
    if (!event?.currentTarget || !sidebarRef.current) return
    const itemRect = event.currentTarget.getBoundingClientRect()
    const sidebarRect = sidebarRef.current.getBoundingClientRect()
    setPreviewState({
      stencilId,
      top: Math.max(46, Math.min(itemRect.top - sidebarRect.top - 8, sidebarRect.height - 158)),
    })
  }

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

  useEffect(() => {
    const element = canvasScrollRef.current
    if (!element) return undefined

    const updateSize = () => {
      setCanvasViewport({
        width: Math.floor(element.clientWidth),
        height: Math.floor(element.clientHeight),
      })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const contentWidth = Math.round((bounds.maxX - bounds.minX) * SCALE + PADDING * 2)
  const contentHeight = Math.round((bounds.maxZ - bounds.minZ) * SCALE + PADDING * 2)
  const canvasWidth = Math.max(1480, canvasViewport.width, contentWidth + 360)
  const canvasHeight = Math.max(680, canvasViewport.height, contentHeight + 180)

  const projectToCanvas = (point) => ({
    x: (point[0] - bounds.minX) * SCALE + PADDING,
    y: (point[2] - bounds.minZ) * SCALE + PADDING,
  })

  const routeToCanvasPoints = (route) => {
    const points = resolveRoutePoints(route, activeLayout, state.project.library).map(projectToCanvas)
    if (points.length < 2) return points
    if (points.length > 2) return points

    const [start, end] = points
    const midX = Math.round((start.x + end.x) / 2)
    return [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end]
  }

  const canvasToProject = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return [
      snap(bounds.minX + (event.clientX - rect.left - PADDING) / SCALE),
      0,
      snap(bounds.minZ + (event.clientY - rect.top - PADDING) / SCALE),
    ]
  }

  const findClearPosition = (desiredPosition, nodeIdToIgnore = null) => {
    const existingPositions = activeLayout.nodes
      .filter((node) => node.id !== nodeIdToIgnore)
      .map((node) => getNodePosition(node, activeLayout, state.project.library))

    let candidate = desiredPosition
    for (let attempt = 0; attempt < 16; attempt += 1) {
      const blocked = existingPositions.some((position) => isNearPosition(candidate, position))
      if (!blocked) return candidate

      const column = (attempt % 4) + 1
      const row = Math.floor(attempt / 4)
      candidate = [
        snap(desiredPosition[0] + column * 1.5),
        desiredPosition[1],
        snap(desiredPosition[2] + (row + 1) * 1.0),
      ]
    }

    return candidate
  }

  const startDrag = (event, node) => {
    dispatch({ type: 'select-node', nodeId: node.id })
    if (!['select', 'move'].includes(state.project.views.activeTool)) return

    event.preventDefault()
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
        detachAttachments: true,
        trackHistory: false,
      })
    }

    const stop = () => {
      if (dragRef.current) {
        dispatch({
          type: 'move-node',
          nodeId: dragRef.current.nodeId,
          position: dragRef.current.current,
          detachAttachments: true,
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
    const position = findClearPosition(nextLayoutPosition(activeLayout))
    dispatch({
      type: 'add-stencil-node',
      stencilId: selectedStencil.id,
      payload: {
        tag: draft.tag,
        label: draft.label,
        status: draft.status,
        parameters: draft.parameters,
        position,
      },
    })

    const projectedDocument = buildProjectWithPendingTag(state.project, activeLayout.id, draft.tag)
    setDraftState({
      stencilId: resolvedSelectedStencilId,
      draft: createStencilDraft(selectedStencil, projectedDocument, state.project.library),
    })
  }

  const createEmptyLayout = () => {
    setConnectionSourceId(null)
    dispatch({ type: 'add-layout' })
    dispatch({ type: 'set-active-tool', tool: 'select' })
  }

  const dropStencil = (event) => {
    event.preventDefault()
    const stencilId = event.dataTransfer.getData('application/plantlens-stencil') || draggingStencilId || resolvedSelectedStencilId
    const stencil = getStencilDefinition(stencilId, state.project.library)
    const position = findClearPosition(canvasToProject(event))
    setDropPreview(null)
    setDraggingStencilId(null)
    dispatch({
      type: 'add-stencil-node',
      stencilId,
      payload: {
        tag: nextTag(stencilId, state.project, state.project.library),
        label: stencil.label.replace(' / Labeling', ''),
        status: stencil.family === 'sensor' ? 'normal' : 'inactive',
        position,
      },
    })
  }

  const handleCanvasDragOver = (event) => {
    event.preventDefault()
    const stencilId = draggingStencilId || event.dataTransfer.getData('application/plantlens-stencil') || resolvedSelectedStencilId
    const position = findClearPosition(canvasToProject(event))
    setDropPreview({
      stencilId,
      position,
      point: projectToCanvas(position),
    })
  }

  const clearDropPreview = (event) => {
    if (event.currentTarget.contains(event.relatedTarget)) return
    setDropPreview(null)
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

  return (
    <section className="workbench">
      <aside className="workbench-sidebar" ref={sidebarRef}>
        <header className="subpanel-header">
          <div>
            <span>Stencil library</span>
            <strong>{libraryStencils.length} components</strong>
          </div>
          <Boxes size={16} />
        </header>

        <section className="library-catalog">
          <div className="library-catalog-meta">
            <div>
              <span>Catalog</span>
              <strong>Drag into canvas</strong>
            </div>
            <small>{cadStencilCount} CAD</small>
          </div>

          <div className="library-list">
            {libraryStencils.map((stencil) => {
              const isCadModel = stencil.renderer === 'openIndustryAsset' || stencil.source === 'Open Industry Project'
              const previewOpen = previewState?.stencilId === stencil.id

              return (
                <div className="library-item-wrap" key={stencil.id}>
                  <button
                    className={`library-item ${resolvedSelectedStencilId === stencil.id ? 'active' : ''}`}
                    data-cad={isCadModel ? 'true' : 'false'}
                    data-stencil-id={stencil.id}
                    data-preview-open={previewOpen ? 'true' : 'false'}
                    onClick={() => selectStencil(stencil.id)}
                    onPointerEnter={(event) => showStencilPreview(stencil.id, event)}
                    onPointerLeave={() => setPreviewState(null)}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('application/plantlens-stencil', stencil.id)
                      event.dataTransfer.effectAllowed = 'copy'
                      setDraggingStencilId(stencil.id)
                      setSelectedStencilId(stencil.id)
                      setPreviewState(null)
                    }}
                    onDragEnd={() => {
                      setDraggingStencilId(null)
                      setDropPreview(null)
                    }}
                  >
                    <span>{stencil.tagPrefix}</span>
                    <strong>{stencil.label}</strong>
                    <small>{isCadModel ? '3D CAD model' : stencil.family}</small>
                    <em>{isCadModel ? 'CAD' : '2D'}</em>
                  </button>
                </div>
              )
            })}
          </div>
        </section>

        <section className="library-editor">
          <div className="library-editor-header">
            <div>
              <span>{selectedStencil.source ?? selectedStencil.family}</span>
              <strong>{selectedStencil.label}</strong>
            </div>
            <small>{selectedStencil.renderer === 'openIndustryAsset' ? '3D model ready' : 'Schematic model ready'}</small>
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
              Insert model
            </button>
          </div>
        </section>

        {previewState ? (
          <StencilPreview
            stencil={getStencilDefinition(previewState.stencilId, state.project.library)}
            style={{ top: previewState.top }}
          />
        ) : null}
      </aside>

      <section className="workbench-main">
        <header className="workbench-header">
          <div className="layout-meta">
            <span>Active layout</span>
            <div className="layout-name-row">
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
              <button
                className="library-insert compact-action"
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault()
                  createEmptyLayout()
                }}
                onClick={(event) => event.preventDefault()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    createEmptyLayout()
                  }
                }}
                title="Create a new empty layout tab"
              >
                <Plus size={14} />
                New empty
              </button>
            </div>
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

        <div className="workbench-canvas-scroll" ref={canvasScrollRef}>
          <div
            className={`workbench-canvas ${state.project.views.showGrid ? 'show-grid' : ''} ${dropPreview ? 'drop-active' : ''}`}
            style={{ width: canvasWidth, height: canvasHeight }}
            onDragOver={handleCanvasDragOver}
            onDragLeave={clearDropPreview}
            onDrop={dropStencil}
          >
            <svg className="route-overlay" viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}>
              {activeLayout.routes.map((route) => {
                const points = routeToCanvasPoints(route)
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

            {!activeLayout.nodes.length ? (
              <div className="empty-design-dropzone">
                <strong>Empty industrial layout</strong>
                <span>Drag equipment models from the stencil library into this factory map.</span>
                <small>Select dropped equipment to edit tag, label, status, live-value mapping, alarm limits, maintenance notes, and component parameters.</small>
              </div>
            ) : null}

            {dropPreview ? (
              <div className="layout-drop-preview" style={{ left: dropPreview.point.x, top: dropPreview.point.y }}>
                <span>{getStencilDefinition(dropPreview.stencilId, state.project.library).tagPrefix}</span>
                <strong>{getStencilDefinition(dropPreview.stencilId, state.project.library).label}</strong>
              </div>
            ) : null}

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

    </section>
  )
}

