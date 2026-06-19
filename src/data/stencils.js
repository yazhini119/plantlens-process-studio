import { openIndustryStencils } from './openIndustryLibrary'

function createDefaults(parameters, values) {
  return parameters.reduce((defaults, parameter) => {
    defaults[parameter] = values[parameter] ?? 'Ready'
    return defaults
  }, {})
}

function createStencilDefinition(definition) {
  return {
    rules: {},
    anchors: [],
    ports: [],
    defaults: { parameters: {}, metrics: {} },
    ...definition,
  }
}

export const stencilCatalog = [
  createStencilDefinition({
    id: 'tank',
    family: 'tank',
    renderer: 'tank',
    label: 'Tank',
    tagPrefix: 'TK',
    headlineMetric: 'Tank Level',
    footprint: { width: 1.4, depth: 1.4, height: 1.8 },
    parameters: ['Tank Level', 'Tank Volume', 'Temperature', 'Inlet Valve Status', 'Outlet Valve Status'],
    ports: [
      { id: 'inlet', label: 'Inlet', direction: 'in', medium: 'liquid', required: false, position: [-0.54, 0.52, 0] },
      { id: 'outlet', label: 'Outlet', direction: 'out', medium: 'liquid', required: true, position: [0.55, 0.12, 0.33] },
    ],
    anchors: [
      { id: 'callout', kind: 'callout', position: [0, 2.45, 0] },
      { id: 'instrument', kind: 'attachment', position: [0.1, 1.18, 0.28] },
    ],
    defaults: {
      parameters: createDefaults(
        ['Tank Level', 'Tank Volume', 'Temperature', 'Inlet Valve Status', 'Outlet Valve Status'],
        {
          'Tank Level': '50%',
          'Tank Volume': '1,000 L',
          Temperature: '30 C',
          'Inlet Valve Status': 'Open',
          'Outlet Valve Status': 'Open',
        },
      ),
    },
    rules: { allowedAttachments: ['pressureSensor', 'temperatureSensor'] },
  }),
  createStencilDefinition({
    id: 'pump',
    family: 'pump',
    renderer: 'pump',
    label: 'Centrifugal Pump',
    tagPrefix: 'P',
    headlineMetric: 'Pump Pressure',
    footprint: { width: 1.7, depth: 1.0, height: 1.05 },
    parameters: ['Pump Pressure', 'Flow Rate', 'Motor Current', 'Motor Voltage', 'Pump Speed', 'Temperature', 'Vibration', 'Running Hours', 'Pump Status'],
    ports: [
      { id: 'inlet', label: 'Inlet', direction: 'in', medium: 'liquid', required: true, position: [-0.78, 0.02, 0] },
      { id: 'outlet', label: 'Outlet', direction: 'out', medium: 'liquid', required: true, position: [0.78, 0.02, 0] },
    ],
    anchors: [
      { id: 'callout', kind: 'callout', position: [0, 2.55, -0.05] },
      { id: 'instrument', kind: 'attachment', position: [0.1, 0.45, 0] },
    ],
    defaults: {
      parameters: createDefaults(
        ['Pump Pressure', 'Flow Rate', 'Motor Current', 'Motor Voltage', 'Pump Speed', 'Temperature', 'Vibration', 'Running Hours', 'Pump Status'],
        {
          'Pump Pressure': '2.4 bar',
          'Flow Rate': '180 L/min',
          'Motor Current': '12.0 A',
          'Motor Voltage': '415 V',
          'Pump Speed': '1,450 rpm',
          Temperature: '35 C',
          Vibration: '2.1 mm/s',
          'Running Hours': '0 h',
          'Pump Status': 'Ready',
        },
      ),
    },
    rules: { allowedAttachments: ['pressureSensor', 'temperatureSensor'] },
  }),
  createStencilDefinition({
    id: 'motor',
    family: 'utility',
    renderer: 'motor',
    label: 'Motor',
    tagPrefix: 'M',
    headlineMetric: 'Motor Current',
    footprint: { width: 1.4, depth: 0.9, height: 0.9 },
    parameters: ['Motor Current', 'Motor Voltage', 'Speed', 'Bearing Temperature', 'Vibration', 'Run Status'],
    anchors: [{ id: 'callout', kind: 'callout', position: [0, 2.2, 0] }],
    defaults: {
      parameters: createDefaults(
        ['Motor Current', 'Motor Voltage', 'Speed', 'Bearing Temperature', 'Vibration', 'Run Status'],
        {
          'Motor Current': '12.0 A',
          'Motor Voltage': '415 V',
          Speed: '1,450 rpm',
          'Bearing Temperature': '48 C',
          Vibration: '2.1 mm/s',
          'Run Status': 'Ready',
        },
      ),
    },
  }),
  createStencilDefinition({
    id: 'flowSensor',
    family: 'sensor',
    renderer: 'flowSensor',
    label: 'Flow Transmitter',
    tagPrefix: 'FIT',
    headlineMetric: 'Flow Rate',
    footprint: { width: 1.1, depth: 0.4, height: 1.0 },
    parameters: ['Flow Rate', 'Total Flow', 'Sensor Output', 'Signal Health', 'No Flow Alarm'],
    ports: [
      { id: 'inlet', label: 'Inlet', direction: 'in', medium: 'liquid', required: true, position: [-0.54, 0, 0] },
      { id: 'outlet', label: 'Outlet', direction: 'out', medium: 'liquid', required: true, position: [0.54, 0, 0] },
    ],
    anchors: [
      { id: 'callout', kind: 'callout', position: [0, 2.55, -0.05] },
      { id: 'inline', kind: 'route', position: [0, 0, 0] },
    ],
    defaults: {
      parameters: createDefaults(
        ['Flow Rate', 'Total Flow', 'Sensor Output', 'Signal Health', 'No Flow Alarm'],
        {
          'Flow Rate': '180 L/min',
          'Total Flow': '0 L',
          'Sensor Output': '12.0 mA',
          'Signal Health': 'Good',
          'No Flow Alarm': 'Inactive',
        },
      ),
    },
  }),
  createStencilDefinition({
    id: 'pressureSensor',
    family: 'sensor',
    renderer: 'pressureSensor',
    label: 'Pressure Transmitter',
    tagPrefix: 'PIT',
    headlineMetric: 'Pressure',
    footprint: { width: 0.9, depth: 0.7, height: 1.1 },
    parameters: ['Pressure', 'Sensor Output', 'Signal Health', 'High Pressure Alarm', 'Low Pressure Alarm'],
    ports: [{ id: 'tap', label: 'Tap', direction: 'in', medium: 'signal', required: false, position: [0, -0.08, 0] }],
    anchors: [{ id: 'callout', kind: 'callout', position: [0, 2.25, 0] }],
    defaults: {
      parameters: createDefaults(
        ['Pressure', 'Sensor Output', 'Signal Health', 'High Pressure Alarm', 'Low Pressure Alarm'],
        {
          Pressure: '1.8 bar',
          'Sensor Output': '12.0 mA',
          'Signal Health': 'Good',
          'High Pressure Alarm': 'Inactive',
          'Low Pressure Alarm': 'Inactive',
        },
      ),
    },
  }),
  createStencilDefinition({
    id: 'temperatureSensor',
    family: 'sensor',
    renderer: 'pressureSensor',
    label: 'Temperature Transmitter',
    tagPrefix: 'TIT',
    headlineMetric: 'Temperature',
    footprint: { width: 0.9, depth: 0.7, height: 1.1 },
    parameters: ['Temperature', 'Sensor Output', 'Signal Health', 'High Temperature Alarm', 'Low Temperature Alarm'],
    ports: [{ id: 'tap', label: 'Tap', direction: 'in', medium: 'signal', required: false, position: [0, -0.08, 0] }],
    anchors: [{ id: 'callout', kind: 'callout', position: [0, 2.25, 0] }],
    defaults: {
      parameters: createDefaults(
        ['Temperature', 'Sensor Output', 'Signal Health', 'High Temperature Alarm', 'Low Temperature Alarm'],
        {
          Temperature: '35 C',
          'Sensor Output': '11.8 mA',
          'Signal Health': 'Good',
          'High Temperature Alarm': 'Inactive',
          'Low Temperature Alarm': 'Inactive',
        },
      ),
    },
  }),
  createStencilDefinition({
    id: 'valve',
    family: 'valve',
    renderer: 'valve',
    label: 'Control Valve',
    tagPrefix: 'XV',
    headlineMetric: 'Valve Position',
    footprint: { width: 1.2, depth: 0.5, height: 0.8 },
    parameters: ['Valve Position', 'Command Signal', 'Feedback Signal', 'Air Supply', 'Fault Status'],
    ports: [
      { id: 'inlet', label: 'Inlet', direction: 'in', medium: 'liquid', required: true, position: [-0.54, 0, 0] },
      { id: 'outlet', label: 'Outlet', direction: 'out', medium: 'liquid', required: true, position: [0.54, 0, 0] },
    ],
    anchors: [
      { id: 'callout', kind: 'callout', position: [0, 2.15, 0] },
      { id: 'instrument', kind: 'attachment', position: [0, 0.48, 0] },
    ],
    defaults: {
      parameters: createDefaults(
        ['Valve Position', 'Command Signal', 'Feedback Signal', 'Air Supply', 'Fault Status'],
        {
          'Valve Position': '50%',
          'Command Signal': '50%',
          'Feedback Signal': '49%',
          'Air Supply': 'Healthy',
          'Fault Status': 'Clear',
        },
      ),
    },
    rules: { allowedAttachments: ['pressureSensor', 'temperatureSensor'] },
  }),
  createStencilDefinition({
    id: 'mixer',
    family: 'machine',
    renderer: 'mixer',
    label: 'Mixer',
    tagPrefix: 'MX',
    headlineMetric: 'Mixer Speed',
    footprint: { width: 1.3, depth: 1.3, height: 1.9 },
    parameters: ['Mixer Speed', 'Motor Current', 'Torque', 'Temperature', 'Run Status'],
    ports: [{ id: 'outlet', label: 'Outlet', direction: 'out', medium: 'liquid', required: true, position: [0.42, 0.1, 0.26] }],
    anchors: [
      { id: 'callout', kind: 'callout', position: [0, 2.6, 0] },
      { id: 'instrument', kind: 'attachment', position: [0.1, 1.15, 0.16] },
    ],
    defaults: {
      parameters: createDefaults(
        ['Mixer Speed', 'Motor Current', 'Torque', 'Temperature', 'Run Status'],
        {
          'Mixer Speed': '320 rpm',
          'Motor Current': '12.0 A',
          Torque: '42%',
          Temperature: '31 C',
          'Run Status': 'Ready',
        },
      ),
    },
    rules: { allowedAttachments: ['pressureSensor', 'temperatureSensor'] },
  }),
  createStencilDefinition({
    id: 'heatExchanger',
    family: 'utility',
    renderer: 'heatExchanger',
    label: 'Heat Exchanger',
    tagPrefix: 'HX',
    headlineMetric: 'Outlet Temperature',
    footprint: { width: 1.9, depth: 0.9, height: 1.1 },
    parameters: ['Inlet Temperature', 'Outlet Temperature', 'Differential Pressure', 'Flow Rate', 'Fouling Index'],
    ports: [
      { id: 'inlet', label: 'Inlet', direction: 'in', medium: 'liquid', required: true, position: [-0.74, 0.05, 0] },
      { id: 'outlet', label: 'Outlet', direction: 'out', medium: 'liquid', required: true, position: [0.74, 0.05, 0] },
    ],
    anchors: [
      { id: 'callout', kind: 'callout', position: [0, 2.2, 0] },
      { id: 'instrument', kind: 'attachment', position: [0, 0.4, -0.28] },
    ],
    defaults: {
      parameters: createDefaults(
        ['Inlet Temperature', 'Outlet Temperature', 'Differential Pressure', 'Flow Rate', 'Fouling Index'],
        {
          'Inlet Temperature': '28 C',
          'Outlet Temperature': '34 C',
          'Differential Pressure': '0.3 bar',
          'Flow Rate': '180 L/min',
          'Fouling Index': 'Low',
        },
      ),
    },
    rules: { allowedAttachments: ['pressureSensor', 'temperatureSensor'] },
  }),
  createStencilDefinition({
    id: 'compressor',
    family: 'utility',
    renderer: 'compressor',
    label: 'Compressor',
    tagPrefix: 'C',
    headlineMetric: 'Discharge Pressure',
    footprint: { width: 1.7, depth: 1.0, height: 1.2 },
    parameters: ['Discharge Pressure', 'Suction Pressure', 'Motor Current', 'Vibration', 'Discharge Temperature'],
    ports: [
      { id: 'inlet', label: 'Inlet', direction: 'in', medium: 'air', required: true, position: [-0.54, 0.1, 0] },
      { id: 'outlet', label: 'Outlet', direction: 'out', medium: 'air', required: true, position: [0.72, 0.1, 0] },
    ],
    anchors: [
      { id: 'callout', kind: 'callout', position: [0, 2.25, 0] },
      { id: 'instrument', kind: 'attachment', position: [0.14, 0.56, 0] },
    ],
    defaults: {
      parameters: createDefaults(
        ['Discharge Pressure', 'Suction Pressure', 'Motor Current', 'Vibration', 'Discharge Temperature'],
        {
          'Discharge Pressure': '2.4 bar',
          'Suction Pressure': '0.8 bar',
          'Motor Current': '12.0 A',
          Vibration: '2.1 mm/s',
          'Discharge Temperature': '58 C',
        },
      ),
    },
    rules: { allowedAttachments: ['pressureSensor', 'temperatureSensor'] },
  }),
  createStencilDefinition({
    id: 'column',
    family: 'machine',
    renderer: 'column',
    label: 'Process Column',
    tagPrefix: 'COL',
    headlineMetric: 'Column Pressure',
    footprint: { width: 0.8, depth: 0.8, height: 2.4 },
    parameters: ['Column Pressure', 'Top Temperature', 'Bottom Temperature', 'Reflux Flow', 'Level'],
    ports: [
      { id: 'inlet', label: 'Inlet', direction: 'in', medium: 'liquid', required: true, position: [0.34, 0.24, 0] },
      { id: 'outlet', label: 'Outlet', direction: 'out', medium: 'liquid', required: true, position: [-0.34, 0.76, 0] },
    ],
    anchors: [
      { id: 'callout', kind: 'callout', position: [0, 3.05, 0] },
      { id: 'instrument', kind: 'attachment', position: [0.2, 1.1, 0] },
    ],
    defaults: {
      parameters: createDefaults(
        ['Column Pressure', 'Top Temperature', 'Bottom Temperature', 'Reflux Flow', 'Level'],
        {
          'Column Pressure': '1.2 bar',
          'Top Temperature': '78 C',
          'Bottom Temperature': '96 C',
          'Reflux Flow': '92 L/min',
          Level: '54%',
        },
      ),
    },
    rules: { allowedAttachments: ['pressureSensor', 'temperatureSensor'] },
  }),
  createStencilDefinition({
    id: 'conveyor',
    family: 'machine',
    renderer: 'conveyor',
    label: 'Conveyor',
    tagPrefix: 'CV',
    headlineMetric: 'Conveyor Speed',
    footprint: { width: 2.5, depth: 0.8, height: 0.7 },
    parameters: ['Conveyor Speed', 'Motor Current', 'Object Count', 'Bottle Presence', 'Jam Detection', 'Motor Temperature', 'Emergency Stop', 'Running Hours'],
    ports: [
      { id: 'inlet', label: 'Inlet', direction: 'in', medium: 'signal', required: false, position: [-1.1, 0.1, 0] },
      { id: 'outlet', label: 'Outlet', direction: 'out', medium: 'signal', required: false, position: [1.1, 0.1, 0] },
    ],
    anchors: [{ id: 'callout', kind: 'callout', position: [0, 2.05, 0] }],
    defaults: {
      parameters: createDefaults(
        ['Conveyor Speed', 'Motor Current', 'Object Count', 'Bottle Presence', 'Jam Detection', 'Motor Temperature', 'Emergency Stop', 'Running Hours'],
        {
          'Conveyor Speed': '18.0 m/min',
          'Motor Current': '11.4 A',
          'Object Count': '0',
          'Bottle Presence': 'Detected',
          'Jam Detection': 'Clear',
          'Motor Temperature': '44.2 C',
          'Emergency Stop': 'Healthy',
          'Running Hours': '0 h',
        },
      ),
    },
  }),
  createStencilDefinition({
    id: 'skid',
    family: 'utility',
    renderer: 'skid',
    label: 'Utility Supply',
    tagPrefix: 'SK',
    headlineMetric: 'Skid Status',
    footprint: { width: 1.8, depth: 1.2, height: 1.2 },
    parameters: ['Skid Status', 'Inlet Pressure', 'Outlet Pressure', 'Flow Rate', 'Alarm Summary'],
    ports: [
      { id: 'inlet', label: 'Inlet', direction: 'in', medium: 'liquid', required: true, position: [-0.86, 0.02, 0] },
      { id: 'outlet', label: 'Outlet', direction: 'out', medium: 'liquid', required: true, position: [0.86, 0.02, 0] },
    ],
    anchors: [
      { id: 'callout', kind: 'callout', position: [0, 2.2, 0] },
      { id: 'instrument', kind: 'attachment', position: [-0.12, 0.64, 0] },
    ],
    defaults: {
      parameters: createDefaults(
        ['Skid Status', 'Inlet Pressure', 'Outlet Pressure', 'Flow Rate', 'Alarm Summary'],
        {
          'Skid Status': 'Ready',
          'Inlet Pressure': '3.0 bar',
          'Outlet Pressure': '2.8 bar',
          'Flow Rate': '180 L/min',
          'Alarm Summary': 'Clear',
        },
      ),
    },
    rules: { allowedAttachments: ['pressureSensor', 'temperatureSensor'] },
  }),
  createStencilDefinition({
    id: 'filler',
    family: 'packaging',
    renderer: 'filler',
    label: 'Filler',
    tagPrefix: 'F',
    headlineMetric: 'Underfill Alarm',
    footprint: { width: 1.6, depth: 1.4, height: 2.0 },
    parameters: ['Fill Volume', 'Target Fill Volume', 'Filling Error', 'Fill Time', 'Bottle Present', 'Nozzle Status', 'Valve Status', 'Underfill Alarm', 'Overfill Alarm'],
    ports: [
      { id: 'inlet', label: 'Inlet', direction: 'in', medium: 'liquid', required: true, position: [-0.72, 0.28, -0.42] },
      { id: 'outlet', label: 'Outlet', direction: 'out', medium: 'liquid', required: false, position: [0.72, 0.28, -0.42] },
    ],
    anchors: [
      { id: 'callout', kind: 'callout', position: [0, 2.65, -0.05] },
      { id: 'instrument', kind: 'attachment', position: [0.32, 1.1, -0.42] },
    ],
    defaults: {
      parameters: createDefaults(
        ['Fill Volume', 'Target Fill Volume', 'Filling Error', 'Fill Time', 'Bottle Present', 'Nozzle Status', 'Valve Status', 'Underfill Alarm', 'Overfill Alarm'],
        {
          'Fill Volume': '520 mL',
          'Target Fill Volume': '520 mL',
          'Filling Error': '0 mL',
          'Fill Time': '1.3 s',
          'Bottle Present': 'Yes',
          'Nozzle Status': 'Enabled',
          'Valve Status': 'Ready',
          'Underfill Alarm': 'Inactive',
          'Overfill Alarm': 'Inactive',
        },
      ),
    },
    rules: { allowedAttachments: ['pressureSensor', 'temperatureSensor'] },
  }),
  createStencilDefinition({
    id: 'capper',
    family: 'packaging',
    renderer: 'capper',
    label: 'Capper',
    tagPrefix: 'C',
    headlineMetric: 'Capper Torque',
    footprint: { width: 1.3, depth: 1.2, height: 1.8 },
    parameters: ['Capper Torque', 'Target Torque', 'Torque Error', 'Cap Presence', 'Bottle Position', 'Motor Current', 'High Torque Alarm', 'Loose Cap Alarm'],
    ports: [
      { id: 'inlet', label: 'Inlet', direction: 'in', medium: 'liquid', required: false, position: [-0.55, 0.2, 0] },
      { id: 'outlet', label: 'Outlet', direction: 'out', medium: 'signal', required: false, position: [0.55, 0.2, 0.32] },
    ],
    anchors: [
      { id: 'callout', kind: 'callout', position: [0, 2.7, -0.05] },
      { id: 'instrument', kind: 'attachment', position: [0.48, 0.62, 0.46] },
    ],
    defaults: {
      parameters: createDefaults(
        ['Capper Torque', 'Target Torque', 'Torque Error', 'Cap Presence', 'Bottle Position', 'Motor Current', 'High Torque Alarm', 'Loose Cap Alarm'],
        {
          'Capper Torque': '1.2 N m',
          'Target Torque': '1.2 N m',
          'Torque Error': '0.0 N m',
          'Cap Presence': 'Detected',
          'Bottle Position': 'Aligned',
          'Motor Current': '10.2 A',
          'High Torque Alarm': 'Inactive',
          'Loose Cap Alarm': 'Inactive',
        },
      ),
    },
    rules: { allowedAttachments: ['pressureSensor', 'temperatureSensor'] },
  }),
  createStencilDefinition({
    id: 'packaging',
    family: 'packaging',
    renderer: 'packaging',
    label: 'Packaging / Labeling',
    tagPrefix: 'PKG',
    headlineMetric: 'Packaging Count',
    footprint: { width: 1.6, depth: 1.4, height: 1.4 },
    parameters: ['Labeling Status', 'Label Applied', 'Label Count', 'Packaging Count', 'Rejected Products', 'Printer Status', 'Barcode Scan Status'],
    ports: [{ id: 'inlet', label: 'Inlet', direction: 'in', medium: 'signal', required: false, position: [-0.75, 0.12, 0.02] }],
    anchors: [{ id: 'callout', kind: 'callout', position: [0, 2.7, -0.05] }],
    defaults: {
      parameters: createDefaults(
        ['Labeling Status', 'Label Applied', 'Label Count', 'Packaging Count', 'Rejected Products', 'Printer Status', 'Barcode Scan Status'],
        {
          'Labeling Status': 'Ready',
          'Label Applied': 'Pending',
          'Label Count': '0',
          'Packaging Count': '0',
          'Rejected Products': '0',
          'Printer Status': 'Ready',
          'Barcode Scan Status': 'Queued',
        },
      ),
    },
  }),
  createStencilDefinition({
    id: 'controlPanel',
    family: 'utility',
    renderer: 'genericMachine',
    label: 'Control Panel',
    tagPrefix: 'CP',
    headlineMetric: 'Panel Status',
    footprint: { width: 1.1, depth: 0.65, height: 1.55 },
    parameters: ['Panel Status', 'PLC Health', 'Network Status', 'I/O Faults', 'Last Download'],
    ports: [
      { id: 'powerIn', label: 'Power In', direction: 'in', medium: 'power', required: true, position: [-0.45, 0.2, 0] },
      { id: 'signalOut', label: 'Signal Out', direction: 'out', medium: 'signal', required: false, position: [0.45, 0.48, 0] },
    ],
    anchors: [{ id: 'callout', kind: 'callout', position: [0, 2.25, 0] }],
    defaults: {
      parameters: createDefaults(
        ['Panel Status', 'PLC Health', 'Network Status', 'I/O Faults', 'Last Download'],
        {
          'Panel Status': 'Healthy',
          'PLC Health': 'Running',
          'Network Status': 'Online',
          'I/O Faults': '0',
          'Last Download': 'Demo config',
        },
      ),
    },
  }),
  createStencilDefinition({
    id: 'sensor',
    family: 'sensor',
    renderer: 'pressureSensor',
    label: 'Sensor',
    tagPrefix: 'SEN',
    headlineMetric: 'Sensor Value',
    footprint: { width: 0.7, depth: 0.55, height: 1.05 },
    parameters: ['Sensor Value', 'Sensor Type', 'Signal Health', 'Alarm Limit', 'Sensor Value Mapping'],
    ports: [
      { id: 'tap', label: 'Process Tap', direction: 'in', medium: 'signal', required: false, position: [0, -0.08, 0] },
      { id: 'signal', label: 'Signal', direction: 'out', medium: 'signal', required: false, position: [0.34, 0.24, 0] },
    ],
    anchors: [{ id: 'callout', kind: 'callout', position: [0, 2.2, 0] }],
    defaults: {
      parameters: createDefaults(
        ['Sensor Value', 'Sensor Type', 'Signal Health', 'Alarm Limit', 'Sensor Value Mapping'],
        {
          'Sensor Value': 'Ready',
          'Sensor Type': 'Generic',
          'Signal Health': 'Good',
          'Alarm Limit': 'Not set',
          'Sensor Value Mapping': 'Unmapped',
        },
      ),
    },
  }),
  createStencilDefinition({
    id: 'pipeSegment',
    family: 'utility',
    renderer: 'valve',
    label: 'Pipe Segment',
    tagPrefix: 'PIPE',
    headlineMetric: 'Line Status',
    footprint: { width: 1.5, depth: 0.28, height: 0.35 },
    parameters: ['Line Status', 'Medium', 'Line Size', 'Design Pressure', 'Insulation'],
    ports: [
      { id: 'inlet', label: 'Inlet', direction: 'in', medium: 'liquid', required: true, position: [-0.72, 0, 0] },
      { id: 'outlet', label: 'Outlet', direction: 'out', medium: 'liquid', required: true, position: [0.72, 0, 0] },
    ],
    anchors: [{ id: 'callout', kind: 'callout', position: [0, 1.65, 0] }],
    defaults: {
      parameters: createDefaults(
        ['Line Status', 'Medium', 'Line Size', 'Design Pressure', 'Insulation'],
        {
          'Line Status': 'Open',
          Medium: 'Product',
          'Line Size': 'DN50',
          'Design Pressure': '6 bar',
          Insulation: 'None',
        },
      ),
    },
  }),
  createStencilDefinition({
    id: 'panelBackplate',
    family: 'power',
    renderer: 'panelBackplate',
    label: 'Panel Backplate',
    tagPrefix: 'PNL',
    headlineMetric: 'Panel Status',
    footprint: { width: 4.8, depth: 2.4, height: 0.14 },
    parameters: ['Panel Status', 'Panel Size', 'Earthing', 'IP Rating', 'Cooling Clearance'],
    defaults: {
      parameters: createDefaults(
        ['Panel Status', 'Panel Size', 'Earthing', 'IP Rating', 'Cooling Clearance'],
        {
          'Panel Status': 'Ready',
          'Panel Size': 'Wall mounted',
          Earthing: 'Bonded',
          'IP Rating': 'IP54',
          'Cooling Clearance': 'Clear',
        },
      ),
    },
  }),
  createStencilDefinition({
    id: 'dcSource',
    family: 'power',
    renderer: 'dcSource',
    label: '-48V DC Source',
    tagPrefix: 'DC',
    headlineMetric: 'DC Voltage',
    footprint: { width: 1.35, depth: 0.8, height: 1.0 },
    parameters: ['DC Voltage', 'Source Current', 'Source Power', 'Polarity', 'Isolation Status'],
    ports: [{ id: 'outlet', label: 'DC Out', direction: 'out', medium: 'dc-power', required: true, position: [0.62, 0.08, 0] }],
    anchors: [{ id: 'callout', kind: 'callout', position: [0, 2.1, 0] }],
    defaults: {
      parameters: createDefaults(
        ['DC Voltage', 'Source Current', 'Source Power', 'Polarity', 'Isolation Status'],
        {
          'DC Voltage': '-48.2 V',
          'Source Current': '18.4 A',
          'Source Power': '0.88 kW',
          Polarity: 'Healthy',
          'Isolation Status': 'Closed',
        },
      ),
    },
  }),
  createStencilDefinition({
    id: 'acMains',
    family: 'power',
    renderer: 'acMains',
    label: '230VAC Mains',
    tagPrefix: 'AC',
    headlineMetric: 'AC Voltage',
    footprint: { width: 1.35, depth: 0.8, height: 1.0 },
    parameters: ['AC Voltage', 'Line Current', 'Frequency', 'Breaker Status', 'Supply Health'],
    ports: [{ id: 'outlet', label: 'AC Out', direction: 'out', medium: 'ac-power', required: true, position: [0.62, 0.08, 0] }],
    anchors: [{ id: 'callout', kind: 'callout', position: [0, 2.1, 0] }],
    defaults: {
      parameters: createDefaults(
        ['AC Voltage', 'Line Current', 'Frequency', 'Breaker Status', 'Supply Health'],
        {
          'AC Voltage': '230 V',
          'Line Current': '5.2 A',
          Frequency: '50 Hz',
          'Breaker Status': 'Closed',
          'Supply Health': 'Good',
        },
      ),
    },
  }),
  createStencilDefinition({
    id: 'fuseBlock',
    family: 'power',
    renderer: 'fuseBlock',
    label: 'Fuse',
    tagPrefix: 'FUSE',
    headlineMetric: 'Fuse Status',
    footprint: { width: 0.8, depth: 0.5, height: 0.9 },
    parameters: ['Fuse Status', 'Rated Current', 'Voltage Class', 'Last Trip', 'Spare Available'],
    ports: [
      { id: 'inlet', label: 'In', direction: 'in', medium: 'power', required: true, position: [-0.38, 0.04, 0] },
      { id: 'outlet', label: 'Out', direction: 'out', medium: 'power', required: true, position: [0.38, 0.04, 0] },
    ],
    anchors: [{ id: 'callout', kind: 'callout', position: [0, 1.85, 0] }],
    defaults: {
      parameters: createDefaults(
        ['Fuse Status', 'Rated Current', 'Voltage Class', 'Last Trip', 'Spare Available'],
        {
          'Fuse Status': 'Healthy',
          'Rated Current': '16 A',
          'Voltage Class': 'DC/AC',
          'Last Trip': 'None',
          'Spare Available': 'Yes',
        },
      ),
    },
  }),
  createStencilDefinition({
    id: 'mcbBreaker',
    family: 'power',
    renderer: 'mcbBreaker',
    label: 'MCB Breaker',
    tagPrefix: 'MCB',
    headlineMetric: 'Breaker Status',
    footprint: { width: 0.9, depth: 0.58, height: 1.05 },
    parameters: ['Breaker Status', 'Trip Curve', 'Rated Current', 'Pole Count', 'Trip Alarm'],
    ports: [
      { id: 'inlet', label: 'In', direction: 'in', medium: 'power', required: true, position: [-0.42, 0.05, 0] },
      { id: 'outlet', label: 'Out', direction: 'out', medium: 'power', required: true, position: [0.42, 0.05, 0] },
    ],
    anchors: [{ id: 'callout', kind: 'callout', position: [0, 1.92, 0] }],
    defaults: {
      parameters: createDefaults(
        ['Breaker Status', 'Trip Curve', 'Rated Current', 'Pole Count', 'Trip Alarm'],
        {
          'Breaker Status': 'Closed',
          'Trip Curve': 'C',
          'Rated Current': '16 A',
          'Pole Count': '2P',
          'Trip Alarm': 'Inactive',
        },
      ),
    },
  }),
  createStencilDefinition({
    id: 'charger',
    family: 'power',
    renderer: 'charger',
    label: 'Solar / Mains Charger',
    tagPrefix: 'CHG',
    headlineMetric: 'Charge Current',
    footprint: { width: 1.45, depth: 0.85, height: 1.1 },
    parameters: ['Input Voltage', 'Output Voltage', 'Charge Current', 'Charge Mode', 'Charger Health'],
    ports: [
      { id: 'inlet', label: 'Input', direction: 'in', medium: 'power', required: true, position: [-0.66, 0.08, 0] },
      { id: 'outlet', label: 'Charge Out', direction: 'out', medium: 'dc-power', required: true, position: [0.66, 0.08, 0] },
    ],
    anchors: [{ id: 'callout', kind: 'callout', position: [0, 2.0, 0] }],
    defaults: {
      parameters: createDefaults(
        ['Input Voltage', 'Output Voltage', 'Charge Current', 'Charge Mode', 'Charger Health'],
        {
          'Input Voltage': '48 V',
          'Output Voltage': '24 VDC',
          'Charge Current': '22 A',
          'Charge Mode': 'Float',
          'Charger Health': 'Healthy',
        },
      ),
    },
  }),
  createStencilDefinition({
    id: 'lithiumBattery',
    family: 'power',
    renderer: 'lithiumBattery',
    label: '24V Lithium Battery',
    tagPrefix: 'BAT',
    headlineMetric: 'State of Charge',
    footprint: { width: 1.9, depth: 1.0, height: 1.05 },
    parameters: ['Battery Voltage', 'Battery Current', 'State of Charge', 'Battery Temperature', 'BMS Status'],
    ports: [
      { id: 'chargeIn', label: 'Charge In', direction: 'in', medium: 'dc-power', required: true, position: [-0.86, 0.08, -0.18] },
      { id: 'outlet', label: 'DC Out', direction: 'out', medium: 'dc-power', required: true, position: [0.86, 0.08, 0.18] },
    ],
    anchors: [{ id: 'callout', kind: 'callout', position: [0, 2.05, 0] }],
    defaults: {
      parameters: createDefaults(
        ['Battery Voltage', 'Battery Current', 'State of Charge', 'Battery Temperature', 'BMS Status'],
        {
          'Battery Voltage': '25.8 V',
          'Battery Current': '38 A',
          'State of Charge': '82%',
          'Battery Temperature': '31 C',
          'BMS Status': 'Normal',
        },
      ),
    },
  }),
  createStencilDefinition({
    id: 'solarInverter',
    family: 'power',
    renderer: 'solarInverter',
    label: '2.5kVA Solar Inverter',
    tagPrefix: 'INV',
    headlineMetric: 'AC Output Voltage',
    footprint: { width: 1.65, depth: 0.95, height: 1.28 },
    parameters: ['DC Input Voltage', 'AC Output Voltage', 'Output Power', 'Inverter Load', 'Inverter Status'],
    ports: [
      { id: 'dcIn', label: 'DC In', direction: 'in', medium: 'dc-power', required: true, position: [-0.76, 0.12, 0] },
      { id: 'acOut', label: 'AC Out', direction: 'out', medium: 'ac-power', required: true, position: [0.76, 0.12, 0] },
    ],
    anchors: [{ id: 'callout', kind: 'callout', position: [0, 2.2, 0] }],
    defaults: {
      parameters: createDefaults(
        ['DC Input Voltage', 'AC Output Voltage', 'Output Power', 'Inverter Load', 'Inverter Status'],
        {
          'DC Input Voltage': '24.8 V',
          'AC Output Voltage': '230 VAC',
          'Output Power': '1.18 kW',
          'Inverter Load': '47%',
          'Inverter Status': 'Running',
        },
      ),
    },
  }),
  createStencilDefinition({
    id: 'vfdDrive',
    family: 'power',
    renderer: 'vfdDrive',
    label: '1HP VFD',
    tagPrefix: 'VFD',
    headlineMetric: 'Output Frequency',
    footprint: { width: 1.25, depth: 0.82, height: 1.22 },
    parameters: ['Input Voltage', 'Output Frequency', 'Motor Current', 'Speed Reference', 'Drive Status'],
    ports: [
      { id: 'acIn', label: 'AC In', direction: 'in', medium: 'ac-power', required: true, position: [-0.58, 0.12, 0] },
      { id: 'motorOut', label: 'Motor Out', direction: 'out', medium: 'ac-power', required: true, position: [0.58, 0.12, 0] },
      { id: 'rs485', label: 'RS485', direction: 'out', medium: 'rs485', required: false, position: [0, 0.54, -0.38] },
    ],
    anchors: [{ id: 'callout', kind: 'callout', position: [0, 2.15, 0] }],
    defaults: {
      parameters: createDefaults(
        ['Input Voltage', 'Output Frequency', 'Motor Current', 'Speed Reference', 'Drive Status'],
        {
          'Input Voltage': '230 VAC',
          'Output Frequency': '42.5 Hz',
          'Motor Current': '3.8 A',
          'Speed Reference': '1420 rpm',
          'Drive Status': 'Running',
        },
      ),
    },
  }),
  createStencilDefinition({
    id: 'acMotorLoad',
    family: 'power',
    renderer: 'acMotorLoad',
    label: '1HP AC Motor With Load',
    tagPrefix: 'MTR',
    headlineMetric: 'Motor Speed',
    footprint: { width: 1.55, depth: 0.95, height: 0.98 },
    parameters: ['Motor Speed', 'Motor Current', 'Load Torque', 'Motor Temperature', 'Vibration'],
    ports: [
      { id: 'powerIn', label: 'Power In', direction: 'in', medium: 'ac-power', required: true, position: [-0.72, 0.06, 0] },
      { id: 'sensorOut', label: 'N/Vib/Temp', direction: 'out', medium: 'signal', required: false, position: [0.72, 0.28, 0.24] },
    ],
    anchors: [{ id: 'callout', kind: 'callout', position: [0, 2.0, 0] }],
    defaults: {
      parameters: createDefaults(
        ['Motor Speed', 'Motor Current', 'Load Torque', 'Motor Temperature', 'Vibration'],
        {
          'Motor Speed': '1420 rpm',
          'Motor Current': '3.8 A',
          'Load Torque': '61%',
          'Motor Temperature': '48 C',
          Vibration: '2.4 mm/s',
        },
      ),
    },
  }),
  createStencilDefinition({
    id: 'acMfm',
    family: 'instrument',
    renderer: 'mfmMeter',
    label: 'AC MFM with RS485',
    tagPrefix: 'ACM',
    headlineMetric: 'Power',
    footprint: { width: 0.92, depth: 0.55, height: 0.92 },
    parameters: ['Voltage', 'Current', 'Power', 'Power Factor', 'RS485 Health'],
    ports: [
      { id: 'inlet', label: 'Power In', direction: 'in', medium: 'ac-power', required: true, position: [-0.42, 0.04, 0] },
      { id: 'outlet', label: 'Power Out', direction: 'out', medium: 'ac-power', required: true, position: [0.42, 0.04, 0] },
      { id: 'rs485', label: 'RS485', direction: 'out', medium: 'rs485', required: false, position: [0, 0.52, -0.28] },
    ],
    anchors: [{ id: 'callout', kind: 'callout', position: [0, 1.9, 0] }],
    defaults: {
      parameters: createDefaults(
        ['Voltage', 'Current', 'Power', 'Power Factor', 'RS485 Health'],
        {
          Voltage: '230 V',
          Current: '4.9 A',
          Power: '1.12 kW',
          'Power Factor': '0.91',
          'RS485 Health': 'Online',
        },
      ),
    },
  }),
  createStencilDefinition({
    id: 'dcMfm',
    family: 'instrument',
    renderer: 'mfmMeter',
    label: 'DC MFM with RS485',
    tagPrefix: 'DCM',
    headlineMetric: 'Power',
    footprint: { width: 0.92, depth: 0.55, height: 0.92 },
    parameters: ['Voltage', 'Current', 'Power', 'Polarity Health', 'RS485 Health'],
    ports: [
      { id: 'inlet', label: 'Power In', direction: 'in', medium: 'dc-power', required: true, position: [-0.42, 0.04, 0] },
      { id: 'outlet', label: 'Power Out', direction: 'out', medium: 'dc-power', required: true, position: [0.42, 0.04, 0] },
      { id: 'rs485', label: 'RS485', direction: 'out', medium: 'rs485', required: false, position: [0, 0.52, -0.28] },
    ],
    anchors: [{ id: 'callout', kind: 'callout', position: [0, 1.9, 0] }],
    defaults: {
      parameters: createDefaults(
        ['Voltage', 'Current', 'Power', 'Polarity Health', 'RS485 Health'],
        {
          Voltage: '24.8 V',
          Current: '18.2 A',
          Power: '0.45 kW',
          'Polarity Health': 'Normal',
          'RS485 Health': 'Online',
        },
      ),
    },
  }),
  createStencilDefinition({
    id: 'plcRack',
    family: 'control',
    renderer: 'plcRack',
    label: 'PLC + RS485 + Temp Card',
    tagPrefix: 'PLC',
    headlineMetric: 'PLC Health',
    footprint: { width: 1.8, depth: 0.72, height: 1.12 },
    parameters: ['PLC Health', 'RS485 Card', 'Temperature Card', 'I/O Scan Time', 'Last Fault'],
    ports: [
      { id: 'rs485', label: 'RS485 In', direction: 'in', medium: 'rs485', required: true, position: [-0.82, 0.38, -0.18] },
      { id: 'hmi', label: 'HMI Link', direction: 'out', medium: 'rs485', required: true, position: [0.82, 0.38, 0.18] },
      { id: 'sensorIn', label: 'N/Vib/Temp', direction: 'in', medium: 'signal', required: false, position: [-0.82, 0.14, 0.24] },
    ],
    anchors: [{ id: 'callout', kind: 'callout', position: [0, 2.1, 0] }],
    defaults: {
      parameters: createDefaults(
        ['PLC Health', 'RS485 Card', 'Temperature Card', 'I/O Scan Time', 'Last Fault'],
        {
          'PLC Health': 'RUN',
          'RS485 Card': 'Online',
          'Temperature Card': 'Healthy',
          'I/O Scan Time': '18 ms',
          'Last Fault': 'None',
        },
      ),
    },
  }),
  createStencilDefinition({
    id: 'hmiPanel',
    family: 'control',
    renderer: 'hmiPanel',
    label: 'HMI Panel',
    tagPrefix: 'HMI',
    headlineMetric: 'HMI Status',
    footprint: { width: 1.25, depth: 0.62, height: 0.95 },
    parameters: ['HMI Status', 'RS485 Link', 'Active Screen', 'Operator Mode', 'Last Acknowledge'],
    ports: [
      { id: 'rs485', label: 'RS485', direction: 'in', medium: 'rs485', required: true, position: [-0.58, 0.22, 0] },
      { id: 'outlet', label: 'Panel Out', direction: 'out', medium: 'rs485', required: false, position: [0.58, 0.22, 0] },
    ],
    anchors: [{ id: 'callout', kind: 'callout', position: [0, 1.95, 0] }],
    defaults: {
      parameters: createDefaults(
        ['HMI Status', 'RS485 Link', 'Active Screen', 'Operator Mode', 'Last Acknowledge'],
        {
          'HMI Status': 'Online',
          'RS485 Link': 'Healthy',
          'Active Screen': 'Drive Overview',
          'Operator Mode': 'Monitor',
          'Last Acknowledge': 'None',
        },
      ),
    },
  }),
  createStencilDefinition({
    id: 'rs485Bus',
    family: 'connection',
    renderer: 'rs485Bus',
    label: 'RS485 Field Bus',
    tagPrefix: 'BUS',
    headlineMetric: 'Bus Health',
    footprint: { width: 1.8, depth: 0.28, height: 0.32 },
    parameters: ['Bus Health', 'Baud Rate', 'Device Count', 'Termination', 'Error Count'],
    ports: [
      { id: 'inlet', label: 'In', direction: 'in', medium: 'rs485', required: false, position: [-0.84, 0.02, 0] },
      { id: 'outlet', label: 'Out', direction: 'out', medium: 'rs485', required: false, position: [0.84, 0.02, 0] },
    ],
    anchors: [{ id: 'callout', kind: 'callout', position: [0, 1.5, 0] }],
    defaults: {
      parameters: createDefaults(
        ['Bus Health', 'Baud Rate', 'Device Count', 'Termination', 'Error Count'],
        {
          'Bus Health': 'Healthy',
          'Baud Rate': '9600',
          'Device Count': '7',
          Termination: 'Enabled',
          'Error Count': '0',
        },
      ),
    },
  }),
  createStencilDefinition({
    id: 'tempVibCard',
    family: 'control',
    renderer: 'ioCard',
    label: 'N/Vib/Temp Card',
    tagPrefix: 'TVC',
    headlineMetric: 'Card Health',
    footprint: { width: 0.9, depth: 0.52, height: 0.92 },
    parameters: ['Card Health', 'Speed Input', 'Vibration Input', 'Temperature Input', 'Signal Health'],
    ports: [
      { id: 'signalIn', label: 'Signal In', direction: 'in', medium: 'signal', required: true, position: [-0.42, 0.12, 0] },
      { id: 'outlet', label: 'PLC Out', direction: 'out', medium: 'signal', required: true, position: [0.42, 0.12, 0] },
    ],
    anchors: [{ id: 'callout', kind: 'callout', position: [0, 1.78, 0] }],
    defaults: {
      parameters: createDefaults(
        ['Card Health', 'Speed Input', 'Vibration Input', 'Temperature Input', 'Signal Health'],
        {
          'Card Health': 'Healthy',
          'Speed Input': '1420 rpm',
          'Vibration Input': '2.4 mm/s',
          'Temperature Input': '48 C',
          'Signal Health': 'Good',
        },
      ),
    },
  }),
  ...openIndustryStencils.map(createStencilDefinition),
  createStencilDefinition({
    id: 'genericMachine',
    family: 'machine',
    renderer: 'genericMachine',
    label: 'Generic Machine',
    tagPrefix: 'EQ',
    headlineMetric: 'Status',
    footprint: { width: 1.3, depth: 1.2, height: 1.4 },
    parameters: ['Status', 'Availability', 'Last Event'],
    anchors: [{ id: 'callout', kind: 'callout', position: [0, 2.2, 0] }],
    defaults: {
      parameters: createDefaults(
        ['Status', 'Availability', 'Last Event'],
        {
          Status: 'Ready',
          Availability: '95%',
          'Last Event': 'No events',
        },
      ),
    },
  }),
]

export const projectStencilLibrary = Object.fromEntries(stencilCatalog.map((stencil) => [stencil.id, stencil]))

export const equipmentStencils = stencilCatalog.map((stencil) => ({
  id: stencil.id,
  model: stencil.renderer,
  label: stencil.label,
  tagPrefix: stencil.tagPrefix,
  family: stencil.family,
  headlineMetric: stencil.headlineMetric,
  parameters: stencil.parameters,
}))

export const stencilDefaults = stencilCatalog.reduce((defaults, stencil) => {
  Object.assign(defaults, stencil.defaults.parameters)
  return defaults
}, {})

export function getStencilDefinition(stencilId, library = projectStencilLibrary) {
  return library[stencilId] ?? library.genericMachine
}

export function getPortDefinition(stencilId, portId, library = projectStencilLibrary) {
  const stencil = getStencilDefinition(stencilId, library)
  return stencil.ports.find((port) => port.id === portId) ?? null
}

export function getAnchorDefinition(stencilId, anchorId, library = projectStencilLibrary) {
  const stencil = getStencilDefinition(stencilId, library)
  return stencil.anchors.find((anchor) => anchor.id === anchorId) ?? null
}

export function buildNodeParameters(stencilId, library = projectStencilLibrary) {
  const stencil = getStencilDefinition(stencilId, library)
  return structuredClone(stencil.defaults.parameters)
}

export function nextTag(stencilId, project, library = projectStencilLibrary) {
  const stencil = getStencilDefinition(stencilId, library)
  const prefix = stencil.tagPrefix
  let highest = 0

  project.layouts.forEach((layout) => {
    layout.nodes.forEach((node) => {
      if (!node.tag?.startsWith(`${prefix}-`)) return
      const match = node.tag.match(/-(\d+)$/)
      if (!match) return
      highest = Math.max(highest, Number(match[1]))
    })
  })

  return `${prefix}-${String(Math.max(101, highest + 1)).padStart(3, '0')}`
}

export function nextLayoutPosition(layout) {
  const index = layout.nodes.filter((node) => node.attachments.length === 0).length
  const column = index % 5
  const row = Math.floor(index / 5)
  return [-6.2 + column * 2.6, 0.58, -1.6 + row * 1.55]
}

export function canAttachStencilToNode(stencilId, node, library = projectStencilLibrary) {
  const stencil = getStencilDefinition(stencilId, library)
  const host = getStencilDefinition(node.stencilId, library)
  if (stencil.family !== 'sensor') return false
  return Boolean(host.rules.allowedAttachments?.includes(stencil.id))
}
