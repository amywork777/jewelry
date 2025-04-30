"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Loader, ImageIcon, RefreshCw, Download, Repeat, Camera, ExternalLink, Image as ImageIcon2, Box } from "lucide-react";
import { useToast } from "./ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

// Define process steps for better UI feedback
type ProcessStep = "idle" | "enhancing" | "uploading" | "generating3d" | "completed" | "error";

export function AIImageGenerator() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [tripoTaskId, setTripoTaskId] = useState<string | null>(null);
  const [tripoModelLoaded, setTripoModelLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("image");
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [processStep, setProcessStep] = useState<ProcessStep>("idle");
  const [processingTime, setProcessingTime] = useState<number | null>(null);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const { toast } = useToast();

  // Add a log message and log to console
  const addLog = (message: string) => {
    console.log(`[AIImageGenerator] ${message}`);
    setLogMessages(prev => [...prev, `${new Date().toISOString().substring(11, 19)} - ${message}`]);
  };

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      addLog(`File selected: ${file.name} (${file.type}, ${Math.round(file.size / 1024)}KB)`);
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setGeneratedImageUrl(null); // Clear any previous generation
      setTripoTaskId(null); // Clear any previous generation
      setTripoModelLoaded(false);
      setProcessStep("idle");
      setActiveTab("image");
    }
  }, []);

  // Configure dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
    },
    maxFiles: 1,
    disabled: isGenerating,
  });

  // Get process step description
  const getStepDescription = () => {
    switch (processStep) {
      case "enhancing": return "Enhancing image with GPT-image-1...";
      case "uploading": return "Uploading to Tripo...";
      case "generating3d": return "Generating 3D model...";
      case "completed": return "Process completed!";
      case "error": return "An error occurred";
      default: return "";
    }
  };

  // Generate image using GPT-image-1
  const handleGenerateImage = async () => {
    if (!selectedFile) {
      toast({
        title: "No Image",
        description: "Please upload an image to enhance.",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    setLogMessages([]); // Reset logs for new generation
    setProcessStep("enhancing");
    setTripoModelLoaded(false);
    setTripoTaskId(null);
    setGeneratedImageUrl(null);
    const startTime = Date.now();
    addLog("Starting image enhancement with GPT-image-1");
    
    try {
      // Create form data with the image and prompt
      const formData = new FormData();
      formData.append("file", selectedFile);
      
      // Always explicitly add the prompt
      const promptToUse = prompt.trim() || "Create a 2.5D gray charm"; // Fallback if empty
      formData.append("prompt", promptToUse);
      addLog(`Using prompt: "${promptToUse}"`);
      
      // Log what we're sending
      addLog(`File: ${selectedFile.name} (${Math.round(selectedFile.size / 1024)}KB)`);
      
      // Call our enhance-image-with-gpt API endpoint
      addLog("Sending request to enhance-image-with-gpt endpoint");
      const requestStartTime = Date.now();
      
      const response = await fetch("/api/enhance-image-with-gpt", {
        method: "POST",
        body: formData,
      });
      
      const requestDuration = (Date.now() - requestStartTime) / 1000;
      addLog(`Server responded with status: ${response.status} after ${requestDuration.toFixed(1)}s`);
      
      if (!response.ok) {
        const errorData = await response.json();
        addLog(`Error response: ${JSON.stringify(errorData)}`);
        throw new Error(errorData.error || "Failed to process image");
      }
      
      const data = await response.json();
      addLog(`Response data: ${JSON.stringify(data, null, 2)}`);
      
      // Set the generated image URL and Tripo task ID
      if (data.enhancedImageUrl) {
        addLog(`Enhanced image URL received: ${data.enhancedImageUrl.substring(0, 50)}...`);
        setGeneratedImageUrl(data.enhancedImageUrl);
        setProcessingTime(data.processingTime || (Date.now() - startTime) / 1000);
        
        if (data.tripoTaskId) {
          addLog(`Tripo task ID received: ${data.tripoTaskId}`);
          setTripoTaskId(data.tripoTaskId);
          addLog(`Jewelry type: ${data.jewelryType || "unknown"}`);
          
          toast({
            title: "Processing Complete",
            description: "Your 2.5D charm was created and a 3D model is being generated.",
          });
        } else {
          toast({
            title: "Charm Created",
            description: "Your 2.5D charm was successfully created with GPT-image-1.",
          });
        }
        
        setProcessStep("completed");
      } else {
        addLog("Missing image URL in response");
        throw new Error("No image URL in response");
      }
    } catch (error) {
      console.error("Error processing image:", error);
      addLog(`Error: ${error instanceof Error ? error.message : String(error)}`);
      setProcessStep("error");
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process image. Please try again.",
        variant: "destructive",
      });
    } finally {
      const totalTime = (Date.now() - startTime) / 1000;
      addLog(`Process completed in ${totalTime.toFixed(2)} seconds`);
      setIsGenerating(false);
    }
  };

  // Download generated image
  const downloadGeneratedImage = async () => {
    if (!generatedImageUrl) return;
    
    try {
      addLog("Downloading enhanced image");
      
      // Handle different types of URLs
      let imageBlob;
      if (generatedImageUrl.startsWith('/api/enhanced-images/')) {
        // This is an API endpoint URL - fetch from our own API
        const response = await fetch(generatedImageUrl);
        
        if (!response.ok) {
          addLog(`Download failed with status: ${response.status}`);
          throw new Error(`Failed to download: ${response.statusText}`);
        }
        
        imageBlob = await response.blob();
      } else {
        // This is a direct image URL - fetch normally
        const response = await fetch(generatedImageUrl);
        
        if (!response.ok) {
          addLog(`Download failed with status: ${response.status}`);
          throw new Error(`Failed to download: ${response.statusText}`);
        }
        
        imageBlob = await response.blob();
      }
      
      // Create download link
      const url = window.URL.createObjectURL(imageBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `charm-image-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addLog("Image downloaded successfully");
    } catch (error) {
      console.error("Error downloading image:", error);
      addLog(`Download error: ${error instanceof Error ? error.message : String(error)}`);
      toast({
        title: "Download Failed",
        description: "Could not download the generated image.",
        variant: "destructive",
      });
    }
  };

  // Reset everything
  const handleReset = () => {
    addLog("Resetting component state");
    setSelectedFile(null);
    setPreviewUrl(null);
    setGeneratedImageUrl(null);
    setTripoTaskId(null);
    setTripoModelLoaded(false);
    setPrompt("");
    setProcessingTime(null);
    setLogMessages([]);
    setProcessStep("idle");
    setActiveTab("image");
  };
  
  // Handle Tripo iframe loading
  const handleTripoIframeLoad = () => {
    setTripoModelLoaded(true);
    addLog("Tripo 3D model viewer loaded");
  };

  // Check Tripo model status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (tripoTaskId && !tripoModelLoaded) {
      // Set up polling to check the status of the Tripo model
      interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/check-tripo-status?taskId=${tripoTaskId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.status === "completed") {
              clearInterval(interval);
              addLog("Tripo model generation completed");
              setTripoModelLoaded(true);
              // Automatically switch to 3D tab when model is ready
              setActiveTab("model");
            } else if (data.status === "failed") {
              clearInterval(interval);
              addLog(`Tripo model generation failed: ${data.message || "Unknown error"}`);
              toast({
                title: "3D Model Failed",
                description: "We couldn't generate the 3D model. You can still use the 2.5D image.",
                variant: "destructive",
              });
            } else {
              addLog(`Tripo model status: ${data.status}`);
            }
          }
        } catch (error) {
          console.error("Error checking Tripo status:", error);
        }
      }, 5000); // Check every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [tripoTaskId, tripoModelLoaded, toast]);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>2.5D Charm Generator</CardTitle>
        <CardDescription>
          Upload an image and transform it into a 2.5D relief charm with OpenAI's GPT-image-1 model
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="image" onValueChange={setActiveTab} value={activeTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="image">Image</TabsTrigger>
            <TabsTrigger value="model" disabled={!tripoTaskId || !tripoModelLoaded}>
              3D Model {tripoTaskId && !tripoModelLoaded && <RefreshCw className="ml-2 h-3 w-3 animate-spin" />}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="image" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Image Upload Section - Left Column */}
              <div className="space-y-4">
                <Label>Upload Image</Label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition h-48
                    ${isDragActive ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:bg-muted/25"} 
                    ${isGenerating ? "opacity-50 pointer-events-none" : ""}`}
                >
                  <input {...getInputProps()} />
                  {previewUrl ? (
                    <div className="relative h-full w-full flex items-center justify-center">
                      <img 
                        src={previewUrl} 
                        alt="Preview" 
                        className="max-h-full max-w-full object-contain rounded"
                      />
                      {!isGenerating && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className="absolute bottom-1 right-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            setPreviewUrl(null);
                          }}
                        >
                          <Repeat className="h-3 w-3 mr-1" /> Change
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      <Camera className="h-8 w-8 mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground text-center">
                        Drop an image here or click to upload
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        Supports JPG, PNG (max 10MB)
                      </p>
                    </>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="prompt">Prompt (Optional)</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Describe how you want to enhance the image (optional)"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[80px]"
                    disabled={isGenerating}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleGenerateImage}
                    disabled={!selectedFile || isGenerating}
                    className="w-full"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        {getStepDescription()}
                      </>
                    ) : (
                      <>
                        <ImageIcon className="mr-2 h-4 w-4" />
                        Enhance Image
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={isGenerating}
                  >
                    <Repeat className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Enhanced Image Display - Right Column */}
              <div className="space-y-4">
                <Label>Enhanced Image {isGenerating && <RefreshCw className="inline-block h-3 w-3 animate-spin ml-1" />}</Label>
                <div className="border-2 border-dashed rounded-lg p-4 flex items-center justify-center h-48 bg-muted/10">
                  {generatedImageUrl ? (
                    <div className="relative h-full w-full flex items-center justify-center">
                      <img
                        src={generatedImageUrl}
                        alt="Enhanced"
                        className="max-h-full max-w-full object-contain rounded"
                        onError={(e) => {
                          console.error("Error loading image:", generatedImageUrl);
                          addLog(`Error loading enhanced image from: ${generatedImageUrl}`);
                          // Try with a cache buster if it's our API endpoint
                          if (generatedImageUrl.startsWith('/api/enhanced-images/')) {
                            const cacheBuster = `?t=${Date.now()}`;
                            e.currentTarget.src = `${generatedImageUrl}${cacheBuster}`;
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="absolute bottom-1 right-1"
                        onClick={downloadGeneratedImage}
                      >
                        <Download className="h-3 w-3 mr-1" /> Save
                      </Button>
                    </div>
                  ) : isGenerating ? (
                    <div className="flex flex-col items-center justify-center text-center space-y-2">
                      <RefreshCw className="h-8 w-8 animate-spin text-primary/70" />
                      <p className="text-sm text-muted-foreground">{getStepDescription()}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center space-y-1">
                      <ImageIcon2 className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">Enhanced image will appear here</p>
                    </div>
                  )}
                </div>
                
                {generatedImageUrl && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Processing Time</Label>
                      <span className="text-xs text-muted-foreground">
                        {processingTime !== null ? `${processingTime.toFixed(1)}s` : "--"}
                      </span>
                    </div>
                    
                    {tripoTaskId && (
                      <div className="flex justify-between">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setActiveTab("model")}
                          disabled={!tripoModelLoaded}
                          className="w-full"
                        >
                          {tripoModelLoaded ? (
                            <>
                              <Box className="mr-2 h-4 w-4" />
                              View 3D Model
                            </>
                          ) : (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Generating 3D...
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Activity Log */}
            {logMessages.length > 0 && (
              <div className="mt-6 space-y-2">
                <Label className="flex justify-between items-center">
                  <span>Activity Log</span>
                  <span className="text-xs text-muted-foreground">{logMessages.length} events</span>
                </Label>
                <div className="border rounded p-3 bg-muted/10 h-32 overflow-y-auto text-xs font-mono">
                  {logMessages.map((msg, i) => (
                    <div key={i} className="py-0.5">
                      {msg}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="model">
            {tripoTaskId && tripoModelLoaded ? (
              <div className="aspect-video w-full border rounded overflow-hidden">
                <iframe
                  src={`https://viewer.tripo3d.ai/models/${tripoTaskId}?autorotate=true&background=gradient`}
                  className="w-full h-full"
                  onLoad={handleTripoIframeLoad}
                  allow="fullscreen"
                ></iframe>
              </div>
            ) : (
              <div className="aspect-video w-full border rounded flex items-center justify-center">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p>Loading 3D model...</p>
                </div>
              </div>
            )}
            
            {tripoTaskId && (
              <div className="mt-4 flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab("image")}
                >
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Back to Image
                </Button>
                
                <a
                  href={`https://viewer.tripo3d.ai/models/${tripoTaskId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="secondary">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open in Fullscreen
                  </Button>
                </a>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 