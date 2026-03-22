import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as chatbotService from './chatbotService';
import * as bookService from './bookService';

vi.mock('./bookService', () => ({
    getBooks: vi.fn()
}));

describe('chatbotService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return help instruction', async () => {
        const response = await chatbotService.processMessage('hướng dẫn');
        expect(response).toContain('Chào bạn! Tôi là trợ lý ảo của thư viện');
    });

    it('should return opening hours', async () => {
        const response = await chatbotService.processMessage('giờ mở cửa');
        expect(response).toContain('Thư viện mở cửa từ Thứ Hai đến Thứ Bảy');
    });

    it('should search book with freeform text', async () => {
        vi.mocked(bookService.getBooks).mockResolvedValue({
            books: [{
                title: 'System Design Interview',
                author: 'Alex Xu',
                availableCopies: 5,
                libraryId: { name: 'Thư viện Trung tâm' },
                location: 'A1-06'
            } as any],
            pagination: { total: 1, limit: 10, pages: 1, page: 1, hasNext: false, hasPrev: false }
        });

        // The user types a very complex sentence, the bot extracts "system design" and searches
        const response = await chatbotService.processMessage('hỏi cuốn sách system design này thư viện nào có');
        expect(bookService.getBooks).toHaveBeenCalledWith({ q: 'system design', limit: 3, page: 1, includeWishlist: false });
        expect(response).toContain('Mình tìm thấy cuốn sách bạn cần đây');
        expect(response).toContain('System Design Interview');
        expect(response).toContain('Thư viện Trung tâm'); // Shows library info directly
        expect(response).toContain('A1-06'); // Shows specific location
    });

    it('should handle search not found', async () => {
        vi.mocked(bookService.getBooks).mockResolvedValue({
            books: [],
            pagination: { total: 0, limit: 10, pages: 0, page: 1, hasNext: false, hasPrev: false }
        });

        const response = await chatbotService.processMessage('tìm sách 12345abckhongcogitayko');
        expect(response).toContain('12345abckhongcogitayko');
        expect(response).toContain('không có cuốn nào khớp với từ khóa');
    });
});
