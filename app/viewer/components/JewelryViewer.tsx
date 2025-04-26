'use client'

import React, { useState } from 'react'

interface JewelryViewerProps {
  stlUrl?: string;
  readOnly?: boolean;
}

export default function JewelryViewer({ stlUrl, readOnly = false }: JewelryViewerProps) {
  const [materialType, setMaterialType] = useState<'gold' | 'silver' | 'rose-gold'>('gold')
  const [charmSize, setCharmSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [baseJewelryType, setBaseJewelryType] = useState<'necklace' | 'none'>('none')
  
  // Material colors mapping
  const materialColors = {
    'gold': '#FFD700',
    'silver': '#C0C0C0',
    'rose-gold': '#B76E79'
  }
  
  // Handle add to cart
  const handleAddToCart = () => {
    // This would integrate with your shopping cart functionality
    const itemDetails = {
      type: baseJewelryType || 'charm', // Default to 'charm' if no base type is selected
      charmSize: charmSize,
      material: materialType
    }
    
    // Determine what's being added to cart
    let itemDescription = "Charm only";
    if (baseJewelryType === 'necklace') {
      itemDescription = "Necklace";
    }
    if (!stlUrl) {
      itemDescription += " (no charm design selected)";
    }
    
    alert(`Added to cart: ${itemDescription}!`)
    console.log("Added to cart:", itemDetails)
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
      {/* Preview Box */}
      <div className="md:col-span-3 bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-center" style={{ minHeight: '400px' }}>
        {stlUrl ? (
          <div className="text-center">
            <div 
              style={{ 
                width: '200px', 
                height: '200px', 
                borderRadius: '50%', 
                backgroundColor: materialColors[materialType],
                margin: '0 auto'
              }}
            ></div>
            <p className="mt-4 text-gray-600">STL Model Preview (simplified)</p>
            <p className="text-sm text-gray-500">URL: {stlUrl}</p>
          </div>
        ) : (
          <div className="text-center text-gray-500">
            <p>No 3D model loaded</p>
            <p className="text-sm">Generate a model or upload one to see it here</p>
          </div>
        )}
      </div>
      
      {/* Controls Panel */}
      <div className="md:col-span-2 border border-gray-200 rounded-lg p-4">
        <h2 className="text-xl font-medium mb-4">Customize Your Model</h2>
        
        {/* Material Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
          <select 
            value={materialType} 
            onChange={(e) => setMaterialType(e.target.value as 'gold' | 'silver' | 'rose-gold')}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
            <option value="rose-gold">Rose Gold</option>
          </select>
        </div>
        
        {/* Size Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
          <select 
            value={charmSize} 
            onChange={(e) => setCharmSize(e.target.value as 'small' | 'medium' | 'large')}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="small">Small (0.5 inch / 12.7mm)</option>
            <option value="medium">Medium (1 inch / 25.4mm)</option>
            <option value="large">Large (1.5 inch / 38.1mm)</option>
          </select>
        </div>
        
        {/* Jewelry Type */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Jewelry Type</label>
          <select 
            value={baseJewelryType} 
            onChange={(e) => setBaseJewelryType(e.target.value as 'necklace' | 'none')}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          >
            <option value="none">Charm Only</option>
            <option value="necklace">Necklace with Charm</option>
          </select>
        </div>
        
        {/* Action Buttons */}
        <div className="pt-1 space-y-2">
          <button 
            onClick={handleAddToCart}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  )
} 