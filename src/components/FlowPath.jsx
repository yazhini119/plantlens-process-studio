import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { resolveRoutePoints } from '../data/defaultConfig'

const routePalette = {
  inactive: { color: '#cfd7d5', radius: 0.026, opacity: 0.35 },
  active: { color: '#f0ac1b', radius: 0.046, opacity: 0.94 },
  downstream: { color: '#efb23a', radius: 0.036, opacity: 0.86 },
  alarm: { color: '#d94a35', radius: 0.05, opacity: 0.94 },
}

const mediumPalette = {
  'dc-power': {
    color: '#c7352d',
    radius: 0.04,
    opacity: 0.94,
    lineWidth: 2.8,
    trayColor: '#aeb9b8',
    clampColor: '#dfe6e4',
    bundle: ['#c7352d', '#2f3437'],
  },
  'ac-power': {
    color: '#0f4f9f',
    radius: 0.038,
    opacity: 0.9,
    lineWidth: 2.6,
    trayColor: '#aeb9b8',
    clampColor: '#dfe6e4',
    bundle: ['#0f4f9f', '#172027', '#6f7a82'],
  },
  rs485: { color: '#007f96', radius: 0.012, opacity: 0.72, lineWidth: 1.65, markerColor: '#d5eef2' },
  signal: { color: '#0f7a55', radius: 0.014, opacity: 0.68, lineWidth: 1.55, markerColor: '#d8f0e7' },
  power: { color: '#172027', radius: 0.036, opacity: 0.86, lineWidth: 2.4, trayColor: '#b9c2c0' },
}

const Y_AXIS = new THREE.Vector3(0, 1, 0)

function resolveRoutePalette(route) {
  if (route.state === 'inactive') return routePalette.inactive
  return {
    ...(routePalette[route.state] ?? routePalette.active),
    ...(mediumPalette[route.medium] ?? {}),
  }
}

function CableClamp({ offset, radius, clampColor }) {
  return (
    <group position={[0, offset, 0]}>
      <mesh position={[0, 0, -radius * 2.2]}>
        <boxGeometry args={[radius * 7.4, radius * 0.74, radius * 1.35]} />
        <meshStandardMaterial color={clampColor ?? '#e1e8e6'} roughness={0.48} metalness={0.18} />
      </mesh>
      <mesh position={[-radius * 2.35, 0, -radius * 2.88]}>
        <boxGeometry args={[radius * 0.42, radius * 1.2, radius * 1.3]} />
        <meshStandardMaterial color="#a8b3b2" roughness={0.52} metalness={0.22} />
      </mesh>
      <mesh position={[radius * 2.35, 0, -radius * 2.88]}>
        <boxGeometry args={[radius * 0.42, radius * 1.2, radius * 1.3]} />
        <meshStandardMaterial color="#a8b3b2" roughness={0.52} metalness={0.22} />
      </mesh>
    </group>
  )
}

function CableConductors({ bundle, color, radius, opacity, length }) {
  const colors = bundle?.length ? bundle : [color]
  const conductorRadius = colors.length > 1 ? radius * 0.58 : radius
  const spacing = colors.length > 1 ? radius * 1.42 : 0
  const center = (colors.length - 1) * spacing * 0.5

  return colors.map((entryColor, index) => (
    <mesh key={`${entryColor}-${index}`} position={[index * spacing - center, 0, 0]}>
      <cylinderGeometry args={[conductorRadius, conductorRadius, length, 12]} />
      <meshStandardMaterial color={entryColor} roughness={0.24} metalness={0.08} transparent opacity={opacity} />
    </mesh>
  ))
}

function CableSegment({ start, end, color, radius, opacity, trayColor, clampColor, bundle }) {
  const segment = useMemo(() => {
    const from = new THREE.Vector3(...start)
    const to = new THREE.Vector3(...end)
    const midpoint = from.clone().lerp(to, 0.5)
    const direction = to.clone().sub(from)
    const length = direction.length()
    const quaternion = new THREE.Quaternion()
    if (length > 0.001) {
      quaternion.setFromUnitVectors(Y_AXIS, direction.normalize())
    }
    return { midpoint, length, quaternion }
  }, [end, start])

  if (segment.length < 0.001) return null
  const clampCount = Math.max(0, Math.min(5, Math.floor(segment.length / 1.15) - 1))
  const clampOffsets = Array.from({ length: clampCount }, (_, index) => (
    -segment.length / 2 + ((index + 1) * segment.length) / (clampCount + 1)
  ))

  return (
    <group position={segment.midpoint} quaternion={segment.quaternion}>
      {trayColor && segment.length > 0.52 ? (
        <>
          <mesh position={[0, 0, -radius * 2.45]}>
            <boxGeometry args={[radius * 7.6, segment.length, radius * 1.32]} />
            <meshStandardMaterial color={trayColor} roughness={0.66} metalness={0.18} transparent opacity={0.42} />
          </mesh>
          <mesh position={[0, 0, -radius * 1.45]}>
            <boxGeometry args={[radius * 6.8, segment.length, radius * 0.34]} />
            <meshStandardMaterial color="#eef3f1" roughness={0.52} metalness={0.14} transparent opacity={0.42} />
          </mesh>
        </>
      ) : null}
      <CableConductors bundle={bundle} color={color} radius={radius} opacity={opacity} length={segment.length} />
      {clampOffsets.map((offset) => (
        <CableClamp key={offset} offset={offset} radius={radius} clampColor={clampColor} />
      ))}
      {segment.length > 0.8 ? (
        <>
          <mesh position={[0, -segment.length * 0.38, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius * 1.22, radius * 0.18, 6, 14]} />
            <meshStandardMaterial color="#e6ecea" roughness={0.42} metalness={0.12} />
          </mesh>
          <mesh position={[0, segment.length * 0.38, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[radius * 1.22, radius * 0.18, 6, 14]} />
            <meshStandardMaterial color="#e6ecea" roughness={0.42} metalness={0.12} />
          </mesh>
        </>
      ) : null}
    </group>
  )
}

function CableRoute({ points, palette }) {
  return (
    <group>
      {points.slice(0, -1).map((point, index) => (
        <CableSegment
          key={`${point.join('-')}-${index}`}
          start={point}
          end={points[index + 1]}
          color={palette.color}
          radius={palette.radius}
          opacity={palette.opacity}
          trayColor={palette.trayColor}
          clampColor={palette.clampColor}
          bundle={palette.bundle}
        />
      ))}
      {points.slice(1, -1).map((point, index) => (
        <mesh key={`${point.join('-')}-elbow-${index}`} position={point}>
          <sphereGeometry args={[palette.radius * 1.35, 10, 8]} />
          <meshStandardMaterial color={palette.color} roughness={0.3} metalness={0.08} transparent opacity={palette.opacity} />
        </mesh>
      ))}
    </group>
  )
}

function InstrumentRoute({ points, palette, dashed = true }) {
  return (
    <group>
      <Line
        points={points}
        color={palette.color}
        lineWidth={palette.lineWidth ?? 2}
        transparent
        opacity={palette.opacity}
        dashed={dashed}
        dashSize={0.2}
        gapSize={0.14}
        dashScale={1}
      />
      {points.map((point, index) => (
        <mesh key={`${point.join('-')}-instrument-marker-${index}`} position={point}>
          <sphereGeometry args={[index === 0 || index === points.length - 1 ? 0.035 : 0.025, 12, 8]} />
          <meshStandardMaterial color={palette.markerColor ?? '#dce7e7'} roughness={0.34} metalness={0.08} transparent opacity={0.88} />
        </mesh>
      ))}
    </group>
  )
}

export function FlowPath({ layout, library, routes }) {
  return (
    <>
      {routes.map((route) => {
        const points = resolveRoutePoints(route, layout, library)
        if (points.length < 2) return null
        const palette = resolveRoutePalette(route)
        const isInstrumentRoute = route.style?.dashed || route.medium === 'rs485' || route.medium === 'signal'

        return (
          <group key={route.id}>
            {isInstrumentRoute ? (
              <InstrumentRoute points={points} palette={palette} dashed />
            ) : (
              <CableRoute points={points} palette={palette} />
            )}
          </group>
        )
      })}
    </>
  )
}
