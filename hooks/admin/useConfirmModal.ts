
import { useState, useCallback } from 'react';

interface ModalConfig {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'info' | 'success';
}

export const useConfirmModal = () => {
    const [config, setConfig] = useState<ModalConfig | null>(null);

    const show = useCallback((title: string, message: string, onConfirm: () => void, type: 'danger' | 'info' | 'success' = 'info') => {
        setConfig({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                onConfirm();
                setConfig(null);
            },
            type
        });
    }, []);

    const close = useCallback(() => setConfig(null), []);

    // Helpers sémantiques pour alléger le code client
    const danger = useCallback((title: string, message: string, onConfirm: () => void) => 
        show(title, message, onConfirm, 'danger'), [show]);

    const success = useCallback((title: string, message: string, onConfirm: () => void) => 
        show(title, message, onConfirm, 'success'), [show]);

    const info = useCallback((title: string, message: string, onConfirm: () => void) => 
        show(title, message, onConfirm, 'info'), [show]);

    return {
        config,
        close,
        danger,
        success,
        info
    };
};
