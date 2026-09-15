'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signupAction } from '@/app/actions/auth'
import { ROLES } from '@/constants/roles'
import {
  AuthButton,
  AuthCard,
  AuthField,
  AuthLink,
  AuthMessage,
  AuthSelect,
  AuthShell,
} from '@/components/auth/auth-ui'
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react'

const ROLE_OPTIONS = [
  { value: ROLES.STUDENT, label: 'Student' },
  { value: ROLES.FACULTY, label: 'Faculty' },
  { value: ROLES.ORG_ADMIN, label: 'Organization Admin' },
  { value: ROLES.INSTITUTION_ADMIN, label: 'Institution Admin' },
  { value: ROLES.HOD, label: 'Head of Department' },
  { value: ROLES.PROGRAM_HEAD, label: 'Program Head' },
]

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<string>(ROLES.STUDENT)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      setError('We could not create your account. Please try again.')
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Set up your SkillArc access"
      description="Create an account for your university workspace and choose the role that best describes your work."
    >
      <AuthCard>
        {error ? <AuthMessage>{error}</AuthMessage> : null}

        <form
          onSubmit={(event) => {
            event.preventDefault()
            void handleSignup()
          }}
          className="space-y-5"
        >
          <AuthField
            label="Full name"
            type="text"
            placeholder="Jane Doe"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            required
            icon={<User size={17} aria-hidden="true" />}
          />

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

          <AuthField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
            hint="Use at least 6 characters."
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

          <AuthSelect label="Role" value={role} onChange={(event) => setRole(event.target.value)} options={ROLE_OPTIONS} />

          <AuthButton type="submit" isLoading={loading} className="mt-2 w-full">
            {loading ? 'Creating account' : 'Create account'}
          </AuthButton>
        </form>

        <div className="mt-6 border-t border-[#E4EBF0] pt-5 text-center text-sm text-[#70849A]">
          Already have an account? <AuthLink href="/auth/login">Sign in</AuthLink>
        </div>
      </AuthCard>
    </AuthShell>
  )
}
