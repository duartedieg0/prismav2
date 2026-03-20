import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Zap,
  BookOpen,
  Users,
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
    <main className="bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <span className="font-display font-black text-primary-foreground text-sm">
                A
              </span>
            </div>
            <span className="font-display text-base font-bold text-foreground hidden sm:inline">
              Adapte Minha Prova
            </span>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Entrar</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-background pt-20 pb-24 sm:pt-32 sm:pb-40">
        <div className="container max-w-4xl mx-auto px-6">
          <div className="space-y-8">
            <div className="space-y-6">
              <h1 className="font-display text-display-xl sm:text-display-xl font-black text-foreground leading-tight">
                Adapte provas para cada aluno, com inteligência artificial
              </h1>
              <p className="text-body text-muted-foreground max-w-2xl leading-relaxed">
                Crie versões inclusivas das suas avaliações em minutos. Nossa IA entende diferentes necessidades educacionais e gera adaptações personalizadas mantendo a integridade da prova.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button asChild size="lg" className="bg-primary hover:bg-primary-container text-primary-foreground">
                <Link href="/login">Começar gratuitamente</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#recursos">Conhecer recursos</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="recursos" className="bg-surface-container-low py-20 sm:py-32">
        <div className="container max-w-5xl mx-auto px-6">
          <div className="space-y-16">
            <div className="space-y-4">
              <h2 className="font-display text-display-lg font-black text-foreground">
                Recursos que transformam a educação inclusiva
              </h2>
              <p className="text-body text-muted-foreground max-w-2xl">
                Tudo que você precisa para criar avaliações verdadeiramente acessíveis.
              </p>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, idx) => (
                <div key={idx} className="bg-card rounded-lg p-8 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="text-primary mt-1 flex-shrink-0">
                      {feature.icon}
                    </div>
                    <div className="space-y-3 flex-1">
                      <h3 className="font-display text-heading font-bold text-foreground">
                        {feature.title}
                      </h3>
                      <p className="text-body text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="bg-background py-20 sm:py-32">
        <div className="container max-w-3xl mx-auto px-6">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h2 className="font-display text-display-lg font-black text-foreground">
                Pronto para começar?
              </h2>
              <p className="text-body text-muted-foreground max-w-xl mx-auto">
                Milhares de educadores já estão transformando suas avaliações. Crie sua conta e adapte sua primeira prova hoje.
              </p>
            </div>
            <Button asChild size="lg" className="bg-primary hover:bg-primary-container text-primary-foreground">
              <Link href="/login">Criar minha conta gratuita</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-container-low border-t border-border/10 py-12">
        <div className="container max-w-5xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-small text-muted-foreground">
            <div>© {new Date().getFullYear()} Adapte Minha Prova. Todos os direitos reservados.</div>
            <div className="flex gap-6">
              <Link href="#" className="hover:text-foreground transition-colors">
                Privacidade
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                Termos
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}

const features = [
  {
    icon: <Zap className="w-6 h-6" aria-hidden="true" />,
    title: 'Adaptação Inteligente',
    description: 'Nossa IA analisa cada questão e cria versões adaptadas respeitando conteúdo, objetivo e dificuldade.',
  },
  {
    icon: <BookOpen className="w-6 h-6" aria-hidden="true" />,
    title: 'Upload e Extração',
    description: 'Envie PDFs das suas provas. Nossa IA extrai, organiza e estrutura as questões automaticamente.',
  },
  {
    icon: <Users className="w-6 h-6" aria-hidden="true" />,
    title: 'Suportes Personalizados',
    description: 'Configure diferentes tipos de suporte (visual, auditivo, cognitivo) para cada perfil de aluno.',
  },
]
