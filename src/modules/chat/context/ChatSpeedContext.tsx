'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface ChatSpeedContextType {
    speedMultiplier: number;
    setSpeedMultiplier: (speed: number) => void;
}

const ChatSpeedContext = createContext<ChatSpeedContextType>({
    speedMultiplier: 1,
    setSpeedMultiplier: () => { },
});

export function ChatSpeedProvider({ children }: { children: ReactNode }) {
    const [speedMultiplier, setSpeedMultiplier] = useState(1);

    return (
        <ChatSpeedContext.Provider value={{ speedMultiplier, setSpeedMultiplier }}>
            {children}
        </ChatSpeedContext.Provider>
    );
}

export const useChatSpeed = () => useContext(ChatSpeedContext); 