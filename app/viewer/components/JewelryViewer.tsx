'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Stage, Environment, Bounds, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter'
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown } from "lucide-react"
import ModelImport from './ModelImport'

type JewelryBaseType = 'necklace' | 'bracelet' | 'none'

type CharmPreset = {
  label: string
  scale: number
}

export default function JewelryViewer() {
  const [importedMesh, setImportedMesh] = useState<THREE.BufferGeometry | null>(null)
  const [charmVisible, setCharmVisible] = useState(true)
  
  // Base jewelry selection
  const [baseJewelryType, setBaseJewelryType] = useState<JewelryBaseType>('none')
  
  // Base jewelry options
  const [chainLength, setChainLength] = useState(450)
  const [chainThickness, setChainThickness] = useState(1)
  
  // Charm parameters
  const [charmScale, setCharmScale] = useState(1)
  const [charmX, setCharmX] = useState(0)
  const [charmY, setCharmY] = useState(0)
  const [charmZ, setCharmZ] = useState(0)
  const [charmRotateX, setCharmRotateX] = useState(0)
  const [charmRotateY, setCharmRotateY] = useState(0)
  const [charmRotateZ, setCharmRotateZ] = useState(0)
  
  // Attachment options
  const [showAttachmentRing, setShowAttachmentRing] = useState(false)
  const [showExtensionBar, setShowExtensionBar] = useState(false)
  const [attachmentRingSize, setAttachmentRingSize] = useState(3)
  const [extensionLength, setExtensionLength] = useState(8)
  
  // Attachment controls
  const [attachmentRotateX, setAttachmentRotateX] = useState(0)
  const [attachmentRotateY, setAttachmentRotateY] = useState(0)
  const [attachmentRotateZ, setAttachmentRotateZ] = useState(0)
  const [attachmentScale, setAttachmentScale] = useState(1)
  
  // Collapsible states
  const [charmPositionOpen, setCharmPositionOpen] = useState(false)
  const [attachmentOptionsOpen, setAttachmentOptionsOpen] = useState(false)
  
  // Preset charm sizes (approximations in 3D space)
  const charmPresets: CharmPreset[] = [
    { label: "Small (0.5 inch)", scale: 0.5 },
    { label: "Medium (1 inch)", scale: 1.0 },
    { label: "Large (1.5 inch)", scale: 1.5 },
    { label: "Extra Large (2 inch)", scale: 2.0 },
  ]
  
  // Scene reference for exporting
  const sceneRef = useRef<THREE.Group>(null)
  
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
    link.download = `jewelry-charm.obj`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  
  // Handle add to cart
  const handleAddToCart = () => {
    // This would integrate with your shopping cart functionality
    const itemDetails = {
      type: baseJewelryType,
      length: chainLength, 
      thickness: chainThickness,
      hasCharm: !!importedMesh,
      attachments: {
        hasRing: showAttachmentRing,
        hasExtender: showExtensionBar
      }
    }
    
    alert(`Added to cart: ${baseJewelryType} with custom charm!`)
    console.log("Added to cart:", itemDetails)
  }
  
  // Handle preset selection
  const handleSizePreset = (value: string) => {
    const preset = charmPresets.find(p => p.label === value)
    if (preset) {
      setCharmScale(preset.scale)
    }
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 bg-gray-50 rounded-lg overflow-hidden" style={{ height: '600px' }}>
        <Canvas>
          <PerspectiveCamera makeDefault position={[0, 0, 150]} fov={30} />
          <ambientLight intensity={0.5} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
          <Bounds fit clip observe margin={1.2}>
            <Stage environment="city" intensity={0.5} contactShadow shadows adjustCamera={false}>
              <group ref={sceneRef}>
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
        <div className="overflow-y-auto max-h-[600px] pr-2">
          <div className="space-y-6">
            {/* Jewelry Type Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Jewelry Type</h3>
              <p className="text-sm text-gray-600">
                Choose how you want your charm to be worn.
              </p>
              
              <RadioGroup 
                value={baseJewelryType} 
                onValueChange={(value) => setBaseJewelryType(value as JewelryBaseType)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="necklace" id="necklace" />
                  <Label htmlFor="necklace" className="font-medium">
                    Charm Necklace
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="bracelet" id="bracelet" />
                  <Label htmlFor="bracelet" className="font-medium">
                    Charm Bracelet
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="none" />
                  <Label htmlFor="none" className="font-medium">
                    Charm Only
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            {/* Chain Options (conditional based on selection) */}
            {baseJewelryType !== 'none' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">{baseJewelryType === 'necklace' ? 'Necklace' : 'Bracelet'} Options</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Length (mm)</Label>
                    <span>{chainLength} mm</span>
                  </div>
                  <Slider 
                    value={[chainLength]} 
                    min={baseJewelryType === 'necklace' ? 300 : 150} 
                    max={baseJewelryType === 'necklace' ? 700 : 250} 
                    step={10} 
                    onValueChange={(value) => setChainLength(value[0])} 
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
                
                <div className="p-3 bg-gray-50 rounded border border-gray-200">
                  <p className="text-sm text-gray-600">
                    {baseJewelryType === 'necklace' 
                      ? 'Gold chain necklace with a clasp for attaching your custom charm.' 
                      : 'Gold chain bracelet with a clasp for attaching your custom charm.'}
                  </p>
                </div>
              </div>
            )}
            
            <Separator />
            
            {/* Charm Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Custom Charm</h3>
              <p className="text-sm text-gray-600">
                Upload your own 3D STL model to create a custom charm.
              </p>
              
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
                  <div className="space-y-4">
                    <div>
                      <Label>Size Presets</Label>
                      <Select onValueChange={handleSizePreset}>
                        <SelectTrigger className="mt-1 w-full">
                          <SelectValue placeholder="Choose a size" />
                        </SelectTrigger>
                        <SelectContent>
                          {charmPresets.map((preset) => (
                            <SelectItem key={preset.label} value={preset.label}>
                              {preset.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>Custom Scale</Label>
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
                  </div>
                  
                  <Collapsible 
                    open={charmPositionOpen} 
                    onOpenChange={setCharmPositionOpen}
                    className="border rounded-md"
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left">
                      <h4 className="text-md font-medium">Advanced Position & Rotation</h4>
                      <ChevronDown className={`h-4 w-4 transition-transform ${charmPositionOpen ? 'transform rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-4 pt-0 border-t">
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
                      
                      <div className="grid grid-cols-3 gap-4 mt-4">
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
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}
            </div>
            
            {/* Charm Attachments Section */}
            {importedMesh && (
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
                  <Collapsible 
                    open={attachmentOptionsOpen} 
                    onOpenChange={setAttachmentOptionsOpen}
                    className="border rounded-md mt-3"
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-4 text-left">
                      <h4 className="text-sm font-medium">Advanced Attachment Options</h4>
                      <ChevronDown className={`h-4 w-4 transition-transform ${attachmentOptionsOpen ? 'transform rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="p-4 pt-0 border-t">
                      <div className="space-y-2">
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
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              <Button 
                onClick={handleAddToCart}
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={!importedMesh || baseJewelryType === 'none'}
              >
                Add to Cart
              </Button>
              {(!importedMesh || baseJewelryType === 'none') && (
                <p className="text-xs text-red-500 mt-2 text-center">
                  {!importedMesh ? "Please upload a charm first" : "Please select a jewelry type"}
                </p>
              )}
              
              {importedMesh && (
                <Button onClick={exportSTL} variant="outline" className="w-full mt-2">
                  Export Charm
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 