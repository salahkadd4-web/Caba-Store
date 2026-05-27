import MobilePageWrapper from '@/components/client/MobilePageWrapper'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 transition-colors duration-300">
      <MobilePageWrapper>
        {children}
      </MobilePageWrapper>
    </div>
  )
}