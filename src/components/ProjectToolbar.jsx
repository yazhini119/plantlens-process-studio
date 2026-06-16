import {
  AlertTriangle,
  Grid2x2,
  Hand,
  Move3D,
  Plus,
  Redo2,
  ScanSearch,
  Undo2,
} from 'lucide-react'
import { useProject } from '../store/projectStore'

const tools = [
  { id: 'select', icon: Hand, title: 'Select assets' },
  { id: 'move', icon: Move3D, title: 'Move assets' },
  { id: 'inspect', icon: ScanSearch, title: 'Inspect layout' },
]

export function ProjectToolbar() {
  const { state, dispatch, canUndo, canRedo, activeLayoutIssues } = useProject()

  return (
    <header className="project-toolbar">
      <div className="toolbar-brand">
        <span>PlantLens Process Studio</span>
        <strong>Reusable process layouts with synchronized 3D schematics</strong>
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
        <button className="icon-chip" onClick={() => dispatch({ type: 'add-layout' })} title="Create a new process layout">
          <Plus size={16} />
        </button>
      </div>

      <div className="toolbar-actions">
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

        <div className={`toolbar-health ${activeLayoutIssues.length ? 'warning' : ''}`}>
          <AlertTriangle size={15} />
          <strong>{activeLayoutIssues.length ? `${activeLayoutIssues.length} checks` : 'Ready'}</strong>
        </div>
      </div>
    </header>
  )
}
