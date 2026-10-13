import { cn } from '../cn';

export interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const sizes = { sm: 'h-4 w-4 border-2', md: 'h-6 w-6 border-2', lg: 'h-10 w-10 border-4' };

export function Loader({ size = 'md', label = 'Carregando', className }: LoaderProps) {
  return (
    <span role="status" className={cn('inline-flex items-center', className)}>
      <span
        aria-hidden="true"
        className={cn(
          'inline-block animate-spin rounded-full border-current border-t-transparent',
          sizes[size],
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
