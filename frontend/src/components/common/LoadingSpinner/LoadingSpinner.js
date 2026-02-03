import clsx from 'clsx';

const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={clsx('animate-spin rounded-full border-2 border-current border-t-transparent', sizes[size], className)}>
      <span className="sr-only">Chargement...</span>
    </div>
  );
};

export default LoadingSpinner;
