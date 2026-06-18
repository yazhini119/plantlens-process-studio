import { useState } from 'react'
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
  { id: 'operator', label: 'Operator' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'engineer', label: 'Engineer' },
  { id: 'manager', label: 'Manager' },
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
  const ready = activeLayoutIssues.length === 0
  const engineerView = userRole === 'engineer'
  const canDeleteLayout = state.project.layouts.length > 1

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
          onClick={() => setStudioOpen((current) => !current)}
          type="button"
          title="Open studio controls"
        >
          <ToolIcon icon={MenuTwoLineIcon} />
        </button>
      </div>

      {studioOpen ? (
        <section className="toolbar-studio-panel" aria-label="Studio controls">
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
                  title={`${role.label} view`}
                >
                  {role.label}
                </button>
              ))}
            </div>
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
        </section>
      ) : null}
    </header>
  )
}
