const ErrorMessage = ({ message, className = '' }) => {
  if (!message) return null;

  return (
    <div className={`bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg ${className}`}>
      <div className="flex items-start">
        <svg className="w-5 h-5 text-red-500 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );
};

export default ErrorMessage;
