import * as bookService from './bookService';
import { config } from '../config';

const clientBaseUrl = config.CLIENT_URL.replace(/\/$/, '');

const getReviewGuide = (): string => {
    return `Hướng dẫn review nhanh:\n1. Đăng nhập tài khoản Member (user).\n2. Chỉ được review khi đã từng mượn sách/thư viện tương ứng (trạng thái borrowed/returned/overdue).\n3. Vào trang chi tiết sách hoặc trang thư viện, kéo xuống mục review để gửi đánh giá.\n4. Cần tick xác nhận tuân thủ quy tắc cộng đồng trước khi đăng review mới.\n5. Nếu review bị ẩn do vi phạm, bạn sẽ không thể review lại nội dung đó.`;
};

const getBorrowGuide = (): string => {
    return `Hướng dẫn mượn sách nhanh:\n1. Vào danh sách sách và bấm Add to Cart cho các sách còn sẵn.\n2. Vào Dashboard > Cart để gửi yêu cầu mượn theo từng thư viện.\n3. Hệ thống tạo yêu cầu, sau đó theo dõi tại Dashboard > Borrowings.\n4. Có thể gia hạn khi còn lượt, và thanh toán phạt nếu quá hạn.`;
};

const getReservationGuide = (): string => {
    return `Hướng dẫn đặt trước nhanh:\n1. Chỉ đặt trước khi sách đã hết (availableCopies = 0).\n2. Vào trang chi tiết sách và bấm Đặt trước.\n3. Theo dõi trạng thái tại Dashboard > Reservations.\n4. Khi thư viện báo READY, bạn đến nhận trong thời hạn quy định.`;
};
import type { IBook } from '../types';

export const processMessage = async (message: string, _userId?: string): Promise<string> => {
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
        return getReviewGuide();
    }

    // Intent: HOW-TO GUIDES
    if (
        lowerMessage.includes('hướng dẫn review')
        || lowerMessage.includes('cách review')
        || lowerMessage.includes('hướng dẫn đánh giá')
    ) {
        return getReviewGuide();
    }

    if (
        lowerMessage.includes('hướng dẫn mượn')
        || lowerMessage.includes('cách mượn')
        || lowerMessage.includes('mượn sách như nào')
        || lowerMessage.includes('mượn sách như thế nào')
    ) {
        return getBorrowGuide();
    }

    if (
        lowerMessage.includes('hướng dẫn đặt trước')
        || lowerMessage.includes('cách đặt trước')
        || lowerMessage.includes('reserve')
        || lowerMessage.includes('đặt trước sách')
    ) {
        return getReservationGuide();
    }

    // Intent: HELP
    if (lowerMessage === 'hướng dẫn' || lowerMessage === 'help' || lowerMessage.includes('bạn có thể làm gì')) {
        return `Hướng dẫn nhanh chatbot:\n1. Tra cứu sách: "tìm sách clean code"\n2. Hướng dẫn review: "hướng dẫn review"\n3. Hướng dẫn mượn sách: "hướng dẫn mượn"\n4. Hướng dẫn đặt trước: "hướng dẫn đặt trước"\n5. Giờ mở cửa: "giờ mở cửa"\nBạn cần mình hỗ trợ mục nào?`;
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
    const keyword = lowerMessage
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
            const bookList = result.books.map((b: IBook) => {
                const populatedLibrary = b.libraryId as unknown as { name?: string };
                const libName = populatedLibrary?.name || 'Chưa cập nhật';
                const statusStr = b.availableCopies > 0 ? `Còn ${b.availableCopies} cuốn` : 'Tạm hết sách';
                const detailLink = b._id ? `${clientBaseUrl}/books/${b._id}` : '';
                return `- 📖 "${b.title}" (Tác giả: ${b.author})\n  📍 Thuộc: ${libName} (Khu vực kệ: ${b.location || 'Đang cập nhật'})\n  🏷️ Trạng thái: ${statusStr}${detailLink ? `\n  🔗 Xem chi tiết: ${detailLink}` : ''}`;
            }).join('\n\n');
            const prefix = result.pagination.total > 1 ? `Mình tìm thấy ${result.pagination.total} kết quả phù hợp với từ khóa "${keyword}". Gửi bạn thông tin các cuốn sách:` : `Mình tìm thấy cuốn sách bạn cần đây:`;

            return `${prefix}\n\n${bookList}\n\nBạn có thể bấm link chi tiết để mở trực tiếp trang sách và thao tác mượn/đặt trước.`;
        } else {
            return `Rất tiếc, hiện tại thư viện không có cuốn nào khớp với từ khóa "${keyword}". Bạn kiểm tra lại tên sách giúp mình nha!`;
        }
    } catch (error) {
        return `Đã có lỗi xảy ra khi tìm kiếm sách. Vui lòng thử lại sau.`;
    }
};
