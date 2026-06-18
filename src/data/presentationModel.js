import { getNodeParameterValue, resolveRoutePoints } from './defaultConfig'

function clone(value) {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value))
}

function parseNumber(value, fallback = 0) {
  if (typeof value === 'number') return value
  const match = `${value}`.replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : fallback
}

function setNodeState(node, status, parameters = {}) {
  node.status = status
  node.overrides = {
    ...node.overrides,
    parameters: {
      ...node.overrides.parameters,
      ...parameters,
    },
  }
}

function normalizeActiveLayout(layout) {
  const next = clone(layout)
  if (layout.kind !== 'packaging') {
    next.nodes.forEach((node) => {
      if (node.status === 'inactive') {
        setNodeState(node, 'normal')
      }
    })
    return next
  }

  next.nodes.forEach((node) => {
    switch (node.id) {
      case 'tank101':
        setNodeState(node, 'inactive')
        break
      case 'pump':
        setNodeState(node, 'origin')
        break
      case 'fit401':
        setNodeState(node, 'warning')
        break
      case 'conveyor301':
        setNodeState(node, 'normal')
        break
      case 'filler401':
      case 'capper501':
        setNodeState(node, 'impacted')
        break
      case 'packaging601':
        setNodeState(node, 'downstream')
        break
      default:
        break
    }
  })

  next.routes.forEach((route) => {
    switch (route.id) {
      case 'route-pump-fit':
        route.state = 'alarm'
        break
      case 'route-fit-filler':
      case 'route-filler-capper':
        route.state = 'active'
        break
      case 'route-capper-packaging':
        route.state = 'downstream'
        route.style = { ...route.style, dashed: true }
        break
      default:
        route.state = route.id === 'route-tank-pump' ? 'inactive' : route.state
        break
    }
  })

  next.alarms = [
    { name: 'Pump Pressure Low', tag: 'P-201', value: '1.1 bar', nodeId: 'pump' },
    { name: 'Flow Warning', tag: 'FIT-401', value: '122.4 L/min', nodeId: 'fit401' },
    { name: 'Underfill Impact', tag: 'F-401', value: 'ACTIVE', nodeId: 'filler401' },
    { name: 'Capper Torque Impact', tag: 'C-501', value: '3.8 N m', nodeId: 'capper501' },
  ]

  next.insight = {
    ...next.insight,
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
  }

  return next
}

function normalizeHealthyLayout(layout) {
  const next = clone(layout)

  next.nodes.forEach((node) => {
    switch (node.id) {
      case 'tank101':
        setNodeState(node, 'normal', {
          'Tank Level': '71.2%',
          'Tank Volume': '1,560 L',
          Temperature: '29.4 C',
        })
        break
      case 'pump':
        setNodeState(node, 'normal', {
          'Pump Pressure': '2.4 bar',
          'Flow Rate': '180.0 L/min',
          'Motor Current': '12.0 A',
          'Pump Speed': '1,450 rpm',
          Temperature: '30.2 C',
          Vibration: '2.1 mm/s',
          'Pump Status': 'Running',
        })
        break
      case 'fit401':
        setNodeState(node, 'normal', {
          'Flow Rate': '180.0 L/min',
          'Total Flow': '84,680 L',
          'Sensor Output': '14.3 mA',
          'Signal Health': 'Good',
          'No Flow Alarm': 'Inactive',
        })
        break
      case 'conveyor301':
        setNodeState(node, 'normal', {
          'Conveyor Speed': '23.0 m/min',
          'Object Count': '1,296',
          'Bottle Presence': 'Detected',
          'Jam Detection': 'Clear',
        })
        break
      case 'filler401':
        setNodeState(node, 'normal', {
          'Fill Volume': '520 mL',
          'Target Fill Volume': '520 mL',
          'Filling Error': '0 mL',
          'Fill Time': '1.3 s',
          'Bottle Present': 'Yes',
          'Nozzle Status': 'Enabled',
          'Valve Status': 'Ready',
          'Underfill Alarm': 'Inactive',
          'Overfill Alarm': 'Inactive',
        })
        break
      case 'capper501':
        setNodeState(node, 'normal', {
          'Capper Torque': '1.2 N m',
          'Target Torque': '1.2 N m',
          'Torque Error': '0.0 N m',
          'Cap Presence': 'Detected',
          'Bottle Position': 'Aligned',
          'Motor Current': '10.1 A',
          'High Torque Alarm': 'Inactive',
          'Loose Cap Alarm': 'Inactive',
        })
        break
      case 'packaging601':
        setNodeState(node, 'normal', {
          'Labeling Status': 'Running',
          'Label Applied': 'Applied',
          'Label Count': '1,246',
          'Packaging Count': '1,240',
          'Rejected Products': '2',
          'Printer Status': 'Ready',
          'Barcode Scan Status': 'Good',
        })
        break
      default:
        setNodeState(node, 'normal')
        break
    }
  })

  next.routes.forEach((route) => {
    route.state = 'active'
    route.style = route.id === 'route-capper-packaging' ? { ...route.style, dashed: false } : route.style
  })

  next.alarms = []
  next.insight = {
    ...next.insight,
    title: 'Normal operation across the packaging line',
    severity: 'Low',
    confidence: 'Stable',
    origin: 'Line healthy',
    affectedAssets: 'No equipment under stress',
    nextSpread: 'None',
    whatIsHappening:
      'Pump pressure, flow, fill volume, capping torque, and packaging output are all tracking nominal production targets.',
    whyItMatters:
      'Stable upstream pressure keeps fill volume and downstream packaging output within tolerance.',
  }

  return next
}

export function buildPresentationLayout(layout, mode = 'fault') {
  return mode === 'normal' ? normalizeHealthyLayout(layout) : normalizeActiveLayout(layout)
}

export function getStatusLabel(status) {
  switch (status) {
    case 'origin':
      return 'Critical'
    case 'warning':
      return 'Warning'
    case 'impacted':
      return 'Degraded'
    case 'downstream':
      return 'Impact spreading'
    case 'inactive':
      return 'Offline'
    case 'normal':
      return 'Normal'
    default:
      return 'Observed'
  }
}

export function getRiskLabel(node) {
  switch (node.status) {
    case 'origin':
      return 'High'
    case 'warning':
      return 'Medium'
    case 'impacted':
      return 'High'
    case 'downstream':
      return 'Elevated'
    case 'inactive':
      return 'Low'
    default:
      return 'Low'
  }
}

export function getSuggestedAction(node) {
  const byTag = {
    'P-201': 'Check suction line, filter blockage, and pump wear before restarting at full rate.',
    'FIT-401': 'Validate transmitter calibration and inspect the pipe leg for process restriction.',
    'F-401': 'Verify filler inlet pressure, nozzle balance, and underfill alarm thresholds.',
    'C-501': 'Inspect capper torque head, bottle height variation, and cap feed consistency.',
    'PKG-601': 'Prepare the downstream station for reduced throughput and rejection checks.',
  }

  if (byTag[node.tag]) return byTag[node.tag]

  const byStencil = {
    tank: 'Confirm inlet and outlet valves remain stable before releasing more product.',
    pump: 'Inspect suction conditions, pump internals, and recirculation path health.',
    flowSensor: 'Confirm transmitter output, impulse line condition, and flow profile.',
    filler: 'Review nozzle enablement, inlet pressure, and fill-time distribution.',
    capper: 'Review torque trends, cap seating, and bottle presentation.',
    packaging: 'Monitor label application, reject rate, and downstream buffering.',
  }

  return byStencil[node.stencilId] ?? 'Review equipment health, instrument feedback, and operator notes.'
}

export function buildEquipmentDetails(node, layout) {
  const metricSets = {
    pump: ['Pump Pressure', 'Flow Rate', 'Temperature', 'Vibration'],
    flowSensor: ['Flow Rate', 'Sensor Output', 'Signal Health', 'Total Flow'],
    filler: ['Fill Volume', 'Fill Time', 'Underfill Alarm', 'Valve Status'],
    capper: ['Capper Torque', 'Target Torque', 'High Torque Alarm', 'Motor Current'],
    packaging: ['Packaging Count', 'Rejected Products', 'Labeling Status', 'Barcode Scan Status'],
    tank: ['Tank Level', 'Tank Volume', 'Temperature', 'Outlet Valve Status'],
  }

  const metricNames = metricSets[node.stencilId] ?? [node.headlineMetric]
  const metrics = metricNames.map((label) => ({
    label,
    value: getNodeParameterValue(node, label) || 'Live',
  }))

  return {
    id: node.id,
    title: `${node.tag} ${node.label}`,
    statusLabel: getStatusLabel(node.status),
    risk: getRiskLabel(node),
    cause: node.status === 'normal' ? 'Nominal process conditions across the selected equipment.' : layout.insight.title,
    suggestedAction: getSuggestedAction(node),
    description: node.description,
    metrics,
  }
}

export function buildKpis(layout, mode = 'fault') {
  if (layout.kind === 'utilities') {
    return [
      { label: 'Utility Health', value: mode === 'normal' ? '94%' : '91%', tone: 'normal' },
      { label: 'Flow Rate', value: '154 L/min', tone: 'normal' },
      { label: 'Active Alarms', value: '0', tone: 'normal' },
      { label: 'Downtime Risk', value: 'Low', tone: 'normal' },
      { label: 'Compressed Air', value: '2.1 bar', tone: 'normal' },
      { label: 'Energy Usage', value: '1.8 kW', tone: 'normal' },
    ]
  }

  if (mode === 'normal') {
    return [
      { label: 'Line Efficiency', value: '96%', tone: 'normal' },
      { label: 'Flow Rate', value: '180.0 L/min', tone: 'normal' },
      { label: 'Active Alarms', value: '0', tone: 'normal' },
      { label: 'Downtime Risk', value: 'Low', tone: 'normal' },
      { label: 'Bottles/min', value: '24', tone: 'normal' },
      { label: 'Energy Usage', value: '2.1 kW', tone: 'normal' },
    ]
  }

  return [
    { label: 'Line Efficiency', value: '87%', tone: 'warning' },
    { label: 'Flow Rate', value: '122.4 L/min', tone: 'warning' },
    { label: 'Active Alarms', value: '3', tone: 'critical' },
    { label: 'Downtime Risk', value: 'High', tone: 'critical' },
    { label: 'Bottles/min', value: '18', tone: 'impacted' },
    { label: 'Energy Usage', value: '2.4 kW', tone: 'warning' },
  ]
}

export function buildTimeline(layout, mode = 'fault') {
  if (layout.kind === 'utilities') {
    return [
      { time: '10:01', event: 'Utility skid pressure stable' },
      { time: '10:02', event: 'Heat exchanger outlet held on target' },
      { time: '10:03', event: 'Instrumentation feedback remained healthy' },
    ]
  }

  if (mode === 'normal') {
    return [
      { time: '10:01', event: 'Pump discharge pressure steady at target' },
      { time: '10:02', event: 'Flow remained smooth into filler' },
      { time: '10:03', event: 'Fill volume stayed on nominal setpoint' },
      { time: '10:04', event: 'Capper torque stable with no drift' },
      { time: '10:05', event: 'Packaging output remained at full rate' },
    ]
  }

  return [
    { time: '10:01', event: 'Pump pressure started dropping' },
    { time: '10:02', event: 'Flow reduced at FIT-401' },
    { time: '10:03', event: 'Filler speed and fill accuracy affected' },
    { time: '10:04', event: 'Capper torque variation detected' },
    { time: '10:05', event: 'Packaging output reduced downstream' },
  ]
}

export function inferNodeArea(node, layoutKind = 'process') {
  if (layoutKind === 'utilities') {
    if (node.id === 'comp707') return 'Energy Area'
    if (node.id === 'skid706') return 'Utilities Train'
    return 'Utilities Train'
  }

  switch (node.id) {
    case 'tank101':
    case 'pump':
      return 'Pump Area'
    case 'fit401':
    case 'conveyor301':
    case 'filler401':
      return 'Filling Area'
    case 'capper501':
      return 'Capping Area'
    case 'packaging601':
      return 'Packaging Line'
    default:
      return 'Process Area'
  }
}

export function buildClusterGroups(layout) {
  const groups = new Map()

  layout.nodes.forEach((node) => {
    const area = inferNodeArea(node, layout.kind)
    const existing = groups.get(area) ?? { id: area.toLowerCase().replace(/\s+/g, '-'), label: area, count: 0, x: 0, z: 0, severity: node.status, nodeIds: [] }
    existing.count += 1
    existing.x += node.transform.position[0]
    existing.z += node.transform.position[2]
    existing.nodeIds.push(node.id)
    if (node.status === 'origin') {
      existing.severity = 'origin'
    } else if (node.status === 'impacted' && existing.severity !== 'origin') {
      existing.severity = 'impacted'
    } else if (node.status === 'warning' && !['origin', 'impacted'].includes(existing.severity)) {
      existing.severity = 'warning'
    }
    groups.set(area, existing)
  })

  return [...groups.values()].map((group) => ({
    ...group,
    position: [group.x / group.count, 0.28, group.z / group.count],
  }))
}

export function getRouteHealth(layout) {
  return layout.routes.map((route) => {
    const points = route.segments?.length ? route.segments : []
    return {
      id: route.id,
      state: route.state,
      length: points.length,
    }
  })
}

export function countVisibleAlarms(layout) {
  return layout.nodes.filter((node) => ['origin', 'warning', 'impacted'].includes(node.status)).length
}

export function estimateEnergyKw(node) {
  const current = parseNumber(getNodeParameterValue(node, 'Motor Current'), 0)
  const voltage = parseNumber(getNodeParameterValue(node, 'Motor Voltage'), 415)
  if (!current) return 0
  return Number(((current * voltage * 0.82) / 1000).toFixed(1))
}

export function buildMiniMapBounds(layout, library) {
  const routePoints = layout.routes.flatMap((route) => resolveRoutePoints(route, layout, library))
  const nodePoints = layout.nodes.map((node) => node.transform.position)
  const points = [...nodePoints, ...routePoints]

  if (!points.length) {
    return { minX: -8, maxX: 8, minZ: -3, maxZ: 3 }
  }

  return points.reduce(
    (bounds, [x, , z]) => ({
      minX: Math.min(bounds.minX, x),
      maxX: Math.max(bounds.maxX, x),
      minZ: Math.min(bounds.minZ, z),
      maxZ: Math.max(bounds.maxZ, z),
    }),
    { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity },
  )
}
