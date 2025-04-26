'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import JewelryViewer from './components/JewelryViewer'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { getUserModelById } from '@/lib/firebase/models/stlModels'

export default function ViewerPage() {
  const searchParams = useSearchParams()
  const [stlUrl, setStlUrl] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function loadModel() {
      setLoading(true)
      
      // Check if a model was selected from the library
      const savedUrl = localStorage.getItem('selectedModelUrl')
      if (savedUrl) {
        setStlUrl(savedUrl)
        // Clear the storage so it doesn't persist unnecessarily
        localStorage.removeItem('selectedModelUrl')
        setLoading(false)
        return
      }
      
      // Check if a specific model ID was provided in the URL
      const modelId = searchParams.get('modelId')
      if (modelId) {
        try {
          const model = await getUserModelById(modelId)
          if (model && model.stlFileUrl) {
            setStlUrl(model.stlFileUrl)
          }
        } catch (err) {
          console.error('Error loading model:', err)
        }
      }
      
      setLoading(false)
    }
    
    loadModel()
  }, [searchParams])
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-4">
        <Button 
          variant="outline" 
          onClick={() => window.history.back()}
          className="flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>
      
      <JewelryViewer stlUrl={stlUrl} />
    </div>
  )
} 