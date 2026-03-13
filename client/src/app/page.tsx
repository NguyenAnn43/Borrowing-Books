import Link from "next/link";
import { Button } from "@/components/ui";
import { BookOpen, Users, Library, Shield, ArrowRight, Search, Globe, Clock, CheckCircle2 } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden selection:bg-blue-100 selection:text-blue-900">
      {/* Background Ambience - Light Mode */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[50%] h-[50%] bg-blue-100/50 rounded-full blur-[100px] mix-blend-multiply" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] bg-indigo-100/50 rounded-full blur-[100px] mix-blend-multiply" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky-nav">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2 rounded-xl shadow-lg shadow-blue-500/20">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Borrowing<span className="text-blue-600">Books</span>
              </span>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost" className="text-slate-600 hover:text-blue-600 hover:bg-blue-50 font-medium">
                  Đăng nhập
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="primary" className="rounded-full px-6 shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-none">
                  Bắt đầu ngay
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-40 pb-32 px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-blue-700 text-sm font-semibold mb-8 shadow-sm hover:shadow-md transition-shadow cursor-default animate-fade-in-up">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
            </span>
            Hệ thống thư viện thông minh 2.0
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 leading-[1.15]">
            Khám phá tri thức <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent pb-2">
              Không giới hạn
            </span>
          </h1>

          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
            Kết nối hàng ngàn thư viện, quản lý việc mượn trả sách dễ dàng và thông minh hơn bao giờ hết. Trải nghiệm ngay hôm nay.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/books" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto rounded-full px-8 h-14 text-lg bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 text-white font-semibold transition-all hover:scale-105 border-0">
                <Search className="mr-2 h-5 w-5" />
                Tìm sách ngay
              </Button>
            </Link>
            <Link href="/register" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto rounded-full px-8 h-14 text-lg border-slate-200 text-slate-700 hover:bg-white hover:text-blue-600 hover:border-blue-200 shadow-sm hover:shadow-md transition-all bg-white"
              >
                Tạo tài khoản
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>

          <div className="mt-16 flex items-center justify-center gap-8 text-sm text-slate-500 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Miễn phí đăng ký
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Hỗ trợ 24/7
            </div>
            <div className="flex items-center gap-2 hidden sm:flex">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Đa nền tảng
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 py-32 px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl font-bold text-slate-900 mb-6">Tính năng vượt trội</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Được thiết kế tỉ mỉ để tối ưu hóa trải nghiệm của bạn, mang lại sự thuận tiện và hiệu quả chưa từng có.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<Search className="w-6 h-6 text-blue-600" />}
              title="Tìm kiếm thông minh"
              description="Công cụ tìm kiếm mạnh mẽ với bộ lọc chuyên sâu giúp bạn tìm thấy cuốn sách mong muốn trong tích tắc."
              color="bg-blue-50"
              delay={0}
            />
            <FeatureCard
              icon={<Globe className="w-6 h-6 text-indigo-600" />}
              title="Mạng lưới rộng lớn"
              description="Kết nối liên thông với hàng chục thư viện đối tác, mở rộng kho tri thức của bạn không giới hạn."
              color="bg-indigo-50"
              delay={100}
            />
            <FeatureCard
              icon={<Clock className="w-6 h-6 text-purple-600" />}
              title="Quản lý thời gian"
              description="Hệ thống tự động nhắc nhở lịch trả sách, hỗ trợ gia hạn trực tuyến chỉ với một cú click."
              color="bg-purple-50"
              delay={200}
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6 text-emerald-600" />}
              title="Bảo mật tuyệt đối"
              description="Công nghệ mã hóa tiên tiến đảm bảo dữ liệu cá nhân và lịch sử đọc sách của bạn luôn an toàn."
              color="bg-emerald-50"
              delay={300}
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-24 px-6 lg:px-8 bg-slate-50 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full blur-[100px] opacity-60" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2.5rem] p-12 lg:p-16 shadow-2xl shadow-blue-900/5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-12 lg:gap-16">
              <StatItem value="10+" label="Đối tác thư viện" color="text-blue-600" />
              <StatItem value="50K+" label="Đầu sách" color="text-indigo-600" />
              <StatItem value="10K+" label="Độc giả" color="text-purple-600" />
              <StatItem value="99%" label="Hài lòng" color="text-emerald-600" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 lg:px-8 bg-white text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Sẵn sàng bắt đầu hành trình đọc sách?</h2>
          <p className="text-lg text-slate-600 mb-10">Tham gia cộng đồng hàng nghìn độc giả và mở khóa kho tàng tri thức vô tận ngay hôm nay.</p>
          <Link href="/register">
            <Button size="lg" className="rounded-full px-10 h-16 text-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xl hover:shadow-2xl transition-all hover:scale-105 border-0">
              Đăng ký miễn phí ngay
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-6 lg:px-8 border-t border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="text-slate-700 font-bold">Borrowing Books</span>
          </div>
          <div className="flex gap-8 text-sm text-slate-500">
            <Link href="#" className="hover:text-blue-600 transition-colors">Điều khoản</Link>
            <Link href="#" className="hover:text-blue-600 transition-colors">Bảo mật</Link>
            <Link href="#" className="hover:text-blue-600 transition-colors">Liên hệ</Link>
          </div>
          <p className="text-slate-400 text-sm font-medium">
            © 2026 Library System.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, color, delay }: { icon: React.ReactNode, title: string, description: string, color: string, delay: number }) {
  return (
    <div
      className="group p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-blue-100 hover:bg-white hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 hover:-translate-y-2 relative overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed text-base font-medium">
        {description}
      </p>
    </div>
  );
}

function StatItem({ value, label, color }: { value: string, label: string, color: string }) {
  return (
    <div className="text-center group cursor-default">
      <div className={`text-4xl md:text-5xl font-extrabold ${color} mb-3 group-hover:scale-110 transition-transform duration-300 inline-block`}>
        {value}
      </div>
      <div className="text-slate-500 font-semibold uppercase tracking-wider text-sm">
        {label}
      </div>
    </div>
  );
}
