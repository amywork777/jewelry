"use client"

import { useState, useRef } from "react"
import { ArrowLeft, Filter, Search, Sparkles, ImageIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"

export default function DesignsPage() {
  const [searchText, setSearchText] = useState("")
  const [selectedFilter, setSelectedFilter] = useState<string>("All")
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropAreaRef = useRef<HTMLDivElement>(null)
  
  // Sample design categories
  const categories = ["All", "Rings", "Necklaces", "Earrings", "Bracelets", "Pendants"]
  
  // Sample design data - in a real app, this would come from an API or database
  const designs = Array.from({ length: 24 }, (_, i) => ({
    id: i + 1,
    image: `https://source.unsplash.com/random/300x300/?jewelry&sig=${i}`,
    title: `Design ${i + 1}`,
    category: categories[Math.floor(Math.random() * (categories.length - 1)) + 1]
  }))
  
  const filteredDesigns = selectedFilter === "All" 
    ? designs 
    : designs.filter(design => design.category === selectedFilter)

  const handleAIClick = () => {
    // Redirect to customizer page with search text as a query parameter
    if (searchText.trim()) {
      console.log(`Redirecting to customizer with prompt: ${searchText.trim()}`);
      const queryParam = `?prompt=${encodeURIComponent(searchText.trim())}`;
      window.location.href = `/customizer${queryParam}`;
    } else {
      // If no search text, just navigate to customizer
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
    <div className="min-h-screen bg-white text-gray-900 px-4 py-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <Link href="/" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to Home</span>
        </Link>
        <h1 className="text-2xl font-light tracking-tight">Design Gallery</h1>
        <div className="w-24"></div> {/* Spacer for alignment */}
      </div>
      
      {/* Search */}
      <div className="w-full max-w-xl mb-8 mx-auto">
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
      </div>
      
      {/* Filters */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-500">Filter by category</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedFilter(category)}
              className={`px-4 py-1.5 text-xs rounded-full transition-colors ${
                selectedFilter === category
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      
      {/* Designs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {filteredDesigns.map(design => (
          <div key={design.id} className="group cursor-pointer">
            <div className="aspect-square overflow-hidden rounded-md bg-gray-100 mb-2 relative">
              <img 
                src={design.image} 
                alt={design.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105" 
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity" />
            </div>
            <h3 className="text-sm font-medium truncate">{design.title}</h3>
            <p className="text-xs text-gray-500">{design.category}</p>
          </div>
        ))}
      </div>
      
      {/* Empty State */}
      {filteredDesigns.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-gray-500 mb-4">No designs found in this category</p>
          <Button 
            variant="outline" 
            onClick={() => setSelectedFilter("All")}
            className="text-sm"
          >
            View all designs
          </Button>
        </div>
      )}
    </div>
  )
} 