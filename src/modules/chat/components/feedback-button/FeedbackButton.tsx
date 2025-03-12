'use client'

import { useState } from 'react';
import styles from './FeedbackButtons.module.css';

interface IFeedbackButtonsProps {
    messageId: string;
    onFeedback: (messageId: string, isHelpful: boolean, comment?: string) => void;
}

const FeedbackButtons = ({ messageId, onFeedback }: IFeedbackButtonsProps) => {
    const [feedbackGiven, setFeedbackGiven] = useState<boolean>(false);
    const [showCommentBox, setShowCommentBox] = useState<boolean>(false);
    const [comment, setComment] = useState<string>('');

    const handleFeedback = (isHelpful: boolean) => {
        if (feedbackGiven) return;

        setFeedbackGiven(true);

        if (!isHelpful) {
            setShowCommentBox(true);
        } else {
            onFeedback(messageId, true);
        }
    };

    const handleCommentSubmit = () => {
        onFeedback(messageId, false, comment);
        setShowCommentBox(false);
    };

    if (feedbackGiven && !showCommentBox) {
        return (
            <div className={styles.feedbackThanks}>
                Thank you for your feedback!
            </div>
        );
    }

    return (
        <div className={styles.feedbackContainer}>
            {!showCommentBox ? (
                <>
                    <p className={styles.feedbackQuestion}>Was this response helpful?</p>
                    <div className={styles.buttonContainer}>
                        <button
                            onClick={() => handleFeedback(true)}
                            className={styles.feedbackButton}
                            aria-label="Yes, this was helpful"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                            </svg>
                            Yes
                        </button>
                        <button
                            onClick={() => handleFeedback(false)}
                            className={styles.feedbackButton}
                            aria-label="No, this was not helpful"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
                            </svg>
                            No
                        </button>
                    </div>
                </>
            ) : (
                <div className={styles.commentContainer}>
                    <p className={styles.commentPrompt}>How could we improve this response?</p>
                    <textarea
                        className={styles.commentInput}
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Please provide your feedback..."
                        rows={3}
                    />
                    <div className={styles.commentActions}>
                        <button
                            onClick={() => setShowCommentBox(false)}
                            className={styles.cancelButton}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCommentSubmit}
                            className={styles.submitButton}
                            disabled={!comment.trim()}
                        >
                            Submit
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FeedbackButtons;