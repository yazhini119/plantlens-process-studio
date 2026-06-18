import { Edges, RoundedBox } from '@react-three/drei'

export function Outline({ color = '#8b999b' }) {
  return <Edges color={color} threshold={16} />
}

export function SchematicMaterial({ color, opacity = 1, metalness = 0.04, roughness = 0.7 }) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={roughness}
      metalness={metalness}
      transparent={opacity < 1}
      opacity={opacity}
    />
  )
}

export function SkidBase({ style, args = [1.35, 0.14, 0.86], position = [0, -0.36, 0] }) {
  return (
    <RoundedBox args={args} radius={0.035} position={position}>
      <SchematicMaterial color={style.secondary} opacity={style.opacity} />
      <Outline color={style.edge} />
    </RoundedBox>
  )
}

export function SupportLegs({ style, positions, height = 0.48 }) {
  return (
    <>
      {positions.map(([x, z]) => (
        <group key={`${x}-${z}`} position={[x, -0.1, z]}>
          <mesh>
            <cylinderGeometry args={[0.035, 0.045, height, 10]} />
            <SchematicMaterial color={style.secondary} opacity={style.opacity} />
            <Outline color={style.edge} />
          </mesh>
          <mesh position={[0, -height * 0.48, 0]}>
            <cylinderGeometry args={[0.055, 0.055, 0.025, 12]} />
            <SchematicMaterial color={style.secondary} opacity={style.opacity} />
            <Outline color={style.edge} />
          </mesh>
        </group>
      ))}
    </>
  )
}

export function DetailRing({ style, position = [0, 0, 0], rotation = [0, 0, Math.PI / 2], radius = 0.3, tube = 0.012 }) {
  return (
    <mesh position={position} rotation={rotation}>
      <torusGeometry args={[radius, tube, 8, 32]} />
      <SchematicMaterial color={style.secondary} opacity={style.opacity} metalness={0.12} roughness={0.5} />
    </mesh>
  )
}

export function FlangePair({
  style,
  position = [0, 0, 0],
  rotation = [0, 0, Math.PI / 2],
  offset = 0.16,
  radius = 0.095,
  thickness = 0.028,
}) {
  return (
    <group position={position} rotation={rotation}>
      {[-offset, offset].map((entry) => (
        <mesh key={entry} position={[entry, 0, 0]}>
          <cylinderGeometry args={[radius, radius, thickness, 20]} />
          <SchematicMaterial color={style.fill} opacity={style.opacity} metalness={0.14} roughness={0.44} />
          <Outline color={style.edge} />
        </mesh>
      ))}
    </group>
  )
}

export function PipePort({ style, position, rotation = [0, 0, Math.PI / 2], length = 0.36, radius = 0.075, flanged = false }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <cylinderGeometry args={[radius, radius, length, 20]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} metalness={0.12} roughness={0.45} />
        <Outline color={style.edge} />
      </mesh>
      {flanged ? <FlangePair style={style} radius={radius + 0.024} offset={Math.max(0.08, length * 0.28)} /> : null}
    </group>
  )
}

export function MotorBody({ style, position = [-0.46, 0, 0], rotation = [0, 0, Math.PI / 2] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <cylinderGeometry args={[0.28, 0.28, 0.52, 32]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} roughness={0.42} />
        <Outline color={style.edge} />
      </mesh>
      {[-0.16, -0.08, 0, 0.08, 0.16].map((offset) => (
        <DetailRing key={offset} style={style} position={[offset, 0, 0]} rotation={[Math.PI / 2, 0, 0]} radius={0.29} tube={0.011} />
      ))}
      <mesh position={[0.32, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.12, 18]} />
        <SchematicMaterial color={style.fill} opacity={style.opacity} roughness={0.4} />
        <Outline color={style.edge} />
      </mesh>
      <RoundedBox args={[0.14, 0.12, 0.12]} radius={0.02} position={[-0.04, 0.18, 0]}>
        <SchematicMaterial color={style.fill} opacity={style.opacity} roughness={0.48} />
        <Outline color={style.edge} />
      </RoundedBox>
    </group>
  )
}

export function SensorHead({ style, position = [0, 0.52, 0], radius = 0.24 }) {
  return (
    <group position={position}>
      <mesh position={[0, -0.38, 0]}>
        <cylinderGeometry args={[0.045, 0.045, 0.5, 14]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
      <RoundedBox args={[radius * 1.1, radius * 0.42, radius * 0.92]} radius={radius * 0.18} position={[0, -0.08, 0]}>
        <SchematicMaterial color={style.secondary} opacity={style.opacity} roughness={0.4} />
        <Outline color={style.edge} />
      </RoundedBox>
      <mesh>
        <sphereGeometry args={[radius, 24, 16]} />
        <SchematicMaterial color={style.fill} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
    </group>
  )
}

export function LadderFrame({ style, position = [0, 0, 0], height = 1.18, rungCount = 6, width = 0.18 }) {
  return (
    <group position={position}>
      {[-width * 0.5, width * 0.5].map((offset) => (
        <mesh key={offset} position={[offset, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, height, 10]} />
          <SchematicMaterial color={style.secondary} opacity={style.opacity} metalness={0.1} roughness={0.45} />
        </mesh>
      ))}
      {Array.from({ length: rungCount }).map((_, index) => {
        const y = -height * 0.45 + (index / Math.max(1, rungCount - 1)) * height * 0.9
        return (
          <mesh key={index} position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.01, 0.01, width * 0.88, 10]} />
            <SchematicMaterial color={style.secondary} opacity={style.opacity} metalness={0.1} roughness={0.45} />
          </mesh>
        )
      })}
    </group>
  )
}

export function GuardRail({ style, width = 1.8, depth = 0.8, height = 0.18, position = [0, 0.22, 0] }) {
  const points = [
    [-width * 0.5, 0, -depth * 0.5],
    [width * 0.5, 0, -depth * 0.5],
    [width * 0.5, 0, depth * 0.5],
    [-width * 0.5, 0, depth * 0.5],
  ]

  return (
    <group position={position}>
      {points.map(([x, y, z]) => (
        <mesh key={`${x}-${z}`} position={[x, y, z]}>
          <cylinderGeometry args={[0.012, 0.012, height, 8]} />
          <SchematicMaterial color={style.secondary} opacity={style.opacity} metalness={0.1} roughness={0.4} />
        </mesh>
      ))}
      {[
        [0, 0, -depth * 0.5, width, 0],
        [0, 0, depth * 0.5, width, 0],
        [-width * 0.5, 0, 0, depth, Math.PI / 2],
        [width * 0.5, 0, 0, depth, Math.PI / 2],
      ].map(([x, y, z, length, rotation], index) => (
        <mesh key={index} position={[x, y + height * 0.3, z]} rotation={[0, rotation, 0]}>
          <cylinderGeometry args={[0.01, 0.01, length, 8]} />
          <SchematicMaterial color={style.secondary} opacity={style.opacity} metalness={0.1} roughness={0.4} />
        </mesh>
      ))}
    </group>
  )
}

export function SightGlass({ style, position = [0.56, 0.28, 0], height = 0.84, level = 0.5 }) {
  const boundedLevel = Math.max(0.08, Math.min(0.98, level))
  const fillHeight = height * boundedLevel

  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.06, 0.06, height, 18]} />
        <meshStandardMaterial color="#f6fbfc" transparent opacity={style.opacity * 0.48} roughness={0.18} metalness={0.02} />
        <Outline color={style.edge} />
      </mesh>
      <mesh position={[0, -height * 0.5 + fillHeight * 0.5, 0]}>
        <cylinderGeometry args={[0.042, 0.042, fillHeight, 16]} />
        <meshStandardMaterial color="#f3b11d" transparent opacity={style.opacity * 0.42} roughness={0.24} metalness={0.04} />
      </mesh>
      {[-height * 0.44, height * 0.44].map((offset) => (
        <mesh key={offset} position={[0, offset, 0]}>
          <cylinderGeometry args={[0.074, 0.074, 0.032, 18]} />
          <SchematicMaterial color={style.secondary} opacity={style.opacity} />
          <Outline color={style.edge} />
        </mesh>
      ))}
    </group>
  )
}
