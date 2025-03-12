import { IChatMessage } from '@/modules/chat/types';
import FeedbackButtons from './feedback-button/FeedbackButton';

interface IMessageProps {
    message: IChatMessage;
    onFeedback?: (messageId: string, isHelpful: boolean, comment?: string) => void;
}

const Message = ({ message, onFeedback }: IMessageProps) => {
    const isUser = message.role === 'user';
    const containerClass = `flex flex-col gap-2 p-4 rounded-lg max-w-[80%] ${isUser
            ? 'ml-auto bg-purple-600 text-white'
            : 'mr-auto bg-gray-100 text-gray-800'
        }`;

    return (
        <div className={containerClass}>
            <div className="text-sm whitespace-pre-wrap break-words">
                {message.content}
            </div>
            <div className="text-xs opacity-70">
                {new Date(message.timestamp).toLocaleTimeString()}
            </div>
            {!isUser && onFeedback && (
                <FeedbackButtons
                    messageId={message.id}
                    onFeedback={onFeedback}
                />
            )}
        </div>
    );
};

export default Message; 