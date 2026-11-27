import React from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'Beklenmeyen bir arayüz hatası oluştu.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('ErrorBoundary caught error:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, errorMessage: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] p-6 dark:bg-[#0B0F19]">
          <div className="w-full max-w-md rounded-[24px] border border-slate-200/80 bg-white/95 p-8 text-center shadow-xl backdrop-blur-xl dark:border-amber-500/20 dark:bg-slate-900/90">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/12 text-red-600 dark:bg-red-500/15 dark:text-red-400">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h1 className="font-serif text-2xl font-semibold text-slate-900 dark:text-white">
              Bir şeyler ters gitti
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Sayfa yüklenirken beklenmeyen bir hata oluştu. Sayfayı yenileyerek devam edebilirsiniz.
            </p>
            {this.state.errorMessage && (
              <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-400">
                {this.state.errorMessage}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                onClick={this.handleReload}
                className="gap-2 rounded-xl bg-amber-500 font-semibold text-white hover:bg-amber-600 dark:text-slate-950"
              >
                <RefreshCw className="h-4 w-4" />
                Sayfayı Yenile
              </Button>
              <Button
                variant="outline"
                onClick={this.handleGoHome}
                className="gap-2 rounded-xl"
              >
                <Home className="h-4 w-4" />
                Ana Sayfa
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
