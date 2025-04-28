"use client"

import { useState, useEffect, useRef } from "react"
import { CustomModelGenerator } from "../../lib/custom-model-generator"
import { Toaster } from "../../components/ui/toaster"
import JewelryViewer from "../viewer/components/JewelryViewer"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"

export default function GeneratePage() {
  const [generatedStlUrl, setGeneratedStlUrl] = useState<string | undefined>(undefined)
  const charmSectionRef = useRef<HTMLDivElement>(null)
  const [isHighlighted, setIsHighlighted] = useState(false)
  const [isButtonHovered, setIsButtonHovered] = useState(false)
  const [showScrollButton, setShowScrollButton] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  
  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  // Setup scroll detection
  useEffect(() => {
    const handleScroll = () => {
      if (charmSectionRef.current && isMobile) {
        const rect = charmSectionRef.current.getBoundingClientRect()
        // If the charm section is visible, hide the scroll button
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          setShowScrollButton(false)
        } else {
          setShowScrollButton(true)
        }
      }
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isMobile])
  
  // Auto-scroll function
  const scrollToCharmSection = () => {
    if (charmSectionRef.current) {
      // Use smooth scrolling with a small delay to ensure content is rendered
      setTimeout(() => {
        charmSectionRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start'
        });
        
        // Apply highlight animation
        setIsHighlighted(true);
        setTimeout(() => {
          setIsHighlighted(false);
        }, 2000);
        
        // Hide the button on mobile after scrolling
        if (isMobile) {
          setShowScrollButton(false);
        }
      }, 300);
    }
  }
  
  // Listen for the stlGenerated custom event from the CustomModelGenerator
  useEffect(() => {
    const handleStlGenerated = (event: CustomEvent) => {
      const { stlUrl } = event.detail;
      console.log("STL URL received from event:", stlUrl);
      setGeneratedStlUrl(stlUrl);
      
      // Auto-scroll to the charm section when design is generated
      scrollToCharmSection();
    };
    
    // Add event listener for custom event
    document.addEventListener('stlGenerated', handleStlGenerated as EventListener);
    
    // Clean up
    return () => {
      document.removeEventListener('stlGenerated', handleStlGenerated as EventListener);
    };
  }, [isMobile]);
  
  return (
    <main className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 container mx-auto py-6 md:py-12 px-2 md:px-8">
        <CustomModelGenerator />
        
        {/* Scroll to charm section button */}
        {showScrollButton && (
          <div className="flex justify-center mt-8">
            <Button 
              onClick={scrollToCharmSection}
              onMouseEnter={() => setIsButtonHovered(true)}
              onMouseLeave={() => setIsButtonHovered(false)}
              variant="outline" 
              size="sm"
              className="rounded-full bg-card hover:bg-accent"
            >
              <ChevronDown className={`h-5 w-5 mr-1 ${isButtonHovered ? 'bounce-animation' : ''}`} />
              <span>See Your Charm</span>
            </Button>
          </div>
        )}
        
        <div 
          ref={charmSectionRef} 
          className={`mt-6 md:mt-12 pt-4 md:pt-8 border-t border-gray-200 scroll-mt-4 rounded-xl ${isHighlighted ? 'scroll-highlight' : ''}`}
        >
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