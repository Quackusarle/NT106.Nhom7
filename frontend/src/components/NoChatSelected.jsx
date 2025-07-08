import { MessageSquare } from "lucide-react";

const NoChatSelected = () => {
    return (
        <div className="w-full flex flex-1 flex-col items-center justify-center p-16 bg-gray-300/90">
            <div className="max-w-md text-center space-y-6">
                <div className="flex justify-center gap-4 mb-4">
                    <div className="relative">
                        <div
                            className="size-18 rounded bg-gray-300/90 flex items-center justify-center border-2 border-gray-600 shadow-[2px_2px_0_#00000050] animate-float"
                            style={{ backgroundImage: "url('https://minecraft.wiki/images/Dirt_%28texture%29_JE2_BE2.png')", backgroundSize: "cover" }}
                        >
                            <img
                                src="https://i.pinimg.com/736x/c2/0b/1f/c20b1fab73a2f0e86d113f1a711c71d3.jpg"
                                alt="Grass Block Logo"
                                className="size-20"
                                style={{ imageRendering: "pixelated" }}
                            />
                        </div>
                    </div>
                </div>

                <h2 className="text-3xl font-bold pixel-font text-gray-800">Welcome to MineZola!</h2>
                <p className="pixel-font text-gray-600 text-2xl">
                    Select a conversation from the sidebar to start chatting
                </p>
            </div>
        </div>
    );
};

export default NoChatSelected;