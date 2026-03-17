'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import type { IBorrowing } from '@/types';
import { AlertCircle, Calendar, Clock, CheckCircle, XCircle, Ban, ArrowLeft } from 'lucide-react';
import type { AxiosError } from 'axios';

interface BorrowingsResponse {
    success: boolean;
    data: IBorrowing[];
    meta?: {
        total: number;
        page: number;
        limit: number;
        pages: number;
    };
}

export default function BorrowingHistoryPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
    const [borrowings, setBorrowings] = useState<IBorrowing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState<string | null>(null);
    const [confirming, setConfirming] = useState<string | null>(null);
    const [returning, setReturning] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [showDueToday, setShowDueToday] = useState(false);

    const fetchBorrowings = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const endpoint = user?.role === 'user' ? '/borrowings/my' : '/borrowings';
            const response = await api.get<BorrowingsResponse>(endpoint);

            if (response.data.success) {
                setBorrowings(response.data.data);
            }
        } catch (err) {
            const error = err as AxiosError<{ error?: { message?: string } }> | unknown;
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as AxiosError<{ error?: { message?: string } }>;
                setError(
                    axiosError.response?.data?.error?.message || 'Failed to load borrowing history'
                );
            } else {
                setError('Failed to load borrowing history');
            }
        } finally {
            setIsLoading(false);
        }
    }, [user?.role]);

    useEffect(() => {
        if (authLoading) return;

        if (!isAuthenticated || !user) {
            router.push('/login');
            return;
        }

        // Chặn admin vào trang này
        if (user.role !== "librarian" && user.role !== "user") {
            router.push("/dashboard");
            return;
        }

        fetchBorrowings();
    }, [isAuthenticated, user, authLoading, router, fetchBorrowings]);



    const handleCancelBorrowing = async (borrowingId: string, borrowing: IBorrowing) => {
        // Chỉ cho phép cancel nếu status là pending
        if (borrowing.status !== 'pending') {
            setError('Chỉ có thể hủy đơn ở trạng thái "Pending"');
            return;
        }

        // Yêu cầu xác nhận
        const confirmed = window.confirm(
            `Bạn có chắc chắn muốn hủy đơn mượn sách "${borrowing.bookId.title}" không?\n\nThao tác này không thể hoàn tác.`
        );

        if (!confirmed) {
            return;
        }

        try {
            setCancelling(borrowingId);
            setError(null);

            await api.put(`/borrowings/${borrowingId}/cancel`);

            // Refresh the list
            await fetchBorrowings();
        } catch (err) {
            const error = err as AxiosError<{ error?: { message?: string } }> | unknown;
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as AxiosError<{ error?: { message?: string } }>;
                setError(
                    axiosError.response?.data?.error?.message || 'Failed to cancel borrowing'
                );
            } else {
                setError('Failed to cancel borrowing');
            }
        } finally {
            setCancelling(null);
        }
    };

    const handleConfirmPickup = async (borrowingId: string) => {
        try {
            setConfirming(borrowingId);
            setError(null);

            await api.put(`/borrowings/${borrowingId}/confirm`);

            // Refresh the list
            await fetchBorrowings();
        } catch (err) {
            const error = err as AxiosError<{ error?: { message?: string } }> | unknown;
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as AxiosError<{ error?: { message?: string } }>;
                setError(
                    axiosError.response?.data?.error?.message || 'Failed to confirm pickup'
                );
            } else {
                setError('Failed to confirm pickup');
            }
        } finally {
            setConfirming(null);
        }
    };

    const handleReturnBook = async (borrowingId: string) => {
        try {
            setReturning(borrowingId);
            setError(null);

            await api.put(`/borrowings/${borrowingId}/return`);

            // Refresh the list
            await fetchBorrowings();
        } catch (err) {
            const error = err as AxiosError<{ error?: { message?: string } }> | unknown;
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as AxiosError<{ error?: { message?: string } }>;
                setError(
                    axiosError.response?.data?.error?.message || 'Failed to return book'
                );
            } else {
                setError('Failed to return book');
            }
        } finally {
            setReturning(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'borrowed':
                return 'bg-blue-100 text-blue-800';
            case 'returned':
                return 'bg-green-100 text-green-800';
            case 'overdue':
                return 'bg-red-100 text-red-800';
            case 'cancelled':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return <Clock className="w-4 h-4 inline mr-1" />;
            case 'borrowed':
                return <AlertCircle className="w-4 h-4 inline mr-1" />;
            case 'returned':
                return <CheckCircle className="w-4 h-4 inline mr-1" />;
            case 'overdue':
                return <XCircle className="w-4 h-4 inline mr-1" />;
            case 'cancelled':
                return <Ban className="w-4 h-4 inline mr-1" />;
            default:
                return null;
        }
    };

    const calculateDaysLeft = (dueDate: string) => {
        const today = new Date();
        const due = new Date(dueDate);
        const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return diff;
    };

    const calculateOverdueFine = (borrowing: IBorrowing) => {
        if (borrowing.status !== 'overdue') return 0;

        const today = new Date();
        const dueDate = new Date(borrowing.dueDate);
        const overdueDays = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const finePerDay = 5000; // 5000 VND per day

        return overdueDays * finePerDay;
    };

    const isDueToday = (dueDate: string) => {
        const today = new Date();
        const due = new Date(dueDate);
        return (
            today.getDate() === due.getDate() &&
            today.getMonth() === due.getMonth() &&
            today.getFullYear() === due.getFullYear()
        );
    };

    const getFilteredBorrowings = () => {
        return borrowings.filter((borrowing) => {
            // Filter by status
            if (selectedStatus && borrowing.status !== selectedStatus) {
                return false;
            }
            // Filter by due today
            if (showDueToday && !isDueToday(borrowing.dueDate)) {
                return false;
            }
            return true;
        });
    };

    const statuses = [
        { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
        { value: 'borrowed', label: 'Borrowed', color: 'bg-blue-100 text-blue-800' },
        { value: 'returned', label: 'Returned', color: 'bg-green-100 text-green-800' },
        { value: 'overdue', label: 'Overdue', color: 'bg-red-100 text-red-800' },
        { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
    ];

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading borrowing history...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    const isUserRole = user?.role === 'user';

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-gray-900">
                        {isUserRole ? 'My Borrowing History' : 'Borrowing Requests'}
                    </h1>
                    <button
                        onClick={() => router.push('/book/list')}
                        className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </button>
                </div>
            </header>
            <main className="max-w-6xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <p className="text-gray-600">
                        {isUserRole
                            ? 'Track and manage your book borrowings'
                            : 'Manage library borrowing requests'}
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                        <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                        <p className="text-red-800">{error}</p>
                    </div>
                )}

                {/* Filter Section */}
                {borrowings.length > 0 && (
                    <div className="mb-6 bg-white rounded-lg shadow p-4">
                        <div className="flex flex-col gap-4">
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-3">Filter by Status</h3>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setSelectedStatus(null)}
                                        className={`px-4 py-2 rounded-lg font-medium transition ${
                                            selectedStatus === null
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        All
                                    </button>
                                    {statuses.map((status) => (
                                        <button
                                            key={status.value}
                                            onClick={() => setSelectedStatus(status.value)}
                                            className={`px-4 py-2 rounded-lg font-medium transition ${
                                                selectedStatus === status.value
                                                    ? `${status.color} ring-2 ring-offset-2 ring-blue-600`
                                                    : `${status.color} hover:opacity-80`
                                            }`}
                                        >
                                            {status.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="border-t pt-4">
                                <button
                                    onClick={() => setShowDueToday(!showDueToday)}
                                    className={`px-4 py-2 rounded-lg font-medium transition ${
                                        showDueToday
                                            ? 'bg-red-600 text-white ring-2 ring-offset-2 ring-red-600'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    📅 Due Today ({borrowings.filter((b) => isDueToday(b.dueDate)).length})
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {borrowings.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            No borrowing records
                        </h3>
                        <p className="text-gray-600">
                            {isUserRole
                                ? "You haven't borrowed any books yet"
                                : 'No borrowing requests found'}
                        </p>
                    </div>
                ) : getFilteredBorrowings().length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            No matching records
                        </h3>
                        <p className="text-gray-600">
                            Try adjusting your filters.
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-100 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                                            Book
                                        </th>
                                        {!isUserRole && (
                                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                                                User
                                            </th>
                                        )}
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                                            Library
                                        </th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                                            Borrowed
                                        </th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                                            Due Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                                            Fine Amount
                                        </th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {getFilteredBorrowings().map((borrowing) => {
                                        const daysLeft = calculateDaysLeft(borrowing.dueDate);
                                        const overdueFine = calculateOverdueFine(borrowing);

                                        return (
                                            <tr key={borrowing._id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <p className="font-semibold text-gray-900">
                                                        {borrowing.bookId.title}
                                                    </p>
                                                </td>
                                                {!isUserRole && (
                                                    <td className="px-6 py-4">
                                                        <div>
                                                            <p className="font-semibold text-gray-900">
                                                                {borrowing.userId.fullName}
                                                            </p>
                                                            <p className="text-sm text-gray-600">
                                                                {borrowing.userId.email}
                                                            </p>
                                                        </div>
                                                    </td>
                                                )}
                                                <td className="px-6 py-4 text-sm text-gray-700">
                                                    {borrowing.libraryId.name}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-700">
                                                    {new Date(borrowing.borrowDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm">
                                                        <p className={`font-semibold ${
                                                            isDueToday(borrowing.dueDate)
                                                                ? 'text-red-600 font-bold'
                                                                : 'text-gray-900'
                                                        }`}>
                                                            {new Date(borrowing.dueDate).toLocaleDateString()}
                                                            {isDueToday(borrowing.dueDate) && ' 📅'}
                                                        </p>
                                                        {borrowing.status === 'borrowed' && daysLeft > 0 && (
                                                            <p className="text-gray-600">
                                                                {daysLeft} days left
                                                            </p>
                                                        )}
                                                        {borrowing.status === 'overdue' && (
                                                            <p className="text-red-600 font-semibold">
                                                                Overdue by {Math.abs(daysLeft)} days
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                                            borrowing.status
                                                        )}`}
                                                    >
                                                        {getStatusIcon(borrowing.status)}
                                                        {borrowing.status.charAt(0).toUpperCase() +
                                                            borrowing.status.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {borrowing.status === 'overdue' && overdueFine > 0 ? (
                                                        <p className="text-red-600 font-semibold">
                                                            {overdueFine.toLocaleString()} VND
                                                        </p>
                                                    ) : borrowing.isFined && borrowing.fineAmount > 0 ? (
                                                        <p className="text-red-600 font-semibold">
                                                            {borrowing.fineAmount.toLocaleString()} VND
                                                        </p>
                                                    ) : (
                                                        <p className="text-gray-500">-</p>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        {/* User Actions */}
                                                        {isUserRole && borrowing.status === 'pending' && (
                                                            <button
                                                                onClick={() => handleCancelBorrowing(borrowing._id, borrowing)}
                                                                disabled={cancelling === borrowing._id}
                                                                className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {cancelling === borrowing._id ? 'Cancelling...' : 'Cancel'}
                                                            </button>
                                                        )}

                                                        {/* Librarian/Admin Actions */}
                                                        {!isUserRole && borrowing.status === 'pending' && (
                                                            <button
                                                                onClick={() => handleConfirmPickup(borrowing._id)}
                                                                disabled={confirming === borrowing._id}
                                                                className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {confirming === borrowing._id ? 'Confirming...' : 'Confirm'}
                                                            </button>
                                                        )}

                                                        {!isUserRole &&
                                                            (borrowing.status === 'borrowed' || borrowing.status === 'overdue') && (
                                                                <button
                                                                    onClick={() => handleReturnBook(borrowing._id)}
                                                                    disabled={returning === borrowing._id}
                                                                    className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    {returning === borrowing._id ? 'Returning...' : 'Return'}
                                                                </button>
                                                            )}

                                                        {borrowing.status === 'returned' && (
                                                            <span className="text-gray-500 text-sm">-</span>
                                                        )}

                                                        {borrowing.status === 'cancelled' && (
                                                            <span className="text-gray-500 text-sm">-</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
