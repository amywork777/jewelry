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
    addLog("Starting 2.5D charm generation with GPT-image-1");
    
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
      const response = await fetch(generatedImageUrl);
      
      if (!response.ok) {
        addLog(`Download failed with status: ${response.status}`);
        throw new Error(`Failed to download: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>2.5D Charm Generator</CardTitle>
        <CardDescription>
          Upload an image and transform it into a 2.5D relief charm with OpenAI's GPT-image-1 model
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Image Upload Area */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            isDragActive ? "border-primary bg-primary/10" : "border-gray-300 hover:bg-gray-50"
          } ${isGenerating ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <input {...getInputProps()} />
          {previewUrl ? (
            <div className="flex flex-col items-center gap-2">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-[200px] max-w-full object-contain rounded-lg"
              />
              <p className="text-sm text-gray-500">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setGeneratedImageUrl(null);
                    addLog("Image removed");
                  }}
                  className="text-sm h-9 px-3"
                  disabled={isGenerating}
                >
                  <Repeat className="h-4 w-4 mr-2" /> Change image
                </Button>
              </p>
            </div>
          ) : (
            <div className="py-8">
              <div className="flex justify-center">
                <Camera className="h-10 w-10 text-gray-400" />
              </div>
              <p className="mt-2 text-sm font-medium">
                Tap to upload or drag an image
              </p>
              <p className="mt-1 text-xs text-gray-500">
                JPG, PNG, or WebP up to 10MB
              </p>
            </div>
          )}
        </div>

        {/* Prompt Input */}
        <div className="space-y-2">
          <Label htmlFor="prompt">Additional Instructions (Optional)</Label>
          <Textarea
            id="prompt"
            placeholder="Add custom details or modifications to the 2.5D charm design. The system will use a comprehensive 2.5D charm prompt by default."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isGenerating}
            className="resize-none"
            rows={3}
          />
        </div>
        
        {/* Process Status */}
        {isGenerating && (
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center space-x-2">
              <Loader className="h-4 w-4 animate-spin text-gray-500" />
              <span className="text-sm font-medium">{getStepDescription()}</span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full">
              <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '100%' }}></div>
            </div>
          </div>
        )}

        {/* Generated Content Display */}
        {generatedImageUrl && (
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Generated Charm</h3>
              {processingTime && (
                <span className="text-xs text-gray-500">
                  Generated in {processingTime.toFixed(1)}s
                </span>
              )}
            </div>
            
            {/* Tabs for 2D/3D Views */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="image" className="flex items-center">
                  <ImageIcon2 className="h-4 w-4 mr-2" />
                  <span>2.5D Image</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="model" 
                  disabled={!tripoTaskId}
                  className="flex items-center"
                >
                  <Box className="h-4 w-4 mr-2" />
                  <span>3D Model {!tripoModelLoaded && tripoTaskId && "..."}</span>
                </TabsTrigger>
              </TabsList>
              
              {/* 2.5D Image Tab */}
              <TabsContent value="image" className="mt-2">
                <div className="flex justify-center">
                  <img
                    src={generatedImageUrl}
                    alt="2.5D Charm"
                    className="max-h-[300px] max-w-full object-contain rounded-lg"
                    onError={(e) => {
                      addLog("Error loading generated image");
                      console.error("Image failed to load:", generatedImageUrl);
                      e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f0f0f0'/%3E%3Cpath d='M30,30 L70,70 M30,70 L70,30' stroke='%23666' stroke-width='2'/%3E%3C/svg%3E";
                      e.currentTarget.alt = "Failed to load image";
                      e.currentTarget.className = "max-h-[300px] max-w-full object-contain rounded-lg border border-red-300";
                    }}
                  />
                </div>
                <div className="flex justify-end mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={downloadGeneratedImage}
                  >
                    <Download className="h-4 w-4 mr-2" /> Download
                  </Button>
                </div>
              </TabsContent>
              
              {/* 3D Model Tab */}
              <TabsContent value="model" className="mt-2">
                {tripoTaskId ? (
                  <div className="flex flex-col items-center">
                    {!tripoModelLoaded ? (
                      <div className="p-8 flex flex-col items-center">
                        <Loader className="h-8 w-8 animate-spin text-gray-400 mb-4" />
                        <p className="text-sm text-gray-500">3D model is being generated...</p>
                        <p className="text-xs text-gray-400 mt-1">This may take a minute or two</p>
                      </div>
                    ) : (
                      <iframe
                        src={`https://tripo3d.ai/embed/${tripoTaskId}`}
                        width="100%"
                        height="400"
                        frameBorder="0"
                        allow="autoplay; fullscreen"
                        className="rounded-lg"
                        onLoad={handleTripoIframeLoad}
                      ></iframe>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <p>No 3D model available yet</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Debug Log Display */}
        {logMessages.length > 0 && (
          <div className="border rounded-lg p-4 space-y-2 bg-gray-50">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-sm">Debug Logs</h3>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-xs"
                onClick={() => setLogMessages([])}
              >
                Clear
              </Button>
            </div>
            <div className="text-xs font-mono bg-black text-green-400 p-2 rounded h-32 overflow-y-auto">
              {logMessages.map((msg, i) => (
                <div key={i} className="mb-1">
                  {msg}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            className="flex-1 flex items-center justify-center"
            onClick={handleGenerateImage}
            disabled={isGenerating || !selectedFile}
          >
            {isGenerating ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <ImageIcon className="h-4 w-4 mr-2" />
                <span>Create 2.5D Charm</span>
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isGenerating}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 