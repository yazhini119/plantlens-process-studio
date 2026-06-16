import { Focus, LocateFixed, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import { useProject } from '../store/projectStore'

export function SceneToolbar() {
  const { dispatch, selectedNode } = useProject()

  return (
    <div className="scene-toolbar">
      <button className="icon-chip" title="Reset scene view" onClick={() => dispatch({ type: 'send-scene-command', command: 'reset' })}>
        <RotateCcw size={16} />
      </button>
      <button className="icon-chip" title="Fit active layout" onClick={() => dispatch({ type: 'send-scene-command', command: 'fit' })}>
        <LocateFixed size={16} />
      </button>
      <button
        className="icon-chip"
        title={selectedNode ? `Focus ${selectedNode.tag}` : 'Select an asset to focus'}
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
  )
}
