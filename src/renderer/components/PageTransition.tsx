import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const pageTransition = {
  type: 'tween' as const,
  ease: [0.2, 0, 0, 1] as [number, number, number, number],
  duration: 0.25,
};

interface PageTransitionProps {
  /** Key that triggers the animation (e.g. current page id) */
  pageKey: string;
  children: ReactNode;
}

/**
 * Wraps page content with a smooth fade + slide animation
 * using Framer Motion's AnimatePresence.
 */
export const PageTransition: React.FC<PageTransitionProps> = ({ pageKey, children }) => (
  <AnimatePresence mode="wait">
    <motion.div
      key={pageKey}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      style={{ width: '100%' }}
    >
      {children}
    </motion.div>
  </AnimatePresence>
);

/**
 * Stagger container — children animate in one-by-one.
 * Wrap each child in a <StaggerItem>.
 */
export const StaggerContainer: React.FC<{ children: ReactNode; staggerDelay?: number }> = ({
  children,
  staggerDelay = 0.06,
}) => (
  <motion.div
    initial="hidden"
    animate="visible"
    variants={{
      hidden: {},
      visible: { transition: { staggerChildren: staggerDelay } },
    }}
  >
    {children}
  </motion.div>
);

export const StaggerItem: React.FC<{ children: ReactNode }> = ({ children }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 16 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.2, 0, 0, 1] } },
    }}
  >
    {children}
  </motion.div>
);

export default PageTransition;

