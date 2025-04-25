'use client'

import React, { useMemo } from 'react'
import * as THREE from 'three'

interface JewelryNecklaceProps {
  length: number
  chainThickness: number
}

export default function JewelryNecklace({ 
  length, 
  chainThickness
}: JewelryNecklaceProps) {
  
  const geometry = useMemo(() => {
    // Calculate dimensions based on length
    const radius = length / (2 * Math.PI * 0.8) // 0.8 to make it look like it hangs naturally
    const tube = chainThickness / 2
    const radialSegments = 8
    const tubularSegments = 120
    const arc = Math.PI * 1.8 // Create a nearly complete circle with a small opening
    
    // Create a simple chain representation using a curved tube
    const torusGeometry = new THREE.TorusGeometry(
      radius,
      tube,
      radialSegments,
      tubularSegments,
      arc
    )
    
    // Make the necklace face the camera (appear as a circle from front view)
    // By default, torus is created in XY plane, so we need to orient it to face the camera (Z axis)
    torusGeometry.rotateX(Math.PI / 2)
    
    // Place the opening at the top
    torusGeometry.rotateZ(Math.PI / 2)
    
    // Rotate 90 degrees on Y axis to fix orientation
    torusGeometry.rotateY(Math.PI / 2)
    
    // Apply a slight "droop" effect to make it look more natural
    const positions = torusGeometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      // Add a slight downward curve to simulate gravity
      const angle = Math.atan2(positions[i+1], positions[i]);
      const distFromCenter = Math.sqrt(positions[i] * positions[i] + positions[i+1] * positions[i+1]);
      
      // Apply more droop at the bottom of the necklace
      const droopFactor = Math.sin(angle + Math.PI/2) * 0.15;
      positions[i+1] -= droopFactor * distFromCenter;
    }
    
    torusGeometry.attributes.position.needsUpdate = true;
    torusGeometry.computeVertexNormals();
    
    return torusGeometry;
  }, [length, chainThickness])

  return (
    <group>
      {/* Main chain */}
      <mesh>
        <primitive object={geometry} attach="geometry" />
        <meshStandardMaterial color="#FFD700" roughness={0.1} metalness={0.9} />
      </mesh>
    </group>
  )
} 