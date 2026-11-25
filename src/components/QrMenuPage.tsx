import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ArrowLeft, Download, Printer } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

export function QrMenuPage({ onBack }: { onBack: () => void }) {
  const { bootstrap } = useApp();
  const [pngUrl, setPngUrl] = useState<string>('');
  const [svgMarkup, setSvgMarkup] = useState<string>('');
  const [customBaseUrl, setCustomBaseUrl] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.origin : ''
  );

  const menuTargetUrl = `${customBaseUrl.replace(/\/$/, '')}/#menu`;

  useEffect(() => {
    let active = true;
    async function generate() {
      try {
        const dataUrl = await QRCode.toDataURL(menuTargetUrl, {
          width: 600,
          margin: 2,
          color: { dark: '#38251B', light: '#FFFFFF' },
        });
        const svg = await QRCode.toString(menuTargetUrl, {
          type: 'svg',
          margin: 2,
          color: { dark: '#38251B', light: '#FFFFFF' },
        });
        if (active) {
          setPngUrl(dataUrl);
          setSvgMarkup(svg);
        }
      } catch (err) {
        console.error('QR generation failed:', err);
      }
    }
    generate();
    return () => {
      active = false;
    };
  }, [menuTargetUrl]);

  const downloadPng = () => {
    if (!pngUrl) return;
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = 'signature-dine-menu-qr.png';
    a.click();
  };

  const downloadSvg = () => {
    if (!svgMarkup) return;
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'signature-dine-menu-qr.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  const settings = bootstrap?.settings;

  return (
    <div className="min-h-screen bg-[#FFF8ED] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Controls (hidden during print) */}
        <div className="no-print mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#38251B] hover:text-[#E87522] cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Signature Dine</span>
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={downloadPng}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#38251B]/20 bg-white hover:bg-[#FFF8ED] text-sm font-semibold text-[#38251B] cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#E87522]" />
              <span>Download PNG</span>
            </button>
            <button
              type="button"
              onClick={downloadSvg}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#38251B]/20 bg-white hover:bg-[#FFF8ED] text-sm font-semibold text-[#38251B] cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#E87522]" />
              <span>Download SVG</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E87522] hover:bg-[#D36312] text-white text-sm font-semibold cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 Poster</span>
            </button>
          </div>
        </div>

        {/* Deployed URL input for owner flexibility */}
        <div className="no-print mb-6 rounded-2xl border border-[#38251B]/12 bg-white p-4">
          <label className="block text-xs font-semibold text-[#38251B] mb-1">
            Menu Destination URL (defaults to live website URL)
          </label>
          <input
            type="url"
            value={customBaseUrl}
            onChange={(e) => setCustomBaseUrl(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-[#38251B]/15 bg-[#FFF8ED]/50 text-xs sm:text-sm font-mono text-[#38251B]"
          />
        </div>

        {/* Printable A4 Poster */}
        <div className="mx-auto max-w-[680px] rounded-3xl overflow-hidden border-2 border-[#E87522] bg-white shadow-xl">
          <div className="bg-gradient-to-r from-[#E87522] to-[#FFC247] px-8 py-8 text-center text-[#38251B]">
            <p className="text-xs font-bold uppercase tracking-widest text-[#38251B]/80 mb-1">
              Authentic Andhra Restaurant · Guntur
            </p>
            <h1 className="font-display font-bold text-4xl sm:text-5xl text-[#38251B]">
              {settings?.name || 'Signature Dine'}
            </h1>
            <p className="font-telugu text-2xl font-bold text-[#38251B] mt-1">
              {settings?.teluguName || 'సిగ్నేచర్ డైన్'}
            </p>
          </div>

          <div className="px-8 py-10 text-center bg-[#FFFDF9]">
            <p className="font-display font-bold text-2xl text-[#38251B] mb-2">
              Scan to View Our Menu
            </p>
            <p className="text-sm text-[#38251B]/75 max-w-md mx-auto mb-7">
              Point your phone camera at the QR code below to browse dishes, check today&apos;s
              specials, and place pickup pre-orders—no login required.
            </p>

            <div className="inline-block p-5 rounded-2xl bg-white border-2 border-[#FFC247] shadow-sm">
              {pngUrl ? (
                <img
                  src={pngUrl}
                  alt="QR code to open Signature Dine online menu"
                  className="w-60 h-60 mx-auto"
                />
              ) : (
                <div className="w-60 h-60 bg-[#FFF8ED] animate-pulse rounded-xl" />
              )}
            </div>

            <p className="mt-5 font-mono text-xs text-[#38251B]/65 break-all">{menuTargetUrl}</p>
          </div>

          <div className="bg-[#38251B] text-[#FFF8ED] px-8 py-5 text-center text-xs space-y-1">
            <p className="font-semibold text-[#FFC247]">
              {settings?.address ||
                '3rd Line, Brindavan Gardens, Guntur, Andhra Pradesh 522006, India'}
            </p>
            <p className="text-[#FFF8ED]/75">
              Plus Code: {settings?.plusCode || '8C79+MX, Guntur, Andhra Pradesh'} · Opens Daily
              at 12:00 PM
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
