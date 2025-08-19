import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BookOpen, PenTool, Play, Shuffle, RotateCw, Eye, Check, Lightbulb, Volume2, Swords, Sparkles, ArrowRightLeft, Eraser, Info } from "lucide-react";

/**
 * Katakana Trainer — Random Quiz + Stroke Order (single-file React component)
 *
 * What you get
 * - Two quiz modes: "Kana → Romaji" and "Romaji → Kana" (+ Mixed)
 * - Randomized questions, Reveal, Streak, Score, High Score (localStorage)
 * - Study tab with full katakana chart and quick filters
 * - Stroke Practice with tracing canvas + direction matching (approximate) and a dynamic guide link
 * - Clean, modern UI (Tailwind + shadcn/ui) with subtle animations (Framer Motion)
 *
 * Notes on stroke order
 * - The tracing validator checks stroke *direction patterns* (horizontal / vertical / diagonal-up / diagonal-down).
 * - For exact animated stroke order, use the in-app "Open Animation" button (sources: japanese-lesson.com / MaikoJapan).
 */

// ----------------------------
// Data: katakana + romaji + approximate direction patterns
// direction keys our tracer understands: "H" (horizontal), "V" (vertical), "DU" (diagonal-up \\), "DD" (diagonal-down /), "DOT" (short mark)
// The arrays below are *approximations* of handwriting direction, sufficient for practice; consult the animation link for canonical forms.
// ----------------------------

const KATAKANA: { kana: string; romaji: string; row: string; directions: ("H"|"V"|"DU"|"DD"|"DOT")[] }[] = [
  // A-row
  { kana: "ア", romaji: "a", row: "a", directions: ["DD", "V"] },
  { kana: "イ", romaji: "i", row: "a", directions: ["DD", "DD"] },
  { kana: "ウ", romaji: "u", row: "a", directions: ["DOT", "V"] },
  { kana: "エ", romaji: "e", row: "a", directions: ["H", "H", "V"] },
  { kana: "オ", romaji: "o", row: "a", directions: ["H", "V", "DD"] },
  // KA-row
  { kana: "カ", romaji: "ka", row: "ka", directions: ["DD", "V"] },
  { kana: "キ", romaji: "ki", row: "ka", directions: ["H", "H", "V"] },
  { kana: "ク", romaji: "ku", row: "ka", directions: ["DD"] },
  { kana: "ケ", romaji: "ke", row: "ka", directions: ["H", "V", "H"] },
  { kana: "コ", romaji: "ko", row: "ka", directions: ["H", "H"] },
  // SA-row
  { kana: "サ", romaji: "sa", row: "sa", directions: ["H", "V", "DD"] },
  { kana: "シ", romaji: "shi", row: "sa", directions: ["DD", "DD", "DD"] },
  { kana: "ス", romaji: "su", row: "sa", directions: ["H", "DD"] },
  { kana: "セ", romaji: "se", row: "sa", directions: ["H", "V", "H"] },
  { kana: "ソ", romaji: "so", row: "sa", directions: ["DD", "DD"] },
  // TA-row
  { kana: "タ", romaji: "ta", row: "ta", directions: ["H", "V", "DD"] },
  { kana: "チ", romaji: "chi", row: "ta", directions: ["H", "DD"] },
  { kana: "ツ", romaji: "tsu", row: "ta", directions: ["DD", "DD", "DD"] },
  { kana: "テ", romaji: "te", row: "ta", directions: ["H"] },
  { kana: "ト", romaji: "to", row: "ta", directions: ["DD", "V"] },
  // NA-row
  { kana: "ナ", romaji: "na", row: "na", directions: ["H", "V"] },
  { kana: "ニ", romaji: "ni", row: "na", directions: ["H", "H"] },
  { kana: "ヌ", romaji: "nu", row: "na", directions: ["H", "DD"] },
  { kana: "ネ", romaji: "ne", row: "na", directions: ["DOT", "H", "V", "DD"] },
  { kana: "ノ", romaji: "no", row: "na", directions: ["DD"] },
  // HA-row
  { kana: "ハ", romaji: "ha", row: "ha", directions: ["DD", "DU"] },
  { kana: "ヒ", romaji: "hi", row: "ha", directions: ["DD", "DD"] },
  { kana: "フ", romaji: "fu", row: "ha", directions: ["H"] },
  { kana: "ヘ", romaji: "he", row: "ha", directions: ["DU"] },
  { kana: "ホ", romaji: "ho", row: "ha", directions: ["H", "V", "H", "DD"] },
  // MA-row
  { kana: "マ", romaji: "ma", row: "ma", directions: ["DD", "H"] },
  { kana: "ミ", romaji: "mi", row: "ma", directions: ["DD", "DD", "DD"] },
  { kana: "ム", romaji: "mu", row: "ma", directions: ["DD", "H"] },
  { kana: "メ", romaji: "me", row: "ma", directions: ["H", "DD"] },
  { kana: "モ", romaji: "mo", row: "ma", directions: ["H", "H", "V"] },
  // YA-row
  { kana: "ヤ", romaji: "ya", row: "ya", directions: ["H", "DD"] },
  { kana: "ユ", romaji: "yu", row: "ya", directions: ["H", "V"] },
  { kana: "ヨ", romaji: "yo", row: "ya", directions: ["H", "H", "V"] },
  // RA-row
  { kana: "ラ", romaji: "ra", row: "ra", directions: ["DD", "H"] },
  { kana: "リ", romaji: "ri", row: "ra", directions: ["DD", "DD"] },
  { kana: "ル", romaji: "ru", row: "ra", directions: ["DD", "H"] },
  { kana: "レ", romaji: "re", row: "ra", directions: ["DD"] },
  { kana: "ロ", romaji: "ro", row: "ra", directions: ["H", "V"] },
  // WA-row
  { kana: "ワ", romaji: "wa", row: "wa", directions: ["DD", "H"] },
  { kana: "ヲ", romaji: "wo", row: "wa", directions: ["H", "V", "H"] },
  { kana: "ン", romaji: "n", row: "wa", directions: ["DD"] },
];

const ROWS = [
  { key: "a", label: "A-row (ア)" },
  { key: "ka", label: "KA-row (カ)" },
  { key: "sa", label: "SA-row (サ)" },
  { key: "ta", label: "TA-row (タ)" },
  { key: "na", label: "NA-row (ナ)" },
  { key: "ha", label: "HA-row (ハ)" },
  { key: "ma", label: "MA-row (マ)" },
  { key: "ya", label: "YA-row (ヤ)" },
  { key: "ra", label: "RA-row (ラ)" },
  { key: "wa", label: "WA-row (ワ)" },
];

// Helpers
const rand = (n: number) => Math.floor(Math.random() * n);
const classifyAngle = (dx: number, dy: number): "H"|"V"|"DU"|"DD" => {
  const adx = Math.abs(dx), ady = Math.abs(dy);
  if (adx > ady) return "H"; // mostly horizontal
  if (ady > adx) return "V"; // mostly vertical
  // if nearly equal, decide by sign
  return (dx * dy < 0) ? "DU" : "DD";
};

// LocalStorage helpers
const LS_KEYS = { highScore: "katakana_high_score_v1", settings: "katakana_settings_v1" } as const;

// ----------------------------
// Stroke Tracing Canvas
// ----------------------------
function StrokeCanvas({
  kana,
  expected,
  onMatch,
  resetSignal,
}: {
  kana: string;
  expected: ("H"|"V"|"DU"|"DD"|"DOT")[];
  onMatch: (ok: boolean) => void;
  resetSignal: number; // bump to force clearing
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strokes, setStrokes] = useState<{ pts: [number,number][], cls: "H"|"V"|"DU"|"DD" }[]>([]);
  const [isDown, setIsDown] = useState(false);
  const [curPts, setCurPts] = useState<[number,number][]>([]);
  const [matched, setMatched] = useState(0);

  // Reset on signal or kana change
  useEffect(() => { setStrokes([]); setCurPts([]); setIsDown(false); setMatched(0); clearCanvas(); }, [resetSignal, kana]);

  const clearCanvas = () => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0,0,c.width,c.height);
    // draw guide grid + glyph
    const w = c.width, h = c.height;
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.beginPath();
    ctx.moveTo(w*0.1, h*0.1); ctx.lineTo(w*0.9, h*0.1);
    ctx.moveTo(w*0.1, h*0.5); ctx.lineTo(w*0.9, h*0.5);
    ctx.moveTo(w*0.1, h*0.9); ctx.lineTo(w*0.9, h*0.9);
    ctx.moveTo(w*0.1, h*0.1); ctx.lineTo(w*0.1, h*0.9);
    ctx.moveTo(w*0.5, h*0.1); ctx.lineTo(w*0.5, h*0.9);
    ctx.moveTo(w*0.9, h*0.1); ctx.lineTo(w*0.9, h*0.9);
    ctx.strokeStyle = "#000"; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();

    // Big kana
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${Math.floor(h*0.72)}px \"Noto Sans JP\", \"Hiragino Kaku Gothic ProN\", system-ui, sans-serif`;
    ctx.fillText(kana, w/2, h/2 + h*0.03);
    ctx.restore();

    // expected arrow hints (generic positions)
    const step = Math.min(w,h) * 0.08;
    expected.forEach((d, i) => {
      drawArrow(ctx, w*0.18 + i*step*1.3, h*0.16 + i*step*0.9, d);
      // number badge
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.beginPath(); ctx.arc(w*0.18 + i*step*1.3, h*0.16 + i*step*0.9, 10, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "white"; ctx.font = "12px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(String(i+1), w*0.18 + i*step*1.3, h*0.16 + i*step*0.9);
      ctx.restore();
    });
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, x: number, y: number, d: "H"|"V"|"DU"|"DD") => {
    const len = 38;
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = "#111"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
    let dx = 0, dy = 0, ang = 0;
    if (d === "H") { dx = len; dy = 0; ang = 0; }
    if (d === "V") { dx = 0; dy = len; ang = Math.PI/2; }
    if (d === "DU") { dx = len*0.8; dy = -len*0.8; ang = -Math.PI/4; }
    if (d === "DD") { dx = len*0.8; dy = len*0.8; ang = Math.PI/4; }
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x+dx, y+dy); ctx.stroke();
    // arrow head
    const hx = x+dx, hy = y+dy;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx - 10*Math.cos(ang - Math.PI/6), hy - 10*Math.sin(ang - Math.PI/6));
    ctx.lineTo(hx - 10*Math.cos(ang + Math.PI/6), hy - 10*Math.sin(ang + Math.PI/6));
    ctx.closePath(); ctx.fillStyle = "#111"; ctx.fill();
    ctx.restore();
  };

  useEffect(() => { clearCanvas(); }, [kana]);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;

    const redraw = () => {
      clearCanvas();
      // draw previous strokes
      ctx.save();
      ctx.strokeStyle = "#111"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.lineJoin = "round";
      strokes.forEach(s => {
        ctx.beginPath();
        s.pts.forEach((p, i) => { if (i===0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
        ctx.stroke();
      });
      // draw current stroke in progress
      if (curPts.length > 1) {
        ctx.beginPath();
        curPts.forEach((p, i) => { if (i===0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
        ctx.stroke();
      }
      ctx.restore();
    };

    redraw();
  }, [strokes, curPts]);

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    setIsDown(true);
    setCurPts([[e.clientX - rect.left, e.clientY - rect.top]]);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDown) return;
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    setCurPts(prev => [...prev, [e.clientX - rect.left, e.clientY - rect.top]]);
  };
  const onUp = () => {
    if (!isDown) return;
    setIsDown(false);
    if (curPts.length < 2) { setCurPts([]); return; }
    const [sx, sy] = curPts[0];
    const [ex, ey] = curPts[curPts.length-1];
    const cls = classifyAngle(ex - sx, ey - sy);
    const s = { pts: curPts, cls } as const;
    setCurPts([]);
    setStrokes(prev => [...prev, s]);

    // check against expected pattern
    const exp = expected[matched];
    const ok = exp ? (exp === cls || (exp === "DOT" && curPts.length < 8)) : false;
    if (ok) {
      setMatched(m => m+1);
      onMatch(true);
      if (matched + 1 === expected.length) {
        toast.success("Stroke pattern matched!", { description: "Nice tracing." });
      }
    } else {
      onMatch(false);
      toast.error("Stroke direction didn’t match", { description: `Expected ~${exp}, got ${cls}` });
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-muted-foreground">Trace over the faint kana. The checker looks at each stroke’s general direction.</div>
        <Button size="sm" variant="secondary" onClick={() => setStrokes([])} className="gap-2"><Eraser className="size-4"/>Clear</Button>
      </div>
      <div className="w-full aspect-square rounded-2xl bg-white shadow-inner overflow-hidden">
        <canvas
          ref={canvasRef}
          width={720}
          height={720}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          className="w-full h-full touch-none cursor-crosshair"
        />
      </div>
      <div className="mt-2 text-xs text-muted-foreground">Expected steps: {expected.length} &middot; Matched: {matched}</div>
    </div>
  );
}

// ----------------------------
// Main App
// ----------------------------
export default function KatakanaTrainerApp() {
  // settings
  const [mode, setMode] = useState<"kana2roma"|"roma2kana"|"mixed">("kana2roma");
  const [activeRows, setActiveRows] = useState<string[]>(ROWS.map(r => r.key));
  const [shuffle, setShuffle] = useState(true);
  const [sound, setSound] = useState(false);

  // quiz state
  const pool = useMemo(() => KATAKANA.filter(k => activeRows.includes(k.row)), [activeRows]);
  const [index, setIndex] = useState(0);
  const [question, setQuestion] = useState<KATAKANA[number] | null>(null);
  const [input, setInput] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [high, setHigh] = useState<number>(() => Number(localStorage.getItem(LS_KEYS.highScore) || 0));
  const [total, setTotal] = useState(0);

  const [resetStrokeSignal, setResetStrokeSignal] = useState(0);

  // init question
  useEffect(() => { nextQuestion(true); /* eslint-disable-next-line */ }, [mode, pool.length, shuffle]);

  // save high score
  useEffect(() => { localStorage.setItem(LS_KEYS.highScore, String(high)); }, [high]);

  const nextQuestion = (init=false) => {
    if (pool.length === 0) return;
    const newIdx = shuffle ? rand(pool.length) : (index + 1) % pool.length;
    setIndex(newIdx);
    const q = pool[newIdx];
    setQuestion(q);
    setInput("");
    setRevealed(false);
    if (!init) setTotal(t => t + 1);
    setResetStrokeSignal(x => x+1);
  };

  const speak = (text: string) => {
    try {
      if (!sound) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ja-JP";
      u.rate = 0.9;
      speechSynthesis.speak(u);
    } catch {}
  };

  const prompt = useMemo(() => {
    if (!question) return { prompt: "", answer: "" };
    if (mode === "kana2roma") return { prompt: question.kana, answer: question.romaji };
    if (mode === "roma2kana") return { prompt: question.romaji, answer: question.kana };
    // mixed: flip a coin
    const flip = Math.random() < 0.5;
    return flip ? { prompt: question.kana, answer: question.romaji } : { prompt: question.romaji, answer: question.kana };
  }, [question, mode, index]);

  useEffect(() => { if (question && mode !== "roma2kana") speak(question.kana); }, [question, mode]);

  const check = () => {
    if (!question) return;
    const good = input.trim().toLowerCase() === prompt.answer.toString().trim().toLowerCase();
    if (good) {
      setScore(s => s + (revealed ? 5 : 10));
      setStreak(s => s + 1);
      if (score + (revealed ? 5 : 10) > high) setHigh(score + (revealed ? 5 : 10));
      toast.success("Correct!", { description: `${prompt.prompt} = ${prompt.answer}` });
      nextQuestion();
    } else {
      setStreak(0);
      toast.error("Not quite.");
    }
  };

  const reveal = () => { setRevealed(true); };

  const toggleRow = (key: string) => {
    setActiveRows(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const progress = total > 0 ? Math.min(100, Math.round((score / (total * 10)) * 100)) : 0;

  const guideLink = useMemo(() => {
    if (!question) return "";
    // Two good sources: japanese-lesson.com (row pages) and MaikoJapan (per-character table)
    // We'll prefer MaikoJapan list for a simple anchor-free page.
    // Fallback to a search query link if needed.
    // NOTE: We simply provide an external reference — animations are copyright of their owners.
    const base = "https://maikojapan.com/list-of-katakana-with-stroke-order-animations/";
    return base; // opens page; user can scroll to the character
  }, [question]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight flex items-center gap-3">
              <Sparkles className="size-6"/> Katakana Trainer <span className="text-xs font-normal text-muted-foreground">quiz + stroke order</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Random quiz to learn katakana fast. Reveal for hints, keep a streak, and practise tracing with stroke-direction checking.</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-xs">Score: {score}</Badge>
            <Badge variant="outline" className="text-xs">Streak: {streak}</Badge>
            <Badge variant="default" className="text-xs">High: {high}</Badge>
          </div>
        </div>

        <Tabs defaultValue="quiz" className="w-full">
          <TabsList className="grid grid-cols-3 w-full sm:w-auto">
            <TabsTrigger value="quiz" className="gap-2"><Swords className="size-4"/> Quiz</TabsTrigger>
            <TabsTrigger value="stroke" className="gap-2"><PenTool className="size-4"/> Stroke Practice</TabsTrigger>
            <TabsTrigger value="study" className="gap-2"><BookOpen className="size-4"/> Study</TabsTrigger>
          </TabsList>

          {/* QUIZ TAB */}
          <TabsContent value="quiz" className="mt-4">
            <div className="grid md:grid-cols-[1.4fr_1fr] gap-4">
              <Card className="rounded-2xl shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2"><Shuffle className="size-4"/> Random Quiz</CardTitle>
                  <CardDescription>Answer the prompt. Use Reveal if stuck (less points).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                      <SelectTrigger className="w-[210px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kana2roma">Kana → Romaji</SelectItem>
                        <SelectItem value="roma2kana">Romaji → Kana</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2 ml-auto">
                      <Switch id="sound" checked={sound} onCheckedChange={setSound} />
                      <Label htmlFor="sound" className="text-xs text-muted-foreground flex items-center gap-1"><Volume2 className="size-4"/> Speak kana</Label>
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-white/70 p-6 flex flex-col items-center justify-center text-center gap-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Prompt</div>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`${prompt.prompt}-${index}`}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 280, damping: 22 }}
                        className="font-medium text-6xl sm:text-7xl"
                        style={{ fontFamily: '"Noto Sans JP","Hiragino Kaku Gothic ProN",system-ui,sans-serif' }}
                      >
                        {prompt.prompt}
                      </motion.div>
                    </AnimatePresence>

                    <div className="w-full max-w-sm flex items-center gap-2">
                      <Input
                        placeholder="type your answer…"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') check(); }}
                        className="text-lg"
                      />
                      <Button onClick={check} className="gap-2"><Check className="size-4"/>Check</Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="secondary" onClick={reveal} className="gap-2"><Eye className="size-4"/>Reveal</Button>
                      <Button variant="ghost" onClick={() => setInput(prompt.answer.toString())} className="gap-2"><Lightbulb className="size-4"/>Hint</Button>
                      <Button variant="outline" onClick={() => nextQuestion()} className="gap-2"><RotateCw className="size-4"/>Skip</Button>
                    </div>

                    {revealed && (
                      <div className="text-sm text-muted-foreground">Answer: <span className="font-semibold text-slate-900">{prompt.answer}</span> <span className="ml-2 text-xs">(+5 if correct now)</span></div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Progress (score vs. perfect)</span><span>{progress}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                </CardContent>
                <CardFooter className="justify-end">
                  <Button variant="outline" className="gap-2" onClick={() => { setScore(0); setStreak(0); setTotal(0); toast.message('Stats reset'); }}>
                    <RotateCw className="size-4"/> Reset stats
                  </Button>
                </CardFooter>
              </Card>

              <Card className="rounded-2xl shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2"><SettingsIcon/> Settings & Filters</CardTitle>
                  <CardDescription>Select which rows to include in the pool.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ROWS.map(r => (
                      <button
                        key={r.key}
                        onClick={() => toggleRow(r.key)}
                        className={`rounded-xl border px-3 py-2 text-left text-sm transition ${activeRows.includes(r.key) ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-50'}`}
                      >
                        <div className="font-medium">{r.label}</div>
                        <div className="text-xs opacity-70">{KATAKANA.filter(k=>k.row===r.key).map(k=>k.kana).join(' ')}</div>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <Switch id="shuffle" checked={shuffle} onCheckedChange={setShuffle} />
                    <Label htmlFor="shuffle" className="text-xs text-muted-foreground flex items-center gap-1"><ArrowRightLeft className="size-4"/> Shuffle questions</Label>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* STROKE TAB */}
          <TabsContent value="stroke" className="mt-4">
            <div className="grid lg:grid-cols-[1.2fr_1fr] gap-4">
              <Card className="rounded-2xl shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2"><PenTool className="size-4"/> Trace & Validate</CardTitle>
                  <CardDescription>Practice the current character’s stroke *directions*. Use the guide link for exact animated order.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">Character: <span className="text-3xl ml-2" style={{ fontFamily: '"Noto Sans JP","Hiragino Kaku Gothic ProN",system-ui,sans-serif' }}>{question?.kana ?? '—'}</span></div>
                    <div className="text-sm text-muted-foreground">Expected strokes: {question?.directions.length ?? 0}</div>
                  </div>
                  <StrokeCanvas
                    kana={question?.kana ?? 'ア'}
                    expected={question?.directions ?? ["DD","V"]}
                    onMatch={(ok) => { /* Could track separate tracing score if desired */ }}
                    resetSignal={resetStrokeSignal}
                  />
                </CardContent>
                <CardFooter className="justify-between">
                  <div className="text-xs text-muted-foreground flex items-center gap-1"><Info className="size-3.5"/> Tip: Small dots or ticks are marked as a short stroke (we accept a tiny line).</div>
                  <Button variant="outline" className="gap-2" onClick={() => setResetStrokeSignal(x=>x+1)}><Eraser className="size-4"/>Clear</Button>
                </CardFooter>
              </Card>

              <Card className="rounded-2xl shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2"><BookOpen className="size-4"/> Quick Reference</CardTitle>
                  <CardDescription>Open an external animated stroke guide.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">Selected: <span className="font-semibold">{question?.kana}</span> (<span className="text-muted-foreground">{question?.romaji}</span>)</div>
                  <div className="flex items-center gap-2">
                    <a href={guideLink} target="_blank" rel="noreferrer" className="inline-flex"><Button className="gap-2" variant="secondary"><Play className="size-4"/> Open Animation</Button></a>
                    <a href="https://japanese-lesson.com/characters/katakana/katakana_drill/katakana01.html" target="_blank" rel="noreferrer" className="inline-flex"><Button variant="ghost">Alt. guide</Button></a>
                  </div>
                  <p className="text-xs text-muted-foreground">These resources include per‑character stroke order animations. Use them to verify precise starts/ends and overlaps.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* STUDY TAB */}
          <TabsContent value="study" className="mt-4">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Full Chart</CardTitle>
                <CardDescription>Click any tile to make it the active quiz character.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-10 gap-2">
                  {KATAKANA.map((k, i) => (
                    <motion.button
                      key={k.kana}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { setQuestion(k); setRevealed(false); setInput(""); setResetStrokeSignal(x=>x+1); }}
                      className="rounded-2xl border shadow-sm bg-white p-3 flex flex-col items-center gap-1"
                    >
                      <div className="text-3xl" style={{ fontFamily: '"Noto Sans JP","Hiragino Kaku Gothic ProN",system-ui,sans-serif' }}>{k.kana}</div>
                      <div className="text-xs text-muted-foreground">{k.romaji}</div>
                    </motion.button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.92.561 2.144.095 2.573-1.066z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
    </svg>
  );
}
