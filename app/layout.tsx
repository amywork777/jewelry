import type { Metadata } from 'next'
import { Quicksand } from 'next/font/google'
import './globals.css'

const quicksand = Quicksand({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-quicksand'
})

export const metadata: Metadata = {
  title: 'Minimalist Jewelry Design',
  description: 'Custom jewelry design platform',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={quicksand.variable}>
      <body className={`${quicksand.className} font-quicksand`}>{children}</body>
    </html>
  )
}
