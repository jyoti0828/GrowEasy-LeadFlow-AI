'use client';
import { useState, useEffect } from 'react';
import { Database, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AppHeader() {
  // Initialize as null to prevent SSR/client hydration mismatch.
  // localStorage is not available during server-side rendering.
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    // Read theme from localStorage after mount (client-only)
    const saved = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
    setTheme(saved);
  }, []);

  useEffect(() => {
    if (theme === null) return; // Not yet mounted
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.style.colorScheme = 'dark';
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.documentElement.style.colorScheme = 'light';
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
            <Database size={18} aria-hidden="true" />
          </div>
          <div>
            <span className="font-semibold text-lg leading-tight block text-foreground">GrowEasy</span>
            <span className="text-xs text-muted-foreground block">LeadFlow AI</span>
          </div>
        </div>

        {/* Render only after mount to avoid SSR/client hydration mismatch */}
        {theme !== null && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground mr-8 md:mr-12"
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon size={20} aria-hidden="true" /> : <Sun size={20} aria-hidden="true" />}
          </Button>
        )}
      </div>
    </header>
  );
}
