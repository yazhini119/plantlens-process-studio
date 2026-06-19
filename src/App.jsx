import { useMemo, useRef, useState } from 'react'
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
  const { state, dispatch, activeLayout, selectedNode, activeLayoutIssues } = useProject()
  const [operatingMode, setOperatingMode] = useState('fault')
  const [lensMode, setLensMode] = useState('meso')
  const [mapLayers, setMapLayers] = useState(DEFAULT_MAP_LAYERS)
  const [searchQuery, setSearchQuery] = useState('')
  const [showSignalTray, setShowSignalTray] = useState(false)
  const [showMiniMap, setShowMiniMap] = useState(false)
  const [showTimeline, setShowTimeline] = useState(false)
  const [showLayers, setShowLayers] = useState(false)
  const [showSections, setShowSections] = useState(false)
  const [userRole, setUserRole] = useState(() => getCurrentUserRole())
  const [editLayoutMode, setEditLayoutMode] = useState(false)
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

  const presentedSelectedNode = useMemo(
    () => presentedLayout.nodes.find((node) => node.id === selectedNode?.id) ?? null,
    [presentedLayout, selectedNode],
  )

  const kpis = useMemo(
    () => buildKpis(presentedLayout, operatingMode).filter((item) => FOCUSED_KPI_LABELS.has(item.label)),
    [presentedLayout, operatingMode],
  )
  const timeline = useMemo(() => buildTimeline(presentedLayout, operatingMode), [presentedLayout, operatingMode])
  const clusters = useMemo(() => buildClusterGroups(presentedLayout), [presentedLayout])
  const equipmentDetails = useMemo(
    () => (presentedSelectedNode ? buildEquipmentDetails(presentedSelectedNode, presentedLayout) : null),
    [presentedSelectedNode, presentedLayout],
  )

  const focusNode = (nodeId) => {
    const match = presentedLayout.nodes.find((node) => node.id === nodeId)
    if (!match) return
    dispatch({ type: 'select-node', nodeId })
    dispatch({ type: 'send-scene-command', command: 'focus' })
  }

  const handleSceneSelect = (nodeId) => {
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
    const match = presentedLayout.nodes.find((node) =>
      node.tag.toLowerCase().includes(query.toLowerCase()) ||
      node.label.toLowerCase().includes(query.toLowerCase()),
    )
    if (!match) {
      return
    }

    setSearchQuery(match.tag)
    focusNode(match.id)
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
    timelineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
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
      <main className={`app-shell view-${lensMode} view-${userRole} ${editLayoutMode ? 'edit-layout-open' : ''}`}>
        <section className={`scene-panel ${!editLayoutMode && equipmentDetails ? 'equipment-open' : ''}`}>
          <PlantScene
            project={state.project}
            layout={presentedLayout}
            selectedNode={presentedSelectedNode}
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

              {lensMode === 'micro' && userRole !== 'manager' ? <ParameterDrawer /> : null}

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
          <section className="edit-layout-drawer">
            <LayoutWorkbench />
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
