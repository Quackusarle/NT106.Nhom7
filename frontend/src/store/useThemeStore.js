import { create } from "zustand";

// Default texture (dirt)
const DEFAULT_TEXTURE = "https://minecraft.wiki/images/Dirt_%28texture%29_JE2_BE2.png";

export const useThemeStore = create((set) => ({
    texture: localStorage.getItem("chat-texture") || DEFAULT_TEXTURE,
    setTexture: (texture) => {
        localStorage.setItem("chat-texture", texture);
        set({ texture });
    },
}));