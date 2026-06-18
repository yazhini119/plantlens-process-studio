import { RoundedBox } from '@react-three/drei'
import { getNodeParameterValue } from '../../data/defaultConfig'
import {
  DetailRing,
  GuardRail,
  LadderFrame,
  MotorBody,
  Outline,
  PipePort,
  SchematicMaterial,
  SensorHead,
  SightGlass,
  SkidBase,
  SupportLegs,
} from './SymbolPrimitives'

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function readParameter(station, name, fallback = '') {
  return getNodeParameterValue(station, name) || fallback
}

function parseNumber(value, fallback = 0) {
  if (typeof value === 'number') return value
  const match = `${value}`.replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  return match ? Number(match[0]) : fallback
}

function parsePercent(value, fallback = 0.5) {
  const numeric = parseNumber(value, fallback * 100)
  return clamp(numeric / 100, 0, 1)
}

function isTruthyStatus(value) {
  const normalized = `${value}`.trim().toLowerCase()
  return ['active', 'aligned', 'clear', 'detected', 'enabled', 'good', 'healthy', 'open', 'pulsing', 'queued', 'ready', 'running', 'waiting', 'yes'].includes(normalized)
}

function BottleLane({ count = 6, spacing = 0.28, position = [0, 0, 0], fill = 0.6, style, tint = '#ece7d7' }) {
  const boundedFill = clamp(fill, 0.12, 0.94)

  return (
    <group position={position}>
      {Array.from({ length: count }).map((_, index) => {
        const x = (index - (count - 1) / 2) * spacing
        return (
          <group key={index} position={[x, 0, 0]}>
            <mesh position={[0, 0.2, 0]}>
              <cylinderGeometry args={[0.07, 0.082, 0.36, 14]} />
              <meshStandardMaterial color="#fdfefe" transparent opacity={style.opacity * 0.35} roughness={0.16} metalness={0.02} />
              <Outline color={style.edge} />
            </mesh>
            <mesh position={[0, 0.06 + boundedFill * 0.12, 0]}>
              <cylinderGeometry args={[0.052, 0.058, boundedFill * 0.22, 14]} />
              <meshStandardMaterial color={tint} transparent opacity={style.opacity * 0.5} roughness={0.2} metalness={0.04} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function StatusLamp({ position = [0, 0, 0], active = true, style }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.05, 16, 12]} />
      <meshStandardMaterial
        color={active ? '#f3b11d' : style.secondary}
        emissive={active ? '#f3b11d' : '#000000'}
        emissiveIntensity={active ? 0.6 : 0}
        transparent
        opacity={style.opacity}
      />
      <Outline color={style.edge} />
    </mesh>
  )
}

export function TankSymbol({ station, style }) {
  const level = parsePercent(readParameter(station, 'Tank Level', '50%'), 0.5)
  const temperature = parseNumber(readParameter(station, 'Temperature', '30 C'), 30)
  const liquidColor = temperature >= 40 ? '#f2c26f' : '#d6e8e6'

  return (
    <group>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.48, 0.48, 1.35, 40]} />
        <SchematicMaterial color={style.fill} opacity={style.opacity} metalness={0.08} roughness={0.55} />
        <Outline color={style.edge} />
      </mesh>
      <mesh position={[0, -0.16 + level * 0.64, 0]}>
        <cylinderGeometry args={[0.42, 0.42, Math.max(0.14, level * 1.06), 36]} />
        <meshStandardMaterial color={liquidColor} transparent opacity={style.opacity * 0.42} roughness={0.16} metalness={0.02} />
      </mesh>
      <mesh position={[0, 1.16, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.18, 32]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
      <mesh position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.12, 16]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
      <mesh position={[0, -0.23, 0]}>
        <cylinderGeometry args={[0.57, 0.57, 0.12, 40]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
      <DetailRing style={style} position={[0, 0.9, 0]} radius={0.49} />
      <DetailRing style={style} position={[0, 0.12, 0]} radius={0.49} />
      <SupportLegs style={style} positions={[[-0.36, -0.32], [0.36, -0.32], [-0.36, 0.32], [0.36, 0.32]]} />
      <PipePort style={style} position={[-0.54, 0.52, 0]} length={0.26} flanged />
      <PipePort style={style} position={[0.55, 0.12, 0.33]} length={0.46} flanged />
      <SightGlass style={style} position={[0.58, 0.42, -0.12]} height={0.94} level={level} />
      <LadderFrame style={style} position={[-0.58, 0.26, -0.12]} height={1.08} rungCount={6} />
    </group>
  )
}

export function PumpSymbol({ station, style }) {
  const pressure = parseNumber(readParameter(station, 'Pump Pressure', '2.4 bar'), 2.4)
  const vibration = parseNumber(readParameter(station, 'Vibration', '2.1 mm/s'), 2.1)
  const haloRadius = clamp(0.34 + vibration * 0.015, 0.34, 0.48)

  return (
    <group>
      <SkidBase style={style} args={[1.28, 0.16, 0.78]} position={[0.03, -0.36, 0]} />
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.72, 36]} />
        <SchematicMaterial color={style.fill} opacity={style.opacity} roughness={0.38} metalness={0.08} />
        <Outline color={style.edge} />
      </mesh>
      <mesh position={[0.36, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.2, 0.28, 0.42, 32]} />
        <SchematicMaterial color={style.fill} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
      <DetailRing style={style} position={[0.12, 0, 0]} radius={haloRadius} />
      <mesh position={[0.16, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.14, 0.018, 10, 24]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} metalness={0.1} roughness={0.36} />
      </mesh>
      <MotorBody style={style} position={[-0.48, 0, 0]} />
      <mesh position={[-0.14, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 0.24, 16]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} metalness={0.14} roughness={0.4} />
        <Outline color={style.edge} />
      </mesh>
      <PipePort style={style} position={[-0.78, 0.02, 0]} length={0.32} flanged />
      <PipePort style={style} position={[0.78, 0.02, 0]} length={0.36} flanged />
      <mesh position={[0.05, 0.39, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.11, 20]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
      <mesh position={[0.22, 0.6, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.32, 12]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
      <mesh position={[0.22, 0.78, 0]}>
        <sphereGeometry args={[0.1, 18, 12]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={style.opacity * 0.84} roughness={0.18} />
        <Outline color={style.edge} />
      </mesh>
      <mesh position={[0.22, 0.78, 0.08]}>
        <boxGeometry args={[0.06, 0.012, 0.012]} />
        <meshStandardMaterial color={pressure < 1.5 ? '#ef2f2f' : '#17805e'} transparent opacity={style.opacity} />
      </mesh>
    </group>
  )
}

export function FlowSensorSymbol({ station, style }) {
  const signalHealthy = isTruthyStatus(readParameter(station, 'Signal Health', 'Good'))

  return (
    <group>
      <PipePort style={style} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]} length={1.08} radius={0.09} flanged />
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.36, 24]} />
        <meshStandardMaterial color="#fbfdfd" transparent opacity={style.opacity * 0.34} roughness={0.12} />
        <Outline color={style.edge} />
      </mesh>
      <RoundedBox args={[0.3, 0.18, 0.22]} radius={0.03} position={[0, 0.1, 0]}>
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </RoundedBox>
      <SensorHead style={style} position={[0, 0.54, 0]} radius={0.2} />
      <StatusLamp style={style} position={[0.12, 0.18, 0.12]} active={signalHealthy} />
    </group>
  )
}

export function PressureSensorSymbol({ station, style }) {
  const pressure = parseNumber(readParameter(station, 'Pressure', '1.8 bar'), 1.8)

  return (
    <group>
      <SkidBase style={style} args={[0.72, 0.1, 0.52]} position={[0, -0.34, 0]} />
      <RoundedBox args={[0.2, 0.12, 0.18]} radius={0.02} position={[0, -0.02, 0]}>
        <SchematicMaterial color={style.fill} opacity={style.opacity} roughness={0.44} />
        <Outline color={style.edge} />
      </RoundedBox>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.62, 16]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
      <SensorHead style={style} position={[0, 0.66, 0]} radius={0.24} />
      <PipePort style={style} position={[0, -0.08, 0]} rotation={[Math.PI / 2, 0, 0]} length={0.52} radius={0.065} flanged />
      <mesh position={[0.16, 0.16, 0]}>
        <boxGeometry args={[0.12, 0.012, 0.012]} />
        <meshStandardMaterial color={pressure > 2.5 ? '#ef2f2f' : '#17805e'} transparent opacity={style.opacity} />
      </mesh>
    </group>
  )
}

export function MotorSymbol({ station, style }) {
  const running = isTruthyStatus(readParameter(station, 'Run Status', readParameter(station, 'Pump Status', 'Ready')))

  return (
    <group>
      <SkidBase style={style} args={[1.2, 0.14, 0.72]} position={[0, -0.34, 0]} />
      <MotorBody style={style} position={[0, 0.06, 0]} />
      <mesh position={[0.56, 0.06, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.34, 18]} />
        <SchematicMaterial color={style.fill} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
      <StatusLamp style={style} position={[-0.1, 0.26, 0.22]} active={running} />
    </group>
  )
}

export function ValveSymbol({ station, style }) {
  const position = parsePercent(readParameter(station, 'Valve Position', '50%'), 0.5)

  return (
    <group>
      <PipePort style={style} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]} length={1.08} radius={0.08} flanged />
      <mesh position={[0, 0.06, 0]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[0.34, 0.24, 0.34]} />
        <SchematicMaterial color={style.fill} opacity={style.opacity} roughness={0.54} />
        <Outline color={style.edge} />
      </mesh>
      <mesh position={[0, 0.34, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.12, 24]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
      <mesh position={[0, 0.2 + position * 0.14, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.32, 12]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
      <mesh position={[0.14 + position * 0.06, 0.42, 0]} rotation={[0, 0, Math.PI / 3]}>
        <boxGeometry args={[0.18, 0.03, 0.03]} />
        <SchematicMaterial color={style.fill} opacity={style.opacity} />
      </mesh>
    </group>
  )
}

export function ConveyorSymbol({ station, style }) {
  const bottlesVisible = isTruthyStatus(readParameter(station, 'Bottle Presence', 'Detected'))
  const count = bottlesVisible ? 6 : 0

  return (
    <group>
      <RoundedBox args={[2.25, 0.18, 0.54]} radius={0.035} position={[0, 0, 0.08]}>
        <SchematicMaterial color={style.secondary} opacity={style.opacity} metalness={0.1} roughness={0.54} />
        <Outline color={style.edge} />
      </RoundedBox>
      <mesh position={[0, 0.11, 0.08]}>
        <boxGeometry args={[2.12, 0.04, 0.42]} />
        <meshStandardMaterial color="#ece8dd" transparent opacity={style.opacity * 0.38} roughness={0.32} />
      </mesh>
      {Array.from({ length: 6 }).map((_, index) => (
        <mesh key={index} position={[-0.9 + index * 0.36, 0.18, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.58, 20]} />
          <SchematicMaterial color={style.fill} opacity={style.opacity} />
          <Outline color={style.edge} />
        </mesh>
      ))}
      <SupportLegs style={style} positions={[[-0.86, -0.22], [0.86, -0.22], [-0.86, 0.32], [0.86, 0.32]]} height={0.38} />
      <GuardRail style={style} width={2.08} depth={0.44} height={0.24} position={[0, 0.2, 0.08]} />
      {count ? <BottleLane style={style} count={count} spacing={0.3} position={[0, 0.13, 0.08]} fill={0.2} tint="#ebe2cb" /> : null}
    </group>
  )
}

export function MixerSymbol({ station, style }) {
  const torque = parsePercent(readParameter(station, 'Torque', '42%'), 0.42)

  return (
    <group>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.48, 0.38, 1.05, 36]} />
        <SchematicMaterial color={style.fill} opacity={style.opacity} metalness={0.06} roughness={0.56} />
        <Outline color={style.edge} />
      </mesh>
      <mesh position={[0, 0.02 + torque * 0.18, 0]}>
        <cylinderGeometry args={[0.4, 0.32, 0.28 + torque * 0.18, 30]} />
        <meshStandardMaterial color="#d7e7e4" transparent opacity={style.opacity * 0.36} roughness={0.18} />
      </mesh>
      <MotorBody style={style} position={[0, 1.08, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <mesh position={[0, 0.46, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.9, 12]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
      <mesh position={[0, 0.18, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.58, 0.045, 0.045]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.3, 0.04, 0.04]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
      </mesh>
      <SupportLegs style={style} positions={[[-0.36, -0.32], [0.36, -0.32], [-0.36, 0.32], [0.36, 0.32]]} height={0.5} />
      <LadderFrame style={style} position={[-0.54, 0.22, 0]} height={1.02} rungCount={5} />
    </group>
  )
}

export function HeatExchangerSymbol({ style }) {
  return (
    <group>
      <SkidBase style={style} args={[1.5, 0.12, 0.74]} position={[0, -0.32, 0]} />
      <mesh position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.26, 0.26, 1.22, 32]} />
        <SchematicMaterial color={style.fill} opacity={style.opacity} metalness={0.08} roughness={0.46} />
        <Outline color={style.edge} />
      </mesh>
      {[-0.46, -0.18, 0.1, 0.38].map((offset) => (
        <DetailRing key={offset} style={style} position={[offset, 0.05, 0]} radius={0.265} />
      ))}
      {[-0.34, 0.34].map((offset) => (
        <mesh key={offset} position={[offset, -0.14, 0]}>
          <boxGeometry args={[0.16, 0.24, 0.18]} />
          <SchematicMaterial color={style.secondary} opacity={style.opacity} />
          <Outline color={style.edge} />
        </mesh>
      ))}
      <PipePort style={style} position={[-0.74, 0.05, 0]} length={0.3} flanged />
      <PipePort style={style} position={[0.74, 0.05, 0]} length={0.3} flanged />
      <PipePort style={style} position={[0, 0.36, -0.28]} rotation={[Math.PI / 2, 0, 0]} length={0.34} flanged />
      <PipePort style={style} position={[0, -0.2, 0.28]} rotation={[Math.PI / 2, 0, 0]} length={0.34} flanged />
    </group>
  )
}

export function CompressorSymbol({ style }) {
  return (
    <group>
      <SkidBase style={style} args={[1.35, 0.14, 0.86]} position={[0, -0.34, 0]} />
      <mesh position={[0.22, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.34, 0.42, 0.6, 34]} />
        <SchematicMaterial color={style.fill} opacity={style.opacity} roughness={0.38} metalness={0.08} />
        <Outline color={style.edge} />
      </mesh>
      <DetailRing style={style} position={[0.18, 0.1, 0]} radius={0.34} />
      <MotorBody style={style} position={[-0.42, 0.08, 0]} />
      <PipePort style={style} position={[0.72, 0.1, 0]} length={0.36} flanged />
      <PipePort style={style} position={[0.14, 0.54, 0]} rotation={[0, 0, 0]} length={0.4} flanged />
      <mesh position={[0.02, 0.28, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, 0.24, 12]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
      </mesh>
    </group>
  )
}

export function ColumnSymbol({ station, style }) {
  const level = parsePercent(readParameter(station, 'Level', '54%'), 0.54)

  return (
    <group>
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 1.8, 34]} />
        <SchematicMaterial color={style.fill} opacity={style.opacity} metalness={0.08} roughness={0.52} />
        <Outline color={style.edge} />
      </mesh>
      {[-0.02, 0.42, 0.86, 1.28].map((height) => (
        <mesh key={height} position={[0, height, 0]}>
          <cylinderGeometry args={[0.255, 0.255, 0.035, 34]} />
          <SchematicMaterial color={style.secondary} opacity={style.opacity} />
          <Outline color={style.edge} />
        </mesh>
      ))}
      <mesh position={[0, -0.04 + level * 0.62, 0]}>
        <cylinderGeometry args={[0.19, 0.19, Math.max(0.14, level * 0.82), 28]} />
        <meshStandardMaterial color="#dae8d9" transparent opacity={style.opacity * 0.36} roughness={0.18} />
      </mesh>
      <PipePort style={style} position={[-0.34, 0.76, 0]} length={0.34} flanged />
      <PipePort style={style} position={[0.34, 0.24, 0]} length={0.34} flanged />
      <SupportLegs style={style} positions={[[-0.2, -0.16], [0.2, -0.16], [-0.2, 0.16], [0.2, 0.16]]} height={0.46} />
      <LadderFrame style={style} position={[-0.34, 0.72, 0]} height={1.48} rungCount={8} />
      <SightGlass style={style} position={[0.32, 0.58, 0]} height={0.86} level={level} />
    </group>
  )
}

export function SkidSymbol({ station, style }) {
  const pressure = parseNumber(readParameter(station, 'Outlet Pressure', '2.8 bar'), 2.8)

  return (
    <group>
      <SkidBase style={style} args={[1.55, 0.16, 1.08]} position={[0, -0.34, 0]} />
      <RoundedBox args={[0.54, 0.5, 0.5]} radius={0.04} position={[-0.38, 0.04, 0]}>
        <SchematicMaterial color={style.fill} opacity={style.opacity} roughness={0.56} />
        <Outline color={style.edge} />
      </RoundedBox>
      <PressureSensorSymbol station={station} style={style} />
      <mesh position={[0.38, 0.02, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.11, 0.11, 0.56, 20]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
      <PipePort style={style} position={[-0.86, 0.02, 0]} length={0.32} flanged />
      <PipePort style={style} position={[0.86, 0.02, 0]} length={0.32} flanged />
      <GuardRail style={style} width={1.28} depth={0.74} height={0.22} position={[0.06, 0.18, 0]} />
      <StatusLamp style={style} position={[-0.52, 0.34, 0.22]} active={pressure >= 2.2} />
    </group>
  )
}

export function FillerSymbol({ station, style }) {
  const fillVolume = parseNumber(readParameter(station, 'Fill Volume', '520 mL'), 520)
  const targetVolume = Math.max(1, parseNumber(readParameter(station, 'Target Fill Volume', '520 mL'), 520))
  const nozzleEnabled = isTruthyStatus(readParameter(station, 'Nozzle Status', 'Enabled'))
  const bottlePresent = isTruthyStatus(readParameter(station, 'Bottle Present', 'Yes'))
  const fillRatio = clamp(fillVolume / targetVolume, 0.1, 1)
  const nozzles = nozzleEnabled ? 4 : 2

  return (
    <group>
      <SkidBase style={style} args={[1.35, 0.14, 1.0]} position={[0, -0.38, 0]} />
      <RoundedBox args={[1.12, 1.56, 0.96]} radius={0.05} position={[0, 0.48, 0]}>
        <SchematicMaterial color={style.fill} opacity={style.opacity} roughness={0.56} />
        <Outline color={style.edge} />
      </RoundedBox>
      <mesh position={[0, 1.35, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.06, 0.06, 0.94, 16]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
      <mesh position={[0, 0.72, -0.42]}>
        <boxGeometry args={[0.92, 0.08, 0.12]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
      {Array.from({ length: nozzles }).map((_, index) => {
        const offset = -0.4 + (index / Math.max(1, nozzles - 1)) * 0.8
        return (
          <mesh key={offset} position={[offset, 0.12, -0.56]}>
            <cylinderGeometry args={[0.052, 0.072, 0.66, 18]} />
            <SchematicMaterial color={style.secondary} opacity={style.opacity} />
            <Outline color={style.edge} />
          </mesh>
        )
      })}
      <mesh position={[0, 0.58, 0.49]}>
        <boxGeometry args={[0.88, 0.52, 0.04]} />
        <meshStandardMaterial color="#fdfefe" transparent opacity={style.opacity * 0.18} roughness={0.12} />
        <Outline color={style.edge} />
      </mesh>
      <PipePort style={style} position={[-0.72, 0.28, -0.42]} length={0.36} flanged />
      <PipePort style={style} position={[0.72, 0.28, -0.42]} length={0.28} flanged />
      {bottlePresent ? <BottleLane style={style} count={4} spacing={0.27} position={[0, -0.06, -0.72]} fill={fillRatio} tint="#f1d88b" /> : null}
    </group>
  )
}

export function CapperSymbol({ station, style }) {
  const torque = parseNumber(readParameter(station, 'Capper Torque', '1.2 N m'), 1.2)
  const capPresent = isTruthyStatus(readParameter(station, 'Cap Presence', 'Detected'))

  return (
    <group>
      <SkidBase style={style} args={[1.1, 0.14, 1.02]} position={[0, -0.38, 0]} />
      <mesh position={[0, 0.48, 0]}>
        <cylinderGeometry args={[0.48, 0.62, 1.14, 30]} />
        <SchematicMaterial color={style.fill} opacity={style.opacity} roughness={0.5} />
        <Outline color={style.edge} />
      </mesh>
      <RoundedBox args={[0.86, 0.34, 0.86]} radius={0.04} position={[0, 1.18, 0]}>
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </RoundedBox>
      <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.42, 0.56, 32]} />
        <meshStandardMaterial color="#e2d5ba" transparent opacity={style.opacity * 0.34} roughness={0.32} />
      </mesh>
      <SensorHead style={style} position={[0.45, 0.62, 0.48]} radius={0.14} />
      <PipePort style={style} position={[-0.55, 0.2, 0]} length={0.32} flanged />
      <PipePort style={style} position={[0.55, 0.2, 0.32]} length={0.24} flanged />
      <StatusLamp style={style} position={[0, 1.36, 0.24]} active={capPresent && torque < 2.5} />
    </group>
  )
}

export function PackagingSymbol({ station, style }) {
  const packagingCount = parseNumber(readParameter(station, 'Packaging Count', '0'), 0)
  const labelApplied = readParameter(station, 'Label Applied', 'Pending')
  const filled = clamp(packagingCount > 0 ? 0.4 + packagingCount / 4000 : 0.2, 0.2, 0.86)

  return (
    <group>
      <RoundedBox args={[1.28, 0.78, 1.12]} radius={0.055} position={[0, 0.25, 0]}>
        <SchematicMaterial color={style.fill} opacity={style.opacity} roughness={0.64} />
        <Outline color={style.edge} />
      </RoundedBox>
      <RoundedBox args={[0.84, 0.18, 0.32]} radius={0.03} position={[0, 0.72, 0]}>
        <SchematicMaterial color={style.secondary} opacity={style.opacity} roughness={0.48} />
        <Outline color={style.edge} />
      </RoundedBox>
      {[
        [-0.34, 0.82],
        [0, 0.58],
        [0.34, 0.86],
      ].map(([offset, height]) => (
        <mesh key={offset} position={[offset, height, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.56, 16]} />
          <SchematicMaterial color={style.secondary} opacity={style.opacity} />
          <Outline color={style.edge} />
        </mesh>
      ))}
      <PipePort style={style} position={[-0.75, 0.12, 0.02]} length={0.34} flanged />
      <BottleLane style={style} count={4} spacing={0.24} position={[0, 0.38, 0.26]} fill={filled} tint="#ede4c8" />
      <StatusLamp style={style} position={[0.44, 0.72, 0.24]} active={isTruthyStatus(labelApplied)} />
    </group>
  )
}

export function GenericMachineSymbol({ station, style }) {
  const available = parsePercent(readParameter(station, 'Availability', '95%'), 0.95)

  return (
    <group>
      <SkidBase style={style} />
      <RoundedBox args={[1, 0.8, 1]} radius={0.06} position={[0, 0.25, 0]}>
        <SchematicMaterial color={style.fill} opacity={style.opacity} roughness={0.5} />
        <Outline color={style.edge} />
      </RoundedBox>
      <RoundedBox args={[0.46, 0.36, 0.06]} radius={0.02} position={[0.26, 0.32, 0.53]}>
        <meshStandardMaterial color="#fdfefe" transparent opacity={style.opacity * 0.18} roughness={0.12} />
        <Outline color={style.edge} />
      </RoundedBox>
      <mesh position={[0.16, 0.32, 0.56]}>
        <boxGeometry args={[available * 0.28, 0.04, 0.02]} />
        <meshStandardMaterial color={available > 0.75 ? '#17805e' : '#f3b11d'} transparent opacity={style.opacity} />
      </mesh>
      <SensorHead style={style} position={[0.24, 0.86, -0.24]} radius={0.14} />
    </group>
  )
}
