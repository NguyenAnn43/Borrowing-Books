import Link from "next/link";
import { Button } from "@/components/ui";
import { BookOpen, Users, Library, Shield } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-blue-400" />
              <span className="text-xl font-bold text-white">
                Borrowing Books
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost" className="text-white hover:bg-white/10">
                  Đăng nhập
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary">Đăng ký</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Hệ Thống Quản Lý
            <span className="block bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Thư Viện Liên Trường
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-10">
            Tìm kiếm và mượn sách từ nhiều thư viện trong mạng lưới. Quản lý
            việc mượn trả sách dễ dàng, theo dõi lịch sử và nhận thông báo tự
            động.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/books">
              <Button size="lg" className="w-full sm:w-auto">
                Khám phá sách
              </Button>
            </Link>
            <Link href="/register">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto border-white text-white hover:bg-white hover:text-gray-900"
              >
                Tạo tài khoản miễn phí
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Tính năng nổi bật
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feature 1 */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:bg-white/20 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Tìm kiếm thông minh
              </h3>
              <p className="text-gray-400">
                Tìm kiếm sách theo tên, tác giả, thể loại hoặc từ khóa từ tất cả
                các thư viện trong mạng lưới.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:bg-white/20 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
                <Library className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Liên thư viện
              </h3>
              <p className="text-gray-400">
                Mượn sách từ bất kỳ thư viện nào trong mạng lưới, không giới hạn
                địa điểm.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:bg-white/20 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Quản lý dễ dàng
              </h3>
              <p className="text-gray-400">
                Theo dõi sách đang mượn, lịch sử mượn trả và nhận thông báo khi
                sắp đến hạn.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:bg-white/20 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Bảo mật cao
              </h3>
              <p className="text-gray-400">
                Hệ thống bảo mật tiên tiến, bảo vệ thông tin cá nhân và lịch sử
                mượn sách của bạn.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 bg-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">10+</div>
              <div className="text-gray-300">Thư viện liên kết</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-400 mb-2">
                50,000+
              </div>
              <div className="text-gray-300">Đầu sách</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-400 mb-2">
                10,000+
              </div>
              <div className="text-gray-300">Người dùng</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-orange-400 mb-2">
                100,000+
              </div>
              <div className="text-gray-300">Lượt mượn</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="h-6 w-6 text-blue-400" />
            <span className="text-lg font-bold text-white">Borrowing Books</span>
          </div>
          <p className="text-gray-400">
            © 2026 Borrowing Books. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
