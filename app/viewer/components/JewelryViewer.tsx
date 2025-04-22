'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Stage, Environment, Bounds, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import JewelryRing from './JewelryRing'
import JewelryEarring from './JewelryEarring'
import JewelryNecklace from './JewelryNecklace'
import ModelImport from './ModelImport'

type JewelryType = 'ring' | 'earring' | 'necklace'
type EarringType = 'hoop' | 'stud' | 'drop'
type RingSize = '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11'

// Ring size conversion (US size to diameter in mm)
const ringSizeMap: Record<RingSize, number> = {
  '4': 14.9,
  '5': 15.7,
  '6': 16.5,
  '7': 17.3,
  '8': 18.1,
  '9': 18.9,
  '10': 19.7,
  '11': 20.5
}

export default function JewelryViewer() {
  const [jewelryType, setJewelryType] = useState<JewelryType>('ring')
  const [earringType, setEarringType] = useState<EarringType>('hoop')
  const [importedMesh, setImportedMesh] = useState<THREE.BufferGeometry | null>(null)
  const [charmVisible, setCharmVisible] = useState(true)
  const [ringSize, setRingSize] = useState<RingSize>('7')
  
  // Ring parameters
  const [ringDiameter, setRingDiameter] = useState(ringSizeMap['7'])
  const [ringThickness, setRingThickness] = useState(2)
  const [ringWidth, setRingWidth] = useState(5)
  
  // Earring parameters
  const [earringSize, setEarringSize] = useState(20)
  const [earringThickness, setEarringThickness] = useState(1.5)
  const [hoopDiameter, setHoopDiameter] = useState(15)
  const [studRadius, setStudRadius] = useState(4)
  const [dropLength, setDropLength] = useState(25)
  
  // Necklace parameters
  const [necklaceLength, setNecklaceLength] = useState(450)
  const [chainThickness, setChainThickness] = useState(1)
  
  // Charm parameters
  const [charmScale, setCharmScale] = useState(1)
  const [charmX, setCharmX] = useState(0)
  const [charmY, setCharmY] = useState(0)
  const [charmZ, setCharmZ] = useState(0)
  const [charmRotateX, setCharmRotateX] = useState(0)
  const [charmRotateY, setCharmRotateY] = useState(0)
  const [charmRotateZ, setCharmRotateZ] = useState(0)
  
  // Charm attachment options
  const [showAttachmentRing, setShowAttachmentRing] = useState(false)
  const [showExtensionBar, setShowExtensionBar] = useState(false)
  const [attachmentRingSize, setAttachmentRingSize] = useState(3)
  const [extensionLength, setExtensionLength] = useState(8)
  
  // Attachment rotation controls
  const [attachmentRotateX, setAttachmentRotateX] = useState(0)
  const [attachmentRotateY, setAttachmentRotateY] = useState(0)
  const [attachmentRotateZ, setAttachmentRotateZ] = useState(0)
  
  // Attachment scale control
  const [attachmentScale, setAttachmentScale] = useState(1)
  
  // Scene reference for exporting
  const sceneRef = useRef<THREE.Group>(null)
  
  // Handle ring size change
  const handleRingSizeChange = (size: RingSize) => {
    setRingSize(size)
    setRingDiameter(ringSizeMap[size])
  }
  
  // Handle file import
  const handleFileImport = (geometry: THREE.BufferGeometry) => {
    setImportedMesh(geometry)
  }
  
  // Export model function
  const exportSTL = () => {
    if (!sceneRef.current) return
    
    // Create a clone of the scene to export
    const exportScene = sceneRef.current.clone()
    
    // Convert to a single mesh
    const exporter = new OBJExporter()
    const obj = exporter.parse(exportScene)
    
    // Create a download link
    const blob = new Blob([obj], { type: 'text/plain' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `jewelry-${jewelryType}.obj`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 bg-gray-50 rounded-lg overflow-hidden" style={{ height: '600px' }}>
        <Canvas>
          <PerspectiveCamera makeDefault position={[0, 0, 100]} />
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
          <Bounds fit clip observe margin={1.2}>
            <Stage environment="city" intensity={0.5} contactShadow shadows adjustCamera={false}>
              <group ref={sceneRef}>
                {jewelryType === 'ring' && (
                  <JewelryRing 
                    diameter={ringDiameter} 
                    thickness={ringThickness} 
                    width={ringWidth} 
                  />
                )}
                
                {jewelryType === 'earring' && (
                  <JewelryEarring
                    type={earringType}
                    size={earringSize}
                    thickness={earringThickness}
                    hoopDiameter={hoopDiameter}
                    studRadius={studRadius}
                    dropLength={dropLength}
                  />
                )}
                
                {jewelryType === 'necklace' && (
                  <JewelryNecklace
                    length={necklaceLength}
                    chainThickness={chainThickness}
                  />
                )}
                
                {importedMesh && charmVisible && (
                  <group>
                    <mesh
                      position={[charmX, charmY, charmZ]}
                      rotation={[
                        charmRotateX * Math.PI / 180,
                        charmRotateY * Math.PI / 180,
                        charmRotateZ * Math.PI / 180
                      ]}
                      scale={charmScale}
                    >
                      <primitive object={importedMesh} attach="geometry" />
                      <meshStandardMaterial color="#FFD700" roughness={0.1} metalness={0.9} />
                    </mesh>
                    
                    {/* Attachment group with its own rotation and scale */}
                    <group
                      position={[charmX, charmY, charmZ]}
                      rotation={[
                        (charmRotateX + attachmentRotateX) * Math.PI / 180,
                        (charmRotateY + attachmentRotateY) * Math.PI / 180,
                        (charmRotateZ + attachmentRotateZ) * Math.PI / 180
                      ]}
                      scale={charmScale * attachmentScale}
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
                          <cylinderGeometry args={[0.5, 0.5, extensionLength, 16]} />
                          <meshStandardMaterial color="#FFD700" roughness={0.1} metalness={0.9} />
                        </mesh>
                      )}
                      
                      {/* Charm attachment ring */}
                      {showAttachmentRing && (
                        <mesh
                          position={[
                            0, 
                            showExtensionBar 
                              ? (extensionLength + 2.5)
                              : 5, 
                            0
                          ]}
                          rotation={[
                            0,
                            Math.PI / 2,
                            Math.PI / 2
                          ]}
                        >
                          <torusGeometry args={[attachmentRingSize, attachmentRingSize / 4, 16, 32]} />
                          <meshStandardMaterial color="#FFD700" roughness={0.1} metalness={0.9} />
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
      </div>
      
      <div className="md:col-span-1">
        <Tabs defaultValue="base" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="base">Base Shape</TabsTrigger>
            <TabsTrigger value="charm">Charm</TabsTrigger>
          </TabsList>
          
          <TabsContent value="base" className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Jewelry Type</h3>
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant={jewelryType === 'ring' ? 'default' : 'outline'} 
                  onClick={() => setJewelryType('ring')}
                >
                  Ring
                </Button>
                <Button 
                  variant={jewelryType === 'earring' ? 'default' : 'outline'} 
                  onClick={() => setJewelryType('earring')}
                >
                  Earring
                </Button>
                <Button 
                  variant={jewelryType === 'necklace' ? 'default' : 'outline'} 
                  onClick={() => setJewelryType('necklace')}
                >
                  Necklace
                </Button>
              </div>
            </div>
            
            <Separator />
            
            {jewelryType === 'ring' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Ring Size (US)</Label>
                  <Select
                    value={ringSize}
                    onValueChange={(value) => handleRingSizeChange(value as RingSize)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select ring size" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(ringSizeMap).map((size) => (
                        <SelectItem key={size} value={size}>
                          Size {size} ({ringSizeMap[size as RingSize]} mm)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Thickness (mm)</Label>
                    <span>{ringThickness} mm</span>
                  </div>
                  <Slider 
                    value={[ringThickness]} 
                    min={0.5} 
                    max={5} 
                    step={0.1} 
                    onValueChange={(value) => setRingThickness(value[0])} 
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Width (mm)</Label>
                    <span>{ringWidth} mm</span>
                  </div>
                  <Slider 
                    value={[ringWidth]} 
                    min={1} 
                    max={15} 
                    step={0.5} 
                    onValueChange={(value) => setRingWidth(value[0])} 
                  />
                </div>
              </div>
            )}
            
            {jewelryType === 'earring' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Earring Type</h3>
                  <div className="grid grid-cols-3 gap-2">
                    <Button 
                      variant={earringType === 'hoop' ? 'default' : 'outline'} 
                      onClick={() => setEarringType('hoop')}
                      size="sm"
                    >
                      Hoop
                    </Button>
                    <Button 
                      variant={earringType === 'stud' ? 'default' : 'outline'} 
                      onClick={() => setEarringType('stud')}
                      size="sm"
                    >
                      Stud
                    </Button>
                    <Button 
                      variant={earringType === 'drop' ? 'default' : 'outline'} 
                      onClick={() => setEarringType('drop')}
                      size="sm"
                    >
                      Drop
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Size (mm)</Label>
                    <span>{earringSize} mm</span>
                  </div>
                  <Slider 
                    value={[earringSize]} 
                    min={5} 
                    max={40} 
                    step={0.5} 
                    onValueChange={(value) => setEarringSize(value[0])} 
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Thickness (mm)</Label>
                    <span>{earringThickness} mm</span>
                  </div>
                  <Slider 
                    value={[earringThickness]} 
                    min={0.5} 
                    max={3} 
                    step={0.1} 
                    onValueChange={(value) => setEarringThickness(value[0])} 
                  />
                </div>
                
                {earringType === 'hoop' && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Hoop Diameter (mm)</Label>
                      <span>{hoopDiameter} mm</span>
                    </div>
                    <Slider 
                      value={[hoopDiameter]} 
                      min={5} 
                      max={30} 
                      step={0.5} 
                      onValueChange={(value) => setHoopDiameter(value[0])} 
                    />
                  </div>
                )}
                
                {earringType === 'stud' && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Stud Radius (mm)</Label>
                      <span>{studRadius} mm</span>
                    </div>
                    <Slider 
                      value={[studRadius]} 
                      min={2} 
                      max={10} 
                      step={0.5} 
                      onValueChange={(value) => setStudRadius(value[0])} 
                    />
                  </div>
                )}
                
                {earringType === 'drop' && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Drop Length (mm)</Label>
                      <span>{dropLength} mm</span>
                    </div>
                    <Slider 
                      value={[dropLength]} 
                      min={10} 
                      max={50} 
                      step={1} 
                      onValueChange={(value) => setDropLength(value[0])} 
                    />
                  </div>
                )}
              </div>
            )}
            
            {jewelryType === 'necklace' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Length (mm)</Label>
                    <span>{necklaceLength} mm</span>
                  </div>
                  <Slider 
                    value={[necklaceLength]} 
                    min={300} 
                    max={700} 
                    step={10} 
                    onValueChange={(value) => setNecklaceLength(value[0])} 
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Chain Thickness (mm)</Label>
                    <span>{chainThickness} mm</span>
                  </div>
                  <Slider 
                    value={[chainThickness]} 
                    min={0.5} 
                    max={3} 
                    step={0.1} 
                    onValueChange={(value) => setChainThickness(value[0])} 
                  />
                </div>
                
                <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
                  <p className="text-sm text-gray-600">
                    This chain necklace includes a realistic droop effect and a clasp at the back for a more natural look.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="charm" className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch 
                id="charm-visible" 
                checked={charmVisible}
                onCheckedChange={setCharmVisible}
              />
              <Label htmlFor="charm-visible">Show Charm</Label>
            </div>
            
            <ModelImport onImport={handleFileImport} />
            
            {importedMesh && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Scale</Label>
                    <span>{charmScale.toFixed(2)}</span>
                  </div>
                  <Slider 
                    value={[charmScale]} 
                    min={0.1} 
                    max={3} 
                    step={0.05} 
                    onValueChange={(value) => setCharmScale(value[0])} 
                  />
                </div>
                
                {/* Charm Attachments Section */}
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-md font-medium">Charm Attachments</h3>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="attachment-ring" 
                      checked={showAttachmentRing}
                      onCheckedChange={setShowAttachmentRing}
                    />
                    <Label htmlFor="attachment-ring">Add Ring Loop</Label>
                  </div>
                  
                  {showAttachmentRing && (
                    <div className="space-y-2 ml-8">
                      <div className="flex justify-between">
                        <Label>Ring Size (mm)</Label>
                        <span>{attachmentRingSize} mm</span>
                      </div>
                      <Slider 
                        value={[attachmentRingSize]} 
                        min={1} 
                        max={6} 
                        step={0.1} 
                        onValueChange={(value) => setAttachmentRingSize(value[0])} 
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="extension-bar" 
                      checked={showExtensionBar}
                      onCheckedChange={setShowExtensionBar}
                    />
                    <Label htmlFor="extension-bar">Add Extension Bar</Label>
                  </div>
                  
                  {showExtensionBar && (
                    <div className="space-y-2 ml-8">
                      <div className="flex justify-between">
                        <Label>Length (mm)</Label>
                        <span>{extensionLength} mm</span>
                      </div>
                      <Slider 
                        value={[extensionLength]} 
                        min={3} 
                        max={20} 
                        step={0.5} 
                        onValueChange={(value) => setExtensionLength(value[0])} 
                      />
                    </div>
                  )}
                  
                  {(showAttachmentRing || showExtensionBar) && (
                    <>
                      <div className="space-y-2 mt-4">
                        <h4 className="text-sm font-medium">Attachment Scale</h4>
                        <div className="flex justify-between">
                          <Label>Scale Factor</Label>
                          <span>{attachmentScale.toFixed(2)}x</span>
                        </div>
                        <Slider 
                          value={[attachmentScale]} 
                          min={0.5} 
                          max={2} 
                          step={0.05} 
                          onValueChange={(value) => setAttachmentScale(value[0])} 
                        />
                      </div>
                      
                      <div className="space-y-2 mt-4">
                        <h4 className="text-sm font-medium">Attachment Rotation</h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">X Rotation (°)</Label>
                            <Slider 
                              value={[attachmentRotateX]} 
                              min={0} 
                              max={360} 
                              step={5} 
                              onValueChange={(value) => setAttachmentRotateX(value[0])} 
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Y Rotation (°)</Label>
                            <Slider 
                              value={[attachmentRotateY]} 
                              min={0} 
                              max={360} 
                              step={5} 
                              onValueChange={(value) => setAttachmentRotateY(value[0])} 
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Z Rotation (°)</Label>
                            <Slider 
                              value={[attachmentRotateZ]} 
                              min={0} 
                              max={360} 
                              step={5} 
                              onValueChange={(value) => setAttachmentRotateZ(value[0])} 
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <Separator />
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Position X</Label>
                    <Slider 
                      value={[charmX]} 
                      min={-20} 
                      max={20} 
                      step={0.5} 
                      onValueChange={(value) => setCharmX(value[0])} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Position Y</Label>
                    <Slider 
                      value={[charmY]} 
                      min={-20} 
                      max={20} 
                      step={0.5} 
                      onValueChange={(value) => setCharmY(value[0])} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Position Z</Label>
                    <Slider 
                      value={[charmZ]} 
                      min={-20} 
                      max={20} 
                      step={0.5} 
                      onValueChange={(value) => setCharmZ(value[0])} 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Rotate X (°)</Label>
                    <Slider 
                      value={[charmRotateX]} 
                      min={0} 
                      max={360} 
                      step={5} 
                      onValueChange={(value) => setCharmRotateX(value[0])} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rotate Y (°)</Label>
                    <Slider 
                      value={[charmRotateY]} 
                      min={0} 
                      max={360} 
                      step={5} 
                      onValueChange={(value) => setCharmRotateY(value[0])} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rotate Z (°)</Label>
                    <Slider 
                      value={[charmRotateZ]} 
                      min={0} 
                      max={360} 
                      step={5} 
                      onValueChange={(value) => setCharmRotateZ(value[0])} 
                    />
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <div className="mt-4">
          <Button onClick={exportSTL} className="w-full">Export Model</Button>
        </div>
      </div>
    </div>
  )
} 