'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

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
    <main className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/8 via-background to-background px-4">
      {/* Centered login card */}
      <div className="w-full max-w-md bg-card rounded-2xl shadow-lg p-10 text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-primary-foreground" aria-hidden="true" />
          </div>
        </div>

        {/* Brand */}
        <p className="font-display text-lg font-bold text-primary">
          Adapte Minha Prova
        </p>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="font-display text-display-md font-black text-foreground">
            Bem-vindo de volta
          </h1>
          <p className="text-body text-muted-foreground">
            Entre com sua conta Google
          </p>
        </div>

        {/* Google Login Button */}
        <Button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          size="lg"
          className="w-full gap-3 bg-primary hover:bg-primary-container text-primary-foreground font-display font-semibold text-base h-14"
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Conectando...
            </>
          ) : (
            <>
              <GoogleIcon />
              Entrar com Google
            </>
          )}
        </Button>

        {/* Terms */}
        <p className="text-caption text-muted-foreground">
          Ao continuar, você concorda com nossos{' '}
          <a href="#" className="text-primary hover:underline">Termos de Serviço e Privacidade</a>.
        </p>
      </div>

      {/* Floating feature card (bottom-right) */}
      <div className="hidden lg:block absolute bottom-8 right-8">
        <div className="bg-card rounded-xl shadow-md p-5 max-w-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="font-display font-bold text-sm text-foreground">
                IA Generativa Especializada
              </p>
              <p className="text-small text-muted-foreground mt-1 leading-relaxed">
                Adapte avaliações automaticamente para diferentes níveis de dificuldade e necessidades especiais em segundos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
