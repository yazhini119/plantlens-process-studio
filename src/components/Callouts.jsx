import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { resolveAnchorWorldPosition } from '../data/defaultConfig'

function DashedLeader({ start, end, color = '#aeb8ba' }) {
  const points = []
  const segmentCount = 14
  for (let i = 0; i < segmentCount; i += 2) {
    const a = i / segmentCount
    const b = (i + 1) / segmentCount
    const from = new THREE.Vector3(...start).lerp(new THREE.Vector3(...end), a)
    const to = new THREE.Vector3(...start).lerp(new THREE.Vector3(...end), b)
    points.push(from, to)
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points)

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={0.74} />
    </lineSegments>
  )
}

function Callout({ annotation, layout, library }) {
  const node = layout.nodes.find((entry) => entry.id === annotation.nodeId)
  if (!node) return null

  const anchor = resolveAnchorWorldPosition(node, annotation.anchorId, layout, library)
  const labelPosition = [
    anchor[0] + annotation.offset[0],
    anchor[1] + annotation.offset[1],
    anchor[2] + annotation.offset[2],
  ]
  const end = [anchor[0], anchor[1] - 0.55, anchor[2]]
  const origin = annotation.tone === 'origin'
  const color = origin ? '#ef2f2f' : '#aeb8ba'

  return (
    <group>
      <DashedLeader start={[labelPosition[0], labelPosition[1] - 0.15, labelPosition[2]]} end={end} color={color} />
      <Html position={labelPosition} center zIndexRange={[3, 0]}>
        <div className={`plant-callout ${origin ? 'origin' : ''}`}>
          <strong>{annotation.label}</strong>
          {annotation.note && <span>{annotation.note}</span>}
        </div>
      </Html>
    </group>
  )
}

export function Callouts({ layout, annotations, library }) {
  return (
    <>
      {annotations.map((annotation) => (
        <Callout key={annotation.id} annotation={annotation} layout={layout} library={library} />
      ))}
    </>
  )
}
