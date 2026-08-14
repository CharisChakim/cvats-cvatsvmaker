'use client';

import { useState, useRef, useEffect } from 'react';
import { FaLink, FaFileImage, FaFileAlt, FaHistory } from 'react-icons/fa';
import { CgSpinner } from 'react-icons/cg';
import { IoClose } from 'react-icons/io5';
import { getHistory, addToHistory } from '@/utils/jobHistory';

const TABS = [
    { id: 'text',       icon: FaFileAlt,   labelKey: 'pasteText' },
    { id: 'url',        icon: FaLink,      labelKey: 'enterUrl' },
    { id: 'screenshot', icon: FaFileImage, labelKey: 'uploadScreenshot' },
];

const HistorySection = ({ items, onSelect, activeKey, renderItem }) => {
    if (!items.length) return null;
    return (
        <div className="mt-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">
                <FaHistory className="text-[10px]" />
                Recent
            </p>
            <ul className="space-y-1">
                {items.map((item, i) => {
                    const active = item.key === activeKey;
                    return (
                        <li key={i}>
                            <button
                                onClick={() => onSelect(item)}
                                className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors duration-150 border ${
                                    active
                                        ? 'border-primary-400/40 bg-primary-50 text-primary-700 dark:bg-primary-400/10 dark:text-primary-300'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-primary-400/40 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-400'
                                }`}
                            >
                                {renderItem(item, active)}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

const JobInput = ({ t, onJobReady, initialUrl = '', initialFetchedText = '', onUrlFetched }) => {
    const [activeTab, setActiveTab] = useState(initialUrl ? 'url' : 'text');

    // Text tab
    const [text, setText] = useState('');
    const [textHistory, setTextHistory] = useState([]);
    const [activeTextKey, setActiveTextKey] = useState(null);

    // URL tab
    const [url, setUrl] = useState(initialUrl);
    const [fetchedText, setFetchedText] = useState(initialFetchedText);
    const [fetching, setFetching] = useState(false);
    const [fetchError, setFetchError] = useState('');
    const [urlHistory, setUrlHistory] = useState([]);
    const [activeUrlKey, setActiveUrlKey] = useState(initialUrl || null);

    // Screenshot tab
    const [screenshotFile, setScreenshotFile] = useState(null);
    const [screenshotPreview, setScreenshotPreview] = useState('');
    const [screenshotHistory, setScreenshotHistory] = useState([]);
    const [activeScreenshotKey, setActiveScreenshotKey] = useState(null);

    const fileRef = useRef(null);

    useEffect(() => {
        setTextHistory(getHistory('text'));
        setUrlHistory(getHistory('url'));
        setScreenshotHistory(getHistory('screenshot'));
    }, []);

    useEffect(() => {
        if (initialFetchedText) {
            onJobReady({ type: 'text', value: initialFetchedText });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Text tab ──────────────────────────────────────────────────────────────

    const handleTextChange = e => {
        const val = e.target.value;
        setText(val);
        setActiveTextKey(null);
        onJobReady({ type: 'text', value: val });
    };

    const handleTextBlur = () => {
        const trimmed = text.trim();
        if (trimmed.length < 100) return;
        const key = trimmed.slice(0, 60);
        addToHistory('text', { key, preview: trimmed.slice(0, 80), text: trimmed });
        setTextHistory(getHistory('text'));
    };

    const handleTextHistorySelect = item => {
        setText(item.text);
        setActiveTextKey(item.key);
        onJobReady({ type: 'text', value: item.text });
    };

    // ── URL tab ───────────────────────────────────────────────────────────────

    const handleFetchUrl = async (fetchUrl = url) => {
        if (!fetchUrl.trim()) return;
        setUrl(fetchUrl);
        setFetching(true);
        setFetchError('');
        setFetchedText('');
        try {
            const res = await fetch('/api/fetch-job', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: fetchUrl.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch');
            setFetchedText(data.text);
            setActiveUrlKey(fetchUrl.trim());
            onJobReady({ type: 'text', value: data.text });
            addToHistory('url', { key: fetchUrl.trim(), url: fetchUrl.trim(), text: data.text });
            setUrlHistory(getHistory('url'));
            onUrlFetched?.(fetchUrl.trim(), data.text);
        } catch (err) {
            setFetchError(err.message);
        } finally {
            setFetching(false);
        }
    };

    const handleUrlHistorySelect = item => {
        setUrl(item.url);
        setFetchedText(item.text);
        setFetchError('');
        setActiveUrlKey(item.key);
        onJobReady({ type: 'text', value: item.text });
        onUrlFetched?.(item.url, item.text);
    };

    // ── Screenshot tab ────────────────────────────────────────────────────────

    const handleScreenshotChange = e => {
        const file = e.target.files[0];
        if (!file) return;
        setScreenshotFile(file);
        const reader = new FileReader();
        reader.onload = ev => {
            const base64 = ev.target.result;
            setScreenshotPreview(base64);
            setActiveScreenshotKey(file.name);
            onJobReady({ type: 'image', value: base64 });
            // Only save to history if the base64 is under 600 KB
            if (base64.length < 600_000) {
                addToHistory('screenshot', { key: file.name, name: file.name, base64 });
                setScreenshotHistory(getHistory('screenshot'));
            }
        };
        reader.readAsDataURL(file);
    };

    const handleScreenshotHistorySelect = item => {
        setScreenshotFile(null);
        setScreenshotPreview(item.base64);
        setActiveScreenshotKey(item.key);
        onJobReady({ type: 'image', value: item.base64 });
    };

    const clearScreenshot = () => {
        setScreenshotFile(null);
        setScreenshotPreview('');
        setActiveScreenshotKey(null);
        onJobReady(null);
        if (fileRef.current) fileRef.current.value = '';
    };

    // ── Tab switch ────────────────────────────────────────────────────────────

    const handleTabChange = tab => {
        setActiveTab(tab);
        setFetchError('');

        // Re-emit whatever the target tab already holds. Blanking this out left the
        // content visible on screen while the Score button stayed disabled, and it
        // threw away a fetched URL result that would then need re-fetching.
        if (tab === 'text') {
            onJobReady(text.trim() ? { type: 'text', value: text } : null);
        } else if (tab === 'url') {
            onJobReady(fetchedText ? { type: 'text', value: fetchedText } : null);
        } else {
            onJobReady(screenshotPreview ? { type: 'image', value: screenshotPreview } : null);
        }
    };

    const hostOf = rawUrl => {
        try { return new URL(rawUrl).hostname.replace(/^www\./, ''); }
        catch { return rawUrl; }
    };

    return (
        <div>
            {/* Tab Bar */}
            <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-5">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-150 -mb-px ${
                                activeTab === tab.id
                                    ? 'border-primary-400 text-primary-400'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                        >
                            <Icon className="text-base" />
                            <span className="hidden sm:inline">{t(`scoring.${tab.labelKey}`)}</span>
                        </button>
                    );
                })}
            </div>

            {/* ── Text Tab ── */}
            {activeTab === 'text' && (
                <div>
                    <textarea
                        className="block w-full rounded-xl border border-black/10 bg-paper-raised p-3 text-sm text-gray-900 outline-none transition-all duration-300 ease-spring focus:border-primary-500 focus:ring-4 focus:ring-primary-400/25 dark:border-white/10 dark:bg-white/[0.06] dark:text-gray-100 min-h-48 resize-y transition-all duration-150"
                        placeholder={t('scoring.pasteTextPlaceholder')}
                        value={text}
                        onChange={handleTextChange}
                        onBlur={handleTextBlur}
                    />
                    <HistorySection
                        items={textHistory}
                        activeKey={activeTextKey}
                        onSelect={handleTextHistorySelect}
                        renderItem={(item) => (
                            <>
                                <FaFileAlt className="shrink-0 text-[10px] opacity-60" />
                                <span className="truncate">{item.preview}…</span>
                            </>
                        )}
                    />
                </div>
            )}

            {/* ── URL Tab ── */}
            {activeTab === 'url' && (
                <div>
                    <div className="flex gap-2">
                        <input
                            type="url"
                            value={url}
                            onChange={e => { setUrl(e.target.value); setActiveUrlKey(null); }}
                            onKeyDown={e => e.key === 'Enter' && handleFetchUrl()}
                            placeholder={t('scoring.urlPlaceholder')}
                            className="block flex-1 rounded-xl border border-black/10 bg-paper-raised p-2.5 text-sm text-gray-900 outline-none transition-all duration-300 ease-spring focus:border-primary-500 focus:ring-4 focus:ring-primary-400/25 dark:border-white/10 dark:bg-white/[0.06] dark:text-gray-100 transition-all duration-150"
                        />
                        <button
                            onClick={() => handleFetchUrl()}
                            disabled={fetching || !url.trim()}
                            className="btn-filled shrink-0 px-4 text-sm active:scale-95 transition-transform duration-100 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {fetching ? <CgSpinner className="animate-spin" /> : null}
                            <span>{fetching ? t('scoring.fetching') : t('scoring.fetchUrl')}</span>
                        </button>
                    </div>

                    {fetchError && (
                        <p className="mt-2 text-sm text-red-400 rounded-xl bg-red-400/10 px-3 py-2 border border-red-400/20">
                            {fetchError}
                        </p>
                    )}

                    {fetchedText && (
                        <div className="mt-2 rounded-xl border border-green-500/30 bg-green-500/5 p-3">
                            <p className="text-xs font-medium text-green-400 mb-1">✓ Job posting fetched successfully</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3">{fetchedText.slice(0, 300)}…</p>
                        </div>
                    )}

                    <HistorySection
                        items={urlHistory}
                        activeKey={activeUrlKey}
                        onSelect={handleUrlHistorySelect}
                        renderItem={(item) => (
                            <>
                                <FaLink className="shrink-0 text-[10px] opacity-60" />
                                <span className="font-medium">{hostOf(item.url)}</span>
                                <span className="ml-auto shrink-0 text-gray-400 dark:text-gray-600 truncate max-w-[140px] text-right">{item.url}</span>
                            </>
                        )}
                    />
                </div>
            )}

            {/* ── Screenshot Tab ── */}
            {activeTab === 'screenshot' && (
                <div>
                    {!screenshotPreview ? (
                        <label className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 cursor-pointer hover:border-primary-400 hover:bg-primary-400/5 transition-all duration-150 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-primary-400">
                            <FaFileImage className="text-4xl text-gray-400" />
                            <div className="text-center">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{t('scoring.clickOrDrag')}</p>
                                <p className="text-xs text-gray-400 mt-1">{t('scoring.imageOnly')}</p>
                            </div>
                            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleScreenshotChange} />
                        </label>
                    ) : (
                        <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
                            <img src={screenshotPreview} alt="Job screenshot" className="w-full max-h-64 object-cover object-top" />
                            <button
                                onClick={clearScreenshot}
                                className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-gray-900/70 text-white hover:bg-gray-900 transition-colors duration-150"
                            >
                                <IoClose />
                            </button>
                            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                                {screenshotFile?.name ?? activeScreenshotKey}
                                <button onClick={() => fileRef.current?.click()} className="ml-3 text-primary-400 hover:underline">
                                    {t('scoring.changeFile')}
                                </button>
                                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleScreenshotChange} />
                            </div>
                        </div>
                    )}

                    <HistorySection
                        items={screenshotHistory}
                        activeKey={activeScreenshotKey}
                        onSelect={handleScreenshotHistorySelect}
                        renderItem={(item) => (
                            <>
                                <img src={item.base64} alt="" className="h-6 w-10 rounded object-cover shrink-0" />
                                <span className="truncate">{item.name}</span>
                            </>
                        )}
                    />
                </div>
            )}
        </div>
    );
};

export default JobInput;
