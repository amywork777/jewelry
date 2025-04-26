"use client"

import { useState } from "react"
import { CustomModelGenerator } from "../../lib/custom-model-generator"
import { Toaster } from "../../temp-magicai/components/ui/toaster"
import JewelryViewer from "../viewer/components/JewelryViewer"

export default function GeneratePage() {
  const [generatedStlUrl, setGeneratedStlUrl] = useState<string | undefined>(undefined)
  
  return (
    <main className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 container mx-auto py-12 px-4">
        <CustomModelGenerator onStlGenerated={setGeneratedStlUrl} />
        <div className="mt-12 pt-8 border-t border-gray-200">
          <h2 className="text-2xl font-light text-center mb-6">Your Generated Model</h2>
          <p className="text-center text-gray-500 mb-8">
            {generatedStlUrl 
              ? "Customize your generated model below" 
              : "Generate a model above to see it displayed here"}
          </p>
          <JewelryViewer stlUrl={generatedStlUrl} />
        </div>
      </div>
      <Toaster />
    </main>
  )
} 