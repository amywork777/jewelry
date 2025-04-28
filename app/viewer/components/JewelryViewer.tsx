'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Stage, Environment, Bounds, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter'
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Slider } from "@/components/ui/slider"
import { ChevronDown } from "lucide-react"
import ModelImport from './ModelImport'
import Image from 'next/image'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

type JewelryBaseType = 'necklace' | 'none'

interface JewelryViewerProps {
  stlUrl?: string;
  readOnly?: boolean;
}

export default function JewelryViewer({ stlUrl, readOnly = false }: JewelryViewerProps) {
  const [importedMesh, setImportedMesh] = useState<THREE.BufferGeometry | null>(null)
  const [charmVisible, setCharmVisible] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  
  // Base jewelry selection
  const [baseJewelryType, setBaseJewelryType] = useState<JewelryBaseType>('none')
  
  // Chain defaults
  const defaultNecklaceLength = 450
  const defaultChainThickness = 0.8
  
  // Fixed charm size (approximately 1 inch / 25.4mm)
  const fixedCharmScale = 1.0;
  
  // Material options
  const [materialType, setMaterialType] = useState<'gold' | 'silver'>('gold')
  
  // Charm rotation controls
  const [charmRotateX, setCharmRotateX] = useState(0)
  const [charmRotateY, setCharmRotateY] = useState(0)
  const [charmRotateZ, setCharmRotateZ] = useState(0)
  
  // Material properties mapping
  const materialProperties = {
    'gold': { color: '#FFD700', roughness: 0.1, metalness: 0.9 },
    'silver': { color: '#C0C0C0', roughness: 0.1, metalness: 0.9 }
  }
  
  // Attachment options
  const [showAttachmentRing, setShowAttachmentRing] = useState(true)
  const [showExtensionBar, setShowExtensionBar] = useState(false)
  const fixedRingSize = 0.5; // Updated thickness - was 1.5 before
  const [extensionLength, setExtensionLength] = useState(3)
  
  // Attachment controls
  const [attachmentOptionsOpen, setAttachmentOptionsOpen] = useState(false)
  const [attachmentRotateY, setAttachmentRotateY] = useState(0)
  const fixedAttachmentScale = 1.0; // Fixed scale factor for attachments
  const [attachmentPositionX, setAttachmentPositionX] = useState(0)
  const [attachmentPositionY, setAttachmentPositionY] = useState(0) // Vertical position
  const [attachmentPositionZ, setAttachmentPositionZ] = useState(0)
  
  // Scene reference for exporting
  const sceneRef = useRef<THREE.Group>(null)
  
  // Load STL from URL if provided
  useEffect(() => {
    if (stlUrl) {
      loadSTLFromUrl(stlUrl);
    }
  }, [stlUrl]);
  
  const loadSTLFromUrl = async (url: string) => {
    setIsLoading(true);
    setLoadError(null);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load STL: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      
      const loader = new STLLoader();
      const geometry = loader.parse(arrayBuffer);
      
      // Center the geometry
      geometry.center();
      
      // Normalize the size
      const box = new THREE.Box3().setFromObject(new THREE.Mesh(geometry));
      const size = box.getSize(new THREE.Vector3());
      const maxDimension = Math.max(size.x, size.y, size.z);
      const scale = 10 / maxDimension; // Scale to a reasonable size
      geometry.scale(scale, scale, scale);
      
      setImportedMesh(geometry);
    } catch (error) {
      console.error("Error loading STL from URL:", error);
      setLoadError(error instanceof Error ? error.message : 'Failed to load the STL file');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle file import
  const handleFileImport = (geometry: THREE.BufferGeometry) => {
    setImportedMesh(geometry)
  }
  
  // Export model function
  const exportSTL = () => {
    if (!sceneRef.current) return
    
    // Create a clone of the scene to export
    const exportScene = sceneRef.current.clone()
    
    // Convert to STL format using binary for better quality
    const exporter = new STLExporter()
    const stl = exporter.parse(exportScene, { binary: true })
    
    // Create a download link
    const blob = new Blob([stl], { type: 'application/octet-stream' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `jewelry-charm.stl`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  // Handle add to cart
  const handleAddToCart = () => {
    // This would integrate with your shopping cart functionality
    const itemDetails = {
      type: baseJewelryType,
      length: baseJewelryType === 'necklace' ? defaultNecklaceLength : 0, 
      thickness: defaultChainThickness,
      hasCharm: !!importedMesh,
      charmSize: 'medium',
      attachments: {
        hasRing: showAttachmentRing,
        hasExtender: showExtensionBar
      }
    }
    
    alert(`Added to cart: ${baseJewelryType === 'necklace' ? 'Necklace' : 'Charm only'}!`)
    console.log("Added to cart:", itemDetails)
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 h-[85vh] gap-4 font-quicksand">
      <div className="md:col-span-3 bg-secondary rounded-xl cute-shadow overflow-hidden relative h-full">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 z-10">
            <div className="bg-card p-4 rounded-xl cute-shadow">
              <p className="text-card-foreground">Loading model...</p>
            </div>
          </div>
        )}
        
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 z-10">
            <div className="bg-card p-4 rounded-xl cute-shadow">
              <p className="text-destructive">Error: {loadError}</p>
              <Button 
                onClick={() => setLoadError(null)} 
                className="mt-2 w-full bg-theme-light text-foreground hover:bg-theme-medium"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}
        
        <Canvas 
          shadows={true}
          dpr={[1, 2]}
          style={{ height: '100%' }}
        >
          <PerspectiveCamera makeDefault position={[0, 0, 150]} fov={30} />
          <ambientLight intensity={0.5} />
          <spotLight 
            position={[10, 10, 10]} 
            angle={0.15} 
            penumbra={1} 
            intensity={1.2} 
            castShadow={true} 
          />
          <Bounds fit clip observe margin={1.2}>
            <Stage
              environment="city"
              intensity={0.5}
              contactShadow={true}
              shadows={true}
              adjustCamera={false}
            >
              <group ref={sceneRef}>
                {importedMesh && charmVisible && (
                  <group>
                    <mesh
                      position={[0, 0, 0]}
                      rotation={[
                        charmRotateX * Math.PI / 180,
                        charmRotateY * Math.PI / 180,
                        charmRotateZ * Math.PI / 180
                      ]}
                      scale={fixedCharmScale}
                    >
                      <primitive object={importedMesh} attach="geometry" />
                      <meshStandardMaterial
                        {...materialProperties[materialType]}
                      />
                    </mesh>
                    
                    {/* Attachment group with its own rotation and scale */}
                    <group
                      position={[
                        attachmentPositionX,
                        attachmentPositionY,
                        attachmentPositionZ
                      ]}
                      rotation={[
                        0,
                        attachmentRotateY * Math.PI / 180,
                        0
                      ]}
                      scale={fixedCharmScale * fixedAttachmentScale}
                    >
                      {/* Extension bar */}
                      {showExtensionBar && (
                        <mesh
                          position={[
                            0,
                            (extensionLength / 2 + 1),
                            0
                          ]}
                        >
                          <cylinderGeometry args={[0.4, 0.4, extensionLength, 16]} />
                          <meshStandardMaterial
                            {...materialProperties[materialType]}
                          />
                        </mesh>
                      )}
                      
                      {/* Charm attachment ring */}
                      {showAttachmentRing && (
                        <mesh
                          position={[
                            0, 
                            showExtensionBar 
                              ? (extensionLength + 2.2)
                              : 4, 
                            0
                          ]}
                          rotation={[
                            0,
                            0,
                            0
                          ]}
                        >
                          <torusGeometry args={[1.5, 0.5, 16, 32]} />
                          <meshStandardMaterial
                            {...materialProperties[materialType]}
                          />
                        </mesh>
                      )}
                    </group>
                  </group>
                )}
              </group>
            </Stage>
          </Bounds>
          <OrbitControls makeDefault />
        </Canvas>
        
        {/* Overlay for STL upload if no mesh is imported and not in readOnly mode */}
        {!importedMesh && !readOnly && !stlUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm">
            <div className="bg-card p-6 rounded-xl cute-shadow max-w-md mx-auto">
              <h3 className="text-lg font-semibold mb-2 text-center text-card-foreground">Add Charm Design</h3>
              <p className="text-center text-muted-foreground mb-4">Standard size: 1 inch (25.4mm)</p>
              <ModelImport onImport={handleFileImport} />
            </div>
          </div>
        )}
        
        {/* Change Charm Design button always visible when in edit mode */}
        {!readOnly && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
            <Button
              onClick={() => setImportedMesh(null)}
              className="bg-card hover:bg-secondary text-foreground border border-border shadow-md"
              size="default"
            >
              {importedMesh ? "Change Charm Design" : "Add Charm Design"}
            </Button>
          </div>
        )}
      </div>
      
      <div className="md:col-span-2 p-4 overflow-auto">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-medium mb-4 text-foreground">Jewelry Designer</h2>
            
            {/* Metal Type selection */}
            <div className="mb-6 bg-card p-4 rounded-xl cute-shadow">
              <h3 className="text-lg font-medium mb-2 text-card-foreground">Metal Type</h3>
              <RadioGroup 
                value={materialType} 
                onValueChange={(value) => setMaterialType(value as 'gold' | 'silver')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="gold" id="gold" />
                  <Label htmlFor="gold" className="font-medium">Gold</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="silver" id="silver" />
                  <Label htmlFor="silver" className="font-medium">Silver</Label>
                </div>
              </RadioGroup>
            </div>
            
            {/* Jewelry Type Selection */}
            <div className="mb-6 bg-card p-4 rounded-xl cute-shadow">
              <h3 className="text-lg font-medium mb-2 text-card-foreground">Jewelry Type</h3>
              <RadioGroup 
                value={baseJewelryType} 
                onValueChange={(value) => setBaseJewelryType(value as JewelryBaseType)}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center space-x-2 py-1">
                  <RadioGroupItem value="none" id="charm-only" />
                  <Label htmlFor="charm-only" className="font-medium">Charm Only</Label>
                </div>
                <div className="flex items-center space-x-2 py-1">
                  <RadioGroupItem value="necklace" id="necklace" />
                  <Label htmlFor="necklace" className="font-medium">Charm with Chain (18")</Label>
                </div>
              </RadioGroup>
            </div>
            
            {/* Attachment options */}
            <Collapsible 
              open={attachmentOptionsOpen} 
              onOpenChange={setAttachmentOptionsOpen}
              className="mb-6 bg-card p-4 rounded-xl cute-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium text-card-foreground">Attachment Options</h3>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="hover:bg-transparent">
                    <ChevronDown className={`h-4 w-4 transition-transform ${attachmentOptionsOpen ? "transform rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
              </div>
              
              <CollapsibleContent className="space-y-4">
                <div className="flex justify-between items-center py-2">
                  <Label htmlFor="attachment-ring" className="font-medium">Attachment Ring</Label>
                  <Switch 
                    id="attachment-ring"
                    checked={showAttachmentRing} 
                    onCheckedChange={setShowAttachmentRing}
                  />
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <Label htmlFor="extension-bar" className="font-medium">Extension Bar</Label>
                  <Switch 
                    id="extension-bar"
                    checked={showExtensionBar} 
                    onCheckedChange={setShowExtensionBar}
                  />
                </div>
                
                {showExtensionBar && (
                  <div className="space-y-1 py-2">
                    <div className="flex justify-between">
                      <Label htmlFor="extension-length" className="font-medium">Extension Length: {extensionLength}mm</Label>
                    </div>
                    <Slider 
                      id="extension-length"
                      min={1} 
                      max={10} 
                      step={0.5} 
                      value={[extensionLength]} 
                      onValueChange={(values) => setExtensionLength(values[0])}
                    />
                  </div>
                )}
                
                <div className="space-y-1 py-2">
                  <div className="flex justify-between">
                    <Label htmlFor="attachment-rotate" className="font-medium">Rotate: {attachmentRotateY}°</Label>
                  </div>
                  <Slider 
                    id="attachment-rotate"
                    min={-180} 
                    max={180} 
                    step={5} 
                    value={[attachmentRotateY]} 
                    onValueChange={(values) => setAttachmentRotateY(values[0])}
                  />
                </div>
                
                {/* Horizontal position */}
                <div className="space-y-1 py-2">
                  <div className="flex justify-between">
                    <Label htmlFor="attachment-position-x" className="font-medium">Horizontal: {attachmentPositionX}</Label>
                  </div>
                  <Slider 
                    id="attachment-position-x"
                    min={-5} 
                    max={5} 
                    step={0.1} 
                    value={[attachmentPositionX]} 
                    onValueChange={(values) => setAttachmentPositionX(values[0])}
                  />
                </div>
                
                {/* Vertical position */}
                <div className="space-y-1 py-2">
                  <div className="flex justify-between">
                    <Label htmlFor="attachment-position-y" className="font-medium">Vertical: {attachmentPositionY}</Label>
                  </div>
                  <Slider 
                    id="attachment-position-y"
                    min={-5} 
                    max={5} 
                    step={0.1} 
                    value={[attachmentPositionY]} 
                    onValueChange={(values) => setAttachmentPositionY(values[0])}
                  />
                </div>
                
                {/* Depth position */}
                <div className="space-y-1 py-2">
                  <div className="flex justify-between">
                    <Label htmlFor="attachment-position-z" className="font-medium">Depth: {attachmentPositionZ}</Label>
                  </div>
                  <Slider 
                    id="attachment-position-z"
                    min={-5} 
                    max={5} 
                    step={0.1} 
                    value={[attachmentPositionZ]} 
                    onValueChange={(values) => setAttachmentPositionZ(values[0])}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
            
            {/* Charm Options */}
            <Collapsible 
              className="mb-6 bg-card p-4 rounded-xl cute-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium text-card-foreground">Charm Options</h3>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="hover:bg-transparent">
                    <ChevronDown className="h-4 w-4 transition-transform" />
                  </Button>
                </CollapsibleTrigger>
              </div>
              
              <CollapsibleContent className="space-y-4">
                <div className="bg-theme-light p-2 rounded-lg text-center mb-2">
                  <p className="text-sm text-foreground">Standard charm size: 1 inch (25.4mm)</p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <Label htmlFor="rotate-x" className="font-medium">Rotate X: {charmRotateX}°</Label>
                    </div>
                    <Slider 
                      id="rotate-x"
                      min={-180} 
                      max={180} 
                      step={5} 
                      value={[charmRotateX]} 
                      onValueChange={(values) => setCharmRotateX(values[0])}
                      className="cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <Label htmlFor="rotate-y" className="font-medium">Rotate Y: {charmRotateY}°</Label>
                    </div>
                    <Slider 
                      id="rotate-y"
                      min={-180} 
                      max={180} 
                      step={5} 
                      value={[charmRotateY]} 
                      onValueChange={(values) => setCharmRotateY(values[0])}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <Label htmlFor="rotate-z" className="font-medium">Rotate Z: {charmRotateZ}°</Label>
                    </div>
                    <Slider 
                      id="rotate-z"
                      min={-180} 
                      max={180} 
                      step={5} 
                      value={[charmRotateZ]} 
                      onValueChange={(values) => setCharmRotateZ(values[0])}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
            
            {/* Actions */}
            {!readOnly && (
              <div className="mb-6 bg-card p-4 rounded-xl cute-shadow">
                <h3 className="text-lg font-medium mb-2 text-card-foreground">Actions</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    onClick={exportSTL} 
                    variant="outline" 
                    className="w-full border-border bg-card hover:bg-secondary text-foreground"
                  >
                    Export Charm
                  </Button>
                  
                  <Button 
                    onClick={handleAddToCart} 
                    className="w-full bg-gradient-to-r from-theme-light to-theme-medium text-foreground hover:opacity-90"
                  >
                    Add to Cart
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 