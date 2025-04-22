import { CustomModelGenerator } from "../../lib/custom-model-generator"
import { Toaster } from "../../temp-magicai/components/ui/toaster"

export default function GeneratePage() {
  return (
    <main className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 container mx-auto py-12 px-4">
        <CustomModelGenerator />
      </div>
      <Toaster />
    </main>
  )
} 