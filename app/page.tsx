import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  ArrowRight,
  Type,
  Eye,
  Brain,
  FileCheck,
  Upload,
  Sparkles,
  Share2,
  Mail,
  Award,
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
        <div className="container flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" aria-hidden="true" />
            </div>
            <span className="font-display text-sm font-bold text-foreground">
              Adapte Minha Prova
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild size="sm" className="bg-primary hover:bg-primary-container text-primary-foreground">
              <Link href="/login">Cadastrar</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Green gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" />
        <div className="container relative px-6 pt-16 pb-12 sm:pt-24 sm:pb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* Left: Text content */}
            <div className="space-y-8">
              <span className="inline-block font-mono text-xs uppercase tracking-widest bg-primary/15 text-primary px-3 py-1.5 rounded-md">
                Educação Inclusiva 2.0
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-[56px] font-black text-foreground leading-[1.1] tracking-tight">
                Adapte provas com IA em segundos
              </h1>
              <p className="text-body text-muted-foreground max-w-md leading-relaxed">
                Ajude cada aluno a aprender no seu ritmo. Use inteligência artificial para transformar avaliações complexas em materiais acessíveis e personalizados.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button asChild size="lg" className="bg-background hover:bg-surface-container-low text-foreground border border-border/40 gap-2">
                  <Link href="/login">
                    Começar agora
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild size="lg" className="bg-primary hover:bg-primary-container text-primary-foreground">
                  <Link href="#recursos">Ver demonstração</Link>
                </Button>
              </div>
            </div>

            {/* Right: Mockup card */}
            <div className="hidden md:flex justify-end">
              <div className="w-[320px] bg-card rounded-2xl shadow-lg p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-sm text-foreground">Sugestão da IA</p>
                    <p className="text-xs text-muted-foreground">Adaptação para Dislexia ativada</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-3 bg-surface-container-low rounded-full w-full" />
                  <div className="h-3 bg-surface-container-low rounded-full w-4/5" />
                  <div className="h-3 bg-surface-container-low rounded-full w-3/5" />
                  <div className="h-3 bg-surface-container-low rounded-full w-full" />
                  <div className="h-3 bg-surface-container-low rounded-full w-2/3" />
                </div>
                <Button size="sm" className="w-full bg-primary hover:bg-primary-container text-primary-foreground font-display font-semibold">
                  Aplicar Mudanças
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="bg-background">
        <div className="container px-6 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface-container-low rounded-xl p-6">
              <p className="font-display text-3xl font-black text-foreground">+500k</p>
              <p className="text-small text-muted-foreground mt-1">Provas adaptadas</p>
            </div>
            <div className="bg-surface-container-low rounded-xl p-6">
              <p className="font-display text-3xl font-black text-foreground">85%</p>
              <p className="text-small text-muted-foreground mt-1">Redução de tempo</p>
            </div>
            <div className="relative bg-surface-container-low rounded-xl p-6 overflow-hidden">
              <div>
                <p className="font-display text-lg font-bold text-foreground">Tecnologia Certificada</p>
                <p className="text-small text-muted-foreground mt-1">Aprovado por especialistas em pedagogia.</p>
              </div>
              <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-primary/15 rounded-xl rotate-12" />
              <Award className="absolute right-3 bottom-3 w-8 h-8 text-primary/30" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="recursos" className="bg-background py-20 sm:py-28">
        <div className="container px-6">
          <div className="text-center space-y-4 max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-display-md sm:text-display-lg font-black text-foreground">
              O que você pode fazer
            </h2>
            <p className="text-body text-muted-foreground">
              Nossa plataforma combina pedagogia especializada com os modelos de IA mais avançados para criar um ambiente de aprendizagem equitativo.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {features.map((feature, idx) => (
              <div key={idx} className="bg-card rounded-xl p-7 space-y-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-primary" aria-hidden="true" />
                </div>
                <h3 className="font-display text-base font-bold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-small text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative overflow-hidden">
        <div className="bg-gradient-to-b from-primary/5 via-primary/10 to-primary/5 py-20 sm:py-28">
          <div className="container px-6">
            <div className="text-center space-y-6 max-w-2xl mx-auto">
              <h2 className="font-display text-display-md sm:text-display-lg font-black text-foreground">
                Pronto para transformar sua sala de aula?
              </h2>
              <p className="text-body text-muted-foreground max-w-lg mx-auto">
                Junte-se a milhares de professores que já estão economizando tempo e promovendo uma educação verdadeiramente inclusiva.
              </p>
              <div className="pt-4">
                <Button asChild size="lg" className="bg-primary hover:bg-primary-container text-primary-foreground font-display font-semibold px-8">
                  <Link href="/login">Começar agora</Link>
                </Button>
              </div>
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground pt-2">
                Não é necessário cartão de crédito &bull; Grátis para testar
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-container-low py-16">
        <div className="container px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 mb-12">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground" aria-hidden="true" />
                </div>
                <span className="font-display text-sm font-bold text-foreground">
                  Adapte Minha Prova
                </span>
              </div>
              <p className="text-small text-muted-foreground leading-relaxed max-w-xs">
                Ferramentas inteligentes para professores que acreditam que a educação deve ser para todos, sem exceção.
              </p>
            </div>

            {/* Produto */}
            <div className="space-y-4">
              <p className="font-display font-bold text-sm text-foreground">Produto</p>
              <div className="flex flex-col gap-3">
                <Link href="#recursos" className="text-small text-muted-foreground hover:text-foreground transition-colors">
                  Funcionalidades
                </Link>
                <Link href="#" className="text-small text-muted-foreground hover:text-foreground transition-colors">
                  Preços
                </Link>
                <Link href="#" className="text-small text-muted-foreground hover:text-foreground transition-colors">
                  Modelos de IA
                </Link>
              </div>
            </div>

            {/* Suporte */}
            <div className="space-y-4">
              <p className="font-display font-bold text-sm text-foreground">Suporte</p>
              <div className="flex flex-col gap-3">
                <Link href="#" className="text-small text-muted-foreground hover:text-foreground transition-colors">
                  Central de Ajuda
                </Link>
                <Link href="#" className="text-small text-muted-foreground hover:text-foreground transition-colors">
                  Privacidade
                </Link>
                <Link href="#" className="text-small text-muted-foreground hover:text-foreground transition-colors">
                  Termos de Uso
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-border/10">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              © {new Date().getFullYear()} Adapte Minha Prova. All Rights Reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Compartilhar">
                <Share2 className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Email">
                <Mail className="w-4 h-4" aria-hidden="true" />
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
    icon: Type,
    title: 'Simplificação de Texto',
    description: 'Adapta termos complexos para uma linguagem mais direta, ideal para alunos com dificuldades de compreensão.',
  },
  {
    icon: Eye,
    title: 'Suporte Visual',
    description: 'Geração automática de ícones e espaçamentos otimizados para alunos com TDAH e Baixa Visão.',
  },
  {
    icon: Type,
    title: 'Fontes Específicas',
    description: 'Conversão instantânea para fontes como OpenDyslexic, facilitando a leitura para alunos disléxicos.',
  },
  {
    icon: Brain,
    title: 'Níveis Cognitivos',
    description: 'Ajuste a complexidade das questões com base na Taxonomia de Bloom, mantendo o objetivo pedagógico.',
  },
  {
    icon: FileCheck,
    title: 'Geração de Gabaritos',
    description: 'Crie versões adaptadas do gabarito para facilitar a correção individualizada pelo professor.',
  },
  {
    icon: Upload,
    title: 'Importação Fácil',
    description: 'Suba arquivos em PDF, Word ou imagens de provas manuscritas e veja a mágica acontecer.',
  },
]
