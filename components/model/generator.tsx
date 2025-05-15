"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Textarea } from "../../components/ui/textarea"
import { Download, Upload, Wand2, RefreshCw, Mic, MicOff, ImagePlus, 
         Layers, Camera, MessageSquare, Repeat, PlusCircle, Image } from "lucide-react"
import { useToast } from "../../components/ui/use-toast"
import { useDropzone } from "react-dropzone"
import { convertGlbToStl } from "../../lib/stl-utils"
import * as THREE from "three"
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

// Add type definitions for Speech Recognition API
interface SpeechRecognitionEvent extends Event {
  results: {
    item(index: number): {
      item(index: number): {
        transcript: string;
      };
    };
    length: number;
  };
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

// Define configuration message interface
interface ConfigMessage {
  type: string;
  config?: {
    limits?: {
      free?: number;
      pro?: number;
    };
    userId?: string;
    userTier?: string;
    usageCount?: number;
  };
}

// Define window type
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

type ModelGenerationStatus = "idle" | "uploading" | "generating" | "completed" | "error"
type InputType = "text" | "image"

export function ModelGenerator() {
  const [inputType, setInputType] = useState<InputType>("text")
  const [textPrompt, setTextPrompt] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageTextPrompt, setImageTextPrompt] = useState("")
  const [selectedImageTextFile, setSelectedImageTextFile] = useState<File | null>(null)
  const [previewImageTextUrl, setPreviewImageTextUrl] = useState<string | null>(null)
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isRecordingImageText, setIsRecordingImageText] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const imageTextRecognitionRef = useRef<SpeechRecognition | null>(null)
  const { toast } = useToast()

  const [status, setStatus] = useState<ModelGenerationStatus>("idle")
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [stlBlob, setStlBlob] = useState<Blob | null>(null)
  const [isConvertingStl, setIsConvertingStl] = useState(false)
  const [stlUrl, setStlUrl] = useState<string | null>(null)
  const [stlViewerRef, setStlViewerRef] = useState<HTMLDivElement | null>(null)

  const [userConfig, setUserConfig] = useState<{
    limits?: {
      free?: number;
      pro?: number;
    };
    userId?: string;
    userTier?: string;
    usageCount?: number;
  }>({});

  // Listen for configuration messages from parent window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log("Received message:", event.data);
      
      // Check if this is a configuration message
      if (event.data && event.data.type === 'config') {
        const configMessage = event.data as ConfigMessage;
        console.log("Received configuration:", configMessage.config);
        
        // Store configuration
        if (configMessage.config) {
          setUserConfig(configMessage.config);
        }
      }
    };
    
    // Add event listener for messages
    window.addEventListener('message', handleMessage);
    
    // Notify parent that we're ready to receive configuration
    if (window !== window.parent) {
      window.parent.postMessage({
        type: 'taiyaki-ready',
        source: 'magic.taiyaki.ai'
      }, '*');
    }
    
    // Clean up event listener
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionConstructor) {
        recognitionRef.current = new SpeechRecognitionConstructor();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = Array.from(Array(event.results.length))
            .map((_, i) => event.results.item(i).item(0).transcript)
            .join('');
          
          setTextPrompt(transcript);
        };
        
        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error', event.error);
          setIsRecording(false);
          toast({
            title: "Voice Input Error",
            description: "Failed to recognize speech. Please try again.",
            variant: "destructive",
          });
        };
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Not Supported",
        description: "Voice input is not supported in your browser.",
        variant: "destructive",
      });
      return;
    }
    
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      toast({
        title: "Voice Recording Stopped",
        description: "Voice input has been added to the text field.",
      });
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
      toast({
        title: "Voice Recording Started",
        description: "Speak now to add your description...",
      });
    }
  };

  const resetState = () => {
    setTextPrompt("");
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageTextPrompt("");
    setSelectedImageTextFile(null);
    setPreviewImageTextUrl(null);
    setStatus("idle");
    setModelUrl(null);
    setTaskId(null);
    setProgress(0);
    setIsGenerating(false);
    setIsDownloading(false);
    setStlBlob(null);
    setStlUrl(null);
    // If recording is active, stop it
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
    if (isRecordingImageText && imageTextRecognitionRef.current) {
      imageTextRecognitionRef.current.stop();
      setIsRecordingImageText(false);
    }
    
    toast({
      title: "Reset Complete",
      description: "Ready to generate a new charm!",
    });
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
    },
    maxFiles: 1,
    disabled: status === "uploading" || status === "generating",
  })

  // Define canGenerate for the original image submission
  const canGenerate = (inputType === "text" && textPrompt.trim().length > 0) || 
                     (inputType === "image" && selectedFile !== null)

  const onDropImageText = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      setSelectedImageTextFile(file)
      const url = URL.createObjectURL(file)
      setPreviewImageTextUrl(url)
    }
  }, [])

  const {
    getRootProps: getImageTextRootProps,
    getInputProps: getImageTextInputProps,
    isDragActive: isImageTextDragActive
  } = useDropzone({
    onDrop: onDropImageText,
    accept: {
      "image/jpeg": [],
      "image/png": [],
    },
    maxFiles: 1,
    disabled: status === "uploading" || status === "generating",
  })

  // Optional: Handle user limits based on configuration
  const checkUserLimits = (): boolean => {
    if (!userConfig.limits) return true; // No limits configured
    
    const { userTier, usageCount, limits } = userConfig;
    
    // Check if user has reached their limit
    if (userTier === 'free' && limits?.free && usageCount && usageCount >= limits.free) {
      toast({
        title: "Generation Limit Reached",
        description: `Free users can generate up to ${limits.free} models. Upgrade to Pro for more!`,
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  };

  // Set up generation tracking
  useEffect(() => {
    const setupGenerationTracking = () => {
      // Find all generate buttons in the component
      const generateButtons = document.querySelectorAll('button, .button, [role="button"]');
      
      generateButtons.forEach(button => {
        // Check if this looks like a generate button
        const text = button.textContent?.toLowerCase() || '';
        if (text.includes('generate') && 
          (text.includes('model') || text.includes('3d'))) {
          
          console.log('Found generate button:', button);
          
          // Add click listener if not already tracked
          if (!(button as any)._trackingAdded) {
            (button as any)._trackingAdded = true;
            
            button.addEventListener('click', function() {
              console.log('Generate Charm clicked');
              
              // Notify the parent (FISHCAD) about the generation
              if (window.parent !== window) {
                window.parent.postMessage({
                  type: 'fishcad_model_generated',
                  timestamp: new Date().toISOString()
                }, '*');
              }
            });
          }
        }
      });
    };

    // Run when component mounts
    setupGenerationTracking();
    
    // Also run periodically to catch dynamically added buttons
    const intervalId = setInterval(setupGenerationTracking, 2000);
    
    // Add a global click listener as backup
    const handleGlobalClick = (event: MouseEvent) => {
      let target = event.target as HTMLElement | null;
      
      // Look through clicked element and parents
      for (let i = 0; i < 5 && target; i++) {
        const text = target.textContent?.toLowerCase() || '';
        
        // Check if this is a generation button
        if (text.includes('generate') && 
          (text.includes('model') || text.includes('3d'))) {
          
          console.log('Generate button clicked via global handler');
          
          // Notify parent
          if (window.parent !== window) {
            window.parent.postMessage({
              type: 'fishcad_model_generated',
              element: target.tagName,
              text: target.textContent
            }, '*');
          }
          
          break;
        }
        
        target = target.parentElement;
      }
    };
    
    document.addEventListener('click', handleGlobalClick);
    
    // Clean up listeners when component unmounts
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  // Also add direct tracking to our submit handlers
  const notifyParentAboutGeneration = () => {
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'fishcad_model_generated',
        source: 'magic.taiyaki.ai',
        method: inputType,
        timestamp: new Date().toISOString()
      }, '*');
      console.log('Notified parent about model generation initiation');
    }
  };

  const handleTextSubmit = async () => {
    if (!textPrompt.trim()) {
      toast({
        title: "Empty Prompt",
        description: "Please enter a text prompt to generate a model.",
        variant: "destructive",
      })
      return
    }
    
    // Check if user has reached their limit
    if (!checkUserLimits()) return;
    
    // Notify parent about generation initiation
    notifyParentAboutGeneration();
    
    setStatus("uploading")
    setProgress(0)
    
    try {
      setStatus("generating")
      setProgress(0)
      setIsGenerating(true)
      // Reset STL state when generating a new model
      setStlBlob(null)
      setStlUrl(null)

      // Modify the prompt to ensure only one object is generated
      const enhancedPrompt = `${textPrompt.trim()}. Important: Generate exactly one single cohesive object in the model, not multiple separate objects.`;

      // Call the API to start text-to-model generation
      const response = await fetch("/api/generate-model", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "text",
          prompt: enhancedPrompt,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error generating model:", errorText);
        setStatus("error")
        setIsGenerating(false)
        toast({
          title: "Error",
          description: "Failed to generate model. Please try again.",
          variant: "destructive",
        })
        return
      }

      const data = await response.json()
      setTaskId(data.taskId)

      // Start polling for task status
      pollTaskStatus(data.taskId)
    } catch (error) {
      console.error("Error generating model:", error)
      setStatus("error")
      setIsGenerating(false)
      toast({
        title: "Error",
        description: "Failed to generate model. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleImageSubmit = async () => {
    if (!selectedFile) {
      toast({
        title: "No Image",
        description: "Please upload an image to generate a model.",
        variant: "destructive",
      })
      return
    }
    
    // Check if user has reached their limit
    if (!checkUserLimits()) return;
    
    // Notify parent about generation initiation
    notifyParentAboutGeneration();
    
    setStatus("uploading")
    setProgress(0)
    
    try {
      setStatus("generating")
      setProgress(10)
      setIsGenerating(true)
      // Reset STL state when generating a new model
      setStlBlob(null)
      setStlUrl(null)

      // First enhance the image with GPT-image-1 to get a 2.5D charm
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("prompt", "Create a 2.5D gray charm")

      // Log that we're using the new enhanced API
      console.log("Using GPT-image-1 API for image processing...")
      toast({
        title: "Processing Image",
        description: "Creating a 2.5D charm with GPT-image-1...",
      })

      const enhanceResponse = await fetch("/api/enhance-image-with-gpt", {
        method: "POST",
        body: formData,
      })

      if (!enhanceResponse.ok) {
        const errorText = await enhanceResponse.text();
        console.error("Error from enhance-image-with-gpt:", errorText);
        throw new Error("Failed to enhance image: " + errorText);
      }

      const enhanceData = await enhanceResponse.json();
      console.log("Enhanced image data:", enhanceData);

      // If Tripo integration already happened in the enhancement step
      if (enhanceData.tripoTaskId) {
        setTaskId(enhanceData.tripoTaskId)
        setProgress(50)
        toast({
          title: "3D Model Generation Started",
          description: "Image was enhanced and a 3D model is being created...",
        })
        // Start polling for task status
        pollTaskStatus(enhanceData.tripoTaskId)
        return
      }

      // Otherwise, upload the enhanced image to Tripo
      if (!enhanceData.enhancedImageUrl) {
        throw new Error("No enhanced image URL received")
      }

      // Now upload the enhanced image to Tripo
      setProgress(30)
      toast({
        title: "Image Enhanced",
        description: "Now creating 3D model from enhanced image...",
      })

      // Download the enhanced image and then upload to Tripo
      const imageResponse = await fetch(enhanceData.enhancedImageUrl)
      if (!imageResponse.ok) {
        throw new Error("Failed to download enhanced image")
      }

      const imageBlob = await imageResponse.blob()
      const imageFile = new File([imageBlob], "enhanced-charm.png", { type: "image/png" })

      // Upload to Tripo
      const tripoFormData = new FormData()
      tripoFormData.append("file", imageFile)

      const uploadResponse = await fetch("/api/upload-image", {
        method: "POST",
        body: tripoFormData,
      })

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload enhanced image to Tripo")
      }

      const uploadData = await uploadResponse.json()
      setProgress(40)

      // Then start the image-to-model generation
      setStatus("generating")
      const response = await fetch("/api/generate-model", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "image",
          imageToken: uploadData.imageToken,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error from generate-model:", errorText);
        throw new Error("Failed to start model generation: " + errorText);
      }

      const data = await response.json()
      setTaskId(data.taskId)
      setProgress(50)

      // Start polling for task status
      pollTaskStatus(data.taskId)
    } catch (error) {
      console.error("Error generating model:", error)
      setStatus("error")
      setIsGenerating(false)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate model. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleImageTextSubmit = async () => {
    if (!selectedImageTextFile) {
      toast({
        title: "No Image",
        description: "Please upload an image to generate a model.",
        variant: "destructive",
      })
      return
    }
    
    if (!imageTextPrompt.trim()) {
      toast({
        title: "Empty Prompt",
        description: "Please enter a text description to guide the generation.",
        variant: "destructive",
      })
      return
    }
    
    // Check if user has reached their limit
    if (!checkUserLimits()) return;
    
    // Notify parent about generation initiation
    notifyParentAboutGeneration();
    
    setStatus("uploading")
    setProgress(0)
    
    try {
      setStatus("generating")
      setProgress(0)
      setIsGenerating(true)
      setIsAnalyzingImage(true)
      // Reset STL state when generating a new model
      setStlBlob(null)
      setStlUrl(null)

      let description = "";
      
      // Always attempt to analyze the image regardless of domain
      try {
        // First analyze the image with OpenAI Vision API
        const formData = new FormData()
        formData.append("image", selectedImageTextFile)
        formData.append("prompt", imageTextPrompt || "")

        toast({
          title: "Analyzing Image",
          description: "Using AI to analyze your image...",
        })

        // Log hostname for debugging
        // console.log("📍 Current hostname:", window.location.hostname);
        
        const analysisResponse = await fetch("/api/analyze-image", {
          method: "POST",
          body: formData,
        }).catch(error => {
          console.error("❌ Network error during fetch:", error);
          throw error; // Re-throw to be caught by the outer catch
        });

        // console.log("📥 Received response from /api/analyze-image:", {
        //   status: analysisResponse.status,
        //   statusText: analysisResponse.statusText,
        //   headers: Object.fromEntries([...analysisResponse.headers])
        // });

        // Always try to read the response body regardless of status code
        const analysisData = await analysisResponse.json().catch(error => {
          console.error("❌ Error parsing response JSON:", error);
          return {}; // Return empty object to avoid further errors
        });

        // console.log("📄 Analysis response data:", analysisData);

        // Use the description from the response if available, even if it's an error response
        if (analysisData.description) {
          description = analysisData.description;
          // console.log(`✅ [CLIENT] Using description from API: "${description}"`);
          
          toast({
            title: analysisResponse.ok ? "Image Analyzed" : "Using Fallback Description",
            description: "Creating charm based on the description...",
          });
        } else if (analysisResponse.ok && analysisData.description === "") {
          // Handle empty description from a successful response
          // console.warn("Image analysis returned empty description, falling back to direct prompt");
          description = imageTextPrompt || 
            `Create a charm based on the uploaded image. ${
              selectedImageTextFile.name ? `The image filename is: ${selectedImageTextFile.name}.` : ''
            }`;
            
          toast({
            title: "Using Basic Description",
            description: "The AI analysis returned an empty result.",
          });
        } else {
          // Handle unsuccessful response without description
          // console.warn("Image analysis failed, falling back to direct prompt");
          description = imageTextPrompt || 
            `Create a charm based on the uploaded image. ${
              selectedImageTextFile.name ? `The image filename is: ${selectedImageTextFile.name}.` : ''
            }`;
            
          toast({
            title: "Image Analysis Unavailable",
            description: "Using direct prompt instead. The AI enhancement feature requires additional setup.",
          });
        }
      } catch (error) {
        // console.warn("Error during image analysis:", error);
        // Fallback to direct text description if analysis fails
        description = imageTextPrompt || 
          `Create a charm based on the uploaded image. ${
            selectedImageTextFile.name ? `The image filename is: ${selectedImageTextFile.name}.` : ''
          }`;
          
        toast({
          title: "Image Analysis Failed",
          description: "Using direct prompt instead. This feature requires OpenAI API setup.",
        });
      }

      setIsAnalyzingImage(false);
      
      // Ensure we have some description to send
      if (!description) {
        description = `Create a charm based on the uploaded image. ${
          selectedImageTextFile.name ? `The image filename is: ${selectedImageTextFile.name}.` : ''
        }`;
      }

      // Try to upload the image first
      const imageFormData = new FormData();
      imageFormData.append("file", selectedImageTextFile);

      const uploadResponse = await fetch("/api/upload-image", {
        method: "POST",
        body: imageFormData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image");
      }

      const uploadData = await uploadResponse.json();
      
      // Then start the model generation
      setStatus("generating");
      
      // FIXED: Always prioritize text-to-model with the OpenAI description
      // Only fall back to image-to-model if explicitly specified
      const generationType = "text"; // Always use text-to-model for better results
      
      // console.log("🔄 Using text-to-model with OpenAI description:", description);
      
      const generationPayload: {
        type: string;
        prompt: string;
        imageToken?: string;
      } = {
        type: generationType,
        prompt: description,
      };
      
      // Store the imageToken as backup but don't use it in this flow
      // We're prioritizing the text description from OpenAI
      // if (generationType === "image") {
      //   generationPayload.imageToken = uploadData.imageToken;
      // }
      
      const generationResponse = await fetch("/api/generate-model", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(generationPayload),
      });

      if (!generationResponse.ok) {
        const errorText = await generationResponse.text();
        console.error("Error from generate-model:", errorText);
        throw new Error("Failed to start model generation: " + errorText);
      }

      const generationData = await generationResponse.json();
      
      if (!generationData.taskId) {
        throw new Error("No task ID returned from generation API");
      }
      
      setTaskId(generationData.taskId);

      // Start polling for task status
      pollTaskStatus(generationData.taskId);
    } catch (error) {
      // console.error("Error processing image and text:", error);
      setStatus("error");
      setIsGenerating(false);
      setIsAnalyzingImage(false);
      toast({
        title: "Error",
        description: typeof error === 'object' && error !== null && 'message' in error 
          ? String(error.message) 
          : "Failed to process image and generate model. Please try again.",
        variant: "destructive",
      });
    }
  }

  const convertToStl = async (url: string) => {
    try {
      setIsConvertingStl(true)
      
      // Convert GLB to STL
      const blob = await convertGlbToStl(url)
      setStlBlob(blob)
      
      // Create a URL for the STL blob
      const blobUrl = URL.createObjectURL(blob)
      setStlUrl(blobUrl)
      
      toast({
        title: "Conversion complete",
        description: "Your model has been converted to STL format.",
      })

      // Dispatch custom event with STL URL for parent components
      const stlGeneratedEvent = new CustomEvent('stlGenerated', {
        detail: { stlUrl: blobUrl },
        bubbles: true,
        composed: true
      });
      document.dispatchEvent(stlGeneratedEvent);
      
      return blob
    } catch (error) {
      // console.error("Error converting to STL:", error)
      toast({
        title: "Error",
        description: "Failed to convert model to STL format. You can still try downloading.",
        variant: "destructive",
      })
      return null
    } finally {
      setIsConvertingStl(false)
    }
  }

  const pollTaskStatus = async (taskId: string, retryCount = 0, maxRetries = 3) => {
    try {
      // console.log(`🔍 Polling task status for taskId: ${taskId} (attempt: ${retryCount + 1}/${maxRetries + 1})`);
      
      // Get the current origin for constructing absolute URLs
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const apiUrl = `${origin}/api/task-status?taskId=${taskId}`;
      
      // console.log(`🔍 Using API URL: ${apiUrl}`);
      
      // Try POST method first on retry attempts since GET might be having CORS issues
      const method = retryCount > 0 ? 'POST' : 'GET';
      // console.log(`🔍 Using HTTP method: ${method}`);
      
      const response = await fetch(apiUrl, {
        method: method,
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        // For POST requests, include the taskId in the body as well
        ...(method === 'POST' && { 
          body: JSON.stringify({ taskId }) 
        }),
        credentials: 'same-origin'
      }).catch(err => {
        // console.error(`❌ Network error fetching task status:`, err);
        throw err;
      });

      // console.log(`📥 Task status response:`, {
      //   status: response.status,
      //   statusText: response.statusText,
      //   ok: response.ok
      // });

      if (!response.ok) {
        // For 405 Method Not Allowed specifically (CORS or server config issue)
        if (response.status === 405) {
          // console.warn(`⚠️ API returned 405 Method Not Allowed - trying alternative approach`);
          
          // If GET failed with 405, try POST immediately
          if (method === 'GET') {
            // console.log(`🔄 Switching from GET to POST method immediately`);
            // Call ourselves but with retryCount+0.5 to indicate we're doing an immediate method switch
            setTimeout(() => pollTaskStatus(taskId, retryCount + 0.5, maxRetries), 100);
            return;
          }
          
          if (retryCount < maxRetries) {
            // console.log(`🔄 Retrying in 3 seconds... (${retryCount + 1}/${maxRetries})`);
            setTimeout(() => pollTaskStatus(taskId, retryCount + 1, maxRetries), 3000);
            return;
          }
        }
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json().catch(err => {
        // console.error(`❌ Error parsing JSON response:`, err);
        throw new Error("Failed to parse task status response");
      });

      // console.log(`📄 Task status data:`, data);

      // Even if we get an error response, if it has status and progress we can still use it
      if (data.error || data.message) {
        const errorMsg = data.error || data.message;
        // console.warn(`⚠️ API returned error/message with 200 status:`, errorMsg);
        
        // If the server returned a status and progress, we can use those to update the UI
        if (data.status === 'running' && typeof data.progress === 'number') {
          // console.log(`⚠️ Using fallback progress data from API error response:`, data.progress);
          setProgress(data.progress);
          
          // For API key issues, show a toast only on the first retry
          if (errorMsg?.includes('API key') && retryCount === 0) {
            toast({
              title: "API Configuration Issue",
              description: "There may be an issue with the API configuration. Your model is still being processed.",
              duration: 5000,
            });
          }
          
          // Continue polling with slightly longer delay for simulated progress
          setTimeout(() => pollTaskStatus(taskId, retryCount + 1, maxRetries), 4000);
          return;
        }
        
        // Only throw if no useful data is provided
        if (!data.status) {
          throw new Error(errorMsg);
        }
      }

      if (data.status === "success") {
        setStatus("completed")
        
        // Enhanced model URL handling with validation and logging
        let finalModelUrl: string | null = null;
        
        if (data.modelUrl) {
          // Just set the URL without logging it
          finalModelUrl = data.modelUrl;
        } else {
          if (data.baseModelUrl) {
            finalModelUrl = data.baseModelUrl;
          } else {
            toast({
              title: "Warning",
              description: "Model generated but the viewer URL may not be available.",
              variant: "destructive",
            });
          }
        }
        
        setModelUrl(finalModelUrl);
        setProgress(100);
        setIsGenerating(false);
        
        // Scroll to the generated model area immediately
        setTimeout(() => {
          const modelArea = document.getElementById('stl-model-viewer');
          if (modelArea) {
            modelArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        
        // Automatically start STL conversion when model is ready
        if (finalModelUrl) {
          toast({
            title: "Processing",
            description: "Converting your charm to STL format...",
          });
          
          // Start STL conversion
          convertToStl(finalModelUrl)
            .then(blob => {
              if (blob) {
                toast({
                  title: "STL Ready",
                  description: "Your model is ready to be added to FISHCAD.",
                });
              }
            })
            .catch(() => {
              // Error is already handled in convertToStl
            });
        }
        
        toast({
          title: "Success",
          description: "Your charm has been generated successfully.",
        });

        // Send generation completion message to parent window if in iframe
        if (window !== window.parent) {
          const modelInfo = {
            modelUrl: data.modelUrl || data.baseModelUrl,
            prompt: inputType === "text" ? textPrompt : "Image-based charm",
            generationMethod: inputType === "text" ? "text-to-3d" : "image-to-3d",
            timestamp: new Date().toISOString(),
            taskId: taskId,
            fileType: 'glb'
          };
          
          window.parent.postMessage({
            type: 'model-generated',
            source: 'magic.taiyaki.ai',
            modelInfo
          }, '*');
          
          // Replace detailed log with generic message
          console.log("Model generation completed and notified parent window");
        }
      } else if (data.status === "failed" || data.status === "cancelled" || data.status === "unknown") {
        setStatus("error")
        setIsGenerating(false)
        toast({
          title: "Error",
          description: "Model generation failed. Please try again.",
          variant: "destructive",
        })
      } else {
        // Still in progress or using fake/fallback progress
        setProgress(data.progress || 0)
        
        // If we've reached max retries but still getting progress updates,
        // implement a "simulated progress" mechanism that will never reach 100%
        if (retryCount >= maxRetries && data.progress) {
          // Ensure progress keeps moving slightly but never reaches 100%
          const simulatedProgress = Math.min(98, data.progress + 3 + Math.floor(Math.random() * 5));
          // console.log(`⚠️ Using simulated progress after max retries:`, simulatedProgress);
          setProgress(simulatedProgress);
          
          // Every 10 seconds, we should check if the real API is back
          setTimeout(() => pollTaskStatus(taskId, 0, maxRetries), 10000);
          return;
        }
        
        // Regular polling
        setTimeout(() => pollTaskStatus(taskId, retryCount + 1, maxRetries), 3000)
      }
    } catch (error) {
      // console.error("Error polling task status:", error);
      
      // Show a fake success after max retries for better UX (will at least show the model generation is in progress)
      if (retryCount >= maxRetries) {
        // console.log("Maximum retries reached. Showing placeholder progress UI.");
        // Simulate progress without actual data
        setStatus("generating");
        const fakeProgress = 25 + (retryCount * 10); // Gradually increase fake progress
        setProgress(Math.min(fakeProgress, 98)); // Never reach 100% with fake progress
        
        // Keep retrying in background but show fake progress to user
        setTimeout(() => pollTaskStatus(taskId, retryCount + 1, maxRetries + 5), 3000);
        return;
      }
      
      // Implement retry logic for errors
      if (retryCount < maxRetries) {
        // console.log(`🔄 Error occurred, retrying in 3 seconds... (${retryCount + 1}/${maxRetries})`);
        setTimeout(() => pollTaskStatus(taskId, retryCount + 1, maxRetries), 3000);
        return;
      }
      
      // Only show error to user after max retries (which should never happen now thanks to the fake progress handling)
      setStatus("error");
      setIsGenerating(false);
      toast({
        title: "Error",
        description: "Failed to check model status. The model may still be generating.",
        variant: "destructive",
      });
    }
  }

  const handleDownload = async () => {
    if (!stlBlob) {
      toast({
        title: "No STL Available",
        description: "Please generate and convert a model to STL first.",
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    try {
      // Create a URL for the STL blob
      const stlUrl = URL.createObjectURL(stlBlob);
      
      // Create and click a download link
      const link = document.createElement('a');
      link.href = stlUrl;
      link.download = "magicfish-generated-model.stl";
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(stlUrl);
      
      toast({
        title: "Download Started",
        description: "Your STL file is being downloaded.",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download the STL file.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Update the STL viewer when the STL URL changes
  useEffect(() => {
    if (!stlUrl || !stlViewerRef) return;

    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let controls: OrbitControls;
    let material: THREE.Material;
    let mesh: THREE.Mesh;
    let animationId: number;

    // Set up the scene
    const setupScene = () => {
      // Create scene
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf5f5f5);

      // Set up camera
      const width = stlViewerRef.clientWidth;
      const height = stlViewerRef.clientHeight;
      camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
      camera.position.set(0, 0, 10);

      // Create renderer
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      
      if (stlViewerRef.firstChild) {
        stlViewerRef.removeChild(stlViewerRef.firstChild);
      }
      stlViewerRef.appendChild(renderer.domElement);

      // Add orbit controls with constraints to prevent going out of view
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.2;
      controls.rotateSpeed = 0.7;
      controls.enableZoom = true;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
      
      // Add constraints to prevent the model from rotating out of view
      controls.minPolarAngle = Math.PI / 3; // More restrictive - limit how high user can orbit (60 degrees)
      controls.maxPolarAngle = Math.PI * 2/3; // More restrictive - limit how low user can orbit (120 degrees)
      
      // Limit zoom to prevent getting too close or too far
      controls.minDistance = 5;
      controls.maxDistance = 12;
      
      // Disable panning completely
      controls.enablePan = false;
      
      // Disable rotation around Z-axis
      controls.minAzimuthAngle = -Math.PI / 2; // Limit horizontal rotation to 90 degrees left
      controls.maxAzimuthAngle = Math.PI / 2;  // Limit horizontal rotation to 90 degrees right

      // Add lighting for better shininess
      // Main directional light (like sunlight)
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(1, 1, 1);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 1024;
      directionalLight.shadow.mapSize.height = 1024;
      scene.add(directionalLight);

      // Add ambient light for overall illumination
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambientLight);

      // Add a hemisphere light for natural lighting
      const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3);
      scene.add(hemisphereLight);

      // Add point lights for highlights
      const pointLight1 = new THREE.PointLight(0xffffff, 0.8);
      pointLight1.position.set(-5, 5, 5);
      scene.add(pointLight1);

      const pointLight2 = new THREE.PointLight(0xffffff, 0.8);
      pointLight2.position.set(5, -5, 5);
      scene.add(pointLight2);

      // Load the STL model
      const loader = new STLLoader();
      loader.load(stlUrl, (geometry) => {
        // Center the geometry
        geometry.center();

        // Scale the geometry to fit the viewer
        const boundingBox = new THREE.Box3().setFromObject(new THREE.Mesh(geometry));
        const size = boundingBox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 5 / maxDim;
        geometry.scale(scale, scale, scale);

        // Create a shinier material
        material = new THREE.MeshStandardMaterial({
          color: 0x6495ED,
          metalness: 0.25,
          roughness: 0.3,
          envMapIntensity: 0.8,
          flatShading: false,
        });

        // Create the mesh and add it to the scene
        mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);

        // Position camera to view the model
        const boundingSphere = geometry.boundingSphere;
        if (boundingSphere) {
          const center = boundingSphere.center;
          const radius = boundingSphere.radius;
          camera.position.set(center.x, center.y, center.z + radius * 2.5);
          controls.target.set(center.x, center.y, center.z);
          controls.update();
        }
      });
    };

    // Animation loop
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    // Handle window resize
    const handleResize = () => {
      if (!stlViewerRef) return;
      const width = stlViewerRef.clientWidth;
      const height = stlViewerRef.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    setupScene();
    animate();
    window.addEventListener('resize', handleResize);

    // Clean up on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationId) cancelAnimationFrame(animationId);
      if (scene && mesh) scene.remove(mesh);
      if (material) {
        if ('dispose' in material) material.dispose();
      }
      if (controls) controls.dispose();
      if (renderer) renderer.dispose();
    };
  }, [stlUrl, stlViewerRef]);

  // Add a new function to toggle voice recording for the image text prompt
  const toggleImageTextVoiceRecording = () => {
    if (typeof window === 'undefined' || !('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      toast({
        title: "Not Supported",
        description: "Voice input is not supported in your browser.",
        variant: "destructive",
      });
      return;
    }
    
    const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) {
      toast({
        title: "Not Supported",
        description: "Voice input is not supported in your browser.",
        variant: "destructive",
      });
      return;
    }
    
    if (isRecordingImageText) {
      if (imageTextRecognitionRef.current) {
        imageTextRecognitionRef.current.stop();
      }
      setIsRecordingImageText(false);
      toast({
        title: "Voice Recording Stopped",
        description: "Voice input has been added to the text field.",
      });
    } else {
      // Initialize recognition if not already done
      if (!imageTextRecognitionRef.current) {
        imageTextRecognitionRef.current = new SpeechRecognitionConstructor();
        imageTextRecognitionRef.current.continuous = true;
        imageTextRecognitionRef.current.interimResults = true;
        
        imageTextRecognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = Array.from(Array(event.results.length))
            .map((_, i) => event.results.item(i).item(0).transcript)
            .join('');
          
          setImageTextPrompt(transcript);
        };
        
        imageTextRecognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error', event.error);
          setIsRecordingImageText(false);
          toast({
            title: "Voice Input Error",
            description: "Failed to recognize speech. Please try again.",
            variant: "destructive",
          });
        };
      }
      
      imageTextRecognitionRef.current.start();
      setIsRecordingImageText(true);
      toast({
        title: "Voice Recording Started",
        description: "Speak now to add your guidance...",
      });
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="overflow-visible">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl text-center">Charm Design Generator</CardTitle>
          <CardDescription className="text-center text-sm sm:text-base">
            Create beautiful charm designs from text descriptions or images. Perfect for pendants, charms, and custom jewelry pieces.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 overflow-visible">
          <Tabs defaultValue="text" className="w-full overflow-visible" onValueChange={(v) => setInputType(v as InputType)}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="text" className="text-xs sm:text-sm py-1.5 px-2">
                Text
              </TabsTrigger>
              <TabsTrigger value="image" className="text-xs sm:text-sm py-1.5 px-2">
                Image
              </TabsTrigger>
            </TabsList>
            <div className="space-y-4 overflow-visible">
              <TabsContent value="text" className="space-y-4">
                <div className="relative">
                  <Textarea
                    placeholder="Describe your charm in detail (e.g., a blue dolphin with a curved fin, swimming)"
                    value={textPrompt}
                    onChange={(e) => setTextPrompt(e.target.value)}
                    disabled={isGenerating}
                    className="min-h-[100px] sm:min-h-[120px] pr-10 text-sm sm:text-base"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="absolute right-2 top-2"
                    onClick={toggleVoiceRecording}
                    disabled={isGenerating}
                  >
                    {isRecording ? (
                      <MicOff className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                    ) : (
                      <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 -mt-2">
                  Tip: Describe one object at a time for best results.
                </p>
              </TabsContent>
              <TabsContent value="image" className="py-4 space-y-4">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-center mb-4">
                      Upload a photo to create a beautiful charm.
                    </p>
                  </div>
                  <div 
                    {...getRootProps()} 
                    className={`border-2 border-dashed rounded-md p-6 flex flex-col items-center cursor-pointer transition ${
                      isDragActive ? "border-primary bg-primary/10" : "border-gray-300 hover:bg-gray-50"
                    }  ${status !== 'idle' ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <input {...getInputProps()} />
                    {previewUrl ? (
                      <div className="flex flex-col items-center gap-2">
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="max-h-36 max-w-full object-contain rounded-md"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedFile(null)
                            setPreviewUrl(null)
                          }}
                          className="mt-2"
                          disabled={status !== 'idle'}
                        >
                          <Repeat className="h-4 w-4 mr-2" /> Change
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Upload className="h-12 w-12 text-gray-400 mb-1" />
                        <p className="text-center text-gray-600 font-medium text-sm">
                          Drag & drop an image or click to upload
                        </p>
                        <p className="text-xs text-gray-500 text-center">
                          Supports JPEG or PNG (Max 10MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-center mt-4">
                  <Button 
                    onClick={handleImageSubmit} 
                    disabled={!selectedFile || status !== 'idle'} 
                    className="w-full max-w-xs"
                  >
                    {status === 'idle' ? (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" /> Create 2.5D Charm
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> {
                          status === 'uploading' ? 'Uploading...' :
                          status === 'generating' ? 'Creating Charm...' :
                          'Processing...'
                        }
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </div>

            <div className="space-y-3 sm:space-y-4 mt-4">
              {/* Progress bars */}
              {(status === "generating" || status === "uploading") && (
                <div className="space-y-2">
                  <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500 ease-in-out"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <p className="text-center text-xs sm:text-sm text-gray-500">
                    {status === "uploading" ? "Uploading image" : "Generating charm"}: {progress}%
                  </p>
                </div>
              )}

              {/* STL Viewer */}
              {status === "completed" && (
                <div className="my-2 sm:mb-4 bg-gray-100 rounded-lg overflow-visible border" 
                     style={{ height: "350px", minHeight: "350px" }}
                     id="stl-model-viewer">
                  {isConvertingStl ? (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                      <p className="text-sm text-gray-600">Converting to STL format...</p>
                    </div>
                  ) : !stlUrl && !stlBlob ? (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                      <p className="text-sm text-gray-600">Preparing charm...</p>
                    </div>
                  ) : (
                    <div 
                      ref={setStlViewerRef} 
                      className="w-full h-full"
                    ></div>
                  )}
                </div>
              )}
              
              {/* Action buttons when model is ready */}
              {status === "completed" && modelUrl && (
                <div className="flex flex-col gap-2 mb-3 sm:mb-4">
                  <Button 
                    className="w-full flex items-center justify-center" 
                    variant="outline"
                    onClick={handleDownload}
                    disabled={isDownloading || isConvertingStl}
                    size="sm"
                  >
                    {isDownloading ? (
                      <>
                        <div className="h-3 w-3 sm:h-4 sm:w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                        <span className="text-xs sm:text-sm">Downloading...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        <span className="text-xs sm:text-sm">Download STL</span>
                      </>
                    )}
                  </Button>
                  
                  <div className="w-full p-3 border border-gray-200 rounded-md text-xs sm:text-sm text-gray-700 bg-gray-50">
                    <h3 className="font-medium mb-2">How to use with FISHCAD:</h3>
                    
                    <div className="mb-3">
                      <p className="font-medium">1. Download the STL File</p>
                      <ul className="pl-4 mt-1 space-y-1 list-disc">
                        <li>Click the download link for any STL model on our site</li>
                        <li>Note where the file is saved (usually your Downloads folder)</li>
                      </ul>
                    </div>
                    
                    <div className="mb-2">
                      <p className="font-medium">2. Import into FISHCAD</p>
                      <ul className="pl-4 mt-1 space-y-1 list-disc">
                        <li>Go to <a href="https://fishcad.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">FISHCAD.com</a></li>
                        <li>Click the "Import" button in the top menu</li>
                        <li>Select your downloaded STL file</li>
                        <li>Your model will appear in your FISHCAD workspace</li>
                      </ul>
                    </div>
                    
                    <p className="mt-3 text-sm italic">That's it! You can now edit, modify, or use the model in your FISHCAD project.</p>
                  </div>
                  
                  <Button
                    className="w-full flex items-center justify-center"
                    variant="secondary"
                    onClick={resetState}
                    size="sm"
                  >
                    <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="text-xs sm:text-sm">Create New Model</span>
                  </Button>
                </div>
              )}
            </div>
          </Tabs>

          {inputType === "image" && (
            <>
              {status === "completed" && modelUrl && (
                <div className="flex flex-col items-center gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    onClick={handleDownload} 
                    className="w-full max-w-xs"
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" /> Download STL File
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
          
          {inputType === "text" && (
            <div className="mt-4">
              <Button 
                onClick={handleTextSubmit} 
                disabled={!textPrompt || status !== "idle"} 
                className="w-full"
              >
                {status === "idle" ? (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" /> Generate from Text
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> {
                      status === "uploading" ? "Uploading..." :
                      status === "generating" ? "Generating..." :
                      "Processing..."
                    }
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optionally add UI to show usage limits if configured */}
      {userConfig.limits && (
        <div className="text-xs text-gray-500 mt-2 text-center">
          {userConfig.userTier === 'free' ? (
            <p>
              {userConfig.usageCount || 0} / {userConfig.limits.free} models generated 
              {userConfig.usageCount && userConfig.limits.free && userConfig.usageCount >= userConfig.limits.free && 
                " - Limit reached! Upgrade for more."}
            </p>
          ) : userConfig.userTier === 'pro' ? (
            <p>Pro account: {userConfig.usageCount || 0} / {userConfig.limits.pro} models generated</p>
          ) : null}
        </div>
      )}
    </div>
  )
}

