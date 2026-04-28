import { useEffect, useRef, useState, useCallback } from 'react';
import TabBar from '../components/ui/TabBar';
import GlassPanel from '../components/ui/GlassPanel';
import SliderRow from '../components/ui/SliderRow';

const TABS = [{ id: 'practical', label: 'Circle Engine' }, { id: 'theory', label: 'Theory' }];

export default function TrigonometryModule() {
  const circleRef = useRef<HTMLCanvasElement>(null);
  const waveRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState('practical');
  const [amplitude, setAmplitude] = useState(1);
  const [frequency, setFrequency] = useState(1);
  const [phase, setPhase] = useState(0);
  const [theta, setTheta] = useState(0);
  const [mode, setMode] = useState<'sin' | 'cos' | 'both'>('sin');
  const animRef = useRef<number | null>(null);
  const [animating, setAnimating] = useState(true);

  const drawCircle = useCallback((th: number) => {
    const canvas = circleRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;
    const R = Math.min(w, h) * 0.38;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.save();
    ctx.strokeStyle = 'rgba(59,130,246,0.08)';
    ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) {
      const x = cx + i * R / 2;
      const y = cy + i * R / 2;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.restore();

    // Axes
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
    ctx.restore();

    // Unit circle
    ctx.save();
    ctx.strokeStyle = 'rgba(59,130,246,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    // Angle arc
    ctx.save();
    ctx.strokeStyle = 'rgba(245,158,11,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.25, 0, -th, th < 0); ctx.stroke();
    ctx.restore();

    const px = cx + R * Math.cos(th);
    const py = cy - R * Math.sin(th);

    // Radius line
    ctx.save();
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#3B82F6';
    ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
    ctx.restore();

    // Sine component (vertical)
    if (mode !== 'cos') {
      ctx.save();
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(px, cy); ctx.lineTo(px, py); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(cx, py); ctx.lineTo(px, py); ctx.stroke();
      ctx.restore();
    }

    // Cosine component (horizontal)
    if (mode !== 'sin') {
      ctx.save();
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath(); ctx.moveTo(cx, py); ctx.lineTo(px, py); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(px, cy); ctx.lineTo(px, py); ctx.stroke();
      ctx.restore();
    }

    // Point on circle
    ctx.save();
    ctx.fillStyle = '#3B82F6';
    ctx.shadowColor = '#3B82F6';
    ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Labels
    ctx.save();
    ctx.fillStyle = '#8B9CC0';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`θ = ${(th * 180 / Math.PI % 360).toFixed(1)}°`, cx, h - 12);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#10B981';
    ctx.fillText(`sin = ${Math.sin(th).toFixed(3)}`, 10, 20);
    ctx.fillStyle = '#F59E0B';
    ctx.fillText(`cos = ${Math.cos(th).toFixed(3)}`, 10, 36);
    ctx.restore();
  }, [mode]);

  const drawWave = useCallback((th: number) => {
    const canvas = waveRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.save();
    ctx.strokeStyle = 'rgba(59,130,246,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0.25; i <= 1; i += 0.25) {
      ctx.beginPath(); ctx.moveTo(0, cy + i * cy * 0.8); ctx.lineTo(w, cy + i * cy * 0.8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, cy - i * cy * 0.8); ctx.lineTo(w, cy - i * cy * 0.8); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    ctx.restore();

    const A = amplitude;
    const maxA = 2;
    const scale = (cy * 0.85) / maxA;
    const xScale = w / (Math.PI * 4);

    const drawWaveform = (fn: (x: number) => number, color: string) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let px = 0; px <= w; px++) {
        const x = px / xScale;
        const y = fn(x);
        const canY = cy - y * scale;
        if (px === 0) {
          ctx.moveTo(px, canY);
        } else {
          ctx.lineTo(px, canY);
        }
      }
      ctx.stroke();
      ctx.restore();
    };

    if (mode !== 'cos') drawWaveform(x => A * Math.sin(frequency * (x - phase)), '#10B981');
    if (mode !== 'sin') drawWaveform(x => A * Math.cos(frequency * (x - phase)), '#F59E0B');

    // Current theta marker
    const markerX = (th % (Math.PI * 4) + Math.PI * 4) % (Math.PI * 4) * xScale;
    ctx.save();
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(markerX, 0); ctx.lineTo(markerX, h); ctx.stroke();
    ctx.restore();

    if (mode !== 'cos') {
      const sinY = cy - A * Math.sin(frequency * (th - phase)) * scale;
      ctx.save();
      ctx.fillStyle = '#10B981';
      ctx.shadowColor = '#10B981';
      ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(markerX, sinY, 6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Formula
    ctx.save();
    ctx.fillStyle = 'rgba(15,20,35,0.88)';
    ctx.strokeStyle = 'rgba(59,130,246,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(10, 10, 240, 35, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#10B981'; ctx.font = '12px JetBrains Mono, monospace';
    ctx.fillText(`f(x) = ${A.toFixed(2)}·sin(${frequency.toFixed(2)}x${phase >= 0 ? '-' : '+'}${Math.abs(phase).toFixed(2)})`, 18, 32);
    ctx.restore();
  }, [amplitude, frequency, phase, mode]);

  useEffect(() => {
    [circleRef, waveRef].forEach(ref => {
      const canvas = ref.current;
      if (!canvas) return;
      const ro = new ResizeObserver(() => {
        canvas.width = canvas.offsetWidth * devicePixelRatio;
        canvas.height = canvas.offsetHeight * devicePixelRatio;
      });
      ro.observe(canvas);
      return () => ro.disconnect();
    });
  }, []);

  useEffect(() => {
    drawCircle(theta);
    drawWave(theta);
  }, [theta, drawCircle, drawWave]);

  useEffect(() => {
    if (animating) {
      let start: number | null = null;
      const step = (ts: number) => {
        if (!start) start = ts;
        const th = ((ts - start) / 1000) * 1.2;
        setTheta(th);
        animRef.current = requestAnimationFrame(step) as unknown as number;
      };
      animRef.current = requestAnimationFrame(step) as unknown as number;
    } else {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [animating]);

  return (
    <div className="flex flex-col h-full">
      <TabBar tabs={TABS} active={tab} onChange={setTab} color="#8B5CF6" />
      {tab === 'theory' ? <TrigTheory /> : (
        <div className="flex flex-1 gap-4 min-h-0">
          <div className="flex flex-1 gap-2 min-h-0">
            <div className="flex-1 relative rounded-xl overflow-hidden">
              <canvas ref={circleRef} className="w-full h-full" style={{ minHeight: 280 }} />
            </div>
            <div className="flex-1 relative rounded-xl overflow-hidden">
              <canvas ref={waveRef} className="w-full h-full" style={{ minHeight: 280 }} />
            </div>
          </div>
          <div className="w-56 flex flex-col gap-3 overflow-y-auto">
            <GlassPanel title="Wave Controls" accentColor="#8B5CF6">
              <SliderRow label="Amplitude A" value={amplitude} min={0.1} max={2} step={0.05} onChange={setAmplitude} color="#10B981" />
              <SliderRow label="Frequency f" value={frequency} min={0.1} max={5} step={0.1} onChange={setFrequency} color="#F59E0B" />
              <SliderRow label="Phase φ" value={phase} min={-Math.PI} max={Math.PI} step={0.05} onChange={setPhase} color="#EC4899" unit="rad" />
            </GlassPanel>
            <GlassPanel title="Display Mode" accentColor="#06B6D4">
              <div className="flex flex-col gap-2">
                {(['sin', 'cos', 'both'] as const).map(m => (
                  <button key={m} onClick={() => setMode(m)}
                    className="py-2 rounded-lg text-xs font-medium capitalize transition-all"
                    style={{
                      background: mode === m ? '#8B5CF620' : 'rgba(255,255,255,0.05)',
                      color: mode === m ? '#8B5CF6' : 'var(--text-secondary)',
                      border: mode === m ? '1px solid #8B5CF640' : '1px solid transparent',
                    }}>
                    {m === 'both' ? 'sin + cos' : `${m}(x)`}
                  </button>
                ))}
              </div>
            </GlassPanel>
            <GlassPanel title="Animation" accentColor="#10B981">
              <button onClick={() => setAnimating(a => !a)}
                className="w-full py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: animating ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                  color: animating ? '#EF4444' : '#10B981',
                }}>
                {animating ? 'Pause' : 'Play'}
              </button>
              {!animating && <SliderRow label="θ" value={theta} min={0} max={Math.PI * 4} step={0.01} onChange={setTheta} color="#3B82F6" unit="rad" />}
            </GlassPanel>
          </div>
        </div>
      )}
    </div>
  );
}

import TheorySection from '../components/ui/TheorySection';

function TrigTheory() {
  const lessons = [
    {
      id: 'trig-intro',
      title: 'Introduction to Trigonometry',
      type: 'video' as const,
      duration: '12:15',
      difficulty: 'beginner' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=1m9p9iubMLU',
        description: 'Khan Academy introduction to the unit circle and basic trigonometry. Learn how angles relate to coordinates on the circle.',
        keyPoints: [
          'Right triangle definitions',
          'Unit circle visualization',
          'Sine, cosine, and tangent',
          'Angle measurement in radians and degrees',
          'Real-world applications'
        ]
      }
    },
    {
      id: 'unit-circle',
      title: 'Unit Circle and Trig Functions',
      type: 'video' as const,
      duration: '15:30',
      difficulty: 'intermediate' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=EnwWxMZVBeg',
        description: 'Khan Academy introduction to radians and the unit circle. Master the fundamental visualization tool for trigonometry.',
        keyPoints: [
          'Unit circle coordinates',
          'Radians vs degrees conversion',
          'Reference angles',
          'Periodicity and symmetry',
          'Graphs of trigonometric functions'
        ]
      }
    },
    {
      id: 'trig-identities',
      title: 'Trigonometric Identities',
      type: 'video' as const,
      duration: '18:20',
      difficulty: 'intermediate' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=KoYZErFpZ5Q',
        description: 'Khan Academy video on solving triangles using the unit circle and applying trigonometric identities.',
        keyPoints: [
          'Pythagorean identities',
          'Sum and difference formulas',
          'Double angle formulas',
          'Product-to-sum identities',
          'Applications in problem solving'
        ]
      }
    },
    {
      id: 'advanced-trig',
      title: 'Advanced Trigonometry Applications',
      type: 'text' as const,
      duration: '25 min read',
      difficulty: 'advanced' as const,
      content: {
        html: `
          <h3>Advanced Trigonometry Applications</h3>
          <p>Explore sophisticated applications of trigonometry in physics, engineering, and mathematics.</p>
          
          <h4>Inverse Trigonometric Functions</h4>
          <p>The inverse functions return angles from trigonometric ratios:</p>
          <blockquote>sin⁻¹(x) returns the angle whose sine is x</blockquote>
          <blockquote>Domain restrictions apply to ensure functions are one-to-one</blockquote>
          
          <h4>Law of Sines and Cosines</h4>
          <p>For any triangle with sides a, b, c and opposite angles A, B, C:</p>
          <blockquote>Law of Sines: a/sin(A) = b/sin(B) = c/sin(C)</blockquote>
          <blockquote>Law of Cosines: c² = a² + b² - 2ab·cos(C)</blockquote>
          
          <h4>Complex Numbers and Trigonometry</h4>
          <p>Euler's formula connects complex numbers with trigonometry:</p>
          <blockquote>e^(iθ) = cos(θ) + i·sin(θ)</blockquote>
          <p>This leads to De Moivre's Theorem for powers:</p>
          <blockquote>(cos(θ) + i·sin(θ))ⁿ = cos(nθ) + i·sin(nθ)</blockquote>
          
          <h4>Fourier Series</h4>
          <p>Any periodic function can be expressed as a sum of sines and cosines:</p>
          <blockquote>f(x) = a₀/2 + Σ[aₙcos(nx) + bₙsin(nx)]</blockquote>
          <p>This is fundamental to signal processing and wave analysis.</p>
          
          <h4>Applications in Physics</h4>
          <ul>
            <li><strong>Wave Motion:</strong> y = A·sin(kx - ωt + φ)</li>
            <li><strong>Simple Harmonic Motion:</strong> x = A·cos(ωt + φ)</li>
            <li><strong>Electromagnetic Waves:</strong> E = E₀·sin(kx - ωt)</li>
            <li><strong>Quantum Mechanics:</strong> Wave functions use complex exponentials</li>
          </ul>
        `,
        formulas: [
          {
            expression: 'a/sin(A) = b/sin(B) = c/sin(C)',
            description: 'Law of Sines'
          },
          {
            expression: 'c² = a² + b² - 2ab·cos(C)',
            description: 'Law of Cosines'
          },
          {
            expression: 'y = A·sin(kx - ωt + φ)',
            description: 'Wave Equation'
          },
          {
            expression: 'f(x) = a₀/2 + Σ[aₙcos(nx) + bₙsin(nx)]',
            description: 'Fourier Series'
          }
        ]
      }
    },
    {
      id: 'applications-trig',
      title: 'Real-World Applications',
      type: 'video' as const,
      duration: '14:30',
      difficulty: 'intermediate' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=Jni7E2RH43s',
        description: 'Khan Academy unit circle manipulative and real-world applications. See how trigonometry is used in practical problems.',
        keyPoints: [
          'Physics: waves, oscillations, and harmonic motion',
          'Engineering: signal processing and control systems',
          'Navigation: GPS and astronomy',
          'Architecture: structural design',
          'Computer graphics: rotations and animations'
        ]
      }
    }
  ];

  return (
    <TheorySection
      moduleId="trigonometry"
      title="Trigonometry & Periodic Functions"
      description="Master the elegant mathematics of triangles and periodic phenomena. From basic right triangle trigonometry to advanced Fourier analysis, learn how these functions model cyclical patterns throughout nature and technology."
      lessons={lessons}
      color="#8B5CF6"
    />
  );
}
