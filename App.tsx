
import React, { useState, useEffect } from 'react';
import { MASTER_THEMES } from './constants';
import { Article, GenerationState } from './types';
import { geminiService } from './services/geminiService';
import { v4 as uuidv4 } from 'uuid';

export default function App() {
  const [customPrompt, setCustomPrompt] = useState("");
  const [currentArticle, setCurrentArticle] = useState<Article | null>(null);
  const [genStatus, setGenStatus] = useState<GenerationState>(GenerationState.IDLE);
  const [logs, setLogs] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<{score: number, tips: string[]} | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [trendingThemes, setTrendingThemes] = useState<string[]>([]);

  useEffect(() => { refreshThemes(); }, []);

  const addLog = (msg: string) => setLogs(prev => [...prev.slice(-8), msg]);

  const refreshThemes = async () => {
    const themes = await geminiService.generateFreshThemes();
    setTrendingThemes(themes);
  };

  const processImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0);
        ctx.filter = 'contrast(1.1) saturate(0.9) brightness(0.95)';
        ctx.drawImage(canvas, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = dataUrl;
    });
  };

  const downloadAllImages = () => {
    if (!currentArticle) return;
    currentArticle.images.forEach((url, i) => {
      const link = document.createElement('a');
      link.href = url;
      link.download = `dzen_img_${i+1}.jpg`;
      link.click();
    });
  };

  const startGeneration = async () => {
    try {
      setGenStatus(GenerationState.THINKING);
      addLog("🧠 Проработка многослойного сюжета...");
      
      let finalTheme = customPrompt || trendingThemes[0] || MASTER_THEMES[0];
      const data = await geminiService.generateArticleData({ theme: finalTheme, customHint: customPrompt });

      addLog("✍️ Текстовая шлифовка и замена глаголов...");
      setGenStatus(GenerationState.GENERATING_IMAGES);

      const images: string[] = [];
      if (data.imageScenes) {
        for (const scene of data.imageScenes) {
          addLog("📸 Генерация фото-реализма...");
          const raw = await geminiService.generateVisual(scene);
          if (raw) images.push(await processImage(raw));
        }
      }

      setCurrentArticle({
        id: uuidv4(), title: data.title, content: data.content, images,
        createdAt: Date.now(), rubric: "Драма", themes: [finalTheme], triggers: [], style: "confession"
      });
      
      setGenStatus(GenerationState.COMPLETED);
      addLog("✅ Статья готова к публикации!");
      runQuickAnalysis(data.content);
    } catch (e) {
      setGenStatus(GenerationState.ERROR);
      addLog("❌ Ошибка генерации.");
    }
  };

  const runQuickAnalysis = async (text: string) => {
    setIsAnalyzing(true);
    const result = await geminiService.checkHumanity(text);
    setAnalysis(result);
    setIsAnalyzing(false);
  };

  const copyToDzen = (article: Article) => {
    const text = `${article.title}\n\n${article.content.replace(/##\s+/g, '\n\n')}\n\nА вы что думаете?👇`;
    navigator.clipboard.writeText(text);
    alert("Готово! Текст скопирован.");
  };

  return (
    <div className="flex h-screen bg-[#05070a] text-white overflow-hidden font-sans">
      <aside className="w-[420px] bg-[#0b0e14] border-r border-white/5 flex flex-col shadow-2xl overflow-y-auto scrollbar-hide">
        <div className="p-8 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0b0e14]/95 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center font-black text-xl">Z</div>
            <h1 className="text-lg font-black tracking-tighter">ZenMaster <span className="text-orange-500">PRO</span></h1>
          </div>
          {analysis && (
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-orange-500/20">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span className="text-[10px] font-black uppercase tracking-widest">{analysis.score}% Живой</span>
            </div>
          )}
        </div>

        <div className="p-8 space-y-8">
          <button
            onClick={startGeneration}
            disabled={genStatus === GenerationState.THINKING || genStatus === GenerationState.GENERATING_IMAGES}
            className="w-full py-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-[35px] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 flex flex-col items-center"
          >
            <span className="text-3xl">🔥</span>
            <span className="text-sm font-black uppercase mt-2 tracking-widest">Создать хайп</span>
          </button>

          <div className="space-y-4">
            <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500">
              <span>Виральные темы</span>
              <button onClick={refreshThemes} className="text-orange-500">Обновить</button>
            </div>
            <div className="grid gap-2">
              {trendingThemes.slice(0, 3).map((theme, i) => (
                <button
                  key={i} onClick={() => setCustomPrompt(theme)}
                  className={`text-left p-4 rounded-2xl text-[12px] border transition-all ${customPrompt === theme ? 'bg-orange-500/10 border-orange-500' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>

          <textarea 
            className="w-full p-6 bg-white/5 border border-white/5 rounded-[30px] text-xs h-32 outline-none focus:ring-2 ring-orange-500/30 transition-all"
            placeholder="Свои идеи или доп. условия..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
          />

          {analysis?.tips?.[0] && (
            <div className="p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10 text-[10px] text-slate-400 italic">
               💡 Совет: {analysis.tips[0]}
            </div>
          )}

          <div className="bg-black/20 p-5 rounded-2xl font-mono text-[9px] text-slate-500 space-y-1">
            {logs.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      </aside>

      <main className="flex-1 bg-[#020408] overflow-y-auto p-10 lg:p-20 scrollbar-hide">
        {currentArticle ? (
          <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-10 duration-700">
            <div className="flex gap-4 sticky top-0 z-20 backdrop-blur-sm pb-4">
              <button onClick={() => copyToDzen(currentArticle)} className="flex-1 py-5 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-full hover:bg-orange-500 hover:text-white transition-all shadow-xl">Копировать текст</button>
              <button onClick={downloadAllImages} className="px-8 py-5 bg-white/5 border border-white/10 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-white/10">Скачать пак фото</button>
            </div>

            <div className="bg-white text-slate-900 rounded-[60px] overflow-hidden shadow-2xl">
              {currentArticle.images[0] && <img src={currentArticle.images[0]} className="w-full aspect-[2/1] object-cover" />}
              <div className="p-12 lg:p-20 space-y-10">
                <h1 className="text-4xl lg:text-6xl font-black leading-tight tracking-tighter">{currentArticle.title}</h1>
                <div className="font-serif text-xl lg:text-2xl leading-relaxed text-slate-800 space-y-8 first-letter:text-7xl first-letter:font-black first-letter:text-orange-600 first-letter:mr-3 first-letter:float-left">
                  {currentArticle.content.split('\n').map((line, i) => (
                    line.startsWith('## ') 
                    ? <h2 key={i} className="text-3xl font-black pt-10 text-slate-900 leading-none">{line.replace('## ', '')}</h2>
                    : <p key={i}>{line.replace(/\*\*/g, '')}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center opacity-10 select-none">
            <span className="text-[200px] font-black">ZEN</span>
          </div>
        )}
      </main>
    </div>
  );
}
