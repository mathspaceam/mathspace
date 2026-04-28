import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, Download } from 'lucide-react';
import GlassPanel from '../components/ui/GlassPanel';
import SliderRow from '../components/ui/SliderRow';
import TabBar from '../components/ui/TabBar';
import FunctionAnalyzer from '../components/FunctionAnalyzer';
import { MathContext } from '../contexts/MathContext';
import { plotFunction, computeDerivative, findRoots, findExtrema, drawGrid, worldToCanvas, drawInterval } from '../utils/math';

const COLORS = ['#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];
const TABS = [
  { id: 'practical', label: 'Plotter' },
  { id: 'theory', label: 'Theory' },
];

interface Expr {
  id: number;
  expr: string;
  color: string;
  visible: boolean;
  showD1: boolean;
  showD2: boolean;
  intervals?: { start: number; end: number; color: string }[];
}

let idCounter = 1;

export default function FunctionsModule() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState('practical');
  const [exprs, setExprs] = useState<Expr[]>([
    { id: idCounter++, expr: 'sin(x)', color: COLORS[0], visible: true, showD1: false, showD2: false, intervals: [] },
  ]);
  const [xMin, setXMin] = useState(-8);
  const [xMax, setXMax] = useState(8);
  const [yMin, setYMin] = useState(-4);
  const [yMax, setYMax] = useState(4);
  const [showRoots, setShowRoots] = useState(true);
  const [showExtrema, setShowExtrema] = useState(true);
  const [error, setError] = useState('');
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, xMin: 0, xMax: 0, yMin: 0, yMax: 0 });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width: w, height: h } = canvas;
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, w, h);
    drawGrid(ctx, xMin, xMax, yMin, yMax, w, h);

    for (const e of exprs) {
      if (!e.visible) continue;
      try {
        // Draw intervals first (behind the curve)
        if (e.intervals && e.intervals.length > 0) {
          for (const interval of e.intervals) {
            drawInterval(ctx, e.expr, interval.start, interval.end, interval.color, xMin, xMax, yMin, yMax, w, h);
          }
        }
        
        drawCurve(ctx, e.expr, e.color, 2.5, xMin, xMax, yMin, yMax, w, h);

        if (e.showD1) {
          const d1 = computeDerivative(e.expr, 1);
          if (d1) drawCurve(ctx, d1, e.color, 1.5, xMin, xMax, yMin, yMax, w, h, [6, 4]);
        }
        if (e.showD2) {
          const d2 = computeDerivative(e.expr, 2);
          if (d2) drawCurve(ctx, d2, e.color, 1, xMin, xMax, yMin, yMax, w, h, [2, 4]);
        }

        if (showRoots) {
          const roots = findRoots(e.expr, xMin, xMax);
          for (const rx of roots) {
            const { cx, cy } = worldToCanvas(rx, 0, xMin, xMax, yMin, yMax, w, h);
            ctx.beginPath();
            ctx.arc(cx, cy, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#10B981';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }

        if (showExtrema) {
          const ext = findExtrema(e.expr, xMin, xMax);
          for (const { x, y, type } of ext) {
            const { cx, cy } = worldToCanvas(x, y, xMin, xMax, yMin, yMax, w, h);
            ctx.beginPath();
            ctx.arc(cx, cy, 5, 0, Math.PI * 2);
            ctx.fillStyle = type === 'max' ? '#F59E0B' : '#EF4444';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }
      } catch {
        setError('Expression error');
      }
    }
  }, [exprs, xMin, xMax, yMin, yMax, showRoots, showExtrema]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      canvas.style.width = canvas.offsetWidth + 'px';
      canvas.style.height = canvas.offsetHeight + 'px';
      draw();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      const cx = (xMax + xMin) / 2, cy = (yMax + yMin) / 2;
      const rx = (xMax - xMin) / 2 * factor, ry = (yMax - yMin) / 2 * factor;
      setXMin(cx - rx); setXMax(cx + rx); setYMin(cy - ry); setYMax(cy + ry);
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [xMin, xMax, yMin, yMax]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMouseDown = (e: MouseEvent) => {
      setIsPanning(true);
      setPanStart({
        x: e.offsetX * devicePixelRatio,
        y: e.offsetY * devicePixelRatio,
        xMin, xMax, yMin, yMax
      });
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isPanning) return;
      const dx = e.offsetX * devicePixelRatio - panStart.x;
      const dy = e.offsetY * devicePixelRatio - panStart.y;
      const worldDx = dx / canvas.width * (panStart.xMax - panStart.xMin) * 0.25;
      const worldDy = dy / canvas.height * (panStart.yMax - panStart.yMin) * 0.25;
      setXMin(panStart.xMin - worldDx);
      setXMax(panStart.xMax - worldDx);
      setYMin(panStart.yMin + worldDy); // Note: y is inverted
      setYMax(panStart.yMax + worldDy);
    };
    const onMouseUp = () => {
      setIsPanning(false);
    };
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isPanning, panStart, xMin, xMax, yMin, yMax]);

  const exportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'mathspace-function.png';
    a.click();
  };

  const addExpr = () => {
    if (exprs.length >= 5) return;
    setExprs(prev => [...prev, {
      id: idCounter++,
      expr: 'cos(x)',
      color: COLORS[prev.length % COLORS.length],
      visible: true,
      showD1: false,
      showD2: false,
      intervals: [],
    }]);
  };

  const updateExpr = (id: number, field: keyof Expr, value: unknown) => {
    setExprs(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const removeExpr = (id: number) => setExprs(prev => prev.filter(e => e.id !== id));

  const currentState = useMemo(() => ({
    expressions: exprs.map(e => e.expr),
    xMin,
    xMax,
    yMin,
    yMax,
    showRoots,
    showExtrema,
    tab,
  }), [exprs, xMin, xMax, yMin, yMax, showRoots, showExtrema, tab]);

  const updateState = useCallback((key: string, value: unknown) => {
    if (key === 'xMin') setXMin(Number(value));
    else if (key === 'xMax') setXMax(Number(value));
    else if (key === 'yMin') setYMin(Number(value));
    else if (key === 'yMax') setYMax(Number(value));
    else if (key === 'showRoots') setShowRoots(Boolean(value));
    else if (key === 'showExtrema') setShowExtrema(Boolean(value));
    else if (key === 'tab') setTab(String(value));
    else if (key === 'expression' || key === 'expr' || key === 'function') {
      if (typeof value === 'string') {
        setExprs([{ id: idCounter++, expr: value, color: COLORS[0], visible: true, showD1: false, showD2: false }]);
      }
    } else {
      console.warn('Unknown state key in MathContext update:', key, value);
    }
  }, []);

  return (
    <MathContext.Provider value={{ currentState, updateState }}>
      <div className="flex flex-col h-full">
        <TabBar tabs={TABS} active={tab} onChange={setTab} color="#3B82F6" />

      {tab === 'theory' ? (
        <FunctionsTheorySection />
      ) : (
        <div className="flex flex-col lg:flex-row flex-1 gap-4 min-h-0">
          {/* Canvas */}
          <div className="flex-1 relative rounded-xl overflow-hidden min-h-0">
            <canvas ref={canvasRef} className="w-full h-full" style={{ minHeight: 300 }} />
            {error && (
              <div className="absolute bottom-4 left-4 glass rounded-lg px-3 py-2 text-xs text-[#EF4444]">
                {error}
              </div>
            )}
            <button
              onClick={exportPNG}
              className="absolute top-3 right-3 glass px-3 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <Download size={12} /> Export PNG
            </button>
          </div>

          {/* Controls */}
          <div className="w-full lg:w-64 flex flex-col gap-3 overflow-y-auto max-h-96 lg:max-h-none">
            <GlassPanel title="Expressions" accentColor="#3B82F6">
              {exprs.map((e) => (
                <div key={e.id} className="flex flex-col gap-2 pb-3 border-b border-[var(--border)] last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: e.color }} />
                    <input
                      type="text"
                      value={e.expr}
                      onChange={ev => { setError(''); updateExpr(e.id, 'expr', ev.target.value); }}
                      className="flex-1 text-xs"
                      placeholder="e.g. sin(x)"
                    />
                    {exprs.length > 1 && (
                      <button onClick={() => removeExpr(e.id)} className="text-[var(--text-muted)] hover:text-[#EF4444]">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3 text-xs">
                    <label className="flex items-center gap-1 text-[var(--text-muted)] cursor-pointer">
                      <input type="checkbox" checked={e.showD1} onChange={ev => updateExpr(e.id, 'showD1', ev.target.checked)} className="w-3 h-3" />
                      f'(x)
                    </label>
                    <label className="flex items-center gap-1 text-[var(--text-muted)] cursor-pointer">
                      <input type="checkbox" checked={e.showD2} onChange={ev => updateExpr(e.id, 'showD2', ev.target.checked)} className="w-3 h-3" />
                      f''(x)
                    </label>
                  </div>
                  <div className="flex flex-col gap-1 text-xs">
                    <div className="text-[var(--text-muted)]">Interval Coloring:</div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Start"
                        className="w-16 px-1 py-0.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border)] rounded"
                        onKeyDown={(ev) => {
                          if (ev.key === 'Enter') {
                            const start = parseFloat((ev.target as HTMLInputElement).value);
                            const endInput = ev.currentTarget.nextElementSibling as HTMLInputElement;
                            const end = parseFloat(endInput.value);
                            if (!isNaN(start) && !isNaN(end)) {
                              const intervals = e.intervals || [];
                              updateExpr(e.id, 'intervals', [...intervals, { start, end, color: e.color }]);
                              (ev.target as HTMLInputElement).value = '';
                              endInput.value = '';
                            }
                          }
                        }}
                      />
                      <input
                        type="number"
                        placeholder="End"
                        className="w-16 px-1 py-0.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border)] rounded"
                      />
                      <span className="text-[var(--text-muted)]">Press Enter</span>
                    </div>
                    {e.intervals && e.intervals.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {e.intervals.map((interval, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-xs rounded-full text-white"
                            style={{ backgroundColor: interval.color }}
                          >
                            [{interval.start}, {interval.end}]
                            <button
                              onClick={() => {
                                const intervals = e.intervals || [];
                                updateExpr(e.id, 'intervals', intervals.filter((_, i) => i !== idx));
                              }}
                              className="ml-1 hover:text-red-200"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {exprs.length < 5 && (
                <button onClick={addExpr} className="flex items-center gap-2 text-xs text-[#3B82F6] hover:text-[#60A5FA] transition-colors mt-1">
                  <Plus size={12} /> Add Expression
                </button>
              )}
            </GlassPanel>

            <GlassPanel title="View" accentColor="#06B6D4">
              <SliderRow label="X Min" value={xMin} min={-20} max={-0.1} onChange={setXMin} color="#06B6D4" />
              <SliderRow label="X Max" value={xMax} min={0.1} max={20} onChange={setXMax} color="#06B6D4" />
              <SliderRow label="Y Min" value={yMin} min={-20} max={-0.1} onChange={setYMin} color="#10B981" />
              <SliderRow label="Y Max" value={yMax} min={0.1} max={20} onChange={setYMax} color="#10B981" />
            </GlassPanel>

            <GlassPanel title="Points of Interest" accentColor="#F59E0B">
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input type="checkbox" checked={showRoots} onChange={e => setShowRoots(e.target.checked)} />
                <span className="w-3 h-3 rounded-full bg-[#10B981] inline-block" /> Roots (zeros)
              </label>
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input type="checkbox" checked={showExtrema} onChange={e => setShowExtrema(e.target.checked)} />
                <span className="w-3 h-3 rounded-full bg-[#F59E0B] inline-block" /> Maxima / Minima
              </label>
            </GlassPanel>

            <GlassPanel title="Quick Presets" accentColor="#10B981">
              {[
                { label: 'Sine Wave', expr: 'sin(x)' },
                { label: 'Parabola', expr: 'x^2 - 2' },
                { label: 'Cubic', expr: 'x^3 - 3*x' },
                { label: 'Quartic', expr: 'x^4 - 5*x^2 + 4' },
                { label: 'Exponential', expr: 'exp(x)' },
                { label: 'Natural Log', expr: 'log(x)' },
                { label: 'Butterfly', expr: 'sin(x)*cos(x/2)' },
                { label: 'Rational', expr: '1/(x^2+1)' },
                { label: 'Polynomial 5th', expr: 'x^5 - 3*x^3 + 2*x - 1' },
              ].map(p => (
                <button
                  key={p.label}
                  onClick={() => setExprs([{ id: idCounter++, expr: p.expr, color: COLORS[0], visible: true, showD1: false, showD2: false, intervals: [] }])}
                  className="text-left text-xs text-[var(--text-secondary)] hover:text-[#10B981] font-mono transition-colors py-0.5"
                >
                  {p.expr}
                </button>
              ))}
            </GlassPanel>
          </div>
        </div>
      )}
      <FunctionAnalyzer />
    </div>
  </MathContext.Provider>
  );
}

function drawCurve(
  ctx: CanvasRenderingContext2D,
  expr: string,
  color: string,
  lineWidth: number,
  xMin: number, xMax: number, yMin: number, yMax: number,
  w: number, h: number,
  dash: number[] = []
) {
  const pts = plotFunction(expr, xMin, xMax, 600);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(dash);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = lineWidth > 2 ? 8 : 3;
  ctx.beginPath();
  let penDown = false;
  for (const pt of pts) {
    if (isNaN(pt.y) || pt.y < yMin - 10 || pt.y > yMax + 10) {
      penDown = false;
      continue;
    }
    const { cx, cy } = worldToCanvas(pt.x, pt.y, xMin, xMax, yMin, yMax, w, h);
    if (!penDown) { ctx.moveTo(cx, cy); penDown = true; }
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();
  ctx.restore();
}

import TheorySection from '../components/ui/TheorySection';

function FunctionsTheorySection() {
  const lessons = [
    {
      id: 'functions-intro',
      title: 'Introduction to Functions',
      type: 'video' as const,
      duration: '8:45',
      difficulty: 'beginner' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=WUvTyaaNkzM',
        description: 'Functions are the building blocks of mathematics. In this comprehensive introduction, we explore what functions are, how they work, and why they\'re fundamental to understanding calculus and higher mathematics.',
        keyPoints: [
          'Functions map inputs to unique outputs',
          'Domain and range define function boundaries',
          'Function notation: f(x) represents the output',
          'Vertical line test for function validity',
          'Real-world applications of functions'
        ]
      }
    },
    {
      id: 'derivatives-fundamentals',
      title: 'Derivative Fundamentals',
      type: 'video' as const,
      duration: '12:30',
      difficulty: 'intermediate' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=9vKqVkMQHKk',
        description: 'The derivative represents the instantaneous rate of change and is one of the most powerful concepts in mathematics. This lesson explores the geometric interpretation and practical applications.',
        keyPoints: [
          'Derivative as the slope of the tangent line',
          'Limit definition of derivatives',
          'Physical interpretation: velocity and acceleration',
          'Economic applications: marginal cost and revenue',
          'Connection to optimization problems'
        ]
      }
    },
    {
      id: 'differentiation-rules',
      title: 'Differentiation Rules',
      type: 'text' as const,
      duration: '15 min read',
      difficulty: 'intermediate' as const,
      content: {
        html: `
          <h3>Master the Rules of Differentiation</h3>
          <p>Differentiation becomes powerful once you master the fundamental rules. These rules allow you to find derivatives of complex functions by breaking them down into simpler components.</p>
          
          <h4>The Power Rule</h4>
          <p>The most fundamental rule in calculus. For any function f(x) = xⁿ, the derivative is:</p>
          <blockquote>f'(x) = n·xⁿ⁻¹</blockquote>
          <p>This rule works for all real numbers n, including fractions and negative numbers.</p>
          
          <h4>The Sum and Difference Rules</h4>
          <p>When you have a sum or difference of functions, you can differentiate each term separately:</p>
          <blockquote>d/dx[f(x) ± g(x)] = f'(x) ± g'(x)</blockquote>
          
          <h4>The Product Rule</h4>
          <p>When multiplying two functions, the product rule states:</p>
          <blockquote>d/dx[f(x)·g(x)] = f'(x)·g(x) + f(x)·g'(x)</blockquote>
          <p>Remember: "first times derivative of second, plus second times derivative of first."</p>
          
          <h4>The Chain Rule</h4>
          <p>For composite functions f(g(x)), the chain rule is essential:</p>
          <blockquote>d/dx[f(g(x))] = f'(g(x))·g'(x)</blockquote>
          <p>This rule allows you to differentiate complex nested functions by working from the outside in.</p>
        `,
        formulas: [
          {
            expression: 'd/dx[xⁿ] = n·xⁿ⁻¹',
            description: 'Power Rule - The derivative of x to the power n'
          },
          {
            expression: 'd/dx[sin(x)] = cos(x)',
            description: 'Derivative of sine function'
          },
          {
            expression: 'd/dx[cos(x)] = -sin(x)',
            description: 'Derivative of cosine function'
          },
          {
            expression: 'd/dx[eˣ] = eˣ',
            description: 'Derivative of exponential function'
          }
        ]
      }
    },
    {
      id: 'function-analysis',
      title: 'Function Analysis and Behavior',
      type: 'video' as const,
      duration: '15:45',
      difficulty: 'advanced' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=PFDu9oVAE-g',
        description: 'Advanced function analysis using eigenvalues and eigenvectors. Explore how these powerful tools reveal the fundamental behavior of complex functions and transformations.',
        keyPoints: [
          'First derivative test for extrema',
          'Second derivative test for concavity',
          'Inflection points where concavity changes',
          'Critical points and their classification',
          'Applications to optimization problems'
        ]
      }
    },
    {
      id: 'applications',
      title: 'Real-World Applications',
      type: 'video' as const,
      duration: '10:15',
      difficulty: 'intermediate' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=N2PpRnFqnqY',
        description: 'See how functions and derivatives apply to real-world problems in physics, economics, engineering, and data science.',
        keyPoints: [
          'Physics: motion, velocity, and acceleration',
          'Economics: marginal analysis and optimization',
          'Engineering: rate of change in systems',
          'Medicine: drug concentration over time',
          'Machine Learning: gradient descent optimization'
        ]
      }
    }
  ];

  return (
    <TheorySection
      moduleId="functions"
      title="Functions & Calculus Fundamentals"
      description="Master the foundational concepts of functions, derivatives, and their applications. This comprehensive course covers everything from basic function notation to advanced calculus techniques used in real-world problem solving."
      lessons={lessons}
      color="#3B82F6"
    />
  );
}
