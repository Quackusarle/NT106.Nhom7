import { useChatStore } from "../store/useChatStore";
import { useState } from "react";

export default function SearchBox({ onClose }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const selectedUser = useChatStore((s) => s.selectedUser);
  const searchMessages = useChatStore((s) => s.searchMessages);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    try {
      const res = await searchMessages(query.trim());
      setResults(res);
      console.log(`Search results for "${query}":`, res);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Hàm để truncate text dài
  const truncateText = (text, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-4 w-full max-w-lg shadow-lg relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">✕</button>
        
        <form onSubmit={handleSearch} className="flex gap-2 mb-3">
          <input
            className="flex-1 border border-gray-300 rounded px-3 py-2 outline-none focus:border-blue-500"
            placeholder="Tìm kiếm tin nhắn text..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          <button 
            type="submit" 
            className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded transition-colors"
            disabled={loading}
          >
            {loading ? "Đang tìm..." : "Tìm"}
          </button>
        </form>
        
        {loading && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-sky-500"></div>
            <div className="mt-2">Đang giải mã và tìm kiếm tin nhắn text...</div>
          </div>
        )}
        
        {!loading && results.length > 0 && (
          <div className="max-h-60 overflow-y-auto">
            <div className="text-sm text-gray-600 mb-2">
              Tìm thấy {results.length} tin nhắn text chứa "{query}"
            </div>
            <ul>
              {results.map(msg => (
                <li 
                  key={msg._id} 
                  className="p-3 border-b cursor-pointer hover:bg-sky-50 transition-colors" 
                  onClick={() => {
                    const element = document.getElementById(`msg-${msg._id}`);
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      // Highlight effect
                      element.classList.add('bg-yellow-200');
                      setTimeout(() => element.classList.remove('bg-yellow-200'), 2000);
                    }
                    onClose();
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-sm text-blue-600">
                      {msg.senderId === selectedUser._id ? selectedUser.fullName : "Bạn"}:
                    </span>
                    <span className="text-sm flex-1 text-gray-800">
                      {truncateText(msg.plainContent || "[Không giải mã được]")}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(msg.createdAt).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {!loading && results.length === 0 && query && (
          <div className="text-center text-gray-500 py-4">
            Không tìm thấy tin nhắn text nào chứa "{query}"
            <div className="text-xs mt-1 text-gray-400">
              (Chỉ tìm kiếm trong tin nhắn văn bản, không bao gồm hình ảnh)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}