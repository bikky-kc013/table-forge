import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/presentation/components/ui/button.js';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  return (
    <Button
      variant="ghost"
      mode="icon"
      shape="circle"
      onClick={() => {
        setTheme(dark ? 'light' : 'dark');
      }}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="hover:bg-primary/10 hover:[&_svg]:text-primary size-9"
    >
      {dark ? <Sun className="size-4.5!" /> : <Moon className="size-4.5!" />}
    </Button>
  );
}
