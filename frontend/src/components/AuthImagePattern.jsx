const AuthImagePattern = ({ title, subtitle }) => {
    return (
        <div className="hidden lg:flex items-center justify-center bg-gradient-to-b from-green-600 to-green-900 p-12">
            <div className="max-w-md text-center bg-gray-300/90 p-8 rounded-lg border-4 border-gray-600 shadow-[8px_8px_0_#00000050]">
                {/* Minecraft Block Icon */}
                <div className="mb-8 flex justify-center">
                    <div
                        className="size-16 bg-[url('https://i.pinimg.com/736x/15/c1/af/15c1af82b39cfa5ee959057d9e145104.jpg')] bg-cover rounded border-2 border-gray-800 animate-[bounce_3s_infinite]"
                        style={{ imageRendering: "pixelated" }}
                    ></div>
                </div>
                <h2 className="text-3xl font-bold mb-4 pixel-font text-gray-800">{title}</h2>
                <p className="text-gray-700 pixel-font">{subtitle}</p>
            </div>
        </div>
    );
};

export default AuthImagePattern;