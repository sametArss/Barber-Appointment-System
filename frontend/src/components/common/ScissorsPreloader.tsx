import React from 'react';
import { motion } from 'framer-motion';
import { Scissors } from 'lucide-react';

interface ScissorsPreloaderProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg' | 'fullscreen';
}

export const ScissorsPreloader: React.FC<ScissorsPreloaderProps> = ({
  label = 'Yükleniyor...',
  size = 'md',
}) => {
  if (size === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50/80 dark:bg-zinc-950/85 backdrop-blur-md">
        <div className="relative flex flex-col items-center">
          {/* Glowing aura */}
          <div className="absolute -inset-4 rounded-full bg-amber-500/20 blur-xl dark:bg-amber-500/15 animate-pulse" />
          
          <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-500/30 bg-white/90 shadow-2xl dark:border-amber-500/20 dark:bg-zinc-900/90">
            <motion.div
              animate={{
                rotate: [0, 15, -15, 0],
                scale: [1, 1.12, 0.95, 1],
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="text-amber-500 dark:text-amber-400"
            >
              <Scissors className="h-10 w-10" />
            </motion.div>
          </div>

          {label && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 text-xs font-semibold tracking-wider uppercase text-slate-600 dark:text-zinc-400"
            >
              {label}
            </motion.p>
          )}
        </div>
      </div>
    );
  }

  const iconSizes = {
    sm: 'h-5 w-5',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const boxSizes = {
    sm: 'h-10 w-10 rounded-xl',
    md: 'h-14 w-14 rounded-2xl',
    lg: 'h-20 w-20 rounded-3xl',
  };

  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className={`relative flex items-center justify-center border border-amber-500/30 bg-white/80 shadow-lg dark:border-amber-500/20 dark:bg-zinc-900/80 ${boxSizes[size]}`}>
        <motion.div
          animate={{
            rotate: [0, 20, -20, 0],
            scale: [1, 1.15, 0.92, 1],
          }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="text-amber-500 dark:text-amber-400"
        >
          <Scissors className={iconSizes[size]} />
        </motion.div>
      </div>

      {label && (
        <p className="mt-3 text-xs font-medium text-slate-500 dark:text-zinc-400">
          {label}
        </p>
      )}
    </div>
  );
};

