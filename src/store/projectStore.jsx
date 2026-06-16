/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useReducer } from 'react'
import {
  defaultConfig,
  getActiveLayout,
  getNodeParameters,
  getNodeParameterValue,
  getSelectedNode,
  normalizeProjectDocument,
} from '../data/defaultConfig'
import { getLayoutIssues, validateProjectDocument } from '../data/projectValidation'
import {
  buildNodeParameters,
  canAttachStencilToNode,
  getStencilDefinition,
  nextLayoutPosition,
  nextTag,
} from '../data/stencils'

const ProjectContext = createContext(null)

function clone(value) {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value))
}

function getViewportDefaults() {
  const width = typeof window === 'undefined' ? 1440 : window.innerWidth
  return {
    cardPosition: { x: 12, y: 56 },
    drawerPosition: { x: Math.max(12, width - 360), y: 56 },
  }
}

function syncJson(project, state) {
  return {
    ...state,
    ui: {
      ...state.ui,
      jsonDraft: JSON.stringify(project, null, 2),
      jsonError: '',
    },
  }
}

function commitProject(state, updater, { trackHistory = true } = {}) {
  const draft = clone(state.project)
  const nextProject = updater(draft) ?? draft
  const nextState = {
    ...state,
    project: nextProject,
    history: trackHistory ? [...state.history.slice(-39), state.project] : state.history,
    future: trackHistory ? [] : state.future,
  }
  return syncJson(nextProject, nextState)
}

function selectNode(project, nodeId) {
  project.views.selectedIds = nodeId ? [nodeId] : []
  return project
}

function createCallout(node, project) {
  const stencil = getStencilDefinition(node.stencilId, project.library)
  const hasCallout = stencil.anchors.some((anchor) => anchor.id === 'callout')
  if (!hasCallout) return null

  const note = node.status === 'origin' ? '(Origin)' : stencil.id === 'packaging' ? 'Packaging / Labeling' : ''
  return {
    id: `callout-${node.id}`,
    kind: 'callout',
    nodeId: node.id,
    label: node.tag,
    note,
    tone: node.status === 'origin' ? 'origin' : 'label',
    layerId: 'annotations',
    anchorId: 'callout',
    offset: [0, 0, 0],
  }
}

function nextLayoutName(project) {
  const count = project.layouts.length + 1
  return `Process Layout ${count}`
}

function createBlankLayout(project) {
  const layoutId = `layout-${Date.now().toString(36)}`
  return {
    id: layoutId,
    name: nextLayoutName(project),
    kind: 'process',
    nodes: [],
    routes: [],
    annotations: [],
    layers: [
      { id: 'process', label: 'Process', visible: true },
      { id: 'instrumentation', label: 'Instrumentation', visible: true },
      { id: 'annotations', label: 'Annotations', visible: true },
      { id: 'context', label: 'Context', visible: true },
    ],
    camera: { position: [7.8, 7.4, 9.2], target: [0, 0.55, 0], zoom: 62 },
    insight: {
      title: 'New process layout',
      severity: 'Low',
      confidence: 'Pending',
      origin: 'Unassigned',
      affectedAssets: 'No assets yet',
      nextSpread: 'None',
      whatIsHappening: 'This layout is ready for new stencils, routes, and process groupings.',
      whyItMatters: 'Each layout is now a first-class document that reuses the same stencil library.',
      whatCouldMakeThisWrong: ['missing topology', 'missing tags'],
      verifyNext: ['Insert a stencil', 'Connect routes', 'Review validation'],
    },
    alarms: [],
    causalSteps: [],
  }
}

function updateAnnotationTag(layout, nodeId, tag, status) {
  const annotation = layout.annotations.find((entry) => entry.nodeId === nodeId && entry.kind === 'callout')
  if (!annotation) return
  annotation.label = tag
  annotation.tone = status === 'origin' ? 'origin' : 'label'
  annotation.note = status === 'origin' ? '(Origin)' : annotation.note === '(Origin)' ? '' : annotation.note
}

const initialViewport = getViewportDefaults()

const initialState = {
  project: defaultConfig,
  history: [],
  future: [],
  ui: {
    ...initialViewport,
    calmMinimized: false,
    showJson: false,
    jsonDraft: JSON.stringify(defaultConfig, null, 2),
    jsonError: '',
    sceneCommand: { type: 'reset', nonce: 0 },
  },
}

function reducer(state, action) {
  switch (action.type) {
    case 'select-node':
      return commitProject(state, (project) => selectNode(project, action.nodeId), { trackHistory: false })

    case 'select-layout':
      return commitProject(
        state,
        (project) => {
          project.views.activeLayoutId = action.layoutId
          project.views.selectedIds = []
          return project
        },
        { trackHistory: false },
      )

    case 'set-active-tool':
      return commitProject(
        state,
        (project) => {
          project.views.activeTool = action.tool
          return project
        },
        { trackHistory: false },
      )

    case 'isolate-layer':
      return commitProject(
        state,
        (project) => {
          project.views.isolatedLayerId = project.views.isolatedLayerId === action.layerId ? null : action.layerId
          return project
        },
        { trackHistory: false },
      )

    case 'toggle-grid':
      return commitProject(
        state,
        (project) => {
          project.views.showGrid = !project.views.showGrid
          return project
        },
        { trackHistory: false },
      )

    case 'toggle-layer-visibility':
      return commitProject(state, (project) => {
        const layout = getActiveLayout(project)
        const layer = layout.layers.find((entry) => entry.id === action.layerId)
        if (layer) layer.visible = !layer.visible
        return project
      })

    case 'set-parameter':
      return commitProject(state, (project) => {
        const layout = getActiveLayout(project)
        const node = layout.nodes.find((entry) => entry.id === action.nodeId)
        if (!node) return project
        node.overrides.parameters[action.parameter] = action.value
        return project
      })

    case 'move-node':
      return commitProject(state, (project) => {
        const layout = getActiveLayout(project)
        const node = layout.nodes.find((entry) => entry.id === action.nodeId)
        if (!node || node.attachments.length) return project
        node.transform.position = action.position
        return project
      }, { trackHistory: action.trackHistory !== false })

    case 'add-stencil-node':
      return commitProject(state, (project) => {
        const layout = getActiveLayout(project)
        const stencil = getStencilDefinition(action.stencilId, project.library)
        const selectedNode = getSelectedNode(project, layout)
        const attachToSelection = selectedNode && canAttachStencilToNode(stencil.id, selectedNode, project.library)
        const id = `${stencil.id}-${Date.now().toString(36)}`
        const node = {
          id,
          stencilId: stencil.id,
          tag: nextTag(stencil.id, project, project.library),
          label: stencil.label.replace(' / Labeling', ''),
          status: stencil.family === 'sensor' ? 'normal' : 'inactive',
          headlineMetric: stencil.headlineMetric,
          transform: {
            position: attachToSelection ? [0, 0.4, 0] : nextLayoutPosition(layout),
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
          layerId: stencil.family === 'sensor' ? 'instrumentation' : 'process',
          overrides: { parameters: buildNodeParameters(stencil.id, project.library) },
          attachments: attachToSelection ? [{ targetNodeId: selectedNode.id, anchorId: 'instrument', offset: [0.18, 0.14, -0.12] }] : [],
          description: `${stencil.label} stencil added from the reusable equipment library.`,
        }

        layout.nodes.push(node)
        const callout = createCallout(node, project)
        if (callout) layout.annotations.push(callout)
        project.views.selectedIds = [node.id]
        return project
      })

    case 'duplicate-selected-node':
      return commitProject(state, (project) => {
        const layout = getActiveLayout(project)
        const node = getSelectedNode(project, layout)
        if (!node) return project
        const stencil = getStencilDefinition(node.stencilId, project.library)
        const duplicate = clone(node)
        duplicate.id = `${node.stencilId}-${Date.now().toString(36)}`
        duplicate.tag = nextTag(node.stencilId, project, project.library)
        duplicate.transform.position = [
          node.transform.position[0] + 0.9,
          node.transform.position[1],
          node.transform.position[2] + 0.45,
        ]
        layout.nodes.push(duplicate)
        const callout = createCallout(duplicate, project)
        if (callout) layout.annotations.push(callout)
        updateAnnotationTag(layout, duplicate.id, duplicate.tag, duplicate.status)
        project.views.selectedIds = [duplicate.id]
        duplicate.label = stencil.label.replace(' / Labeling', '')
        return project
      })

    case 'add-layout':
      return commitProject(state, (project) => {
        const layout = createBlankLayout(project)
        project.layouts.push(layout)
        project.views.activeLayoutId = layout.id
        project.views.selectedIds = []
        return project
      })

    case 'rename-layout':
      return commitProject(state, (project) => {
        const layout = getActiveLayout(project)
        layout.name = action.name
        return project
      })

    case 'set-card-position':
      return {
        ...state,
        ui: { ...state.ui, cardPosition: action.position },
      }

    case 'set-drawer-position':
      return {
        ...state,
        ui: { ...state.ui, drawerPosition: action.position },
      }

    case 'set-calm-minimized':
      return {
        ...state,
        ui: { ...state.ui, calmMinimized: action.value },
      }

    case 'toggle-json':
      return {
        ...state,
        ui: { ...state.ui, showJson: !state.ui.showJson, jsonError: '' },
      }

    case 'set-json-draft':
      return {
        ...state,
        ui: { ...state.ui, jsonDraft: action.value, jsonError: '' },
      }

    case 'apply-json':
      try {
        const parsed = JSON.parse(state.ui.jsonDraft)
        const nextProject = normalizeProjectDocument(parsed)
        return {
          ...state,
          project: nextProject,
          history: [...state.history.slice(-39), state.project],
          future: [],
          ui: {
            ...state.ui,
            jsonDraft: JSON.stringify(nextProject, null, 2),
            jsonError: '',
          },
        }
      } catch (error) {
        return {
          ...state,
          ui: {
            ...state.ui,
            jsonError: error instanceof Error ? error.message : 'Invalid JSON',
          },
        }
      }

    case 'undo': {
      const previous = state.history[state.history.length - 1]
      if (!previous) return state
      const history = state.history.slice(0, -1)
      const future = [state.project, ...state.future].slice(0, 40)
      return syncJson(previous, { ...state, project: previous, history, future })
    }

    case 'redo': {
      const [next, ...future] = state.future
      if (!next) return state
      return syncJson(next, {
        ...state,
        project: next,
        history: [...state.history, state.project].slice(-40),
        future,
      })
    }

    case 'send-scene-command':
      return {
        ...state,
        ui: {
          ...state.ui,
          sceneCommand: {
            type: action.command,
            nonce: state.ui.sceneCommand.nonce + 1,
          },
        },
      }

    default:
      return state
  }
}

export function ProjectProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const value = useMemo(() => {
    const activeLayout = getActiveLayout(state.project)
    const selectedNode = getSelectedNode(state.project, activeLayout)
    const issues = validateProjectDocument(state.project)

    return {
      state,
      dispatch,
      activeLayout,
      selectedNode,
      activeNodeParameters: selectedNode ? getNodeParameters(selectedNode, state.project.library) : [],
      activeNodeValues: selectedNode
        ? Object.fromEntries(getNodeParameters(selectedNode, state.project.library).map((parameter) => [parameter, getNodeParameterValue(selectedNode, parameter)]))
        : {},
      activeLayoutIssues: activeLayout ? getLayoutIssues(state.project, activeLayout.id) : [],
      issues,
      canUndo: state.history.length > 0,
      canRedo: state.future.length > 0,
    }
  }, [state])

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>
}

export function useProject() {
  const context = useContext(ProjectContext)
  if (!context) {
    throw new Error('useProject must be used inside ProjectProvider')
  }
  return context
}
