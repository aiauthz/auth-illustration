interface SlideFrameProps {
  children: React.ReactNode
}

/**
 * Shared outer shell for the presentation view
 */
export function SlideFrame({ children }: SlideFrameProps) {
  return (
    <div className="flex flex-col h-screen w-full bg-neutral-950 overflow-hidden">
      <main className="flex-1 w-full h-full overflow-hidden bg-neutral-950 relative">
        {children}
      </main>
    </div>
  )
}
