import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const Logo = ({ size = 'md', showText = true, className = '' }: LogoProps) => {
  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <Link to="/" className={`flex items-center gap-3 group ${className}`}>
      {/* Simple V# - no block, large and clear */}
      <span className={`${size === 'sm' ? 'text-3xl' : size === 'md' ? 'text-4xl' : 'text-5xl'} font-black leading-none`}>
        <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 dark:from-purple-400 dark:via-pink-400 dark:to-purple-400 bg-clip-text text-transparent group-hover:from-purple-500 group-hover:via-pink-500 group-hover:to-purple-500 dark:group-hover:from-purple-300 dark:group-hover:via-pink-300 dark:group-hover:to-purple-300 transition-all">
          V
        </span>
        <span className="text-gray-800 dark:text-white/90">#</span>
      </span>
      
      {showText && (
        <div className="flex items-baseline gap-1">
          <span className={`${textSizes[size]} font-black bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 dark:from-purple-400 dark:via-pink-400 dark:to-purple-400 bg-clip-text text-transparent group-hover:from-purple-500 group-hover:via-pink-500 group-hover:to-purple-500 dark:group-hover:from-purple-300 dark:group-hover:via-pink-300 dark:group-hover:to-purple-300 transition-all`}>
            VITA
          </span>
          <span className={`${textSizes[size]} font-bold text-gray-800 dark:text-white/90`}>
            -Edu
          </span>
          <span className="ml-1 text-xs font-semibold text-purple-700 dark:text-purple-400/70 hidden sm:inline">
            IT
          </span>
        </div>
      )}
    </Link>
  );
};

export default Logo;


