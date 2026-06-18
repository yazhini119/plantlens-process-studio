import { Boxes, Focus, Layers3, LocateFixed, Map, RotateCcw, Wrench, ZoomIn, ZoomOut } from 'lucide-react'
import { useProject } from '../store/projectStore'

export function SceneToolbar({
  showTimeline,
  onToggleTimeline,
  showMiniMap,
  onToggleMiniMap,
  showLayers,
  onToggleLayers,
  showSections,
  onToggleSections,
  editLayoutMode,
  onToggleEditLayout,
  canEdit = true,
}) {
  const { dispatch, selectedNode } = useProject()

  return (
    <div className="map-command-bar map-controls-only">
      <div className="map-toolbar-actions">
        <div className="command-group">
          <button
            className={`icon-chip ${showLayers ? 'active' : ''}`}
            title="Toggle industrial layers"
            onClick={onToggleLayers}
            type="button"
          >
            <Layers3 size={16} />
          </button>
          <button
            className={`icon-chip ${showMiniMap ? 'active' : ''}`}
            title="Toggle mini-map"
            onClick={onToggleMiniMap}
            type="button"
          >
            <Map size={16} />
          </button>
          <button
            className={`icon-chip ${showTimeline ? 'active' : ''}`}
            title="Toggle timeline drawer"
            onClick={onToggleTimeline}
            type="button"
          >
            <Wrench size={16} />
          </button>
          <button
            className={`icon-chip ${showSections ? 'active' : ''}`}
            title="Toggle plant sections"
            onClick={onToggleSections}
            type="button"
          >
            <Focus size={16} />
          </button>
          {canEdit ? (
            <button
              className={`icon-chip ${editLayoutMode ? 'active' : ''}`}
              title="Toggle edit layout mode"
              onClick={onToggleEditLayout}
              type="button"
            >
              <Boxes size={16} />
            </button>
          ) : null}
          <button className="icon-chip" title="Reset scene view" onClick={() => dispatch({ type: 'send-scene-command', command: 'reset' })}>
            <RotateCcw size={16} />
          </button>
          <button className="icon-chip" title="Fit active layout" onClick={() => dispatch({ type: 'send-scene-command', command: 'fit' })}>
            <LocateFixed size={16} />
          </button>
          <button
            className="icon-chip"
            title={selectedNode ? `Focus ${selectedNode.tag}` : 'Select equipment to focus'}
            onClick={() => dispatch({ type: 'send-scene-command', command: 'focus' })}
            disabled={!selectedNode}
          >
            <Focus size={16} />
          </button>
          <button className="icon-chip" title="Zoom in" onClick={() => dispatch({ type: 'send-scene-command', command: 'zoom-in' })}>
            <ZoomIn size={16} />
          </button>
          <button className="icon-chip" title="Zoom out" onClick={() => dispatch({ type: 'send-scene-command', command: 'zoom-out' })}>
            <ZoomOut size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
