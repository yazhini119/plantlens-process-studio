import { useMemo } from 'react'
import * as THREE from 'three'
import { resolveRoutePoints } from '../data/defaultConfig'

const routePalette = {
  inactive: { color: '#cfd7d5', radius: 0.034, opacity: 0.48 },
  active: { color: '#ffb21e', radius: 0.058, opacity: 1 },
  downstream: { color: '#f4b51f', radius: 0.046, opacity: 1 },
  alarm: { color: '#ef7f37', radius: 0.062, opacity: 1 },
}

function Tube({ points, color, radius = 0.052, opacity = 1 }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point))), [points])
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 96, radius, 12, false), [curve, radius])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} roughness={0.26} metalness={0.12} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  )
}

function DashedFlow({ points, color, radius }) {
  const segments = []
  for (let i = 0; i < points.length - 1; i += 1) {
    const start = new THREE.Vector3(...points[i])
    const end = new THREE.Vector3(...points[i + 1])
    const distance = start.distanceTo(end)
    const dashCount = Math.max(4, Math.floor(distance / 0.22))

    for (let dash = 0; dash < dashCount; dash += 2) {
      const a = dash / dashCount
      const b = Math.min((dash + 1) / dashCount, 1)
      segments.push([start.clone().lerp(end, a).toArray(), start.clone().lerp(end, b).toArray()])
    }
  }

  return (
    <>
      {segments.map(([a, b], index) => (
        <Tube key={`${a.join('-')}-${index}`} points={[a, b]} color={color} radius={radius} />
      ))}
    </>
  )
}

export function FlowPath({ layout, library, routes }) {
  return (
    <>
      {routes.map((route) => {
        const points = resolveRoutePoints(route, layout, library)
        if (points.length < 2) return null
        const palette = routePalette[route.state] ?? routePalette.inactive

        if (route.style?.dashed || route.state === 'downstream') {
          return <DashedFlow key={route.id} points={points} color={palette.color} radius={palette.radius} />
        }

        return <Tube key={route.id} points={points} color={palette.color} radius={palette.radius} opacity={palette.opacity} />
      })}
    </>
  )
}
