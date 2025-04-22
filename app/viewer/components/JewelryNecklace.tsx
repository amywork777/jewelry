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
    const arc = Math.PI * 1.6 // Not a complete circle to simulate an open necklace
    
    // Create a simple chain representation using a curved tube
    const torusGeometry = new THREE.TorusGeometry(
      radius,
      tube,
      radialSegments,
      tubularSegments,
      arc
    )
    
    // Rotate to position the opening at the back of the neck
    torusGeometry.rotateZ((2 * Math.PI - arc) / 2)
    
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

  // Create a small clasp at the back
  const clasp = useMemo(() => {
    const radius = length / (2 * Math.PI * 0.8);
    const angle = 0; // At the back of the necklace
    
    // Position the clasp at the back opening
    const position = new THREE.Vector3(
      radius * Math.cos(angle),
      radius * Math.sin(angle),
      0
    );
    
    // Create a small cylinder for the clasp
    const claspGeometry = new THREE.CylinderGeometry(
      chainThickness * 0.8,
      chainThickness * 0.8,
      chainThickness * 4,
      8
    );
    
    claspGeometry.rotateX(Math.PI / 2);
    
    return { geometry: claspGeometry, position };
  }, [length, chainThickness]);

  return (
    <group>
      {/* Main chain */}
      <mesh>
        <primitive object={geometry} attach="geometry" />
        <meshStandardMaterial color="#FFD700" roughness={0.1} metalness={0.9} />
      </mesh>
      
      {/* Clasp */}
      <mesh position={clasp.position}>
        <primitive object={clasp.geometry} attach="geometry" />
        <meshStandardMaterial color="#FFD700" roughness={0.1} metalness={0.9} />
      </mesh>
    </group>
  )
} 