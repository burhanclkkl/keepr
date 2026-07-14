import React, { useState, useRef, useEffect } from 'react';
import { Plus, Link2, AlignLeft, Type } from 'lucide-react';

interface AddKeepBarProps {
  onAdd: (url: string, title?: string, description?: string) => void;
  isLoading: boolean;
  initialUrl?: string;
}

export const AddKeepBar: React.FC<AddKeepBarProps> = ({ onAdd, isLoading, initialUrl }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  // Pre-fill URL when initialUrl changes (e.g. from ClipboardDetect)
  useEffect(() => {
    if (initialUrl) {
      setUrl(initialUrl);
    }
  }, [initialUrl]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError('Bağlantı adresi boş olamaz.');
      return;
    }
    const hasDomain = trimmedUrl.includes('.') && trimmedUrl.length > 3;
    if (!hasDomain) {
      setError('Lütfen geçerli bir internet adresi girin (örn: github.com).');
      return;
    }

    onAdd(trimmedUrl, title.trim() || undefined, description.trim() || undefined);
    setUrl('');
    setTitle('');
    setDescription('');
    setExpanded(false);
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.preventDefault();
    setExpanded((v) => {
      const next = !v;
      if (next) setTimeout(() => titleRef.current?.focus(), 80);
      return next;
    });
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-0">

        {/* ── URL Row ── */}
        <div className="relative flex items-center w-full">
          <div className="absolute left-4 text-slate-400 pointer-events-none">
            <Link2 size={18} />
          </div>

          <input
            type="text"
            value={url}
            onChange={(e) => { setUrl(e.target.value); if (error) setError(''); }}
            placeholder="Herhangi bir bağlantı yapıştırın (makale, ürün, video)..."
            disabled={isLoading}
            className={`w-full pl-11 pr-32 py-3.5 bg-white dark:bg-[#121212] border ${
              error ? 'border-red-500/50' : 'border-gray-100 dark:border-[#1c1c1e]'
            } ${expanded ? 'rounded-t-apple-lg rounded-b-none border-b-0' : 'rounded-apple-lg'} text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-accent shadow-sm transition-all`}
          />

          <div className="absolute right-2.5 flex items-center gap-1">
            {/* Details toggle */}
            <button
              type="button"
              onClick={toggleExpand}
              title={expanded ? 'Detayları gizle' : 'Başlık & Açıklama ekle'}
              className={`p-2 rounded-apple-sm transition-colors cursor-pointer ${
                expanded
                  ? 'text-accent bg-accent/10'
                  : 'text-slate-400 hover:text-accent hover:bg-slate-50 dark:hover:bg-[#1c1c1e]'
              }`}
            >
              <AlignLeft size={14} />
            </button>

            {url.trim() && (
              <span className="hidden sm:inline text-[9px] font-semibold tracking-wider text-slate-400 bg-slate-50 dark:bg-[#1c1c1e] px-1.5 py-0.5 rounded border border-slate-200/10 uppercase select-none">
                ↵ Enter
              </span>
            )}

            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="flex items-center gap-1 bg-accent hover:bg-accent-hover disabled:bg-slate-100 dark:disabled:bg-[#1c1c1e] disabled:text-slate-400 text-white font-semibold text-xs px-3 py-2 rounded-apple-md transition-colors shadow-sm disabled:shadow-none cursor-pointer"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Plus size={14} />
                  <span>Ekle</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Title + Description Accordion ── */}
        <div
          className={`overflow-hidden transition-all duration-200 ${
            expanded ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="bg-white dark:bg-[#121212] border border-gray-100 dark:border-[#1c1c1e] border-t-0 rounded-b-apple-lg shadow-sm divide-y divide-gray-50 dark:divide-[#1c1c1e]">

            {/* Title field */}
            <div className="relative flex items-center">
              <div className="absolute left-4 text-slate-300 dark:text-slate-600 pointer-events-none">
                <Type size={13} />
              </div>
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Başlık (opsiyonel — otomatik çekilir)"
                className="w-full pl-10 pr-4 py-2.5 bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
              />
            </div>

            {/* Description field */}
            <div className="relative flex items-start">
              <div className="absolute left-4 top-3 text-slate-300 dark:text-slate-600 pointer-events-none">
                <AlignLeft size={13} />
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Açıklama (opsiyonel — otomatik çekilir)"
                rows={2}
                className="w-full pl-10 pr-4 py-2.5 bg-transparent text-xs text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none resize-none"
              />
            </div>
          </div>
        </div>
      </form>

      {/* Inline error */}
      {error && (
        <span className="text-[10px] text-red-500 font-semibold mt-1 ml-2 block animate-shake">
          {error}
        </span>
      )}
    </div>
  );
};
