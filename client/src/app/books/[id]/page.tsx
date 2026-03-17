"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image, { ImageLoaderProps } from "next/image";
import { AxiosError } from "axios";
import { Bookmark, Heart, Share2, Star, ChevronRight, MapPin, BookOpen, Search, Bell } from "lucide-react";
import { useToast, ToastContainer } from "@/components/ui/Toast";
import { bookService } from "@/services/bookService";
import { borrowingService } from "@/services/borrowingService";
import { reservationService } from "@/services/reservationService";
import type { IBook } from "@/types";

const FALLBACK_COVER_IMAGE = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQOQj15oIvHygVGGAOVti_B3-XRBqZKWFEqWQ&s";
const passthroughImageLoader = ({ src }: ImageLoaderProps) => src;

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = typeof params.id === "string" ? params.id : "";
  const { toasts, addToast, removeToast } = useToast();

  const [selectedBook, setSelectedBook] = useState<IBook | null>(null);
  const [isLoadingBooks, setIsLoadingBooks] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reservationCount, setReservationCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    const fetchBook = async () => {
      if (!bookId) {
        return;
      }

      try {
        setIsLoadingBooks(true);

        const [book] = await Promise.all([//const [book, count] = await Promise.all([
          bookService.getBookById(bookId),
          //reservationService.getReservationCountByBook(bookId),
        ]);

        if (!isMounted) {
          return;
        }

        setSelectedBook(book);
        //setReservationCount(count);
      } catch {
        if (isMounted) {
          addToast("Không thể tải thông tin sách.", "error");
        }
      } finally {
        if (isMounted) {
          setIsLoadingBooks(false);
        }
      }
    };

    fetchBook();

    return () => {
      isMounted = false;
    };
  }, [bookId, addToast]);

  const performBorrowAction = async () => {
    if (!selectedBook) {
      addToast("Vui lòng tải thông tin sách trước.", "error");
      return;
    }

    try {
      setIsSubmitting(true);

      if (selectedBook.availableCopies > 0) {
        // Borrow the book
        await borrowingService.createBorrowing({
          bookId: selectedBook._id,
          libraryId: selectedBook.libraryId._id,
        });
        addToast("Tạo yêu cầu mượn sách thành công!", "success");
      } else {
        // Reserve the book
        await reservationService.createReservation({
          bookId: selectedBook._id,
          libraryId: selectedBook.libraryId._id,
        });
        addToast("Đặt sách trước thành công! Bạn sẽ được thông báo khi sách sẵn sàng.", "success");
        setReservationCount(reservationCount + 1);
      }

      // Reload page after 1.5 seconds to show changes
      setTimeout(() => {
        router.refresh();
        window.location.reload();
      }, 1500);
    } catch (error) {
      const apiError = error as AxiosError<{ error?: { code?: string; message?: string; details?: Array<{ field: string; message: string }> } }>;
      const backendMessage = apiError.response?.data?.error?.message;
      const errorCode = apiError.response?.data?.error?.code;
      const details = apiError.response?.data?.error?.details;

      let errorMessage = selectedBook.availableCopies > 0
        ? "Không thể tạo yêu cầu mượn sách. Vui lòng thử lại."
        : "Không thể đặt sách trước. Vui lòng thử lại.";

      if (errorCode === "ALREADY_RESERVED") {
        errorMessage = "Bạn đã đặt trước cuốn sách này rồi.";
      } else if (errorCode === "ALREADY_BORROWED") {
        errorMessage = "Bạn đã mượn cuốn sách này hoặc đang chờ lấy sách.";
      } else if (errorCode === "BORROW_LIMIT_REACHED") {
        errorMessage = backendMessage || "Bạn đã đạt giới hạn số sách mượn. Vui lòng trả lại một số sách trước khi thực hiện thao tác này.";
      } else if (Array.isArray(details) && details.length > 0) {
        errorMessage = details.map((item) => item.message).join(", ");
      } else if (backendMessage) {
        errorMessage = backendMessage;
      }

      addToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBorrowSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await performBorrowAction();
  };

  const handleBorrowClick = async () => {
    await performBorrowAction();
  };

  if (isLoadingBooks) {
    return (
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark">
        <div className="flex-1 flex flex-col items-center py-8">
          <div className="max-w-[1200px] w-full px-6">
            <div className="animate-pulse">
              <div className="h-8 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedBook) {
    return (
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark">
        <main className="flex-1 flex flex-col items-center py-8">
          <div className="max-w-[1200px] w-full px-6">
            <div className="bg-white dark:bg-[#1a2130] p-8 rounded-xl text-center text-gray-600 dark:text-gray-400">
              Không tìm thấy thông tin sách.
            </div>
          </div>
        </main>
      </div>
    );
  }

  const renderStarRating = () => {
    return (
      <div className="flex items-center gap-1 text-yellow-500">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="size-4 fill-yellow-500" />
        ))}
        <span className="text-gray-500 dark:text-gray-400 text-sm font-bold ml-1">4.5 (1.2k)</span>
      </div>
    );
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      {/* Header */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1a2130] px-10 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-4 text-[#2b6cee]">
            <div className="size-6">
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 4C25.7818 14.2173 33.7827 22.2182 44 24C33.7827 25.7818 25.7818 33.7827 24 44C22.2182 33.7827 14.2173 25.7818 4 24C14.2173 22.2182 22.2182 14.2173 24 4Z" fill="currentColor"></path>
              </svg>
            </div>
            <h2 className="text-[#111318] dark:text-white text-xl font-extrabold">Mosa</h2>
          </div>
          <label className="flex flex-col min-w-40 !h-10 max-w-64">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
              <div className="text-[#616f89] flex border-none bg-gray-100 dark:bg-gray-800 items-center justify-center pl-4 rounded-l-lg">
                <Search className="size-5" />
              </div>
              <input 
                className="form-input flex w-full min-w-0 flex-1 border-none bg-gray-100 dark:bg-gray-800 text-[#111318] dark:text-white focus:ring-0 h-full placeholder:text-[#616f89] px-4 rounded-r-lg text-sm" 
                placeholder="Tim sach, tac gia, ISBN..." 
              />
            </div>
          </label>
        </div>
        <div className="flex flex-1 justify-end gap-8 items-center">
          <nav className="flex items-center gap-9">
            <a className="text-[#111318] dark:text-gray-300 text-sm font-semibold hover:text-[#2b6cee] transition-colors" href="/dashboard/books">Catalog</a>
            <a className="text-[#111318] dark:text-gray-300 text-sm font-semibold hover:text-[#2b6cee] transition-colors" href="/dashboard">My Books</a>
            <a className="text-[#111318] dark:text-gray-300 text-sm font-semibold hover:text-[#2b6cee] transition-colors" href="#">Libraries</a>
            <a className="text-[#111318] dark:text-gray-300 text-sm font-semibold hover:text-[#2b6cee] transition-colors" href="#">Help</a>
          </nav>
          <div className="flex items-center gap-4">
            <button className="flex size-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 text-[#111318] dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              <Bell className="size-5" />
            </button>
            <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-[#2b6cee]">
              <Image
                loader={passthroughImageLoader}
                unoptimized
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPkFjVbJCzRyTwUIhTk65PYkkNh1jMTMeS8PLuafb6xVYHQcV0WelmCLHoPMovW6f1hyYEzzT1lGXfb7QCzftjfDsJfwt7IsIkjWrJazgrEtZzQWdNm3NsMLuxYU87wTWYFoyZC_YmYMn-80Wm3MLRJYUxbG3ds58fQd2Dpfy0vT4vsbTIVDs1rEEsManujA_v9WSBFL-_ojtB_XWP1UjIc0VVZJKbrIcLoumhP0G-jN1xMbcJ907ZSEw_bW254XvKMhSi4Xac1Z3F"
                alt="User avatar"
                width={40}
                height={40}
                className="rounded-full w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center py-8">
        <div className="max-w-[1200px] w-full px-6 flex flex-col gap-6">
          {/* Breadcrumbs */}
          <nav className="flex flex-wrap gap-2 items-center text-sm">
            <a className="text-[#616f89] font-medium hover:text-[#2b6cee] transition-colors" href="/dashboard">Home</a>
            <ChevronRight className="text-[#616f89] size-4" />
            <a className="text-[#616f89] font-medium hover:text-[#2b6cee] transition-colors" href="/dashboard/books">Catalog</a>
            <ChevronRight className="text-[#616f89] size-4" />
            <span className="text-[#111318] dark:text-white font-bold">{selectedBook.title}</span>
          </nav>

          {/* Book Details Hero */}
          <section className="grid grid-cols-1 md:grid-cols-12 gap-10 bg-white dark:bg-[#1a2130] p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
            {/* Left: Book Cover */}
            <div className="md:col-span-4 flex flex-col gap-4">
              <div className="w-full aspect-[2/3] rounded-lg shadow-2xl overflow-hidden bg-gray-200">
                <Image
                  loader={passthroughImageLoader}
                  unoptimized
                  src={selectedBook.coverImage || FALLBACK_COVER_IMAGE}
                  alt={selectedBook.title}
                  width={400}
                  height={600}
                  className="w-full h-full bg-center bg-no-repeat bg-cover object-cover"
                  onError={(event) => {
                    (event.target as HTMLImageElement).src = FALLBACK_COVER_IMAGE;
                  }}
                />
              </div>
              <div className="flex items-center justify-center gap-2 text-[#2b6cee] font-bold py-2 bg-[#2b6cee]/10 rounded-lg cursor-pointer hover:bg-[#2b6cee]/20 transition-colors">
                <BookOpen className="size-5" />
                <span>View Preview</span>
              </div>
            </div>

            {/* Right: Info Panel */}
            <div className="md:col-span-8 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-[#111318] dark:text-white text-4xl font-extrabold leading-tight tracking-tight mb-2">{selectedBook.title}</h1>
                  <p className="text-xl text-[#2b6cee] font-semibold mb-4">{selectedBook.author}</p>
                </div>
                <div className="flex flex-col items-end">
                  {renderStarRating()}
                  <span className="text-xs uppercase tracking-widest text-gray-400 mt-1 font-bold">{selectedBook.category}</span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-2 text-[#111318] dark:text-white">Description</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  {selectedBook.description || "No description available"}
                </p>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8 p-4 bg-background-light dark:bg-background-dark rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 font-bold uppercase">ISBN-13</span>
                  <span className="text-sm font-semibold text-[#111318] dark:text-white">{selectedBook.isbn || "N/A"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 font-bold uppercase">Pages</span>
                  <span className="text-sm font-semibold text-[#111318] dark:text-white">{selectedBook.pageCount || "N/A"}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 font-bold uppercase">Language</span>
                  <span className="text-sm font-semibold text-[#111318] dark:text-white">{selectedBook.language === "vi" ? "Vietnamese" : selectedBook.language}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500 font-bold uppercase">Publisher</span>
                  <span className="text-sm font-semibold text-[#111318] dark:text-white">{selectedBook.publisher || "N/A"}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4 mt-8">
                <form onSubmit={handleBorrowSubmit} className="flex-1">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-[#2b6cee] hover:bg-[#2b6cee]/90 disabled:opacity-50 disabled:cursor-not-allowed text-white h-14 rounded-xl flex items-center justify-center gap-2 font-bold text-lg transition-all shadow-lg shadow-[#2b6cee]/20"
                  >
                    <Bookmark className="size-5" />
                    {isSubmitting ? "Processing..." : selectedBook.availableCopies > 0 ? "Borrow Now" : "Notify Me"}
                  </button>
                </form>
                <button className="w-14 h-14 flex items-center justify-center border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 hover:text-red-500 hover:border-red-500 transition-all">
                  <Heart className="size-6" />
                </button>
                <button className="w-14 h-14 flex items-center justify-center border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 hover:text-[#2b6cee] hover:border-[#2b6cee] transition-all">
                  <Share2 className="size-6" />
                </button>
              </div>
            </div>
          </section>

          {/* Availability Section */}
          <section className="bg-white dark:bg-[#1a2130] p-8 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 mb-10">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2 text-[#111318] dark:text-white">
                <MapPin className="text-[#2b6cee] size-6" />
                Branch Availability
              </h2>
              <span className="text-sm text-[#2b6cee] font-bold cursor-pointer hover:underline">View Map View</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <th className="py-4 text-xs uppercase text-gray-500 font-bold">Library Branch</th>
                    <th className="py-4 text-xs uppercase text-gray-500 font-bold">Status</th>
                    <th className="py-4 text-xs uppercase text-gray-500 font-bold">Shelf Location</th>
                    <th className="py-4 text-xs uppercase text-gray-500 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-4">
                      <div className="font-bold text-[#111318] dark:text-white">{selectedBook.libraryId?.name || "Central Library"}</div>
                      <div className="text-xs text-gray-500">{selectedBook.libraryId?.address || "Downtown District"}</div>
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        selectedBook.availableCopies > 0 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400'
                      }`}>
                        <span className={`size-1.5 rounded-full ${selectedBook.availableCopies > 0 ? 'bg-green-600' : 'bg-gray-600'}`}></span>
                        {selectedBook.availableCopies > 0 
                          ? `Available (${selectedBook.availableCopies} copies)`
                          : 'Checked Out'}
                      </span>
                    </td>
                    <td className="py-4 font-medium text-gray-600 dark:text-gray-400">{selectedBook.location}, {selectedBook.category}</td>
                    <td className="py-4 text-right">
                      <button 
                        onClick={handleBorrowClick}
                        disabled={isSubmitting}
                        className={`text-sm font-bold px-4 py-2 rounded-lg transition-colors ${
                          selectedBook.availableCopies > 0
                            ? 'text-[#2b6cee] hover:bg-[#2b6cee]/10 disabled:opacity-50'
                            : 'text-[#2b6cee] hover:bg-[#2b6cee]/10'
                        }`}
                      >
                        {selectedBook.availableCopies > 0 ? 'Place Hold' : 'Notify Me'}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-[#1a2130] py-10 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <div className="size-4">
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 4C25.7818 14.2173 33.7827 22.2182 44 24C33.7827 25.7818 25.7818 33.7827 24 44C22.2182 33.7827 14.2173 25.7818 4 24C14.2173 22.2182 22.2182 14.2173 24 4Z" fill="currentColor"></path>
              </svg>
            </div>
            <span className="text-sm font-bold text-[#111318] dark:text-white">Mosa Library Systems</span>
          </div>
          <div className="flex gap-8 text-sm font-medium text-gray-500">
            <a className="hover:text-[#2b6cee] transition-colors" href="#">Terms of Service</a>
            <a className="hover:text-[#2b6cee] transition-colors" href="#">Privacy Policy</a>
            <a className="hover:text-[#2b6cee] transition-colors" href="#">Cookie Policy</a>
          </div>
          <div className="text-sm text-gray-400">
            © 2024 Mosa Inc.
          </div>
        </div>
      </footer>
    </div>
  );
}
