"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

export interface ReactionItem {
  id: string
  emoji: string
  x: number
}

interface FloatingReactionsProps {
  reactions: ReactionItem[]
}

export default function FloatingReactions({ reactions }: FloatingReactionsProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: "100vh", x: `${r.x}vw`, scale: 0.8 }}
            animate={{ 
              opacity: [0, 1, 1, 0], 
              y: "-10vh",
              x: [`${r.x}vw`, `${r.x + ((r.id.length % 11) - 5)}vw`, `${r.x + ((r.id.charCodeAt(r.id.length - 1) % 21) - 10)}vw`],
              scale: [0.8, 1.2, 1.2, 0.8]
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 3.5, ease: "easeOut" }}
            className="absolute text-4xl select-none"
            style={{ bottom: 0 }}
          >
            {r.emoji}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
