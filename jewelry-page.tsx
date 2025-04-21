"use client"

import { useState, useRef } from "react"
import { Search, Sparkles, Truck, ChevronRight, ImageIcon, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function JewelryPage() {
  const [searchText, setSearchText] = useState("")
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropAreaRef = useRef<HTMLDivElement>(null)
  
  // Sample recent designs
  const recentDesigns = [
    { id: 1, image: "https://source.unsplash.com/random/300x300/?gold+ring" },
    { id: 2, image: "https://source.unsplash.com/random/300x300/?silver+necklace" },
    { id: 3, image: "https://source.unsplash.com/random/300x300/?diamond+earrings" },
    { id: 4, image: "https://source.unsplash.com/random/300x300/?bracelet" },
    { id: 5, image: "https://source.unsplash.com/random/300x300/?gemstone+ring" },
    { id: 6, image: "https://source.unsplash.com/random/300x300/?gold+pendant" },
    { id: 7, image: "https://source.unsplash.com/random/300x300/?silver+ring" },
    { id: 8, image: "https://source.unsplash.com/random/300x300/?pearl+necklace" }
  ]
  
  const handleAIClick = () => {
    // Redirect to customizer page with search text as query param
    if (searchText.trim()) {
      console.log(`Redirecting to customizer with prompt: ${searchText.trim()}`);
      // Use window.location for client-side navigation with query params
      window.location.href = `/customizer?prompt=${encodeURIComponent(searchText.trim())}`;
    } else {
      // If there's no search text, just navigate to the customizer page
      window.location.href = `/customizer`;
    }
  }
  
  const handleSearch = () => {
    // Add search functionality here
    if (searchText.trim()) {
      alert(`Searching for: ${searchText}`)
    }
  }
  
  const handleImageUpload = () => {
    // Trigger file input click
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
    // Check if file is an image
    if (file.type.startsWith('image/')) {
      // Create a URL for the selected image
      const imageUrl = URL.createObjectURL(file)
      setSelectedImage(imageUrl)
    } else {
      alert('Please upload an image file')
    }
  }
  
  const handleRemoveImage = () => {
    setSelectedImage(null)
    // Reset the file input
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

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center px-4 py-16 max-w-5xl mx-auto">
      {/* Header */}
      <div className="w-full max-w-2xl text-center mb-16">
        <h1 className="text-3xl font-light tracking-tight mb-3">Jewelry Studio</h1>
        <p className="text-gray-500 text-sm">Design, discover, or customize your perfect piece</p>
      </div>

      {/* Search */}
      <div className="w-full max-w-xl mb-16 mx-auto">
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
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-4 pr-16 py-2.5 border-none rounded-lg focus:ring-1 focus:ring-gray-300"
            />
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button 
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1.5 transition-colors border border-gray-300"
                onClick={handleAIClick}
                title="AI Search"
              >
                <Sparkles className="h-4 w-4" />
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
        <p className="text-xs text-gray-400 mt-2 text-left pl-1">Try "minimal gold ring" or "geometric earrings"</p>
      </div>

      {/* Features */}
      <div className="flex flex-row justify-center gap-8 w-full mb-20 flex-wrap sm:flex-nowrap">
        <div className="flex flex-col items-center text-center">
          <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center mb-4">
            <Search className="h-5 w-5 text-gray-700" />
          </div>
          <h3 className="text-sm font-medium mb-1">Browse Collection</h3>
          <p className="text-xs text-gray-500">Curated designs for every style</p>
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center mb-4">
            <Sparkles className="h-5 w-5 text-gray-700" />
          </div>
          <h3 className="text-sm font-medium mb-1">AI Design</h3>
          <p className="text-xs text-gray-500">Create unique pieces with AI</p>
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center mb-4">
            <Truck className="h-5 w-5 text-gray-700" />
          </div>
          <h3 className="text-sm font-medium mb-1">Home Delivery</h3>
          <p className="text-xs text-gray-500">Shipped directly to you</p>
        </div>
      </div>

      {/* Gallery */}
      <div className="w-full mb-16">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-light">Recent Designs</h2>
          <Link href="/designs" className="text-xs text-gray-500 hover:text-gray-700">
            View all
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {recentDesigns.map((design) => (
            <div key={design.id} className="aspect-square bg-gray-50 rounded-md overflow-hidden group cursor-pointer">
              <img 
                src={design.image} 
                alt={`Design ${design.id}`} 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="w-full max-w-lg mb-16">
        <div className="flex flex-col space-y-4 text-sm">
          <div className="flex items-center">
            <span className="text-xs text-gray-400 mr-2">01</span>
            <span className="text-gray-600">Describe your vision</span>
            <ChevronRight className="ml-auto h-4 w-4 text-gray-300" />
          </div>
          <div className="flex items-center">
            <span className="text-xs text-gray-400 mr-2">02</span>
            <span className="text-gray-600">Review design options</span>
            <ChevronRight className="ml-auto h-4 w-4 text-gray-300" />
          </div>
          <div className="flex items-center">
            <span className="text-xs text-gray-400 mr-2">03</span>
            <span className="text-gray-600">Customize materials</span>
            <ChevronRight className="ml-auto h-4 w-4 text-gray-300" />
          </div>
          <div className="flex items-center">
            <span className="text-xs text-gray-400 mr-2">04</span>
            <span className="text-gray-600">Receive at your door</span>
            <ChevronRight className="ml-auto h-4 w-4 text-gray-300" />
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="w-full max-w-md text-center">
        <h2 className="text-lg font-light mb-6">Create your unique piece</h2>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/customizer">
            <Button className="bg-gray-900 hover:bg-gray-800 text-white rounded-full px-6">
              Start Creating
            </Button>
          </Link>
          <Link href="/designs">
            <Button variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50 rounded-full px-6">
              Browse Gallery
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
