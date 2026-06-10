// Book Module
export type BookStatus = 'TO_READ' | 'READING' | 'COMPLETED';
export interface BookInput { userId: string; title: string; author?: string; status: BookStatus; pages?: number; currentPage?: number; }
