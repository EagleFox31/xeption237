
import { useState } from 'react';
import { generateMarketingVideo } from '../../services/geminiService';

export const useMarketingStudio = () => {
    const [videoPrompt, setVideoPrompt] = useState("Cinematic product shot of the Dell XPS 14 9440 floating in a dark void. Elegant gold neon lighting highlights the aluminum edges and the keyboard. Background features subtle futuristic HUD elements and floating golden particles. High contrast, 4k resolution, sleek, premium tech advertisement style, slow camera pan, dark atmosphere.");
    const [generatingVideo, setGeneratingVideo] = useState(false);
    const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

    const generateVideo = async () => {
        if (!videoPrompt) return;
        setGeneratingVideo(true);
        try {
            const url = await generateMarketingVideo(videoPrompt);
            if (url) setGeneratedVideoUrl(url);
        } catch (error) {
            console.error("Video Gen Error", error);
            throw error;
        } finally {
            setGeneratingVideo(false);
        }
    };

    return {
        videoPrompt, setVideoPrompt,
        generatingVideo,
        generatedVideoUrl,
        generateVideo
    };
};
