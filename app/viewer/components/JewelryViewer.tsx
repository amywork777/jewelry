'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Stage, Environment, Bounds, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter'
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

type JewelryBaseType = 'necklace' | 'bracelet' | 'none'

type CharmSize = 'small' | 'medium' | 'large'

export default function JewelryViewer() {
  const [importedMesh, setImportedMesh] = useState<THREE.BufferGeometry | null>(null)
  const [charmVisible, setCharmVisible] = useState(true)
  
  // Base jewelry selection
  const [baseJewelryType, setBaseJewelryType] = useState<JewelryBaseType>('none')
  
  // Chain defaults
  const defaultNecklaceLength = 450
  const defaultBraceletLength = 180
  const defaultChainThickness = 0.8
  
  // Charm parameters
  const [charmSize, setCharmSize] = useState<CharmSize>('medium')
  
  // Material options
  const [materialType, setMaterialType] = useState<'gold' | 'silver' | 'rose-gold'>('gold')
  
  // Material properties mapping
  const materialProperties = {
    'gold': { color: '#FFD700', roughness: 0.1, metalness: 0.9 },
    'silver': { color: '#C0C0C0', roughness: 0.1, metalness: 0.9 },
    'rose-gold': { color: '#B76E79', roughness: 0.1, metalness: 0.9 }
  }
  
  // Attachment options
  const [showAttachmentRing, setShowAttachmentRing] = useState(true)
  const [showExtensionBar, setShowExtensionBar] = useState(false)
  const [attachmentRingSize, setAttachmentRingSize] = useState(1.5)
  const [extensionLength, setExtensionLength] = useState(3)
  
  // Attachment controls
  const [attachmentOptionsOpen, setAttachmentOptionsOpen] = useState(false)
  const [attachmentRotateY, setAttachmentRotateY] = useState(0)
  const [attachmentScale, setAttachmentScale] = useState(1)
  const [attachmentPositionX, setAttachmentPositionX] = useState(0)
  const [attachmentPositionY, setAttachmentPositionY] = useState(0)
  const [attachmentPositionZ, setAttachmentPositionZ] = useState(0)
  
  // Get scale factor based on selected size
  const getCharmScale = (): number => {
    switch(charmSize) {
      case 'small': return 0.5;
      case 'large': return 1.5;
      default: return 1.0; // medium
    }
  }
  
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
      length: baseJewelryType === 'necklace' ? defaultNecklaceLength : defaultBraceletLength, 
      thickness: defaultChainThickness,
      hasCharm: !!importedMesh,
      charmSize: charmSize,
      attachments: {
        hasRing: showAttachmentRing,
        hasExtender: showExtensionBar
      }
    }
    
    alert(`Added to cart: ${baseJewelryType} with custom charm!`)
    console.log("Added to cart:", itemDetails)
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 bg-gray-50 rounded-lg overflow-hidden relative" style={{ height: '600px' }}>
        <Canvas 
          shadows={true}
          dpr={[1, 2]}
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
                      rotation={[0, 0, 0]}
                      scale={getCharmScale()}
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
                      scale={getCharmScale() * attachmentScale}
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
                          <torusGeometry args={[attachmentRingSize, attachmentRingSize / 5, 16, 32]} />
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
        
        {/* Overlay for STL upload if no mesh is imported */}
        {!importedMesh && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-auto">
              <h3 className="text-lg font-medium mb-4 text-center">Add Charm Design</h3>
              <ModelImport onImport={handleFileImport} />
            </div>
          </div>
        )}
        
        {/* Small button to add a new design when one is already loaded */}
        {importedMesh && (
          <div className="absolute top-4 right-4">
            <Button
              onClick={() => setImportedMesh(null)}
              className="bg-white hover:bg-gray-100 text-gray-800 shadow-md"
              size="sm"
            >
              Change Charm Design
            </Button>
          </div>
        )}
      </div>
      
      <div className="md:col-span-1">
        <div className="overflow-y-auto max-h-[600px] pr-2">
          <div className="space-y-6">
            {/* Jewelry Type Section */}
            <div className="space-y-3">
              <h3 className="text-lg font-medium">Jewelry Type</h3>
              <p className="text-sm text-gray-600 mb-2">
                Choose how you want your charm to be worn.
              </p>
              
              <RadioGroup 
                value={baseJewelryType} 
                onValueChange={(value) => setBaseJewelryType(value as JewelryBaseType)}
                className="space-y-2"
              >
                <div className="border rounded-md overflow-hidden">
                  <div className="flex items-center space-x-2 p-3 hover:bg-gray-50 transition-colors">
                    <RadioGroupItem value="necklace" id="necklace" />
                    <Label htmlFor="necklace" className="font-medium">
                      Charm Necklace
                    </Label>
                  </div>
                  {baseJewelryType === 'necklace' && (
                    <div className="bg-gray-50 p-3 border-t">
                      <div className="h-16 w-full bg-gray-200 rounded-md flex items-center justify-center mb-2">
                        <p className="text-gray-500 text-xs">Necklace Image</p>
                      </div>
                      <p className="text-xs text-gray-600">
                        Gold chain necklace (18 inches / 450mm) with a delicate 0.8mm chain thickness. 
                        Perfect for displaying your custom charm as a necklace pendant.
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="border rounded-md overflow-hidden">
                  <div className="flex items-center space-x-2 p-3 hover:bg-gray-50 transition-colors">
                    <RadioGroupItem value="bracelet" id="bracelet" />
                    <Label htmlFor="bracelet" className="font-medium">
                      Charm Bracelet
                    </Label>
                  </div>
                  {baseJewelryType === 'bracelet' && (
                    <div className="bg-gray-50 p-3 border-t">
                      <div className="h-16 w-full bg-gray-200 rounded-md flex items-center justify-center mb-2">
                        <p className="text-gray-500 text-xs">Bracelet Image</p>
                      </div>
                      <p className="text-xs text-gray-600">
                        Gold chain bracelet (7 inches / 180mm) with a delicate 0.8mm chain thickness.
                        Perfect for wearing your custom charm on your wrist.
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 p-3 border rounded-md hover:bg-gray-50 transition-colors">
                  <RadioGroupItem value="none" id="none" />
                  <Label htmlFor="none" className="font-medium">
                    Charm Only
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            <Separator />
            
            {importedMesh && (
              <>
                {/* Material Options */}
                <div className="space-y-3">
                  <h3 className="text-md font-medium">Material</h3>
                  <Select 
                    value={materialType}
                    onValueChange={(value) => setMaterialType(value as 'gold' | 'silver' | 'rose-gold')}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="flex items-center gap-2 py-1 px-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: materialProperties['gold'].color }}></div>
                        <SelectItem value="gold">Gold</SelectItem>
                      </div>
                      <div className="flex items-center gap-2 py-1 px-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: materialProperties['silver'].color }}></div>
                        <SelectItem value="silver">Silver</SelectItem>
                      </div>
                      <div className="flex items-center gap-2 py-1 px-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: materialProperties['rose-gold'].color }}></div>
                        <SelectItem value="rose-gold">Rose Gold</SelectItem>
                      </div>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Charm Size */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Charm Size</Label>
                  <RadioGroup 
                    value={charmSize} 
                    onValueChange={(value) => setCharmSize(value as CharmSize)}
                    className="space-y-2 mt-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="small" id="size-small" />
                      <Label htmlFor="size-small">
                        Small (0.5 inch)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="medium" id="size-medium" />
                      <Label htmlFor="size-medium">
                        Medium (1 inch)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="large" id="size-large" />
                      <Label htmlFor="size-large">
                        Large (1.5 inch)
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </>
            )}

            <Separator />
            
            {/* Charm Attachments Section - Moved below 3D modeler */}
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
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="extension-bar" 
                    checked={showExtensionBar}
                    onCheckedChange={setShowExtensionBar}
                  />
                  <Label htmlFor="extension-bar">Add Extension Bar</Label>
                </div>
                
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
                      {showAttachmentRing && (
                        <div className="space-y-2 mb-4">
                          <h4 className="text-sm font-medium">Ring Size</h4>
                          <div className="flex justify-between">
                            <Label>Ring Size (mm)</Label>
                            <span>{attachmentRingSize} mm</span>
                          </div>
                          <Slider 
                            value={[attachmentRingSize]} 
                            min={0.5}
                            max={4}
                            step={0.1} 
                            onValueChange={(value) => setAttachmentRingSize(value[0])} 
                          />
                        </div>
                      )}
                      
                      {showExtensionBar && (
                        <div className="space-y-2 mb-4">
                          <h4 className="text-sm font-medium">Extension Bar</h4>
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
                        <h4 className="text-sm font-medium">Attachment Position</h4>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between">
                              <Label>X Position (Left/Right)</Label>
                              <span>{attachmentPositionX.toFixed(1)}</span>
                            </div>
                            <Slider 
                              value={[attachmentPositionX]} 
                              min={-10} 
                              max={10} 
                              step={0.1} 
                              onValueChange={(value) => setAttachmentPositionX(value[0])} 
                            />
                          </div>
                          
                          <div>
                            <div className="flex justify-between">
                              <Label>Y Position (Up/Down)</Label>
                              <span>{attachmentPositionY.toFixed(1)}</span>
                            </div>
                            <Slider 
                              value={[attachmentPositionY]} 
                              min={-10} 
                              max={10} 
                              step={0.1} 
                              onValueChange={(value) => setAttachmentPositionY(value[0])} 
                            />
                          </div>
                          
                          <div>
                            <div className="flex justify-between">
                              <Label>Z Position (Front/Back)</Label>
                              <span>{attachmentPositionZ.toFixed(1)}</span>
                            </div>
                            <Slider 
                              value={[attachmentPositionZ]} 
                              min={-10} 
                              max={10} 
                              step={0.1} 
                              onValueChange={(value) => setAttachmentPositionZ(value[0])} 
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mt-4">
                        <h4 className="text-sm font-medium">Attachment Rotation</h4>
                        <div className="flex justify-between">
                          <Label>Y Rotation (°)</Label>
                          <span>{attachmentRotateY}°</span>
                        </div>
                        <Slider 
                          value={[attachmentRotateY]} 
                          min={0} 
                          max={360} 
                          step={5} 
                          onValueChange={(value) => setAttachmentRotateY(value[0])} 
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            )}
            
            {/* Action Buttons */}
            {importedMesh && (
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
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 