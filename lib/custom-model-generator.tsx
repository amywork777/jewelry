"use client"

// This is a customized version of the model-generator component
// Based on the original ModelGenerator from magicai

import { ModelGenerator } from "../temp-magicai/components/model-generator"
import { useEffect, useRef } from "react"

export function CustomModelGenerator() {
  const originalComponentRef = useRef<HTMLDivElement>(null);

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

        // Update the header titles to match our Jewelry Studio theme
        const headerElements = document.querySelectorAll('h2.text-xl.font-semibold');
        headerElements.forEach(element => {
          if (element.textContent?.includes('3D Model Generator')) {
            element.textContent = '3D Model Studio';
            element.className = 'text-xl font-light tracking-tight mb-2 text-center';
          }
        });

        // Update descriptions
        const descriptionElements = document.querySelectorAll('p.text-muted-foreground.text-sm');
        descriptionElements.forEach(element => {
          if (element.textContent?.includes('Create custom 3D models')) {
            element.textContent = 'Design, generate, and customize detailed 3D models';
            element.className = 'text-gray-500 text-sm text-center';
          }
        });

        // Update tab styles
        const tabsList = document.querySelector('[role="tablist"]');
        if (tabsList) {
          tabsList.className = 'flex justify-center items-center mb-4 w-full max-w-400 mx-auto border-2 border-gray-200 rounded-xl bg-gray-50 p-1';
        }

        // Update tab button styles
        const tabButtons = document.querySelectorAll('[role="tab"]');
        tabButtons.forEach(element => {
          element.className = 'flex-1 text-center py-2 px-3 text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm';
        });

        // Update the generate button style
        const generateButton = document.querySelector('button[type="submit"]');
        if (generateButton) {
          generateButton.className = 'w-full bg-gray-900 hover:bg-gray-800 text-white rounded-full px-6 py-2.5 flex items-center justify-center';
          
          // Monitor button state
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.attributeName === 'disabled') {
                const button = mutation.target as HTMLButtonElement;
                if (button.disabled) {
                  button.textContent = 'Generating...';
                } else {
                  button.textContent = 'Generate 3D Model';
                }
              }
            });
          });
          
          observer.observe(generateButton, { attributes: true });
        }
        
        // Style the textarea
        const textareaElement = document.querySelector('textarea');
        if (textareaElement) {
          textareaElement.className = 'w-full pl-4 pr-16 py-3 min-h-[100px] rounded-lg border border-gray-300 focus:ring-1 focus:ring-gray-300 focus:border-gray-300 text-sm';
          textareaElement.placeholder = "Describe the 3D model you want to create... (e.g. 'minimal gold ring' or 'modern geometric sculpture')";
        }
        
        // Add suggestion text
        const textareaParent = textareaElement?.parentElement;
        if (textareaParent) {
          const suggestionText = document.createElement('p');
          suggestionText.className = 'text-xs text-gray-400 mt-2 text-center w-full';
          suggestionText.textContent = 'Try "minimal gold ring" or "modern geometric sculpture"';
          
          // Check if it already exists
          const existingSuggestion = textareaParent.querySelector('.text-xs.text-gray-400');
          if (!existingSuggestion) {
            textareaParent.appendChild(suggestionText);
          }
        }
        
        // Update the "Image to 3D" tab content
        const tabContents = document.querySelectorAll('[role="tabpanel"]');
        tabContents.forEach((element, index) => {
          if (index === 1) { // Image to 3D tab is usually the second tab
            // Clear existing content
            element.innerHTML = '';
            
            // Add placeholder for "coming soon"
            const placeholderDiv = document.createElement('div');
            placeholderDiv.className = 'flex items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50';
            
            const innerContent = document.createElement('div');
            innerContent.className = 'text-center';
            
            const mainText = document.createElement('p');
            mainText.className = 'text-sm text-gray-500';
            mainText.textContent = 'Image to 3D conversion coming soon';
            
            const subText = document.createElement('p');
            subText.className = 'text-xs text-gray-400 mt-1';
            subText.textContent = 'Try the text-to-3D option for now';
            
            innerContent.appendChild(mainText);
            innerContent.appendChild(subText);
            placeholderDiv.appendChild(innerContent);
            element.appendChild(placeholderDiv);
          }
        });
      } catch (error) {
        console.error("Error modifying model generator UI:", error);
      }
    };

    // Run initial changes
    applyChanges();
    
    // Set up a mutation observer to apply changes when content changes
    const observer = new MutationObserver(() => {
      applyChanges();
    });
    
    observer.observe(originalComponentRef.current, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={originalComponentRef}>
      <ModelGenerator />
    </div>
  );
} 