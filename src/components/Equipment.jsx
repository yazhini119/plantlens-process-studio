import { forwardRef, useMemo, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { estimateEnergyKw } from '../data/presentationModel'
import { getNodeParameterValue, getNodePosition } from '../data/defaultConfig'
import { equipmentRegistry } from './symbols/equipmentRegistry'
import { resolveStyle } from './symbols/symbolStyles'

function PulseHalo({ color, active }) {
  const haloRef = useRef(null)

  useFrame(({ clock }) => {
    if (!haloRef.current || !active) return
    const pulse = 1 + Math.sin(clock.elapsedTime * 2.8) * 0.08
    haloRef.current.scale.setScalar(pulse)
    haloRef.current.material.opacity = 0.24 + (Math.sin(clock.elapsedTime * 2.8) + 1) * 0.14
  })

  if (!active) return null

  return (
    <mesh ref={haloRef} position={[0, -0.44, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.82, 0.95, 56]} />
      <meshBasicMaterial color={color} transparent opacity={0.26} />
    </mesh>
  )
}

function OverlayBadge({ position, tone, label }) {
  return (
    <Html position={position} center zIndexRange={[2, 0]}>
      <div className={`scene-badge ${tone}`}>{label}</div>
    </Html>
  )
}

export const Equipment = forwardRef(function Equipment(
  { node, layout, library, selected, value, onSelect, mapLayers, showLabels = true },
  ref,
) {
  const [hovered, setHovered] = useState(false)
  const style = resolveStyle(node.status, selected)
  const Symbol = equipmentRegistry[getNodeRenderer(node, library)] ?? equipmentRegistry.genericMachine
  const [x, y, z] = getNodePosition(node, layout, library)
  const rotation = node.transform.rotation ?? [0, 0, 0]
  const scale = node.transform.scale ?? [1, 1, 1]

  const sensorLabel = useMemo(() => {
    if (!mapLayers.sensors) return ''
    if (node.stencilId === 'flowSensor') return getNodeParameterValue(node, 'Flow Rate')
    if (node.stencilId === 'pressureSensor') return getNodeParameterValue(node, 'Pressure')
    if (node.stencilId === 'temperatureSensor') return getNodeParameterValue(node, 'Temperature')
    return ''
  }, [mapLayers.sensors, node])

  const maintenanceLabel = useMemo(() => {
    if (!mapLayers.maintenance) return ''
    const vibration = getNodeParameterValue(node, 'Vibration')
    if (vibration) return `Vib ${vibration}`
    const hours = getNodeParameterValue(node, 'Running Hours')
    if (hours) return `${hours}`
    return ''
  }, [mapLayers.maintenance, node])

  const energyLabel = useMemo(() => {
    if (!mapLayers.energy) return ''
    const kw = estimateEnergyKw(node)
    return kw ? `${kw} kW` : ''
  }, [mapLayers.energy, node])

  const pulseActive = mapLayers.alarms && ['origin', 'warning', 'impacted'].includes(node.status)
  const keyLabel = ['origin', 'warning', 'impacted', 'downstream', 'alarm'].includes(node.status)
  const displayLabel = showLabels && (selected || hovered || keyLabel)
  const displayDetails = showLabels && (selected || hovered)

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
      onPointerOver={(event) => {
        event.stopPropagation()
        setHovered(true)
      }}
      onPointerOut={() => setHovered(false)}
    >
      <Symbol station={node} style={style} selected={selected} />
      <mesh position={[0, -0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.72, selected ? 0.87 : 0.78, 56]} />
        <meshBasicMaterial color={style.ring} transparent opacity={selected ? 0.78 : node.status === 'inactive' ? 0.08 : 0.22} />
      </mesh>
      <PulseHalo color={style.ring} active={pulseActive} />

      {displayLabel ? (
        <Html position={[0, 1.35, 0]} center zIndexRange={[2, 0]}>
          <button className={`station-label ${selected ? 'active' : ''} ${node.status}`} onClick={() => onSelect(node.id)}>
            <span style={{ color: style.label }}>{node.tag}</span>
            <strong>{selected ? value : node.label}</strong>
          </button>
        </Html>
      ) : null}

      {displayDetails && sensorLabel ? <OverlayBadge position={[0, 1.86, 0]} tone="sensor" label={sensorLabel} /> : null}
      {displayDetails && energyLabel ? <OverlayBadge position={[0, 0.96, -0.66]} tone="energy" label={energyLabel} /> : null}
      {displayDetails && maintenanceLabel ? <OverlayBadge position={[0, 0.9, 0.66]} tone="maintenance" label={maintenanceLabel} /> : null}
    </group>
  )
})

function getNodeRenderer(node, library) {
  return library[node.stencilId]?.renderer ?? node.stencilId
}
