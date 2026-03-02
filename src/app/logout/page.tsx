'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function LogoutPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const performLogout = async () => {
            try {
                const response = await fetch('/api/auth/signout', {
                    method: 'POST',
                });

                if (response.ok) {
                    router.push('/login');
                    router.refresh(); // Force a refresh to clear client-side cache
                } else {
                    setError('Error al cerrar sesión. Inténtalo de nuevo.');
                }
            } catch (err) {
                console.error('Logout error:', err);
                setError('Ocurrió un error inesperado al intentar cerrar sesión.');
            }
        };

        performLogout();
    }, [router]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-50">
            <div className="flex flex-col items-center space-y-4">
                {error ? (
                    <div className="text-center space-y-4">
                        <p className="text-red-600 font-medium">{error}</p>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                        >
                            Volver al Inicio
                        </button>
                    </div>
                ) : (
                    <>
                        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                        <h2 className="text-xl font-semibold text-gray-700">Cerrando sesión...</h2>
                        <p className="text-gray-500 text-sm">Por favor, espera un momento.</p>
                    </>
                )}
            </div>
        </div>
    );
}
