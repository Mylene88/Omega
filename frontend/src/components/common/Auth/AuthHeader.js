const AuthHeader = ({ title, subtitle }) => (
    <div className="text-center">
        {/* En-tête DDT */}
        <div className="mx-auto mb-6">
            <div className="text-xl font-bold text-gray-800 tracking-tight">
                DDT 28
            </div>
            <div className="text-xs text-gray-500 mt-1 font-medium">
                Direction Départementale des Territoires
            </div>
        </div>

        <h2 className="text-3xl font-extrabold text-gray-900">
            {title}
        </h2>
        {subtitle && <p className="mt-2 text-sm text-gray-600">{subtitle}</p>}
    </div>
);

export default AuthHeader;
