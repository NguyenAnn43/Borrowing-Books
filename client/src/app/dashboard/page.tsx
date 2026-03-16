"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";

/** /dashboard → redirect tới dashboard phù hợp với role */
export default function DashboardRedirect() {
    const router = useRouter();
    const { user } = useAuthStore();

    useEffect(() => {
        if (!user) return;
        if (user.role === "admin") router.replace("/dashboard/admin");
        else if (user.role === "librarian") router.replace("/dashboard/librarian");
        else if (user.role === "guest") router.replace("/dashboard/guest");
        else router.replace("/dashboard/user");
    }, [user, router]);

    return null;
}
