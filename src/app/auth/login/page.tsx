'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginAction } from '@/app/actions/auth'
import {
  EditorialButton,
  EditorialInput,
  EditorialCard,
  EditorialCardContent,
  EditorialMetaTag,
} from '@/components/editorial'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const router = useRouter()

  async function handleLogin() {
    setError('')
    setLoading(true)

    try {
      const result = await loginAction(email, password)

      if (result?.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      router.push('/dashboard')
    } catch (err) {
      console.error('Login error:', err)
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a1725]">
      {/* Background */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(87,115,168,0.12),_transparent_32%),linear-gradient(180deg,_#0a1725_0%,_#0d1f31_100%)]" />
      <div className="fixed left-1/2 top-1/2 -z-10 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1d3559]/10 blur-[120px]" />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-[440px]">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="mb-8 flex justify-center"
          >
            <div className="rounded-full border border-white/5 bg-white/[0.02] p-3 shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
              <img
                src="/skillarc_logo.svg"
                alt="SkillArc Logo"
                className="h-10 w-10 object-contain opacity-95"
              />
            </div>
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: 'easeOut' }}
            className="mb-6 space-y-2 text-center"
          >
            <h1 className="ed-headline text-[1.95rem] font-medium leading-none tracking-[-0.05em] text-slate-50">Sign In</h1>
            <p className="text-sm leading-relaxed text-slate-400">
              Enter your institutional credentials to continue.
            </p>
          </motion.div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-300 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.14, ease: 'easeOut' }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void handleLogin()
              }}
            >
              <EditorialCard variant="bordered" className="border border-[#233a5d]/80 bg-[#0d1b2a]/80 shadow-[0_22px_50px_rgba(2,6,23,0.18)] backdrop-blur-sm">
                <EditorialCardContent className="space-y-6">
                  {/* Email Input */}
                  <EditorialInput
                    label="Email Address"
                    type="email"
                    placeholder="institutional.email@edu.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    icon={<Mail className="w-4 h-4" />}
                  />

                  {/* Password Input with Forgot Link */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="ed-label text-slate-300">Password</label>
                      <button
                        type="button"
                        onClick={() => router.push('/auth/forgot-password')}
                        className="text-[11px] font-medium text-[#D7A06A] transition-colors hover:text-[#E7B77B]"
                      >
                        Forgot?
                      </button>
                    </div>
                    <EditorialInput
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      icon={<Lock className="w-4 h-4" />}
                      rightSlot={
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-100"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                      className="mt-2"
                    />
                  </div>

                  {/* Sign In Button */}
                  <EditorialButton
                    variant="primary"
                    size="md"
                    type="submit"
                    isLoading={loading}
                    className="mt-6 w-full shadow-[0_14px_26px_rgba(217,140,74,0.2)]"
                  >
                    {loading ? 'Authenticating...' : 'Sign In'}
                  </EditorialButton>

                  {/* Signup Link */}
                  <div className="border-t border-[#1a2d45] pt-4 text-center">
                    <p className="text-sm text-slate-300">
                      No account?{' '}
                      <button
                        type="button"
                        onClick={() => router.push('/auth/signup')}
                        className="font-medium text-[#D7A06A] transition-colors hover:text-[#E7B77B]"
                      >
                        Create one
                      </button>
                    </p>
                  </div>
                </EditorialCardContent>
              </EditorialCard>
            </form>
          </motion.div>

          {/* Back to Home Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.24, ease: 'easeOut' }}
            className="mt-8 text-center"
          >
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-sm text-slate-400 transition-colors hover:text-slate-200"
            >
              ← Back to Home
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}