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
import { ChevronDown, ShoppingCart, Download } from "lucide-react"
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
  const [ringSize, setRingSize] = useState(1.5) // New state for ring size
  const [ringThickness, setRingThickness] = useState(0.5) // New state for ring thickness
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
  
  // Mobile view state
  const [isMobile, setIsMobile] = useState(false)
  
  // Add state for mobile tab options
  const [attachmentOpen, setAttachmentOpen] = useState(false)
  const [charmOpen, setCharmOpen] = useState(false)
  
  // Add additional state for position tab collapsibles
  const [attachmentPositionOpen, setAttachmentPositionOpen] = useState(false)
  const [charmPositionOpen, setCharmPositionOpen] = useState(false)
  
  // Check screen size on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Function to increment/decrement values for mobile
  const adjustValue = (setter: React.Dispatch<React.SetStateAction<number>>, currentValue: number, step: number, min: number, max: number) => {
    setter(prev => Math.min(Math.max(prev + step, min), max))
  }
  
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
    <div className="grid grid-cols-1 md:grid-cols-2 h-auto gap-2 md:gap-8 font-quicksand">
      <div className="bg-secondary rounded-xl cute-shadow overflow-hidden relative h-[40vh] md:h-[60vh] mx-auto w-full md:max-w-[calc(60vh*1.2)] flex-shrink-0">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 z-10">
            <div className="bg-card p-4 rounded-xl cute-shadow">
              <p className="text-card-foreground">Creating your charm...</p>
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
                Try Again
              </Button>
            </div>
          </div>
        )}
        
        <Canvas 
          shadows={true}
          dpr={[1, 2]}
          style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
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
                  </group>
                )}
                
                {/* Attachment group with its own rotation and scale - separate from charm visibility */}
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
                        Math.PI / 2,
                        0
                      ]}
                    >
                      <torusGeometry args={[ringSize, ringThickness, 16, 32]} />
                      <meshStandardMaterial
                        {...materialProperties[materialType]}
                      />
                    </mesh>
                  )}
                </group>
              </group>
            </Stage>
          </Bounds>
          <OrbitControls makeDefault />
        </Canvas>
        
        {/* Overlay for STL upload if no mesh is imported and not in readOnly mode */}
        {!importedMesh && !readOnly && !stlUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm rounded-xl">
            <div className="bg-card p-6 rounded-xl cute-shadow max-w-md mx-auto">
              <h3 className="text-lg font-semibold mb-2 text-center text-card-foreground">Design Your Own Charm</h3>
              <p className="text-center text-muted-foreground mb-4">Standard size: 1 inch (25.4mm)</p>
              <ModelImport onImport={handleFileImport} />
            </div>
          </div>
        )}
      </div>
      
      {/* Add desktop controls here */}
      {!isMobile && (
        <div className="p-4 bg-white h-full rounded-xl cute-shadow flex flex-col">
          {/* Material and Chain type */}
          <div className="mb-4">
            <h3 className="text-xl font-semibold mb-3 text-foreground">Customize Your Jewelry</h3>
            
            {/* Add to Cart - moved to top */}
            <Button
              onClick={handleAddToCart}
              className="w-full bg-theme-dark text-white hover:bg-theme-darkest h-12 text-base mb-2"
            >
              <ShoppingCart className="mr-2 h-5 w-5" /> Add to Cart
            </Button>
            
            {/* Export STL as text link */}
            {importedMesh && (
              <div className="text-center mb-4">
                <button 
                  onClick={exportSTL}
                  className="text-sm text-muted-foreground hover:text-foreground underline flex items-center justify-center mx-auto"
                >
                  <Download className="h-4 w-4 mr-1" /> Export STL file
                </button>
              </div>
            )}
            
            {/* Metal Type selection */}
            <div className="mb-4">
              <h4 className="text-md font-medium mb-2 text-foreground">Metal Type</h4>
              <RadioGroup 
                value={materialType} 
                onValueChange={(value) => setMaterialType(value as 'gold' | 'silver')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="gold" id="gold-desktop" />
                  <Label htmlFor="gold-desktop" className="font-medium">Gold</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="silver" id="silver-desktop" />
                  <Label htmlFor="silver-desktop" className="font-medium">Silver</Label>
                </div>
              </RadioGroup>
            </div>
            
            {/* Jewelry Type Selection */}
            <div className="mb-4">
              <h4 className="text-md font-medium mb-2 text-foreground">Jewelry Type</h4>
              <RadioGroup 
                value={baseJewelryType} 
                onValueChange={(value) => setBaseJewelryType(value as JewelryBaseType)}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center space-x-2 py-1">
                  <RadioGroupItem value="none" id="charm-only-desktop" />
                  <Label htmlFor="charm-only-desktop" className="font-medium">Charm Only</Label>
                </div>
                <div className="flex items-center space-x-2 py-1">
                  <RadioGroupItem value="necklace" id="necklace-desktop" />
                  <Label htmlFor="necklace-desktop" className="font-medium">Charm with Chain (18")</Label>
                </div>
              </RadioGroup>
            </div>
            
            <Separator className="my-4" />
            
            {/* Side-by-side options for charm and attachment */}
            <div className="grid grid-cols-2 gap-4">
              {/* Charm Controls - Collapsible */}
              <Collapsible 
                className="mb-4"
                defaultOpen={false}
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-md font-medium text-foreground">Charm Options</h4>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="hover:bg-transparent">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                
                <CollapsibleContent className="mt-2 space-y-3">
                  <div className="flex justify-between items-center py-1">
                    <Label htmlFor="desktop-charm-visible" className="font-medium">Show Charm</Label>
                    <Switch 
                      id="desktop-charm-visible"
                      checked={charmVisible} 
                      onCheckedChange={setCharmVisible}
                    />
                  </div>
                  
                  <div className="pt-2">
                    <Label className="font-medium mb-1 block">Tilt Forward/Back</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[charmRotateX]}
                        min={-180}
                        max={180}
                        step={1}
                        onValueChange={(values) => setCharmRotateX(values[0])}
                      />
                      <span className="text-xs font-medium">{charmRotateX}°</span>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <Label className="font-medium mb-1 block">Rotate Left/Right</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[charmRotateY]}
                        min={-180}
                        max={180}
                        step={1}
                        onValueChange={(values) => setCharmRotateY(values[0])}
                      />
                      <span className="text-xs font-medium">{charmRotateY}°</span>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <Label className="font-medium mb-1 block">Tilt Side-to-Side</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[charmRotateZ]}
                        min={-180}
                        max={180}
                        step={1}
                        onValueChange={(values) => setCharmRotateZ(values[0])}
                      />
                      <span className="text-xs font-medium">{charmRotateZ}°</span>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
              
              {/* Attachment Controls - Collapsible */}
              <Collapsible 
                className="mb-4"
                defaultOpen={false}
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-md font-medium text-foreground">Attachment Options</h4>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="hover:bg-transparent">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                </div>
                
                <CollapsibleContent className="mt-2 space-y-3">
                  <div className="flex justify-between items-center py-1">
                    <Label htmlFor="desktop-attachment-ring" className="font-medium">Attachment Ring</Label>
                    <Switch 
                      id="desktop-attachment-ring"
                      checked={showAttachmentRing} 
                      onCheckedChange={setShowAttachmentRing}
                    />
                  </div>
                  
                  {showAttachmentRing && (
                    <>
                      <div className="pt-2">
                        <Label className="font-medium mb-1 block">Ring Size</Label>
                        <div className="flex items-center gap-2">
                          <Slider
                            value={[ringSize]}
                            min={0.5}
                            max={3}
                            step={0.1}
                            onValueChange={(values) => setRingSize(values[0])}
                          />
                          <span className="text-xs font-medium">{ringSize.toFixed(1)}mm</span>
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <Label className="font-medium mb-1 block">Ring Thickness</Label>
                        <div className="flex items-center gap-2">
                          <Slider
                            value={[ringThickness]}
                            min={0.1}
                            max={1}
                            step={0.1}
                            onValueChange={(values) => setRingThickness(values[0])}
                          />
                          <span className="text-xs font-medium">{ringThickness.toFixed(1)}mm</span>
                        </div>
                      </div>
                    </>
                  )}
                  
                  <div className="flex justify-between items-center py-1">
                    <Label htmlFor="desktop-extension-bar" className="font-medium">Extension Bar</Label>
                    <Switch 
                      id="desktop-extension-bar"
                      checked={showExtensionBar} 
                      onCheckedChange={setShowExtensionBar}
                    />
                  </div>
                  
                  {showExtensionBar && (
                    <div className="pt-2">
                      <Label className="font-medium mb-1 block">Extension Length</Label>
                      <div className="flex items-center gap-2">
                        <Slider
                          value={[extensionLength]}
                          min={1}
                          max={10}
                          step={0.5}
                          onValueChange={(values) => setExtensionLength(values[0])}
                        />
                        <span className="text-xs font-medium">{extensionLength}mm</span>
                      </div>
                    </div>
                  )}

                  <Separator className="my-2" />
                  <h5 className="text-sm font-medium text-foreground">Position Adjustment</h5>
                  
                  <div className="pt-2">
                    <Label className="font-medium mb-1 block">Rotate Attachment</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[attachmentRotateY]}
                        min={-180}
                        max={180}
                        step={1}
                        onValueChange={(values) => setAttachmentRotateY(values[0])}
                      />
                      <span className="text-xs font-medium">{attachmentRotateY}°</span>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <Label className="font-medium mb-1 block">Left/Right Position</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[attachmentPositionX]}
                        min={-5}
                        max={5}
                        step={0.1}
                        onValueChange={(values) => setAttachmentPositionX(values[0])}
                      />
                      <span className="text-xs font-medium">{attachmentPositionX}</span>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <Label className="font-medium mb-1 block">Up/Down Position</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[attachmentPositionY]}
                        min={-5}
                        max={5}
                        step={0.1}
                        onValueChange={(values) => setAttachmentPositionY(values[0])}
                      />
                      <span className="text-xs font-medium">{attachmentPositionY}</span>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <Label className="font-medium mb-1 block">Forward/Back Position</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[attachmentPositionZ]}
                        min={-5}
                        max={5}
                        step={0.1}
                        onValueChange={(values) => setAttachmentPositionZ(values[0])}
                      />
                      <span className="text-xs font-medium">{attachmentPositionZ}</span>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </div>
      )}

      {/* Mobile view - tabs right below the 3D preview */}
      {isMobile && (
        <div className="p-2 mb-4">
          {/* Actions - Add to Cart is more prominent now */}
          <div className="mb-4">
            <Button
              onClick={handleAddToCart}
              className="w-full bg-theme-dark text-white hover:bg-theme-darkest h-12 text-base"
            >
              <ShoppingCart className="mr-2 h-5 w-5" /> Add to Cart
            </Button>
            
            {/* Export STL moved to a subtle text link below */}
            {importedMesh && (
              <div className="mt-2 text-center">
                <button 
                  onClick={exportSTL}
                  className="text-xs text-muted-foreground hover:text-foreground underline flex items-center justify-center mx-auto"
                >
                  <Download className="h-3 w-3 mr-1" /> Export STL file
                </button>
              </div>
            )}
          </div>

          <Tabs defaultValue="jewelry" className="w-full">
            <TabsList className="w-full grid grid-cols-3 mb-2">
              <TabsTrigger value="jewelry">Jewelry</TabsTrigger>
              <TabsTrigger value="options">Options</TabsTrigger>
              <TabsTrigger value="position">Position</TabsTrigger>
            </TabsList>
            
            <TabsContent value="jewelry" className="space-y-3">
              {/* Metal Type selection */}
              <div className="mb-2 bg-card p-3 rounded-xl cute-shadow">
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
              <div className="mb-2 bg-card p-3 rounded-xl cute-shadow">
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
            </TabsContent>
            
            <TabsContent value="options" className="space-y-3">
              <div className="grid grid-cols-1 gap-2">
                {/* Attachment Options - Collapsible */}
                <Collapsible 
                  open={attachmentOpen} 
                  onOpenChange={setAttachmentOpen}
                  className="bg-card p-3 rounded-xl cute-shadow"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-card-foreground">Attachment</h3>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="hover:bg-transparent">
                        <ChevronDown className={`h-4 w-4 transition-transform ${attachmentOpen ? "transform rotate-180" : ""}`} />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  
                  <CollapsibleContent className="mt-2 space-y-3">
                    <div className="flex justify-between items-center py-1">
                      <Label htmlFor="mobile-attachment-ring" className="font-medium">Attachment Ring</Label>
                      <Switch 
                        id="mobile-attachment-ring"
                        checked={showAttachmentRing} 
                        onCheckedChange={setShowAttachmentRing}
                      />
                    </div>
                    
                    {showAttachmentRing && (
                      <>
                        <div className="py-1">
                          <div className="flex justify-between items-center">
                            <Label className="font-medium">Ring Size: {ringSize.toFixed(1)}mm</Label>
                            <div className="flex space-x-2 mobile-controls">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => adjustValue(setRingSize, ringSize, -0.1, 0.5, 3)}
                              >
                                -
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => adjustValue(setRingSize, ringSize, 0.1, 0.5, 3)}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="py-1">
                          <div className="flex justify-between items-center">
                            <Label className="font-medium">Ring Thickness: {ringThickness.toFixed(1)}mm</Label>
                            <div className="flex space-x-2 mobile-controls">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => adjustValue(setRingThickness, ringThickness, -0.1, 0.1, 1)}
                              >
                                -
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => adjustValue(setRingThickness, ringThickness, 0.1, 0.1, 1)}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                    
                    <div className="flex justify-between items-center py-1">
                      <Label htmlFor="mobile-extension-bar" className="font-medium">Extension Bar</Label>
                      <Switch 
                        id="mobile-extension-bar"
                        checked={showExtensionBar} 
                        onCheckedChange={setShowExtensionBar}
                      />
                    </div>
                    
                    {showExtensionBar && (
                      <div className="py-1">
                        <div className="flex justify-between items-center">
                          <Label className="font-medium">Length: {extensionLength}mm</Label>
                          <div className="flex space-x-2 mobile-controls">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => adjustValue(setExtensionLength, extensionLength, -0.5, 1, 10)}
                              disabled={extensionLength <= 1}
                            >
                              -
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => adjustValue(setExtensionLength, extensionLength, 0.5, 1, 10)}
                              disabled={extensionLength >= 10}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
                
                {/* Charm Options - Collapsible */}
                <Collapsible 
                  open={charmOpen} 
                  onOpenChange={setCharmOpen}
                  className="bg-card p-3 rounded-xl cute-shadow"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-card-foreground">Charm</h3>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="hover:bg-transparent">
                        <ChevronDown className={`h-4 w-4 transition-transform ${charmOpen ? "transform rotate-180" : ""}`} />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  
                  <CollapsibleContent className="mt-2 space-y-3">
                    <div className="flex justify-between items-center py-1">
                      <Label htmlFor="mobile-charm-visible" className="font-medium">Show Charm</Label>
                      <Switch 
                        id="mobile-charm-visible"
                        checked={charmVisible} 
                        onCheckedChange={setCharmVisible}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </TabsContent>
            
            <TabsContent value="position" className="space-y-3">
              <div className="grid grid-cols-1 gap-2">
                {/* Attachment Position - Collapsible */}
                <Collapsible 
                  open={attachmentPositionOpen} 
                  onOpenChange={setAttachmentPositionOpen}
                  className="bg-card p-3 rounded-xl cute-shadow"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-card-foreground">Attachment Position</h3>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="hover:bg-transparent">
                        <ChevronDown className={`h-4 w-4 transition-transform ${attachmentPositionOpen ? "transform rotate-180" : ""}`} />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  
                  <CollapsibleContent className="mt-2 space-y-3">
                    <div className="py-1">
                      <div className="flex justify-between items-center">
                        <Label className="font-medium">Rotation: {attachmentRotateY}°</Label>
                        <div className="flex space-x-2 mobile-controls">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => adjustValue(setAttachmentRotateY, attachmentRotateY, -10, -180, 180)}
                          >
                            -
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => adjustValue(setAttachmentRotateY, attachmentRotateY, 10, -180, 180)}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="py-1">
                      <div className="flex justify-between items-center">
                        <Label className="font-medium">Left/Right: {attachmentPositionX}</Label>
                        <div className="flex space-x-2 mobile-controls">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => adjustValue(setAttachmentPositionX, attachmentPositionX, -0.2, -5, 5)}
                          >
                            -
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => adjustValue(setAttachmentPositionX, attachmentPositionX, 0.2, -5, 5)}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="py-1">
                      <div className="flex justify-between items-center">
                        <Label className="font-medium">Up/Down: {attachmentPositionY}</Label>
                        <div className="flex space-x-2 mobile-controls">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => adjustValue(setAttachmentPositionY, attachmentPositionY, -0.2, -5, 5)}
                          >
                            -
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => adjustValue(setAttachmentPositionY, attachmentPositionY, 0.2, -5, 5)}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="py-1">
                      <div className="flex justify-between items-center">
                        <Label className="font-medium">Forward/Back: {attachmentPositionZ}</Label>
                        <div className="flex space-x-2 mobile-controls">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => adjustValue(setAttachmentPositionZ, attachmentPositionZ, -0.2, -5, 5)}
                          >
                            -
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => adjustValue(setAttachmentPositionZ, attachmentPositionZ, 0.2, -5, 5)}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
                
                {/* Charm Position - Collapsible */}
                <Collapsible 
                  open={charmPositionOpen} 
                  onOpenChange={setCharmPositionOpen}
                  className="bg-card p-3 rounded-xl cute-shadow"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-card-foreground">Charm Rotation</h3>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="hover:bg-transparent">
                        <ChevronDown className={`h-4 w-4 transition-transform ${charmPositionOpen ? "transform rotate-180" : ""}`} />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  
                  <CollapsibleContent className="mt-2 space-y-3">
                    <div className="py-1">
                      <div className="flex justify-between items-center">
                        <Label className="font-medium">X Rotation: {charmRotateX}°</Label>
                        <div className="flex space-x-2 mobile-controls">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => adjustValue(setCharmRotateX, charmRotateX, -10, -180, 180)}
                          >
                            -
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => adjustValue(setCharmRotateX, charmRotateX, 10, -180, 180)}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="py-1">
                      <div className="flex justify-between items-center">
                        <Label className="font-medium">Y Rotation: {charmRotateY}°</Label>
                        <div className="flex space-x-2 mobile-controls">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => adjustValue(setCharmRotateY, charmRotateY, -10, -180, 180)}
                          >
                            -
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => adjustValue(setCharmRotateY, charmRotateY, 10, -180, 180)}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="py-1">
                      <div className="flex justify-between items-center">
                        <Label className="font-medium">Z Rotation: {charmRotateZ}°</Label>
                        <div className="flex space-x-2 mobile-controls">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => adjustValue(setCharmRotateZ, charmRotateZ, -10, -180, 180)}
                          >
                            -
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => adjustValue(setCharmRotateZ, charmRotateZ, 10, -180, 180)}
                          >
                            +
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}