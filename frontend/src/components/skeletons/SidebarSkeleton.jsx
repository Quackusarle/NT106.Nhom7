import { Users } from "lucide-react";

const SidebarSkeleton = () => {
    const skeletonContacts = Array(8).fill(null);

    return (
        <aside
            className="h-full w-20 lg:w-72 border-r border-gray-600 flex flex-col transition-all duration-200 bg-gray-300/90"
        >
            <style>
                {`
          .hover-scale:hover { transform: scale(1.02); transition: transform 0.2s ease; }
        `}
            </style>
            <div
                className="border-b border-gray-600 w-full p-6 relative"
            >
                <div className="flex items-center gap-4">
                    <Users className="size-8 text-gray-800 drop-shadow-[2px_2px_1px_#00000080]" />
                    <span className="font-medium pixel-font text-gray-800 text-3xl">
                        Contacts
                    </span>
                </div>
            </div>

            <div
                className="overflow-y-auto w-full py-4 flex-1"
            >
                {skeletonContacts.map((_, idx) => (
                    <div key={idx} className="w-full p-4 flex items-center gap-4">
                        <div className="relative mx-auto lg:mx-0">
                            <div
                                className="size-10 object-cover rounded border-2 border-gray-600 bg-gray-500 shadow-[2px_2px_0_#00000080]"
                                style={{ imageRendering: "pixelated" }}
                            />
                        </div>

                        <div className="hidden lg:block text-left min-w-0 flex-1">
                            <div className="h-6 w-32 mb-2 rounded bg-gray-500 shadow-[1px_1px_0_#00000080]" />
                            <div className="h-5 w-16 rounded bg-gray-500 shadow-[1px_1px_0_#00000080]" />
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
};

export default SidebarSkeleton;