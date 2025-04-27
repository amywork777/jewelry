"use client"

// This is a customized version of the model-generator component
// Based on the original ModelGenerator from magicai

import { ModelGenerator } from "../components/model/generator"
import { useEffect, useRef } from "react"

export function CustomModelGenerator() {
  const originalComponentRef = useRef<HTMLDivElement>(null);

  // Listen for the stlGenerated event to scroll to the model
  useEffect(() => {
    const handleStlGenerated = () => {
      // Wait a bit for the UI to update
      setTimeout(() => {
        // Find the STL viewer element by ID
        const stlViewer = document.getElementById('stl-model-viewer');
        if (stlViewer) {
          stlViewer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          // Fallback to class selector if ID is not found
          const fallbackViewer = document.querySelector('[class*="bg-gray-100 rounded-lg overflow-hidden border"]');
          if (fallbackViewer) {
            fallbackViewer.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 500);
    };

    // Add event listener
    document.addEventListener('stlGenerated', handleStlGenerated);
    
    // Clean up
    return () => {
      document.removeEventListener('stlGenerated', handleStlGenerated);
    };
  }, []);

  // Function to fix layout issues and remove unwanted content
  useEffect(() => {
    if (!originalComponentRef.current) return;

    const applyChanges = () => {
      try {
        // Remove FISHCAD instruction blocks
        const instructionBlocks = document.querySelectorAll('.w-full.p-3.border.border-gray-200.rounded-md.text-xs.sm\\:text-sm.text-gray-700.bg-gray-50');
        instructionBlocks.forEach(element => {
          if (element.textContent?.includes('FISHCAD')) {
            element.remove();
          }
        });

        // Style the overall container to match the main landing page
        const cardElement = document.querySelector('.w-full.max-w-4xl.mx-auto');
        if (cardElement) {
          cardElement.className = 'w-full max-w-2xl mx-auto';
        }

        // Style the card component
        const mainCard = document.querySelector('[role="tabpanel"]')?.closest('.border');
        if (mainCard) {
          mainCard.className = 'bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden';
        }

        // Style the card header
        const cardHeader = document.querySelector('.p-4.sm\\:p-6');
        if (cardHeader) {
          cardHeader.className = 'p-6 bg-white border-b border-gray-100';
          
          // Style the title
          const title = cardHeader.querySelector('.text-xl.sm\\:text-2xl');
          if (title) {
            title.className = 'text-xl font-light tracking-tight mb-2 text-center';
            title.textContent = '3D Model Studio';
          }
          
          // Style the description
          const description = cardHeader.querySelector('.text-center.text-sm');
          if (description) {
            description.className = 'text-gray-500 text-sm text-center';
            description.textContent = 'Design, generate, and customize detailed 3D models';
          }
        }

        // Fix the tab layout
        const tabsList = document.querySelector('[role="tablist"]');
        if (tabsList) {
          // Style the tabs container similar to the main page search box
          tabsList.className = "flex justify-center items-center mb-4 w-full";
          
          // Apply custom styles to match the search box
          (tabsList as HTMLElement).style.cssText = `
            display: flex;
            flex-direction: row;
            width: 100%;
            max-width: 400px;
            margin: 0 auto 1rem auto;
            border-radius: 0.75rem;
            border: 2px solid #e5e7eb;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            background-color: #f9fafb;
            padding: 0.25rem;
          `;
          
          // Update tab styling
          const tabs = tabsList.querySelectorAll('[role="tab"]');
          tabs.forEach((tab, index) => {
            // Clear existing classes
            tab.className = "";
            
            // Style each tab to be side by side with landing page styling
            (tab as HTMLElement).style.cssText = `
              flex: 1 1 0%;
              text-align: center;
              padding: 0.5rem 0.75rem;
              font-size: 0.875rem;
              font-weight: 400;
              color: #4b5563;
              cursor: pointer;
              border-radius: 0.5rem;
              margin: 0 0.25rem;
              transition: all 0.2s;
            `;
            
            // Add event listener to toggle data-state
            tab.addEventListener('click', () => {
              tabs.forEach(t => t.setAttribute('data-state', 'inactive'));
              tab.setAttribute('data-state', 'active');
            });
            
            // Style active tab
            if (tab.getAttribute('data-state') === 'active') {
              (tab as HTMLElement).style.backgroundColor = '#fff';
              (tab as HTMLElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
              (tab as HTMLElement).style.fontWeight = '500';
              (tab as HTMLElement).style.color = '#111827';
            }
            
            // No margin for first and last items
            if (index === 0) {
              (tab as HTMLElement).style.marginLeft = '0';
            }
            if (index === tabs.length - 1) {
              (tab as HTMLElement).style.marginRight = '0';
            }
          });
        }

        // Style the textarea
        const textarea = document.querySelector('textarea');
        if (textarea) {
          textarea.className = 'w-full pl-4 pr-16 py-3 min-h-[100px] rounded-lg border border-gray-300 focus:ring-1 focus:ring-gray-300 focus:border-gray-300 text-sm';
        }

        // Style the Generate button
        const generateBtn = document.querySelector('button:has(.h-3.w-3.sm\\:h-4.sm\\:w-4.mr-1)');
        if (generateBtn) {
          generateBtn.className = 'w-full bg-gray-900 hover:bg-gray-800 text-white rounded-full px-6 py-2.5 flex items-center justify-center';
        }

        // Style the Download STL button
        const downloadBtn = document.querySelector('button:has(.h-3.w-3.sm\\:h-4.sm\\:w-4.mr-1.sm\\:mr-2)');
        if (downloadBtn) {
          downloadBtn.className = 'w-full bg-gray-900 hover:bg-gray-800 text-white rounded-full px-6 py-2.5 flex items-center justify-center';
        }

        // Style the Create New Model button
        const resetBtn = document.querySelectorAll('button');
        resetBtn.forEach(btn => {
          if (btn.textContent?.includes('Create New Model')) {
            btn.className = 'w-full border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-full px-6 py-2.5 flex items-center justify-center mt-3';
          }
        });
        
        // Add helpful message below the generator
        const cardContent = document.querySelector('.p-3.sm\\:p-6');
        if (cardContent && !document.querySelector('.text-xs.text-gray-400.mt-2')) {
          const helpText = document.createElement('p');
          helpText.className = 'text-xs text-gray-400 mt-2 text-center w-full';
          helpText.textContent = 'Try "minimal gold ring" or "modern geometric sculpture"';
          cardContent.appendChild(helpText);
        }
        
        // Remove any additional FISHCAD references
        // Look for any element containing FISHCAD text
        document.querySelectorAll('*').forEach(element => {
          if (element.textContent?.includes('FISHCAD') && 
              !element.querySelector('*') && // Only target leaf nodes
              element.parentElement) {
                
            const parent = element.parentElement;
            // If it's a list item or paragraph in an instructions block, remove the whole section
            if ((element.tagName === 'LI' || element.tagName === 'P') && 
                parent.closest('.p-3.border.border-gray-200.rounded-md')) {
              const section = parent.closest('.p-3.border.border-gray-200.rounded-md');
              section?.remove();
            }
          }
        });
      } catch (error) {
        console.error("Error applying custom styles:", error);
      }
    };

    // Initial application
    const timeoutId = setTimeout(applyChanges, 1000);
    
    // Also set up a mutation observer to handle dynamic content changes
    const observer = new MutationObserver(applyChanges);
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={originalComponentRef}>
      <ModelGenerator />
    </div>
  );
} 