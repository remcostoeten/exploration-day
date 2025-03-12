export interface IChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface ISupportArticle {
  id: string
  title: string
  content: string
  url: string
  category: string
}
