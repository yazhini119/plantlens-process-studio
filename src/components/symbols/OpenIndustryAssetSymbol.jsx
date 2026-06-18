import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { openIndustryAssetMap } from '../../data/openIndustryLibrary'
import { Outline, SchematicMaterial, SkidBase } from './SymbolPrimitives'

function prepareModel(scene, opacity) {
  const clone = scene.clone(true)
  clone.traverse((child) => {
    if (!child.isMesh) return
    child.castShadow = true
    child.receiveShadow = true
    if (child.material) {
      child.material = child.material.clone()
      child.material.transparent = opacity < 0.98 || child.material.transparent
      child.material.opacity = Math.min(child.material.opacity ?? 1, Math.max(0.34, opacity))
      child.material.roughness = Math.min(0.88, child.material.roughness ?? 0.58)
    }
  })
  return clone
}

export function OpenIndustryAssetSymbol({ station, style }) {
  const asset = openIndustryAssetMap[station.stencilId]
  const { scene } = useGLTF(asset?.modelUrl ?? '/open-industry/models/conveyor-roller-end.glb')
  const model = useMemo(() => prepareModel(scene, style.opacity), [scene, style.opacity])

  if (!asset) {
    return (
      <group>
        <SkidBase style={style} args={[1.1, 0.18, 0.82]} position={[0, -0.32, 0]} />
        <mesh position={[0, 0.12, 0]}>
          <boxGeometry args={[0.86, 0.68, 0.64]} />
          <SchematicMaterial color={style.fill} opacity={style.opacity} />
          <Outline color={style.edge} />
        </mesh>
      </group>
    )
  }

  return (
    <group>
      <primitive
        object={model}
        scale={asset.scale}
        rotation={asset.rotation}
        position={asset.position}
      />
      <SkidBase style={style} args={[1.22, 0.08, 0.82]} position={[0, -0.43, 0]} />
    </group>
  )
}

Object.values(openIndustryAssetMap).forEach((asset) => {
  useGLTF.preload(asset.modelUrl)
})
