/**
 * React Error Boundary Component
 * Catches and handles errors in the component tree
 */

import React, { Component } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo,
        });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex items-center justify-center min-h-screen bg-background p-6">
                    <div className="max-w-md w-full space-y-6">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="p-4 bg-destructive/10 rounded-full">
                                <AlertCircle className="w-12 h-12 text-destructive" />
                            </div>
                            
                            <div className="space-y-2">
                                <h1 className="text-2xl font-bold text-foreground">
                                    Something went wrong
                                </h1>
                                <p className="text-muted-foreground">
                                    An unexpected error occurred in the application.
                                </p>
                            </div>

                            {this.state.error && (
                                <div className="w-full p-4 bg-muted rounded-lg text-left">
                                    <p className="text-sm font-mono text-destructive break-all">
                                        {this.state.error.toString()}
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <Button
                                    onClick={this.handleReset}
                                    variant="default"
                                    className="gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Try Again
                                </Button>
                                <Button
                                    onClick={() => window.location.reload()}
                                    variant="outline"
                                >
                                    Reload Page
                                </Button>
                            </div>
                        </div>

                        {import.meta.env.DEV && this.state.errorInfo && (
                            <details className="mt-6">
                                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                                    Error Details (Development Only)
                                </summary>
                                <pre className="mt-2 p-4 bg-muted rounded text-xs overflow-auto max-h-64">
                                    {this.state.errorInfo.componentStack}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
