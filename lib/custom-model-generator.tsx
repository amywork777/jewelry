"use client"

// Self-contained version that doesn't depend on external model generator
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface CustomModelGeneratorProps {
  onStlGenerated?: (stlUrl: string) => void;
}

export function CustomModelGenerator({ onStlGenerated }: CustomModelGeneratorProps) {
  const [prompt, setPrompt] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("text-to-3d");
  
  // Mock generation process
  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // For demo purposes, we'll use a placeholder STL URL
    const demoStlUrl = "https://storage.googleapis.com/ucloud-v3/ccab50f18aa14fe1b3d36b43a9fb33f7.stl";
    
    // Call the callback with the demo STL URL
    onStlGenerated?.(demoStlUrl);
    
    // Create custom event for compatibility with any other listeners
    const event = new CustomEvent('stlGenerated', { 
      detail: { stlUrl: demoStlUrl } 
    });
    document.dispatchEvent(event);
    
    setIsGenerating(false);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <CardHeader className="p-6 bg-white border-b border-gray-100">
          <CardTitle className="text-xl font-light tracking-tight mb-2 text-center">
            3D Model Studio
          </CardTitle>
          <CardDescription className="text-gray-500 text-sm text-center">
            Design, generate, and customize detailed 3D models
          </CardDescription>
        </CardHeader>
        
        <Tabs defaultValue="text-to-3d" className="w-full" value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-center items-center mb-4 w-full">
            <TabsList className="flex justify-center items-center mb-4 w-full max-w-400 mx-auto border-2 border-gray-200 rounded-xl bg-gray-50 p-1">
              <TabsTrigger 
                value="text-to-3d"
                className="flex-1 text-center py-2 px-3 text-sm rounded-lg"
              >
                Text to 3D
              </TabsTrigger>
              <TabsTrigger 
                value="image-to-3d"
                className="flex-1 text-center py-2 px-3 text-sm rounded-lg"
              >
                Image to 3D
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="text-to-3d" className="p-3 sm:p-6">
            <div className="space-y-4">
              <Textarea
                placeholder="Describe the 3D model you want to create... (e.g. 'minimal gold ring' or 'modern geometric sculpture')"
                className="w-full pl-4 pr-16 py-3 min-h-[100px] rounded-lg border border-gray-300 focus:ring-1 focus:ring-gray-300 focus:border-gray-300 text-sm"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              
              <Button
                onClick={handleGenerate}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white rounded-full px-6 py-2.5 flex items-center justify-center"
                disabled={isGenerating || !prompt.trim()}
              >
                {isGenerating ? 'Generating...' : 'Generate 3D Model'}
              </Button>
              
              <p className="text-xs text-gray-400 mt-2 text-center w-full">
                Try "minimal gold ring" or "modern geometric sculpture"
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="image-to-3d" className="p-3 sm:p-6">
            <div className="flex items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <div className="text-center">
                <p className="text-sm text-gray-500">Image to 3D conversion coming soon</p>
                <p className="text-xs text-gray-400 mt-1">Try the text-to-3D option for now</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
} 