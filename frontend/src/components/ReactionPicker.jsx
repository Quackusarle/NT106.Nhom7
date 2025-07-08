import { useState, useRef, useEffect } from 'react';

const EMOJI_LIST = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🔥'];

export default function ReactionPicker({ onReact, onClose, position = 'top' }) {
  const [isVisible, setIsVisible] = useState(false);
  const pickerRef = useRef(null);

  useEffect(() => {
    setIsVisible(true);
    
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 150); // Delay để animation hoàn thành
  };

  const handleEmojiClick = (emoji) => {
    onReact(emoji);
    handleClose();
  };

  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2'
  };

  return (
    <div 
      ref={pickerRef}
      className={`
        absolute ${positionClasses[position]} 
        bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50
        transition-all duration-150 ease-out
        ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
      `}
    >
      <div className="flex gap-1">
        {EMOJI_LIST.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleEmojiClick(emoji)}
            className="
              w-8 h-8 flex items-center justify-center rounded-md
              hover:bg-gray-100 transition-colors duration-150
              text-lg
            "
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}