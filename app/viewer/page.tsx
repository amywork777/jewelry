'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import JewelryViewer from './components/JewelryViewer'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

// Separate component that uses searchParams to avoid hydration issues
function ViewerContent() {
  const searchParams = useSearchParams()
  const [stlUrl, setStlUrl] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function loadModel() {
      setLoading(true)
      
      // Check if a model was selected from the library
      if (typeof window !== 'undefined') {
        const savedUrl = localStorage.getItem('selectedModelUrl')
        if (savedUrl) {
          setStlUrl(savedUrl)
          // Clear the storage so it doesn't persist unnecessarily
          localStorage.removeItem('selectedModelUrl')
          setLoading(false)
          return
        }
      }
      
      // Check if a specific model ID was provided in the URL
      const modelId = searchParams.get('modelId')
      if (modelId) {
        try {
          // This is a safer approach for Vercel deployment
          // Only import Firebase if needed
          const { getUserModelById } = await import('@/lib/firebase/models/stlModels').catch(err => {
            console.error('Error importing Firebase module:', err);
            return { getUserModelById: null };
          });
          
          if (getUserModelById) {
            const model = await getUserModelById(modelId);
            if (model && model.stlFileUrl) {
              setStlUrl(model.stlFileUrl);
            }
          } else {
            console.warn('Firebase module not available');
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
      
      {loading ? (
        <div className="h-[85vh] flex items-center justify-center">
          <p className="text-gray-500">Loading viewer...</p>
        </div>
      ) : (
        <JewelryViewer stlUrl={stlUrl} />
      )}
    </div>
  )
}

// Main page component with Suspense boundary
export default function ViewerPage() {
  return (
    <Suspense fallback={<div className="container mx-auto py-6">Loading viewer...</div>}>
      <ViewerContent />
    </Suspense>
  )
} 