import { useState } from 'react'
import { GripHorizontal, Maximize2, Minimize2, X } from 'lucide-react'
import { HugeiconsIcon } from '@hugeicons/react'
import Add01Icon from '@hugeicons/core-free-icons/Add01Icon'
import Alert01Icon from '@hugeicons/core-free-icons/Alert01Icon'
import ConnectIcon from '@hugeicons/core-free-icons/ConnectIcon'
import CursorMove02Icon from '@hugeicons/core-free-icons/CursorMove02Icon'
import CursorPointer02Icon from '@hugeicons/core-free-icons/CursorPointer02Icon'
import Delete02Icon from '@hugeicons/core-free-icons/Delete02Icon'
import FactoryIcon from '@hugeicons/core-free-icons/FactoryIcon'
import Grid2X2Icon from '@hugeicons/core-free-icons/Grid2X2Icon'
import MapsSearchIcon from '@hugeicons/core-free-icons/MapsSearchIcon'
import MenuTwoLineIcon from '@hugeicons/core-free-icons/MenuTwoLineIcon'
import Redo03Icon from '@hugeicons/core-free-icons/Redo03Icon'
import SaveIcon from '@hugeicons/core-free-icons/SaveIcon'
import Search01Icon from '@hugeicons/core-free-icons/Search01Icon'
import Settings02Icon from '@hugeicons/core-free-icons/Settings02Icon'
import Shield01Icon from '@hugeicons/core-free-icons/Shield01Icon'
import ThreeDViewIcon from '@hugeicons/core-free-icons/ThreeDViewIcon'
import Undo03Icon from '@hugeicons/core-free-icons/Undo03Icon'
import UserGroupIcon from '@hugeicons/core-free-icons/UserGroupIcon'
import ViewIcon from '@hugeicons/core-free-icons/ViewIcon'
import WorkflowCircle01Icon from '@hugeicons/core-free-icons/WorkflowCircle01Icon'
import ZoomInAreaIcon from '@hugeicons/core-free-icons/ZoomInAreaIcon'
import { useProject } from '../store/projectStore'

const roleOptions = [
  {
    id: 'operator',
    label: 'Operator',
    view: 'Run view',
    description: 'Live status, alarms, RCA card, and guided checks. No layout edits.',
    capabilities: ['Acknowledge', 'Inspect asset', 'Open RCA'],
    scope: 'Sees live process state, active events, guided RCA, and operator-safe parameters.',
    approval: 'Can request maintenance approval; cannot approve wiring or configuration changes.',
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    view: 'Service view',
    description: 'Health scores, vibration/temperature evidence, service ticket actions, and history.',
    capabilities: ['Service assets', 'History', 'Maintenance layers'],
    scope: 'Sees service health, wiring checks, meter evidence, asset history, and field notes.',
    approval: 'Can approve inspection completion and request engineer sign-off for wiring changes.',
  },
  {
    id: 'engineer',
    label: 'Engineer',
    view: 'Studio view',
    description: 'Stencil library, routing, layout edits, validation, JSON configuration, and save/preview.',
    capabilities: ['Edit layout', 'Connect routes', 'Validate'],
    scope: 'Sees full topology, route validation, JSON config, layer controls, and edit tools.',
    approval: 'Can approve configuration changes and publish the operator-ready view.',
  },
  {
    id: 'manager',
    label: 'Manager',
    view: 'Executive view',
    description: 'Production impact, KPI summary, incident report, and energy view. Hides noisy controls.',
    capabilities: ['Impact summary', 'KPI report', 'RCA export'],
    scope: 'Sees KPIs, risk, energy, approval status, and business impact only.',
    approval: 'Can approve downtime or escalation; cannot edit plant topology.',
  },
]

const lensOptions = [
  { id: 'macro', label: 'Macro', hint: 'Plant map', icon: FactoryIcon },
  { id: 'meso', label: 'Meso', hint: 'Situation path', icon: WorkflowCircle01Icon },
  { id: 'micro', label: 'Micro', hint: 'Asset detail', icon: ZoomInAreaIcon },
]

const tools = [
  { id: 'select', icon: CursorPointer02Icon, title: 'Select assets' },
  { id: 'move', icon: CursorMove02Icon, title: 'Move assets' },
  { id: 'connect', icon: ConnectIcon, title: 'Connect assets' },
  { id: 'inspect', icon: MapsSearchIcon, title: 'Inspect layout' },
]

const STUDIO_PANEL_WIDTH = 444

function getStudioDockPosition() {
  if (typeof window === 'undefined') return { x: 930, y: 78 }
  return {
    x: Math.max(12, window.innerWidth - STUDIO_PANEL_WIDTH - 18),
    y: Math.max(76, Math.min(110, window.innerHeight - 420)),
  }
}

function ToolIcon({ icon, size = 17 }) {
  return <HugeiconsIcon icon={icon} size={size} strokeWidth={1.85} />
}

export function ProjectToolbar({
  searchQuery,
  onSearchQueryChange,
  onSearch,
  lensMode,
  onLensModeChange,
  operatingMode,
  onModeChange,
  editLayoutMode,
  onToggleEditLayout,
  onSaveLayout,
  onPreviewOperator,
  layoutSaved,
  userRole,
  onRoleChange,
  onCreateLayout,
}) {
  const { state, dispatch, canUndo, canRedo, activeLayoutIssues } = useProject()
  const [studioOpen, setStudioOpen] = useState(false)
  const [studioMinimized, setStudioMinimized] = useState(false)
  const [studioExpanded, setStudioExpanded] = useState(false)
  const [studioDragging, setStudioDragging] = useState(false)
  const [studioPosition, setStudioPosition] = useState(getStudioDockPosition)
  const ready = activeLayoutIssues.length === 0
  const engineerView = userRole === 'engineer'
  const canDeleteLayout = state.project.layouts.length > 1
  const activeRoleSpec = roleOptions.find((role) => role.id === userRole) ?? roleOptions[0]

  const startStudioDrag = (event) => {
    const panel = event.currentTarget.closest('.toolbar-studio-panel')
    if (!panel) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = panel.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const origin = { ...studioPosition }
    setStudioDragging(true)

    const move = (moveEvent) => {
      setStudioPosition({
        x: Math.max(8, Math.min(window.innerWidth - rect.width - 8, origin.x + moveEvent.clientX - startX)),
        y: Math.max(58, Math.min(window.innerHeight - rect.height - 8, origin.y + moveEvent.clientY - startY)),
      })
    }

    const stop = () => {
      setStudioDragging(false)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }

  return (
    <header className="project-toolbar product-toolbar">
      <div className="toolbar-brand">
        <span className="plantlens-logo-mark" aria-hidden="true">
          <i />
        </span>
        <div>
          <span>PlantLens</span>
          <strong>Lens Map</strong>
        </div>
      </div>

      <div className="lens-switcher" role="group" aria-label="PlantLens view scale">
        {lensOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={lensMode === option.id ? 'active' : ''}
            onClick={() => onLensModeChange?.(option.id)}
            title={`${option.label}: ${option.hint}`}
          >
            <ToolIcon icon={option.icon} />
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      <form
        className="toolbar-search"
        onSubmit={(event) => {
          event.preventDefault()
          onSearch?.()
        }}
      >
        <ToolIcon icon={Search01Icon} />
        <input
          value={searchQuery}
          onChange={(event) => onSearchQueryChange?.(event.target.value)}
          placeholder="Find asset or tag"
          aria-label="Find asset or tag"
        />
      </form>

      <div className="toolbar-actions">
        <div className={`toolbar-health ${ready ? '' : 'warning'}`}>
          <ToolIcon icon={ready ? Shield01Icon : Alert01Icon} size={16} />
          <strong>{ready ? 'Ready' : `${activeLayoutIssues.length} checks`}</strong>
        </div>

        <button
          className={`mode-pill compact ${editLayoutMode ? 'active' : ''}`}
          onClick={onToggleEditLayout}
          type="button"
          title={editLayoutMode ? 'Close engineer workspace' : 'Open engineer workspace'}
        >
          <ToolIcon icon={ThreeDViewIcon} />
          <span>{editLayoutMode ? 'Edit' : 'Studio'}</span>
        </button>

        <button
          className={`icon-chip menu-chip ${studioOpen ? 'active' : ''}`}
          onClick={() =>
            setStudioOpen((current) => {
              const next = !current
              if (next) {
                setStudioMinimized(false)
                setStudioExpanded(false)
                setStudioPosition(getStudioDockPosition())
              }
              return next
            })}
          type="button"
          title="Open studio controls"
        >
          <ToolIcon icon={MenuTwoLineIcon} />
        </button>
      </div>

      {studioOpen ? (
        <section
          className={`toolbar-studio-panel ${studioMinimized ? 'minimized' : ''} ${studioExpanded ? 'expanded' : ''} ${studioDragging ? 'dragging' : ''}`}
          aria-label="Studio controls"
          style={{ left: studioPosition.x, top: studioPosition.y }}
        >
          <header className="studio-window-header">
            <span className="overlay-grip" onPointerDown={startStudioDrag} title="Move studio panel">
              <GripHorizontal size={15} />
            </span>
            <div>
              <span>Studio controls</span>
              <strong>{activeRoleSpec.view}</strong>
            </div>
            <button type="button" title={studioMinimized ? 'Restore studio controls' : 'Minimize studio controls'} onClick={() => setStudioMinimized((value) => !value)}>
              {studioMinimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
            </button>
            <button
              type="button"
              title={studioExpanded ? 'Compact studio controls' : 'Expand studio controls'}
              onClick={() => {
                setStudioMinimized(false)
                setStudioExpanded((value) => !value)
              }}
            >
              <Maximize2 size={15} />
            </button>
            <button type="button" title="Close studio controls" onClick={() => setStudioOpen(false)}>
              <X size={15} />
            </button>
          </header>
          {!studioMinimized ? (
          <div className="studio-window-body">
          <div className="studio-panel-section layout-section">
            <div className="studio-section-title">
              <ToolIcon icon={FactoryIcon} size={15} />
              <span>Layouts</span>
            </div>
            <div className="toolbar-layouts">
              {state.project.layouts.map((layout) => (
                <button
                  key={layout.id}
                  className={`layout-tab ${state.project.views.activeLayoutId === layout.id ? 'active' : ''}`}
                  onClick={() => dispatch({ type: 'select-layout', layoutId: layout.id })}
                  title={`Open ${layout.name}`}
                  type="button"
                >
                  <span>{layout.kind}</span>
                  <strong>{layout.name}</strong>
                </button>
              ))}
              <button
                className="icon-chip new-layout-chip"
                onClick={() => (onCreateLayout ? onCreateLayout() : dispatch({ type: 'add-layout' }))}
                title="Create an empty industrial layout tab"
                type="button"
              >
                <ToolIcon icon={Add01Icon} size={16} />
                <span>New</span>
              </button>
              <button
                className="icon-chip delete-layout-chip danger"
                onClick={() => dispatch({ type: 'delete-layout' })}
                title="Delete active layout tab"
                disabled={!canDeleteLayout}
                type="button"
              >
                <ToolIcon icon={Delete02Icon} size={15} />
              </button>
            </div>
          </div>

          <div className="studio-panel-section">
            <div className="studio-section-title">
              <ToolIcon icon={ViewIcon} size={15} />
              <span>Simulation</span>
            </div>
            <div className="mode-toggle top-mode-toggle" role="group" aria-label="Simulation mode">
              <button className={operatingMode === 'normal' ? 'active' : ''} onClick={() => onModeChange?.('normal')} type="button">
                Normal
              </button>
              <button className={operatingMode === 'fault' ? 'active' : ''} onClick={() => onModeChange?.('fault')} type="button">
                Fault
              </button>
            </div>
          </div>

          <div className="studio-panel-section">
            <div className="studio-section-title">
              <ToolIcon icon={UserGroupIcon} size={15} />
              <span>Role</span>
            </div>
            <div className="role-switcher" role="group" aria-label="Role based view">
              {roleOptions.map((role) => (
                <button
                  key={role.id}
                  className={userRole === role.id ? 'active' : ''}
                  type="button"
                  onClick={() => onRoleChange?.(role.id)}
                  title={`${role.view}: ${role.description}`}
                >
                  {role.label}
                </button>
              ))}
            </div>
            <article className="role-capability-card">
              <span>{activeRoleSpec.view}</span>
              <strong>{activeRoleSpec.description}</strong>
              <p>{activeRoleSpec.scope}</p>
              <em>{activeRoleSpec.approval}</em>
              <div>
                {activeRoleSpec.capabilities.map((capability) => (
                  <small key={capability}>{capability}</small>
                ))}
              </div>
            </article>
          </div>

          {engineerView ? (
            <div className="studio-panel-section engineer-section">
              <div className="studio-section-title">
                <ToolIcon icon={Settings02Icon} size={15} />
                <span>Engineer</span>
              </div>
              <div className="engineer-tools">
                <button className="icon-chip" onClick={() => dispatch({ type: 'undo' })} disabled={!canUndo} title="Undo" type="button">
                  <ToolIcon icon={Undo03Icon} />
                </button>
                <button className="icon-chip" onClick={() => dispatch({ type: 'redo' })} disabled={!canRedo} title="Redo" type="button">
                  <ToolIcon icon={Redo03Icon} />
                </button>
                {tools.map((tool) => (
                  <button
                    key={tool.id}
                    className={`icon-chip ${state.project.views.activeTool === tool.id ? 'active' : ''}`}
                    onClick={() => dispatch({ type: 'set-active-tool', tool: tool.id })}
                    title={tool.title}
                    type="button"
                  >
                    <ToolIcon icon={tool.icon} />
                  </button>
                ))}
                <button
                  className={`icon-chip ${state.project.views.showGrid ? 'active' : ''}`}
                  onClick={() => dispatch({ type: 'toggle-grid' })}
                  title="Toggle layout grid"
                  type="button"
                >
                  <ToolIcon icon={Grid2X2Icon} />
                </button>
                {editLayoutMode ? (
                  <>
                    <button className="toolbar-soft-action" type="button" onClick={onSaveLayout}>
                      <ToolIcon icon={SaveIcon} size={15} />
                      <span>{layoutSaved ? 'Saved' : 'Save'}</span>
                    </button>
                    <button className="toolbar-soft-action primary" type="button" onClick={onPreviewOperator}>
                      Preview
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
          </div>
          ) : null}
        </section>
      ) : null}
    </header>
  )
}
