"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface TelegramLinkProps {
    userId: string;
    token: string;
}

export function TelegramLinkStep({ userId, token }: TelegramLinkProps) {
    const [isMobile, setIsMobile] = useState(false);
    const [status, setStatus] = useState<"pending" | "success" | "error">("pending");
    const router = useRouter();
    const supabase = createClient();

    const telegramBotUsername = "ManmecOperacionesBot"; // Nombre real del Bot configurado en BotFather
    const deepLink = `tg://resolve?domain=${telegramBotUsername}&start=${token}`;
    const webLink = `https://t.me/${telegramBotUsername}?start=${token}`;

    useEffect(() => {
        // Detect mobile
        setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

        // Polling for status
        const interval = setInterval(async () => {
            const { data } = await supabase
                .from("manmec_users")
                .select("telegram_chat_id")
                .eq("id", userId)
                .single();

            if (data?.telegram_chat_id) {
                setStatus("success");
                clearInterval(interval);
                setTimeout(() => {
                    router.push("/dashboard");
                    router.refresh();
                }, 2000);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [userId, router, supabase]);

    return (
        <div className="flex flex-col items-center justify-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">Conecta tu Asistente IA</h3>
                <p className="text-slate-400 text-sm">
                    Para usar Manmec en terreno, vincula tu cuenta con Telegram.
                </p>
            </div>

            {status === "success" ? (
                <div className="flex flex-col items-center justify-center p-8 bg-green-500/10 border border-green-500/20 rounded-2xl w-full">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <p className="text-green-400 font-bold text-lg">¡Emparejamiento Exitoso!</p>
                    <p className="text-green-500/70 text-sm mt-1">Redirigiendo al panel...</p>
                </div>
            ) : (
                <div className="w-full flex flex-col items-center space-y-6">
                    {isMobile ? (
                        <a
                            href={deepLink}
                            className="w-full flex items-center justify-center gap-3 bg-[#2AABEE] hover:bg-[#229ED9] text-white font-bold rounded-xl px-6 py-4 transition-all hover:scale-[1.02] shadow-lg shadow-[#2AABEE]/20"
                        >
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.892-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                            </svg>
                            Abrir App de Telegram
                        </a>
                    ) : (
                        <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center">
                            <QRCode
                                value={webLink}
                                size={200}
                                level="H"
                                className="mb-4"
                            />
                            <p className="text-slate-800 font-medium text-sm">Escanea con la cámara de tu celular</p>
                        </div>
                    )}

                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Esperando conexión...
                    </div>
                </div>
            )}
        </div>
    );
}
