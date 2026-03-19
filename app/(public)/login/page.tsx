'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/login/callback`,
        },
      })
    } catch (error) {
      console.error('Login error:', error)
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold">Login</h1>
        <p className="mt-4 text-muted-foreground">
          Entre com sua conta Google para continuar
        </p>
        <Button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full mt-6"
        >
          {isLoading ? 'Conectando...' : 'Entrar com Google'}
        </Button>
      </div>
    </main>
  )
}
