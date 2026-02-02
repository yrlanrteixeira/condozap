import { Building2 } from 'lucide-react'

interface AuthCardProps {
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  showHeroImage?: boolean
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
}

export function AuthCard({ children, maxWidth = 'md', showHeroImage = true }: AuthCardProps) {
  return (
    <div className="h-[100dvh] flex flex-col md:flex-row w-[100dvw]">
      {/* Left column: content */}
      <section className="flex-1 flex items-center justify-center p-8 bg-background overflow-y-auto">
        <div className={`w-full ${maxWidthClasses[maxWidth]}`}>
          <div className="flex flex-col gap-6">
            {children}
          </div>
        </div>
      </section>

      {/* Right column: hero image */}
      {showHeroImage && (
        <section className="hidden md:block flex-1 relative p-4 bg-background">
          <div 
            className="absolute inset-4 rounded-3xl bg-cover bg-center overflow-hidden"
            style={{ backgroundImage: `url(https://images.unsplash.com/photo-1642615835477-d303d7dc9ee9?w=2160&q=80)` }}
          >
            {/* Dark mode overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/10 dark:from-black/60 dark:via-black/40 dark:to-black/70" />
            
            {/* Brand content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
              <div className="bg-white/10 dark:bg-black/30 backdrop-blur-sm rounded-2xl p-8 text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="p-3 bg-primary/20 dark:bg-primary/30 rounded-xl">
                    <Building2 className="h-10 w-10 text-white" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">TalkZap</h2>
                <p className="text-white/80 dark:text-white/70 text-sm max-w-xs">
                  Gestão inteligente de condomínios
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}


