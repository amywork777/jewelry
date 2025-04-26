'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import JewelryViewer from './components/JewelryViewer'

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
          localStorage.removeItem('selectedModelUrl')
        }
      }
      
      setLoading(false)
    }
    
    loadModel()
  }, [searchParams])
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-4">
        <button 
          onClick={() => window.history.back()}
          className="flex items-center px-4 py-2 border border-gray-300 rounded"
        >
          Back
        </button>
      </div>
      
      <JewelryViewer stlUrl={stlUrl} />
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