interface AuthCardProps {
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  showHeroImage?: boolean;
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
};

// Notification card shown on the hero side
function NotificationCard({
  icon,
  iconBg,
  title,
  body,
  delay = "0s",
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  body: string;
  delay?: string;
}) {
  return (
    <div
      className="bg-white rounded-2xl shadow-xl px-4 py-3 w-72 animate-[fadeSlideIn_0.6s_ease_forwards] opacity-0"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-tight">{title}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">{body}</p>
        </div>
      </div>
    </div>
  );
}

export function AuthCard({ children, maxWidth = "md", showHeroImage = true }: AuthCardProps) {
  return (
    <>
      {/* Keyframe for notification card animation */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="h-[100dvh] flex flex-col md:flex-row w-[100dvw]">
        {/* ── Left column: form ── */}
        <section className="flex-1 flex items-center justify-center px-8 py-12 bg-[#f7f8fa] dark:bg-background overflow-y-auto">
          <div className={`w-full ${maxWidthClasses[maxWidth]}`}>
            <div className="flex flex-col gap-6">{children}</div>
          </div>
        </section>

        {/* ── Right column: hero photo + floating notification cards ── */}
        {showHeroImage && (
          <section className="hidden md:block flex-1 relative overflow-hidden">
            {/* Background photo — modern dark residential building */}
            <img
              src="/condominium.png"
              alt="Condomínio moderno"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />

            {/* Subtle dark vignette so cards pop */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />

            {/* Floating notification cards — positioned like in the mockup */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-10">
              {/* Card 1 – Novo Anúncio */}
              <NotificationCard
                iconBg="bg-green-400"
                icon={
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="w-4 h-4 text-white"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                    />
                  </svg>
                }
                title="Novo Anúncio"
                body="Manutenção da piscina agendada para este fim de semana. Por favor,…"
                delay="0.3s"
              />

              {/* Card 2 – Ticket Atualizado */}
              <NotificationCard
                iconBg="bg-[#1e3a5f]"
                icon={
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="w-4 h-4 text-white"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z"
                    />
                  </svg>
                }
                title="Ticket Atualizado"
                body="Sua solicitação de reparo do AC #402 foi marcada como Em Andamento."
                delay="0.7s"
              />
            </div>
          </section>
        )}
      </div>
    </>
  );
}
