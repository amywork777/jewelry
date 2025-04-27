"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { ArrowLeft, Search, Sparkles, ImageIcon, X, ShoppingCart, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js"
import { useToast } from "@/components/ui/use-toast"
import JewelryViewer from "@/app/viewer/components/JewelryViewer"

type JewelryType = "ring" | "necklace" | "earrings" | "bracelet" | "pendant" | "charm"
type Material = "gold" | "silver" | "rosegold" | "platinum"
// Size is now fixed at approximately 1 inch

interface JewelryItem {
  id: number
  type: JewelryType
  name: string
  stlPath: string
  price: number
  description: string
}

// Function to generate an STL model from AI
async function generateSTLFromAI(prompt: string, updateProgress: (progress: number) => void): Promise<{ modelUrl: string | null; baseModelUrl: string | null }> {
  try {
    // 1. Submit the prompt to start generation
    // Call our API route, which will call the Tripo API
    const response = await fetch("/api/tripo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error from Tripo API:", errorData);
      throw new Error(errorData.error || "Failed to start model generation");
    }
    
    const data = await response.json();
    const taskId = data.taskId;
    
    if (!taskId) {
      throw new Error("No task ID in response");
    }
    
    console.log("Model generation started with task ID:", taskId);
    
    // Step 2: Poll for task status until completed
    let modelUrl: string | null = null;
    let baseModelUrl: string | null = null;
    let renderedImage: string | null = null;
    let maxRetries = 5; // Increased retries
    let retryCount = 0;
    let previousProgress = 0;
    
    // We'll retry up to 5 times if we get a success status but no model URL
    while (retryCount <= maxRetries) {
      const result = await pollTaskStatus(taskId, (progress) => {
        // Only update if progress has changed to avoid unnecessary renders
        if (progress !== previousProgress) {
          updateProgress(progress);
          previousProgress = progress;
        }
      });
      
      console.log("Model generation status:", result.status, ", progress:", result.progress + "%");
      
      if (result.status === "success") {
        // Try to get model URL from the response
        if (result.modelUrl) {
          modelUrl = result.modelUrl;
          baseModelUrl = result.baseModelUrl;
          break;
        } else if (result.baseModelUrl) {
          // If no modelUrl but baseModelUrl exists, use that
          modelUrl = result.baseModelUrl;
          baseModelUrl = result.baseModelUrl;
          break;
        } 
        
        // Keep track of rendered image (useful for fallback)
        if (result.renderedImage) {
          renderedImage = result.renderedImage;
        }
        
        // If we have rendered image but no model URL, wait a bit and retry
        // Sometimes the model takes longer to process even after status is success
        if (retryCount < maxRetries) {
          console.log(`No model URL yet, retrying in 3 seconds (attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          retryCount++;
          continue;
        }
        
        // Last effort: If we have a rendered image URL pattern, try to transform it to a model URL
        if (renderedImage && !modelUrl && retryCount >= maxRetries) {
          try {
            // Extract task ID and directory pattern from rendered image URL
            const imageUrl = new URL(renderedImage);
            const pathname = imageUrl.pathname;
            const directoryPath = pathname.substring(0, pathname.lastIndexOf('/') + 1);
            
            // Construct potential model URLs to try - we'll try these in the frontend
            modelUrl = `${imageUrl.protocol}//${imageUrl.host}${directoryPath}mesh.glb${imageUrl.search}`;
            console.log(`Using derived model URL from renderedImage: ${modelUrl}`);
            break;
          } catch (e) {
            console.error("Error deriving model URL from rendered image:", e);
          }
        }
        
        // If we're here and retryCount is maxRetries, we've exhausted our retries
        if (retryCount >= maxRetries) {
          if (renderedImage) {
            // If we have a rendered image but no model, we'll use a placeholder model
            // but at least we know the generation completed successfully
            console.log("No model URL after all retries, but generation succeeded. Using placeholder model.");
            return { modelUrl: "placeholder", baseModelUrl: null };
          }
          throw new Error("No model URL in successful response");
        }
      } else if (result.status === "failed") {
        throw new Error("Model generation failed");
      }
    }
    
    if (!modelUrl && !renderedImage) {
      throw new Error("No model URL or rendered image in successful response");
    }
    
    // Construct a unique name for the model based on the prompt
    const modelName = prompt.toLowerCase()
      .replace(/[^\w\s]/g, '')  // Remove special characters
      .replace(/\s+/g, '-')     // Replace spaces with hyphens
      .substring(0, 30);        // Limit length
    
    // AI generated a valid model URL or at least a fallback
    return { modelUrl: modelUrl || "placeholder", baseModelUrl };
  } catch (error) {
    console.error("Error in generateSTLFromAI:", error);
    throw error; // Re-throw to allow proper handling in calling code
  }
}

// Update the pollTaskStatus function to improve error handling
async function pollTaskStatus(
  taskId: string,
  progressCallback: (progress: number) => void
): Promise<{ status: string; progress: number; modelUrl: string | null; baseModelUrl: string | null; renderedImage: string | null }> {
  const maxAttempts = 120; // 10 minutes max (with 5-second intervals)
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    // Use the task-status endpoint instead of tripo
    const statusResponse = await fetch(`/api/task-status?taskId=${taskId}`);
    
    if (!statusResponse.ok) {
      // Wait and retry if we get a server error (could be temporary)
      if (statusResponse.status >= 500) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
        continue;
      }
      
      const errorData = await statusResponse.json();
      console.error("Status check error:", errorData);
      throw new Error(`Failed to check status: ${statusResponse.status} ${statusResponse.statusText}`);
    }
    
    const statusData = await statusResponse.json();
    
    // Report progress back to caller
    progressCallback(statusData.progress || 0);
    
    if (statusData.status === "success" || statusData.status === "failed") {
      return statusData;
    }
    
    // Wait before checking again
    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;
  }
  
  throw new Error("Timeout: Model generation took too long");
}

export default function CustomizerPage() {
  const [searchText, setSearchText] = useState("")
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [selectedJewelry, setSelectedJewelry] = useState<JewelryItem | null>(null)
  const [selectedMaterial, setSelectedMaterial] = useState<Material>("gold")
  const [showBaseShape, setShowBaseShape] = useState(true)
  
  const [isLoading, setIsLoading] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationError, setGenerationError] = useState<string | null>(null)
  const [aiGeneratedModel, setAIGeneratedModel] = useState<string | null>(null)
  const [aiGeneratedName, setAIGeneratedName] = useState<string>("")
  const [generatedStlUrl, setGeneratedStlUrl] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropAreaRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const modelRef = useRef<THREE.Object3D | null>(null)
  
  const { toast } = useToast()
  
  const handleAIClick = async () => {
    if (!searchText.trim() || isLoading) return;
    
    // Set the AI generated name for display during loading
    setAIGeneratedName(searchText.trim());
    setIsLoading(true);
    setGenerationProgress(0);
    setGenerationError(null);
    
    try {
      // Clean up any existing 3D objects
      if (modelRef.current) {
        cleanupObject(modelRef.current);
        sceneRef.current?.remove(modelRef.current);
        modelRef.current = null;
      }
      
      // Create a placeholder for the loading state
      createPlaceholderModel(true);
      
      // Generate STL from AI
      const { modelUrl, baseModelUrl } = await generateSTLFromAI(
        searchText,
        (progress) => setGenerationProgress(progress)
      );
      
      if (!modelUrl) {
        throw new Error("Failed to generate 3D model");
      }
      
      console.log("AI generated model URL:", modelUrl);
      console.log("Base model URL:", baseModelUrl);
      
      // Store the generated model URLs
      setAIGeneratedModel(modelUrl);
      setGeneratedStlUrl(modelUrl);
      
      // Create a new item for the AI generated model
      const newItem: JewelryItem = {
        id: Date.now(), // Use timestamp as a unique ID
        type: "charm", // Default to pendant type
        name: searchText,
        stlPath: modelUrl, // Use the URL from the AI generation
        price: 149.99,
        description: `Custom ${searchText} design generated with AI.`
      };
      
      // Set the new item as selected
      setSelectedJewelry(newItem);
      
      // Clean up the placeholder
      if (modelRef.current) {
        cleanupObject(modelRef.current);
        sceneRef.current?.remove(modelRef.current);
        modelRef.current = null;
      }
      
    } catch (error) {
      console.error("Error in AI generation:", error);
      setGenerationError(error instanceof Error ? error.message : "Unknown error");
      
      // Create a placeholder to show error state
      createColorfulPlaceholder();
    } finally {
      setIsLoading(false);
    }
  };
  
  // Sample jewelry items
  const jewelryItems: JewelryItem[] = [
    {
      id: 1,
      type: "ring",
      name: "Classic Diamond Ring",
      stlPath: "/models/ring.stl", // These would be real paths in a production app
      price: 799.99,
      description: "Elegant diamond ring with a timeless design"
    },
    {
      id: 2,
      type: "necklace",
      name: "Pearl Pendant Necklace",
      stlPath: "/models/necklace.stl",
      price: 549.99,
      description: "Beautiful pearl pendant on a delicate chain"
    },
    {
      id: 3,
      type: "earrings",
      name: "Sapphire Stud Earrings",
      stlPath: "/models/earrings.stl",
      price: 399.99,
      description: "Stunning sapphire studs for everyday elegance"
    },
    {
      id: 4,
      type: "bracelet",
      name: "Tennis Bracelet",
      stlPath: "/models/bracelet.stl",
      price: 1299.99,
      description: "Sparkling tennis bracelet with premium diamonds"
    },
    {
      id: 5,
      type: "pendant",
      name: "Heart Locket",
      stlPath: "/models/pendant.stl",
      price: 349.99,
      description: "Heart-shaped locket for your precious memories"
    }
  ]
  
  // Sample search results
  const searchResults = jewelryItems.filter(item => 
    item.name.toLowerCase().includes(searchText.toLowerCase()) || 
    item.description.toLowerCase().includes(searchText.toLowerCase()) ||
    item.type.toLowerCase().includes(searchText.toLowerCase())
  ).slice(0, 3)
  
  // Materials with their corresponding colors and enhanced properties
  const materials = {
    gold: new THREE.MeshPhysicalMaterial({ 
      color: 0xFFD700, 
      metalness: 1.0, 
      roughness: 0.005, // Reduced roughness for more shine
      reflectivity: 1.0,
      clearcoat: 1.0, // Increased clearcoat for more shine
      clearcoatRoughness: 0.02,
      envMapIntensity: 8.0, // Increased envMap intensity for stronger reflections
      emissive: 0x332200,
      emissiveIntensity: 0.25 // Slightly increased emissive intensity
    }),
    silver: new THREE.MeshPhysicalMaterial({ 
      color: 0xFFFFFF, 
      metalness: 1.0, 
      roughness: 0.005, // Reduced roughness further
      reflectivity: 1.0,
      clearcoat: 0.9, // Increased clearcoat
      clearcoatRoughness: 0.01,
      envMapIntensity: 8.5, // Increased envMap intensity
      emissive: 0x333333,
      emissiveIntensity: 0.15 // Slightly increased emissive intensity
    }),
    rosegold: new THREE.MeshPhysicalMaterial({ 
      color: 0xFFCCB4, 
      metalness: 1.0, 
      roughness: 0.008, // Reduced roughness
      reflectivity: 1.0,
      clearcoat: 0.95, // Increased clearcoat
      clearcoatRoughness: 0.02,
      envMapIntensity: 7.5, // Increased envMap intensity
      emissive: 0x441100,
      emissiveIntensity: 0.25 // Increased emissive intensity
    }),
    platinum: new THREE.MeshPhysicalMaterial({ 
      color: 0xF0F0F0, 
      metalness: 1.0, 
      roughness: 0.002, // Further reduced roughness for platinum
      reflectivity: 1.0,
      clearcoat: 1.0, // Maximum clearcoat
      clearcoatRoughness: 0.01, 
      envMapIntensity: 9.0, // Increased envMap intensity significantly
      emissive: 0x222222,
      emissiveIntensity: 0.15 // Slightly increased emissive intensity
    })
  }
  
  // Initialize Three.js scene with useEffect
  useEffect(() => {
    if (!canvasRef.current) return
    
    // Setup renderer with high quality settings
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: "high-performance",
      precision: "highp"
    })
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 2.0
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    canvasRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer
    
    // Setup scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)
    sceneRef.current = scene
    
    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      35, 
      canvasRef.current.clientWidth / canvasRef.current.clientHeight, 
      0.1, 
      1000
    )
    camera.position.set(0, 0, 12)
    cameraRef.current = camera
    
    // Add environment map for realistic reflections
    const envMap = new THREE.WebGLCubeRenderTarget(128).texture
    scene.environment = envMap
    
    // Update materials with environment
    Object.values(materials).forEach(material => {
      material.envMap = envMap
    })
    
    // Add standard lighting setup without trying to load external HDR
    // Ambient light for general illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5)
    scene.add(ambientLight)
    
    // Main key light
    const mainLight = new THREE.DirectionalLight(0xffffff, 3.5)
    mainLight.position.set(5, 8, 5)
    mainLight.castShadow = true
    mainLight.shadow.mapSize.width = 2048
    mainLight.shadow.mapSize.height = 2048
    mainLight.shadow.camera.near = 0.5
    mainLight.shadow.camera.far = 50
    scene.add(mainLight)
    
    // Fill light
    const fillLight = new THREE.DirectionalLight(0xffffff, 3.0)
    fillLight.position.set(-5, 2, 2)
    scene.add(fillLight)
    
    // Rim light
    const rimLight = new THREE.DirectionalLight(0xffffff, 2.5)
    rimLight.position.set(0, -5, -5)
    scene.add(rimLight)
    
    // Add spotlight for distinct highlights on the metal
    const spotLight = new THREE.SpotLight(0xffffff, 5.0)
    spotLight.position.set(0, 10, 0)
    spotLight.angle = Math.PI / 6
    spotLight.penumbra = 0.5
    spotLight.decay = 2
    spotLight.distance = 50
    spotLight.castShadow = true
    spotLight.shadow.mapSize.width = 2048
    spotLight.shadow.mapSize.height = 2048
    scene.add(spotLight)
    
    // Setup OrbitControls with better settings
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.screenSpacePanning = false
    controls.minDistance = 5
    controls.maxDistance = 15
    controls.maxPolarAngle = Math.PI / 1.5
    controls.target.set(0, 0, 0)
    controlsRef.current = controls
    
    // Animation loop with auto rotation
    let autoRotate = true
    let rotationSpeed = 0.005
    
    const animate = () => {
      requestAnimationFrame(animate)
      
      // Auto-rotate the model directly instead of platform
      if (autoRotate && modelRef.current) {
        modelRef.current.rotation.y += rotationSpeed
      }
      
      controls.update()
      renderer.render(scene, camera)
    }
    
    animate()
    
    // Toggle auto-rotation on canvas click
    const handleCanvasClick = () => {
      autoRotate = !autoRotate
    }
    
    renderer.domElement.addEventListener('click', handleCanvasClick)
    
    // Set default jewelry item if not already set
    if (!selectedJewelry) {
      setSelectedJewelry(jewelryItems[0])
    }
    
    // Cleanup
    return () => {
      renderer.domElement.removeEventListener('click', handleCanvasClick)
      
      if (rendererRef.current) {
        rendererRef.current.dispose()
        canvasRef.current?.removeChild(rendererRef.current.domElement)
      }
      
      // Dispose of all materials
      Object.values(materials).forEach(material => {
        material.dispose()
      })
    }
  }, []) // Empty dependency array to run only once
  
  // Function to load a model when selectedJewelry changes
  useEffect(() => {
    if (selectedJewelry) {
      setIsLoading(true)
      
      if (selectedJewelry.stlPath === aiGeneratedModel) {
        if (generatedStlUrl) {
          // This is an AI model with a base model URL
          loadSTLModel(generatedStlUrl)
        } else {
          // No model yet, create placeholder
          createPlaceholderModel(true)
        }
      } else if (selectedJewelry.stlPath.endsWith('.stl')) {
        // Load STL file
        loadSTLModel(selectedJewelry.stlPath)
      } else if (selectedJewelry.stlPath.endsWith('.gltf') || selectedJewelry.stlPath.endsWith('.glb')) {
        // Load GLTF file
        loadGLTFModel(selectedJewelry.stlPath)
      } else {
        // Create a placeholder for regular products
        createPlaceholderModel(false)
      }
    } else {
      // No jewelry selected, create simple placeholder
      createPlaceholderModel(false)
    }
  }, [selectedJewelry, aiGeneratedModel, generatedStlUrl, selectedMaterial, showBaseShape])
  
  // Convert remote model to STL and load it
  const convertAndLoadSTL = async (modelUrl: string) => {
    try {
      // If it's already an STL file, load it directly
      if (modelUrl.endsWith('.stl')) {
        console.log('Loading STL model directly:', modelUrl);
        await loadSTLModel(modelUrl);
        return;
      }

      console.log('Converting model to STL:', modelUrl);
      
      // Extract the task ID from the URL if possible (UUID format)
      let taskId: string | null = null;
      const taskIdMatch = modelUrl.match(/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i);
      if (taskIdMatch && taskIdMatch[1]) {
        taskId = taskIdMatch[1];
        console.log('Extracted task ID from URL:', taskId);
      }
      
      // Use our proxy endpoint to avoid CORS issues - but only once
      // First check if this is already a proxied URL to avoid nesting
      const isAlreadyProxied = modelUrl.includes('/api/model-proxy');
      
      const proxyUrl = isAlreadyProxied ? 
        modelUrl : // Use as is if already proxied
        `/api/model-proxy?url=${encodeURIComponent(modelUrl)}${taskId ? `&taskId=${taskId}` : ''}`;
      
      try {
        // First try loading directly with STL loader
        console.log('Attempting to load with STL loader:', proxyUrl);
        await loadSTLModel(proxyUrl);
        return;
      } catch (stlError) {
        console.error('Failed to load as STL:', stlError);
        
        // If STL loading fails, try GLB/GLTF loader
        try {
          console.log('Attempting to load with GLTF loader');
          await loadGLTFModel(proxyUrl);
          return;
        } catch (glbError) {
          console.error('Failed to load as GLB/GLTF:', glbError);
        }
      }
      
      // If model loading failed, try to get an image instead
      try {
        console.log('All 3D loading failed, checking for rendered image');
        const taskApiEndpoint = taskId ? 
          `/api/task-status?taskId=${taskId}` : 
          `/api/tripo`;
        
        const taskResponse = await fetch(taskApiEndpoint);
        
        if (taskResponse.ok) {
          const taskData = await taskResponse.json();
          
          if (taskData.renderedImage) {
            console.log('Using rendered image as fallback');
            // Pass forceImageRedirect flag to ensure it's treated as an image
            const imageUrl = `/api/model-proxy?url=${encodeURIComponent(taskData.renderedImage)}&forceImageRedirect=true`;
            
            const success = await createImagePlane(imageUrl);
            if (success) {
              toast({
                title: "3D Model Preview",
                description: "We're showing a 2D preview instead of a 3D model.",
                duration: 5000,
              });
              setIsLoading(false);
              return;
            }
          }
        }
      } catch (imageError) {
        console.error('Failed to load fallback image:', imageError);
      }
      
      // Last resort - create a placeholder model
      console.error('All loading methods failed, creating placeholder');
      createPlaceholderModel(true);
      setIsLoading(false);
      
    } catch (error) {
      console.error('Error in convertAndLoadSTL:', error);
      createPlaceholderModel(true);
      setIsLoading(false);
    }
  };

  // Function to load STL model
  const loadSTLModel = (modelUrl: string) => {
    return new Promise<void>((resolve, reject) => {
      console.log('Loading STL model from:', modelUrl);
      const loader = new STLLoader();
      
      loader.load(
        modelUrl,
        (geometry) => {
          try {
            // Calculate the bounding box to center and scale the model
            geometry.computeBoundingBox();
            const boundingBox = geometry.boundingBox!;
            const center = new THREE.Vector3();
            boundingBox.getCenter(center);
            
            // Calculate the size for proper scaling
            const size = new THREE.Vector3();
            boundingBox.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 5 / maxDim; // Scale to fit in a 5-unit box
            
            // Create mesh with the selected material (default to gold if not selected)
            const materialToUse = selectedMaterial ? materials[selectedMaterial] : materials["gold"];
            const mesh = new THREE.Mesh(geometry, materialToUse);
            
            // Center the model
            mesh.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
            mesh.scale.set(scale, scale, scale);
            
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            
            // Remove existing model if present
            cleanupObject(modelRef.current);
            
            // Add model to scene
            sceneRef.current?.add(mesh);
            modelRef.current = mesh;
            
            // Center camera on model
            if (controlsRef.current) {
              controlsRef.current.reset();
            }
            
            setIsLoading(false);
            console.log('STL model loaded successfully');
            resolve();
          } catch (geometryError) {
            console.error('Error processing STL geometry:', geometryError);
            reject(geometryError);
          }
        },
        (xhr) => {
          console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (error) => {
          console.error('Error loading STL:', error);
          reject(error);
        }
      );
    });
  };
  
  // Load GLTF/GLB model with server-side proxy
  const loadGLTFModel = (modelUrl: string) => {
    console.log("Loading GLB model from:", modelUrl);
    
    // Create a proxy URL to avoid CORS issues with external model URLs
    // Only create a proxy URL if it's not already proxied
    const isAlreadyProxied = modelUrl.includes('/api/model-proxy');
    const proxyUrl = isAlreadyProxied ? 
      modelUrl : // Use as is if already proxied
      `/api/model-proxy?url=${encodeURIComponent(modelUrl)}`;
      
    console.log("Using proxied URL:", proxyUrl);
    
    const loader = new GLTFLoader();
    setIsLoading(true);
    
    loader.load(
      proxyUrl,
      (gltf) => {
        const model = gltf.scene;
        
        // Calculate bounding box for the entire model
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        
        // Scale and center the model
        const scale = 5 / maxDim;
        model.scale.set(scale, scale, scale);
        
        // Center the model based on its bounding box
        const center = new THREE.Vector3();
        box.getCenter(center);
        model.position.x = -center.x * scale;
        model.position.y = -center.y * scale;
        model.position.z = -center.z * scale;
        
        // Apply material to all meshes in the model
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            // Save original material for reference
            const originalMaterial = child.material;
            
            // Use our own material but copy some properties if possible
            const materialToUse = materials[selectedMaterial];
            child.material = materialToUse;
            
            // Setup shadows
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        // Apply size scaling
        const sizeScale = 1.0;
        model.scale.set(sizeScale, sizeScale, sizeScale);
        
        // Add model to scene
        if (sceneRef.current) {
          // Remove existing model if any
          cleanupObject(modelRef.current)
          
          sceneRef.current.add(model);
          modelRef.current = model;
          
          // Reset camera position
          if (controlsRef.current) {
            controlsRef.current.reset();
          }
        }
        
        setIsLoading(false);
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
      },
      (error) => {
        console.error("Error loading GLB/GLTF:", error);
        setIsLoading(false);
        
        // If we can't load the model directly, try to convert it to STL first
        convertAndLoadSTL(modelUrl);
      }
    );
  };
  
  // Helper function to create a plane with the rendered image
  const createImagePlane = async (imageUrl: string) => {
    if (!sceneRef.current) return false;
    
    console.log("Creating image plane with URL:", imageUrl.substring(0, 100) + "...");
    
    try {
      // Add loading indicator
      setIsLoading(true);
      
      // First try to load the image through our proxy to avoid CORS issues
      // Only create proxy URL if not already proxied
      const isAlreadyProxied = imageUrl.includes('/api/model-proxy');
      const proxiedImageUrl = isAlreadyProxied ? 
        imageUrl : 
        `/api/model-proxy?url=${encodeURIComponent(imageUrl)}&forceImageRedirect=true`;
        
      console.log("Using proxied image URL:", proxiedImageUrl);
      
      // Create a textured plane with the image
      const planeGeometry = new THREE.PlaneGeometry(5, 5);
      
      // Load image with promise-based approach to handle errors better
      try {
        const texture = await new Promise<THREE.Texture>((resolve, reject) => {
          const loader = new THREE.TextureLoader();
          
          // Add event listeners to img element to catch CORS errors
          const origLoad = loader.load;
          loader.load = function(url, onLoad, onProgress, onError) {
            const imgElement = document.createElement('img');
            
            // Add error listener before setting src
            imgElement.addEventListener('error', (e) => {
              console.log("Image loading error intercepted, trying base64 fallback");
              
              // Try to load a placeholder texture instead
              const placeholderTexture = createFallbackTexture();
              resolve(placeholderTexture);
            });
            
            // Call original with adjusted callbacks
            return origLoad.call(
              this, 
              url, 
              onLoad, 
              onProgress, 
              (error) => {
                console.error("TextureLoader error:", error);
                if (onError) onError(error);
                
                // Create a fallback texture with prompt name
                const placeholderTexture = createFallbackTexture();
                resolve(placeholderTexture);
              }
            );
          };
          
          loader.load(
            proxiedImageUrl,
            (loadedTexture) => {
              // Adjust aspect ratio based on the loaded image
              if (loadedTexture.image) {
                const aspectRatio = loadedTexture.image.width / loadedTexture.image.height;
                planeGeometry.scale(aspectRatio, 1, 1);
              }
              resolve(loadedTexture);
            },
            undefined,
            (error) => {
              console.error("TextureLoader error callback:", error);
              // Will be handled by the error interceptor above
              reject(error);
            }
          );
        });
        
        // Create material with loaded texture
        const planeMaterial = new THREE.MeshBasicMaterial({ 
          map: texture, 
          side: THREE.DoubleSide,
          transparent: true
        });
        
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        
        // Center the plane
        plane.position.set(0, 0, 0);
        
        // Cleanup existing model
        cleanupObject(modelRef.current);
        
        // Add plane to scene
        sceneRef.current.add(plane);
        modelRef.current = plane;
        
        // Show message to user
        toast({
          title: "3D Model",
          description: "Only a 2D render is available for this design. The actual 3D model couldn't be loaded.",
          duration: 5000
        });
        
        setIsLoading(false);
        return true;
      } catch (loadError) {
        console.error("Texture loading failed:", loadError);
        createPlaceholderModel(true);
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error("Failed to create image plane:", error);
      createPlaceholderModel(true);
      setIsLoading(false);
      return false;
    }
  };
  
  // Create a fallback texture with text
  const createFallbackTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Fill background
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw border
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 4;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
      
      // Add text
      ctx.fillStyle = '#333';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('AI Generated Design', canvas.width/2, canvas.height/2 - 40);
      
      // Add description text
      ctx.font = '24px Arial';
      const prompt = aiGeneratedName || "Custom Design";
      const maxWidth = canvas.width - 60;
      
      // Handle text wrapping
      const words = prompt.split(' ');
      let line = '';
      let y = canvas.height/2 + 20;
      
      for(let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && i > 0) {
          ctx.fillText(line, canvas.width/2, y);
          line = words[i] + ' ';
          y += 30;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, canvas.width/2, y);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };
  
  // Create a colorful placeholder when image loading fails
  const createColorfulPlaceholder = () => {
    if (!sceneRef.current) return;
    
    // Clean up existing model
    if (modelRef.current && modelRef.current.parent) {
      modelRef.current.parent.remove(modelRef.current);
    }
    
    // Create a geometry
    const geometry = new THREE.SphereGeometry(2, 32, 32);
    
    // Create a material
    const material = new THREE.MeshStandardMaterial({
      color: selectedMaterial === 'gold' ? 0xFFD700 : 
             selectedMaterial === 'silver' ? 0xC0C0C0 : 
             selectedMaterial === 'rosegold' ? 0xB76E79 : 0xE5E4E2,
      metalness: 0.8,
      roughness: 0.2
    });
    
    // Create mesh and add to scene
    const mesh = new THREE.Mesh(geometry, material);
    sceneRef.current.add(mesh);
    modelRef.current = mesh;
    
    // Add animation
    const animate = () => {
      if (!mesh || !sceneRef.current) return;
      
      mesh.rotation.y += 0.01;
      requestAnimationFrame(animate);
    };
    
    animate();
    
    setIsLoading(false);
  };
  
  // Function to create placeholder models for catalog items or AI-generated items
  const createPlaceholderModel = (isAIGenerated = false) => {
    // Check if selectedJewelry is null
    if (!selectedJewelry || !sceneRef.current) {
      // Create a default sphere as placeholder when no jewelry is selected
      if (sceneRef.current) {
        const defaultGeometry = new THREE.SphereGeometry(2, 32, 32)
        const mesh = new THREE.Mesh(defaultGeometry, materials[selectedMaterial])
        mesh.castShadow = true
        mesh.receiveShadow = true
        sceneRef.current.add(mesh)
        modelRef.current = mesh
        setIsLoading(false)
      }
      return
    }
    
    // Clean up existing model
    if (modelRef.current && sceneRef.current) {
      cleanupObject(modelRef.current)
    }
    
    // Create more detailed placeholder geometry based on the jewelry type
    let geometry: THREE.BufferGeometry
    
    // For AI-generated jewelry without a model, create a more special placeholder
    if (isAIGenerated) {
      // Create a special placeholder for AI-generated jewelry
      // This could be a more complex shape to indicate it's AI-generated
      
      // Let's create a fancy geometry for AI models when we don't have the actual model
      const randomSeed = selectedJewelry.id % 5; // Use the ID to get consistent but different shapes
      
      // Skip base shape creation if showBaseShape is false
      if (!showBaseShape) {
        // Create a minimal representation or an empty group
        const emptyGroup = new THREE.Group();
        if (sceneRef.current) {
          sceneRef.current.add(emptyGroup);
          modelRef.current = emptyGroup as unknown as THREE.Mesh;
          setIsLoading(false);
        }
        return;
      }
      
      switch (randomSeed) {
        case 0:
          // Icosahedron (20-sided polyhedron) - good for gem-like jewelry
          geometry = new THREE.IcosahedronGeometry(2, 1);
          break;
        case 1:
          // Torus knot - good for complex jewelry pieces
          geometry = new THREE.TorusKnotGeometry(1.5, 0.4, 128, 32, 2, 5);
          break;
        case 2:
          // Dodecahedron (12-sided polyhedron) - good for pendant-like jewelry
          geometry = new THREE.DodecahedronGeometry(2, 1);
          break;
        case 3:
          // Special ring shape with gemstone
          const ringGroup = new THREE.Group() as unknown as THREE.BufferGeometry;
          const ringGeometry = new THREE.TorusGeometry(1.8, 0.4, 32, 100);
          const ringMesh = new THREE.Mesh(ringGeometry, materials[selectedMaterial]);
          
          // Add a gemstone
          const gemGeometry = new THREE.OctahedronGeometry(0.8, 2);
          const gemMaterial = new THREE.MeshPhysicalMaterial({
            color: 0x9370DB, // Medium purple for AI-generated gems
            metalness: 0.0,
            roughness: 0.0,
            transmission: 0.95,
            thickness: 0.5,
            envMapIntensity: 1.5,
            clearcoat: 1.0,
            clearcoatRoughness: 0.0,
            ior: 2.5,
            reflectivity: 1.0
          });
          const gem = new THREE.Mesh(gemGeometry, gemMaterial);
          gem.position.set(0, 0, 1.8);
          gem.rotation.x = Math.PI / 4;
          
          if (sceneRef.current) {
            sceneRef.current.add(ringMesh);
            sceneRef.current.add(gem);
            
            // Group these together for our model reference
            const group = new THREE.Group();
            group.add(ringMesh);
            group.add(gem);
            modelRef.current = group as unknown as THREE.Mesh;
            
            // Apply size scaling
            const sizeScale = 1.0;
            group.scale.set(sizeScale, sizeScale, sizeScale);
            
            // Reset camera to show the model
            if (controlsRef.current) {
              controlsRef.current.reset();
            }
            
            setIsLoading(false);
            return;
          }
          
          // Fallback to a basic geometry if the group creation fails
          geometry = new THREE.SphereGeometry(2, 32, 32);
          break;
        default:
          // Octahedron (8-sided polyhedron) - good for earrings-like jewelry
          geometry = new THREE.OctahedronGeometry(2, 1);
      }
    } else {
      // Skip base shape creation if showBaseShape is false
      if (!showBaseShape) {
        // Create a minimal representation or an empty group
        const emptyGroup = new THREE.Group();
        if (sceneRef.current) {
          sceneRef.current.add(emptyGroup);
          modelRef.current = emptyGroup as unknown as THREE.Mesh;
          setIsLoading(false);
        }
        return;
      }
      
      // For catalog items, use the existing logic based on jewelry type
      switch (selectedJewelry.type) {
        case "ring":
          const ringRadius = 2
          const tubeRadius = 0.3
          geometry = new THREE.TorusGeometry(ringRadius, tubeRadius, 32, 100)
          
          // Add gemstone for ring
          if (sceneRef.current) {
            const gemGeometry = new THREE.OctahedronGeometry(0.5, 2)
            const gemMaterial = new THREE.MeshPhysicalMaterial({ 
              color: 0x4169E1, 
              metalness: 0.0, 
              roughness: 0.0,
              transmission: 0.95, // Glass-like
              thickness: 0.5,
              envMapIntensity: 1.5,
              clearcoat: 1.0,
              clearcoatRoughness: 0.0,
              ior: 2.5, // Diamond-like
              reflectivity: 1.0
            })
            const gem = new THREE.Mesh(gemGeometry, gemMaterial)
            gem.position.set(0, 0, ringRadius)
            gem.rotation.x = Math.PI / 4
            gem.castShadow = true
            sceneRef.current.add(gem)
          }
          break
          
        case "necklace":
          // Create a detailed chain-like shape
          geometry = new THREE.TorusKnotGeometry(2, 0.3, 128, 32, 2, 3)
          break
          
        case "earrings":
          // Special handling for earrings with earring group
          // ...existing code for earrings...
          // Create a pair of earrings with hoops
          const earringGroup = new THREE.Group()
          
          // Left earring
          const leftHoop = new THREE.TorusGeometry(0.8, 0.1, 16, 32, Math.PI * 1.5)
          const leftHoopMesh = new THREE.Mesh(leftHoop, materials[selectedMaterial])
          leftHoopMesh.position.set(-1.2, 0, 0)
          leftHoopMesh.rotation.x = Math.PI / 2
          earringGroup.add(leftHoopMesh)
          
          // Right earring
          const rightHoop = new THREE.TorusGeometry(0.8, 0.1, 16, 32, Math.PI * 1.5)
          const rightHoopMesh = new THREE.Mesh(rightHoop, materials[selectedMaterial])
          rightHoopMesh.position.set(1.2, 0, 0)
          rightHoopMesh.rotation.x = Math.PI / 2
          earringGroup.add(rightHoopMesh)
          
          // Gemstones for earrings
          const gemGeometry = new THREE.SphereGeometry(0.3, 32, 32)
          const gemMaterial = new THREE.MeshPhysicalMaterial({ 
            color: 0xFF0000, 
            metalness: 0.0, 
            roughness: 0.0,
            transmission: 0.8,
            thickness: 0.3,
            envMapIntensity: 2.0
          })
          
          const leftGem = new THREE.Mesh(gemGeometry, gemMaterial)
          leftGem.position.set(-1.2, -0.8, 0)
          earringGroup.add(leftGem)
          
          const rightGem = new THREE.Mesh(gemGeometry, gemMaterial)
          rightGem.position.set(1.2, -0.8, 0)
          earringGroup.add(rightGem)
          
          if (sceneRef.current) {
            sceneRef.current.add(earringGroup)
            
            // Set the earring group as the model for material updates
            modelRef.current = earringGroup as unknown as THREE.Mesh
            
            // Return early since we're handling this case specially
            return
          }
          
          // Fallback geometry if something went wrong
          geometry = new THREE.SphereGeometry(1, 32, 32)
          break
          
        case "bracelet":
          // Create a partial torus with a more refined appearance
          geometry = new THREE.TorusGeometry(2, 0.25, 32, 100, Math.PI * 1.8)
          break
          
        case "pendant":
          // Create a heart-like shape using a custom heart geometry
          const heartShape = new THREE.Shape()
          const x = 0, y = 0
          
          heartShape.moveTo(x, y + 1.5)
          heartShape.bezierCurveTo(x, y + 1.5, x - 2, y, x, y - 2)
          heartShape.bezierCurveTo(x + 2, y, x, y + 1.5, x, y + 1.5)
          
          const heartExtrude = {
            depth: 0.5,
            bevelEnabled: true,
            bevelSegments: 8,
            bevelSize: 0.2,
            bevelThickness: 0.1
          }
          
          geometry = new THREE.ExtrudeGeometry(heartShape, heartExtrude)
          geometry.scale(0.8, 0.8, 0.8)
          
          break
          
        default:
          geometry = new THREE.BoxGeometry(3, 3, 3)
      }
    }
    
    // Apply the selected material
    const material = materials[selectedMaterial]
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    
    // Apply scaling based on the selected size
    const sizeScale = 1.0;
    mesh.scale.set(sizeScale, sizeScale, sizeScale)
    
    sceneRef.current?.add(mesh)
    modelRef.current = mesh
    
    // Center camera on model
    if (controlsRef.current) {
      controlsRef.current.reset()
    }
    
    setIsLoading(false)
  }
  
  // Update material when selectedMaterial changes (for standard models)
  useEffect(() => {
    if (modelRef.current) {
      // Handle earrings (special case) - group with multiple children
      if (selectedJewelry?.type === "earrings") {
        modelRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            // Only update metal parts, not gemstones
            if (child.geometry instanceof THREE.TorusGeometry) {
              child.material = materials[selectedMaterial]
            }
          }
        })
      } 
      // Standard case - single mesh
      else if (modelRef.current instanceof THREE.Mesh) {
        const mesh = modelRef.current as THREE.Mesh;
        if (!Array.isArray(mesh.material)) {
          mesh.material = materials[selectedMaterial];
        }
      }
    }
  }, [selectedMaterial, selectedJewelry?.type, materials]);
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && rendererRef.current && cameraRef.current) {
        const width = canvasRef.current.clientWidth
        const height = canvasRef.current.clientHeight
        
        rendererRef.current.setSize(width, height)
        cameraRef.current.aspect = width / height
        cameraRef.current.updateProjectionMatrix()
      }
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  
  // Add UI rotation controls for the model
  const handleRotateLeft = () => {
    if (modelRef.current) {
      modelRef.current.rotation.y += Math.PI / 8
    }
  }
  
  const handleRotateRight = () => {
    if (modelRef.current) {
      modelRef.current.rotation.y -= Math.PI / 8
    }
  }
  
  const handleRotateUp = () => {
    if (modelRef.current) {
      modelRef.current.rotation.x += Math.PI / 8
    }
  }
  
  const handleRotateDown = () => {
    if (modelRef.current) {
      modelRef.current.rotation.x -= Math.PI / 8
    }
  }
  
  const handleReset = () => {
    if (controlsRef.current) {
      controlsRef.current.reset()
    }
    if (modelRef.current) {
      modelRef.current.rotation.set(0, 0, 0)
    }
  }
  
  // Handle URL parameters with useEffect after handleAIClick is defined
  useEffect(() => {
    // Check for prompt in URL params and trigger AI generation
    const promptFromURL = typeof window !== 'undefined' 
      ? new URLSearchParams(window.location.search).get('prompt') 
      : null;
      
    if (promptFromURL && !isLoading) {
      console.log("Found prompt in URL:", promptFromURL);
      
      // Set the search text to the prompt from URL
      setSearchText(promptFromURL);
      
      // Execute with a delay to ensure component is mounted
      const timer = setTimeout(() => {
        // Clean URL to prevent reprocessing on refresh
        if (typeof window !== 'undefined') {
          const newUrl = window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        }
        
        // Trigger AI generation with explicit prompt from URL
        handleAIClick();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [handleAIClick, isLoading, setSearchText]);
  
  const handleSearch = () => {
    if (searchText.trim()) {
      setShowSearchResults(true)
    }
  }
  
  const handleImageUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }
  
  const processFile = (file: File) => {
    if (file.type.startsWith('image/')) {
      const imageUrl = URL.createObjectURL(file)
      setSelectedImage(imageUrl)
    } else {
      alert('Please upload an image file')
    }
  }
  
  const handleRemoveImage = () => {
    setSelectedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }
  
  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }
  
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragging) {
      setIsDragging(true)
    }
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      processFile(file)
      e.dataTransfer.clearData()
    }
  }
  
  const handleAddToCart = () => {
    if (selectedJewelry) {
      alert(`Added to cart: ${selectedJewelry.name} (${selectedMaterial}) - $${selectedJewelry.price}`)
    }
  }

  // Properly clean up THREE.js objects to prevent memory leaks
  const cleanupObject = (obj: THREE.Object3D | null) => {
    if (!obj) return;
    
    // Remove from scene first
    sceneRef.current?.remove(obj);
    
    // Dispose of any materials, geometries, and textures
    if (obj instanceof THREE.Mesh) {
      const mesh = obj as THREE.Mesh;
      
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(material => disposeMaterial(material));
        } else {
          disposeMaterial(mesh.material);
        }
      }
    }
    
    // Recursively clean up children
    if (obj.children) {
      while (obj.children.length > 0) {
        cleanupObject(obj.children[0]);
      }
    }
  };

  // Helper function to dispose of THREE.js materials
  const disposeMaterial = (material: THREE.Material) => {
    if (!material) return;
    
    // Dispose of material
    material.dispose();
    
    // Check for and dispose of textures
    if ((material as THREE.MeshStandardMaterial).map) {
      (material as THREE.MeshStandardMaterial).map?.dispose();
    }
    if ((material as THREE.MeshStandardMaterial).normalMap) {
      (material as THREE.MeshStandardMaterial).normalMap?.dispose();
    }
    if ((material as THREE.MeshStandardMaterial).aoMap) {
      (material as THREE.MeshStandardMaterial).aoMap?.dispose();
    }
    if ((material as THREE.MeshStandardMaterial).emissiveMap) {
      (material as THREE.MeshStandardMaterial).emissiveMap?.dispose();
    }
    if ((material as THREE.MeshPhysicalMaterial).clearcoatMap) {
      (material as THREE.MeshPhysicalMaterial).clearcoatMap?.dispose();
    }
    
    // For any other maps that might be present
    Object.keys(material).forEach(key => {
      const value = (material as any)[key];
      if (value && typeof value === 'object' && typeof value.dispose === 'function') {
        value.dispose();
      }
    });
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 px-4 py-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <Link href="/" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to Home</span>
        </Link>
        <h1 className="text-2xl font-light tracking-tight">3D Jewelry Customizer</h1>
        <div className="w-24"></div>
      </div>
      
      {/* Search and Generation Section */}
      <div className="w-full max-w-xl mb-8 mx-auto relative">
        <div 
          ref={dropAreaRef}
          className={`relative rounded-xl border-2 ${isDragging ? 'border-gray-400 bg-gray-50' : 'border-gray-300'} ring-1 ring-gray-200 shadow-sm p-2`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="flex items-center space-x-2 mb-1.5">
            <Input
              type="text"
              placeholder="Search or describe your idea..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value)
                if (e.target.value.trim()) {
                  setShowSearchResults(true)
                } else {
                  setShowSearchResults(false)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (e.shiftKey || e.ctrlKey) {
                    // If Shift+Enter or Ctrl+Enter, trigger AI generation
                    handleAIClick();
                  } else {
                    // Regular Enter just triggers search
                    handleSearch();
                  }
                }
              }}
              className="w-full pl-4 pr-16 py-2.5 border-none rounded-lg focus:ring-1 focus:ring-gray-300"
              onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
              onFocus={() => searchText.trim() && setShowSearchResults(true)}
            />
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button 
                className={`text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1.5 transition-colors border border-gray-300 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={handleAIClick}
                title="AI Search - Generate 3D model (Shift+Enter)"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
              </button>
              <button 
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1.5 transition-colors border border-gray-300" 
                title="Search"
                onClick={handleSearch}
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          {/* Show generation progress if loading */}
          {isLoading && (
            <div className="mt-2 w-full">
              <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 transition-all duration-300 ease-in-out"
                  style={{ width: `${generationProgress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Generating "{aiGeneratedName}"...</span>
                <span>{generationProgress}%</span>
              </div>
            </div>
          )}
          
          {/* Show error message if generation failed */}
          {generationError && !isLoading && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
              Error: {generationError}
            </div>
          )}
          
          {/* Hidden file input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />
          
          {selectedImage ? (
            <div className="mt-2 border-t border-gray-200 pt-2">
              <div className="relative w-full">
                <img 
                  src={selectedImage} 
                  alt="Selected" 
                  className="h-32 w-auto object-contain rounded mb-1" 
                />
                <button 
                  onClick={handleRemoveImage}
                  className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-sm border border-gray-300"
                  title="Remove image"
                >
                  <X className="h-3 w-3 text-gray-500" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-start border-t border-gray-200 pt-2 pl-1">
              <button 
                className="text-gray-400 hover:text-gray-600 flex items-center space-x-1"
                onClick={handleImageUpload} 
                title="Upload Image"
              >
                <ImageIcon className="h-4 w-4" />
                <span className="text-xs">Add image</span>
              </button>
            </div>
          )}
        </div>
        
        {/* Search Results Dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute z-10 w-full bg-white mt-1 rounded-md shadow-lg border border-gray-200 p-2 max-h-80 overflow-y-auto">
            {searchResults.map(item => (
              <div 
                key={item.id}
                className="p-2 hover:bg-gray-50 rounded cursor-pointer"
                onClick={() => {
                  setSelectedJewelry(item)
                  setShowSearchResults(false)
                  setSearchText(item.name)
                }}
              >
                <div className="font-medium text-sm">{item.name}</div>
                <div className="text-xs text-gray-500">{item.type} - ${item.price}</div>
              </div>
            ))}
            <div className="mt-2 pt-2 border-t border-gray-100">
              <Link 
                href="/designs" 
                className="text-xs text-gray-600 hover:text-gray-900 flex items-center justify-center p-2"
              >
                View all results
                <ChevronDown className="h-3 w-3 ml-1" />
              </Link>
            </div>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-8">
        {/* Product Configurator */}
        <div className="flex flex-col justify-between lg:col-span-2">
          {selectedJewelry ? (
            <>
              <div>
                <h2 className="text-2xl font-light mb-2">{selectedJewelry.name}</h2>
                <p className="text-xl font-medium mb-6">${selectedJewelry.price}</p>
                <p className="text-sm text-gray-600 mb-6">{selectedJewelry.description}</p>
                
                {/* Jewelry Type Selector */}
                <div className="mb-6">
                  <label className="text-sm text-gray-500 block mb-2">Jewelry Type</label>
                  <div className="flex flex-wrap gap-2">
                    {jewelryItems.map(item => (
                      <button
                        key={item.id}
                        className={`px-3 py-1.5 rounded-full text-sm ${selectedJewelry.type === item.type ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                        onClick={() => {
                          const newItem = jewelryItems.find(j => j.type === item.type)
                          if (newItem) setSelectedJewelry(newItem)
                        }}
                      >
                        {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Material Selector */}
                <div className="mb-6">
                  <label className="text-sm text-gray-500 block mb-2">Material</label>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      className={`px-3 py-1.5 rounded-full text-sm flex items-center ${selectedMaterial === "gold" ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                      onClick={() => setSelectedMaterial("gold")}
                    >
                      <span className="h-3 w-3 rounded-full bg-yellow-500 mr-1.5"></span>
                      Gold
                    </button>
                    <button 
                      className={`px-3 py-1.5 rounded-full text-sm flex items-center ${selectedMaterial === "silver" ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                      onClick={() => setSelectedMaterial("silver")}
                    >
                      <span className="h-3 w-3 rounded-full bg-gray-300 mr-1.5"></span>
                      Silver
                    </button>
                    <button 
                      className={`px-3 py-1.5 rounded-full text-sm flex items-center ${selectedMaterial === "rosegold" ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                      onClick={() => setSelectedMaterial("rosegold")}
                    >
                      <span className="h-3 w-3 rounded-full bg-red-300 mr-1.5"></span>
                      Rose Gold
                    </button>
                    <button 
                      className={`px-3 py-1.5 rounded-full text-sm flex items-center ${selectedMaterial === "platinum" ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
                      onClick={() => setSelectedMaterial("platinum")}
                    >
                      <span className="h-3 w-3 rounded-full bg-gray-100 border border-gray-300 mr-1.5"></span>
                      Platinum
                    </button>
                  </div>
                </div>
                
                {/* Developer Options - Only show when a jewelry item is selected */}
                {selectedJewelry && (
                  <div className="mb-8">
                    <label className="text-sm text-gray-500 block mb-2">Developer Options</label>
                    <div className="flex items-center">
                      <button 
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showBaseShape ? 'bg-gray-900' : 'bg-gray-200'}`}
                        onClick={() => setShowBaseShape(!showBaseShape)}
                        aria-pressed={showBaseShape}
                        type="button"
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showBaseShape ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                      <span className="ml-2 text-sm text-gray-700">Show Base Shape</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Highlight AI-generated content */}
              {selectedJewelry.stlPath === aiGeneratedModel && (
                <div className="mb-6 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Sparkles className="h-4 w-4 text-purple-500 mr-2" />
                    <span className="text-sm font-medium text-purple-700">AI-Generated Design</span>
                  </div>
                  <p className="text-xs text-purple-600">
                    This is a unique piece created by AI based on your description.
                    The design can be further customized with material and size options.
                  </p>
                </div>
              )}
              
              {/* Add to Cart Button */}
              <div className="mt-auto">
                <button 
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm transition-colors"
                  onClick={handleAddToCart}
                >
                  Add to Cart - ${selectedJewelry.price}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <Search className="h-12 w-12 text-gray-300 mb-4" />
              <h2 className="text-xl font-light text-gray-500 mb-2">No Jewelry Selected</h2>
              <p className="text-sm text-gray-400 mb-6">Search for jewelry or use AI to generate a custom design</p>
              <button 
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm transition-colors"
                onClick={() => {
                  // Focus on the search input
                  const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement
                  if (searchInput) searchInput.focus()
                }}
              >
                Start Searching
              </button>
            </div>
          )}
        </div>
        
        {/* 3D Viewer */}
        <div className="lg:col-span-3">
          <h2 className="text-lg font-medium mb-4">3D Preview</h2>
          
          {/* Showing loading state or not selected state */}
          {isLoading ? (
            <div className="bg-blue-50 border border-blue-200 text-blue-600 p-4 rounded-md text-center min-h-[400px] flex flex-col items-center justify-center">
              <div className="h-8 w-8 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p>Generating "{aiGeneratedName}"... {generationProgress}%</p>
            </div>
          ) : !selectedJewelry ? (
            <div className="bg-gray-50 border border-gray-200 text-gray-500 p-4 rounded-md text-center min-h-[400px] flex flex-col items-center justify-center">
              <Search className="h-8 w-8 text-gray-300 mb-4" />
              <p>Search for jewelry or generate with AI to preview in 3D</p>
            </div>
          ) : (
            <div className="relative min-h-[500px] border border-gray-200 rounded-lg overflow-hidden">
              <JewelryViewer 
                stlUrl={selectedJewelry.stlPath === aiGeneratedModel && generatedStlUrl ? generatedStlUrl : selectedJewelry.stlPath}
                readOnly={false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 