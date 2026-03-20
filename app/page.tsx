import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Brain,
  BarChart3,
  Users,
  FileText,
  Sparkles,
  ShieldCheck,
} from 'lucide-react'

export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/90 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" aria-hidden="true" />
            <span className="font-display text-sm font-bold text-foreground">
              Adapte Minha Prova
            </span>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Entrar</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-primary py-24">
        <div className="container flex flex-col items-center text-center gap-6">
          <h1 className="text-display-xl font-display text-white max-w-3xl">
            Adapte provas para todos os alunos, com IA
          </h1>
          <p className="text-white/80 text-body max-w-xl">
            Crie versões adaptadas das suas avaliações em minutos. Inclusão educacional
            acessível para professores de todos os níveis.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <Button
              asChild
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-md hover:shadow-lg transition-shadow"
            >
              <Link href="/login">Começar gratuitamente</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/40 text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="#como-funciona">Ver como funciona</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="como-funciona" className="py-16">
        <div className="container">
          <h2 className="text-display-lg font-display text-center text-foreground mb-12">
            Tudo que você precisa para uma avaliação inclusiva
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border border-border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`mb-4 ${feature.iconColor}`}>{feature.icon}</div>
                <h3 className="text-heading text-foreground mb-2">{feature.title}</h3>
                <p className="text-small text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-muted py-16">
        <div className="container flex flex-col items-center text-center gap-6">
          <h2 className="text-display-lg font-display text-foreground max-w-xl">
            Pronto para transformar suas provas?
          </h2>
          <p className="text-body text-muted-foreground max-w-md">
            Junte-se a professores que já estão promovendo inclusão com tecnologia.
          </p>
          <Button asChild size="lg" variant="default">
            <Link href="/login">Criar minha conta</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container text-center text-small text-muted-foreground">
          © {new Date().getFullYear()} Adapte Minha Prova. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  )
}

const features = [
  {
    icon: <Brain className="w-8 h-8" aria-hidden="true" />,
    iconColor: 'text-primary',
    title: 'Adaptação com IA',
    description: 'Utilize inteligência artificial para adaptar suas provas de forma inteligente e inclusiva.',
  },
  {
    icon: <FileText className="w-8 h-8" aria-hidden="true" />,
    iconColor: 'text-emerald-600',
    title: 'Upload de PDF',
    description: 'Envie o PDF da sua prova e deixe a IA extrair e organizar as questões automaticamente.',
  },
  {
    icon: <Sparkles className="w-8 h-8" aria-hidden="true" />,
    iconColor: 'text-amber-500',
    title: 'Suportes Personalizados',
    description: 'Configure suportes educacionais específicos para diferentes necessidades dos alunos.',
  },
  {
    icon: <BarChart3 className="w-8 h-8" aria-hidden="true" />,
    iconColor: 'text-blue-600',
    title: 'Acompanhamento em Tempo Real',
    description: 'Monitore o progresso da adaptação com indicadores visuais em tempo real.',
  },
  {
    icon: <Users className="w-8 h-8" aria-hidden="true" />,
    iconColor: 'text-violet-600',
    title: 'Inclusão Educacional',
    description: 'Promova a inclusão com provas adaptadas para diferentes perfis de aprendizado.',
  },
  {
    icon: <ShieldCheck className="w-8 h-8" aria-hidden="true" />,
    iconColor: 'text-teal-600',
    title: 'Seguro e Confiável',
    description: 'Seus dados e os de seus alunos protegidos com a melhor infraestrutura de segurança.',
  },
]
