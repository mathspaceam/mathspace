import { useEffect, useRef, useState, useCallback } from 'react';
import TabBar from '../components/ui/TabBar';
import GlassPanel from '../components/ui/GlassPanel';
import { worldToCanvas, canvasToWorld } from '../utils/math';

const TABS = [{ id: 'practical', label: 'Vector Space' }, { id: 'calculator', label: 'Vector Calculator' }, { id: 'theory', label: 'Theory' }];

interface Vec2 { x: number; y: number; }

// Vector calculator operations
function addVectors(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function subtractVectors(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scalarMultiply(v: Vec2, scalar: number): Vec2 {
  return { x: v.x * scalar, y: v.y * scalar };
}

function dotProduct(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function crossProduct2D(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x;
}

function magnitude(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

function normalize(v: Vec2): Vec2 | null {
  const mag = magnitude(v);
  if (mag === 0) return null;
  return { x: v.x / mag, y: v.y / mag };
}

function angleBetween(a: Vec2, b: Vec2): number {
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  const cosAngle = Math.max(-1, Math.min(1, dotProduct(a, b) / (magA * magB)));
  return Math.acos(cosAngle) * 180 / Math.PI;
}

function projectVector(a: Vec2, b: Vec2): Vec2 {
  const magB = magnitude(b);
  if (magB === 0) return { x: 0, y: 0 };
  const scalar = dotProduct(a, b) / (magB * magB);
  return scalarMultiply(b, scalar);
}

export default function VectorsModule() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState('practical');
  const [vA, setVA] = useState<Vec2>({ x: 2, y: 1 });
  const [vB, setVB] = useState<Vec2>({ x: 0.5, y: 2.5 });
  const dragging = useRef<'A' | 'B' | null>(null);
  const [panOffsetX, setPanOffsetX] = useState(0);
  const [panOffsetY, setPanOffsetY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const xMin = -4 + panOffsetX, xMax = 4 + panOffsetX, yMin = -4 + panOffsetY, yMax = 4 + panOffsetY;

  const dot = vA.x * vB.x + vA.y * vB.y;
  const magA = Math.sqrt(vA.x ** 2 + vA.y ** 2);
  const magB = Math.sqrt(vB.x ** 2 + vB.y ** 2);
  const angle = magA > 0 && magB > 0 ? (Math.acos(Math.max(-1, Math.min(1, dot / (magA * magB)))) * 180 / Math.PI) : 0;
  const crossZ = vA.x * vB.y - vA.y * vB.x;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.save();
    ctx.strokeStyle = 'rgba(59,130,246,0.07)';
    ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i++) {
      const { cx, cy } = worldToCanvas(i, 0, xMin, xMax, yMin, yMax, w, h);
      const { cx: cx2 } = worldToCanvas(i, 4, xMin, xMax, yMin, yMax, w, h);
      const { cy: cy2 } = worldToCanvas(0, i, xMin, xMax, yMin, yMax, w, h);
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx2, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy2); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.5;
    const { cy: y0 } = worldToCanvas(0, 0, xMin, xMax, yMin, yMax, w, h);
    const { cx: x0 } = worldToCanvas(0, 0, xMin, xMax, yMin, yMax, w, h);
    ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(w, y0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0, h); ctx.stroke();
    ctx.restore();

    const origin = worldToCanvas(0, 0, xMin, xMax, yMin, yMax, w, h);

    // Angle arc
    if (magA > 0 && magB > 0) {
      const angleA = Math.atan2(vA.y, vA.x);
      const angleB = Math.atan2(vB.y, vB.x);
      const arcR = 35;
      ctx.save();
      ctx.strokeStyle = 'rgba(245,158,11,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(origin.cx, origin.cy, arcR, -angleA, -angleB, angleB > angleA);
      ctx.stroke();
      const midAngle = (angleA + angleB) / 2;
      const tx = origin.cx + (arcR + 14) * Math.cos(-midAngle);
      const ty = origin.cy + (arcR + 14) * Math.sin(-midAngle);
      ctx.fillStyle = '#F59E0B';
      ctx.font = '11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${angle.toFixed(1)}°`, tx, ty);
      ctx.restore();
    }

    // Dot product projection
    if (magA > 0) {
      const proj = dot / (magA * magA);
      const px = vA.x * proj, py = vA.y * proj;
      const pp = worldToCanvas(px, py, xMin, xMax, yMin, yMax, w, h);
      const pb = worldToCanvas(vB.x, vB.y, xMin, xMax, yMin, yMax, w, h);
      ctx.save();
      ctx.strokeStyle = 'rgba(16,185,129,0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(pb.cx, pb.cy); ctx.lineTo(pp.cx, pp.cy); ctx.stroke();
      ctx.restore();
    }

    drawVectorArrow(ctx, origin, worldToCanvas(vA.x, vA.y, xMin, xMax, yMin, yMax, w, h), '#3B82F6', 'A');
    drawVectorArrow(ctx, origin, worldToCanvas(vB.x, vB.y, xMin, xMax, yMin, yMax, w, h), '#10B981', 'B');

    // Sum vector
    const sumP = worldToCanvas(vA.x + vB.x, vA.y + vB.y, xMin, xMax, yMin, yMax, w, h);
    drawVectorArrow(ctx, origin, sumP, 'rgba(245,158,11,0.6)', 'A+B', true);

    // Drag handle indicators
    for (const [v, color] of [[vA, '#3B82F6'], [vB, '#10B981']] as const) {
      const p = worldToCanvas(v.x, v.y, xMin, xMax, yMin, yMax, w, h);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.fillStyle = color + '30';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.cx, p.cy, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }, [vA, vB, dot, magA, magB, angle, xMin, yMin, xMax, yMax]);

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

  const getWorldPos = useCallback((e: MouseEvent | Touch) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * devicePixelRatio;
    const cy = (e.clientY - rect.top) * devicePixelRatio;
    return canvasToWorld(cx, cy, xMin, xMax, yMin, yMax, canvas.width, canvas.height);
  }, [xMin, yMin, xMax, yMax]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const hitTest = (wx: number, wy: number, v: Vec2) => Math.hypot(wx - v.x, wy - v.y) < 0.4;

    const onDown = (e: MouseEvent) => {
      const p = getWorldPos(e);
      if (!p) return;
      if (hitTest(p.wx, p.wy, vA)) dragging.current = 'A';
      else if (hitTest(p.wx, p.wy, vB)) dragging.current = 'B';
      else {
        setIsPanning(true);
        setPanStart({ x: e.offsetX * devicePixelRatio, y: e.offsetY * devicePixelRatio });
      }
    };
    const onMove = (e: MouseEvent) => {
      if (dragging.current) {
        const p = getWorldPos(e);
        if (!p) return;
        const clamped = { x: Math.max(xMin, Math.min(xMax, p.wx)), y: Math.max(yMin, Math.min(yMax, p.wy)) };
        if (dragging.current === 'A') setVA(clamped);
        else setVB(clamped);
      } else if (isPanning) {
        const dx = e.offsetX * devicePixelRatio - panStart.x;
        const dy = e.offsetY * devicePixelRatio - panStart.y;
        setPanOffsetX(prev => prev - dx * 0.0008);
        setPanOffsetY(prev => prev + dy * 0.0008);
      }
    };
    const onUp = () => { 
      dragging.current = null; 
      setIsPanning(false);
    };

    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [getWorldPos, vA, vB, xMin, yMin, xMax, yMax, isPanning, panStart]);

  return (
    <div className="flex flex-col h-full">
      <TabBar tabs={TABS} active={tab} onChange={setTab} color="#F59E0B" />
      {tab === 'theory' ? <VectorTheory /> : tab === 'calculator' ? <VectorCalculator /> : (
        <div className="flex flex-col lg:flex-row flex-1 gap-4 min-h-0">
          <div className="flex-1 relative rounded-xl overflow-hidden min-h-0" style={{ cursor: 'crosshair' }}>
            <canvas ref={canvasRef} className="w-full h-full" style={{ minHeight: 300 }} />
          </div>
          <div className="w-full lg:w-64 flex flex-col gap-3 overflow-y-auto max-h-96 lg:max-h-none">
            <GlassPanel title="Vector A" accentColor="#3B82F6">
              <div className="text-xs text-[var(--text-muted)]">Drag the arrow head on canvas, or:</div>
              <div className="flex gap-2">
                <div className="flex-1"><label className="text-xs text-[var(--text-muted)]">x</label><input type="number" step={0.1} value={vA.x.toFixed(2)} onChange={e => setVA(v => ({ ...v, x: parseFloat(e.target.value) || 0 }))} className="w-full mt-1" /></div>
                <div className="flex-1"><label className="text-xs text-[var(--text-muted)]">y</label><input type="number" step={0.1} value={vA.y.toFixed(2)} onChange={e => setVA(v => ({ ...v, y: parseFloat(e.target.value) || 0 }))} className="w-full mt-1" /></div>
              </div>
              <div className="text-xs text-[var(--text-muted)]">|A| = <span className="text-[#3B82F6] font-mono">{magA.toFixed(4)}</span></div>
            </GlassPanel>

            <GlassPanel title="Vector B" accentColor="#10B981">
              <div className="flex gap-2">
                <div className="flex-1"><label className="text-xs text-[var(--text-muted)]">x</label><input type="number" step={0.1} value={vB.x.toFixed(2)} onChange={e => setVB(v => ({ ...v, x: parseFloat(e.target.value) || 0 }))} className="w-full mt-1" /></div>
                <div className="flex-1"><label className="text-xs text-[var(--text-muted)]">y</label><input type="number" step={0.1} value={vB.y.toFixed(2)} onChange={e => setVB(v => ({ ...v, y: parseFloat(e.target.value) || 0 }))} className="w-full mt-1" /></div>
              </div>
              <div className="text-xs text-[var(--text-muted)]">|B| = <span className="text-[#10B981] font-mono">{magB.toFixed(4)}</span></div>
            </GlassPanel>

            <GlassPanel title="Operations" accentColor="#F59E0B">
              <div className="space-y-2 text-sm">
                <div className="glass rounded-lg p-3">
                  <div className="text-xs text-[var(--text-muted)] mb-1">Dot Product A·B</div>
                  <div className="font-mono text-[#F59E0B] text-sm">{dot.toFixed(4)}</div>
                </div>
                <div className="glass rounded-lg p-3">
                  <div className="text-xs text-[var(--text-muted)] mb-1">Cross Product |A×B|</div>
                  <div className="font-mono text-[#EC4899] text-sm">{Math.abs(crossZ).toFixed(4)}</div>
                </div>
                <div className="glass rounded-lg p-3">
                  <div className="text-xs text-[var(--text-muted)] mb-1">Angle θ</div>
                  <div className="font-mono text-[#06B6D4] text-sm">{angle.toFixed(2)}°</div>
                </div>
                <div className="glass rounded-lg p-3">
                  <div className="text-xs text-[var(--text-muted)] mb-1">A + B</div>
                  <div className="font-mono text-[#F59E0B] text-xs">({(vA.x+vB.x).toFixed(2)}, {(vA.y+vB.y).toFixed(2)})</div>
                </div>
              </div>
            </GlassPanel>
          </div>
        </div>
      )}
    </div>
  );
}

function VectorCalculator() {
  const calculatorCanvasRef = useRef<HTMLCanvasElement>(null);
  const [vectorA, setVectorA] = useState<Vec2>({ x: 3, y: 2 });
  const [vectorB, setVectorB] = useState<Vec2>({ x: 1, y: 4 });
  const [scalar, setScalar] = useState(2);
  const [operation, setOperation] = useState<'add' | 'subtract' | 'scalarMultiply' | 'dotProduct' | 'crossProduct' | 'magnitude' | 'normalize' | 'angle' | 'project'>('add');
  const [result, setResult] = useState<Vec2 | number | null>(null);
  const [showVisualization, setShowVisualization] = useState(true);

  const setVectorEntry = (vector: 'A' | 'B', component: 'x' | 'y', val: string) => {
    // Handle empty input by setting to 0
    if (val === '' || val === '-') {
      if (vector === 'A') {
        setVectorA(prev => ({ ...prev, [component]: 0 }));
      } else {
        setVectorB(prev => ({ ...prev, [component]: 0 }));
      }
      return;
    }
    
    const v = parseFloat(val);
    // Allow NaN to be set to 0 for better user experience
    if (vector === 'A') {
      setVectorA(prev => ({ ...prev, [component]: isNaN(v) ? 0 : v }));
    } else {
      setVectorB(prev => ({ ...prev, [component]: isNaN(v) ? 0 : v }));
    }
  };

  const calculateResult = () => {
    switch (operation) {
      case 'add':
        setResult(addVectors(vectorA, vectorB));
        break;
      case 'subtract':
        setResult(subtractVectors(vectorA, vectorB));
        break;
      case 'scalarMultiply':
        setResult(scalarMultiply(vectorA, scalar));
        break;
      case 'dotProduct':
        setResult(dotProduct(vectorA, vectorB));
        break;
      case 'crossProduct':
        setResult(crossProduct2D(vectorA, vectorB));
        break;
      case 'magnitude':
        setResult(magnitude(vectorA));
        break;
      case 'normalize':
        setResult(normalize(vectorA));
        break;
      case 'angle':
        setResult(angleBetween(vectorA, vectorB));
        break;
      case 'project':
        setResult(projectVector(vectorA, vectorB));
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

    const xMin = -5, xMax = 5, yMin = -5, yMax = 5;

    // Draw grid
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = -5; i <= 5; i++) {
      const p1 = worldToCanvas(i, -5, xMin, xMax, yMin, yMax, w, h);
      const p2 = worldToCanvas(i, 5, xMin, xMax, yMin, yMax, w, h);
      ctx.beginPath(); ctx.moveTo(p1.cx, p1.cy); ctx.lineTo(p2.cx, p2.cy); ctx.stroke();
      const p3 = worldToCanvas(-5, i, xMin, xMax, yMin, yMax, w, h);
      const p4 = worldToCanvas(5, i, xMin, xMax, yMin, yMax, w, h);
      ctx.beginPath(); ctx.moveTo(p3.cx, p3.cy); ctx.lineTo(p4.cx, p4.cy); ctx.stroke();
    }
    ctx.restore();

    // Draw axes
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.5;
    const origin = worldToCanvas(0, 0, xMin, xMax, yMin, yMax, w, h);
    ctx.beginPath(); ctx.moveTo(0, origin.cy); ctx.lineTo(w, origin.cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(origin.cx, 0); ctx.lineTo(origin.cx, h); ctx.stroke();
    ctx.restore();

    // Draw vectors
    drawVectorArrow(ctx, origin, worldToCanvas(vectorA.x, vectorA.y, xMin, xMax, yMin, yMax, w, h), '#3B82F6', 'A');
    
    if (operation === 'add' || operation === 'subtract' || operation === 'dotProduct' || operation === 'crossProduct' || operation === 'angle' || operation === 'project') {
      drawVectorArrow(ctx, origin, worldToCanvas(vectorB.x, vectorB.y, xMin, xMax, yMin, yMax, w, h), '#10B981', 'B');
    }

    // Draw result vector if applicable
    if (result && typeof result === 'object' && result !== null) {
      drawVectorArrow(ctx, origin, worldToCanvas(result.x, result.y, xMin, xMax, yMin, yMax, w, h), '#A855F7', 'Result', true);
    }

    // Draw projection line for projection operation
    if (operation === 'project' && result && typeof result === 'object' && result !== null) {
      const bTip = worldToCanvas(vectorB.x, vectorB.y, xMin, xMax, yMin, yMax, w, h);
      const projTip = worldToCanvas(result.x, result.y, xMin, xMax, yMin, yMax, w, h);
      ctx.save();
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(bTip.cx, bTip.cy); ctx.lineTo(projTip.cx, projTip.cy); ctx.stroke();
      ctx.restore();
    }

    // Add legend
    ctx.save();
    ctx.fillStyle = 'rgba(15,20,35,0.88)';
    ctx.strokeStyle = 'rgba(59,130,246,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(12, 12, 180, 120, 8);
    ctx.fill(); ctx.stroke();
    
    ctx.fillStyle = '#8B9CC0';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText('Vector A (blue)', 22, 32);
    if (operation === 'add' || operation === 'subtract' || operation === 'dotProduct' || operation === 'crossProduct' || operation === 'angle' || operation === 'project') {
      ctx.fillText('Vector B (green)', 22, 50);
    }
    if (result && typeof result === 'object' && result !== null) {
      ctx.fillText('Result (purple)', 22, 68);
    }
    ctx.fillText(`Operation: ${operation}`, 22, 86);
    if (operation === 'scalarMultiply') {
      ctx.fillText(`Scalar: ${scalar}`, 22, 104);
    }
    ctx.restore();
  }, [vectorA, vectorB, scalar, operation, result, showVisualization]);

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

  const VectorInput = ({ vector, label, color, vectorId }: { vector: Vec2, label: string, color: string, vectorId: 'A' | 'B' }) => (
    <GlassPanel title={label} accentColor={color} className="flex-shrink-0">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-[var(--text-muted)]">{vectorId}x</span>
          <input
            type="number"
            step={0.1}
            value={vector.x}
            onChange={e => setVectorEntry(vectorId, 'x', e.target.value)}
            className="w-full text-center text-sm bg-[#0F172A] border border-[#334155] rounded text-white"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-[var(--text-muted)]">{vectorId}y</span>
          <input
            type="number"
            step={0.1}
            value={vector.y}
            onChange={e => setVectorEntry(vectorId, 'y', e.target.value)}
            className="w-full text-center text-sm bg-[#0F172A] border border-[#334155] rounded text-white"
          />
        </div>
      </div>
      <div className="text-xs text-[var(--text-muted)] mt-2">
        |{vectorId}| = <span className="font-mono" style={{ color }}>{magnitude(vector).toFixed(4)}</span>
      </div>
    </GlassPanel>
  );

  const ResultDisplay = () => {
    if (!result) return null;
    
    if (typeof result === 'number') {
      return (
        <GlassPanel title="Result" accentColor="#10B981" className="flex-shrink-0">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#10B981]">{result.toFixed(4)}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">
              {operation === 'dotProduct' ? 'Dot Product' : 
               operation === 'crossProduct' ? 'Cross Product (z-component)' :
               operation === 'magnitude' ? 'Magnitude' :
               operation === 'angle' ? 'Angle (degrees)' : 'Scalar Result'}
            </div>
          </div>
        </GlassPanel>
      );
    }
    
    if (typeof result === 'object' && result !== null) {
      return (
        <GlassPanel title="Result Vector" accentColor="#10B981" className="flex-shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-2 bg-[#0F172A] border border-[#334155] rounded">
              <span className="text-xs text-[var(--text-muted)]">x</span>
              <div className="text-sm text-white font-mono">{result.x.toFixed(2)}</div>
            </div>
            <div className="text-center p-2 bg-[#0F172A] border border-[#334155] rounded">
              <span className="text-xs text-[var(--text-muted)]">y</span>
              <div className="text-sm text-white font-mono">{result.y.toFixed(2)}</div>
            </div>
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-2 text-center">
            |Result| = <span className="font-mono text-[#10B981]">{magnitude(result).toFixed(4)}</span>
          </div>
        </GlassPanel>
      );
    }
    
    return (
      <GlassPanel title="Result" accentColor="#EF4444" className="flex-shrink-0">
        <div className="text-center text-[#EF4444]">
          <div className="text-sm">Cannot compute</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">
            {operation === 'normalize' ? 'Cannot normalize zero vector' : 'Invalid operation'}
          </div>
        </div>
      </GlassPanel>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row flex-1 gap-4 min-h-0">
      <div className="flex-1 flex flex-col gap-4">
        {showVisualization && (
          <div className="flex-1 relative rounded-xl overflow-hidden bg-[#0B0E14] border border-[#1E293B] min-h-0">
            <canvas 
              ref={calculatorCanvasRef} 
              className="w-full h-full" 
              style={{ minHeight: 300 }}
            />
          </div>
        )}
      </div>
      
      <div className="w-full lg:w-80 xl:w-96 flex flex-col gap-3 pr-2 max-h-96 lg:max-h-none overflow-y-auto">
        <GlassPanel title="🧮 Vector Operation" accentColor="#10B981" className="flex-shrink-0">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wider">Operation</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'add', label: 'A + B', icon: '➕' },
                  { id: 'subtract', label: 'A - B', icon: '➖' },
                  { id: 'scalarMultiply', label: 'k·A', icon: '✖️' },
                  { id: 'dotProduct', label: 'A·B', icon: '•' },
                  { id: 'crossProduct', label: 'A×B', icon: '❌' },
                  { id: 'magnitude', label: '|A|', icon: '📏' },
                  { id: 'normalize', label: 'Â', icon: '🎯' },
                  { id: 'angle', label: '∠AB', icon: '📐' },
                  { id: 'project', label: 'projᴮA', icon: '📊' },
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

            {operation === 'scalarMultiply' && (
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wider">Scalar k</label>
                <input
                  type="number"
                  step={0.1}
                  value={scalar}
                  onChange={e => setScalar(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm bg-[#0F172A] border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F620] transition-all"
                />
              </div>
            )}

            <button
              onClick={calculateResult}
              className="w-full py-3 rounded-lg text-sm font-semibold transition-all bg-gradient-to-r from-[#10B981] to-[#059669] text-white hover:from-[#059669] hover:to-[#047857] focus:outline-none focus:ring-2 focus:ring-[#10B98120] shadow-lg transform hover:scale-105"
            >
              Calculate Result
            </button>
          </div>
        </GlassPanel>

        <VectorInput vector={vectorA} label="Vector A" color="#3B82F6" vectorId="A" />
        {(operation === 'add' || operation === 'subtract' || operation === 'dotProduct' || operation === 'crossProduct' || operation === 'angle' || operation === 'project') && (
          <VectorInput vector={vectorB} label="Vector B" color="#10B981" vectorId="B" />
        )}

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
              <div className="space-y-2 text-xs">
                <div className="font-semibold text-white mb-2">Visualization Legend:</div>
                <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-[#3B82F6]" /><span className="text-[var(--text-muted)]">Vector A</span></div>
                {(operation === 'add' || operation === 'subtract' || operation === 'dotProduct' || operation === 'crossProduct' || operation === 'angle' || operation === 'project') && (
                  <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-[#10B981]" /><span className="text-[var(--text-muted)]">Vector B</span></div>
                )}
                {result && typeof result === 'object' && result !== null && (
                  <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-[#A855F7]" /><span className="text-[var(--text-muted)]">Result Vector</span></div>
                )}
              </div>
            )}
          </div>
        </GlassPanel>

        <GlassPanel title="Presets" accentColor="#F59E0B" className="flex-shrink-0">
          {[
            { label: 'Unit X', action: () => setVectorA({ x: 1, y: 0 }) },
            { label: 'Unit Y', action: () => setVectorA({ x: 0, y: 1 }) },
            { label: '45° Angle', action: () => setVectorA({ x: 1, y: 1 }) },
            { label: 'Reset B', action: () => setVectorB({ x: 1, y: 4 }) },
          ].map(preset => (
            <button
              key={preset.label}
              onClick={preset.action}
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

function drawVectorArrow(ctx: CanvasRenderingContext2D, origin: { cx: number; cy: number }, tip: { cx: number; cy: number }, color: string, label: string, dashed = false) {
  const { cx: x1, cy: y1 } = origin;
  const { cx: x2, cy: y2 } = tip;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = dashed ? 1.5 : 2.5;
  ctx.shadowColor = color;
  ctx.shadowBlur = dashed ? 0 : 10;
  if (dashed) ctx.setLineDash([5, 3]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 12 * Math.cos(angle - 0.4), y2 - 12 * Math.sin(angle - 0.4));
  ctx.lineTo(x2 - 12 * Math.cos(angle + 0.4), y2 - 12 * Math.sin(angle + 0.4));
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x2 + 14 * Math.cos(angle - Math.PI / 2), y2 + 14 * Math.sin(angle - Math.PI / 2));
  ctx.restore();
}

import TheorySection from '../components/ui/TheorySection';

function VectorTheory() {
  const lessons = [
    {
      id: 'vectors-intro',
      title: 'Introduction to Vectors',
      type: 'video' as const,
      duration: '8:30',
      difficulty: 'beginner' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=fNk_zzaMoSs',
        description: 'Vectors are fundamental mathematical objects with both magnitude and direction. This introduction covers vector notation, visualization, and basic operations.',
        keyPoints: [
          'Vector components and notation',
          'Geometric representation',
          'Magnitude and direction',
          'Position vs displacement vectors',
          'Real-world applications'
        ]
      }
    },
    {
      id: 'vector-operations',
      title: 'Vector Operations',
      type: 'video' as const,
      duration: '11:15',
      difficulty: 'intermediate' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=kYB8IZa5AuE',
        description: 'Master vector addition, subtraction, and scalar multiplication. Learn the geometric interpretations and algebraic rules.',
        keyPoints: [
          'Vector addition: tip-to-tail method',
          'Vector subtraction and negative vectors',
          'Scalar multiplication effects',
          'Component-wise operations',
          'Geometric vs algebraic methods'
        ]
      }
    },
    {
      id: 'dot-cross-products',
      title: 'Dot and Cross Products',
      type: 'text' as const,
      duration: '18 min read',
      difficulty: 'intermediate' as const,
      content: {
        html: `
          <h3>Vector Products: Dot and Cross</h3>
          <p>Vector products are essential operations that combine vectors to produce scalar or vector results with important geometric meanings.</p>
          
          <h4>Dot Product (Scalar Product)</h4>
          <p>The dot product of two vectors yields a scalar value:</p>
          <blockquote>**a** · **b** = |**a**| |**b**| cos(θ)</blockquote>
          <p>Where θ is the angle between the vectors. In component form:</p>
          <blockquote>**a** · **b** = a₁b₁ + a₂b₂ + a₃b₃</blockquote>
          
          <p>Key properties of the dot product:</p>
          <ul>
            <li>Commutative: **a** · **b** = **b** · **a**</li>
            <li>Distributive: **a** · (**b** + **c**) = **a** · **b** + **a** · **c**</li>
            <li>Zero dot product means perpendicular vectors</li>
            <li>Positive dot product means acute angle</li>
            <li>Negative dot product means obtuse angle</li>
          </ul>
        `,
        formulas: [
          {
            expression: 'a · b = |a| |b| cos(θ)',
            description: 'Dot Product Definition'
          },
          {
            expression: 'a × b = |a| |b| sin(θ) n̂',
            description: 'Cross Product Definition'
          },
          {
            expression: '|a × b| = |a| |b| sin(θ)',
            description: 'Cross Product Magnitude'
          },
          {
            expression: 'a · b = 0 ⟹ a ⊥ b',
            description: 'Perpendicular Vectors Condition'
          }
        ]
      }
    },
    {
      id: 'vector-applications',
      title: 'Vector Applications',
      type: 'video' as const,
      duration: '14:15',
      difficulty: 'advanced' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=PFDu9oVAE-g',
        description: 'Advanced vector applications in modern physics and engineering. Explore how eigenvectors and vector spaces power everything from computer graphics to quantum mechanics.',
        keyPoints: [
          'Physics: force and velocity vectors',
          'Engineering: stress and strain analysis',
          'Computer graphics: transformations',
          'Machine learning: feature vectors',
          'Navigation: position and displacement'
        ]
      }
    }
  ];

  return (
    <TheorySection
      moduleId="vectors"
      title="Vector Mathematics & Applications"
      description="Master vector mathematics from basic operations to advanced applications. Learn how vectors represent physical quantities and solve problems in physics, engineering, and computer science."
      lessons={lessons}
      color="#F59E0B"
    />
  );
}
