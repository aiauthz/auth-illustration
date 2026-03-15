import { motion, AnimatePresence } from 'motion/react'
import { Loader2, CheckCircle, ShieldCheck } from 'lucide-react'

interface ValidationIndicatorProps {
  isValidated: boolean
  validatingText?: string
  validatedText?: string
  validatingSubtext?: string
  validatedSubtext?: string
}

export function ValidationIndicator({
  isValidated,
  validatingText = 'Validating Identity',
  validatedText = 'Identity Validated',
  validatingSubtext = 'Checking credentials...',
  validatedSubtext = 'Credentials verified',
}: ValidationIndicatorProps) {
  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        {!isValidated ? (
          <motion.div
            key="validating"
            className="flex flex-col items-center gap-3"
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <div className="flex items-center gap-3 bg-blue-600/95 text-white px-6 py-4 rounded-lg shadow-2xl border-2 border-blue-400">
              <Loader2 className="h-6 w-6 animate-spin" />
              <div className="flex flex-col">
                <span className="font-semibold text-lg">{validatingText}</span>
                <span className="text-xs text-blue-100">{validatingSubtext}</span>
              </div>
              <ShieldCheck className="h-6 w-6 opacity-70" />
            </div>
            {/* Animated pulse rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
              <motion.div
                className="w-24 h-24 rounded-full bg-blue-500/20"
                animate={{ scale: [1, 2, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="validated"
            className="flex flex-col items-center gap-3"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20,
            }}
          >
            <div className="flex items-center gap-3 bg-green-600/95 text-white px-6 py-4 rounded-lg shadow-2xl border-2 border-green-400">
              <motion.div
                initial={{ rotate: -180, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              >
                <CheckCircle className="h-7 w-7" />
              </motion.div>
              <div className="flex flex-col">
                <span className="font-semibold text-lg">{validatedText}</span>
                <span className="text-xs text-green-100">{validatedSubtext}</span>
              </div>
            </div>
            {/* Success burst */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
              <motion.div
                className="w-20 h-20 rounded-full bg-green-500/30"
                initial={{ scale: 0.5, opacity: 0.8 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
