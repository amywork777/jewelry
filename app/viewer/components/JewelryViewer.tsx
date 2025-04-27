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
  const [materialType, setMaterialType] = useState<'gold' | 'silver' | 'rose-gold'>('gold')
  
  // Charm rotation controls
  const [charmRotateX, setCharmRotateX] = useState(0)
  const [charmRotateY, setCharmRotateY] = useState(0)
  const [charmRotateZ, setCharmRotateZ] = useState(0)
  
  // Material properties mapping
  const materialProperties = {
    'gold': { color: '#FFD700', roughness: 0.1, metalness: 0.9 },
    'silver': { color: '#C0C0C0', roughness: 0.1, metalness: 0.9 },
    'rose-gold': { color: '#B76E79', roughness: 0.1, metalness: 0.9 }
  }
  
  // Attachment options
  const [showAttachmentRing, setShowAttachmentRing] = useState(true)
  const [showExtensionBar, setShowExtensionBar] = useState(false)
  const fixedRingSize = 1.5; // Fixed ring size - no longer a state variable
  const [extensionLength, setExtensionLength] = useState(3)
  
  // Attachment controls
  const [attachmentOptionsOpen, setAttachmentOptionsOpen] = useState(false)
  const [attachmentRotateY, setAttachmentRotateY] = useState(0)
  const fixedAttachmentScale = 1.0; // Fixed scale factor for attachments
  const [attachmentPositionX, setAttachmentPositionX] = useState(0)
  const [attachmentPositionY, setAttachmentPositionY] = useState(0)
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
    <div className="grid grid-cols-1 md:grid-cols-5 h-[85vh]">
      <div className="md:col-span-3 bg-gray-50 rounded-lg overflow-hidden relative h-full">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 z-10">
            <div className="bg-white p-4 rounded-md shadow-md">
              <p className="text-gray-600">Loading model...</p>
            </div>
          </div>
        )}
        
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 z-10">
            <div className="bg-white p-4 rounded-md shadow-md">
              <p className="text-red-500">Error: {loadError}</p>
              <Button 
                onClick={() => setLoadError(null)} 
                className="mt-2 w-full"
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
                          <torusGeometry args={[1.5, 1.5 / 5, 16, 32]} />
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
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-auto">
              <h3 className="text-lg font-semibold mb-4 text-center">Add Charm Design</h3>
              <ModelImport onImport={handleFileImport} />
            </div>
          </div>
        )}
        
        {/* Change Charm Design button always visible when in edit mode */}
        {!readOnly && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
            <Button
              onClick={() => setImportedMesh(null)}
              className="bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 shadow-md"
              size="default"
            >
              {importedMesh ? "Change Charm Design" : "Add Charm Design"}
            </Button>
          </div>
        )}
      </div>
      
      {/* Only show controls if not in readOnly mode */}
      {!readOnly ? (
        <div className="md:col-span-2 h-full border-l border-gray-200">
          <div className="overflow-y-auto h-full p-3">
            <div className="space-y-3 max-h-[85vh]">
              {/* Tabs for mobile view */}
              <div className="md:hidden bg-white rounded-md border border-gray-200 p-2">
                <Tabs defaultValue="design" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-2">
                    <TabsTrigger value="design">Design</TabsTrigger>
                    <TabsTrigger value="jewelry">Type</TabsTrigger>
                    <TabsTrigger value="position">Position</TabsTrigger>
                  </TabsList>
                  
                  {/* Design tab content */}
                  <TabsContent value="design" className="space-y-3">
                    {importedMesh ? (
                      <>
                        {/* Fixed Size Notice */}
                        <div className="text-center mb-2">
                          <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                            Standard Size: Approximately 1 inch (25.4mm)
                          </span>
                        </div>
                        
                        {/* Material */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Material</Label>
                          <Select 
                            value={materialType}
                            onValueChange={(value) => setMaterialType(value as 'gold' | 'silver' | 'rose-gold')}
                          >
                            <SelectTrigger className="w-full border-gray-300 bg-white">
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
                        
                        {/* Attachments */}
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-gray-700">Attachments</Label>
                          <div className="flex justify-between items-center">
                            <Label htmlFor="attachment-ring" className="text-sm text-gray-700">Ring Loop</Label>
                            <Switch id="attachment-ring" checked={showAttachmentRing} onCheckedChange={setShowAttachmentRing} />
                          </div>
                          <div className="flex justify-between items-center">
                            <Label htmlFor="extension-bar" className="text-sm text-gray-700">Extension Bar</Label>
                            <Switch id="extension-bar" checked={showExtensionBar} onCheckedChange={setShowExtensionBar} />
                          </div>
                          
                          {/* Advanced options for mobile */}
                          {(showAttachmentRing || showExtensionBar) && (
                            <Collapsible 
                              open={attachmentOptionsOpen} 
                              onOpenChange={setAttachmentOptionsOpen}
                              className="mt-2"
                            >
                              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-left bg-gray-50 rounded-md">
                                <h4 className="text-xs font-medium text-gray-700">Advanced Options</h4>
                                <ChevronDown className={`h-3 w-3 text-gray-500 transition-transform ${attachmentOptionsOpen ? 'transform rotate-180' : ''}`} />
                              </CollapsibleTrigger>
                              <CollapsibleContent className="p-2 pt-2 border-t mt-2">
                                {showAttachmentRing && (
                                  <div className="text-xs mb-2">
                                    <div className="flex justify-between">
                                      <Label className="text-gray-600">Ring Size</Label>
                                      <span className="text-gray-900">Fixed at 1.5mm</span>
                                    </div>
                                  </div>
                                )}
                                
                                {showExtensionBar && (
                                  <div className="space-y-1 mb-2">
                                    <div className="flex justify-between text-xs">
                                      <Label className="text-gray-600">Extension Length</Label>
                                      <span className="text-gray-900">{extensionLength} mm</span>
                                    </div>
                                    <Slider 
                                      value={[extensionLength]} 
                                      min={3} 
                                      max={20} 
                                      step={0.5} 
                                      onValueChange={(value) => setExtensionLength(value[0])} 
                                      className="mt-1"
                                    />
                                  </div>
                                )}
                              
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <Label className="text-gray-600">Y Rotation</Label>
                                    <span className="text-gray-900">{attachmentRotateY}°</span>
                                  </div>
                                  <Slider 
                                    value={[attachmentRotateY]} 
                                    min={0} 
                                    max={360} 
                                    step={5} 
                                    onValueChange={(value) => setAttachmentRotateY(value[0])} 
                                    className="mt-1"
                                  />
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="py-8 text-center text-gray-500">
                        <p>Add a charm design first</p>
                      </div>
                    )}
                  </TabsContent>
                  
                  {/* Jewelry Type tab content */}
                  <TabsContent value="jewelry" className="space-y-3">
                    <RadioGroup 
                      value={baseJewelryType} 
                      onValueChange={(value) => setBaseJewelryType(value as JewelryBaseType)}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2 p-3 border border-gray-200 rounded-md">
                        <RadioGroupItem value="necklace" id="necklace-mobile" />
                        <Label htmlFor="necklace-mobile" className="font-medium text-gray-700">Charm Necklace</Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border border-gray-200 rounded-md">
                        <RadioGroupItem value="none" id="none-mobile" />
                        <Label htmlFor="none-mobile" className="font-medium text-gray-700">Charm Only</Label>
                      </div>
                    </RadioGroup>
                  </TabsContent>
                  
                  {/* Position tab content */}
                  <TabsContent value="position" className="space-y-3">
                    {importedMesh ? (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <Label className="text-gray-600">X Rotation (°)</Label>
                            <span className="text-gray-900">{charmRotateX}°</span>
                          </div>
                          <Slider 
                            value={[charmRotateX]} 
                            min={0} 
                            max={360} 
                            step={5} 
                            onValueChange={(value) => setCharmRotateX(value[0])} 
                            className="mt-1"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <Label className="text-gray-600">Y Rotation (°)</Label>
                            <span className="text-gray-900">{charmRotateY}°</span>
                          </div>
                          <Slider 
                            value={[charmRotateY]} 
                            min={0} 
                            max={360} 
                            step={5} 
                            onValueChange={(value) => setCharmRotateY(value[0])} 
                            className="mt-1"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <Label className="text-gray-600">Z Rotation (°)</Label>
                            <span className="text-gray-900">{charmRotateZ}°</span>
                          </div>
                          <Slider 
                            value={[charmRotateZ]} 
                            min={0} 
                            max={360} 
                            step={5} 
                            onValueChange={(value) => setCharmRotateZ(value[0])} 
                            className="mt-1"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="py-8 text-center text-gray-500">
                        <p>Add a charm design first</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
              
              {/* Desktop view - Collapsible sections */}
              <div className="hidden md:block">
                {/* Main options section */}
                {importedMesh && (
                  <>
                    {/* Charm Design Section */}
                    <Collapsible className="space-y-2 mb-3" defaultOpen={true}>
                      <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
                        <h3 className="text-base font-semibold text-gray-900">Charm Design</h3>
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="bg-white rounded-md border border-gray-200 p-3 shadow-sm">
                          {/* Fixed Size Notice */}
                          <div className="mb-3 text-center">
                            <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                              Standard Size: Approximately 1 inch (25.4mm)
                            </span>
                          </div>
                          
                          {/* Material Options */}
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Material</Label>
                            <Select 
                              value={materialType}
                              onValueChange={(value) => setMaterialType(value as 'gold' | 'silver' | 'rose-gold')}
                            >
                              <SelectTrigger className="w-full border-gray-300 bg-white">
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
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                    
                    {/* Attachment Options */}
                    <Collapsible className="space-y-2 mb-3" defaultOpen={true}>
                      <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
                        <h3 className="text-base font-semibold text-gray-900">Attachment Options</h3>
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="bg-white rounded-md border border-gray-200 p-3 shadow-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="attachment-ring-desktop" className="text-sm font-medium text-gray-700">Add Ring Loop</Label>
                            <Switch 
                              id="attachment-ring-desktop" 
                              checked={showAttachmentRing}
                              onCheckedChange={setShowAttachmentRing}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <Label htmlFor="extension-bar-desktop" className="text-sm font-medium text-gray-700">Add Extension Bar</Label>
                            <Switch 
                              id="extension-bar-desktop" 
                              checked={showExtensionBar}
                              onCheckedChange={setShowExtensionBar}
                            />
                          </div>
                          
                          {(showAttachmentRing || showExtensionBar) && (
                            <Collapsible 
                              open={attachmentOptionsOpen} 
                              onOpenChange={setAttachmentOptionsOpen}
                              className="mt-2"
                            >
                              <CollapsibleTrigger className="flex items-center justify-between w-full p-2 text-left bg-gray-50 rounded-md">
                                <h4 className="text-xs font-medium text-gray-700">Advanced Options</h4>
                                <ChevronDown className={`h-3 w-3 text-gray-500 transition-transform ${attachmentOptionsOpen ? 'transform rotate-180' : ''}`} />
                              </CollapsibleTrigger>
                              <CollapsibleContent className="p-2 pt-2 border-t mt-2">
                                {showAttachmentRing && (
                                  <div className="text-xs mb-2">
                                    <div className="flex justify-between">
                                      <Label className="text-gray-600">Ring Size</Label>
                                      <span className="text-gray-900">Fixed at 1.5mm</span>
                                    </div>
                                  </div>
                                )}
                                
                                {showExtensionBar && (
                                  <div className="space-y-1 mb-2">
                                    <div className="flex justify-between text-xs">
                                      <Label className="text-gray-600">Extension Length</Label>
                                      <span className="text-gray-900">{extensionLength} mm</span>
                                    </div>
                                    <Slider 
                                      value={[extensionLength]} 
                                      min={3} 
                                      max={20} 
                                      step={0.5} 
                                      onValueChange={(value) => setExtensionLength(value[0])} 
                                      className="mt-1"
                                    />
                                  </div>
                                )}
                              
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <Label className="text-gray-600">Y Rotation</Label>
                                    <span className="text-gray-900">{attachmentRotateY}°</span>
                                  </div>
                                  <Slider 
                                    value={[attachmentRotateY]} 
                                    min={0} 
                                    max={360} 
                                    step={5} 
                                    onValueChange={(value) => setAttachmentRotateY(value[0])} 
                                    className="mt-1"
                                  />
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </>
                )}

                {/* Jewelry Type Section - moved down */}
                <div className="space-y-2 mb-3">
                  <h3 className="text-base font-semibold text-gray-900">Jewelry Type</h3>
                  <div className="bg-white rounded-md border border-gray-200 p-3 shadow-sm">
                    <RadioGroup 
                      value={baseJewelryType} 
                      onValueChange={(value) => setBaseJewelryType(value as JewelryBaseType)}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2 p-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                        <RadioGroupItem value="necklace" id="necklace" />
                        <Label htmlFor="necklace" className="font-medium text-gray-700">
                          Charm Necklace (18" / 450mm)
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2 p-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                        <RadioGroupItem value="none" id="none" />
                        <Label htmlFor="none" className="font-medium text-gray-700">
                          Charm Only
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
                
                {/* Positioning Controls */}
                {importedMesh && (
                  <Collapsible className="space-y-2 mb-3">
                    <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
                      <h3 className="text-base font-semibold text-gray-900">Positioning Controls</h3>
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="bg-white rounded-md border border-gray-200 p-3 shadow-sm space-y-3">
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <Label className="text-gray-600">X Rotation (°)</Label>
                            <span className="text-gray-900">{charmRotateX}°</span>
                          </div>
                          <Slider 
                            value={[charmRotateX]} 
                            min={0} 
                            max={360} 
                            step={5} 
                            onValueChange={(value) => setCharmRotateX(value[0])} 
                            className="mt-1"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <Label className="text-gray-600">Y Rotation (°)</Label>
                            <span className="text-gray-900">{charmRotateY}°</span>
                          </div>
                          <Slider 
                            value={[charmRotateY]} 
                            min={0} 
                            max={360} 
                            step={5} 
                            onValueChange={(value) => setCharmRotateY(value[0])} 
                            className="mt-1"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <Label className="text-gray-600">Z Rotation (°)</Label>
                            <span className="text-gray-900">{charmRotateZ}°</span>
                          </div>
                          <Slider 
                            value={[charmRotateZ]} 
                            min={0} 
                            max={360} 
                            step={5} 
                            onValueChange={(value) => setCharmRotateZ(value[0])} 
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
              
              {/* Action Buttons - added back (both mobile and desktop) */}
              {importedMesh && (
                <div className="pt-1 space-y-2">
                  <Button 
                    onClick={handleAddToCart}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={!importedMesh || baseJewelryType === 'none'}
                  >
                    Add to Cart
                  </Button>
                  
                  <Button 
                    onClick={exportSTL} 
                    variant="outline" 
                    className="w-full border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                  >
                    Export Charm
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="md:col-span-2 h-full border-l border-gray-200">
          <div className="overflow-y-auto h-full p-3 space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 md:block hidden">Model Preview</h2>
            
            {/* Mobile view */}
            <div className="md:hidden">
              <Tabs defaultValue="material" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-2">
                  <TabsTrigger value="material">Material</TabsTrigger>
                  <TabsTrigger value="rotation">Rotation</TabsTrigger>
                </TabsList>
                
                <TabsContent value="material" className="space-y-3">
                  {/* Fixed Size Notice */}
                  <div className="text-center mb-2">
                    <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                      Standard Size: Approximately 1 inch (25.4mm)
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <Select
                      value={materialType}
                      onValueChange={(value) => setMaterialType(value as 'gold' | 'silver' | 'rose-gold')}
                    >
                      <SelectTrigger className="w-full border-gray-300 bg-white">
                        <SelectValue placeholder="Select material" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gold">Gold</SelectItem>
                        <SelectItem value="silver">Silver</SelectItem>
                        <SelectItem value="rose-gold">Rose Gold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
                
                <TabsContent value="rotation" className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <Label className="text-gray-600">Y Rotation</Label>
                      <span className="text-gray-900">{charmRotateY}°</span>
                    </div>
                    <Slider 
                      value={[charmRotateY]} 
                      min={0} 
                      max={360} 
                      step={15} 
                      onValueChange={(value) => setCharmRotateY(value[0])} 
                      className="mt-1"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            
            {/* Desktop view */}
            <div className="hidden md:block space-y-3">
              {/* Fixed Size Notice */}
              <div className="bg-white rounded-md border border-gray-200 p-3 shadow-sm">
                <div className="text-center">
                  <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                    Standard Size: Approximately 1 inch (25.4mm)
                  </span>
                </div>
              </div>
              
              <div className="bg-white rounded-md border border-gray-200 p-3 shadow-sm">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Material</h3>
                <Select 
                  value={materialType}
                  onValueChange={(value) => setMaterialType(value as 'gold' | 'silver' | 'rose-gold')}
                >
                  <SelectTrigger className="w-full border-gray-300 bg-white">
                    <SelectValue placeholder="Select material" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="flex items-center gap-2 py-1 px-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: materialProperties['gold'].color }}></div>
                      <SelectItem value="gold">Gold</SelectItem>
                    </div>
                    <div className="flex items-center gap-2 py-1 px-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: materialProperties['silver'].color }}></div>
                      <SelectItem value="silver">Silver</SelectItem>
                    </div>
                    <div className="flex items-center gap-2 py-1 px-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: materialProperties['rose-gold'].color }}></div>
                      <SelectItem value="rose-gold">Rose Gold</SelectItem>
                    </div>
                  </SelectContent>
                </Select>
              </div>
              
              <Collapsible className="space-y-2">
                <CollapsibleTrigger className="flex items-center justify-between w-full text-left px-3 py-2 border border-gray-200 rounded-md bg-white shadow-sm">
                  <h3 className="text-sm font-medium text-gray-700">Rotation Controls</h3>
                  <ChevronDown className="h-3 w-3 text-gray-500" />
                </CollapsibleTrigger>
                <CollapsibleContent className="bg-white border border-gray-200 rounded-md p-3 shadow-sm">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <Label className="text-gray-600">Y Rotation</Label>
                      <span className="text-gray-900">{charmRotateY}°</span>
                    </div>
                    <Slider 
                      value={[charmRotateY]} 
                      min={0} 
                      max={360} 
                      step={15} 
                      onValueChange={(value) => setCharmRotateY(value[0])} 
                      className="mt-1"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 