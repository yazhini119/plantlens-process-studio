import { RoundedBox } from '@react-three/drei'
import {
  MotorBody,
  Outline,
  PipePort,
  SchematicMaterial,
  SensorHead,
  SkidBase,
  SupportLegs,
} from './SymbolPrimitives'

export function TankSymbol({ style }) {
  return (
    <group>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.48, 0.48, 1.35, 40]} />
        <SchematicMaterial color={style.fill} opacity={style.opacity} metalness={0.08} roughness={0.55} />
        <Outline color={style.edge} />
      </mesh>
      <mesh position={[0, 1.16, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.18, 32]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
      <mesh position={[0, -0.23, 0]}>
        <cylinderGeometry args={[0.57, 0.57, 0.12, 40]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
      <SupportLegs style={style} positions={[[-0.36, -0.32], [0.36, -0.32], [-0.36, 0.32], [0.36, 0.32]]} />
      <PipePort style={style} position={[0.55, 0.12, 0.33]} length={0.46} />
    </group>
  )
}

export function PumpSymbol({ style }) {
  return (
    <group>
      <SkidBase style={style} args={[1.28, 0.16, 0.78]} position={[0.03, -0.36, 0]} />
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.72, 36]} />
        <SchematicMaterial color={style.fill} opacity={style.opacity} roughness={0.38} metalness={0.08} />
        <Outline color={style.edge} />
      </mesh>
      <mesh position={[0.38, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.28, 0.42, 32]} />
        <SchematicMaterial color={style.fill} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
      <MotorBody style={style} position={[-0.48, 0, 0]} />
      <PipePort style={style} position={[-0.78, 0.02, 0]} length={0.32} />
      <PipePort style={style} position={[0.78, 0.02, 0]} length={0.36} />
      <mesh position={[0.05, 0.39, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.11, 20]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
    </group>
  )
}

export function FlowSensorSymbol({ style }) {
  return (
    <group>
      <PipePort style={style} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]} length={1.08} radius={0.09} />
      <mesh position={[0, 0.07, 0]}>
        <boxGeometry args={[0.36, 0.16, 0.26]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
      <SensorHead style={style} position={[0, 0.5, 0]} radius={0.23} />
    </group>
  )
}

export function PressureSensorSymbol({ style }) {
  return (
    <group>
      <SkidBase style={style} args={[0.72, 0.1, 0.52]} position={[0, -0.34, 0]} />
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.055, 0.055, 0.78, 16]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
      <SensorHead style={style} position={[0, 0.62, 0]} radius={0.27} />
      <PipePort style={style} position={[0, -0.08, 0]} rotation={[Math.PI / 2, 0, 0]} length={0.52} radius={0.065} />
    </group>
  )
}

export function MotorSymbol({ style }) {
  return (
    <group>
      <SkidBase style={style} args={[1.2, 0.14, 0.72]} position={[0, -0.34, 0]} />
      <mesh position={[0, 0.06, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.34, 0.34, 0.92, 36]} />
        <SchematicMaterial color={style.fill} opacity={style.opacity} roughness={0.42} metalness={0.08} />
        <Outline color={style.edge} />
      </mesh>
      {[-0.22, 0, 0.22].map((offset) => (
        <mesh key={offset} position={[offset, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.36, 0.012, 8, 30]} />
          <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        </mesh>
      ))}
      <mesh position={[0.56, 0.06, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.34, 18]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
    </group>
  )
}

export function ValveSymbol({ style }) {
  return (
    <group>
      <PipePort style={style} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]} length={1.08} radius={0.08} />
      <mesh position={[0, 0.06, 0]} rotation={[0, Math.PI / 4, 0]}>
        <boxGeometry args={[0.34, 0.24, 0.34]} />
        <SchematicMaterial color={style.fill} opacity={style.opacity} roughness={0.54} />
        <Outline color={style.edge} />
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.1, 24]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.32, 12]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
    </group>
  )
}

export function ConveyorSymbol({ style }) {
  return (
    <group>
      <RoundedBox args={[2.25, 0.18, 0.54]} radius={0.035} position={[0, 0, 0.08]}>
        <SchematicMaterial color={style.secondary} opacity={style.opacity} metalness={0.1} roughness={0.54} />
        <Outline color={style.edge} />
      </RoundedBox>
      {[-0.82, 0, 0.82].map((offset) => (
        <mesh key={offset} position={[offset, 0.18, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.58, 20]} />
          <SchematicMaterial color={style.fill} opacity={style.opacity} />
          <Outline color={style.edge} />
        </mesh>
      ))}
      <SupportLegs style={style} positions={[[-0.86, -0.22], [0.86, -0.22], [-0.86, 0.32], [0.86, 0.32]]} height={0.38} />
    </group>
  )
}

export function MixerSymbol({ style }) {
  return (
    <group>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.48, 0.38, 1.05, 36]} />
        <SchematicMaterial color={style.fill} opacity={style.opacity} metalness={0.06} roughness={0.56} />
        <Outline color={style.edge} />
      </mesh>
      <MotorBody style={style} position={[0, 1.08, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <mesh position={[0, 0.46, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.9, 12]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
      <mesh position={[0, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[0.58, 0.045, 0.045]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
      <SupportLegs style={style} positions={[[-0.36, -0.32], [0.36, -0.32], [-0.36, 0.32], [0.36, 0.32]]} height={0.5} />
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
      {[-0.42, 0, 0.42].map((offset) => (
        <mesh key={offset} position={[offset, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.265, 0.012, 8, 28]} />
          <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        </mesh>
      ))}
      <PipePort style={style} position={[-0.74, 0.05, 0]} length={0.3} />
      <PipePort style={style} position={[0.74, 0.05, 0]} length={0.3} />
      <PipePort style={style} position={[0, 0.36, -0.28]} rotation={[Math.PI / 2, 0, 0]} length={0.34} />
      <PipePort style={style} position={[0, -0.2, 0.28]} rotation={[Math.PI / 2, 0, 0]} length={0.34} />
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
      <MotorBody style={style} position={[-0.42, 0.08, 0]} />
      <PipePort style={style} position={[0.72, 0.1, 0]} length={0.36} />
      <PipePort style={style} position={[0.14, 0.54, 0]} rotation={[0, 0, 0]} length={0.4} />
    </group>
  )
}

export function ColumnSymbol({ style }) {
  return (
    <group>
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 1.8, 34]} />
        <SchematicMaterial color={style.fill} opacity={style.opacity} metalness={0.08} roughness={0.52} />
        <Outline color={style.edge} />
      </mesh>
      {[-0.02, 0.42, 0.86].map((height) => (
        <mesh key={height} position={[0, height, 0]}>
          <cylinderGeometry args={[0.255, 0.255, 0.035, 34]} />
          <SchematicMaterial color={style.secondary} opacity={style.opacity} />
          <Outline color={style.edge} />
        </mesh>
      ))}
      <PipePort style={style} position={[-0.34, 0.76, 0]} length={0.34} />
      <PipePort style={style} position={[0.34, 0.24, 0]} length={0.34} />
      <SupportLegs style={style} positions={[[-0.2, -0.16], [0.2, -0.16], [-0.2, 0.16], [0.2, 0.16]]} height={0.46} />
    </group>
  )
}

export function SkidSymbol({ style }) {
  return (
    <group>
      <SkidBase style={style} args={[1.55, 0.16, 1.08]} position={[0, -0.34, 0]} />
      <RoundedBox args={[0.54, 0.5, 0.5]} radius={0.04} position={[-0.38, 0.04, 0]}>
        <SchematicMaterial color={style.fill} opacity={style.opacity} roughness={0.56} />
        <Outline color={style.edge} />
      </RoundedBox>
      <PressureSensorSymbol style={style} />
      <mesh position={[0.38, 0.02, 0]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.11, 0.11, 0.56, 20]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
      <PipePort style={style} position={[-0.86, 0.02, 0]} length={0.32} />
      <PipePort style={style} position={[0.86, 0.02, 0]} length={0.32} />
    </group>
  )
}

export function FillerSymbol({ style }) {
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
      {[-0.35, 0, 0.35].map((offset) => (
        <mesh key={offset} position={[offset, 0.02, -0.58]}>
          <cylinderGeometry args={[0.055, 0.075, 0.64, 18]} />
          <SchematicMaterial color={style.secondary} opacity={style.opacity} />
          <Outline color={style.edge} />
        </mesh>
      ))}
      <PipePort style={style} position={[-0.72, 0.28, -0.42]} length={0.36} />
    </group>
  )
}

export function CapperSymbol({ style }) {
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
      <SensorHead style={style} position={[0.45, 0.62, 0.48]} radius={0.14} />
      <PipePort style={style} position={[-0.55, 0.2, 0]} length={0.32} />
    </group>
  )
}

export function PackagingSymbol({ style }) {
  return (
    <group>
      <RoundedBox args={[1.28, 0.78, 1.12]} radius={0.055} position={[0, 0.25, 0]}>
        <SchematicMaterial color={style.fill} opacity={style.opacity} roughness={0.64} />
        <Outline color={style.edge} />
      </RoundedBox>
      {[
        [-0.34, 0.8],
        [0, 0.58],
        [0.34, 0.82],
      ].map(([offset, height]) => (
        <mesh key={offset} position={[offset, height, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.56, 16]} />
          <SchematicMaterial color={style.secondary} opacity={style.opacity} />
          <Outline color={style.edge} />
        </mesh>
      ))}
      <PipePort style={style} position={[-0.75, 0.12, 0.02]} length={0.34} />
    </group>
  )
}

export function GenericMachineSymbol({ style }) {
  return (
    <group>
      <SkidBase style={style} />
      <RoundedBox args={[1, 0.8, 1]} radius={0.06} position={[0, 0.25, 0]}>
        <SchematicMaterial color={style.fill} opacity={style.opacity} roughness={0.5} />
        <Outline color={style.edge} />
      </RoundedBox>
      <SensorHead style={style} position={[0.24, 0.86, -0.24]} radius={0.14} />
    </group>
  )
}
