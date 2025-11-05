const AuthInfoBox = ({ variant = "info", title, children }) => {
    const styles = {
        info: "bg-blue-50/70 border border-blue-200 text-blue-700",
        help: "bg-white/70 border border-gray-200 text-gray-600",
    };

    return (
        <div className={`${styles[variant]} backdrop-blur-sm rounded-xl p-5 shadow-sm`}>
            <h4 className="text-sm font-medium">
                {title}
            </h4>
            <p className="text-sm mt-1">{children}</p>
        </div>
    );
};

export default AuthInfoBox;
