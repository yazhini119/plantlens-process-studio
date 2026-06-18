import { useMemo, useRef, useState } from 'react'
import './App.css'
import { CalmCard } from './components/CalmCard'
import { KpiStrip } from './components/KpiStrip'
import { LayoutWorkbench } from './components/LayoutWorkbench'
import { MapSidebar } from './components/MapSidebar'
import { MiniMap } from './components/MiniMap'
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

function Workspace() {
  const { state, dispatch, activeLayout, selectedNode, activeLayoutIssues } = useProject()
  const [operatingMode, setOperatingMode] = useState('fault')
  const [mapLayers, setMapLayers] = useState(DEFAULT_MAP_LAYERS)
  const [searchQuery, setSearchQuery] = useState('')
  const [showMiniMap, setShowMiniMap] = useState(false)
  const [showTimeline, setShowTimeline] = useState(false)
  const [showLayers, setShowLayers] = useState(false)
  const [showSections, setShowSections] = useState(false)
  const [userRole, setUserRole] = useState(() => getCurrentUserRole())
  const [editLayoutMode, setEditLayoutMode] = useState(() => getCurrentUserRole() === 'engineer')
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
    if (!nodeId) return
    const match = presentedLayout.nodes.find((node) => node.id === nodeId)
    if (match) {
      setSearchQuery(match.tag)
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
    setEditLayoutMode(role === 'engineer')
    if (role === 'maintenance') {
      setMapLayers((current) => ({ ...current, maintenance: true, sensors: true }))
    }
    if (role === 'manager') {
      setShowTimeline(false)
      setShowLayers(false)
      setShowSections(false)
    }
  }

  const handleCreateLayout = () => {
    handleRoleChange('engineer')
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
      return
    }
    setEditLayoutMode((current) => !current)
  }

  const handlePreviewOperator = () => {
    handleSaveLayout()
    handleRoleChange('operator')
  }

  return (
    <>
      <ProjectToolbar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearch={handleSearch}
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
      <main className={`app-shell ${editLayoutMode ? 'edit-layout-open' : ''}`}>
        <section className={`scene-panel ${!editLayoutMode && equipmentDetails ? 'equipment-open' : ''}`}>
          <PlantScene
            project={state.project}
            layout={presentedLayout}
            selectedNode={presentedSelectedNode}
            sceneCommand={state.ui.sceneCommand}
            onSelect={handleSceneSelect}
            onFocusNode={focusNode}
            mapLayers={mapLayers}
            onViewportChange={setSceneViewport}
            editLayoutMode={editLayoutMode}
          />

          <SceneToolbar
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
              <KpiStrip items={kpis} />

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
                selectedDetails={equipmentDetails}
                mapLayers={mapLayers}
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

              <RoleViewPanel
                role={userRole}
                layout={presentedLayout}
                kpis={kpis}
                selectedDetails={equipmentDetails}
                onShowHistory={handleShowHistory}
                onFocusAffected={handleFocusAffected}
              />
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
