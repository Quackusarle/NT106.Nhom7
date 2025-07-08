const MessageSkeleton = () => {
    const skeletonMessages = Array(6).fill(null);

    return (
        <div
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-300/90"
            style={{
                backgroundImage: "url('https://minecraft.wiki/images/Dirt_%28texture%29_JE2_BE2.png')",
                backgroundBlendMode: "overlay",
                backgroundSize: "cover",
                imageRendering: "pixelated",
            }}
        >
            {skeletonMessages.map((_, idx) => (
                <div key={idx} className={`chat ${idx % 2 === 0 ? "chat-start" : "chat-end"}`}>
                    <div className="chat-image avatar">
                        <div className="size-10 rounded-full">
                            <div className="skeleton w-full h-full rounded-full drop-shadow-[1px_1px_0_#00000080]" />
                        </div>
                    </div>

                    <div className="chat-header mb-1">
                        <div className="skeleton h-4 w-16 drop-shadow-[1px_1px_0_#00000080]" />
                    </div>

                    <div className="chat-bubble bg-transparent p-0">
                        <div className="skeleton h-16 w-[200px] drop-shadow-[1px_1px_0_#00000080]" />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default MessageSkeleton;