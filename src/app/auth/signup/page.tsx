'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signupAction } from '@/app/actions/auth'
import { ROLES } from '@/constants/roles'
import {
  EditorialButton,
  EditorialInput,
  EditorialSelect,
  EditorialCard,
  EditorialCardContent,
  EditorialMetaTag,
} from '@/components/editorial'
import { motion } from 'framer-motion'
import { User, Mail, Lock, UserCheck, Eye, EyeOff } from 'lucide-react'

const ROLE_OPTIONS = [
  { value: ROLES.STUDENT, label: 'Student' },
  { value: ROLES.FACULTY, label: 'Faculty' },
  { value: ROLES.ORG_ADMIN, label: 'Organization Admin' },
  { value: ROLES.INSTITUTION_ADMIN, label: 'Institution Admin' },
  { value: ROLES.HOD, label: 'Head of Department' },
  { value: ROLES.PROGRAM_HEAD, label: 'Program Head' },
]

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<string>(ROLES.STUDENT)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const router = useRouter()

  async function handleSignup() {
    setError('')
    if (!name || !email || !password) {
      setError('Please fill in all fields.')
      return
    }

    setLoading(true)

    try {
      const result = await signupAction(name, email, password, role)

      if (result?.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      router.push('/dashboard')
    } catch (err) {
      console.error('Signup error:', err)
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a1324]">
      {/* Background */}
      <div className="fixed inset-0 bg-[#0a1324] -z-10" />
      <div className="fixed left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1b2d4f]/30 blur-3xl -z-10" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-12"
          >
            <img
              src="/skillarc_logo.svg"
              alt="SkillArc Logo"
              className="h-20 w-20 object-contain drop-shadow-[0_0_20px_rgba(229,125,55,0.25)]"
            />
          </motion.div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8 space-y-2 text-center"
          >
            <h1 className="ed-headline text-3xl text-slate-50">Get Started</h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Join your institution and start collaborating today.
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

          {/* Signup Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void handleSignup()
              }}
            >
              <EditorialCard variant="bordered">
                <EditorialCardContent className="space-y-6">
                  {/* Name Input */}
                  <EditorialInput
                    label="Full Name"
                    type="text"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    icon={<User className="w-4 h-4" />}
                  />

                  {/* Email Input */}
                  <EditorialInput
                    label="Email Address"
                    type="email"
                    placeholder="institutional.email@edu.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    icon={<Mail className="w-4 h-4" />}
                  />

                  {/* Password Input */}
                  <EditorialInput
                    label="Password"
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
                  />

                  {/* Role Select */}
                  <EditorialSelect
                    label="Role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    options={ROLE_OPTIONS}
                  />

                  {/* Create Account Button */}
                  <EditorialButton
                    variant="primary"
                    size="md"
                    type="submit"
                    isLoading={loading}
                    className="w-full mt-6"
                  >
                    {loading ? 'Creating account...' : 'Create Account'}
                  </EditorialButton>

                  {/* Login Link */}
                  <div className="text-center pt-4 border-t border-[#2f4d73]">
                    <p className="text-slate-300 text-sm">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => router.push('/auth/login')}
                        className="font-semibold text-[#F4B77F] hover:text-[#F7C98E] transition-colors"
                      >
                        Sign in
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
            transition={{ duration: 0.5, delay: 0.3 }}
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