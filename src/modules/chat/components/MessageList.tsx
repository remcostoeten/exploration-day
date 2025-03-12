import type { IChatMessage } from "@/modules/chat/types"
import Message from "./Message"
import styles from "./MessageList.module.css"

interface IMessageListProps {
    messages: IChatMessage[];
    onFeedback?: (messageId: string, isHelpful: boolean, comment?: string) => void;
}

const MessageList = ({ messages, onFeedback }: IMessageListProps) => {
    return (
        <div className={styles.messageList}>
            {messages?.map((message) => (
                <Message key={message.id} message={message} />
            ))}
        </div>
    )
}

export default MessageList

