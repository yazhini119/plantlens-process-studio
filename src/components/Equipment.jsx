import { forwardRef } from 'react'
import { Html } from '@react-three/drei'
import { getNodePosition } from '../data/defaultConfig'
import { equipmentRegistry } from './symbols/equipmentRegistry'
import { resolveStyle } from './symbols/symbolStyles'

export const Equipment = forwardRef(function Equipment(
  { node, layout, library, selected, value, onSelect },
  ref,
) {
  const style = resolveStyle(node.status, selected)
  const Symbol = equipmentRegistry[getNodeRenderer(node, library)] ?? equipmentRegistry.genericMachine
  const [x, y, z] = getNodePosition(node, layout, library)
  const rotation = node.transform.rotation ?? [0, 0, 0]
  const scale = node.transform.scale ?? [1, 1, 1]

  return (
    <group
      ref={ref}
      position={[x, y, z]}
      rotation={rotation}
      scale={scale}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(node.id)
      }}
    >
      <Symbol station={node} style={style} selected={selected} />
      <mesh position={[0, -0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.72, selected ? 0.87 : 0.78, 56]} />
        <meshBasicMaterial color={style.ring} transparent opacity={selected ? 0.74 : node.status === 'inactive' ? 0.08 : 0.2} />
      </mesh>
      <Html position={[0, 1.35, 0]} center zIndexRange={[2, 0]}>
        <button className={`station-label ${selected ? 'active' : ''}`} onClick={() => onSelect(node.id)}>
          <span style={{ color: style.label }}>{node.tag}</span>
          <strong>{selected ? value : node.label}</strong>
        </button>
      </Html>
    </group>
  )
})

function getNodeRenderer(node, library) {
  return library[node.stencilId]?.renderer ?? node.stencilId
}
