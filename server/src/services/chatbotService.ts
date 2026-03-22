import * as bookService from './bookService';

export const processMessage = async (message: string, userId?: string): Promise<string> => {
    const lowerMessage = message.toLowerCase().trim();

    // Intent: LIBRARY_INFO
    if (lowerMessage.includes('giờ mở cửa') || lowerMessage.includes('opening hours') || lowerMessage.includes('thời gian hoạt động') || lowerMessage.includes('mấy giờ')) {
        return `Thư viện mở cửa từ Thứ Hai đến Thứ Bảy:\n- Sáng: 08:00 - 12:00\n- Chiều: 13:00 - 17:00\nChủ Nhật và các ngày lễ thư viện nghỉ.`;
    }

    // Intent: GREETING
    if (lowerMessage === 'chào' || lowerMessage === 'hello' || lowerMessage === 'hi' || lowerMessage.startsWith('chào bạn')) {
        return `Chào bạn! Mình là trợ lý ảo của thư viện. Mình có thể giúp bạn tra cứu sách, xem giờ mở cửa, hoặc giải đáp các thắc mắc cơ bản.`;
    }

    // Intent: THANK YOU
    if (lowerMessage.includes('cảm ơn') || lowerMessage.includes('thank') || lowerMessage === 'okie' || lowerMessage === 'ok') {
        return `Không có gì ạ! Thư viện luôn sẵn sàng hỗ trợ bạn. Gõ "hướng dẫn" nếu cần xem lại các tính năng nhé!`;
    }

    // Intent: FAQ - REVIEW ISSUE
    if (lowerMessage.includes('không review được') || lowerMessage.includes('không đánh giá được') || lowerMessage.includes('lỗi đánh giá')) {
        return `Về việc không review được sách: Hệ thống quy định bạn **phải từng mượn và đã trả thành công** cuốn sách đó thì mới được phép viết đánh giá. Nếu bạn đã mượn mà vẫn không review được, vui lòng báo lại cho thủ thư để được kiểm tra tài khoản nhé!`;
    }

    // Intent: HELP
    if (lowerMessage === 'hướng dẫn' || lowerMessage === 'help' || lowerMessage.includes('bạn có thể làm gì')) {
        return `Bạn có thể dùng các lệnh sau:\n1. Tra cứu sách (VD: "Tìm cuốn System Design", "Sách Đắc Nhân Tâm mượn ở đâu?")\n2. Xem giờ mở cửa: "Giờ mở cửa"\n3. Hỏi đáp: "Vì sao không review được?"\nBạn cần mình giúp gì ạ?`;
    }

    // Intent: EXPLICIT/IMPLICIT BOOK SEARCH
    // Remove conversational fillers and special characters so only the core keywords remain.
    const stopWordsList = new Set([
        'cho', 'tôi', 'mình', 'nhé', 'nha', 'với', 'ạ', 'đi', 'nhá', 'nhỉ', 'không', 
        'giúp', 'xin', 'hỏi', 'cuốn', 'sách', 'quyển', 'này', 'thư', 'viện', 'nào', 
        'ở', 'đâu', 'tìm', 'kiếm', 'thông', 'tin', 'về', 'đang', 'muốn', 'xem', 'chi', 
        'tiết', 'của', 'có', 'ai', 'làm', 'sao', 'để', 'được', 'chứ', 'vậy', 'mượn', 'những', 'các'
    ]);
    
    // Clean string: remove punctuation, split by space, filter stop words
    let keyword = lowerMessage
        .replace(/[?!.,;'"]/g, ' ')
        .split(/\s+/)
        .filter(word => word && !stopWordsList.has(word))
        .join(' ')
        .trim();

    if (!keyword) {
        return `Xin lỗi, tôi chưa rõ ý của bạn. Bạn muốn tìm tên sách cụ thể nào hay cần hỗ trợ thông tin gì ạ? (Bạn có thể gửi luôn "tên sách" để mình tìm nhé!)`;
    }

    try {
        const result = await bookService.getBooks({ q: keyword, limit: 3, page: 1, includeWishlist: false });
        if (result.books.length > 0) {
            const bookList = result.books.map((b: any) => {
                const libName = b.libraryId?.name || 'Chưa cập nhật';
                const statusStr = b.availableCopies > 0 ? `Còn ${b.availableCopies} cuốn` : 'Tạm hết sách';
                return `- 📖 **"${b.title}"** (Tác giả: ${b.author})\n  📍 Thuộc: ${libName} (Khu vực kệ: ${b.location || 'Đang cập nhật'})\n  🏷️ Trạng thái: ${statusStr}`;
            }).join('\n\n');
            const prefix = result.pagination.total > 1 ? `Mình tìm thấy ${result.pagination.total} kết quả phù hợp với từ khóa "${keyword}". Gửi bạn thông tin các cuốn sách:` : `Mình tìm thấy cuốn sách bạn cần đây:`;
            
            return `${prefix}\n\n${bookList}\n\nBạn có thể đến trực tiếp thư viện hoặc nhấn vào tên sách trên web để đặt mượn nhé!`;
        } else {
            return `Rất tiếc, hiện tại thư viện không có cuốn nào khớp với từ khóa "${keyword}". Bạn kiểm tra lại tên sách giúp mình nha!`;
        }
    } catch (error) {
        return `Đã có lỗi xảy ra khi tìm kiếm sách. Vui lòng thử lại sau.`;
    }
};
