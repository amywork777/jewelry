import dynamic from 'next/dynamic'

// Use dynamic import to avoid any hydration issues
const JewelryPage = dynamic(() => import("../jewelry-page"), {
  ssr: true,
  loading: () => <div className="min-h-screen flex items-center justify-center">Loading...</div>
})

export default function Page() {
  return <JewelryPage />
}
