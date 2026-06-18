import {
  AlertTriangle,
  Grid2x2,
  Hand,
  Link2,
  Move3D,
  Plus,
  Redo2,
  Search,
  ScanSearch,
  ShieldCheck,
  Trash2,
  Undo2,
} from 'lucide-react'
import { useProject } from '../store/projectStore'

const roleOptions = [
  { id: 'operator', label: 'Operator View' },
  { id: 'maintenance', label: 'Maintenance View' },
  { id: 'engineer', label: 'Engineer View' },
  { id: 'manager', label: 'Manager View' },
]

const tools = [
  { id: 'select', icon: Hand, title: 'Select assets' },
  { id: 'move', icon: Move3D, title: 'Move assets' },
  { id: 'connect', icon: Link2, title: 'Connect assets' },
  { id: 'inspect', icon: ScanSearch, title: 'Inspect layout' },
]

export function ProjectToolbar({
  searchQuery,
  onSearchQueryChange,
  onSearch,
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
  const ready = activeLayoutIssues.length === 0
  const engineerView = userRole === 'engineer'
  const canDeleteLayout = state.project.layouts.length > 1

  return (
    <header className="project-toolbar">
      <div className="toolbar-brand">
        <span className="plantlens-logo-mark" aria-hidden="true">
          <i />
        </span>
        <div>
          <span>PlantLens</span>
          <strong>Process Studio</strong>
        </div>
      </div>

      <div className="toolbar-layouts">
        {state.project.layouts.map((layout) => (
          <button
            key={layout.id}
            className={`layout-tab ${state.project.views.activeLayoutId === layout.id ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'select-layout', layoutId: layout.id })}
            title={`Open ${layout.name}`}
          >
            <span>{layout.kind}</span>
            <strong>{layout.name}</strong>
          </button>
        ))}
        <button
          className="icon-chip new-layout-chip"
          onClick={() => (onCreateLayout ? onCreateLayout() : dispatch({ type: 'add-layout' }))}
          title="Create an empty industrial layout tab"
        >
          <Plus size={16} />
          <span>New layout</span>
        </button>
        <button
          className="icon-chip delete-layout-chip danger"
          onClick={() => dispatch({ type: 'delete-layout' })}
          title="Delete active layout tab"
          disabled={!canDeleteLayout}
        >
          <Trash2 size={15} />
        </button>
      </div>

      <form
        className="toolbar-search"
        onSubmit={(event) => {
          event.preventDefault()
          onSearch?.()
        }}
      >
        <Search size={16} />
        <input
          value={searchQuery}
          onChange={(event) => onSearchQueryChange?.(event.target.value)}
          placeholder="Search equipment"
          aria-label="Search equipment"
        />
      </form>

      <div className="mode-toggle top-mode-toggle" role="group" aria-label="Simulation mode">
        <button className={operatingMode === 'normal' ? 'active' : ''} onClick={() => onModeChange?.('normal')} type="button">
          Normal
        </button>
        <button className={operatingMode === 'fault' ? 'active' : ''} onClick={() => onModeChange?.('fault')} type="button">
          Fault
        </button>
      </div>

      <div className="role-switcher" role="group" aria-label="Role based view">
        {roleOptions.map((role) => (
          <button
            key={role.id}
            className={userRole === role.id ? 'active' : ''}
            type="button"
            onClick={() => onRoleChange?.(role.id)}
            title={role.label}
          >
            {role.label}
          </button>
        ))}
      </div>

      <div className="toolbar-actions">
        {engineerView ? (
          <>
            <div className="icon-group">
              <button className="icon-chip" onClick={() => dispatch({ type: 'undo' })} disabled={!canUndo} title="Undo">
                <Undo2 size={16} />
              </button>
              <button className="icon-chip" onClick={() => dispatch({ type: 'redo' })} disabled={!canRedo} title="Redo">
                <Redo2 size={16} />
              </button>
            </div>

            <div className="icon-group">
              {tools.map((tool) => {
                const Icon = tool.icon
                return (
                  <button
                    key={tool.id}
                    className={`icon-chip ${state.project.views.activeTool === tool.id ? 'active' : ''}`}
                    onClick={() => dispatch({ type: 'set-active-tool', tool: tool.id })}
                    title={tool.title}
                  >
                    <Icon size={16} />
                  </button>
                )
              })}
              <button
                className={`icon-chip ${state.project.views.showGrid ? 'active' : ''}`}
                onClick={() => dispatch({ type: 'toggle-grid' })}
                title="Toggle layout grid"
              >
                <Grid2x2 size={16} />
              </button>
            </div>
            <button
              className={`mode-pill ${editLayoutMode ? 'active' : ''}`}
              onClick={onToggleEditLayout}
              type="button"
              title={editLayoutMode ? 'Collapse engineer workspace' : 'Open engineer workspace'}
            >
              {editLayoutMode ? 'Edit Mode' : 'Preview Mode'}
            </button>
            {editLayoutMode ? (
              <>
                <button className="toolbar-soft-action" type="button" onClick={onSaveLayout}>
                  {layoutSaved ? 'Saved' : 'Save Layout'}
                </button>
                <button className="toolbar-soft-action primary" type="button" onClick={onPreviewOperator}>
                  Preview as Operator
                </button>
              </>
            ) : null}
          </>
        ) : null}
        <div className={`toolbar-health ${ready ? '' : 'warning'}`}>
          {ready ? <ShieldCheck size={15} /> : <AlertTriangle size={15} />}
          <strong>{ready ? 'Ready' : `${activeLayoutIssues.length} checks`}</strong>
        </div>
      </div>
    </header>
  )
}
