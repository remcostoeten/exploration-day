import styles from './SuggestedQuestions.module.css';

interface ISuggestedQuestionsProps {
    questions: string[];
    onQuestionClick: (question: string) => void;
}

const SuggestedQuestions = ({ questions, onQuestionClick }: ISuggestedQuestionsProps) => {
    return (
        <div className="py-4 space-y-3">
            <p className="text-sm font-medium text-gray-500">Suggested Questions</p>
            <div className="flex flex-wrap gap-2">
                {questions.map((question, index) => (
                    <button
                        key={index}
                        className="px-4 py-2 text-sm bg-white text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
                        onClick={() => onQuestionClick(question)}
                    >
                        {question}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default SuggestedQuestions;