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
  const height = typeof window === 'undefined' ? 820 : window.innerHeight
  return {
    cardPosition: { x: 16, y: 118 },
    drawerPosition: { x: Math.max(12, width - 360), y: 112 },
    signalTrayPosition: { x: Math.max(12, Math.round((width - 520) / 2)), y: Math.max(12, height - 96) },
    rolePanelPosition: { x: Math.max(12, width - 450), y: 96 },
    miniMapPosition: { x: Math.max(12, width - 256), y: Math.max(12, height - 168) },
    timelinePosition: { x: 16, y: Math.max(12, height - 260) },
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

function getFirstPort(stencil, direction) {
  return stencil.ports.find((port) => port.direction === direction)?.id ?? stencil.ports[0]?.id ?? 'port'
}

function routeMediumFromConnectionType(connectionType) {
  const mediumMap = {
    processFlow: 'liquid',
    signal: 'signal',
    power: 'power',
    dcPower: 'dc-power',
    acPower: 'ac-power',
    rs485: 'rs485',
    alarmDependency: 'signal',
    utilityLine: 'air',
  }
  return mediumMap[connectionType] ?? 'liquid'
}

function routeStyleFromConnectionType(connectionType) {
  return connectionType === 'signal' || connectionType === 'rs485' || connectionType === 'alarmDependency' || connectionType === 'utilityLine'
    ? { dashed: true }
    : {}
}

function routeStateFromConnectionType(connectionType) {
  return connectionType === 'alarmDependency' ? 'alarm' : 'active'
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

    case 'update-node-field':
      return commitProject(state, (project) => {
        const layout = getActiveLayout(project)
        const node = layout.nodes.find((entry) => entry.id === action.nodeId)
        if (!node) return project
        if (action.field === 'tag') {
          node.tag = action.value
          updateAnnotationTag(layout, node.id, node.tag, node.status)
          return project
        }
        if (action.field === 'label') {
          node.label = action.value
          return project
        }
        if (action.field === 'status') {
          node.status = action.value
          updateAnnotationTag(layout, node.id, node.tag, node.status)
          return project
        }
        if (action.field === 'layerId') {
          node.layerId = action.value
        }
        return project
      })

    case 'delete-selected-node':
      return commitProject(state, (project) => {
        const layout = getActiveLayout(project)
        const nodeId = project.views.selectedIds[0]
        if (!nodeId) return project
        layout.nodes = layout.nodes.filter((node) => node.id !== nodeId)
        layout.routes = layout.routes.filter((route) => route.from.nodeId !== nodeId && route.to.nodeId !== nodeId)
        layout.annotations = layout.annotations.filter((annotation) => annotation.nodeId !== nodeId)
        project.views.selectedIds = []
        return project
      })

    case 'delete-route':
      return commitProject(state, (project) => {
        const layout = getActiveLayout(project)
        layout.routes = layout.routes.filter((route) => route.id !== action.routeId)
        return project
      })

    case 'add-route-between-nodes':
      return commitProject(state, (project) => {
        const layout = getActiveLayout(project)
        const fromNode = layout.nodes.find((node) => node.id === action.fromNodeId)
        const toNode = layout.nodes.find((node) => node.id === action.toNodeId)
        if (!fromNode || !toNode || fromNode.id === toNode.id) return project
        const fromStencil = getStencilDefinition(fromNode.stencilId, project.library)
        const toStencil = getStencilDefinition(toNode.stencilId, project.library)
        layout.routes.push({
          id: `route-${Date.now().toString(36)}`,
          from: { nodeId: fromNode.id, portId: action.fromPortId ?? getFirstPort(fromStencil, 'out') },
          to: { nodeId: toNode.id, portId: action.toPortId ?? getFirstPort(toStencil, 'in') },
          medium: routeMediumFromConnectionType(action.connectionType),
          segments: [],
          state: routeStateFromConnectionType(action.connectionType),
          style: routeStyleFromConnectionType(action.connectionType),
          connectionType: action.connectionType ?? 'processFlow',
          label: action.label ?? '',
          direction: 'forward',
        })
        return project
      })

    case 'update-route-field':
      return commitProject(state, (project) => {
        const layout = getActiveLayout(project)
        const route = layout.routes.find((entry) => entry.id === action.routeId)
        if (!route) return project
        if (action.field === 'label') route.label = action.value
        if (action.field === 'direction') route.direction = action.value
        if (action.field === 'connectionType') {
          route.connectionType = action.value
          route.medium = routeMediumFromConnectionType(action.value)
          route.state = routeStateFromConnectionType(action.value)
          route.style = routeStyleFromConnectionType(action.value)
        }
        if (action.field === 'fromNodeId') route.from.nodeId = action.value
        if (action.field === 'toNodeId') route.to.nodeId = action.value
        return project
      })

    case 'move-node':
      return commitProject(state, (project) => {
        const layout = getActiveLayout(project)
        const node = layout.nodes.find((entry) => entry.id === action.nodeId)
        if (!node) return project
        if (action.detachAttachments) node.attachments = []
        if (node.attachments.length) return project
        node.transform.position = action.position
        return project
      }, { trackHistory: action.trackHistory !== false })

    case 'add-stencil-node':
      return commitProject(state, (project) => {
        const layout = getActiveLayout(project)
        const stencil = getStencilDefinition(action.stencilId, project.library)
        const selectedNode = getSelectedNode(project, layout)
        const payload = action.payload ?? {}
        const attachToSelection = payload.attachToSelection === true && selectedNode && canAttachStencilToNode(stencil.id, selectedNode, project.library)
        const id = `${stencil.id}-${Date.now().toString(36)}`
        const defaultLabel = stencil.label.replace(' / Labeling', '')
        const defaultParameters = buildNodeParameters(stencil.id, project.library)
        const node = {
          id,
          stencilId: stencil.id,
          tag: payload.tag?.trim() || nextTag(stencil.id, project, project.library),
          label: payload.label?.trim() || defaultLabel,
          status: payload.status ?? (stencil.family === 'sensor' ? 'normal' : 'inactive'),
          headlineMetric: stencil.headlineMetric,
          transform: {
            position: payload.position ?? (attachToSelection ? [0, 0.4, 0] : nextLayoutPosition(layout)),
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
          },
          layerId:
            payload.layerId ??
            (stencil.family === 'sensor'
              ? 'instrumentation'
              : (payload.status ?? (stencil.family === 'sensor' ? 'normal' : 'inactive')) === 'inactive'
                ? 'context'
                : 'process'),
          overrides: { parameters: { ...defaultParameters, ...(payload.parameters ?? {}) } },
          attachments: attachToSelection ? [{ targetNodeId: selectedNode.id, anchorId: 'instrument', offset: [0.18, 0.14, -0.12] }] : [],
          description: payload.description ?? `${stencil.label} stencil added from the reusable equipment library.`,
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
        project.views.activeTool = 'select'
        project.views.showGrid = true
        project.views.isolatedLayerId = null
        return project
      })

    case 'delete-layout':
      return commitProject(state, (project) => {
        if (project.layouts.length <= 1) return project
        const activeLayoutId = action.layoutId ?? project.views.activeLayoutId
        const index = project.layouts.findIndex((layout) => layout.id === activeLayoutId)
        if (index < 0) return project

        project.layouts = project.layouts.filter((layout) => layout.id !== activeLayoutId)
        const fallback = project.layouts[Math.max(0, index - 1)] ?? project.layouts[0]
        project.views.activeLayoutId = fallback.id
        project.views.selectedIds = []
        project.views.activeTool = 'select'
        project.views.isolatedLayerId = null
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

    case 'set-signal-tray-position':
      return {
        ...state,
        ui: { ...state.ui, signalTrayPosition: action.position },
      }

    case 'set-role-panel-position':
      return {
        ...state,
        ui: { ...state.ui, rolePanelPosition: action.position },
      }

    case 'set-minimap-position':
      return {
        ...state,
        ui: { ...state.ui, miniMapPosition: action.position },
      }

    case 'set-timeline-position':
      return {
        ...state,
        ui: { ...state.ui, timelinePosition: action.position },
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
