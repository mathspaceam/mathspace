import { useEffect, useRef, useState, useCallback } from 'react';
import GlassPanel from '../components/ui/GlassPanel';
import SliderRow from '../components/ui/SliderRow';
import TabBar from '../components/ui/TabBar';
import { safeEval, drawGrid, worldToCanvas, plotFunction, numericalIntegral, calculateIntegral, drawIntegralArea, drawIntegralSolution, IntegralResult, IntegralSolution, IntegralStep } from '../utils/math';

const TABS = [{ id: 'practical', label: 'Riemann Lab' }, { id: 'calculator', label: 'Integral Calculator' }, { id: 'theory', label: 'Theory' }];
type SumType = 'left' | 'right' | 'midpoint';
type IntegralMethod = 'numerical' | 'trapezoidal' | 'simpson';

export default function IntegralsModule() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState('practical');
  const [expr, setExpr] = useState('sin(x)');
  const [a, setA] = useState(0);
  const [b, setB] = useState(3.14159);
  const [n, setN] = useState(8);
  const [sumType, setSumType] = useState<SumType>('midpoint');
  const [animating, setAnimating] = useState(false);
  const animRef = useRef<number | null>(null);
  const [animN, setAnimN] = useState(8);
  const [panOffsetX, setPanOffsetX] = useState(0);
  const [panOffsetY, setPanOffsetY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Integral Calculator state
  const [integralExpr, setIntegralExpr] = useState('sin(x)');
  const [integralA, setIntegralA] = useState(0);
  const [integralB, setIntegralB] = useState(3.14159);
  const [integralType, setIntegralType] = useState<'definite' | 'indefinite'>('definite');
  const [integralResult, setIntegralResult] = useState<IntegralResult | null>(null);
  const [showIntegralArea, setShowIntegralArea] = useState(true);
  const [showAntiderivative, setShowAntiderivative] = useState(false);

  const calculateIntegralResult = useCallback(() => {
    const result = calculateIntegral(integralExpr, integralA, integralB, integralType === 'definite' ? 'numerical' : 'indefinite');
    setIntegralResult(result);
  }, [integralExpr, integralA, integralB, integralType]);

  const drawIntegral = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;

    // For indefinite integrals, use a default range
    const hasBounds = integralType === 'definite' && integralA !== undefined && integralB !== undefined;
    const displayA = hasBounds ? integralA : -2;
    const displayB = hasBounds ? integralB : 2;
    
    const xRange = Math.max(displayB - displayA, 0.1) * 1.5;
    const xMin = (displayA + displayB) / 2 - xRange + panOffsetX;
    const xMax = (displayA + displayB) / 2 + xRange + panOffsetX;

    // y range from function
    const pts = plotFunction(integralExpr, xMin, xMax, 300);
    const ys = pts.map(p => p.y).filter(y => isFinite(y) && !isNaN(y));
    const yPad = 1;
    const yMin = Math.min(-0.5, ...(ys.length ? [Math.min(...ys)] : [-2])) - yPad + panOffsetY;
    const yMax = Math.max(0.5, ...(ys.length ? [Math.max(...ys)] : [2])) + yPad + panOffsetY;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, w, h);
    drawGrid(ctx, xMin, xMax, yMin, yMax, w, h);

    // Draw function curve
    ctx.save();
    ctx.strokeStyle = '#06B6D4';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#06B6D4';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    let penDown = false;
    for (const pt of pts) {
      if (isNaN(pt.y) || pt.y < yMin - 5 || pt.y > yMax + 5) { penDown = false; continue; }
      const { cx, cy } = worldToCanvas(pt.x, pt.y, xMin, xMax, yMin, yMax, w, h);
      if (!penDown) { ctx.moveTo(cx, cy); penDown = true; }
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.restore();

    // Draw integral area if enabled and we have bounds
    if (showIntegralArea && hasBounds) {
      drawIntegralArea(ctx, integralExpr, integralA, integralB, xMin, xMax, yMin, yMax, w, h);
    }

    // Draw antiderivative solution if enabled and we have a solution
    if (showAntiderivative && integralResult?.solution) {
      drawIntegralSolution(
        ctx, 
        integralExpr, 
        integralResult.solution.antiderivative, 
        integralA, 
        integralB, 
        xMin, 
        xMax, 
        yMin, 
        yMax, 
        w, 
        h, 
        true
      );
    }

    // Boundary markers for definite integrals
    if (hasBounds) {
      for (const bnd of [integralA, integralB]) {
        const { cx } = worldToCanvas(bnd, 0, xMin, xMax, yMin, yMax, w, h);
        ctx.save();
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
        ctx.restore();
      }
    }
  }, [integralExpr, integralType, integralA, integralB, showIntegralArea, showAntiderivative, integralResult, panOffsetX, panOffsetY]);

  const draw = useCallback((nOverride?: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    const rectN = nOverride ?? n;

    const xRange = Math.max(b - a, 0.1) * 1.5;
    const xMin = (a + b) / 2 - xRange + panOffsetX;
    const xMax = (a + b) / 2 + xRange + panOffsetX;

    // y range from function
    const pts = plotFunction(expr, xMin, xMax, 300);
    const ys = pts.map(p => p.y).filter(y => isFinite(y) && !isNaN(y));
    const yPad = 1;
    const yMin = Math.min(-0.5, ...(ys.length ? [Math.min(...ys)] : [-2])) - yPad + panOffsetY;
    const yMax = Math.max(0.5, ...(ys.length ? [Math.max(...ys)] : [2])) + yPad + panOffsetY;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, w, h);
    drawGrid(ctx, xMin, xMax, yMin, yMax, w, h);

    // Draw Riemann rectangles
    const dx = (b - a) / rectN;
    for (let i = 0; i < rectN; i++) {
      let evalX: number;
      if (sumType === 'left') evalX = a + i * dx;
      else if (sumType === 'right') evalX = a + (i + 1) * dx;
      else evalX = a + (i + 0.5) * dx;

      const fy = safeEval(expr, { x: evalX }) ?? 0;
      const { cx: rx } = worldToCanvas(a + i * dx, 0, xMin, xMax, yMin, yMax, w, h);
      const { cx: rx2 } = worldToCanvas(a + (i + 1) * dx, 0, xMin, xMax, yMin, yMax, w, h);
      const { cy: ry0 } = worldToCanvas(0, 0, xMin, xMax, yMin, yMax, w, h);
      const { cy: ry } = worldToCanvas(0, fy, xMin, xMax, yMin, yMax, w, h);

      const rw = Math.max(1, rx2 - rx - 1);
      const rh = ry0 - ry;

      ctx.fillStyle = fy >= 0 ? 'rgba(59,130,246,0.3)' : 'rgba(239,68,68,0.3)';
      ctx.strokeStyle = fy >= 0 ? 'rgba(59,130,246,0.8)' : 'rgba(239,68,68,0.8)';
      ctx.lineWidth = 1;
      ctx.fillRect(rx, Math.min(ry, ry0), rw, Math.abs(rh));
      ctx.strokeRect(rx, Math.min(ry, ry0), rw, Math.abs(rh));
    }

    // Draw function curve
    ctx.save();
    ctx.strokeStyle = '#06B6D4';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#06B6D4';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    let penDown = false;
    for (const pt of pts) {
      if (isNaN(pt.y) || pt.y < yMin - 5 || pt.y > yMax + 5) { penDown = false; continue; }
      const { cx, cy } = worldToCanvas(pt.x, pt.y, xMin, xMax, yMin, yMax, w, h);
      if (!penDown) { ctx.moveTo(cx, cy); penDown = true; }
      else ctx.lineTo(cx, cy);
    }
    ctx.stroke();
    ctx.restore();

    // Boundary markers
    for (const bnd of [a, b]) {
      const { cx } = worldToCanvas(bnd, 0, xMin, xMax, yMin, yMax, w, h);
      ctx.save();
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
      ctx.restore();
    }

    // Result overlay
    const area = numericalIntegral(expr, a, b, Math.max(rectN, 100));
    ctx.save();
    ctx.fillStyle = 'rgba(15,20,35,0.85)';
    ctx.strokeStyle = 'rgba(59,130,246,0.4)';
    ctx.lineWidth = 1;
    roundRect(ctx, w - 160, 12, 148, 50, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#8B9CC0';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText(`n = ${rectN}`, w - 150, 32);
    ctx.fillStyle = '#3B82F6';
    ctx.font = 'bold 13px JetBrains Mono, monospace';
    ctx.fillText(`∫ ≈ ${area.toFixed(6)}`, w - 150, 52);
    ctx.restore();
  }, [expr, a, b, n, sumType, panOffsetX, panOffsetY]);

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
      // Use a lower pan factor for smoother dragging
      setPanOffsetX(prev => prev - dx * 0.0008);
      setPanOffsetY(prev => prev + dy * 0.0008); // y inverted
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

  const startAnimation = () => {
    if (animating) {
      setAnimating(false);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }
    setAnimating(true);
    let cur = 2;
    const step = () => {
      setAnimN(cur);
      draw(cur);
      cur = Math.min(cur + (cur < 20 ? 1 : cur < 50 ? 2 : cur < 100 ? 5 : 10), 200);
      if (cur <= 200) {
        animRef.current = requestAnimationFrame(step) as unknown as number;
      } else {
        setAnimating(false);
        setAnimN(n);
      }
    };
    animRef.current = requestAnimationFrame(step) as unknown as number;
  };

  useEffect(() => {
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  useEffect(() => {
    if (tab === 'practical') {
      draw();
    } else if (tab === 'calculator') {
      drawIntegral();
    }
  }, [tab, expr, a, b, n, sumType, integralExpr, integralType, integralA, integralB, showIntegralArea, showAntiderivative, draw, drawIntegral]);

  useEffect(() => {
    if (tab === 'calculator') {
      drawIntegral();
    }
  }, [integralResult, drawIntegral]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (tab === 'calculator') {
        drawIntegral();
      } else if (tab === 'practical') {
        draw();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [tab, draw, drawIntegral]);

  return (
    <div className="flex flex-col h-full">
      <TabBar tabs={TABS} active={tab} onChange={setTab} color="#06B6D4" />
      {tab === 'theory' ? <IntegralTheory /> : tab === 'calculator' ? (
        <div className="flex flex-col lg:flex-row flex-1 gap-4 min-h-0">
          <div className="flex-1 relative rounded-xl overflow-hidden bg-[#0B0E14] border border-[#1E293B] min-h-0">
            <canvas 
              ref={canvasRef} 
              className="w-full h-full" 
              style={{ minHeight: 400, maxHeight: '100%' }}
              width={800}
              height={400}
            />
          </div>
          <div className="w-full lg:w-80 xl:w-96 flex flex-col gap-3 pr-2 max-h-96 lg:max-h-none overflow-y-auto">
            <GlassPanel title="🧮 Integral Calculator" accentColor="#10B981" className="flex-shrink-0">
              <div className="space-y-4">
                {/* Function Input */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wider">Function f(x)</label>
                  <input 
                    type="text" 
                    value={integralExpr} 
                    onChange={e => setIntegralExpr(e.target.value)} 
                    className="w-full px-3 py-3 text-sm bg-[#0F172A] border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B98120] transition-all" 
                    placeholder="e.g. sin(x), x^2, 1/x, e^x, sqrt(x)" 
                  />
                </div>
                
                {/* Integral Type Selection */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wider">Integral Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setIntegralType('definite')}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        integralType === 'definite' 
                          ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-white shadow-lg' 
                          : 'bg-[#1E293B] text-[var(--text-secondary)] hover:bg-[#334155] border border-[#334155]'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-lg mb-1">🎯</div>
                        <div className="text-xs">Definite Integral</div>
                        <div className="text-xs text-[var(--text-muted)] mt-1">∫[a,b] f(x) dx</div>
                      </div>
                    </button>
                    <button
                      onClick={() => setIntegralType('indefinite')}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        integralType === 'indefinite' 
                          ? 'bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white shadow-lg' 
                          : 'bg-[#1E293B] text-[var(--text-secondary)] hover:bg-[#334155] border border-[#334155]'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-lg mb-1">∫</div>
                        <div className="text-xs text-[var(--text-muted)] mt-1">Indefinite Integral</div>
                        <div className="text-xs text-[var(--text-muted)] mt-1">∫ f(x) dx</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Bounds for Definite Integral */}
                {integralType === 'definite' && (
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wider">Integration Bounds</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-[var(--text-muted)] mb-1">Lower Bound (a)</label>
                        <input
                          type="number"
                          value={integralA}
                          onChange={e => setIntegralA(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 text-sm bg-[#0F172A] border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F620] transition-all"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--text-muted)] mb-1">Upper Bound (b)</label>
                        <input
                          type="number"
                          value={integralB}
                          onChange={e => setIntegralB(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 text-sm bg-[#0F172A] border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:border-[#06B6D4] focus:ring-2 focus:ring-[#06B6D420] transition-all"
                          step="0.1"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Calculate Button */}
                <button
                  onClick={calculateIntegralResult}
                  className="w-full py-3.5 rounded-lg text-sm font-semibold transition-all bg-gradient-to-r from-[#10B981] to-[#059669] text-white hover:from-[#059669] hover:to-[#047857] focus:outline-none focus:ring-2 focus:ring-[#10B98120] shadow-lg transform hover:scale-105 mb-4"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span>{integralType === 'definite' ? '🎯' : '∫'}</span>
                    <span>{integralType === 'definite' ? 'Calculate Definite Integral' : 'Find Antiderivative'}</span>
                  </div>
                </button>
              </div>
            </GlassPanel>

            <GlassPanel title="🎨 Display Options" accentColor="#F59E0B" className="flex-shrink-0">
              <div className="space-y-4">
                <label className="flex items-center gap-3 text-sm cursor-pointer p-3 rounded-lg transition-all hover:bg-[#F59E0B10]">
                  <input
                    type="checkbox"
                    checked={showIntegralArea}
                    onChange={e => setShowIntegralArea(e.target.checked)}
                    className="w-4 h-4 text-[#F59E0B] bg-[#0B0E14] border-[#F59E0B30] rounded focus:ring-[#F59E0B20] focus:ring-2"
                  />
                  <span className="text-white font-medium">Show Integral Area</span>
                </label>
                
                <label className={`flex items-center gap-3 text-sm cursor-pointer p-3 rounded-lg transition-all ${
                  !integralResult?.solution ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#F59E0B10]'
                }`}>
                  <input
                    type="checkbox"
                    checked={showAntiderivative}
                    onChange={e => setShowAntiderivative(e.target.checked)}
                    className="w-4 h-4 text-[#F59E0B] bg-[#0B0E14] border-[#F59E0B30] rounded focus:ring-[#F59E0B20] focus:ring-2"
                    disabled={!integralResult?.solution}
                  />
                  <span className={`${!integralResult?.solution ? 'text-[var(--text-muted)]' : 'text-white font-medium'}`}>
                    Show Antiderivative Graph
                  </span>
                </label>
              </div>
            </GlassPanel>

            {integralResult && integralResult.solution && (
              <GlassPanel title="📚 PhotoMath-Style Solution" accentColor="#06B6D4" className="flex-shrink-0">
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {integralResult.solution.steps.map((step, index) => (
                    <div 
                      key={index} 
                      className={`relative transition-all duration-300 ${
                        step.highlighted 
                          ? 'bg-gradient-to-r from-[#06B6D415] to-[#3B82F615] border-l-4 border-[#06B6D4] shadow-lg shadow-[#06B6D420]' 
                          : step.type === 'rule' 
                            ? 'bg-[#1E293B] border-l-4 border-[#3B82F6]'
                            : step.type === 'integration'
                              ? 'bg-[#1E293B] border-l-4 border-[#10B981]'
                              : step.type === 'simplification'
                                ? 'bg-[#1E293B] border-l-4 border-[#F59E0B]'
                                : step.type === 'result'
                                  ? 'bg-gradient-to-r from-[#10B98115] to-[#06B6D415] border-l-4 border-[#10B981]'
                                  : 'bg-[#1E293B] border-l-4 border-[#EF4444]'
                      }`}
                    >
                      {/* Step Number Badge */}
                      <div className="absolute -top-2 -left-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${
                          step.type === 'rule' 
                            ? 'bg-gradient-to-br from-[#3B82F6] to-[#2563EB] text-white'
                            : step.type === 'integration'
                              ? 'bg-gradient-to-br from-[#10B981] to-[#059669] text-white'
                              : step.type === 'simplification'
                                ? 'bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-white'
                                : step.type === 'result'
                                  ? 'bg-gradient-to-br from-[#10B981] to-[#06B6D4] text-white'
                                  : 'bg-gradient-to-br from-[#EF4444] to-[#DC2626] text-white'
                        }`}>
                          {index + 1}
                        </div>
                      </div>
                      
                      {/* Step Content */}
                      <div className="pl-8 pr-4 py-4">
                        {/* Step Title */}
                        <div className="font-bold text-base text-white mb-3 leading-tight">
                          {step.description}
                        </div>
                        
                        {/* Mathematical Expression */}
                        <div className="mb-3">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-[#06B6D420] to-[#3B82F620] rounded-lg blur-sm"></div>
                            <div className="relative font-mono text-sm text-[#06B6D4] p-3 bg-[#0F172A] border border-[#334155] rounded-lg break-all leading-relaxed">
                              {step.expression}
                            </div>
                          </div>
                        </div>
                        
                        {/* Explanation */}
                        <div className="text-sm text-[#CBD5E1] leading-relaxed space-y-2">
                          <div className="flex items-start gap-2">
                            <span className="text-[#94A3B8] mt-0.5">💡</span>
                            <span>{step.explanation}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Final Results Section */}
                <div className="mt-4 pt-4 border-t-2 border-[#334155]">
                  <div className="space-y-3">
                    {/* Method Used */}
                    <div className="bg-[#1E293B] p-3 rounded-lg border border-[#334155]">
                      <div className="text-xs font-semibold text-[#94A3B8] mb-1 uppercase tracking-wider">Method Used</div>
                      <div className="text-sm font-medium text-white">{integralResult.solution.method}</div>
                    </div>
                    
                    {/* Antiderivative Result */}
                    <div className="bg-gradient-to-r from-[#10B98110] to-[#06B6D410] p-4 rounded-lg border border-[#10B98130]">
                      <div className="text-xs font-semibold text-[#94A3B8] mb-2 uppercase tracking-wider">✅ Final Antiderivative</div>
                      <div className="font-mono text-base text-[#10B981] leading-relaxed">
                        {integralResult.solution.antiderivative}
                      </div>
                    </div>
                    
                    {/* Definite Integral Result */}
                    {integralResult.solution.definiteValue !== undefined && (
                      <div className="bg-gradient-to-r from-[#06B6D410] to-[#3B82F610] p-4 rounded-lg border border-[#06B6D430]">
                        <div className="text-xs font-semibold text-[#94A3B8] mb-2 uppercase tracking-wider">🎯 Definite Integral Value</div>
                        <div className="font-mono text-lg text-white leading-relaxed">
                          {integralResult.solution.definiteValue.toFixed(6)}
                        </div>
                        <div className="text-xs text-[#94A3B8] mt-1">
                          from {integralResult.solution.bounds?.a} to {integralResult.solution.bounds?.b}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </GlassPanel>
            )}

            <GlassPanel title="Presets" accentColor="#F59E0B">
              {[
                { label: 'π Area', expr: 'sin(x)', a: 0, b: 3.14159 },
                { label: 'Bell Curve', expr: 'exp(-x^2)', a: -3, b: 3 },
                { label: 'Parabola', expr: 'x^2', a: 0, b: 2 },
                { label: 'Cubic', expr: 'x^3', a: 0, b: 2 },
                { label: '1/x', expr: '1/x', a: 1, b: 5 },
                { label: 'sqrt(x)', expr: 'sqrt(x)', a: 0, b: 4 },
              ].map(p => (
                <button
                  key={p.label}
                  onClick={() => { 
                    setIntegralExpr(p.expr); 
                    setIntegralA(p.a); 
                    setIntegralB(p.b); 
                  }}
                  className="text-left text-xs text-[var(--text-secondary)] hover:text-[#F59E0B] font-mono transition-colors py-0.5"
                >
                  {p.expr} [{p.a.toFixed(2)}, {p.b.toFixed(2)}]
                </button>
              ))}
            </GlassPanel>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 gap-4 min-h-0">
          <div className="flex-1 relative rounded-xl overflow-hidden">
            <canvas ref={canvasRef} className="w-full h-full" style={{ minHeight: 300 }} />
          </div>
          <div className="w-64 flex flex-col gap-3 overflow-y-auto">
            <GlassPanel title="Function" accentColor="#06B6D4">
              <input type="text" value={expr} onChange={e => setExpr(e.target.value)} className="w-full text-sm" placeholder="e.g. sin(x)" />
            </GlassPanel>

            <GlassPanel title="Bounds" accentColor="#3B82F6">
              <SliderRow label="Lower bound (a)" value={a} min={-10} max={b - 0.1} onChange={setA} color="#3B82F6" />
              <SliderRow label="Upper bound (b)" value={b} min={a + 0.1} max={10} onChange={setB} color="#06B6D4" />
            </GlassPanel>

            <GlassPanel title="Riemann Sum" accentColor="#10B981">
              <div className="flex gap-2">
                {(['left', 'right', 'midpoint'] as SumType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setSumType(t)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                    style={{
                      background: sumType === t ? '#10B98125' : 'rgba(255,255,255,0.05)',
                      color: sumType === t ? '#10B981' : 'var(--text-secondary)',
                      border: sumType === t ? '1px solid #10B98140' : '1px solid transparent',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <SliderRow label={`Rectangles (n = ${animating ? animN : n})`} value={n} min={1} max={100} step={1} onChange={setN} color="#10B981" />
              <button
                onClick={startAnimation}
                className="w-full py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: animating ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                  color: animating ? '#EF4444' : '#10B981',
                  border: `1px solid ${animating ? '#EF444440' : '#10B98140'}`,
                }}
              >
                {animating ? 'Stop' : 'Animate n → ∞'}
              </button>
            </GlassPanel>

            <GlassPanel title="Presets" accentColor="#F59E0B">
              {[
                { label: 'π Area', expr: 'sin(x)', a: 0, b: 3.14159 },
                { label: 'Bell Curve', expr: 'exp(-x^2)', a: -3, b: 3 },
                { label: 'Log', expr: 'log(x+1)', a: 0, b: 4 },
                { label: 'Cubic', expr: 'x^3-3*x', a: -2, b: 2 },
              ].map(p => (
                <button
                  key={p.label}
                  onClick={() => { setExpr(p.expr); setA(p.a); setB(p.b); }}
                  className="text-left text-xs text-[var(--text-secondary)] hover:text-[#F59E0B] font-mono transition-colors py-0.5"
                >
                  {p.expr} [{p.a.toFixed(2)}, {p.b.toFixed(2)}]
                </button>
              ))}
            </GlassPanel>
          </div>
        </div>
      )}
    </div>
  );
}

import TheorySection from '../components/ui/TheorySection';

function IntegralTheory() {
  const lessons = [
    {
      id: 'integrals-intro',
      title: 'Introduction to Integration',
      type: 'video' as const,
      duration: '9:20',
      difficulty: 'beginner' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=WUvTyaaNkzM',
        description: 'Integration is the inverse operation of differentiation. This comprehensive introduction explores how integration helps us find areas, volumes, and accumulated quantities.',
        keyPoints: [
          'Integration as the reverse of differentiation',
          'Geometric interpretation: area under curves',
          'Indefinite vs definite integrals',
          'Fundamental Theorem of Calculus',
          'Real-world applications of integration'
        ]
      }
    },
    {
      id: 'riemann-sums',
      title: 'Riemann Sums and Approximation',
      type: 'video' as const,
      duration: '11:45',
      difficulty: 'intermediate' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=rfG8ce4nNh0',
        description: 'Discover how Riemann sums provide the foundation for definite integrals. Learn about left, right, and midpoint approximations and how they converge to the exact area.',
        keyPoints: [
          'Partitioning intervals into subintervals',
          'Left, right, and midpoint Riemann sums',
          'Trapezoidal rule for better approximation',
          'Simpson\'s rule for even better accuracy',
          'Error analysis and convergence'
        ]
      }
    },
    {
      id: 'integration-techniques',
      title: 'Integration Techniques',
      type: 'text' as const,
      duration: '25 min read',
      difficulty: 'intermediate' as const,
      content: {
        html: `
          <h3>Master Essential Integration Techniques</h3>
          <p>While some integrals can be evaluated directly, many require specific techniques. Master these methods to tackle a wide variety of integration problems.</p>
          
          <h4>Basic Integration Rules</h4>
          <p>Just as we have differentiation rules, we have fundamental integration rules:</p>
          <blockquote>∫xⁿ dx = xⁿ⁺¹/(n+1) + C, for n ≠ -1</blockquote>
          <blockquote>∫sin(x) dx = -cos(x) + C</blockquote>
          <blockquote>∫cos(x) dx = sin(x) + C</blockquote>
          <blockquote>∫eˣ dx = eˣ + C</blockquote>
          
          <h4>Integration by Substitution</h4>
          <p>The substitution method (u-substitution) is the reverse of the chain rule:</p>
          <blockquote>∫f(g(x))·g'(x) dx = F(g(x)) + C</blockquote>
          <p>Steps for substitution: identify u = g(x), compute du = g'(x)dx, substitute, integrate, then back-substitute.</p>
          
          <h4>Integration by Parts</h4>
          <p>For products of functions, use integration by parts (reverse of product rule):</p>
          <blockquote>∫u·dv = u·v - ∫v·du</blockquote>
          <p>Choose u using LIATE rule: Logarithmic, Inverse trig, Algebraic, Trigonometric, Exponential.</p>
          
          <h4>Trigonometric Integrals</h4>
          <p>Special techniques for trigonometric integrals:</p>
          <ul>
            <li>For ∫sinⁿ(x)cosᵐ(x) when n or m is odd, use substitution</li>
            <li>For even powers, use power-reducing identities</li>
            <li>For products of different trig functions, use product-to-sum formulas</li>
          </ul>
        `,
        formulas: [
          {
            expression: '∫xⁿ dx = xⁿ⁺¹/(n+1) + C',
            description: 'Power Rule for Integration'
          },
          {
            expression: '∫u·dv = u·v - ∫v·du',
            description: 'Integration by Parts Formula'
          },
          {
            expression: '∫[a,b] f(x) dx = F(b) - F(a)',
            description: 'Fundamental Theorem of Calculus'
          },
          {
            expression: '∫sin²(x) dx = x/2 - sin(2x)/4 + C',
            description: 'Power-Reducing Identity Integration'
          }
        ]
      }
    },
    {
      id: 'definite-integrals',
      title: 'Definite Integrals and Applications',
      type: 'video' as const,
      duration: '18:30',
      difficulty: 'advanced' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=PFDu9oVAE-g',
        description: 'Advanced definite integral applications including eigenvalue-based methods for solving complex integration problems and their applications in physics and engineering.',
        keyPoints: [
          'Properties of definite integrals',
          'Area between curves',
          'Volumes of revolution',
          'Arc length calculations',
          'Surface area computations'
        ]
      }
    },
    {
      id: 'applications-integration',
      title: 'Real-World Applications',
      type: 'video' as const,
      duration: '13:30',
      difficulty: 'intermediate' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=FnJqaIESC2s',
        description: 'See how integration transforms our understanding of the world. From physics to economics, discover how integrals solve real problems.',
        keyPoints: [
          'Physics: displacement, velocity, and acceleration',
          'Engineering: work, energy, and power calculations',
          'Economics: consumer and producer surplus',
          'Biology: population growth and drug concentration',
          'Statistics: probability distributions and expected values'
        ]
      }
    }
  ];

  return (
    <TheorySection
      moduleId="integrals"
      title="Integration & Area Calculus"
      description="Master the art of integration, from basic antiderivatives to advanced techniques. Learn how integrals help us calculate areas, volumes, and accumulated change in countless real-world applications."
      lessons={lessons}
      color="#06B6D4"
    />
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
