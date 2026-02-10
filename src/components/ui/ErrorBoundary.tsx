import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    private handleReload = () => {
        window.location.reload();
    };

    private handleGoHome = () => {
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center animate-in fade-in duration-500">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-red-100 rounded-full blur-xl opacity-50 animate-pulse" />
                        <div className="relative w-24 h-24 bg-gradient-to-br from-red-100 to-red-50 rounded-2xl flex items-center justify-center border border-red-200 shadow-xl">
                            <AlertTriangle className="w-12 h-12 text-red-500" />
                        </div>
                    </div>

                    <h1 className="text-3xl font-bold tracking-tight text-foreground mb-3">
                        Something went wrong
                    </h1>
                    <p className="text-muted-foreground max-w-md mb-8">
                        We encountered an unexpected error. The application has been paused to prevent data loss.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs">
                        <Button size="lg" onClick={this.handleReload} className="w-full gap-2 shadow-lg shadow-primary/20">
                            <RefreshCw className="w-4 h-4" />
                            Try Again
                        </Button>
                        <Button size="lg" variant="outline" onClick={this.handleGoHome} className="w-full gap-2">
                            <Home className="w-4 h-4" />
                            Go Home
                        </Button>
                    </div>

                    {import.meta.env.MODE === 'development' && this.state.error && (
                        <Card className="mt-10 max-w-2xl w-full border-red-200 bg-red-50/50">
                            <CardContent className="p-4 overflow-auto max-h-64 text-left">
                                <p className="font-mono text-xs text-red-800 font-semibold mb-2">
                                    {this.state.error.toString()}
                                </p>
                                {this.state.errorInfo && (
                                    <pre className="font-mono text-[10px] text-red-600/80 whitespace-pre-wrap">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}
