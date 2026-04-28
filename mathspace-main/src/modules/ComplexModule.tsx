import { useEffect, useRef, useState, useCallback } from 'react';
import TabBar from '../components/ui/TabBar';
import GlassPanel from '../components/ui/GlassPanel';
import SliderRow from '../components/ui/SliderRow';
import { worldToCanvas, canvasToWorld } from '../utils/math';

const TABS = [{ id: 'practical', label: 'Argand Plane' }, { id: 'theory', label: 'Theory' }];

export default function ComplexModule() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState('practical');
  const [a, setA] = useState(2);
  const [b, setB] = useState(1.5);
  const [showPower, setShowPower] = useState(false);
  const [power, setPower] = useState(2);
  const dragging = useRef(false);
  const [panOffsetX, setPanOffsetX] = useState(0);
  const [panOffsetY, setPanOffsetY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const xMin = -5 + panOffsetX, xMax = 5 + panOffsetX, yMin = -5 + panOffsetY, yMax = 5 + panOffsetY;

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
    for (let i = -5; i <= 5; i++) {
      const { cx } = worldToCanvas(i, 0, xMin, xMax, yMin, yMax, w, h);
      const { cy } = worldToCanvas(0, i, xMin, xMax, yMin, yMax, w, h);
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.5;
    const { cy: y0 } = worldToCanvas(0, 0, xMin, xMax, yMin, yMax, w, h);
    const { cx: x0 } = worldToCanvas(0, 0, xMin, xMax, yMin, yMax, w, h);
    ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(w, y0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0, h); ctx.stroke();
    ctx.fillStyle = 'rgba(139,156,192,0.6)'; ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Re', w - 18, y0 - 6);
    ctx.textAlign = 'left';
    ctx.fillText('Im', x0 + 6, 18);
    ctx.restore();

    const mag = Math.sqrt(a * a + b * b);
    const arg = Math.atan2(b, a);

    // Unit circle
    const { cx: ux } = worldToCanvas(1, 0, xMin, xMax, yMin, yMax, w, h);
    const radius = ux - x0;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x0, y0, radius, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // Magnitude circle
    const magR = radius * mag;
    ctx.save();
    ctx.strokeStyle = 'rgba(59,130,246,0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.arc(x0, y0, magR, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // Angle arc
    ctx.save();
    ctx.strokeStyle = 'rgba(245,158,11,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x0, y0, 30, 0, -arg, arg < 0); ctx.stroke();
    ctx.restore();

    const zp = worldToCanvas(a, b, xMin, xMax, yMin, yMax, w, h);

    // Projection lines
    ctx.save();
    ctx.strokeStyle = 'rgba(59,130,246,0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(zp.cx, y0); ctx.lineTo(zp.cx, zp.cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, zp.cy); ctx.lineTo(zp.cx, zp.cy); ctx.stroke();
    ctx.restore();

    // Vector to z
    drawArrow(ctx, x0, y0, zp.cx, zp.cy, '#3B82F6', 2.5);

    // Complex power z^n
    if (showPower) {
      const pn = power;
      const newMag = Math.pow(mag, pn);
      const newArg = arg * pn;
      const pa = newMag * Math.cos(newArg);
      const pb = newMag * Math.sin(newArg);
      if (Math.abs(pa) <= 6 && Math.abs(pb) <= 6) {
        const pp = worldToCanvas(pa, pb, xMin, xMax, yMin, yMax, w, h);
        drawArrow(ctx, x0, y0, pp.cx, pp.cy, '#EC4899', 2, true);
        ctx.save();
        ctx.fillStyle = '#EC4899';
        ctx.font = '11px JetBrains Mono, monospace';
        ctx.fillText(`z^${pn}`, pp.cx + 8, pp.cy - 8);
        ctx.restore();
      }
    }

    // Conjugate
    const conjP = worldToCanvas(a, -b, xMin, xMax, yMin, yMax, w, h);
    ctx.save();
    ctx.strokeStyle = 'rgba(16,185,129,0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(conjP.cx, conjP.cy); ctx.stroke();
    ctx.restore();

    // z point
    ctx.save();
    ctx.fillStyle = '#3B82F6';
    ctx.shadowColor = '#3B82F6';
    ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(zp.cx, zp.cy, 8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Labels
    ctx.save();
    ctx.fillStyle = '#60A5FA';
    ctx.font = 'bold 13px JetBrains Mono, monospace';
    ctx.fillText(`z = ${a.toFixed(2)} + ${b.toFixed(2)}i`, zp.cx + 12, zp.cy - 10);
    ctx.restore();

    // Stats overlay
    ctx.save();
    ctx.fillStyle = 'rgba(15,20,35,0.88)';
    ctx.strokeStyle = 'rgba(59,130,246,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(12, 12, 185, 80, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8B9CC0'; ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText(`|z| = ${mag.toFixed(4)}`, 22, 32);
    ctx.fillText(`arg(z) = ${(arg * 180 / Math.PI).toFixed(2)}°`, 22, 50);
    ctx.fillText(`z* = ${a.toFixed(2)} - ${b.toFixed(2)}i`, 22, 68);
    ctx.fillStyle = '#3B82F6'; ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText(`e^(i·${(arg).toFixed(3)}) · ${mag.toFixed(3)}`, 22, 86);
    ctx.restore();
  }, [a, b, showPower, power, xMin, yMin, xMax, yMax]);

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
    const onDown = (e: MouseEvent) => {
      const p = canvasToWorld(e.offsetX * devicePixelRatio, e.offsetY * devicePixelRatio, xMin, xMax, yMin, yMax, canvas.width, canvas.height);
      if (Math.hypot(p.wx - a, p.wy - b) < 0.5) {
        dragging.current = true;
      } else {
        setIsPanning(true);
        setPanStart({ x: e.offsetX * devicePixelRatio, y: e.offsetY * devicePixelRatio });
      }
    };
    const onMove = (e: MouseEvent) => {
      if (dragging.current) {
        const p = canvasToWorld(e.offsetX * devicePixelRatio, e.offsetY * devicePixelRatio, xMin, xMax, yMin, yMax, canvas.width, canvas.height);
        setA(Math.max(xMin, Math.min(xMax, p.wx)));
        setB(Math.max(yMin, Math.min(yMax, p.wy)));
      } else if (isPanning) {
        const dx = e.offsetX * devicePixelRatio - panStart.x;
        const dy = e.offsetY * devicePixelRatio - panStart.y;
        setPanOffsetX(prev => prev - dx * 0.0008);
        setPanOffsetY(prev => prev + dy * 0.0008);
      }
    };
    const onUp = () => { 
      dragging.current = false; 
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
  }, [a, b, xMin, yMin, xMax, yMax, isPanning, panStart]);

  return (
    <div className="flex flex-col h-full">
      <TabBar tabs={TABS} active={tab} onChange={setTab} color="#EC4899" />
      {tab === 'theory' ? <ComplexTheory /> : (
        <div className="flex flex-1 gap-4 min-h-0">
          <div className="flex-1 relative rounded-xl overflow-hidden" style={{ cursor: 'crosshair' }}>
            <canvas ref={canvasRef} className="w-full h-full" style={{ minHeight: 300 }} />
          </div>
          <div className="w-64 flex flex-col gap-3 overflow-y-auto">
            <GlassPanel title="Complex Number z" accentColor="#EC4899">
              <div className="text-xs text-[var(--text-muted)] mb-1">z = a + bi (drag on canvas)</div>
              <SliderRow label="Real part (a)" value={a} min={-4} max={4} step={0.05} onChange={setA} color="#3B82F6" />
              <SliderRow label="Imaginary (b)" value={b} min={-4} max={4} step={0.05} onChange={setB} color="#10B981" />
            </GlassPanel>
            <GlassPanel title="Operations" accentColor="#3B82F6">
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input type="checkbox" checked={showPower} onChange={e => setShowPower(e.target.checked)} />
                Show z^n power
              </label>
              {showPower && <SliderRow label="Power n" value={power} min={-4} max={6} step={1} onChange={setPower} color="#EC4899" />}
            </GlassPanel>
            <GlassPanel title="Legend" accentColor="#F59E0B">
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-[#3B82F6]" /><span className="text-[var(--text-muted)]">z vector</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-[#EC4899]" style={{ borderTop: '2px dashed #EC4899' }} /><span className="text-[var(--text-muted)]">z^n</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-[#10B981]" style={{ borderTop: '2px dashed #10B981' }} /><span className="text-[var(--text-muted)]">Conjugate z*</span></div>
              </div>
            </GlassPanel>
            <GlassPanel title="Notable Points" accentColor="#10B981">
              {[
                { a: 1, b: 0, label: '1 (identity)' },
                { a: 0, b: 1, label: 'i (90°)' },
                { a: -1, b: 0, label: '-1 (180°)' },
                { a: Math.SQRT1_2, b: Math.SQRT1_2, label: 'e^(iπ/4)' },
              ].map(p => (
                <button key={p.label} onClick={() => { setA(p.a); setB(p.b); }} className="text-left text-xs text-[var(--text-secondary)] hover:text-[#10B981] font-mono transition-colors py-0.5">
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

function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width: number, dashed = false) {
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.shadowColor = color; ctx.shadowBlur = dashed ? 0 : 10;
  if (dashed) ctx.setLineDash([5, 3]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.setLineDash([]);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 10 * Math.cos(angle - 0.4), y2 - 10 * Math.sin(angle - 0.4));
  ctx.lineTo(x2 - 10 * Math.cos(angle + 0.4), y2 - 10 * Math.sin(angle + 0.4));
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

import TheorySection from '../components/ui/TheorySection';

function ComplexTheory() {
  const lessons = [
    {
      id: 'complex-intro',
      title: 'Introduction to Complex Numbers',
      type: 'video' as const,
      duration: '10:45',
      difficulty: 'beginner' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=ysVcAYo7UPI',
        description: 'Khan Academy introduction to imaginary numbers and complex numbers. Learn how i² = -1 extends the number system.',
        keyPoints: [
          'Real and imaginary parts',
          'The imaginary unit i where i² = -1',
          'Complex plane visualization',
          'Basic arithmetic operations',
          'Historical development'
        ]
      }
    },
    {
      id: 'polar-form',
      title: 'Polar Form and Complex Operations',
      type: 'video' as const,
      duration: '14:30',
      difficulty: 'intermediate' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=hqr1DtXXHpY',
        description: 'Don\'t Memorise comprehensive introduction to complex numbers including operations and geometric interpretations.',
        keyPoints: [
          'Magnitude and argument',
          'Polar coordinates in complex plane',
          'Complex arithmetic operations',
          'Geometric interpretation of multiplication',
          'Applications in mathematics'
        ]
      }
    },
    {
      id: 'complex-operations',
      title: 'Complex Number Operations',
      type: 'text' as const,
      duration: '20 min read',
      difficulty: 'intermediate' as const,
      content: {
        html: `
          <h3>Master Complex Number Operations</h3>
          <p>Complex numbers follow specific rules for arithmetic operations that extend real number operations while introducing new geometric interpretations.</p>
          
          <h4>Complex Number Forms</h4>
          <p>Complex numbers can be represented in multiple equivalent forms:</p>
          <blockquote>Rectangular: z = a + bi</blockquote>
          <blockquote>Polar: z = r(cos θ + i sin θ)</blockquote>
          <blockquote>Exponential: z = re^(iθ)</blockquote>
          <p>Where r = |z| = √(a² + b²) is the magnitude and θ = arg(z) = atan2(b, a) is the argument.</p>
          
          <h4>Arithmetic Operations</h4>
          <p><strong>Addition/Subtraction:</strong> Combine real and imaginary parts separately</p>
          <blockquote>(a + bi) + (c + di) = (a + c) + (b + d)i</blockquote>
          
          <p><strong>Multiplication:</strong> Use distributive property and i² = -1</p>
          <blockquote>(a + bi)(c + di) = (ac - bd) + (ad + bc)i</blockquote>
          
          <p><strong>Division:</strong> Multiply by complex conjugate</p>
          <blockquote>(a + bi)/(c + di) = [(a + bi)(c - di)]/(c² + d²)</blockquote>
          
          <h4>Polar Form Operations</h4>
          <p>Multiplication and division become simpler in polar form:</p>
          <blockquote>r₁e^(iθ₁) × r₂e^(iθ₂) = (r₁r₂)e^(i(θ₁+θ₂))</blockquote>
          <blockquote>r₁e^(iθ₁) / r₂e^(iθ₂) = (r₁/r₂)e^(i(θ₁-θ₂))</blockquote>
          
          <h4>Complex Conjugate</h4>
          <p>The complex conjugate of z = a + bi is z̄ = a - bi</p>
          <blockquote>z × z̄ = a² + b² = |z|²</blockquote>
          <p>Conjugates are essential for division and finding real parts.</p>
          
          <h4>Applications</h4>
          <ul>
            <li><strong>Electrical Engineering:</strong> AC circuit analysis</li>
            <li><strong>Signal Processing:</strong> Fourier transforms</li>
            <li><strong>Quantum Mechanics:</strong> Wave functions</li>
            <li><strong>Control Theory:</strong> System stability</li>
          </ul>
        `,
        formulas: [
          {
            expression: 'z = a + bi',
            description: 'Rectangular Form'
          },
          {
            expression: 'z = r(cos θ + i sin θ)',
            description: 'Polar Form'
          },
          {
            expression: '(a + bi)(c + di) = (ac - bd) + (ad + bc)i',
            description: 'Complex Multiplication'
          },
          {
            expression: 'z × z̄ = |z|²',
            description: 'Complex Conjugate Property'
          }
        ]
      }
    },
    {
      id: 'complex-analysis',
      title: 'Complex Analysis Applications',
      type: 'video' as const,
      duration: '16:45',
      difficulty: 'advanced' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=BuDq6p7uFE4',
        description: 'How imaginary numbers relate to quantum mechanics. Advanced applications of complex numbers in modern physics.',
        keyPoints: [
          'Complex numbers in quantum mechanics',
          'Wave functions and probability amplitudes',
          'Complex analysis in engineering',
          'Signal processing applications',
          'Modern physics connections'
        ]
      }
    },
    {
      id: 'applications-complex',
      title: 'Real-World Applications',
      type: 'video' as const,
      duration: '12:20',
      difficulty: 'intermediate' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=ysVcAYo7UPI',
        description: 'Khan Academy applications of complex numbers in real-world problems and engineering.',
        keyPoints: [
          'Electrical engineering: AC circuits and signals',
          'Signal processing: Fourier analysis',
          'Physics: wave functions and quantum mechanics',
          'Engineering: control systems and stability',
          'Mathematics: solving polynomial equations'
        ]
      }
    }
  ];

  return (
    <TheorySection
      moduleId="complex"
      title="Complex Numbers & Analysis"
      description="Master the elegant world of complex numbers. From basic arithmetic to advanced complex analysis, learn how these powerful mathematical objects unlock new dimensions in science and engineering."
      lessons={lessons}
      color="#EC4899"
    />
  );
}
