
import { useState, useCallback, useRef } from 'react';

type ModalType = 'danger' | 'info' | 'success';

interface ModalConfig {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
    type: ModalType;
    confirmLabel?: string;
    mode: 'action' | 'ask' | 'alert';
}

interface AskOptions {
    type?: ModalType;
    confirmLabel?: string;
}

export const useConfirmModal = () => {
    const [config, setConfig] = useState<ModalConfig | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const askResolveRef = useRef<((value: boolean) => void) | null>(null);

    const finishAsk = useCallback((value: boolean) => {
        askResolveRef.current?.(value);
        askResolveRef.current = null;
        setConfig(null);
    }, []);

    const show = useCallback(
        (title: string, message: string, onConfirm: () => void | Promise<void>, type: ModalType = 'info') => {
            setConfig({
                isOpen: true,
                title,
                message,
                onConfirm,
                type,
                mode: 'action',
            });
        },
        []
    );

    const ask = useCallback(
        (title: string, message: string, options?: AskOptions): Promise<boolean> => {
            return new Promise((resolve) => {
                askResolveRef.current = resolve;
                setConfig({
                    isOpen: true,
                    title,
                    message,
                    onConfirm: async () => {},
                    type: options?.type ?? 'info',
                    confirmLabel: options?.confirmLabel,
                    mode: 'ask',
                });
            });
        },
        []
    );

    const close = useCallback(() => {
        if (isConfirming) return;
        if (config?.mode === 'ask') {
            finishAsk(false);
            return;
        }
        setConfig(null);
    }, [config, isConfirming, finishAsk]);

    const handleConfirm = useCallback(async () => {
        if (!config) return;

        if (config.mode === 'ask') {
            finishAsk(true);
            return;
        }

        if (config.mode === 'alert') {
            setConfig(null);
            return;
        }

        setIsConfirming(true);
        try {
            await config.onConfirm();
            setConfig(null);
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Action impossible pour le moment.';
            setConfig({
                isOpen: true,
                title: 'Erreur',
                message,
                onConfirm: async () => {},
                type: 'danger',
                confirmLabel: 'OK',
                mode: 'alert',
            });
        } finally {
            setIsConfirming(false);
        }
    }, [config, finishAsk]);

    const alertModal = useCallback(
        (title: string, message: string, type: ModalType = 'info') => {
            setConfig({
                isOpen: true,
                title,
                message,
                onConfirm: async () => {},
                type,
                confirmLabel: 'OK',
                mode: 'alert',
            });
        },
        [],
    );

    const danger = useCallback(
        (title: string, message: string, onConfirm: () => void | Promise<void>) =>
            show(title, message, onConfirm, 'danger'),
        [show]
    );

    const success = useCallback(
        (title: string, message: string, onConfirm: () => void | Promise<void>) =>
            show(title, message, onConfirm, 'success'),
        [show]
    );

    const info = useCallback(
        (title: string, message: string, onConfirm: () => void | Promise<void>) =>
            show(title, message, onConfirm, 'info'),
        [show]
    );

    return {
        config,
        isConfirming,
        close,
        handleConfirm,
        danger,
        success,
        info,
        alert: alertModal,
        ask,
    };
};
