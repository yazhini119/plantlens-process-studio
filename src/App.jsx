import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronsDown, ChevronsUp, GripHorizontal, Maximize2, Minimize2, Redo2, RotateCcw, Undo2 } from 'lucide-react'
import './App.css'
import { CalmCard } from './components/CalmCard'
import { KpiStrip } from './components/KpiStrip'
import { LayoutWorkbench } from './components/LayoutWorkbench'
import { MapSidebar } from './components/MapSidebar'
import { MiniMap } from './components/MiniMap'
import { ParameterDrawer } from './components/ParameterDrawer'
import { PlantScene } from './components/PlantScene'
import { ProjectToolbar } from './components/ProjectToolbar'
import { RoleViewPanel } from './components/RoleViewPanel'
import { SceneToolbar } from './components/SceneToolbar'
import { TimelineRail } from './components/TimelineRail'
import {
  buildClusterGroups,
  buildEquipmentDetails,
  buildKpis,
  buildPresentationLayout,
  buildTimeline,
} from './data/presentationModel'
import { getCurrentUserRole, saveConnections, savePlantLayout, updateUserRole } from './services/plantlensApi'
import { ProjectProvider, useProject } from './store/projectStore'

const DEFAULT_MAP_LAYERS = {
  processFlow: true,
  alarms: true,
  sensors: true,
  maintenance: true,
  energy: false,
  safety: false,
}

const FOCUSED_KPI_LABELS = new Set(['Active Alarms', 'Downtime Risk', 'Bottles/min', 'Energy Usage'])
const POWER_PANEL_KPI_LABELS = new Set(['Panel Health', 'Active Alarms', 'Downtime Risk', 'Energy Usage'])

const ROLE_LAYER_PROFILES = {
  operator: { processFlow: true, alarms: true, sensors: true, maintenance: false, energy: false, safety: false },
  maintenance: { processFlow: true, alarms: true, sensors: true, maintenance: true, energy: false, safety: true },
  engineer: { processFlow: true, alarms: true, sensors: true, maintenance: true, energy: true, safety: true },
  manager: { processFlow: true, alarms: true, sensors: false, maintenance: false, energy: true, safety: false },
}

function layersForRole(role, currentLayers = DEFAULT_MAP_LAYERS) {
  return {
    ...currentLayers,
    ...(ROLE_LAYER_PROFILES[role] ?? ROLE_LAYER_PROFILES.operator),
  }
}

function Workspace() {
  const { state, dispatch, activeLayout, selectedNode, activeLayoutIssues, canUndo, canRedo } = useProject()
  const [operatingMode, setOperatingMode] = useState('normal')
  const [lensMode, setLensMode] = useState('macro')
  const [mapLayers, setMapLayers] = useState(DEFAULT_MAP_LAYERS)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSignalTray, setShowSignalTray] = useState(false)
  const [showMiniMap, setShowMiniMap] = useState(false)
  const [showTimeline, setShowTimeline] = useState(false)
  const [showLayers, setShowLayers] = useState(false)
  const [showSections, setShowSections] = useState(false)
  const [userRole, setUserRole] = useState(() => getCurrentUserRole())
  const [editLayoutMode, setEditLayoutMode] = useState(false)
  const [editDrawerHeight, setEditDrawerHeight] = useState(430)
  const [editDrawerCollapsed, setEditDrawerCollapsed] = useState(false)
  const [layoutSaved, setLayoutSaved] = useState(false)
  const [sceneViewport, setSceneViewport] = useState({
    zoom: activeLayout.camera.zoom,
    target: activeLayout.camera.target,
  })
  const [timelineHighlighted, setTimelineHighlighted] = useState(false)
  const timelineRef = useRef(null)

  const presentedLayout = useMemo(
    () => buildPresentationLayout(activeLayout, operatingMode),
    [activeLayout, operatingMode],
  )

  const populatedDemoLayout = useMemo(() => {
    const populatedLayouts = state.project.layouts.filter((layout) => layout.nodes?.length > 0)
    return (
      populatedLayouts.find((layout) => layout.kind === activeLayout.kind) ??
      populatedLayouts.find((layout) => layout.kind === 'power-panel') ??
      populatedLayouts[0] ??
      null
    )
  }, [activeLayout.kind, state.project.layouts])

  const sceneLayout = useMemo(() => {
    const fallbackLayout = editLayoutMode && presentedLayout.nodes.length === 0 && populatedDemoLayout
      ? populatedDemoLayout
      : activeLayout

    return fallbackLayout.id === activeLayout.id
      ? presentedLayout
      : buildPresentationLayout(fallbackLayout, operatingMode)
  }, [activeLayout, editLayoutMode, operatingMode, populatedDemoLayout, presentedLayout])

  const sceneUsesReferenceLayout = sceneLayout.id !== presentedLayout.id

  const presentedSelectedNode = useMemo(
    () => presentedLayout.nodes.find((node) => node.id === selectedNode?.id) ?? null,
    [presentedLayout, selectedNode],
  )

  const kpis = useMemo(
    () => {
      const focusedLabels = presentedLayout.kind === 'power-panel' ? POWER_PANEL_KPI_LABELS : FOCUSED_KPI_LABELS
      return buildKpis(presentedLayout, operatingMode).filter((item) => focusedLabels.has(item.label))
    },
    [presentedLayout, operatingMode],
  )
  const timeline = useMemo(() => buildTimeline(presentedLayout, operatingMode), [presentedLayout, operatingMode])
  const clusters = useMemo(() => buildClusterGroups(presentedLayout), [presentedLayout])
  const equipmentDetails = useMemo(
    () => (presentedSelectedNode ? buildEquipmentDetails(presentedSelectedNode, presentedLayout) : null),
    [presentedSelectedNode, presentedLayout],
  )

  useEffect(() => {
    if (!editLayoutMode || activeLayout.nodes.length > 0 || !populatedDemoLayout) return
    dispatch({ type: 'select-layout', layoutId: populatedDemoLayout.id })
    dispatch({ type: 'set-active-tool', tool: 'select' })
    dispatch({ type: 'send-scene-command', command: 'fit' })
  }, [activeLayout.id, activeLayout.nodes.length, dispatch, editLayoutMode, populatedDemoLayout])

  const focusNode = (nodeId, sourceLayout = presentedLayout) => {
    const match = sourceLayout.nodes.find((node) => node.id === nodeId)
    if (!match) return
    if (sourceLayout.id !== activeLayout.id) {
      dispatch({ type: 'select-layout', layoutId: sourceLayout.id })
    }
    dispatch({ type: 'select-node', nodeId })
    dispatch({ type: 'send-scene-command', command: 'focus' })
  }

  const handleSceneSelect = (nodeId) => {
    if (sceneUsesReferenceLayout) {
      if (!nodeId) return
      const match = sceneLayout.nodes.find((node) => node.id === nodeId)
      if (!match) return
      dispatch({ type: 'select-layout', layoutId: sceneLayout.id })
      dispatch({ type: 'select-node', nodeId })
      setSearchQuery(match.tag)
      setLensMode('micro')
      dispatch({ type: 'send-scene-command', command: 'focus' })
      return
    }
    dispatch({ type: 'select-node', nodeId })
    if (!nodeId) {
      setLensMode('macro')
      return
    }
    const match = presentedLayout.nodes.find((node) => node.id === nodeId)
    if (match) {
      setSearchQuery(match.tag)
      setLensMode('micro')
    }
  }

  const handleLensModeChange = (mode) => {
    setLensMode(mode)
    if (mode === 'macro') {
      dispatch({ type: 'select-node', nodeId: null })
      setShowTimeline(false)
      setShowLayers(false)
      setShowSections(false)
      dispatch({ type: 'send-scene-command', command: 'fit' })
    }

    if (mode === 'meso') {
      setShowTimeline(false)
      setShowLayers(false)
      setShowSections(false)
      dispatch({ type: 'send-scene-command', command: 'fit' })
    }

    if (mode === 'micro') {
      const target = presentedSelectedNode ?? presentedLayout.nodes.find((node) => node.tag === presentedLayout.insight.origin)
      if (target) {
        dispatch({ type: 'select-node', nodeId: target.id })
        dispatch({ type: 'send-scene-command', command: 'focus' })
      }
    }
  }

  const handleSearch = () => {
    const query = searchQuery.trim()
    if (!query) return
    const searchLayout = editLayoutMode ? sceneLayout : presentedLayout
    const match = searchLayout.nodes.find((node) =>
      node.tag.toLowerCase().includes(query.toLowerCase()) ||
      node.label.toLowerCase().includes(query.toLowerCase()),
    )
    if (!match) {
      return
    }

    setSearchQuery(match.tag)
    focusNode(match.id, searchLayout)
  }

  const handleRestoreDemoLayout = () => {
    if (!populatedDemoLayout) return
    dispatch({ type: 'select-layout', layoutId: populatedDemoLayout.id })
    dispatch({ type: 'set-active-tool', tool: 'select' })
    dispatch({ type: 'send-scene-command', command: 'fit' })
    setOperatingMode('normal')
    setLensMode('macro')
    setSearchQuery('')
  }

  const handleFocusOrigin = () => {
    const origin = presentedLayout.nodes.find((node) => node.tag === presentedLayout.insight.origin) ?? presentedLayout.nodes[0]
    if (origin) focusNode(origin.id)
  }

  const handleFocusAffected = () => {
    const tags = presentedLayout.insight.affectedAssets.split(',').map((entry) => entry.trim())
    const match = presentedLayout.nodes.find((node) => tags.includes(node.tag))
    if (match) focusNode(match.id)
  }

  const handleShowHistory = () => {
    setShowTimeline(true)
    setTimelineHighlighted(true)
    window.setTimeout(() => setTimelineHighlighted(false), 1400)
  }

  const handleSaveLayout = () => {
    savePlantLayout(activeLayout, state.project)
    saveConnections(activeLayout.routes, activeLayout, state.project)
    setLayoutSaved(true)
    window.setTimeout(() => setLayoutSaved(false), 1400)
  }

  const handleRoleChange = (role) => {
    updateUserRole(role)
    setUserRole(role)
    setMapLayers((current) => layersForRole(role, current))
    if (role !== 'engineer') {
      setEditLayoutMode(false)
    }
    if (role === 'manager') {
      setShowTimeline(false)
      setShowLayers(false)
      setShowSections(false)
    }
  }

  const handleCreateLayout = () => {
    handleRoleChange('engineer')
    setEditLayoutMode(true)
    setOperatingMode('normal')
    setShowTimeline(false)
    setShowLayers(false)
    setShowSections(false)
    dispatch({ type: 'add-layout' })
    dispatch({ type: 'set-active-tool', tool: 'select' })
    dispatch({ type: 'send-scene-command', command: 'fit' })
  }

  const handleToggleEditLayout = () => {
    if (userRole !== 'engineer') {
      handleRoleChange('engineer')
      setEditLayoutMode(true)
      return
    }
    setEditLayoutMode((current) => !current)
  }

  const startResizeEditor = (event) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const startY = event.clientY
    const startHeight = editDrawerHeight

    const move = (moveEvent) => {
      const nextHeight = Math.max(280, Math.min(window.innerHeight - 360, startHeight + startY - moveEvent.clientY))
      setEditDrawerCollapsed(false)
      setEditDrawerHeight(nextHeight)
    }

    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }

  const handlePreviewOperator = () => {
    handleSaveLayout()
    handleRoleChange('operator')
  }

  const effectiveMapLayers = useMemo(() => layersForRole(userRole, mapLayers), [userRole, mapLayers])

  return (
    <>
      <ProjectToolbar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearch={handleSearch}
        lensMode={lensMode}
        onLensModeChange={handleLensModeChange}
        operatingMode={operatingMode}
        onModeChange={setOperatingMode}
        editLayoutMode={editLayoutMode}
        onToggleEditLayout={handleToggleEditLayout}
        onSaveLayout={handleSaveLayout}
        onPreviewOperator={handlePreviewOperator}
        layoutSaved={layoutSaved}
        userRole={userRole}
        onRoleChange={handleRoleChange}
        onCreateLayout={handleCreateLayout}
      />
      <main
        className={`app-shell view-${lensMode} view-${userRole} ${editLayoutMode ? 'edit-layout-open' : ''} ${editDrawerCollapsed ? 'edit-layout-collapsed' : ''}`}
        style={editLayoutMode ? { '--edit-drawer-height': `${editDrawerCollapsed ? 58 : editDrawerHeight}px` } : undefined}
      >
        <section className={`scene-panel ${!editLayoutMode && equipmentDetails ? 'equipment-open' : ''}`}>
          <PlantScene
            project={state.project}
            layout={sceneLayout}
            selectedNode={sceneUsesReferenceLayout ? null : presentedSelectedNode}
            sceneCommand={state.ui.sceneCommand}
            onSelect={handleSceneSelect}
            onFocusNode={focusNode}
            mapLayers={effectiveMapLayers}
            onViewportChange={setSceneViewport}
            editLayoutMode={editLayoutMode}
            lensMode={lensMode}
          />

          <SceneToolbar
            lensMode={lensMode}
            onLensModeChange={handleLensModeChange}
            showTimeline={showTimeline}
            onToggleTimeline={() => setShowTimeline((current) => !current)}
            showMiniMap={showMiniMap}
            onToggleMiniMap={() => setShowMiniMap((current) => !current)}
            showLayers={showLayers}
            onToggleLayers={() => setShowLayers((current) => !current)}
            showSections={showSections}
            onToggleSections={() => setShowSections((current) => !current)}
            editLayoutMode={editLayoutMode}
            onToggleEditLayout={handleToggleEditLayout}
            canEdit={userRole === 'engineer'}
          />

          {editLayoutMode && sceneUsesReferenceLayout ? (
            <div className="scene-reference-ribbon">
              <span>3D reference visible</span>
              <strong>{sceneLayout.name}</strong>
              <button type="button" onClick={handleRestoreDemoLayout}>Edit this layout</button>
            </div>
          ) : null}

          {!editLayoutMode ? (
            <>
              <KpiStrip items={kpis} collapsed={!showSignalTray} onToggle={() => setShowSignalTray((current) => !current)} />

              <CalmCard
                layout={presentedLayout}
                selectedNode={presentedSelectedNode}
                issues={activeLayoutIssues}
                onFocusOrigin={handleFocusOrigin}
                onFocusAffected={handleFocusAffected}
                onShowHistory={handleShowHistory}
              />

              <MapSidebar
                layout={presentedLayout}
                selectedDetails={null}
                mapLayers={effectiveMapLayers}
                onToggleLayer={(layerId) => setMapLayers((current) => ({ ...current, [layerId]: !current[layerId] }))}
                onClearSelection={() => dispatch({ type: 'select-node', nodeId: null })}
                onFocusOrigin={handleFocusOrigin}
                onFocusAffected={handleFocusAffected}
                onShowHistory={handleShowHistory}
                clusters={clusters}
                onFocusNode={focusNode}
                showLayers={showLayers}
                showSections={showSections}
              />

              <RoleViewPanel
                role={userRole}
                layout={presentedLayout}
                kpis={kpis}
                selectedDetails={equipmentDetails}
                onShowHistory={handleShowHistory}
                onFocusAffected={handleFocusAffected}
              />

              {lensMode === 'micro' && userRole !== 'manager' ? <ParameterDrawer onClose={() => setLensMode('macro')} /> : null}

              <MiniMap
                layout={presentedLayout}
                library={state.project.library}
                selectedNodeId={presentedSelectedNode?.id}
                sceneViewport={sceneViewport}
                onFocusNode={focusNode}
                collapsed={!showMiniMap}
                onToggle={() => setShowMiniMap((current) => !current)}
              />

              <div ref={timelineRef}>
                <TimelineRail
                  items={timeline}
                  highlighted={timelineHighlighted}
                  collapsed={!showTimeline}
                  onToggle={() => setShowTimeline((current) => !current)}
                />
              </div>
            </>
          ) : null}
        </section>

        {userRole === 'engineer' && editLayoutMode ? (
          <section
            className={`edit-layout-drawer ${editDrawerCollapsed ? 'collapsed' : ''}`}
          >
            <header className="edit-drawer-control">
              <span className="overlay-grip" onPointerDown={startResizeEditor} title="Resize layout editor">
                <GripHorizontal size={16} />
              </span>
              <div>
                <span>Engineering layout editor</span>
                <strong>{activeLayout.name}</strong>
              </div>
              <div className="editor-control-actions" aria-label="Editor history and recovery">
                <button type="button" title="Undo last layout edit" disabled={!canUndo} onClick={() => dispatch({ type: 'undo' })}>
                  <Undo2 size={15} />
                </button>
                <button type="button" title="Redo layout edit" disabled={!canRedo} onClick={() => dispatch({ type: 'redo' })}>
                  <Redo2 size={15} />
                </button>
                <button type="button" className="editor-text-action" title="Open populated demo layout" disabled={!populatedDemoLayout} onClick={handleRestoreDemoLayout}>
                  <RotateCcw size={14} />
                  <span>Demo layout</span>
                </button>
              </div>
              <button type="button" title={editDrawerCollapsed ? 'Open editor' : 'Collapse editor'} onClick={() => setEditDrawerCollapsed((value) => !value)}>
                {editDrawerCollapsed ? <ChevronsUp size={16} /> : <ChevronsDown size={16} />}
              </button>
              <button type="button" title="Compact editor" onClick={() => { setEditDrawerCollapsed(false); setEditDrawerHeight(300) }}>
                <Minimize2 size={16} />
              </button>
              <button type="button" title="Large editor" onClick={() => { setEditDrawerCollapsed(false); setEditDrawerHeight(Math.min(window.innerHeight - 360, Math.max(520, Math.round(window.innerHeight * 0.62)))) }}>
                <Maximize2 size={16} />
              </button>
            </header>
            {editDrawerCollapsed ? null : <LayoutWorkbench />}
          </section>
        ) : null}
      </main>
    </>
  )
}

export default function App() {
  return (
    <ProjectProvider>
      <Workspace />
    </ProjectProvider>
  )
}
