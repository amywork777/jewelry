'use client'

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import { Button } from "@/components/ui/button"

interface ModelImportProps {
  onImport: (geometry: THREE.BufferGeometry) => void
}

export default function ModelImport({ onImport }: ModelImportProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    
    const file = acceptedFiles[0]
    if (!file.name.toLowerCase().endsWith('.stl')) {
      setError('Please upload an STL file')
      return
    }
    
    setLoading(true)
    setError(null)
    
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        if (!event.target?.result) {
          throw new Error('Failed to read file')
        }
        
        const loader = new STLLoader()
        const geometry = loader.parse(event.target.result as ArrayBuffer)
        
        // Center the geometry
        geometry.center()
        
        // Normalize the size
        const box = new THREE.Box3().setFromObject(new THREE.Mesh(geometry))
        const size = box.getSize(new THREE.Vector3())
        const maxDimension = Math.max(size.x, size.y, size.z)
        const scale = 10 / maxDimension // Scale to a reasonable size
        geometry.scale(scale, scale, scale)
        
        onImport(geometry)
        setLoading(false)
      } catch (err) {
        console.error('Error importing STL:', err)
        setError('Failed to import STL file')
        setLoading(false)
      }
    }
    
    reader.onerror = () => {
      setError('Failed to read file')
      setLoading(false)
    }
    
    reader.readAsArrayBuffer(file)
  }, [onImport])
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'model/stl': ['.stl']
    },
    maxFiles: 1
  })
  
  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-accent' : 'border-border hover:border-primary'}`}
      >
        <input {...getInputProps()} />
        {loading ? (
          <p className="text-muted-foreground">Processing...</p>
        ) : isDragActive ? (
          <p className="text-primary">Drop the STL file here</p>
        ) : (
          <div>
            <p className="text-card-foreground mb-2">Drag & drop an STL file here, or click to select</p>
            <Button className="bg-theme-medium hover:bg-theme-dark text-foreground">Add Charm Design</Button>
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-destructive text-sm">{error}</p>
      )}
    </div>
  )
} 