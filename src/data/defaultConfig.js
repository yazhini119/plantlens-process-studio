import {
  buildNodeParameters,
  getAnchorDefinition,
  getPortDefinition,
  getStencilDefinition,
  projectStencilLibrary,
} from './stencils'

const BASE_LAYERS = [
  { id: 'process', label: 'Process', visible: true },
  { id: 'instrumentation', label: 'Instrumentation', visible: true },
  { id: 'annotations', label: 'Annotations', visible: true },
  { id: 'context', label: 'Context', visible: true },
]

function clone(value) {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value))
}

function vector3(value, fallback = [0, 0, 0]) {
  return Array.isArray(value) && value.length === 3 ? value.map((entry) => Number(entry) || 0) : fallback
}

const STENCIL_GROUND_Y = {
  tank: 0.34,
  pump: 0.44,
  motor: 0.41,
  flowSensor: 0.46,
  pressureSensor: 0.39,
  temperatureSensor: 0.39,
  valve: 0.12,
  mixer: 0.34,
  heatExchanger: 0.38,
  compressor: 0.41,
  column: 0.33,
  conveyor: 0.29,
  skid: 0.42,
  filler: 0.45,
  capper: 0.45,
  packaging: 0.14,
  genericMachine: 0.36,
}

function getStableGroundY(node, library = projectStencilLibrary) {
  const stencil = getStencilDefinition(node.stencilId ?? node.model ?? 'genericMachine', library)
  const scale = vector3(node.transform?.scale, [1, 1, 1])
  const baseGround = STENCIL_GROUND_Y[stencil.id] ?? STENCIL_GROUND_Y.genericMachine
  return baseGround * Math.max(0.1, scale[1] || 1)
}

function stabilizeNodePosition(node, position, library = projectStencilLibrary) {
  if (node.attachments?.length) return position
  return [position[0], getStableGroundY(node, library), position[2]]
}

function buildNode({
  id,
  stencilId,
  tag,
  label,
  status = 'normal',
  transform,
  headlineMetric,
  description,
  layerId,
  parameterValues = {},
  attachments = [],
}) {
  return {
    id,
    stencilId,
    tag,
    label,
    status,
    transform: {
      position: stabilizeNodePosition(
        { stencilId, transform, attachments },
        vector3(transform?.position, [0, 0.58, 0]),
      ),
      rotation: vector3(transform?.rotation, [0, 0, 0]),
      scale: vector3(transform?.scale, [1, 1, 1]),
    },
    headlineMetric: headlineMetric ?? getStencilDefinition(stencilId).headlineMetric,
    layerId:
      layerId ??
      (getStencilDefinition(stencilId).family === 'sensor'
        ? 'instrumentation'
        : status === 'inactive'
          ? 'context'
          : 'process'),
    overrides: { parameters: { ...buildNodeParameters(stencilId), ...parameterValues } },
    attachments,
    description: description ?? 'No diagnostic text configured for this asset.',
  }
}

function buildRoute({
  id,
  from,
  to,
  medium = 'liquid',
  state = 'inactive',
  layerId = 'process',
  segments = [],
  style = {},
}) {
  return { id, from, to, medium, state, layerId, segments: segments.map((point) => vector3(point)), style }
}

function buildCallout({
  id,
  nodeId,
  label,
  note = '',
  tone = 'label',
  layerId = 'annotations',
  anchorId = 'callout',
  offset = [0, 0, 0],
}) {
  return { id, kind: 'callout', nodeId, label, note, tone, layerId, anchorId, offset: vector3(offset) }
}

function buildLayout({
  id,
  name,
  kind,
  nodes,
  routes,
  annotations,
  camera,
  insight,
  alarms,
  causalSteps,
}) {
  return {
    id,
    name,
    kind,
    nodes,
    routes,
    annotations,
    layers: clone(BASE_LAYERS),
    camera: {
      position: vector3(camera?.position, [7.8, 7.4, 9.2]),
      target: vector3(camera?.target, [0.85, 0.55, 0.1]),
      zoom: Number(camera?.zoom) || 62,
    },
    insight,
    alarms,
    causalSteps,
  }
}

const packagingLayout = buildLayout({
  id: 'layout-packaging',
  name: 'Packaging Line',
  kind: 'packaging',
  camera: { position: [7.8, 7.4, 9.2], target: [0.85, 0.55, 0.1], zoom: 62 },
  insight: {
    title: 'Pump pressure degradation affecting filling and capping',
    severity: 'High',
    confidence: '87%',
    origin: 'P-201',
    affectedAssets: 'P-201, FIT-401, F-401, C-501',
    nextSpread: 'Packaging / labeling',
    whatIsHappening:
      'Pump P-201 discharge pressure is low. Flow to the filler is reduced. Fill volume is falling and capper load is increasing.',
    whyItMatters:
      'Low flow can cause underfill, production delay, unstable capping performance, and downstream rejection risk.',
    whatCouldMakeThisWrong: ['sensor drift', 'temporary flow upset', 'partial blockage', 'feedback mismatch'],
    verifyNext: [
      'Check pump discharge pressure locally',
      'Verify FIT-401 flow reading',
      'Inspect filler inlet restriction',
      'Review recent mode / setpoint changes',
    ],
  },
  alarms: [
    { name: 'Pump Pressure Low', tag: 'P-201', value: '1.1 bar', nodeId: 'pump' },
    { name: 'Flow Rate Low', tag: 'FIT-401', value: '122.4 L/min', nodeId: 'fit401' },
    { name: 'Underfill Alarm', tag: 'F-401', value: 'ACTIVE', nodeId: 'filler401' },
    { name: 'Capper Torque High', tag: 'C-501', value: '3.8 N m', nodeId: 'capper501' },
  ],
  causalSteps: [
    { title: 'Pressure drop', body: 'P-201 is the origin event.', nodeId: 'pump' },
    { title: 'Flow reduction', body: 'FIT-401 confirms low flow.', nodeId: 'fit401' },
    { title: 'Underfill event', body: 'Filler delay becomes visible.', nodeId: 'filler401' },
    { title: 'Torque increase', body: 'Capper load rises downstream.', nodeId: 'capper501' },
    { title: 'Packaging risk', body: 'Reject and barcode checks are next.', nodeId: 'packaging601' },
  ],
  nodes: [
    buildNode({
      id: 'tank101',
      stencilId: 'tank',
      tag: 'TK-101',
      label: 'Tank',
      status: 'inactive',
      transform: { position: [-7.4, 0.72, -1.55], scale: [1, 1, 1] },
      description: 'Buffer is stable. Upstream storage is not the root cause.',
      parameterValues: {
        'Tank Level': '63.4%',
        'Tank Volume': '1,420 L',
        'Inlet Valve Status': 'Open',
        'Outlet Valve Status': 'Open',
        Temperature: '32.8 C',
      },
    }),
    buildNode({
      id: 'pump',
      stencilId: 'pump',
      tag: 'P-201',
      label: 'Pump',
      status: 'origin',
      transform: { position: [-5.25, 0.42, -1.05], scale: [1, 1, 1] },
      description: 'Origin detected. Pressure drop reduces system head.',
      parameterValues: {
        'Pump Pressure': '1.1 bar',
        'Flow Rate': '122.4 L/min',
        'Motor Current': '18.6 A',
        'Motor Voltage': '414 V',
        'Pump Speed': '1,420 rpm',
        Temperature: '32.8 C',
        Vibration: '7.8 mm/s',
        'Running Hours': '4,812 h',
        'Pump Status': 'Running',
      },
    }),
    buildNode({
      id: 'fit401',
      stencilId: 'flowSensor',
      tag: 'FIT-401',
      label: 'Flow Sensor',
      status: 'alarm',
      transform: { position: [-2.8, 0.5, -0.42], scale: [1, 1, 1] },
      description: 'Flow transmitter confirms the pressure loss as reduced flow.',
      parameterValues: {
        'Flow Rate': '122.4 L/min',
        'Total Flow': '84,320 L',
        'Sensor Output': '12.6 mA',
        'Signal Health': 'Good',
        'No Flow Alarm': 'Inactive',
      },
    }),
    buildNode({
      id: 'conveyor301',
      stencilId: 'conveyor',
      tag: 'CV-301',
      label: 'Conveyor',
      status: 'inactive',
      transform: { position: [-0.5, 0.36, 0.44], scale: [1, 1, 1] },
      description: 'Bottle transport is still running, so delay is caused by process feed.',
      parameterValues: {
        'Conveyor Speed': '18.0 m/min',
        'Motor Current': '11.4 A',
        'Object Count': '1,248',
        'Bottle Presence': 'Detected',
        'Jam Detection': 'Clear',
        'Motor Temperature': '44.2 C',
        'Emergency Stop': 'Healthy',
        'Running Hours': '7,640 h',
      },
    }),
    buildNode({
      id: 'filler401',
      stencilId: 'filler',
      tag: 'F-401',
      label: 'Filler',
      status: 'alarm',
      transform: { position: [1.75, 0.72, -0.08], scale: [1, 1, 1] },
      description: 'Low inlet flow causes underfill, fill-time increase, and bottle delay.',
      parameterValues: {
        'Fill Volume': '502 mL',
        'Target Fill Volume': '520 mL',
        'Filling Error': '-18 mL',
        'Fill Time': '1.8 s',
        'Bottle Present': 'Yes',
        'Nozzle Status': 'Enabled',
        'Valve Status': 'Pulsing',
        'Underfill Alarm': 'ACTIVE',
        'Overfill Alarm': 'Inactive',
      },
    }),
    buildNode({
      id: 'capper501',
      stencilId: 'capper',
      tag: 'C-501',
      label: 'Capper',
      status: 'alarm',
      transform: { position: [4.35, 0.76, 0.7], scale: [1, 1, 1] },
      description: 'Unstable fill height increases capping load and torque variation.',
      parameterValues: {
        'Capper Torque': '3.8 N m',
        'Target Torque': '1.2 N m',
        'Torque Error': '+2.6 N m',
        'Cap Presence': 'Detected',
        'Bottle Position': 'Aligned',
        'Motor Current': '15.0 A',
        'High Torque Alarm': 'ACTIVE',
        'Loose Cap Alarm': 'Inactive',
      },
    }),
    buildNode({
      id: 'packaging601',
      stencilId: 'packaging',
      tag: 'PKG-601',
      label: 'Packaging',
      status: 'downstream',
      transform: { position: [7.15, 0.62, 1.45], scale: [1, 1, 1] },
      description: 'Connected consequence reaches labeling, barcode, and rejection checks.',
      parameterValues: {
        'Labeling Status': 'Waiting',
        'Label Applied': 'Pending',
        'Label Count': '1,198',
        'Packaging Count': '1,187',
        'Rejected Products': '27',
        'Printer Status': 'Ready',
        'Barcode Scan Status': 'Queued',
      },
    }),
  ],
  routes: [
    buildRoute({
      id: 'route-tank-pump',
      from: { nodeId: 'tank101', portId: 'outlet' },
      to: { nodeId: 'pump', portId: 'inlet' },
      medium: 'liquid',
      state: 'inactive',
      layerId: 'context',
      segments: [[-6.3, 0.24, -1.05]],
    }),
    buildRoute({
      id: 'route-pump-fit',
      from: { nodeId: 'pump', portId: 'outlet' },
      to: { nodeId: 'fit401', portId: 'inlet' },
      medium: 'liquid',
      state: 'active',
      segments: [[-4.4, 0.18, -0.96], [-3.45, 0.28, -0.64]],
    }),
    buildRoute({
      id: 'route-fit-filler',
      from: { nodeId: 'fit401', portId: 'outlet' },
      to: { nodeId: 'filler401', portId: 'inlet' },
      medium: 'liquid',
      state: 'active',
      segments: [[-1.95, 0.5, -0.28], [0.2, 0.6, -0.24], [1.08, 0.92, -0.44]],
    }),
    buildRoute({
      id: 'route-filler-capper',
      from: { nodeId: 'filler401', portId: 'outlet' },
      to: { nodeId: 'capper501', portId: 'inlet' },
      medium: 'liquid',
      state: 'active',
      segments: [[2.82, 0.88, 0.06], [3.74, 0.84, 0.3]],
    }),
    buildRoute({
      id: 'route-capper-packaging',
      from: { nodeId: 'capper501', portId: 'outlet' },
      to: { nodeId: 'packaging601', portId: 'inlet' },
      medium: 'signal',
      state: 'downstream',
      style: { dashed: true },
      segments: [[5.15, 0.8, 0.8], [6.12, 0.74, 1.04]],
    }),
  ],
  annotations: [
    buildCallout({ id: 'callout-pump', nodeId: 'pump', label: 'P-201', note: '(Origin)', tone: 'origin' }),
    buildCallout({ id: 'callout-fit', nodeId: 'fit401', label: 'FIT-401' }),
    buildCallout({ id: 'callout-filler', nodeId: 'filler401', label: 'F-401' }),
    buildCallout({ id: 'callout-capper', nodeId: 'capper501', label: 'C-501' }),
    buildCallout({ id: 'callout-packaging', nodeId: 'packaging601', label: 'PKG-601', note: 'Packaging / Labeling' }),
  ],
})

const utilitiesLayout = buildLayout({
  id: 'layout-utilities',
  name: 'Utilities Train',
  kind: 'utilities',
  camera: { position: [7.1, 6.8, 8.6], target: [0.55, 0.55, 0.1], zoom: 58 },
  insight: {
    title: 'Utilities layout ready for extension',
    severity: 'Low',
    confidence: '74%',
    origin: 'SK-706',
    affectedAssets: 'MX-702, XV-703, HX-704, SK-706',
    nextSpread: 'Air and utility balancing',
    whatIsHappening:
      'This layout demonstrates a second process document using the same stencil library, route schema, and editor controls.',
    whyItMatters:
      'Adding another process should be data-driven. The same node definitions, routes, and validation rules now support multiple layouts.',
    whatCouldMakeThisWrong: ['wrong medium class', 'missing utility tap', 'unattached instrument'],
    verifyNext: ['Add another utility node', 'Connect ports by medium', 'Switch layouts and confirm 3D sync'],
  },
  alarms: [{ name: 'Utility Skid Ready', tag: 'SK-706', value: 'Clear', nodeId: 'skid706' }],
  causalSteps: [
    { title: 'Shared library', body: 'Each asset is instantiated from the same registry.', nodeId: 'mix702' },
    { title: 'Port routing', body: 'Connections are typed and port-based.', nodeId: 'valve703' },
    { title: 'Layered view', body: 'Instrumentation can be isolated without hiding the process schema.', nodeId: 'pit705' },
  ],
  nodes: [
    buildNode({
      id: 'mix702',
      stencilId: 'mixer',
      tag: 'MX-702',
      label: 'Blend Mixer',
      status: 'normal',
      transform: { position: [-4.8, 0.62, -0.4], scale: [1, 1, 1] },
      parameterValues: {
        'Mixer Speed': '318 rpm',
        'Motor Current': '12.7 A',
        Torque: '44%',
        Temperature: '31 C',
        'Run Status': 'Running',
      },
      description: 'Shared stencil, new layout: no extra renderer code was required.',
    }),
    buildNode({
      id: 'valve703',
      stencilId: 'valve',
      tag: 'XV-703',
      label: 'Control Valve',
      status: 'normal',
      transform: { position: [-2.2, 0.48, -0.12], scale: [1, 1, 1] },
      parameterValues: {
        'Valve Position': '64%',
        'Command Signal': '63%',
        'Feedback Signal': '64%',
        'Air Supply': 'Healthy',
        'Fault Status': 'Clear',
      },
      description: 'Valve placement is snapped and validated through typed ports.',
    }),
    buildNode({
      id: 'hx704',
      stencilId: 'heatExchanger',
      tag: 'HX-704',
      label: 'Heat Exchanger',
      status: 'normal',
      transform: { position: [0.35, 0.52, 0.14], scale: [1, 1, 1] },
      parameterValues: {
        'Inlet Temperature': '27 C',
        'Outlet Temperature': '33 C',
        'Differential Pressure': '0.24 bar',
        'Flow Rate': '154 L/min',
        'Fouling Index': 'Low',
      },
      description: 'Process and utility assets can coexist inside the same document model.',
    }),
    buildNode({
      id: 'skid706',
      stencilId: 'skid',
      tag: 'SK-706',
      label: 'Utility Skid',
      status: 'downstream',
      transform: { position: [3.1, 0.52, 0.5], scale: [1, 1, 1] },
      parameterValues: {
        'Skid Status': 'Ready',
        'Inlet Pressure': '2.9 bar',
        'Outlet Pressure': '2.7 bar',
        'Flow Rate': '154 L/min',
        'Alarm Summary': 'Clear',
      },
      description: 'This layout proves the system can scale without adding ad hoc component cases.',
    }),
    buildNode({
      id: 'comp707',
      stencilId: 'compressor',
      tag: 'C-707',
      label: 'Air Compressor',
      status: 'inactive',
      transform: { position: [5.75, 0.48, 0.18], scale: [1, 1, 1] },
      parameterValues: {
        'Discharge Pressure': '2.1 bar',
        'Suction Pressure': '0.7 bar',
        'Motor Current': '10.1 A',
        Vibration: '1.6 mm/s',
        'Discharge Temperature': '56 C',
      },
      description: 'Air-side equipment uses the same route engine with a different medium type.',
    }),
    buildNode({
      id: 'pit705',
      stencilId: 'pressureSensor',
      tag: 'PIT-705',
      label: 'Pressure Transmitter',
      status: 'normal',
      transform: { position: [0.18, 0.4, -0.36], scale: [1, 1, 1] },
      attachments: [{ targetNodeId: 'hx704', anchorId: 'instrument', offset: [0.22, 0.16, -0.14] }],
      parameterValues: {
        Pressure: '2.2 bar',
        'Sensor Output': '11.9 mA',
        'Signal Health': 'Good',
        'High Pressure Alarm': 'Inactive',
        'Low Pressure Alarm': 'Inactive',
      },
      description: 'Attached instrumentation resolves against host anchors instead of freehand offsets.',
    }),
  ],
  routes: [
    buildRoute({
      id: 'route-mix-valve',
      from: { nodeId: 'mix702', portId: 'outlet' },
      to: { nodeId: 'valve703', portId: 'inlet' },
      medium: 'liquid',
      state: 'active',
      segments: [[-3.3, 0.3, -0.26]],
    }),
    buildRoute({
      id: 'route-valve-hx',
      from: { nodeId: 'valve703', portId: 'outlet' },
      to: { nodeId: 'hx704', portId: 'inlet' },
      medium: 'liquid',
      state: 'active',
      segments: [[-0.8, 0.28, 0], [-0.2, 0.3, 0.08]],
    }),
    buildRoute({
      id: 'route-hx-skid',
      from: { nodeId: 'hx704', portId: 'outlet' },
      to: { nodeId: 'skid706', portId: 'inlet' },
      medium: 'liquid',
      state: 'downstream',
      style: { dashed: true },
      segments: [[1.55, 0.32, 0.24], [2.25, 0.28, 0.36]],
    }),
    buildRoute({
      id: 'route-comp-signal',
      from: { nodeId: 'comp707', portId: 'outlet' },
      to: { nodeId: 'skid706', portId: 'outlet' },
      medium: 'air',
      state: 'inactive',
      layerId: 'context',
      segments: [[4.95, 0.82, 0.34]],
    }),
  ],
  annotations: [
    buildCallout({ id: 'callout-mix', nodeId: 'mix702', label: 'MX-702' }),
    buildCallout({ id: 'callout-hx', nodeId: 'hx704', label: 'HX-704' }),
    buildCallout({ id: 'callout-skid', nodeId: 'skid706', label: 'SK-706' }),
    buildCallout({ id: 'callout-pit', nodeId: 'pit705', label: 'PIT-705' }),
  ],
})

export const legacyScenario = {
  insight: packagingLayout.insight,
  stations: packagingLayout.nodes.map((node) => ({
    id: node.id,
    model: getStencilDefinition(node.stencilId).renderer,
    label: node.label,
    tag: node.tag,
    headlineMetric: node.headlineMetric,
    status: node.status,
    position: node.transform.position,
    rotation: node.transform.rotation,
    scale: node.transform.scale[0],
    ports: {},
    parameters: Object.keys(node.overrides.parameters),
    chain: node.description,
  })),
}

export const defaultConfig = normalizeProjectDocument({
  version: 2,
  name: 'PlantLens Process Studio',
  library: projectStencilLibrary,
  variables: {},
  layouts: [packagingLayout, utilitiesLayout],
  views: {
    activeLayoutId: packagingLayout.id,
    selectedIds: [],
    activeTool: 'select',
    isolatedLayerId: null,
    showGrid: true,
  },
})

function normalizeNode(node, library, index = 0) {
  const stencil = getStencilDefinition(node.stencilId ?? node.model ?? 'genericMachine', library)
  const basePosition = vector3(node.transform?.position ?? node.position, [index * 2.2 - 4, 0.58, 0])
  return {
    id: node.id ?? `node-${index + 1}`,
    stencilId: stencil.id,
    tag: node.tag ?? `${stencil.tagPrefix}-${String(index + 1).padStart(3, '0')}`,
    label: node.label ?? stencil.label,
    status: node.status ?? 'normal',
    headlineMetric: node.headlineMetric ?? stencil.headlineMetric,
    transform: {
      position: stabilizeNodePosition(node, basePosition, library),
      rotation: vector3(node.transform?.rotation ?? node.rotation, [0, 0, 0]),
      scale:
        Array.isArray(node.transform?.scale) && node.transform.scale.length === 3
          ? vector3(node.transform.scale, [1, 1, 1])
          : [Number(node.scale) || 1, Number(node.scale) || 1, Number(node.scale) || 1],
    },
    layerId:
      node.layerId ??
      (stencil.family === 'sensor' ? 'instrumentation' : node.status === 'inactive' ? 'context' : 'process'),
    overrides: {
      ...(node.overrides ?? {}),
      parameters: {
        ...buildNodeParameters(stencil.id, library),
        ...(node.overrides?.parameters ?? node.parameterValues ?? {}),
      },
    },
    attachments: Array.isArray(node.attachments)
      ? node.attachments.map((attachment) => ({
        targetNodeId: attachment.targetNodeId,
        anchorId: attachment.anchorId ?? 'instrument',
        offset: vector3(attachment.offset, [0, 0, 0]),
      }))
      : [],
    description: node.description ?? node.chain ?? 'No diagnostic text configured for this asset.',
  }
}

function normalizeRoute(route, index = 0) {
  return {
    id: route.id ?? `route-${index + 1}`,
    from: { nodeId: route.from?.nodeId, portId: route.from?.portId ?? 'outlet' },
    to: { nodeId: route.to?.nodeId, portId: route.to?.portId ?? 'inlet' },
    medium: route.medium ?? 'liquid',
    state: route.state ?? 'inactive',
    layerId: route.layerId ?? 'process',
    segments: Array.isArray(route.segments) ? route.segments.map((segment) => vector3(segment)) : [],
    style: route.style ?? {},
  }
}

function normalizeAnnotation(annotation, index = 0) {
  return {
    id: annotation.id ?? `annotation-${index + 1}`,
    kind: annotation.kind ?? 'callout',
    nodeId: annotation.nodeId,
    label: annotation.label ?? '',
    note: annotation.note ?? '',
    tone: annotation.tone ?? 'label',
    layerId: annotation.layerId ?? 'annotations',
    anchorId: annotation.anchorId ?? 'callout',
    offset: vector3(annotation.offset, [0, 0, 0]),
  }
}

function normalizeLayout(layout, library, index = 0) {
  const nodes = Array.isArray(layout.nodes) ? layout.nodes.map((node, nodeIndex) => normalizeNode(node, library, nodeIndex)) : []

  return {
    id: layout.id ?? `layout-${index + 1}`,
    name: layout.name ?? `Layout ${index + 1}`,
    kind: layout.kind ?? 'process',
    nodes,
    routes: Array.isArray(layout.routes) ? layout.routes.map((route, routeIndex) => normalizeRoute(route, routeIndex)) : [],
    annotations: Array.isArray(layout.annotations)
      ? layout.annotations.map((annotation, annotationIndex) => normalizeAnnotation(annotation, annotationIndex))
      : [],
    layers: Array.isArray(layout.layers) && layout.layers.length
      ? layout.layers.map((layer) => ({ id: layer.id, label: layer.label, visible: layer.visible !== false }))
      : clone(BASE_LAYERS),
    camera: {
      position: vector3(layout.camera?.position, [7.8, 7.4, 9.2]),
      target: vector3(layout.camera?.target, [0.85, 0.55, 0.1]),
      zoom: Number(layout.camera?.zoom) || 62,
    },
    insight: {
      ...packagingLayout.insight,
      ...(layout.insight ?? {}),
    },
    alarms: Array.isArray(layout.alarms) ? layout.alarms : [],
    causalSteps: Array.isArray(layout.causalSteps) ? layout.causalSteps : [],
  }
}

function adaptLegacyConfig(nextConfig) {
  const layout = clone(packagingLayout)
  const stations = Array.isArray(nextConfig.stations) ? nextConfig.stations : []

  if (stations.length) {
    layout.nodes = stations.map((station, index) =>
      normalizeNode(
        {
          id: station.id,
          stencilId: station.stencilId ?? station.model ?? 'genericMachine',
          tag: station.tag,
          label: station.label,
          status: station.status,
          headlineMetric: station.headlineMetric,
          position: station.position,
          rotation: station.rotation,
          scale: station.scale,
          chain: station.chain,
          parameterValues: Object.fromEntries(
            (station.parameters ?? []).map((parameter) => [parameter, nextConfig.parameterValues?.[parameter] ?? buildNodeParameters(station.model ?? 'genericMachine')[parameter] ?? 'Ready']),
          ),
        },
        projectStencilLibrary,
        index,
      ),
    )

    layout.annotations = stations
      .filter((station) => station.callout)
      .map((station, index) =>
        normalizeAnnotation(
          {
            id: `legacy-callout-${index + 1}`,
            nodeId: station.id,
            label: station.callout?.label ?? station.tag,
            note: station.callout?.note ?? '',
            tone: station.callout?.color === 'origin' ? 'origin' : 'label',
            offset: station.callout?.offset ?? [0, 0, 0],
          },
          index,
        ),
      )
  }

  return normalizeProjectDocument({
    version: 2,
    name: 'PlantLens Process Studio',
    library: projectStencilLibrary,
    variables: {},
    layouts: [
      {
        ...layout,
        insight: { ...layout.insight, ...(nextConfig.insight ?? {}) },
        alarms: Array.isArray(nextConfig.alarms) ? nextConfig.alarms.map((alarm) => ({ ...alarm, nodeId: alarm.nodeId ?? alarm.stationId })) : layout.alarms,
        causalSteps: Array.isArray(nextConfig.causalSteps)
          ? nextConfig.causalSteps.map((step) => ({ ...step, nodeId: step.nodeId ?? step.stationId }))
          : layout.causalSteps,
      },
      utilitiesLayout,
    ],
    views: {
      activeLayoutId: 'layout-packaging',
      selectedIds: [],
      activeTool: 'select',
      isolatedLayerId: null,
      showGrid: true,
    },
  })
}

export function normalizeProjectDocument(nextConfig) {
  if (Array.isArray(nextConfig?.stations)) {
    return adaptLegacyConfig(nextConfig)
  }

  const library = { ...projectStencilLibrary, ...(nextConfig?.library ?? {}) }
  const layouts = Array.isArray(nextConfig?.layouts)
    ? nextConfig.layouts.map((layout, index) => normalizeLayout(layout, library, index))
    : [clone(packagingLayout), clone(utilitiesLayout)]

  const activeLayoutId = nextConfig?.views?.activeLayoutId && layouts.some((layout) => layout.id === nextConfig.views.activeLayoutId)
    ? nextConfig.views.activeLayoutId
    : layouts[0]?.id

  return {
    version: 2,
    name: nextConfig?.name ?? 'PlantLens Process Studio',
    library,
    variables: { ...(nextConfig?.variables ?? {}) },
    layouts,
    views: {
      selectedIds: Array.isArray(nextConfig?.views?.selectedIds) ? nextConfig.views.selectedIds : [],
      activeLayoutId,
      activeTool: nextConfig?.views?.activeTool ?? 'select',
      isolatedLayerId: nextConfig?.views?.isolatedLayerId ?? null,
      showGrid: nextConfig?.views?.showGrid !== false,
    },
  }
}

export const normalizedConfig = normalizeProjectDocument

export function getActiveLayout(project) {
  return project.layouts.find((layout) => layout.id === project.views.activeLayoutId) ?? project.layouts[0]
}

export function getSelectedNode(project, layout = getActiveLayout(project)) {
  const selectedId = project.views.selectedIds[0]
  return layout?.nodes.find((node) => node.id === selectedId) ?? null
}

export function getNodePosition(node, layout, library = projectStencilLibrary) {
  const base = stabilizeNodePosition(node, vector3(node.transform?.position, [0, 0, 0]), library)
  const attachment = node.attachments[0]
  if (!attachment) return base

  const targetNode = layout.nodes.find((entry) => entry.id === attachment.targetNodeId)
  if (!targetNode) return base

  const hostPosition = getNodePosition(targetNode, layout, library)
  const anchor = getAnchorDefinition(targetNode.stencilId, attachment.anchorId, library)
  if (!anchor) return base

  return [
    hostPosition[0] + anchor.position[0] + attachment.offset[0],
    hostPosition[1] + anchor.position[1] + attachment.offset[1],
    hostPosition[2] + anchor.position[2] + attachment.offset[2],
  ]
}

export function resolveAnchorWorldPosition(node, anchorId, layout, library = projectStencilLibrary) {
  const nodePosition = getNodePosition(node, layout, library)
  const anchor = getAnchorDefinition(node.stencilId, anchorId, library)
  if (!anchor) return nodePosition
  return [
    nodePosition[0] + anchor.position[0],
    nodePosition[1] + anchor.position[1],
    nodePosition[2] + anchor.position[2],
  ]
}

export function resolvePortWorldPosition(node, portId, layout, library = projectStencilLibrary) {
  const nodePosition = getNodePosition(node, layout, library)
  const port = getPortDefinition(node.stencilId, portId, library)
  if (!port) return nodePosition
  return [
    nodePosition[0] + port.position[0],
    nodePosition[1] + port.position[1],
    nodePosition[2] + port.position[2],
  ]
}

export function resolveRoutePoints(route, layout, library = projectStencilLibrary) {
  const fromNode = layout.nodes.find((node) => node.id === route.from.nodeId)
  const toNode = layout.nodes.find((node) => node.id === route.to.nodeId)
  if (!fromNode || !toNode) return []

  const start = resolvePortWorldPosition(fromNode, route.from.portId, layout, library)
  const end = resolvePortWorldPosition(toNode, route.to.portId, layout, library)
  const segments = route.segments.map((segment, index) => {
    const point = vector3(segment)
    const ratio = (index + 1) / (route.segments.length + 1)
    return [point[0], start[1] + (end[1] - start[1]) * ratio, point[2]]
  })

  return [
    start,
    ...segments,
    end,
  ]
}

export function getNodeParameterValue(node, parameter) {
  return node.overrides?.parameters?.[parameter] ?? ''
}

export function getNodeParameters(node, library = projectStencilLibrary) {
  return getStencilDefinition(node.stencilId, library).parameters
}
