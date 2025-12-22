import React from 'react';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];

export default function ZoomSlider({
    scale,
    onScaleChange,
    className = ''
}) {
    const percentValue = Math.round(scale * 100);

    const handleSliderChange = (e) => {
        const value = parseFloat(e.target.value);
        // Snap to nearest level if close
        for (const level of ZOOM_LEVELS) {
            if (Math.abs(value - level) < 0.05) {
                onScaleChange(level);
                return;
            }
        }
        onScaleChange(value);
    };

    const handleZoomIn = () => {
        const nextLevel = ZOOM_LEVELS.find(l => l > scale) || 3;
        onScaleChange(nextLevel);
    };

    const handleZoomOut = () => {
        const prevLevel = [...ZOOM_LEVELS].reverse().find(l => l < scale) || 0.25;
        onScaleChange(prevLevel);
    };

    const handleFitWidth = () => {
        onScaleChange(1);
    };

    return (
        <div className={cn(
            "flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 px-3 py-1.5",
            className
        )}>
            <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={scale <= 0.25}
                className="h-7 w-7 p-0"
                title="Zoom Out"
            >
                <ZoomOut className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2 min-w-[180px]">
                <input
                    type="range"
                    min="0.25"
                    max="3"
                    step="0.05"
                    value={scale}
                    onChange={handleSliderChange}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full appearance-none cursor-pointer accent-teal-600
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:bg-teal-600
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110"
                />
            </div>

            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 min-w-[40px] text-right">
                {percentValue}%
            </span>

            <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={scale >= 3}
                className="h-7 w-7 p-0"
                title="Zoom In"
            >
                <ZoomIn className="h-4 w-4" />
            </Button>

            <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1" />

            <Button
                variant="ghost"
                size="sm"
                onClick={handleFitWidth}
                className="h-7 w-7 p-0"
                title="Fit to Width (100%)"
            >
                <Maximize className="h-4 w-4" />
            </Button>
        </div>
    );
}
