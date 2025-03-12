'use client';

import { useChatSpeed } from '../context/ChatSpeedContext';

export const SpeedControl = () => {
    const { speedMultiplier, setSpeedMultiplier } = useChatSpeed();

    const speeds = [
        { label: '0.5x', value: 0.5 },
        { label: '1x', value: 1 },
        { label: '2x', value: 2 },
        { label: '4x', value: 4 },
        { label: '8x', value: 8 },
    ];

    return (
        <div className="flex items-center gap-2 p-2 border-t border-gray-200 bg-gray-50">
            <span className="text-xs text-gray-600">Speed:</span>
            <div className="flex gap-1">
                {speeds.map(({ label, value }) => (
                    <button
                        key={value}
                        onClick={() => setSpeedMultiplier(value)}
                        className={`px-2 py-1 text-xs border rounded-md transition-all
                            ${speedMultiplier === value
                                ? 'bg-purple-600 border-purple-600 text-white'
                                : 'border-gray-200 text-gray-600 hover:border-purple-600 hover:text-purple-600'
                            }`}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
}; 