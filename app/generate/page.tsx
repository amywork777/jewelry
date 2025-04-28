"use client"

import { useState, useEffect } from "react"
import { CustomModelGenerator } from "../../lib/custom-model-generator"
import { Toaster } from "../../components/ui/toaster"
import JewelryViewer from "../viewer/components/JewelryViewer"

export default function GeneratePage() {
  const [generatedStlUrl, setGeneratedStlUrl] = useState<string | undefined>(undefined)
  
  // Listen for the stlGenerated custom event from the CustomModelGenerator
  useEffect(() => {
    const handleStlGenerated = (event: CustomEvent) => {
      const { stlUrl } = event.detail;
      console.log("STL URL received from event:", stlUrl);
      setGeneratedStlUrl(stlUrl);
    };
    
    // Add event listener for custom event
    document.addEventListener('stlGenerated', handleStlGenerated as EventListener);
    
    // Clean up
    return () => {
      document.removeEventListener('stlGenerated', handleStlGenerated as EventListener);
    };
  }, []);
  
  return (
    <main className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 container mx-auto py-6 md:py-12 px-2 md:px-8">
        <CustomModelGenerator />
        
        <div className="mt-6 md:mt-12 pt-4 md:pt-8 border-t border-gray-200">
          <h2 className="text-xl md:text-2xl font-light text-center mb-2 md:mb-6">Your Generated Charm</h2>
          <p className="text-center text-gray-500 mb-4 md:mb-8">
            {generatedStlUrl 
              ? "Customize your generated charm below" 
              : "Generate a charm above to see it displayed here"}
          </p>
          
          {/* Jewelry Viewer Component */}
          <div id="stl-model-viewer" className="max-w-screen-xl mx-auto">
            <JewelryViewer stlUrl={generatedStlUrl} />
          </div>
        </div>
      </div>
      <Toaster />
    </main>
  )
} 