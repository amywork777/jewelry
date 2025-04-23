# STL Database Implementation Guide

## Overview

This document outlines the implementation of a dual-database system for STL files in our jewelry customizer application:
1. A **public library** available to all users
2. **User-specific collections** where users can save private models

## Database Structure

### Firebase Collections

#### 1. `public_stl_models`
```typescript
interface PublicSTLModel {
  id: string;            // Auto-generated
  name: string;          // Display name
  description: string;   // Description
  category: string;      // e.g., "Charm", "Necklace", "Ring"
  tags: string[];        // Keywords for search
  thumbnailUrl: string;  // Preview image
  stlFileUrl: string;    // STL file location
  createdAt: timestamp;  // Creation date
  createdBy: string;     // User ID (if shared from private)
  likes: number;         // Engagement metric
  downloads: number;     // Usage tracking
}
```

#### 2. `user_stl_models`
```typescript
interface UserSTLModel {
  id: string;                // Auto-generated
  userId: string;            // Owner
  name: string;              // Display name
  description: string;       // Description
  category: string;          // Model type
  tags: string[];            // Keywords
  thumbnailUrl: string;      // Preview image
  stlFileUrl: string;        // STL file location
  createdAt: timestamp;      // Creation date
  isPublic: boolean;         // Published status
  publicModelId: string | null; // Reference to public version
}
```

## Implementation Steps

### 1. Firebase Setup (Already done)

Your Firebase configuration is already set up with Firestore and Storage.

### 2. Core Database Service

Create a service file at `lib/firebase/models/stlModels.ts`:

```typescript
import { 
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, 
  query, where, orderBy, limit, startAfter, Timestamp, increment 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { v4 as uuidv4 } from 'uuid';

// Types defined here
export interface STLModel {...}
export interface UserSTLModel {...}

// File handling functions
export const uploadSTLFile = async (file: File, userId: string): Promise<string> => {
  const filename = `${userId}/${uuidv4()}.stl`;
  const stlRef = ref(storage, `stl_files/${filename}`);
  await uploadBytes(stlRef, file);
  return getDownloadURL(stlRef);
};

export const uploadThumbnail = async (file: File, userId: string): Promise<string> => {
  const filename = `${userId}/${uuidv4()}.jpg`;
  const thumbnailRef = ref(storage, `thumbnails/${filename}`);
  await uploadBytes(thumbnailRef, file);
  return getDownloadURL(thumbnailRef);
};

// Public model functions
export const getPublicModels = async (categoryFilter = null, lastVisible = null, limitCount = 20) => {
  // Query construction with optional filters and pagination
  // Return models array with metadata
};

export const getPublicModelById = async (modelId: string) => {
  // Fetch single public model by ID
};

export const incrementDownloadCount = async (modelId: string) => {
  // Update download counter
};

// User model functions
export const getUserModels = async (userId: string) => {
  // Get all models for specific user
};

export const addUserModel = async (model: UserSTLModel) => {
  // Add new model to user collection
};

export const updateUserModel = async (modelId: string, updates: Partial<UserSTLModel>) => {
  // Update existing user model
};

export const deleteUserModel = async (modelId: string, model: UserSTLModel) => {
  // Delete model and associated files
};

// Publishing functions
export const publishUserModel = async (modelId: string) => {
  // Copy user model to public collection and update references
};

export const unpublishUserModel = async (modelId: string) => {
  // Remove from public collection, update user model
};

// Search functionality
export const searchPublicModels = async (searchTerm: string, limitCount = 20) => {
  // Implement text search (client-side or with service like Algolia)
};
```

### 3. UI Components

#### STL Library Browser
Create a new component at `app/stl-library/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react';
import { getPublicModels, PublicSTLModel } from '@/lib/firebase/models/stlModels';
import Link from 'next/link';

export default function STLLibraryPage() {
  const [models, setModels] = useState<PublicSTLModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const [category, setCategory] = useState(null);
  
  useEffect(() => {
    loadModels();
  }, [category]);
  
  const loadModels = async (loadMore = false) => {
    setLoading(true);
    try {
      const result = await getPublicModels(
        category, 
        loadMore ? lastVisible : null
      );
      
      setModels(loadMore ? [...models, ...result.models] : result.models);
      setLastVisible(result.lastVisible);
    } catch (error) {
      console.error("Error loading models:", error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">STL Model Library</h1>
      
      {/* Category filters */}
      <div className="mb-6">
        <select 
          value={category || ''} 
          onChange={(e) => setCategory(e.target.value || null)}
          className="p-2 border rounded"
        >
          <option value="">All Categories</option>
          <option value="charm">Charms</option>
          <option value="necklace">Necklaces</option>
          <option value="bracelet">Bracelets</option>
        </select>
      </div>
      
      {/* Model grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {models.map(model => (
          <Link href={`/stl-library/${model.id}`} key={model.id}>
            <div className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-48 bg-gray-200">
                {model.thumbnailUrl ? (
                  <img 
                    src={model.thumbnailUrl} 
                    alt={model.name}
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-500">No preview</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-medium">{model.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{model.category}</p>
                <div className="mt-2 flex justify-between">
                  <span className="text-xs text-gray-500">{model.downloads} downloads</span>
                  <span className="text-xs text-gray-500">{model.likes} likes</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      {/* Load more button */}
      {lastVisible && (
        <div className="mt-8 text-center">
          <button 
            onClick={() => loadModels(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
```

#### Model Detail Page
Create `app/stl-library/[id]/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPublicModelById, incrementDownloadCount } from '@/lib/firebase/models/stlModels';
import { JewelryViewer } from '@/app/viewer/components/JewelryViewer';

export default function ModelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (params.id) {
      loadModel(params.id as string);
    }
  }, [params.id]);
  
  const loadModel = async (id: string) => {
    setLoading(true);
    try {
      const modelData = await getPublicModelById(id);
      if (!modelData) {
        router.push('/stl-library');
        return;
      }
      setModel(modelData);
    } catch (error) {
      console.error("Error loading model:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDownload = async () => {
    if (!model) return;
    
    // Increment download count
    await incrementDownloadCount(model.id);
    
    // Trigger download
    const link = document.createElement('a');
    link.href = model.stlFileUrl;
    link.download = `${model.name}.stl`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleUseInDesigner = () => {
    // Store the selected model in localStorage or state management
    // and redirect to the viewer
    localStorage.setItem('selectedModelUrl', model.stlFileUrl);
    router.push('/viewer');
  };
  
  if (loading) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }
  
  if (!model) {
    return <div className="container mx-auto py-8">Model not found</div>;
  }
  
  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          {/* 3D Model Viewer */}
          <div className="bg-gray-100 rounded-lg p-4" style={{ height: '500px' }}>
            {/* Integrate with your JewelryViewer component */}
            <JewelryViewer stlUrl={model.stlFileUrl} readOnly={true} />
          </div>
        </div>
        
        <div>
          <h1 className="text-2xl font-bold">{model.name}</h1>
          <div className="mt-2 text-sm text-gray-500">Category: {model.category}</div>
          
          <div className="mt-4">
            <p>{model.description}</p>
          </div>
          
          <div className="mt-4 flex flex-wrap gap-2">
            {model.tags.map(tag => (
              <span key={tag} className="px-2 py-1 bg-gray-200 rounded-full text-xs">
                {tag}
              </span>
            ))}
          </div>
          
          <div className="mt-6 space-y-3">
            <button 
              onClick={handleUseInDesigner}
              className="w-full py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Use in Designer
            </button>
            
            <button 
              onClick={handleDownload}
              className="w-full py-2 bg-white border border-purple-600 text-purple-600 rounded hover:bg-purple-50"
            >
              Download STL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### User Collection Page
Create `app/my-models/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUserModels, deleteUserModel, publishUserModel, unpublishUserModel } from '@/lib/firebase/models/stlModels';
import { useAuth } from '@/lib/auth'; // Assuming you have auth context

export default function MyModelsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (user) {
      loadModels();
    } else {
      router.push('/login');
    }
  }, [user]);
  
  const loadModels = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const userModels = await getUserModels(user.uid);
      setModels(userModels);
    } catch (error) {
      console.error("Error loading models:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async (modelId, model) => {
    if (confirm('Are you sure you want to delete this model?')) {
      try {
        await deleteUserModel(modelId, model);
        setModels(models.filter(m => m.id !== modelId));
      } catch (error) {
        console.error("Error deleting model:", error);
      }
    }
  };
  
  const handlePublishToggle = async (modelId, isPublic) => {
    try {
      if (isPublic) {
        await unpublishUserModel(modelId);
      } else {
        await publishUserModel(modelId);
      }
      // Refresh models
      loadModels();
    } catch (error) {
      console.error("Error toggling publish status:", error);
    }
  };
  
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My STL Models</h1>
        <button 
          onClick={() => router.push('/my-models/upload')}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Upload New Model
        </button>
      </div>
      
      {loading ? (
        <div>Loading your models...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {models.map(model => (
            <div key={model.id} className="border rounded-lg overflow-hidden">
              <div className="h-40 bg-gray-200">
                {model.thumbnailUrl ? (
                  <img 
                    src={model.thumbnailUrl} 
                    alt={model.name}
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-500">No preview</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-medium">{model.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{model.category}</p>
                
                <div className="mt-4 flex justify-between items-center">
                  <div className="flex items-center">
                    <span className="text-sm mr-2">Public:</span>
                    <input 
                      type="checkbox" 
                      checked={model.isPublic} 
                      onChange={() => handlePublishToggle(model.id, model.isPublic)}
                      className="form-checkbox h-4 w-4 text-purple-600"
                    />
                  </div>
                  
                  <button
                    onClick={() => handleDelete(model.id, model)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
                
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => router.push(`/my-models/edit/${model.id}`)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => router.push(`/viewer?modelId=${model.id}`)}
                    className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                  >
                    Use
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {models.length === 0 && (
            <div className="col-span-3 text-center py-8 text-gray-500">
              You haven't added any models yet. Click "Upload New Model" to get started.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

#### Upload Model Form
Create `app/my-models/upload/page.tsx`:

```typescript
'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadSTLFile, uploadThumbnail, addUserModel } from '@/lib/firebase/models/stlModels';
import { useAuth } from '@/lib/auth';

export default function UploadModelPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('charm');
  const [tags, setTags] = useState('');
  const [stlFile, setStlFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [makePublic, setMakePublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  
  const handleStlFileChange = (e) => {
    if (e.target.files?.[0]) {
      setStlFile(e.target.files[0]);
      
      // Generate preview if possible (or use library for STL preview)
      // For now we'll skip this part
    }
  };
  
  const handleThumbnailChange = (e) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setThumbnailFile(file);
      
      // Show image preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user || !stlFile) return;
    
    setLoading(true);
    try {
      // Upload files
      const stlFileUrl = await uploadSTLFile(stlFile, user.uid);
      let thumbnailUrl = '';
      
      if (thumbnailFile) {
        thumbnailUrl = await uploadThumbnail(thumbnailFile, user.uid);
      }
      
      // Create model
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      const model = {
        userId: user.uid,
        name,
        description,
        category,
        tags: tagArray,
        stlFileUrl,
        thumbnailUrl,
        isPublic: makePublic,
        createdAt: new Date(),
      };
      
      const modelId = await addUserModel(model);
      
      // Redirect to models page
      router.push('/my-models');
    } catch (error) {
      console.error("Error uploading model:", error);
      alert('Failed to upload model. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Upload New STL Model</h1>
      
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block mb-2 text-sm font-medium">Model Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block mb-2 text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border rounded"
              rows={4}
            />
          </div>
          
          <div>
            <label className="block mb-2 text-sm font-medium">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="charm">Charm</option>
              <option value="necklace">Necklace</option>
              <option value="bracelet">Bracelet</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div>
            <label className="block mb-2 text-sm font-medium">Tags (comma separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="e.g. heart, flower, geometric"
            />
          </div>
          
          <div>
            <label className="block mb-2 text-sm font-medium">STL File</label>
            <input
              type="file"
              accept=".stl"
              onChange={handleStlFileChange}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          
          <div>
            <label className="block mb-2 text-sm font-medium">Thumbnail Image (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleThumbnailChange}
              className="w-full p-2 border rounded"
            />
            
            {preview && (
              <div className="mt-2">
                <img 
                  src={preview} 
                  alt="Thumbnail preview" 
                  className="h-20 w-auto object-cover"
                />
              </div>
            )}
          </div>
          
          <div className="md:col-span-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={makePublic}
                onChange={(e) => setMakePublic(e.target.checked)}
                className="mr-2"
              />
              <span>Make this model public in the library</span>
            </label>
          </div>
          
          <div className="md:col-span-2">
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400"
              disabled={loading || !stlFile}
            >
              {loading ? 'Uploading...' : 'Upload Model'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
```

### 4. Integration with Existing Viewer

Modify your `app/viewer/components/JewelryViewer.tsx` to accept an external STL URL:

```typescript
// Add a new prop for loading from URL
interface JewelryViewerProps {
  stlUrl?: string;
  readOnly?: boolean;
}

export default function JewelryViewer({ stlUrl, readOnly = false }: JewelryViewerProps) {
  // Existing state...
  
  // Load STL from URL if provided
  useEffect(() => {
    if (stlUrl) {
      loadSTLFromUrl(stlUrl);
    }
  }, [stlUrl]);
  
  const loadSTLFromUrl = async (url: string) => {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      
      const loader = new STLLoader();
      const geometry = loader.parse(arrayBuffer);
      
      // Center the geometry
      geometry.center();
      
      // Normalize the size
      const box = new THREE.Box3().setFromObject(new THREE.Mesh(geometry));
      const size = box.getSize(new THREE.Vector3());
      const maxDimension = Math.max(size.x, size.y, size.z);
      const scale = 10 / maxDimension; // Scale to a reasonable size
      geometry.scale(scale, scale, scale);
      
      setImportedMesh(geometry);
    } catch (error) {
      console.error("Error loading STL from URL:", error);
    }
  };
  
  // Rest of component...
}
```

### 5. Navigation Integration

Add links to your application layout:

```jsx
<Link href="/stl-library" className="px-4 py-2 hover:text-purple-600">
  STL Library
</Link>
<Link href="/my-models" className="px-4 py-2 hover:text-purple-600">
  My Models
</Link>
```

## Firebase Security Rules

Update your Firestore security rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Public models can be read by anyone but only edited by admins or creators
    match /public_stl_models/{modelId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        (request.auth.uid == resource.data.createdBy || hasAdminRole());
    }
    
    // User models can only be read/modified by the owner
    match /user_stl_models/{modelId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // Helper function to check admin status
    function hasAdminRole() {
      return request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

For Firebase Storage:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // STL files in public area can be read by anyone
    match /stl_files/public/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // User's own files
    match /stl_files/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Thumbnails follow same permissions as their respective STL files
    match /thumbnails/public/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    match /thumbnails/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Deployment Checklist

1. Create the Firestore collections
2. Set up Firebase Storage buckets
3. Implement the database service functions
4. Create UI components
5. Integrate with existing viewer
6. Configure security rules
7. Test with sample data

## Additional Considerations

1. **User Authentication**: Ensure proper auth flow exists for private collections
2. **Pagination**: Implement cursor-based pagination for large libraries
3. **Search Optimization**: For production, consider Algolia or similar for advanced search
4. **STL Preview**: Use a WebGL-based preview on upload form
5. **Add Moderation**: For public submissions, consider admin approval workflow

## Future Enhancements

1. Model categories and tagging system
2. User likes/favorites system
3. Featured models section
4. User profiles with published models
5. Download statistics and analytics 