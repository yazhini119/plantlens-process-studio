/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { getNodeParameterValue, getNodePosition } from '../data/defaultConfig'
import { Callouts } from './Callouts'
import { Equipment } from './Equipment'
import { FlowPath } from './FlowPath'

function Bottles() {
  return (
    <group>
      {Array.from({ length: 22 }).map((_, index) => {
        const x = -1.35 + index * 0.38
        const z = 1.34 + Math.sin(index * 0.7) * 0.07
        return (
          <mesh key={index} position={[x, 0.36, z]}>
            <cylinderGeometry args={[0.075, 0.09, 0.42, 14]} />
            <meshStandardMaterial color={index < 10 ? '#d9e8ea' : '#f0e6c8'} roughness={0.42} transparent opacity={0.62} />
          </mesh>
        )
      })}
      <mesh position={[2.8, 0.18, 1.36]}>
        <boxGeometry args={[8.5, 0.1, 0.5]} />
        <meshStandardMaterial color="#c5cfce" transparent opacity={0.72} />
      </mesh>
    </group>
  )
}

function PlantFloor({ showGrid }) {
  return (
    <group>
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[18.4, 0.06, 6.7]} />
        <meshStandardMaterial color="#f0f3f2" roughness={0.96} />
      </mesh>
      {[
        [0, 1.35, 16.2, 0.035, 0.92],
        [-3.2, -1.85, 5.2, 0.035, 1.1],
        [4.4, -1.65, 6.8, 0.035, 1.05],
      ].map(([x, z, width, height, depth]) => (
        <mesh key={`${x}-${z}`} position={[x, 0.01, z]} receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <meshStandardMaterial color="#dce3e1" roughness={0.9} transparent opacity={0.5} />
        </mesh>
      ))}
      {showGrid ? <gridHelper args={[18, 18, '#d5dddd', '#edf1f0']} position={[0, 0.02, 0]} /> : null}
    </group>
  )
}

export function PlantScene({ project, layout, selectedNode, sceneCommand, onSelect }) {
  const controlsRef = useRef(null)
  const [viewState, setViewState] = useState(() => ({
    position: layout.camera.position,
    target: layout.camera.target,
    zoom: layout.camera.zoom,
    revision: 0,
  }))

  useEffect(() => {
    setViewState({
      position: layout.camera.position,
      target: layout.camera.target,
      zoom: layout.camera.zoom,
      revision: Date.now(),
    })
  }, [layout.id, layout.camera.position, layout.camera.target, layout.camera.zoom])

  useEffect(() => {
    switch (sceneCommand.type) {
      case 'fit':
      case 'reset':
        setViewState({
          position: layout.camera.position,
          target: layout.camera.target,
          zoom: layout.camera.zoom,
          revision: Date.now(),
        })
        break
      case 'focus':
        if (selectedNode) {
          const point = getNodePosition(selectedNode, layout, project.library)
          setViewState({
            position: [point[0] + 4.8, point[1] + 5.8, point[2] + 5.6],
            target: [point[0], point[1] + 0.35, point[2]],
            zoom: Math.min(118, layout.camera.zoom + 14),
            revision: Date.now(),
          })
        }
        break
      case 'zoom-in':
        setViewState((current) => ({
          ...current,
          zoom: Math.min(128, current.zoom + 8),
          revision: Date.now(),
        }))
        break
      case 'zoom-out':
        setViewState((current) => ({
          ...current,
          zoom: Math.max(32, current.zoom - 8),
          revision: Date.now(),
        }))
        break
      default:
        break
    }
  }, [sceneCommand.nonce])

  const visibleLayers = useMemo(() => {
    if (project.views.isolatedLayerId) return new Set([project.views.isolatedLayerId])
    return new Set(layout.layers.filter((layer) => layer.visible).map((layer) => layer.id))
  }, [layout.layers, project.views.isolatedLayerId])

  const visibleNodes = layout.nodes.filter((node) => visibleLayers.has(node.layerId))
  const visibleRoutes = layout.routes.filter((route) => visibleLayers.has(route.layerId))
  const visibleAnnotations = layout.annotations.filter((annotation) => visibleLayers.has(annotation.layerId))

  return (
    <Canvas
      key={`${layout.id}-${viewState.revision}`}
      orthographic
      camera={{ position: viewState.position, zoom: viewState.zoom, near: 0.1, far: 100 }}
      shadows
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={['#f7f8f8']} />
      <ambientLight intensity={0.72} />
      <directionalLight position={[4, 8, 5]} intensity={1.35} castShadow />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableRotate
        enableZoom
        enablePan
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.72}
        zoomSpeed={0.92}
        panSpeed={0.65}
        minZoom={32}
        maxZoom={128}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
        target={viewState.target}
      />
      <Environment preset="city" />
      <PlantFloor showGrid={project.views.showGrid} />
      <FlowPath layout={layout} routes={visibleRoutes} library={project.library} />
      {layout.kind === 'packaging' ? <Bottles /> : null}
      {visibleNodes.map((node) => (
        <Equipment
          key={node.id}
          node={node}
          layout={layout}
          library={project.library}
          selected={selectedNode?.id === node.id}
          value={getNodeParameterValue(node, node.headlineMetric) ?? 'Live'}
          onSelect={onSelect}
        />
      ))}
      <Callouts layout={layout} annotations={visibleAnnotations} library={project.library} />
      <ContactShadows position={[0, 0.02, 0]} opacity={0.25} blur={2.8} scale={14} />
    </Canvas>
  )
}
