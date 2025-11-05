const AuthHeader = ({ title, subtitle }) => (
    <div className="text-center">
        <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-600 to-indigo-600
        rounded-2xl flex items-center justify-center shadow-lg mb-4 transform hover:scale-105 transition-transform" />
        <h2 className="text-3xl font-extrabold text-gray-900">
            {title}
        </h2>
        {subtitle && <p className="mt-2 text-sm text-gray-600">{subtitle}</p>}
    </div>
);

export default AuthHeader;
