'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { loginAction } from '@/app/actions/auth'
import {
  AuthButton,
  AuthCard,
  AuthField,
  AuthLink,
  AuthMessage,
  AuthShell,
} from '@/components/auth/auth-ui'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

      window.dispatchEvent(new Event('skillarc-auth-changed'))
      router.push('/dashboard')
    } catch (err) {
      console.error('Login error:', err)
      setError('We could not sign you in. Please try again.')
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Sign in to SkillArc"
      description="Use your institutional account to access your university workspace."
    >
      <AuthCard>
        {error ? <AuthMessage>{error}</AuthMessage> : null}

        <form
          onSubmit={(event) => {
            event.preventDefault()
            void handleLogin()
          }}
          className="space-y-5"
        >
          <AuthField
            label="Email address"
            type="email"
            placeholder="institutional.email@edu.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            icon={<Mail size={17} aria-hidden="true" />}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="password" className="text-sm font-semibold text-[#31547A]">
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                className="rounded-md text-xs font-bold text-[#A94B22] underline decoration-[#E8B39D] underline-offset-4 hover:text-[#7F351A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85D2E]"
              >
                Forgot password?
              </Link>
            </div>
            <AuthField
              id="password"
              label=""
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              icon={<Lock size={17} aria-hidden="true" />}
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#7890A7] hover:bg-[#F0F5F8] hover:text-[#14234B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85D2E]"
                >
                  {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              }
            />
          </div>

          <AuthButton type="submit" isLoading={loading} className="mt-2 w-full">
            {loading ? 'Signing in' : 'Sign in'}
          </AuthButton>
        </form>

        <div className="mt-6 border-t border-[#E4EBF0] pt-5 text-center text-sm text-[#70849A]">
          Need access to SkillArc? <AuthLink href="/auth/signup">Request access</AuthLink>
        </div>
      </AuthCard>
    </AuthShell>
  )
}
