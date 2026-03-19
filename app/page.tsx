/**
 * Landing Page
 * Public route for non-authenticated users showcasing the platform
 *
 * Route: / (public)
 * Behavior: Redirects authenticated users to /dashboard (handled in middleware)
 *
 * Features:
 * - Hero section with compelling tagline
 * - Features overview (3-5 feature blocks)
 * - CTA button to login
 * - Responsive design (mobile-first)
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';
import {
  Zap,
  BarChart3,
  Users,
  Brain,
  FileText,
} from 'lucide-react';

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: <Brain className="w-8 h-8" />,
    title: 'Adaptação com IA',
    description:
      'Utilize inteligência artificial para adaptar suas provas de forma inteligente e inclusiva',
  },
  {
    icon: <BarChart3 className="w-8 h-8" />,
    title: 'Análise de Desempenho',
    description:
      'Monitore o desempenho dos alunos e obtenha insights sobre os resultados',
  },
  {
    icon: <Users className="w-8 h-8" />,
    title: 'Inclusão Educacional',
    description:
      'Crie ambiente mais inclusivo com provas acessíveis para todos os alunos',
  },
  {
    icon: <Zap className="w-8 h-8" />,
    title: 'Processamento Rápido',
    description:
      'Processe e adapte provas em minutos, não em horas ou dias',
  },
  {
    icon: <FileText className="w-8 h-8" />,
    title: 'Suportes Educacionais',
    description:
      'Acesso a diferentes tipos de suportes e adaptações para cada aluno',
  },
];

export default async function HomePage() {
  // Check if user is authenticated (middleware handles redirect to dashboard)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If somehow user got here, redirect to dashboard
  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">AP</span>
            </div>
            <span className="font-semibold text-foreground">Adapte</span>
          </div>
          <Link href="/login">
            <Button variant="ghost">Entrar</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6">
        <div className="w-full max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-muted border border-border">
            <span className="text-xs font-medium text-muted-foreground">
              ✨ Adaptação inteligente de provas com IA
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
            Crie provas{' '}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              acessíveis e inclusivas
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Adapte suas provas escolares com inteligência artificial. Ofereça a cada
            aluno a avaliação que ele merece, independentemente de suas necessidades
            educacionais especiais.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto">
                Começar Agora
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Saiba Mais
              </Button>
            </Link>
          </div>

          {/* Hero Image Placeholder */}
          <div className="mt-16 rounded-xl border border-border bg-muted/30 aspect-video flex items-center justify-center overflow-hidden">
            <div className="flex flex-col items-center gap-4">
              <FileText className="w-16 h-16 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Visualização de exemplo</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-border">
        <div className="w-full max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Recursos Poderosos
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tudo que você precisa para criar e gerenciar provas acessíveis
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="p-6 hover:border-primary/50 transition-colors group"
              >
                <div className="flex flex-col h-full gap-4">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="w-full max-w-4xl mx-auto bg-muted/40 border border-border rounded-2xl p-8 sm:p-12 text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
            Pronto para começar?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Crie sua conta agora e comece a adaptar suas provas com o poder da IA
          </p>
          <Link href="/login">
            <Button size="lg" className="mt-4">
              Entrar na Plataforma
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/20 py-8 px-4 sm:px-6">
        <div className="w-full max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs">AP</span>
              </div>
              <span className="font-semibold text-foreground">Adapte Minha Prova</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2026 Adapte. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
