/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps, react-hooks/immutability */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { ContactShadows, Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { getNodeParameterValue, getNodePosition } from '../data/defaultConfig'
import { buildClusterGroups } from '../data/presentationModel'
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

function PlantFloor({ showGrid, empty = false, variant = 'process' }) {
  const isPowerPanel = variant === 'power-panel'
  const floorArgs = isPowerPanel ? [21.2, 0.05, 10.8] : empty ? [15.2, 0.035, 5.4] : [18.4, 0.06, 6.7]
  const gridSize = isPowerPanel ? 20 : empty ? 14 : 18

  return (
    <group>
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={floorArgs} />
        <meshStandardMaterial color={isPowerPanel ? '#f1f5f3' : empty ? '#f8faf9' : '#f4f6f5'} roughness={0.96} transparent={empty} opacity={empty ? 0.78 : 1} />
      </mesh>
      {isPowerPanel ? (
        <>
          <mesh position={[-1.2, 0, -1.0]} receiveShadow>
            <boxGeometry args={[16.6, 0.035, 5.8]} />
            <meshStandardMaterial color="#dce5e3" roughness={0.9} transparent opacity={0.34} />
          </mesh>
          <mesh position={[1.4, 0.025, -3.34]} receiveShadow>
            <boxGeometry args={[14.2, 0.04, 0.22]} />
            <meshStandardMaterial color="#c8d2d2" roughness={0.74} metalness={0.14} transparent opacity={0.52} />
          </mesh>
          {[
            [-8.34, -2.1, 0.22, 3.55],
            [-4.44, -2.1, 0.22, 3.55],
            [-2.1, 1.84, 8.9, 0.22],
            [1.5, -0.66, 7.8, 0.18],
            [6.85, -1.62, 0.18, 1.78],
          ].map(([x, z, width, depth]) => (
            <mesh key={`${x}-${z}`} position={[x, 0.045, z]} receiveShadow>
              <boxGeometry args={[width, 0.055, depth]} />
              <meshStandardMaterial color="#c5cecd" roughness={0.66} metalness={0.16} transparent opacity={0.62} />
            </mesh>
          ))}
        </>
      ) : null}
      {!empty && !isPowerPanel
        ? [
            [0, 1.35, 16.2, 0.035, 0.92],
            [-3.2, -1.85, 5.2, 0.035, 1.1],
            [4.4, -1.65, 6.8, 0.035, 1.05],
          ].map(([x, z, width, height, depth]) => (
            <mesh key={`${x}-${z}`} position={[x, 0.01, z]} receiveShadow>
              <boxGeometry args={[width, height, depth]} />
              <meshStandardMaterial color="#dce3e1" roughness={0.9} transparent opacity={0.42} />
            </mesh>
          ))
        : null}
      {showGrid ? <gridHelper args={[gridSize, gridSize, '#d6dcdb', '#ebefee']} position={[0, 0.02, 0]} /> : null}
    </group>
  )
}

function DirectionArrow({ position, rotation = [0, 0, -Math.PI / 2], color = '#d98918' }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <cylinderGeometry args={[0.026, 0.026, 0.32, 10]} />
        <meshStandardMaterial color={color} roughness={0.42} metalness={0.08} />
      </mesh>
      <mesh position={[0, 0.2, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.075, 0.16, 14]} />
        <meshStandardMaterial color={color} roughness={0.38} metalness={0.08} />
      </mesh>
    </group>
  )
}

function PipeSupport({ position, height = 0.34 }) {
  return (
    <group position={position}>
      <mesh position={[0, height * 0.5, 0]}>
        <cylinderGeometry args={[0.026, 0.032, height, 10]} />
        <meshStandardMaterial color="#b9c3c3" roughness={0.72} metalness={0.16} transparent opacity={0.62} />
      </mesh>
      <mesh position={[0, height + 0.035, 0]}>
        <boxGeometry args={[0.32, 0.04, 0.08]} />
        <meshStandardMaterial color="#cbd4d4" roughness={0.7} metalness={0.12} transparent opacity={0.62} />
      </mesh>
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[0.18, 0.02, 0.14]} />
        <meshStandardMaterial color="#b3bdbe" roughness={0.74} metalness={0.14} transparent opacity={0.58} />
      </mesh>
    </group>
  )
}

function CableTray() {
  return (
    <group position={[0.6, 0.18, -2.06]}>
      <mesh>
        <boxGeometry args={[9.2, 0.06, 0.18]} />
        <meshStandardMaterial color="#c8d1d2" roughness={0.68} metalness={0.18} transparent opacity={0.46} />
      </mesh>
      {Array.from({ length: 12 }).map((_, index) => (
        <mesh key={index} position={[-4.3 + index * 0.78, 0.055, 0]}>
          <boxGeometry args={[0.035, 0.05, 0.22]} />
          <meshStandardMaterial color="#aab6b8" roughness={0.66} metalness={0.2} transparent opacity={0.48} />
        </mesh>
      ))}
    </group>
  )
}

function EmergencyStopZone() {
  return (
    <group position={[-5.25, 0.03, -1.05]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.08, 1.18, 64]} />
        <meshBasicMaterial color="#d62d2d" transparent opacity={0.16} />
      </mesh>
      <mesh position={[-0.72, 0.18, -0.56]}>
        <boxGeometry args={[0.18, 0.24, 0.08]} />
        <meshStandardMaterial color="#f5d845" roughness={0.38} metalness={0.02} />
      </mesh>
      <mesh position={[-0.72, 0.2, -0.51]}>
        <sphereGeometry args={[0.055, 16, 12]} />
        <meshStandardMaterial color="#d62d2d" roughness={0.3} metalness={0.02} />
      </mesh>
    </group>
  )
}

function IndustrialDetails() {
  return (
    <group>
      <CableTray />
      <EmergencyStopZone />
      {[
        [-4.25, 0, -0.96],
        [-3.35, 0, -0.66],
        [-1.82, 0, -0.31],
        [0.72, 0, -0.28],
        [3.34, 0, 0.18],
        [5.65, 0, 0.92],
      ].map(([x, y, z]) => (
        <PipeSupport key={`${x}-${z}`} position={[x, y, z]} />
      ))}
      <DirectionArrow position={[-3.9, 0.44, -0.82]} />
      <DirectionArrow position={[-0.8, 0.56, -0.3]} />
      <DirectionArrow position={[3.08, 0.76, 0.12]} />
      <DirectionArrow position={[5.7, 0.68, 0.92]} />
    </group>
  )
}

function SafetyZones({ nodes }) {
  return (
    <>
      {nodes.map((node) => {
        const radius = node.status === 'origin' ? 1.55 : 1.1
        const opacity = node.status === 'origin' ? 0.18 : 0.11
        const color = node.status === 'origin' ? '#d62d2d' : '#ef8a30'
        return (
          <mesh key={node.id} position={[...node.transform.position]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[radius * 0.62, radius, 48]} />
            <meshBasicMaterial color={color} transparent opacity={opacity} />
          </mesh>
        )
      })}
    </>
  )
}

function ClusterMarkers({ clusters, onFocusNode }) {
  return (
    <>
      {clusters.map((cluster) => (
        <Html key={cluster.id} position={[cluster.position[0], 1.65, cluster.position[2]]} center zIndexRange={[3, 1]}>
          <button className={`cluster-marker ${cluster.severity}`} onClick={() => onFocusNode(cluster.nodeIds[0])}>
            <span>{cluster.label}</span>
            <strong>{cluster.count} assets</strong>
          </button>
        </Html>
      ))}
    </>
  )
}

const LENS_ZOOM_LIMITS = {
  macro: [30, 56],
  meso: [46, 84],
  micro: [72, 118],
}

function clampZoomForLens(lensMode, zoom) {
  const [min, max] = LENS_ZOOM_LIMITS[lensMode] ?? LENS_ZOOM_LIMITS.meso
  return Math.max(min, Math.min(max, zoom))
}

function resolveLensCamera(lensMode, layout, selectedNode, project) {
  if (lensMode === 'micro' && selectedNode) {
    const point = getNodePosition(selectedNode, layout, project.library)
    return {
      position: [point[0] + 3.4, point[1] + 4.3, point[2] + 3.9],
      target: [point[0], point[1] + 0.42, point[2]],
      zoom: clampZoomForLens('micro', layout.camera.zoom + 38),
    }
  }

  if (lensMode === 'macro') {
    return {
      position: [10.6, 9.8, 11.8],
      target: layout.camera.target,
      zoom: clampZoomForLens('macro', layout.camera.zoom - 12),
    }
  }

  return {
    position: [8.2, 7.8, 9.0],
    target: layout.camera.target,
    zoom: clampZoomForLens('meso', layout.camera.zoom + 4),
  }
}

function CameraRig({ controlsRef, viewState, onViewportChange }) {
  const { camera, invalidate } = useThree()

  useEffect(() => {
    camera.position.set(...viewState.position)
    camera.zoom = viewState.zoom
    camera.updateProjectionMatrix()

    if (controlsRef.current) {
      controlsRef.current.target.set(...viewState.target)
      controlsRef.current.update()
    }

    onViewportChange?.({ zoom: viewState.zoom, target: viewState.target })
    invalidate()
  }, [camera, controlsRef, invalidate, onViewportChange, viewState.position, viewState.revision, viewState.target, viewState.zoom])

  return null
}

export function PlantScene({
  project,
  layout,
  selectedNode,
  sceneCommand,
  onSelect,
  onFocusNode,
  mapLayers,
  onViewportChange,
  editLayoutMode = false,
  lensMode = 'meso',
}) {
  const controlsRef = useRef(null)
  const viewportTickRef = useRef(0)
  const [viewState, setViewState] = useState(() => ({
    ...resolveLensCamera(lensMode, layout, selectedNode, project),
    revision: 0,
  }))
  const initialLensCamera = resolveLensCamera(lensMode, layout, selectedNode, project)
  const [currentZoom, setCurrentZoom] = useState(initialLensCamera.zoom)
  const [currentTarget, setCurrentTarget] = useState(initialLensCamera.target)

  useEffect(() => {
    const lensCamera = resolveLensCamera(lensMode, layout, selectedNode, project)
    setViewState({
      position: lensCamera.position,
      target: lensCamera.target,
      zoom: lensCamera.zoom,
      revision: Date.now(),
    })
    setCurrentZoom(lensCamera.zoom)
    setCurrentTarget(lensCamera.target)
    onViewportChange?.({ zoom: lensCamera.zoom, target: lensCamera.target })
  }, [layout.id, layout.camera.position, layout.camera.target, layout.camera.zoom, lensMode])

  useEffect(() => {
    const lensCamera = resolveLensCamera(lensMode, layout, selectedNode, project)
    switch (sceneCommand.type) {
      case 'fit':
      case 'reset':
        setViewState({
          position: lensCamera.position,
          target: lensCamera.target,
          zoom: lensCamera.zoom,
          revision: Date.now(),
        })
        setCurrentZoom(lensCamera.zoom)
        setCurrentTarget(lensCamera.target)
        onViewportChange?.({ zoom: lensCamera.zoom, target: lensCamera.target })
        break
      case 'focus':
        if (selectedNode) {
          const point = getNodePosition(selectedNode, layout, project.library)
          const nextZoom = clampZoomForLens(lensMode, lensMode === 'micro' ? layout.camera.zoom + 34 : layout.camera.zoom + 18)
          const nextTarget = [point[0], point[1] + 0.35, point[2]]
          setViewState({
            position: [point[0] + 4.3, point[1] + 5.0, point[2] + 4.9],
            target: nextTarget,
            zoom: nextZoom,
            revision: Date.now(),
          })
          setCurrentZoom(nextZoom)
          setCurrentTarget(nextTarget)
          onViewportChange?.({ zoom: nextZoom, target: nextTarget })
        }
        break
      case 'zoom-in': {
        const nextZoom = clampZoomForLens(lensMode, currentZoom + 8)
        setViewState((current) => ({ ...current, zoom: nextZoom, revision: Date.now() }))
        setCurrentZoom(nextZoom)
        onViewportChange?.({ zoom: nextZoom, target: currentTarget })
        break
      }
      case 'zoom-out': {
        const nextZoom = clampZoomForLens(lensMode, currentZoom - 8)
        setViewState((current) => ({ ...current, zoom: nextZoom, revision: Date.now() }))
        setCurrentZoom(nextZoom)
        onViewportChange?.({ zoom: nextZoom, target: currentTarget })
        break
      }
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
  const clusters = useMemo(() => buildClusterGroups(layout), [layout])
  const isEmptyLayout = layout.nodes.length === 0 && layout.routes.length === 0
  const showDemoContext = layout.kind === 'packaging' && !isEmptyLayout
  const showClusters = !editLayoutMode && visibleNodes.length > 3 && (lensMode === 'macro' || currentZoom < 50)
  const routeFocusedNodeIds = useMemo(
    () =>
      new Set(
        visibleRoutes
          .filter((route) => ['active', 'alarm', 'downstream'].includes(route.state))
          .flatMap((route) => [route.from.nodeId, route.to.nodeId]),
      ),
    [visibleRoutes],
  )

  const handleControlsChange = () => {
    if (!controlsRef.current) return
    const now = typeof performance === 'undefined' ? Date.now() : performance.now()
    if (now - viewportTickRef.current < 80) return
    viewportTickRef.current = now
    const nextZoom = controlsRef.current.object.zoom
    const nextTarget = controlsRef.current.target.toArray()
    setCurrentZoom(nextZoom)
    setCurrentTarget(nextTarget)
    onViewportChange?.({ zoom: nextZoom, target: nextTarget })
  }

  return (
    <Canvas
      orthographic
      camera={{ position: viewState.position, zoom: viewState.zoom, near: 0.1, far: 100 }}
      dpr={[1, 1.5]}
      frameloop="demand"
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      shadows
      onPointerMissed={() => onSelect(null)}
    >
      <color attach="background" args={['#f7f8f8']} />
      <ambientLight intensity={0.78} />
      <hemisphereLight args={['#f7fbff', '#d7dedc', 0.76]} />
      <directionalLight position={[4, 8, 5]} intensity={1.35} castShadow />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableRotate
        enableZoom
        enablePan
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.56}
        zoomSpeed={0.9}
        panSpeed={0.72}
        minZoom={LENS_ZOOM_LIMITS[lensMode]?.[0] ?? 30}
        maxZoom={LENS_ZOOM_LIMITS[lensMode]?.[1] ?? 118}
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
        onChange={handleControlsChange}
      />
      <CameraRig controlsRef={controlsRef} viewState={viewState} onViewportChange={onViewportChange} />
      <PlantFloor showGrid={project.views.showGrid} empty={isEmptyLayout} variant={layout.kind} />
      {showDemoContext ? <IndustrialDetails /> : null}
      {mapLayers.processFlow && !isEmptyLayout ? <FlowPath layout={layout} routes={visibleRoutes} library={project.library} /> : null}
      {showDemoContext ? <Bottles /> : null}
      {mapLayers.safety ? <SafetyZones nodes={visibleNodes.filter((node) => ['origin', 'impacted'].includes(node.status))} /> : null}
      <Suspense fallback={null}>
        {visibleNodes.map((node) => (
          <Equipment
            key={node.id}
            node={node}
            layout={layout}
            library={project.library}
            selected={selectedNode?.id === node.id}
            value={getNodeParameterValue(node, node.headlineMetric) ?? 'Live'}
            onSelect={onSelect}
            mapLayers={mapLayers}
            lensMode={lensMode}
            showLabels={
              lensMode === 'micro'
                ? selectedNode?.id === node.id
                : lensMode === 'meso'
                  ? routeFocusedNodeIds.has(node.id) && !showClusters
                  : !showClusters
            }
          />
        ))}
      </Suspense>
      {lensMode !== 'macro' && !showClusters ? <Callouts layout={layout} annotations={visibleAnnotations} library={project.library} /> : null}
      {showClusters ? <ClusterMarkers clusters={clusters} onFocusNode={onFocusNode ?? onSelect} /> : null}
      <ContactShadows position={[0, 0.02, 0]} opacity={0.25} blur={2.8} scale={14} />
    </Canvas>
  )
}
