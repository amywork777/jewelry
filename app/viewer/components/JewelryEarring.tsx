'use client'

import React, { useMemo } from 'react'
import * as THREE from 'three'

type EarringType = 'hoop' | 'stud' | 'drop'

interface JewelryEarringProps {
  type: EarringType
  size: number
  thickness: number
  hoopDiameter?: number
  studRadius?: number
  dropLength?: number
}

export default function JewelryEarring({ 
  type, 
  size, 
  thickness,
  hoopDiameter = 15,
  studRadius = 4,
  dropLength = 25
}: JewelryEarringProps) {
  
  const geometry = useMemo(() => {
    switch(type) {
      case 'hoop': {
        // Create a torus for hoop earrings
        const radius = hoopDiameter / 2
        const tube = thickness / 2
        const radialSegments = 16
        const tubularSegments = 50
        const arc = 1.8 * Math.PI // Not a complete circle to simulate an open hoop
        
        const torusGeometry = new THREE.TorusGeometry(
          radius,
          tube,
          radialSegments,
          tubularSegments,
          arc
        )
        
        // Rotate to position the opening at the bottom
        torusGeometry.rotateZ(Math.PI / 2 + (2 * Math.PI - arc) / 2)
        
        return torusGeometry
      }
      
      case 'stud': {
        // Create a sphere for stud earrings
        const sphereGeometry = new THREE.SphereGeometry(
          studRadius,
          32,
          16
        )
        
        // Add a small cylinder for the post
        const postGeometry = new THREE.CylinderGeometry(
          thickness / 3,
          thickness / 3,
          thickness * 2,
          16
        )
        
        postGeometry.rotateX(Math.PI / 2)
        postGeometry.translate(0, 0, -thickness)
        
        // Simplified approach - just return the sphere for now
        return sphereGeometry
      }
      
      case 'drop': {
        // Create a teardrop shape for drop earrings
        const points: THREE.Vector2[] = []
        
        for (let i = 0; i <= 20; i++) {
          const t = i / 20
          const angle = t * Math.PI
          
          // Create a teardrop shape
          const x = Math.sin(angle) * (size / 3) * (1 - t * 0.5)
          const y = (Math.cos(angle) * (size / 3) * (1 - t * 0.7)) - dropLength / 3
          
          points.push(new THREE.Vector2(x, y))
        }
        
        const latheGeometry = new THREE.LatheGeometry(
          points,
          32
        )
        
        return latheGeometry
      }
      
      default:
        return new THREE.SphereGeometry(size / 2, 32, 16)
    }
  }, [type, size, thickness, hoopDiameter, studRadius, dropLength])

  return (
    <mesh>
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial color="#FFD700" roughness={0.3} metalness={0.8} />
    </mesh>
  )
} 