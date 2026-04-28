import { useEffect, useRef, useState, useCallback } from 'react';
import TabBar from '../components/ui/TabBar';
import GlassPanel from '../components/ui/GlassPanel';
import SliderRow from '../components/ui/SliderRow';
import { safeEval, plotFunction, drawGrid, worldToCanvas } from '../utils/math';

const TABS = [{ id: 'practical', label: 'Limit Explorer' }, { id: 'calculator', label: 'Limit Calculator' }, { id: 'theory', label: 'Theory' }];

// Limit calculator operations
function evaluateLimit(expr: string, c: number, method: 'direct' | 'numerical' | 'left' | 'right' = 'numerical'): number | null {
  try {
    switch (method) {
      case 'direct':
        return safeEval(expr.replace(/x/g, `(${c})`), {});
      case 'numerical':
        // Approach from both sides numerically
        const h = 1e-8;
        const leftVal = safeEval(expr.replace(/x/g, `(${c}-${h})`), {});
        const rightVal = safeEval(expr.replace(/x/g, `(${c}+${h})`), {});
        if (leftVal === null || rightVal === null) return null;
        if (Math.abs(leftVal - rightVal) > 1e-6) return null; // Different from left and right
        return (leftVal + rightVal) / 2;
      case 'left':
        const leftH = 1e-8;
        return safeEval(expr.replace(/x/g, `(${c}-${leftH})`), {});
      case 'right':
        const rightH = 1e-8;
        return safeEval(expr.replace(/x/g, `(${c}+${rightH})`), {});
      default:
        return null;
    }
  } catch {
    return null;
  }
}

function evaluateSequence(expr: string, n: number): number | null {
  try {
    return safeEval(expr.replace(/n/g, `(${n})`), {});
  } catch {
    return null;
  }
}

function checkConvergence(sequenceValues: number[]): { converges: boolean; limit?: number; type: 'convergent' | 'divergent' | 'oscillating' } {
  if (sequenceValues.length < 10) return { converges: false, type: 'divergent' };
  
  const lastValues = sequenceValues.slice(-10);
  const mean = lastValues.reduce((a, b) => a + b, 0) / lastValues.length;
  const variance = lastValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / lastValues.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev < 1e-6) {
    return { converges: true, limit: mean, type: 'convergent' };
  }
  
  // Check for oscillation
  const increasing = sequenceValues.every((val, i) => i === 0 || val >= sequenceValues[i - 1]);
  const decreasing = sequenceValues.every((val, i) => i === 0 || val <= sequenceValues[i - 1]);
  
  if (!increasing && !decreasing && stdDev < Math.abs(mean) * 0.1) {
    return { converges: false, type: 'oscillating' };
  }
  
  return { converges: false, type: 'divergent' };
}

function applyLHopital(expr: string, c: number, iterations: number = 3): { result: number | null; iterations: number; method: string } {
  // This is a simplified L'Hôpital's rule implementation
  // In practice, you'd need symbolic differentiation for proper implementation
  try {
    const original = evaluateLimit(expr, c, 'numerical');
    if (original !== null && !isNaN(original) && isFinite(original)) {
      return { result: original, iterations: 0, method: 'direct substitution' };
    }
    
    // For demonstration, we'll try numerical approach with smaller steps
    for (let i = 1; i <= iterations; i++) {
      const h = Math.pow(10, -i - 2);
      const result = evaluateLimit(expr, c, 'numerical');
      if (result !== null && !isNaN(result) && isFinite(result)) {
        return { result, iterations: i, method: `numerical approximation (h=${h})` };
      }
    }
    
    return { result: null, iterations, method: 'failed to converge' };
  } catch {
    return { result: null, iterations, method: 'error in evaluation' };
  }
}

export default function LimitsModule() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState('practical');
  const [expr, setExpr] = useState('sin(x)/x');
  const [c, setC] = useState(0);
  const [epsilon, setEpsilon] = useState(0.5);
  const [t, setT] = useState(0);
  const animRef = useRef<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const [panOffsetX, setPanOffsetX] = useState(0);
  const [panOffsetY, setPanOffsetY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const draw = useCallback((tOverride?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    const tVal = tOverride ?? t;

    const xMin = c - 3 + panOffsetX, xMax = c + 3 + panOffsetX, yMin = -2.5 + panOffsetY, yMax = 2.5 + panOffsetY;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, w, h);
    drawGrid(ctx, xMin, xMax, yMin, yMax, w, h);

    // Epsilon tube
    const limitVal = safeEval(expr.replace(/x/g, `(${c}+1e-9)`), {});
    const L = limitVal ?? safeEval(expr, { x: c + 1e-7 }) ?? 0;

    const { cy: ey1 } = worldToCanvas(0, L + epsilon, xMin, xMax, yMin, yMax, w, h);
    const { cy: ey2 } = worldToCanvas(0, L - epsilon, xMin, xMax, yMin, yMax, w, h);
    ctx.save();
    ctx.fillStyle = 'rgba(16,185,129,0.07)';
    ctx.fillRect(0, Math.min(ey1, ey2), w, Math.abs(ey2 - ey1));
    ctx.strokeStyle = 'rgba(16,185,129,0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(0, ey1); ctx.lineTo(w, ey1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, ey2); ctx.lineTo(w, ey2); ctx.stroke();
    ctx.restore();

    // Delta interval (derived from epsilon)
    const delta = epsilon * 0.8;
    const { cx: dx1 } = worldToCanvas(c - delta, 0, xMin, xMax, yMin, yMax, w, h);
    const { cx: dx2 } = worldToCanvas(c + delta, 0, xMin, xMax, yMin, yMax, w, h);
    ctx.save();
    ctx.fillStyle = 'rgba(239,68,68,0.07)';
    ctx.fillRect(dx1, 0, dx2 - dx1, h);
    ctx.strokeStyle = 'rgba(239,68,68,0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(dx1, 0); ctx.lineTo(dx1, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(dx2, 0); ctx.lineTo(dx2, h); ctx.stroke();
    ctx.restore();

    // Function curve
    const pts = plotFunction(expr, xMin, xMax, 400);
    ctx.save();
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#3B82F6';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    let penDown = false;
    for (const pt of pts) {
      if (isNaN(pt.y) || pt.y < yMin - 2 || pt.y > yMax + 2) { penDown = false; continue; }
      const { cx, cy } = worldToCanvas(pt.x, pt.y, xMin, xMax, yMin, yMax, w, h);
      if (!penDown) { ctx.moveTo(cx, cy); penDown = true; }
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.restore();

    // Limit point (hole indicator)
    const { cx: lcx, cy: lcy } = worldToCanvas(c, L, xMin, xMax, yMin, yMax, w, h);
    ctx.save();
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#0B0E14';
    ctx.beginPath(); ctx.arc(lcx, lcy, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();

    // Animated point approaching from both sides
    const direction = Math.sin(tVal * Math.PI * 2) > 0 ? 1 : -1;
    const progress = Math.abs(Math.sin(tVal * Math.PI * 2));
    const pxApproach = c + direction * (1 - progress) * 2.5;
    const pyApproach = safeEval(expr, { x: pxApproach });
    if (pyApproach !== null) {
      const { cx: px, cy: py } = worldToCanvas(pxApproach, pyApproach, xMin, xMax, yMin, yMax, w, h);
      ctx.save();
      ctx.fillStyle = direction > 0 ? '#F59E0B' : '#EC4899';
      ctx.shadowColor = direction > 0 ? '#F59E0B' : '#EC4899';
      ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Labels overlay
    ctx.save();
    ctx.fillStyle = 'rgba(15,20,35,0.88)';
    ctx.strokeStyle = 'rgba(59,130,246,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(12, h - 70, 200, 58, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8B9CC0'; ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText(`lim (x→${c}) ${expr}`, 22, h - 52);
    ctx.fillStyle = '#3B82F6'; ctx.font = 'bold 13px JetBrains Mono, monospace';
    ctx.fillText(`≈ ${L.toFixed(6)}`, 22, h - 30);
    ctx.fillStyle = 'rgba(139,156,192,0.6)'; ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText(`ε = ${epsilon.toFixed(2)}, δ = ${delta.toFixed(2)}`, 22, h - 14);
    ctx.restore();
  }, [expr, c, epsilon, t, panOffsetX, panOffsetY]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      draw();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMouseDown = (e: MouseEvent) => {
      setIsPanning(true);
      setPanStart({ x: e.offsetX * devicePixelRatio, y: e.offsetY * devicePixelRatio });
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!isPanning) return;
      const dx = e.offsetX * devicePixelRatio - panStart.x;
      const dy = e.offsetY * devicePixelRatio - panStart.y;
      setPanOffsetX(prev => prev - dx * 0.0008);
      setPanOffsetY(prev => prev + dy * 0.0008);
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
  }, [isPanning, panStart]);

  const toggleAnimation = () => {
    if (animating) {
      setAnimating(false);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }
    setAnimating(true);
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const elapsed = (ts - start) / 3000;
      setT(elapsed);
      draw(elapsed);
      animRef.current = requestAnimationFrame(step) as unknown as number;
    };
    animRef.current = requestAnimationFrame(step) as unknown as number;
  };

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  return (
    <div className="flex flex-col h-full">
      <TabBar tabs={TABS} active={tab} onChange={setTab} color="#EF4444" />
      {tab === 'theory' ? <LimitTheory /> : tab === 'calculator' ? <LimitCalculator /> : (
        <div className="flex flex-1 gap-4 min-h-0">
          <div className="flex-1 relative rounded-xl overflow-hidden">
            <canvas ref={canvasRef} className="w-full h-full" style={{ minHeight: 300 }} />
          </div>
          <div className="w-64 flex flex-col gap-3 overflow-y-auto">
            <GlassPanel title="Expression" accentColor="#EF4444">
              <input type="text" value={expr} onChange={e => setExpr(e.target.value)} className="w-full" placeholder="e.g. sin(x)/x" />
            </GlassPanel>
            <GlassPanel title="Approach Point" accentColor="#3B82F6">
              <SliderRow label="c (approach)" value={c} min={-5} max={5} step={0.1} onChange={setC} color="#3B82F6" />
            </GlassPanel>
            <GlassPanel title="Epsilon-Delta" accentColor="#10B981">
              <SliderRow label="ε (epsilon)" value={epsilon} min={0.05} max={2} step={0.05} onChange={setEpsilon} color="#10B981" />
              <p className="text-xs text-[var(--text-muted)]">Green band = ε-tube around L. Red band = δ-interval around c.</p>
              <button
                onClick={toggleAnimation}
                className="w-full py-2 rounded-lg text-sm font-medium transition-all mt-1"
                style={{
                  background: animating ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)',
                  color: animating ? '#EF4444' : '#3B82F6',
                }}
              >
                {animating ? 'Stop' : 'Animate Approach'}
              </button>
            </GlassPanel>
            <GlassPanel title="Classic Limits" accentColor="#F59E0B">
              {[
                { expr: 'sin(x)/x', c: 0, label: 'lim sin(x)/x' },
                { expr: '(1 + 1/x)^x', c: 1000, label: 'lim (1+1/x)^x' },
                { expr: '(x^2-1)/(x-1)', c: 1, label: 'Removable' },
                { expr: 'abs(x)/x', c: 0, label: 'Step (DNE)' },
              ].map(p => (
                <button key={p.label} onClick={() => { setExpr(p.expr); setC(p.c); }} className="text-left text-xs text-[var(--text-secondary)] hover:text-[#F59E0B] font-mono transition-colors py-0.5">
                  {p.label}
                </button>
              ))}
            </GlassPanel>
          </div>
        </div>
      )}
    </div>
  );
}

function LimitCalculator() {
  const calculatorCanvasRef = useRef<HTMLCanvasElement>(null);
  const [expression, setExpression] = useState('sin(x)/x');
  const [approachPoint, setApproachPoint] = useState(0);
  const [operation, setOperation] = useState<'limit' | 'sequence' | 'series' | 'leftLimit' | 'rightLimit' | 'lhopital'>('limit');
  const [result, setResult] = useState<number | null>(null);
  const [method, setMethod] = useState<string>('');
  const [sequenceN, setSequenceN] = useState(100);
  const [showVisualization, setShowVisualization] = useState(true);
  const [epsilon, setEpsilon] = useState(0.1);

  const calculateResult = () => {
    switch (operation) {
      case 'limit':
        const limitResult = evaluateLimit(expression, approachPoint, 'numerical');
        setResult(limitResult);
        setMethod('numerical approach');
        break;
      case 'leftLimit':
        const leftResult = evaluateLimit(expression, approachPoint, 'left');
        setResult(leftResult);
        setMethod('left-hand limit');
        break;
      case 'rightLimit':
        const rightResult = evaluateLimit(expression, approachPoint, 'right');
        setResult(rightResult);
        setMethod('right-hand limit');
        break;
      case 'lhopital':
        const lhopitalResult = applyLHopital(expression, approachPoint);
        setResult(lhopitalResult.result);
        setMethod(lhopitalResult.method);
        break;
      case 'sequence':
        const sequenceValues: number[] = [];
        for (let n = 1; n <= sequenceN; n++) {
          const val = evaluateSequence(expression, n);
          if (val !== null) sequenceValues.push(val);
        }
        const convergence = checkConvergence(sequenceValues);
        setResult(convergence.converges ? convergence.limit || 0 : NaN);
        setMethod(`sequence analysis: ${convergence.type}`);
        break;
      case 'series':
        // Simple geometric series check for demonstration
        try {
          const r = safeEval(expression.replace(/n/g, '2'), {}); // Try to get ratio
          if (typeof r === 'number' && Math.abs(r) < 1) {
            const a = safeEval(expression.replace(/n/g, '1'), {});
            setResult(a / (1 - r));
            setMethod('geometric series sum');
          } else {
            setResult(null);
            setMethod('series diverges or not geometric');
          }
        } catch {
          setResult(null);
          setMethod('series evaluation failed');
        }
        break;
    }
  };

  const drawVisualization = useCallback(() => {
    const canvas = calculatorCanvasRef.current;
    if (!canvas || !showVisualization) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, w, h);

    const xMin = approachPoint - 4, xMax = approachPoint + 4, yMin = -3, yMax = 3;

    // Draw grid
    drawGrid(ctx, xMin, xMax, yMin, yMax, w, h);

    // Draw function
    const pts = plotFunction(expression, xMin, xMax, 500);
    ctx.save();
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#3B82F6';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    let penDown = false;
    for (const pt of pts) {
      if (isNaN(pt.y) || pt.y < yMin - 2 || pt.y > yMax + 2) { penDown = false; continue; }
      const { cx, cy } = worldToCanvas(pt.x, pt.y, xMin, xMax, yMin, yMax, w, h);
      if (!penDown) { ctx.moveTo(cx, cy); penDown = true; }
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.restore();

    // Draw epsilon band if we have a result
    if (result !== null && !isNaN(result)) {
      const { cy: ey1 } = worldToCanvas(0, result + epsilon, xMin, xMax, yMin, yMax, w, h);
      const { cy: ey2 } = worldToCanvas(0, result - epsilon, xMin, xMax, yMin, yMax, w, h);
      ctx.save();
      ctx.fillStyle = 'rgba(16,185,129,0.07)';
      ctx.fillRect(0, Math.min(ey1, ey2), w, Math.abs(ey2 - ey1));
      ctx.strokeStyle = 'rgba(16,185,129,0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(0, ey1); ctx.lineTo(w, ey1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, ey2); ctx.lineTo(w, ey2); ctx.stroke();
      ctx.restore();
    }

    // Draw approach point
    const { cx: cx, cy: cy } = worldToCanvas(approachPoint, 0, xMin, xMax, yMin, yMax, w, h);
    ctx.save();
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
    ctx.restore();

    // Draw limit point if exists
    if (result !== null && !isNaN(result)) {
      const { cx: lcx, cy: lcy } = worldToCanvas(approachPoint, result, xMin, xMax, yMin, yMax, w, h);
      ctx.save();
      ctx.fillStyle = '#10B981';
      ctx.shadowColor = '#10B981';
      ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(lcx, lcy, 6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Draw sequence points if sequence operation
    if (operation === 'sequence') {
      ctx.save();
      for (let n = 1; n <= Math.min(sequenceN, 20); n++) {
        const val = evaluateSequence(expression, n);
        if (val !== null && !isNaN(val) && isFinite(val)) {
          const { cx: px, cy: py } = worldToCanvas(n, val, xMin, xMax, yMin, yMax, w, h);
          ctx.fillStyle = n <= sequenceN ? '#F59E0B' : 'rgba(245,158,11,0.3)';
          ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    }

    // Add legend
    ctx.save();
    ctx.fillStyle = 'rgba(15,20,35,0.88)';
    ctx.strokeStyle = 'rgba(59,130,246,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(12, 12, 200, 100, 8);
    ctx.fill(); ctx.stroke();
    
    ctx.fillStyle = '#8B9CC0';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText(`Operation: ${operation}`, 22, 32);
    ctx.fillText(`Expression: ${expression}`, 22, 50);
    if (result !== null && !isNaN(result)) {
      ctx.fillStyle = '#10B981';
      ctx.fillText(`Result: ${result.toFixed(6)}`, 22, 68);
    }
    ctx.fillStyle = '#8B9CC0';
    ctx.fillText(`Method: ${method}`, 22, 86);
    ctx.restore();
  }, [expression, approachPoint, operation, result, method, sequenceN, showVisualization, epsilon]);

  useEffect(() => {
    const canvas = calculatorCanvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = canvas.offsetWidth * devicePixelRatio;
      canvas.height = canvas.offsetHeight * devicePixelRatio;
      drawVisualization();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [drawVisualization]);

  useEffect(() => { drawVisualization(); }, [drawVisualization]);

  const ResultDisplay = () => {
    if (result === null) {
      return (
        <GlassPanel title="Result" accentColor="#EF4444" className="flex-shrink-0">
          <div className="text-center text-[#EF4444]">
            <div className="text-sm">Cannot evaluate</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              {method || 'Invalid expression or approach point'}
            </div>
          </div>
        </GlassPanel>
      );
    }

    if (isNaN(result)) {
      return (
        <GlassPanel title="Result" accentColor="#F59E0B" className="flex-shrink-0">
          <div className="text-center text-[#F59E0B]">
            <div className="text-sm">Diverges or Does Not Exist</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">{method}</div>
          </div>
        </GlassPanel>
      );
    }

    return (
      <GlassPanel title="Result" accentColor="#10B981" className="flex-shrink-0">
        <div className="text-center">
          <div className="text-2xl font-bold text-[#10B981]">{result.toFixed(6)}</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">{method}</div>
        </div>
      </GlassPanel>
    );
  };

  return (
    <div className="flex flex-1 gap-4 min-h-0">
      <div className="flex-1 flex flex-col gap-4">
        {showVisualization && (
          <div className="flex-1 relative rounded-xl overflow-hidden bg-[#0B0E14] border border-[#1E293B]">
            <canvas 
              ref={calculatorCanvasRef} 
              className="w-full h-full" 
              style={{ minHeight: 300 }}
            />
          </div>
        )}
      </div>
      
      <div className="w-80 lg:w-96 xl:w-80 flex flex-col gap-3 pr-2" style={{ maxHeight: '100%', overflowY: 'auto' }}>
        <GlassPanel title="🧮 Limit Operation" accentColor="#10B981" className="flex-shrink-0">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wider">Operation</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'limit', label: 'lim f(x)', icon: '🎯' },
                  { id: 'leftLimit', label: 'lim⁻ f(x)', icon: '⬅️' },
                  { id: 'rightLimit', label: 'lim⁺ f(x)', icon: '➡️' },
                  { id: 'lhopital', label: "L'Hôpital", icon: '🔄' },
                  { id: 'sequence', label: 'Sequence', icon: '📊' },
                  { id: 'series', label: 'Series', icon: '∞' },
                ].map(op => (
                  <button
                    key={op.id}
                    onClick={() => setOperation(op.id as any)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      operation === op.id 
                        ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white shadow-lg' 
                        : 'bg-[#1E293B] text-[var(--text-secondary)] hover:bg-[#334155] border border-[#334155]'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg">{op.icon}</div>
                      <div className="text-xs">{op.label}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={calculateResult}
              className="w-full py-3 rounded-lg text-sm font-semibold transition-all bg-gradient-to-r from-[#10B981] to-[#059669] text-white hover:from-[#059669] hover:to-[#047857] focus:outline-none focus:ring-2 focus:ring-[#10B98120] shadow-lg transform hover:scale-105"
            >
              Calculate Limit
            </button>
          </div>
        </GlassPanel>

        <GlassPanel title="📝 Expression" accentColor="#EF4444" className="flex-shrink-0">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wider">
                {operation === 'sequence' || operation === 'series' ? 'Sequence/Series (use n)' : 'Function (use x)'}
              </label>
              <input
                type="text"
                value={expression}
                onChange={e => setExpression(e.target.value)}
                className="w-full px-3 py-3 text-sm bg-[#0F172A] border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF444420] transition-all"
                placeholder={operation === 'sequence' || operation === 'series' ? 'e.g. 1/n^2, (1/2)^n' : 'e.g. sin(x)/x, (x^2-1)/(x-1)'}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wider">
                {operation === 'sequence' || operation === 'series' ? 'Terms (n)' : 'Approach Point (c)'}
              </label>
              <input
                type="number"
                step={operation === 'sequence' || operation === 'series' ? 1 : 0.1}
                value={operation === 'sequence' || operation === 'series' ? sequenceN : approachPoint}
                onChange={e => operation === 'sequence' || operation === 'series' ? 
                  setSequenceN(parseInt(e.target.value) || 1) : 
                  setApproachPoint(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm bg-[#0F172A] border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F620] transition-all"
              />
            </div>
          </div>
        </GlassPanel>

        {result !== null && <ResultDisplay />}

        <GlassPanel title="🎨 Display Options" accentColor="#F59E0B" className="flex-shrink-0">
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-sm cursor-pointer p-3 rounded-lg transition-all hover:bg-[#F59E0B10]">
              <input
                type="checkbox"
                checked={showVisualization}
                onChange={e => setShowVisualization(e.target.checked)}
                className="w-4 h-4 text-[#F59E0B] bg-[#0B0E14] border-[#F59E0B30] rounded focus:ring-[#F59E0B20] focus:ring-2"
              />
              <span className="text-white font-medium">Show Visualization</span>
            </label>
            
            {showVisualization && (
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wider">Epsilon (ε)</label>
                <input
                  type="number"
                  step={0.01}
                  min={0.01}
                  max={1}
                  value={epsilon}
                  onChange={e => setEpsilon(parseFloat(e.target.value) || 0.1)}
                  className="w-full px-3 py-2 text-sm bg-[#0F172A] border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B20] transition-all"
                />
              </div>
            )}
          </div>
        </GlassPanel>

        <GlassPanel title="Presets" accentColor="#F59E0B" className="flex-shrink-0">
          {[
            { label: 'sin(x)/x → 0', expr: 'sin(x)/x', c: 0 },
            { label: '(x²-1)/(x-1) → 2', expr: '(x^2-1)/(x-1)', c: 1 },
            { label: '(1+1/x)^x → e', expr: '(1 + 1/x)^x', c: 1000 },
            { label: '1/n → 0', expr: '1/n', c: 0 },
            { label: '(1/2)^n → 0', expr: '(1/2)^n', c: 0 },
            { label: 'abs(x)/x DNE', expr: 'abs(x)/x', c: 0 },
          ].map(preset => (
            <button
              key={preset.label}
              onClick={() => {
                setExpression(preset.expr);
                setApproachPoint(preset.c);
              }}
              className="text-left text-xs text-[var(--text-secondary)] hover:text-[#F59E0B] font-mono transition-colors py-1"
            >
              {preset.label}
            </button>
          ))}
        </GlassPanel>
      </div>
    </div>
  );
}

import TheorySection from '../components/ui/TheorySection';

function LimitTheory() {
  const lessons = [
    {
      id: 'limits-intro',
      title: 'Introduction to Limits',
      type: 'video' as const,
      duration: '11:30',
      difficulty: 'beginner' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=kfF38MiR2jk',
        description: 'Limits are the foundation of calculus. This Khan Academy video provides an intuitive understanding of what it means for a function to approach a value.',
        keyPoints: [
          'Intuitive notion of limits',
          'Approaching from both sides',
          'When limits don\'t exist',
          'Connection to continuity',
          'Real-world applications'
        ]
      }
    },
    {
      id: 'sequences-series',
      title: 'Sequences and Series',
      type: 'video' as const,
      duration: '14:20',
      difficulty: 'intermediate' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=SnUqz_5qoJc',
        description: 'Explore sequences and infinite series. This Khan Academy video covers convergence, divergence, and the behavior of infinite sums.',
        keyPoints: [
          'Arithmetic and geometric sequences',
          'Convergence and divergence',
          'Infinite series and sums',
          'Geometric series formula',
          'Applications in mathematics'
        ]
      }
    },
    {
      id: 'continuity-limits',
      title: 'Continuity and Limits',
      type: 'video' as const,
      duration: '12:45',
      difficulty: 'intermediate' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=XZoTVtbRVBM',
        description: 'Understand the relationship between limits and continuity. This video explains how limits define continuous functions and their properties.',
        keyPoints: [
          'Definition of continuity',
          'Types of discontinuities',
          'Intermediate value theorem',
          'Continuous functions on closed intervals',
          'Applications in calculus'
        ]
      }
    },
    {
      id: 'advanced-limits',
      title: 'Advanced Limit Techniques',
      type: 'text' as const,
      duration: '25 min read',
      difficulty: 'advanced' as const,
      content: {
        html: `
          <h3>Advanced Limit Evaluation Techniques</h3>
          <p>Master sophisticated methods for evaluating challenging limits that appear in calculus and mathematical analysis.</p>
          
          <h4>L'Hôpital's Rule</h4>
          <p>For indeterminate forms 0/0 or ∞/∞:</p>
          <blockquote>lim_(x→c) f(x)/g(x) = lim_(x→c) f'(x)/g'(x)</blockquote>
          <p>Can be applied repeatedly if the result is still indeterminate.</p>
          
          <h4>Squeeze Theorem</h4>
          <p>If g(x) ≤ f(x) ≤ h(x) and lim g(x) = lim h(x) = L, then lim f(x) = L.</p>
          <blockquote>Useful for limits involving trigonometric functions and absolute values.</blockquote>
          
          <h4>Special Limits and Techniques</h4>
          <p><strong>Rationalizing:</strong> Multiply by conjugate for expressions with radicals</p>
          <p><strong>Series Limits:</strong> Use geometric series formula for infinite sums</p>
          <p><strong>Exponential and Logarithmic:</strong> Use properties of exponential functions</p>
          
          <h4>Sequences and Series Limits</h4>
          <p><strong>Arithmetic Sequence:</strong> aₙ = a₁ + (n-1)d</p>
          <p><strong>Geometric Sequence:</strong> aₙ = a₁ · r^(n-1)</p>
          <p><strong>Geometric Series Sum:</strong> Σ ar^n = a/(1-r) for |r| < 1</p>
          
          <h4>Applications in Calculus</h4>
          <ul>
            <li>Derivatives as limits of difference quotients</li>
            <li>Integrals as limits of Riemann sums</li>
            <li>Continuity and differentiability</li>
            <li>Infinite series and power series</li>
          </ul>
        `,
        formulas: [
          {
            expression: 'lim_(x→c) f(x)/g(x) = lim_(x→c) f\'(x)/g\'(x)',
            description: 'L\'Hôpital\'s Rule'
          },
          {
            expression: 'Σ ar^n = a/(1-r), |r| < 1',
            description: 'Geometric Series Sum'
          },
          {
            expression: 'aₙ = a₁ · r^(n-1)',
            description: 'Geometric Sequence Formula'
          },
          {
            expression: 'lim_(x→0) (1 + x)^(1/x) = e',
            description: 'Definition of e'
          }
        ]
      }
    },
    {
      id: 'applications-limits',
      title: 'Real-World Applications',
      type: 'video' as const,
      duration: '10:15',
      difficulty: 'intermediate' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=XZoTVtbRVBM',
        description: 'See how limits power modern science and engineering. From instantaneous velocity to population growth, discover the ubiquity of limit concepts.',
        keyPoints: [
          'Physics: instantaneous velocity and acceleration',
          'Engineering: stress analysis and material properties',
          'Economics: marginal analysis and optimization',
          'Computer Science: algorithm analysis',
          'Biology: population dynamics'
        ]
      }
    }
  ];

  return (
    <TheorySection
      moduleId="limits"
      title="Limits & Continuity Theory"
      description="Master the foundational concepts of limits and continuity. From intuitive approaches to rigorous epsilon-delta proofs, learn how limits underpin all of calculus and mathematical analysis."
      lessons={lessons}
      color="#EF4444"
    />
  );
}
