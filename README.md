# Minimalist Jewelry - 3D Customizer

An elegant web application for customizing and generating 3D jewelry models using AI.

## Features

- **3D Model Customization**: View and interact with jewelry in 3D
- **AI-Generated Designs**: Generate unique jewelry designs from text descriptions
- **Material Selection**: Choose from gold, silver, rose gold, and platinum finishes
- **Size Customization**: Customize jewelry sizes to fit your preferences
- **Live Preview**: Real-time 3D preview of all customizations
- **Model Rendering**: Support for STL and GLB/GLTF model formats
- **Proxy API**: Server-side proxy for external 3D model services to avoid CORS issues

## Tech Stack

- Next.js 14
- TypeScript
- Three.js for 3D rendering
- TailwindCSS for styling
- Shadcn UI components
- Tripo3D API for 3D model generation

## Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env file with your API keys

# Run the development server
npm run dev
```

## Environment Variables

Required environment variables:

- `TRIPO_API_KEY`: API key for the Tripo3D service
- `OPENAI_API_KEY`: API key for OpenAI (needed for image analysis features)

## Deploying to Vercel

When deploying to Vercel, you need to set up the required environment variables in the Vercel dashboard:

1. Go to your project in the Vercel dashboard
2. Navigate to "Settings" > "Environment Variables"
3. Add the following variables:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `TRIPO_API_KEY`: Your Tripo3D API key
4. Deploy your project

Without these environment variables properly set, certain features like AI-generated designs and image analysis will not work correctly.

## Usage

1. Open `http://localhost:3000` in your browser
2. Use the search bar to find jewelry or generate custom designs with AI
3. Customize material and size options
4. Interact with the 3D model using mouse controls
5. Rotate the model using on-screen controls
6. Add designs to cart

## Credits

- 3D model generation powered by [Tripo3D](https://tripo3d.ai/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- 3D rendering library [Three.js](https://threejs.org/) 