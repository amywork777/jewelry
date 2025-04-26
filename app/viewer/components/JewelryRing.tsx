'use client'

import React, { useMemo } from 'react'
import * as THREE from 'three'

interface JewelryRingProps {
  diameter: number
  thickness: number
  width: number
}

export default function JewelryRing({ diameter, thickness, width }: JewelryRingProps) {
  const geometry = useMemo(() => {
    const radius = diameter / 2
    const tube = thickness / 2
    const radialSegments = 32
    const tubularSegments = 100
    const arc = Math.PI * 2
    
    // Create a torus geometry
    const torusGeometry = new THREE.TorusGeometry(
      radius,
      tube,
      radialSegments,
      tubularSegments,
      arc
    )
    
    // Instead of scaling, we'll create a new geometry with proper dimensions
    // for the width to maintain a perfect circle
    const extrudeSettings = {
      steps: 1,
      depth: width,
      bevelEnabled: false
    }
    
    // Create a circle shape
    const circleShape = new THREE.Shape()
    circleShape.absarc(0, 0, radius + tube, 0, Math.PI * 2, false)
    
    // Create inner circle for the hole
    const holeShape = new THREE.Path()
    holeShape.absarc(0, 0, radius - tube, 0, Math.PI * 2, true)
    circleShape.holes.push(holeShape)
    
    // Create the final ring geometry
    const ringGeometry = new THREE.ExtrudeGeometry(circleShape, extrudeSettings)
    
    // Center the geometry
    ringGeometry.center()
    
    // Rotate to proper orientation
    ringGeometry.rotateX(Math.PI / 2)
    
    return ringGeometry
  }, [diameter, thickness, width])

  return (
    <mesh>
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial color="#FFD700" roughness={0.1} metalness={0.9} />
    </mesh>
  )
} 