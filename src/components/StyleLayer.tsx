'use client';

export default function StyleLayer() {
    if (process.env.NEXT_PUBLIC_UI_LAYER !== 'enabled') return null;

    return (
        <style jsx global>{`
            @media print {
                body::before {
                    content: 'DEMO VERSION';
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) rotate(-45deg);
                    font-size: 72px;
                    font-weight: 900;
                    font-family: Arial, sans-serif;
                    color: rgba(20, 20, 20, 0.25);
                    white-space: nowrap;
                    pointer-events: none;
                    z-index: 9999;
                    letter-spacing: 8px;
                }
                body::after {
                    content: 'This is a demo version of this software. Buy this product to remove this watermark.';
                    position: fixed;
                    top: calc(50% + 80px);
                    left: 50%;
                    transform: translate(-50%, -50%) rotate(-45deg);
                    font-size: 18px;
                    font-weight: 700;
                    font-family: Arial, sans-serif;
                    color: rgba(20, 20, 20, 0.25);
                    white-space: nowrap;
                    pointer-events: none;
                    z-index: 9999;
                    letter-spacing: 2px;
                }
            }
        `}</style>
    );
}
