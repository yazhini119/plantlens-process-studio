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
  'dc-power': { color: '#d9422f', radius: 0.048, opacity: 0.96, lineWidth: 3.2 },
  'ac-power': { color: '#1d5eb6', radius: 0.048, opacity: 0.96, lineWidth: 3.2 },
  rs485: { color: '#009db5', radius: 0.018, opacity: 0.88, lineWidth: 2.1 },
  signal: { color: '#0f7a55', radius: 0.02, opacity: 0.82, lineWidth: 2 },
  power: { color: '#172027', radius: 0.044, opacity: 0.9, lineWidth: 3 },
}

const Y_AXIS = new THREE.Vector3(0, 1, 0)

function resolveRoutePalette(route) {
  if (route.state === 'inactive') return routePalette.inactive
  return {
    ...(routePalette[route.state] ?? routePalette.active),
    ...(mediumPalette[route.medium] ?? {}),
  }
}

function CableSegment({ start, end, color, radius, opacity }) {
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

  return (
    <group position={segment.midpoint} quaternion={segment.quaternion}>
      <mesh>
        <cylinderGeometry args={[radius, radius, segment.length, 8]} />
        <meshStandardMaterial color={color} roughness={0.34} metalness={0.06} transparent opacity={opacity} />
      </mesh>
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
    <Line
      points={points}
      color={palette.color}
      lineWidth={palette.lineWidth ?? 2}
      transparent
      opacity={palette.opacity}
      dashed={dashed}
      dashSize={0.18}
      gapSize={0.12}
      dashScale={1}
    />
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
