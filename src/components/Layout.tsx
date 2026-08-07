import type { ReactNode } from 'react'
import Navbar from './Navbar'
import GlobalFolioSearch from './GlobalFolioSearch'
import PrivacyToggleButton from './PrivacyToggleButton'
import WhatsAppStatusModal from './WhatsAppStatusModal'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <div className="print:hidden">
        <Navbar />
      </div>
      <main className="max-w-[1600px] mx-auto px-4 py-6">{children}</main>
      <div className="print:hidden">
        <GlobalFolioSearch />
        <PrivacyToggleButton />
        <WhatsAppStatusModal />
      </div>
    </div>
  )
}
