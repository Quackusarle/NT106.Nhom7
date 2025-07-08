import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';

export default function ReactionDisplay({ reactions = [], messageId }) {
  const authUser = useAuthStore(state => state.authUser);
  const updateMessageReaction = useChatStore(state => state.updateMessageReaction);

  if (!reactions || reactions.length === 0) {
    return null;
  }

  // Nhóm reactions theo emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!reaction.emoji) return acc;
    
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        users: [],
        hasCurrentUser: false
      };
    }
    
    acc[reaction.emoji].count++;
    acc[reaction.emoji].users.push(reaction.userId);
    
    if (reaction.userId === authUser?._id) {
      acc[reaction.emoji].hasCurrentUser = true;
    }
    
    return acc;
  }, {});

  const handleReactionClick = async (emoji) => {
    const reactionGroup = groupedReactions[emoji];
    const isRemoving = reactionGroup.hasCurrentUser;
    
    try {
      await updateMessageReaction(messageId, emoji, !isRemoving);
    } catch (error) {
      console.error("Error toggling reaction:", error);
    }
  };

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.values(groupedReactions).map(({ emoji, count, hasCurrentUser }) => (
        <button
          key={emoji}
          onClick={() => handleReactionClick(emoji)}
          className={`
            inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs
            border transition-all duration-150
            ${hasCurrentUser 
              ? 'bg-blue-100 border-blue-300 text-blue-700' 
              : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
            }
          `}
          title={hasCurrentUser ? 'Bỏ cảm xúc' : 'Thêm cảm xúc'}
        >
          <span>{emoji}</span>
          <span className="font-medium">{count}</span>
        </button>
      ))}
    </div>
  );
}