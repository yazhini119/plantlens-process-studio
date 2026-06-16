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
        <mesh key={`${x}-${z}`} position={[x, -0.1, z]}>
          <cylinderGeometry args={[0.035, 0.045, height, 10]} />
          <SchematicMaterial color={style.secondary} opacity={style.opacity} />
          <Outline color={style.edge} />
        </mesh>
      ))}
    </>
  )
}

export function PipePort({ style, position, rotation = [0, 0, Math.PI / 2], length = 0.36, radius = 0.075 }) {
  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[radius, radius, length, 20]} />
      <SchematicMaterial color={style.secondary} opacity={style.opacity} metalness={0.12} roughness={0.45} />
      <Outline color={style.edge} />
    </mesh>
  )
}

export function MotorBody({ style, position = [-0.46, 0, 0], rotation = [0, 0, Math.PI / 2] }) {
  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[0.28, 0.28, 0.48, 32]} />
      <SchematicMaterial color={style.secondary} opacity={style.opacity} roughness={0.42} />
      <Outline color={style.edge} />
    </mesh>
  )
}

export function SensorHead({ style, position = [0, 0.52, 0], radius = 0.24 }) {
  return (
    <>
      <mesh position={[position[0], position[1] - 0.28, position[2]]}>
        <cylinderGeometry args={[0.045, 0.045, 0.42, 14]} />
        <SchematicMaterial color={style.secondary} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
      <mesh position={position}>
        <sphereGeometry args={[radius, 24, 16]} />
        <SchematicMaterial color={style.fill} opacity={style.opacity} />
        <Outline color={style.edge} />
      </mesh>
    </>
  )
}
