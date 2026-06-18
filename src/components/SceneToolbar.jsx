import { HugeiconsIcon } from '@hugeicons/react'
import CenterFocusIcon from '@hugeicons/core-free-icons/CenterFocusIcon'
import Layers02Icon from '@hugeicons/core-free-icons/Layers02Icon'
import MapsCircle01Icon from '@hugeicons/core-free-icons/MapsCircle01Icon'
import Refresh03Icon from '@hugeicons/core-free-icons/Refresh03Icon'
import ThreeDViewIcon from '@hugeicons/core-free-icons/ThreeDViewIcon'
import Wrench01Icon from '@hugeicons/core-free-icons/Wrench01Icon'
import ZoomInAreaIcon from '@hugeicons/core-free-icons/ZoomInAreaIcon'
import ZoomOutAreaIcon from '@hugeicons/core-free-icons/ZoomOutAreaIcon'
import { useProject } from '../store/projectStore'

function Icon({ icon, size = 17 }) {
  return <HugeiconsIcon icon={icon} size={size} strokeWidth={1.85} />
}

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
    <div className="scene-toolbar compact-map-tools">
      {!editLayoutMode ? (
        <div className="command-group">
          <button className={`icon-chip ${showLayers ? 'active' : ''}`} title="Layers" onClick={onToggleLayers} type="button">
            <Icon icon={Layers02Icon} />
          </button>
          <button className={`icon-chip ${showMiniMap ? 'active' : ''}`} title="Mini-map" onClick={onToggleMiniMap} type="button">
            <Icon icon={MapsCircle01Icon} />
          </button>
          <button className={`icon-chip ${showTimeline ? 'active' : ''}`} title="Fault timeline" onClick={onToggleTimeline} type="button">
            <Icon icon={Wrench01Icon} />
          </button>
          <button className={`icon-chip ${showSections ? 'active' : ''}`} title="Plant sections" onClick={onToggleSections} type="button">
            <Icon icon={CenterFocusIcon} />
          </button>
        </div>
      ) : null}

      <div className="command-group">
        {canEdit ? (
          <button className={`icon-chip ${editLayoutMode ? 'active' : ''}`} title="Engineer studio" onClick={onToggleEditLayout} type="button">
            <Icon icon={ThreeDViewIcon} />
          </button>
        ) : null}
        <button className="icon-chip" title="Reset view" onClick={() => dispatch({ type: 'send-scene-command', command: 'reset' })} type="button">
          <Icon icon={Refresh03Icon} />
        </button>
        <button className="icon-chip" title="Fit plant" onClick={() => dispatch({ type: 'send-scene-command', command: 'fit' })} type="button">
          <Icon icon={CenterFocusIcon} />
        </button>
        <button
          className="icon-chip"
          title={selectedNode ? `Focus ${selectedNode.tag}` : 'Select equipment to focus'}
          onClick={() => dispatch({ type: 'send-scene-command', command: 'focus' })}
          disabled={!selectedNode}
          type="button"
        >
          <Icon icon={ZoomInAreaIcon} />
        </button>
        <button className="icon-chip" title="Zoom in" onClick={() => dispatch({ type: 'send-scene-command', command: 'zoom-in' })} type="button">
          <Icon icon={ZoomInAreaIcon} />
        </button>
        <button className="icon-chip" title="Zoom out" onClick={() => dispatch({ type: 'send-scene-command', command: 'zoom-out' })} type="button">
          <Icon icon={ZoomOutAreaIcon} />
        </button>
      </div>
    </div>
  )
}
