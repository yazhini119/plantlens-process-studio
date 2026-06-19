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
  panelBackplate: 0.06,
  dcSource: 0.36,
  acMains: 0.36,
  fuseBlock: 0.36,
  mcbBreaker: 0.38,
  charger: 0.4,
  lithiumBattery: 0.38,
  solarInverter: 0.42,
  vfdDrive: 0.42,
  acMotorLoad: 0.42,
  acMfm: 0.36,
  dcMfm: 0.36,
  plcRack: 0.42,
  hmiPanel: 0.38,
  rs485Bus: 0.2,
  tempVibCard: 0.36,
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

const solarInverterPanelLayout = buildLayout({
  id: 'layout-solar-inverter-panel',
  name: 'Solar Inverter Panel',
  kind: 'power-panel',
  camera: { position: [9.8, 8.6, 10.8], target: [0.45, 0.45, -0.15], zoom: 54 },
  insight: {
    title: 'Commissioned power conversion chain ready from source to motor load',
    severity: 'Low',
    confidence: '91%',
    origin: 'INV-301',
    affectedAssets: 'DCM-203, BAT-201, INV-301, VFD-401, MTR-501, PLC-701',
    nextSpread: 'No active spread',
    whatIsHappening:
      'The 24V lithium battery feeds the 2.5kVA inverter, AC metering confirms 230VAC output, and the VFD drives the 1HP motor load while PLC/HMI observe all RS485 and temperature signals.',
    whyItMatters:
      'A clean source-to-load view lets the jury see power, protection, metering, control, and motor health as one connected industrial system.',
    whatCouldMakeThisWrong: ['unapproved wiring change', 'wrong MFM polarity', 'loose terminal', 'missing RS485 termination'],
    verifyNext: [
      'Check DC source and battery voltage locally',
      'Confirm inverter 230VAC output on AC MFM',
      'Verify VFD frequency and motor current',
      'Review PLC RS485 card and temperature card status',
    ],
  },
  alarms: [
    { name: 'Panel Commissioned', tag: 'PNL-100', value: 'READY', nodeId: 'panelBase' },
  ],
  causalSteps: [
    { title: 'DC source protected', body: '48VDC source passes fuse, MCB, charger, and DC metering.', nodeId: 'dcSource101' },
    { title: 'Battery bus stable', body: '24V lithium battery supplies the downstream inverter chain.', nodeId: 'battery201' },
    { title: 'AC conversion', body: '2.5kVA inverter creates 230VAC output for drive equipment.', nodeId: 'inv301' },
    { title: 'Drive control', body: 'VFD converts AC supply into motor speed command.', nodeId: 'vfd401' },
    { title: 'PLC visibility', body: 'RS485 and temp/vibration signals converge at PLC and HMI.', nodeId: 'plc701' },
  ],
  nodes: [
    buildNode({
      id: 'panelBase',
      stencilId: 'panelBackplate',
      tag: 'PNL-100',
      label: 'Panel to fix all',
      status: 'normal',
      transform: { position: [0.1, 0.08, -0.18], scale: [3.9, 1, 2.25] },
      description: 'Base panel used to mount the complete inverter, metering, PLC, and motor-control chain.',
      parameterValues: {
        'Panel Status': 'Mounted',
        'Panel Size': 'Industrial demo backplate',
        Earthing: 'Bonded',
        'IP Rating': 'IP54',
        'Cooling Clearance': 'Clear',
      },
    }),
    buildNode({
      id: 'dcSource101',
      stencilId: 'dcSource',
      tag: 'DC-101',
      label: '48VDC or Solar PV',
      status: 'normal',
      transform: { position: [-7.6, 0.4, -3.7], scale: [1, 1, 1] },
      description: 'Incoming -48V DC source used in place of solar PV for the demo bench.',
    }),
    buildNode({
      id: 'dcFuse101',
      stencilId: 'fuseBlock',
      tag: 'FUSE-101',
      label: 'DC Fuse',
      status: 'normal',
      transform: { position: [-7.6, 0.36, -2.62], scale: [0.96, 1, 1] },
      description: 'First DC-side protection device before the DC charger path.',
    }),
    buildNode({
      id: 'dcMcb101',
      stencilId: 'mcbBreaker',
      tag: 'MCB-101',
      label: 'DC MCB',
      status: 'normal',
      transform: { position: [-7.6, 0.38, -1.58], scale: [0.96, 1, 1] },
      description: 'DC branch breaker isolates the charger and battery feed.',
    }),
    buildNode({
      id: 'solarCharger101',
      stencilId: 'charger',
      tag: 'CHG-101',
      label: 'Solar Charger',
      status: 'normal',
      transform: { position: [-7.6, 0.4, -0.5], scale: [1, 1, 1] },
      description: 'DC/DC charger regulates incoming 48V source to the 24V lithium battery bus.',
      parameterValues: {
        'Input Voltage': '-48 V',
        'Output Voltage': '24 VDC',
        'Charge Current': '21.6 A',
        'Charge Mode': 'Float',
        'Charger Health': 'Healthy',
      },
    }),
    buildNode({
      id: 'dcmSolar201',
      stencilId: 'dcMfm',
      tag: 'DCM-201',
      label: 'DC MFM Solar',
      status: 'normal',
      transform: { position: [-6.18, 0.36, 0.28], scale: [0.9, 1, 1] },
      description: 'DC MFM captures V1, I1, P1 from the source/charger branch and reports by RS485.',
      parameterValues: { Voltage: '24.8 V', Current: '21.6 A', Power: '0.54 kW' },
    }),
    buildNode({
      id: 'acMains101',
      stencilId: 'acMains',
      tag: 'AC-101',
      label: '230VAC',
      status: 'normal',
      transform: { position: [-3.7, 0.4, -3.7], scale: [1, 1, 1] },
      description: 'Incoming mains supply for the battery charger fallback branch.',
    }),
    buildNode({
      id: 'acFuse101',
      stencilId: 'fuseBlock',
      tag: 'FUSE-102',
      label: 'AC Fuse',
      status: 'normal',
      transform: { position: [-3.7, 0.36, -2.62], scale: [0.96, 1, 1] },
      description: 'Mains branch fuse ahead of the MCB and mains charger.',
    }),
    buildNode({
      id: 'acMcb101',
      stencilId: 'mcbBreaker',
      tag: 'MCB-102',
      label: 'AC MCB',
      status: 'normal',
      transform: { position: [-3.7, 0.38, -1.58], scale: [0.96, 1, 1] },
      description: 'AC branch breaker protecting the mains charger input.',
    }),
    buildNode({
      id: 'mainsCharger101',
      stencilId: 'charger',
      tag: 'CHG-102',
      label: 'Mains Charger',
      status: 'normal',
      transform: { position: [-3.7, 0.4, -0.5], scale: [1, 1, 1] },
      description: 'AC/DC charger keeps the battery bus available from 230VAC mains.',
      parameterValues: {
        'Input Voltage': '230 VAC',
        'Output Voltage': '24 VDC',
        'Charge Current': '16.8 A',
        'Charge Mode': 'Standby',
        'Charger Health': 'Healthy',
      },
    }),
    buildNode({
      id: 'dcmMains202',
      stencilId: 'dcMfm',
      tag: 'DCM-202',
      label: 'DC MFM Mains',
      status: 'normal',
      transform: { position: [-4.86, 0.36, 0.28], scale: [0.9, 1, 1] },
      description: 'DC MFM captures V2, I2, P2 from the mains charger output and reports by RS485.',
      parameterValues: { Voltage: '24.6 V', Current: '16.8 A', Power: '0.41 kW' },
    }),
    buildNode({
      id: 'battery201',
      stencilId: 'lithiumBattery',
      tag: 'BAT-201',
      label: '24V Battery Lithium',
      status: 'normal',
      transform: { position: [-5.48, 0.38, 1.08], scale: [1.22, 1, 1] },
      description: 'Common 24V lithium battery bus feeding the inverter branch.',
    }),
    buildNode({
      id: 'batteryFuse201',
      stencilId: 'fuseBlock',
      tag: 'FUSE-103',
      label: 'Battery Fuse',
      status: 'normal',
      transform: { position: [-3.82, 0.36, 1.84], scale: [0.96, 1, 1] },
      description: 'Third protection fuse on the inverter feeder.',
    }),
    buildNode({
      id: 'batteryMcb201',
      stencilId: 'mcbBreaker',
      tag: 'MCB-103',
      label: 'Battery MCB',
      status: 'normal',
      transform: { position: [-2.54, 0.38, 1.84], scale: [0.96, 1, 1] },
      description: 'Third MCB isolates the DC output feeder to inverter.',
    }),
    buildNode({
      id: 'dcmBattery203',
      stencilId: 'dcMfm',
      tag: 'DCM-203',
      label: 'DC MFM Battery',
      status: 'normal',
      transform: { position: [-1.22, 0.36, 1.84], scale: [0.92, 1, 1] },
      description: 'DC MFM captures V3, I3, P3 between battery protection and inverter input.',
      parameterValues: { Voltage: '24.8 V', Current: '38.0 A', Power: '0.94 kW' },
    }),
    buildNode({
      id: 'inv301',
      stencilId: 'solarInverter',
      tag: 'INV-301',
      label: '2.5kVA Solar Inverter',
      status: 'normal',
      transform: { position: [0.22, 0.42, 1.84], scale: [1, 1, 1] },
      description: 'DC-AC inverter producing 230VAC output for the VFD and motor branch.',
    }),
    buildNode({
      id: 'acmInv301',
      stencilId: 'acMfm',
      tag: 'ACM-301',
      label: 'AC MFM Inverter',
      status: 'normal',
      transform: { position: [1.76, 0.36, 1.84], scale: [0.92, 1, 1] },
      description: 'AC MFM captures V4, I4, P4 after inverter 230VAC output and reports by RS485.',
      parameterValues: { Voltage: '230 V', Current: '4.9 A', Power: '1.12 kW' },
    }),
    buildNode({
      id: 'vfd401',
      stencilId: 'vfdDrive',
      tag: 'VFD-401',
      label: '1HP VFD',
      status: 'normal',
      transform: { position: [3.28, 0.42, 1.84], scale: [1, 1, 1] },
      description: 'Variable frequency drive controls motor speed and exposes drive data to PLC/HMI.',
    }),
    buildNode({
      id: 'acmMotor302',
      stencilId: 'acMfm',
      tag: 'ACM-302',
      label: 'AC MFM Motor',
      status: 'normal',
      transform: { position: [4.72, 0.36, 1.84], scale: [0.92, 1, 1] },
      description: 'AC MFM captures V5, I5, P5 on the VFD-to-motor feeder.',
      parameterValues: { Voltage: '228 V', Current: '3.8 A', Power: '0.86 kW' },
    }),
    buildNode({
      id: 'motor501',
      stencilId: 'acMotorLoad',
      tag: 'MTR-501',
      label: '1HP AC Motor With Load',
      status: 'normal',
      transform: { position: [6.34, 0.42, 1.84], scale: [1, 1, 1] },
      description: 'FHP three-phase AC motor with load; speed, vibration, and temperature feed the PLC.',
    }),
    buildNode({
      id: 'rs485Bus601',
      stencilId: 'rs485Bus',
      tag: 'BUS-601',
      label: 'RS485 Bus',
      status: 'normal',
      transform: { position: [1.42, 0.2, -0.66], scale: [2.55, 1, 1] },
      description: 'Shared RS485 trunk carrying all MFM and drive measurements to the PLC rack.',
    }),
    buildNode({
      id: 'tempCard701',
      stencilId: 'tempVibCard',
      tag: 'TVC-701',
      label: 'N/Vib/Temp Card',
      status: 'normal',
      transform: { position: [5.44, 0.36, -0.42], scale: [0.95, 1, 1] },
      description: 'Speed, vibration, and motor temperature card feeding the PLC.',
    }),
    buildNode({
      id: 'plc701',
      stencilId: 'plcRack',
      tag: 'PLC-701',
      label: 'PLC + RS485 + Temp Card',
      status: 'normal',
      transform: { position: [5.86, 0.42, -1.58], scale: [1, 1, 1] },
      description: 'PLC reads V/I/P from all meters and motor N/Vib/Temp through RS485 and I/O cards.',
    }),
    buildNode({
      id: 'hmi801',
      stencilId: 'hmiPanel',
      tag: 'HMI-801',
      label: 'HMI',
      status: 'normal',
      transform: { position: [7.38, 0.38, -2.38], scale: [1, 1, 1] },
      description: 'Operator HMI showing inverter, VFD, RS485, and motor-health status.',
    }),
  ],
  routes: [
    buildRoute({ id: 'dc-source-fuse', from: { nodeId: 'dcSource101', portId: 'outlet' }, to: { nodeId: 'dcFuse101', portId: 'inlet' }, medium: 'dc-power', state: 'active', segments: [[-8.34, 0.2, -3.7], [-8.34, 0.2, -2.62]] }),
    buildRoute({ id: 'dc-fuse-mcb', from: { nodeId: 'dcFuse101', portId: 'outlet' }, to: { nodeId: 'dcMcb101', portId: 'inlet' }, medium: 'dc-power', state: 'active', segments: [[-8.34, 0.2, -2.62], [-8.34, 0.2, -1.58]] }),
    buildRoute({ id: 'dc-mcb-charger', from: { nodeId: 'dcMcb101', portId: 'outlet' }, to: { nodeId: 'solarCharger101', portId: 'inlet' }, medium: 'dc-power', state: 'active', segments: [[-8.34, 0.22, -1.58], [-8.34, 0.22, -0.5]] }),
    buildRoute({ id: 'solar-charger-dcm', from: { nodeId: 'solarCharger101', portId: 'outlet' }, to: { nodeId: 'dcmSolar201', portId: 'inlet' }, medium: 'dc-power', state: 'active', segments: [[-6.95, 0.24, -0.5], [-6.95, 0.24, 0.28]] }),
    buildRoute({ id: 'dcm-solar-battery', from: { nodeId: 'dcmSolar201', portId: 'outlet' }, to: { nodeId: 'battery201', portId: 'chargeIn' }, medium: 'dc-power', state: 'active', segments: [[-5.72, 0.2, 0.28], [-5.72, 0.2, 0.88], [-6.34, 0.2, 0.88]] }),
    buildRoute({ id: 'ac-source-fuse', from: { nodeId: 'acMains101', portId: 'outlet' }, to: { nodeId: 'acFuse101', portId: 'inlet' }, medium: 'ac-power', state: 'active', segments: [[-4.44, 0.2, -3.7], [-4.44, 0.2, -2.62]] }),
    buildRoute({ id: 'ac-fuse-mcb', from: { nodeId: 'acFuse101', portId: 'outlet' }, to: { nodeId: 'acMcb101', portId: 'inlet' }, medium: 'ac-power', state: 'active', segments: [[-4.44, 0.2, -2.62], [-4.44, 0.2, -1.58]] }),
    buildRoute({ id: 'ac-mcb-charger', from: { nodeId: 'acMcb101', portId: 'outlet' }, to: { nodeId: 'mainsCharger101', portId: 'inlet' }, medium: 'ac-power', state: 'active', segments: [[-4.44, 0.22, -1.58], [-4.44, 0.22, -0.5]] }),
    buildRoute({ id: 'mains-charger-dcm', from: { nodeId: 'mainsCharger101', portId: 'outlet' }, to: { nodeId: 'dcmMains202', portId: 'inlet' }, medium: 'dc-power', state: 'active', segments: [[-4.24, 0.24, -0.5], [-4.24, 0.24, 0.28]] }),
    buildRoute({ id: 'dcm-mains-battery', from: { nodeId: 'dcmMains202', portId: 'outlet' }, to: { nodeId: 'battery201', portId: 'chargeIn' }, medium: 'dc-power', state: 'active', segments: [[-5.0, 0.2, 0.28], [-5.0, 0.2, 0.88], [-6.34, 0.2, 0.88]] }),
    buildRoute({ id: 'battery-fuse', from: { nodeId: 'battery201', portId: 'outlet' }, to: { nodeId: 'batteryFuse201', portId: 'inlet' }, medium: 'dc-power', state: 'active', segments: [[-4.62, 0.22, 1.84]] }),
    buildRoute({ id: 'fuse-mcb-inverter-feed', from: { nodeId: 'batteryFuse201', portId: 'outlet' }, to: { nodeId: 'batteryMcb201', portId: 'inlet' }, medium: 'dc-power', state: 'active', segments: [[-3.18, 0.22, 1.84]] }),
    buildRoute({ id: 'mcb-dcm-battery', from: { nodeId: 'batteryMcb201', portId: 'outlet' }, to: { nodeId: 'dcmBattery203', portId: 'inlet' }, medium: 'dc-power', state: 'active', segments: [[-1.88, 0.22, 1.84]] }),
    buildRoute({ id: 'dcm-inverter', from: { nodeId: 'dcmBattery203', portId: 'outlet' }, to: { nodeId: 'inv301', portId: 'dcIn' }, medium: 'dc-power', state: 'active', segments: [[-0.48, 0.22, 1.84]] }),
    buildRoute({ id: 'inverter-acm', from: { nodeId: 'inv301', portId: 'acOut' }, to: { nodeId: 'acmInv301', portId: 'inlet' }, medium: 'ac-power', state: 'active', segments: [[1.04, 0.22, 1.84]] }),
    buildRoute({ id: 'acm-vfd', from: { nodeId: 'acmInv301', portId: 'outlet' }, to: { nodeId: 'vfd401', portId: 'acIn' }, medium: 'ac-power', state: 'active', segments: [[2.5, 0.22, 1.84]] }),
    buildRoute({ id: 'vfd-acm-motor', from: { nodeId: 'vfd401', portId: 'motorOut' }, to: { nodeId: 'acmMotor302', portId: 'inlet' }, medium: 'ac-power', state: 'active', segments: [[4.0, 0.22, 1.84]] }),
    buildRoute({ id: 'acm-motor-load', from: { nodeId: 'acmMotor302', portId: 'outlet' }, to: { nodeId: 'motor501', portId: 'powerIn' }, medium: 'ac-power', state: 'active', segments: [[5.42, 0.22, 1.84]] }),
    buildRoute({ id: 'dcm-solar-rs485', from: { nodeId: 'dcmSolar201', portId: 'rs485' }, to: { nodeId: 'rs485Bus601', portId: 'inlet' }, medium: 'rs485', state: 'active', style: { dashed: true }, segments: [[-6.18, 0.62, -0.66], [-0.26, 0.62, -0.66]] }),
    buildRoute({ id: 'dcm-mains-rs485', from: { nodeId: 'dcmMains202', portId: 'rs485' }, to: { nodeId: 'rs485Bus601', portId: 'inlet' }, medium: 'rs485', state: 'active', style: { dashed: true }, segments: [[-4.86, 0.62, -0.66], [-0.26, 0.62, -0.66]] }),
    buildRoute({ id: 'dcm-battery-rs485', from: { nodeId: 'dcmBattery203', portId: 'rs485' }, to: { nodeId: 'rs485Bus601', portId: 'inlet' }, medium: 'rs485', state: 'active', style: { dashed: true }, segments: [[-1.22, 0.62, -0.66], [-0.26, 0.62, -0.66]] }),
    buildRoute({ id: 'acm-inverter-rs485', from: { nodeId: 'acmInv301', portId: 'rs485' }, to: { nodeId: 'rs485Bus601', portId: 'outlet' }, medium: 'rs485', state: 'active', style: { dashed: true }, segments: [[1.76, 0.62, -0.66], [2.26, 0.62, -0.66]] }),
    buildRoute({ id: 'vfd-rs485', from: { nodeId: 'vfd401', portId: 'rs485' }, to: { nodeId: 'rs485Bus601', portId: 'outlet' }, medium: 'rs485', state: 'active', style: { dashed: true }, segments: [[3.28, 0.62, -0.66], [2.26, 0.62, -0.66]] }),
    buildRoute({ id: 'acm-motor-rs485', from: { nodeId: 'acmMotor302', portId: 'rs485' }, to: { nodeId: 'rs485Bus601', portId: 'outlet' }, medium: 'rs485', state: 'active', style: { dashed: true }, segments: [[4.72, 0.62, -0.66], [2.26, 0.62, -0.66]] }),
    buildRoute({ id: 'bus-plc-rs485', from: { nodeId: 'rs485Bus601', portId: 'outlet' }, to: { nodeId: 'plc701', portId: 'rs485' }, medium: 'rs485', state: 'active', style: { dashed: true }, segments: [[2.4, 0.54, -0.66], [2.4, 0.54, -1.76], [5.04, 0.54, -1.76]] }),
    buildRoute({ id: 'motor-temp-card', from: { nodeId: 'motor501', portId: 'sensorOut' }, to: { nodeId: 'tempCard701', portId: 'signalIn' }, medium: 'signal', state: 'active', style: { dashed: true }, segments: [[6.98, 0.64, 1.08], [6.98, 0.64, -0.42], [5.02, 0.64, -0.42]] }),
    buildRoute({ id: 'temp-card-plc', from: { nodeId: 'tempCard701', portId: 'outlet' }, to: { nodeId: 'plc701', portId: 'sensorIn' }, medium: 'signal', state: 'active', style: { dashed: true }, segments: [[5.44, 0.62, -1.04], [5.04, 0.62, -1.04]] }),
    buildRoute({ id: 'plc-hmi', from: { nodeId: 'plc701', portId: 'hmi' }, to: { nodeId: 'hmi801', portId: 'rs485' }, medium: 'rs485', state: 'active', style: { dashed: true }, segments: [[6.72, 0.48, -1.9], [6.8, 0.48, -2.38]] }),
  ],
  annotations: [
    buildCallout({ id: 'callout-dc-source', nodeId: 'dcSource101', label: '48VDC', note: 'or Solar PV' }),
    buildCallout({ id: 'callout-ac-source', nodeId: 'acMains101', label: '230VAC' }),
    buildCallout({ id: 'callout-battery', nodeId: 'battery201', label: 'BAT-201', note: '24V lithium' }),
    buildCallout({ id: 'callout-inverter', nodeId: 'inv301', label: 'INV-301', note: '2.5kVA output', tone: 'origin' }),
    buildCallout({ id: 'callout-vfd', nodeId: 'vfd401', label: 'VFD-401' }),
    buildCallout({ id: 'callout-motor', nodeId: 'motor501', label: 'MTR-501', note: '1HP load' }),
    buildCallout({ id: 'callout-plc', nodeId: 'plc701', label: 'PLC-701', note: 'V/I/P + N/Vib/Temp' }),
    buildCallout({ id: 'callout-hmi', nodeId: 'hmi801', label: 'HMI-801', note: 'RS485' }),
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
  layouts: [solarInverterPanelLayout, packagingLayout, utilitiesLayout],
  views: {
    activeLayoutId: solarInverterPanelLayout.id,
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
      solarInverterPanelLayout,
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
    : [clone(solarInverterPanelLayout), clone(packagingLayout), clone(utilitiesLayout)]

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
