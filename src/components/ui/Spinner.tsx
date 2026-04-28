interface Props {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Spinner({ size = 'md', className = '' }: Props) {
  const sz = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }[size];
  return (
    <div className={`${sz} ${className}`}>
      <div className={`${sz} rounded-full border-2 border-slate-700 border-t-cyan-500 animate-spin`} />
    </div>
  );
}
