'use client'

import JewelryViewer from './components/JewelryViewer'

export default function ViewerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">Interactive Jewelry Designer</h1>
        <div className="bg-white rounded-lg shadow-lg p-6">
          <JewelryViewer />
        </div>
      </div>
    </div>
  )
} 