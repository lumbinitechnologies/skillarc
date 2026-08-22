import { Variants } from "framer-motion"

// ==================== TEXT ANIMATIONS ====================

// Character stagger reveal with blur
export const charStaggerBlur: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: { opacity: 0 },
}

export const charBlurVariant: Variants = {
  hidden: { y: 30, opacity: 0, filter: "blur(5px)" },
  visible: {
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] },
  },
}

// Word split animation (slide-up)
export const wordSlideUp: Variants = {
  hidden: { y: 40, opacity: 0 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    transition: {
      delay: i * 0.08,
      duration: 0.5,
      ease: "easeOut",
    },
  }),
}

// Liquid slide text animation
export const liquidSlide: Variants = {
  hidden: { y: 100, opacity: 0, rotateX: 45 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    rotateX: 0,
    transition: {
      delay: i * 0.06,
      duration: 0.7,
      ease: [0.34, 1.56, 0.64, 1],
    },
  }),
}

// ==================== CARD ANIMATIONS ====================

// Spring bounce entrance
export const springBounce: Variants = {
  hidden: { scale: 0.8, opacity: 0, y: 20 },
  visible: (i: number) => ({
    scale: 1,
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 12,
      delay: i * 0.1,
    },
  }),
}

// Smooth pop-in (elastic)
export const elasticPop: Variants = {
  hidden: { scale: 0.3, opacity: 0, rotate: -10 },
  visible: (i: number) => ({
    scale: 1,
    opacity: 1,
    rotate: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.5,
      ease: [0.34, 1.56, 0.64, 1],
    },
  }),
}

// Slide and fade from left
export const slideInLeft: Variants = {
  hidden: { x: -60, opacity: 0, filter: "blur(6px)" },
  visible: (i: number) => ({
    x: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      delay: i * 0.09,
      duration: 0.6,
      ease: "easeOut",
    },
  }),
}

// Slide and fade from right
export const slideInRight: Variants = {
  hidden: { x: 60, opacity: 0, filter: "blur(6px)" },
  visible: (i: number) => ({
    x: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      delay: i * 0.09,
      duration: 0.6,
      ease: "easeOut",
    },
  }),
}

// Rotate and zoom entrance
export const rotateZoom: Variants = {
  hidden: { scale: 0.5, rotate: -180, opacity: 0 },
  visible: (i: number) => ({
    scale: 1,
    rotate: 0,
    opacity: 1,
    transition: {
      delay: i * 0.07,
      duration: 0.8,
      ease: [0.34, 1.56, 0.64, 1],
    },
  }),
}

// Gradient wave entrance
export const gradientWave: Variants = {
  hidden: { backgroundPosition: "200% center", opacity: 0 },
  visible: (i: number) => ({
    backgroundPosition: "0% center",
    opacity: 1,
    transition: {
      delay: i * 0.08,
      duration: 0.8,
      ease: "easeOut",
    },
  }),
}

// ==================== TABLE & LIST ANIMATIONS ====================

// Row reveal with stagger
export const rowReveal: Variants = {
  hidden: { y: 20, opacity: 0, x: -10 },
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.4,
      ease: "easeOut",
    },
  }),
}

// Expanding width reveal
export const expandWidth: Variants = {
  hidden: { scaleX: 0, opacity: 0 },
  visible: (i: number) => ({
    scaleX: 1,
    opacity: 1,
    transition: {
      delay: i * 0.06,
      duration: 0.5,
      ease: [0.34, 1.56, 0.64, 1],
    },
  }),
}

// ==================== INPUT & FORM ANIMATIONS ====================

// Input focus glow
export const inputFocusGlow: Variants = {
  unfocused: {
    boxShadow: "0 0 0 0px rgba(229, 125, 55, 0)",
  },
  focused: {
    boxShadow: "0 0 20px 4px rgba(229, 125, 55, 0.2)",
    transition: { duration: 0.3 },
  },
}

// Label float up
export const labelFloat: Variants = {
  initial: { y: 0, scale: 1 },
  focus: {
    y: -24,
    scale: 0.85,
    transition: { duration: 0.3, ease: "easeOut" },
  },
}

// ==================== PAGE TRANSITION ANIMATIONS ====================

// Fade and scale page in
export const pageTransitionFade: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.3 },
  },
}

// Slide up page transition
export const pageTransitionSlide: Variants = {
  hidden: { y: 40, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
  exit: {
    y: -40,
    opacity: 0,
    transition: { duration: 0.3 },
  },
}

// ==================== BUTTON ANIMATIONS ====================

// Ripple effect on click
export const buttonRipple: Variants = {
  rest: { scale: 1 },
  tap: { scale: 0.95 },
}

// Button hover glow
export const buttonHoverGlow: Variants = {
  rest: {
    boxShadow: "0 4px 12px rgba(229, 125, 55, 0.15)",
  },
  hover: {
    boxShadow: "0 8px 24px rgba(229, 125, 55, 0.3)",
  },
}

// ==================== MODAL & DIALOG ANIMATIONS ====================

// Modal backdrop fade
export const modalBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3 },
  },
  exit: { opacity: 0, transition: { duration: 0.2 } },
}

// Modal content scale + fade
export const modalContent: Variants = {
  hidden: { scale: 0.85, opacity: 0, y: 40 },
  visible: {
    scale: 1,
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 90,
      damping: 14,
      mass: 1,
    },
  },
  exit: {
    scale: 0.85,
    opacity: 0,
    y: 40,
    transition: { duration: 0.2 },
  },
}

// ==================== DROPDOWN & MENU ANIMATIONS ====================

// Dropdown slide down
export const dropdownSlide: Variants = {
  hidden: { y: -15, opacity: 0, pointerEvents: "none" },
  visible: {
    y: 0,
    opacity: 1,
    pointerEvents: "auto",
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
      mass: 0.5,
    },
  },
  exit: {
    y: -15,
    opacity: 0,
    pointerEvents: "none",
    transition: { duration: 0.15 },
  },
}

// Menu item stagger
export const menuItemStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
}

export const menuItem: Variants = {
  hidden: { x: -10, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
}

// ==================== COUNTER & NUMBER ANIMATIONS ====================

// Counter increment animation configuration
export const counterConfig = {
  duration: 1.5,
  ease: "easeOut",
  decimals: 0,
}

// ==================== NOTIFICATION ANIMATIONS ====================

// Toast notification slide in
export const toastSlide: Variants = {
  hidden: { x: 400, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
  exit: {
    x: 400,
    opacity: 0,
    transition: { duration: 0.2 },
  },
}

// ==================== LOADING ANIMATIONS ====================

// Skeleton pulse
export const skeletonPulse: Variants = {
  animate: {
    opacity: [0.6, 1, 0.6],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
}

// Shimmer effect
export const shimmerEffect: Variants = {
  animate: {
    backgroundPosition: ["200% 0", "-200% 0"],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "linear",
    },
  },
}
