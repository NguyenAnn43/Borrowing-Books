'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { reservationService } from '@/services/reservationService';
import type { IReservation } from '@/services/reservationService';
import { AlertCircle, Calendar, Clock, CheckCircle, XCircle, Ban, ArrowLeft } from 'lucide-react';
import type { AxiosError } from 'axios';

export default function ReservationListPage() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
    const [reservations, setReservations] = useState<IReservation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cancelling, setCancelling] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

    const fetchReservations = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const result = user?.role === 'user' 
                ? await reservationService.getMyReservations() 
                : await reservationService.getReservations();

            setReservations(result.reservations);
        } catch (err) {
            const error = err as AxiosError<{ error?: { message?: string } }> | unknown;
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as AxiosError<{ error?: { message?: string } }>;
                setError(
                    axiosError.response?.data?.error?.message || 'Failed to load reservations'
                );
            } else {
                setError('Failed to load reservations');
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

        // Allow only user, librarian, and admin
        if (user.role === 'guest') {
            router.push('/dashboard');
            return;
        }

        fetchReservations();
    }, [isAuthenticated, user, authLoading, router, fetchReservations]);

    const handleCancelReservation = async (reservationId: string, reservation: IReservation) => {
        if (reservation.status === 'completed' || reservation.status === 'cancelled') {
            setError(`Cannot cancel a ${reservation.status} reservation`);
            return;
        }

        const confirmed = window.confirm(
            `Are you sure you want to cancel the reservation for "${reservation.bookId.title}"?\n\nThis action cannot be undone.`
        );

        if (!confirmed) {
            return;
        }

        try {
            setCancelling(reservationId);
            setError(null);

            await reservationService.cancelReservation(reservationId);

            // Refresh the list
            await fetchReservations();
        } catch (err) {
            const error = err as AxiosError<{ error?: { message?: string } }> | unknown;
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as AxiosError<{ error?: { message?: string } }>;
                setError(
                    axiosError.response?.data?.error?.message || 'Failed to cancel reservation'
                );
            } else {
                setError('Failed to cancel reservation');
            }
        } finally {
            setCancelling(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'ready':
                return 'bg-green-100 text-green-800';
            case 'completed':
                return 'bg-blue-100 text-blue-800';
            case 'cancelled':
                return 'bg-gray-100 text-gray-800';
            case 'expired':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return <Clock className="w-4 h-4 inline mr-1" />;
            case 'ready':
                return <CheckCircle className="w-4 h-4 inline mr-1" />;
            case 'completed':
                return <CheckCircle className="w-4 h-4 inline mr-1" />;
            case 'cancelled':
                return <Ban className="w-4 h-4 inline mr-1" />;
            case 'expired':
                return <XCircle className="w-4 h-4 inline mr-1" />;
            default:
                return null;
        }
    };

    const getFilteredReservations = () => {
        return reservations.filter((reservation) => {
            if (selectedStatus && reservation.status !== selectedStatus) {
                return false;
            }
            return true;
        });
    };

    const statuses = [
        { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
        { value: 'ready', label: 'Ready', color: 'bg-green-100 text-green-800' },
        { value: 'completed', label: 'Completed', color: 'bg-blue-100 text-blue-800' },
        { value: 'cancelled', label: 'Cancelled', color: 'bg-gray-100 text-gray-800' },
        { value: 'expired', label: 'Expired', color: 'bg-red-100 text-red-800' },
    ];

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen bg-white p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="animate-pulse">
                        <div className="h-8 w-1/3 bg-gray-300 rounded mb-4" />
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-16 bg-gray-300 rounded" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const filteredReservations = getFilteredReservations();

    return (
        <div className="min-h-screen bg-white p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.back()}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                            <ArrowLeft className="w-6 h-6 text-gray-700" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                My Reservations
                            </h1>
                            <p className="text-gray-600 text-sm mt-1">
                                Total: {filteredReservations.length} reservation(s)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-red-800 text-sm font-medium">{error}</p>
                        </div>
                    </div>
                )}

                {/* Status Filter */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6 shadow-sm border border-gray-200">
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSelectedStatus(null)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                selectedStatus === null
                                    ? 'bg-[#2b6cee] text-white'
                                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                            }`}
                        >
                            All ({reservations.length})
                        </button>
                        {statuses.map(status => (
                            <button
                                key={status.value}
                                onClick={() => setSelectedStatus(status.value)}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                    selectedStatus === status.value
                                        ? 'bg-[#2b6cee] text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                                }`}
                            >
                                {status.label} ({reservations.filter(r => r.status === status.value).length})
                            </button>
                        ))}
                    </div>
                </div>

                {/* Reservations List */}
                {filteredReservations.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-12 text-center border border-gray-200">
                        <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 text-lg">No reservations found</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredReservations.map(reservation => (
                            <div
                                key={reservation._id}
                                className="bg-white rounded-lg p-5 border border-gray-200 hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    {/* Book Info */}
                                    <div className="flex-1">
                                        <div className="flex items-start gap-4">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold text-gray-900 mb-1">
                                                    {reservation.bookId.title}
                                                </h3>
                                                <p className="text-gray-600 text-sm mb-3">
                                                    by {reservation.bookId.author}
                                                </p>

                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                    {/* Status */}
                                                    <div>
                                                        <p className="text-xs text-gray-600 uppercase font-bold mb-1">
                                                            Status
                                                        </p>
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(reservation.status)}`}>
                                                            {getStatusIcon(reservation.status)}
                                                            {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                                                        </span>
                                                    </div>

                                                    {/* Reservation Date */}
                                                    <div>
                                                        <p className="text-xs text-gray-600 uppercase font-bold mb-1">
                                                            Reserved
                                                        </p>
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {new Date(reservation.reservationDate).toLocaleDateString('vi-VN')}
                                                        </p>
                                                    </div>

                                                    {/* Ready Date */}
                                                    {reservation.readyDate && (
                                                        <div>
                                                            <p className="text-xs text-gray-600 uppercase font-bold mb-1">
                                                                Ready Date
                                                            </p>
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {new Date(reservation.readyDate).toLocaleDateString('vi-VN')}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {/* Expiry Date */}
                                                    {reservation.expiryDate && (
                                                        <div>
                                                            <p className="text-xs text-gray-600 uppercase font-bold mb-1">
                                                                Expiry Date
                                                            </p>
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {new Date(reservation.expiryDate).toLocaleDateString('vi-VN')}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        {(reservation.status === 'pending' || reservation.status === 'ready') && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCancelReservation(reservation._id, reservation);
                                                }}
                                                disabled={cancelling === reservation._id}
                                                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
                                            >
                                                {cancelling === reservation._id ? 'Cancelling...' : 'Cancel'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
