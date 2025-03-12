import styles from './MessageInput.module.css';

interface IMessageInputProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSubmit: (e: React.FormEvent) => void;
    isLoading: boolean;
    placeholder?: string;
}

const MessageInput = ({ value, onChange, onSubmit, isLoading, placeholder = "Type your message..." }: IMessageInputProps) => {
    return (
        <form onSubmit={onSubmit} className="flex gap-3 bg-white rounded-2xl shadow-sm">
            <input
                type="text"
                value={value}
                onChange={onChange}
                disabled={isLoading}
                placeholder={placeholder}
                className="flex-1 px-6 py-4 text-base bg-transparent outline-none transition-colors placeholder:text-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed"
                aria-label="Message input"
            />
            <button
                type="submit"
                disabled={isLoading || !value.trim()}
                className="w-12 h-12 mr-2 my-1 bg-purple-600 text-white rounded-xl flex items-center justify-center transition-all hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                aria-label="Send message"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
            </button>
        </form>
    );
};

export default MessageInput;