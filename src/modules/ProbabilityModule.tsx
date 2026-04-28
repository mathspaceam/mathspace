import { useEffect, useRef, useState, useCallback } from 'react';
import TabBar from '../components/ui/TabBar';
import GlassPanel from '../components/ui/GlassPanel';
import SliderRow from '../components/ui/SliderRow';

const TABS = [{ id: 'practical', label: 'Simulator' }, { id: 'calculator', label: 'Statistics Tools' }, { id: 'theory', label: 'Theory' }];
type DistType = 'uniform' | 'normal' | 'poisson' | 'exponential' | 'binomial' | 'gamma' | 'beta' | 'chi-square';

// Statistical calculation functions
function calculateStatistics(data: number[]): {
  mean: number;
  median: number;
  mode: number;
  variance: number;
  stdDev: number;
  skewness: number;
  kurtosis: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
  iqr: number;
} {
  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = data.reduce((sum, x) => sum + x, 0) / n;
  const variance = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  
  const median = n % 2 === 0 
    ? (sorted[n/2 - 1] + sorted[n/2]) / 2 
    : sorted[Math.floor(n/2)];
  
  // Calculate mode
  const frequency: { [key: number]: number } = {};
  data.forEach(x => frequency[x] = (frequency[x] || 0) + 1);
  const modeValue = Object.keys(frequency).reduce((a, b) => 
    frequency[Number(a)] > frequency[Number(b)] ? a : b
  , '0');
  const mode = Number(modeValue);
  
  // Calculate skewness and kurtosis
  const skewness = data.reduce((sum, x) => sum + Math.pow((x - mean) / stdDev, 3), 0) / n;
  const kurtosis = data.reduce((sum, x) => sum + Math.pow((x - mean) / stdDev, 4), 0) / n - 3;
  
  // Calculate quartiles
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  
  return {
    mean, median, mode, variance, stdDev, skewness, kurtosis,
    min: sorted[0], max: sorted[n-1], q1, q3, iqr
  };
}

function binomialRandom(n: number, p: number): number {
  let successes = 0;
  for (let i = 0; i < n; i++) {
    if (Math.random() < p) successes++;
  }
  return successes;
}

function gammaRandom(alpha: number, beta: number): number {
  // Marsaglia and Tsang's method
  let d = alpha - 1/3;
  let c = 1 / Math.sqrt(9 * d);
  let x, v;
  
  while (true) {
    do {
      x = randn();
      v = 1 + c * x;
    } while (v <= 0);
    
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) break;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) break;
  }
  
  return d * v / beta;
}

function betaRandom(alpha: number, beta: number): number {
  const x = gammaRandom(alpha, 1);
  const y = gammaRandom(beta, 1);
  return x / (x + y);
}

function chiSquareRandom(df: number): number {
  let sum = 0;
  for (let i = 0; i < df; i++) {
    sum += randn() * randn();
  }
  return sum;
}

function randn(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function randPoisson(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

export default function ProbabilityModule() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState('practical');
  const [dist, setDist] = useState<DistType>('normal');
  const [n, setN] = useState(500);
  const [mu, setMu] = useState(0);
  const [sigma, setSigma] = useState(1);
  const [lambda, setLambda] = useState(3);
  const [binomialN, setBinomialN] = useState(10);
  const [binomialP, setBinomialP] = useState(0.5);
  const [gammaAlpha, setGammaAlpha] = useState(2);
  const [gammaBeta, setGammaBeta] = useState(1);
  const [betaAlpha, setBetaAlpha] = useState(2);
  const [betaBeta, setBetaBeta] = useState(2);
  const [chiSquareDf, setChiSquareDf] = useState(3);
  const [data, setData] = useState<number[]>([]);
  const [running, setRunning] = useState(false);
  const animRef = useRef<number | null>(null);
  const dataRef = useRef<number[]>([]);
  const [panOffsetX, setPanOffsetX] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const generateSample = useCallback((): number => {
    switch (dist) {
      case 'normal': return mu + sigma * randn();
      case 'uniform': return Math.random() * 6 - 3;
      case 'poisson': return randPoisson(lambda);
      case 'exponential': return -Math.log(Math.random()) / lambda;
      case 'binomial': return binomialRandom(binomialN, binomialP);
      case 'gamma': return gammaRandom(gammaAlpha, gammaBeta);
      case 'beta': return betaRandom(betaAlpha, betaBeta);
      case 'chi-square': return chiSquareRandom(chiSquareDf);
      default: return 0;
    }
  }, [dist, mu, sigma, lambda, binomialN, binomialP, gammaAlpha, gammaBeta, betaAlpha, betaBeta, chiSquareDf]);

  const generate = useCallback(() => {
    const samples: number[] = Array.from({ length: n }, generateSample);
    dataRef.current = samples;
    setData(samples);
  }, [n, generateSample]);

  useEffect(() => { generate(); }, [generate]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, w, h);

    const samples = dataRef.current;
    if (samples.length === 0) return;

    const margin = { left: 50, right: 20, top: 20, bottom: 50 };
    const pw = w - margin.left - margin.right;
    const ph = h - margin.top - margin.bottom;

    const xMin = (dist === 'poisson' ? -0.5 : Math.min(...samples) - 0.5) + panOffsetX;
    const xMax = (dist === 'poisson' ? lambda * 3 + 0.5 : Math.max(...samples) + 0.5) + panOffsetX;
    const numBins = dist === 'poisson' ? Math.ceil(lambda * 3) + 1 : 30;

    const bins = new Array(numBins).fill(0);
    const binWidth = (xMax - xMin) / numBins;

    for (const s of samples) {
      const bin = Math.floor((s - xMin) / binWidth);
      if (bin >= 0 && bin < numBins) bins[bin]++;
    }

    const maxBin = Math.max(...bins);
    const xScale = pw / (xMax - xMin);
    const yScale = ph / maxBin;

    // Grid
    ctx.save();
    ctx.strokeStyle = 'rgba(59,130,246,0.06)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = margin.top + ph - (i / 5) * ph;
      ctx.beginPath(); ctx.moveTo(margin.left, y); ctx.lineTo(margin.left + pw, y); ctx.stroke();
      ctx.fillStyle = 'rgba(139,156,192,0.5)'; ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(maxBin * i / 5)}`, margin.left - 5, y + 4);
    }
    ctx.restore();

    // Bars
    for (let i = 0; i < numBins; i++) {
      const barH = bins[i] * yScale;
      const bx = margin.left + (i * binWidth) * xScale;
      const by = margin.top + ph - barH;
      const bw = Math.max(1, binWidth * xScale - 1);

      const t = bins[i] / maxBin;
      ctx.fillStyle = `rgba(59,${Math.round(130 + t * 50)},${Math.round(246 - t * 100)},${0.4 + t * 0.4})`;
      ctx.strokeStyle = `rgba(59,130,246,${0.5 + t * 0.3})`;
      ctx.lineWidth = 0.5;
      ctx.fillRect(bx, by, bw, barH);
      ctx.strokeRect(bx, by, bw, barH);
    }

    // Normal overlay
    if (dist === 'normal') {
      const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
      const variance = samples.reduce((a, s) => a + (s - mean) ** 2, 0) / samples.length;
      const std = Math.sqrt(variance);
      const totalArea = samples.length * binWidth;

      ctx.save();
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let px = 0; px <= pw; px++) {
        const x = xMin + (px / pw) * (xMax - xMin);
        const pdf = totalArea * (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mean) / std) ** 2);
        const cy = margin.top + ph - pdf * yScale;
        if (px === 0) {
          ctx.moveTo(margin.left + px, cy);
        } else {
          ctx.lineTo(margin.left + px, cy);
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    // X axis
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(margin.left, margin.top + ph); ctx.lineTo(margin.left + pw, margin.top + ph); ctx.stroke();
    ctx.fillStyle = 'rgba(139,156,192,0.6)'; ctx.font = '10px JetBrains Mono, monospace'; ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
      const x = xMin + (i / 5) * (xMax - xMin);
      const px = margin.left + (i / 5) * pw;
      ctx.fillText(x.toFixed(1), px, margin.top + ph + 16);
    }
    ctx.restore();

    // Stats
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    const variance = samples.reduce((a, s) => a + (s - mean) ** 2, 0) / samples.length;
    ctx.save();
    ctx.fillStyle = 'rgba(15,20,35,0.88)';
    ctx.strokeStyle = 'rgba(59,130,246,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(margin.left + pw - 170, margin.top, 165, 60, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8B9CC0'; ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`n = ${samples.length}`, margin.left + pw - 160, margin.top + 18);
    ctx.fillText(`mean = ${mean.toFixed(3)}`, margin.left + pw - 160, margin.top + 34);
    ctx.fillText(`std = ${Math.sqrt(variance).toFixed(3)}`, margin.left + pw - 160, margin.top + 50);
    ctx.restore();
  }, [dist, lambda, panOffsetX]);

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

  useEffect(() => { draw(); }, [data, draw]);

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
      setPanOffsetX(prev => prev - dx * 0.0008);
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

  const startStream = () => {
    if (running) {
      setRunning(false);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }
    setRunning(true);
    dataRef.current = [];
    let count = 0;
    const target = n;
    const step = () => {
      const batch = Math.min(20, target - count);
      for (let i = 0; i < batch; i++) {
        dataRef.current.push(generateSample());
        count++;
      }
      setData([...dataRef.current]);
      if (count < target) {
        animRef.current = requestAnimationFrame(step) as unknown as number;
      } else {
        setRunning(false);
      }
    };
    animRef.current = requestAnimationFrame(step) as unknown as number;
  };

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  return (
    <div className="flex flex-col h-full">
      <TabBar tabs={TABS} active={tab} onChange={setTab} color="#14B8A6" />
      {tab === 'theory' ? <ProbTheory /> : tab === 'calculator' ? <StatisticsCalculator /> : (
        <div className="flex flex-1 gap-4 min-h-0">
          <div className="flex-1 relative rounded-xl overflow-hidden">
            <canvas ref={canvasRef} className="w-full h-full" style={{ minHeight: 300 }} />
          </div>
          <div className="w-64 flex flex-col gap-3 overflow-y-auto">
            <GlassPanel title="Distribution" accentColor="#14B8A6">
              <div className="grid grid-cols-2 gap-2">
                {(['normal', 'uniform', 'poisson', 'exponential', 'binomial', 'gamma', 'beta', 'chi-square'] as DistType[]).map(d => (
                  <button key={d} onClick={() => setDist(d)}
                    className="py-2 rounded-lg text-xs font-medium capitalize transition-all"
                    style={{
                      background: dist === d ? '#14B8A620' : 'rgba(255,255,255,0.05)',
                      color: dist === d ? '#14B8A6' : 'var(--text-secondary)',
                      border: dist === d ? '1px solid #14B8A640' : '1px solid transparent',
                    }}>
                    {d.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </GlassPanel>

            {dist === 'normal' && (
              <GlassPanel title="Parameters" accentColor="#3B82F6">
                <SliderRow label="Mean (μ)" value={mu} min={-3} max={3} step={0.1} onChange={setMu} color="#3B82F6" />
                <SliderRow label="Std Dev (σ)" value={sigma} min={0.1} max={3} step={0.1} onChange={setSigma} color="#10B981" />
              </GlassPanel>
            )}

            {(dist === 'poisson' || dist === 'exponential') && (
              <GlassPanel title="Parameters" accentColor="#F59E0B">
                <SliderRow label="Lambda (λ)" value={lambda} min={0.5} max={10} step={0.5} onChange={setLambda} color="#F59E0B" />
              </GlassPanel>
            )}

            {dist === 'binomial' && (
              <GlassPanel title="Parameters" accentColor="#8B5CF6">
                <SliderRow label="Trials (n)" value={binomialN} min={1} max={50} step={1} onChange={setBinomialN} color="#8B5CF6" />
                <SliderRow label="Probability (p)" value={binomialP} min={0.1} max={0.9} step={0.05} onChange={setBinomialP} color="#EC4899" />
              </GlassPanel>
            )}

            {dist === 'gamma' && (
              <GlassPanel title="Parameters" accentColor="#F59E0B">
                <SliderRow label="Alpha (α)" value={gammaAlpha} min={0.5} max={5} step={0.1} onChange={setGammaAlpha} color="#F59E0B" />
                <SliderRow label="Beta (β)" value={gammaBeta} min={0.5} max={5} step={0.1} onChange={setGammaBeta} color="#EF4444" />
              </GlassPanel>
            )}

            {dist === 'beta' && (
              <GlassPanel title="Parameters" accentColor="#10B981">
                <SliderRow label="Alpha (α)" value={betaAlpha} min={0.5} max={5} step={0.1} onChange={setBetaAlpha} color="#10B981" />
                <SliderRow label="Beta (β)" value={betaBeta} min={0.5} max={5} step={0.1} onChange={setBetaBeta} color="#06B6D4" />
              </GlassPanel>
            )}

            {dist === 'chi-square' && (
              <GlassPanel title="Parameters" accentColor="#EF4444">
                <SliderRow label="Degrees of Freedom" value={chiSquareDf} min={1} max={20} step={1} onChange={setChiSquareDf} color="#EF4444" />
              </GlassPanel>
            )}

            <GlassPanel title="Simulation" accentColor="#10B981">
              <SliderRow label={`Samples (n=${n})`} value={n} min={50} max={5000} step={50} onChange={setN} color="#10B981" />
              <div className="flex gap-2">
                <button onClick={generate} className="flex-1 py-2 rounded-lg text-xs font-medium bg-[#3B82F620] text-[#3B82F6] hover:bg-[#3B82F630] transition-colors">
                  Generate
                </button>
                <button onClick={startStream}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{ background: running ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: running ? '#EF4444' : '#10B981' }}>
                  {running ? 'Stop' : 'Stream'}
                </button>
              </div>
            </GlassPanel>
          </div>
        </div>
      )}
    </div>
  );
}

function StatisticsCalculator() {
  const calculatorCanvasRef = useRef<HTMLCanvasElement>(null);
  const [dataInput, setDataInput] = useState('1, 2, 3, 4, 5, 6, 7, 8, 9, 10');
  const [data, setData] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const [statistics, setStatistics] = useState<ReturnType<typeof calculateStatistics> | null>(null);
  const [showVisualization, setShowVisualization] = useState(true);
  const [chartType, setChartType] = useState<'histogram' | 'boxplot' | 'scatter'>('histogram');

  const parseData = () => {
    try {
      const parsed = dataInput.split(',').map(x => parseFloat(x.trim())).filter(x => !isNaN(x));
      if (parsed.length > 0) {
        setData(parsed);
        setStatistics(calculateStatistics(parsed));
      }
    } catch (error) {
      console.error('Error parsing data:', error);
    }
  };

  useEffect(() => {
    parseData();
  }, []);

  const drawVisualization = useCallback(() => {
    const canvas = calculatorCanvasRef.current;
    if (!canvas || !showVisualization || !statistics) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, w, h);

    const margin = { left: 60, right: 20, top: 20, bottom: 60 };
    const pw = w - margin.left - margin.right;
    const ph = h - margin.top - margin.bottom;

    if (chartType === 'histogram') {
      drawHistogram(ctx, data, margin, pw, ph);
    } else if (chartType === 'boxplot') {
      drawBoxplot(ctx, statistics, margin, pw, ph);
    } else if (chartType === 'scatter') {
      drawScatter(ctx, data, margin, pw, ph);
    }

    // Draw statistics overlay
    ctx.save();
    ctx.fillStyle = 'rgba(15,20,35,0.88)';
    ctx.strokeStyle = 'rgba(59,130,246,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(margin.left + pw - 180, margin.top, 175, 120, 8);
    ctx.fill(); ctx.stroke();
    
    ctx.fillStyle = '#8B9CC0';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Mean: ${statistics.mean.toFixed(3)}`, margin.left + pw - 170, margin.top + 18);
    ctx.fillText(`Median: ${statistics.median.toFixed(3)}`, margin.left + pw - 170, margin.top + 32);
    ctx.fillText(`Std Dev: ${statistics.stdDev.toFixed(3)}`, margin.left + pw - 170, margin.top + 46);
    ctx.fillText(`Min: ${statistics.min.toFixed(3)}`, margin.left + pw - 170, margin.top + 60);
    ctx.fillText(`Max: ${statistics.max.toFixed(3)}`, margin.left + pw - 170, margin.top + 74);
    ctx.fillText(`Skewness: ${statistics.skewness.toFixed(3)}`, margin.left + pw - 170, margin.top + 88);
    ctx.fillText(`Kurtosis: ${statistics.kurtosis.toFixed(3)}`, margin.left + pw - 170, margin.top + 102);
    ctx.restore();
  }, [data, statistics, showVisualization, chartType]);

  const drawHistogram = (ctx: CanvasRenderingContext2D, data: number[], margin: any, pw: number, ph: number) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const numBins = Math.min(20, Math.ceil(Math.sqrt(data.length)));
    const binWidth = (max - min) / numBins;
    
    const bins = new Array(numBins).fill(0);
    for (const value of data) {
      const bin = Math.min(Math.floor((value - min) / binWidth), numBins - 1);
      bins[bin]++;
    }
    
    const maxBin = Math.max(...bins);
    const xScale = pw / (max - min);
    const yScale = ph / maxBin;

    // Draw bars
    for (let i = 0; i < numBins; i++) {
      const barHeight = bins[i] * yScale;
      const x = margin.left + (i * binWidth) * xScale;
      const y = margin.top + ph - barHeight;
      const width = Math.max(1, binWidth * xScale - 2);

      const intensity = bins[i] / maxBin;
      ctx.fillStyle = `rgba(59, ${130 + intensity * 50}, ${246 - intensity * 100}, ${0.4 + intensity * 0.4})`;
      ctx.fillRect(x, y, width, barHeight);
    }

    // Draw axes
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + ph);
    ctx.lineTo(margin.left + pw, margin.top + ph);
    ctx.stroke();
  };

  const drawBoxplot = (ctx: CanvasRenderingContext2D, stats: ReturnType<typeof calculateStatistics>, margin: any, pw: number, ph: number) => {
    const boxWidth = pw * 0.3;
    const boxX = margin.left + (pw - boxWidth) / 2;
    const scale = ph / (stats.max - stats.min);

    // Calculate positions
    const minPos = margin.top + ph - (stats.min - stats.min) * scale;
    const q1Pos = margin.top + ph - (stats.q1 - stats.min) * scale;
    const medianPos = margin.top + ph - (stats.median - stats.min) * scale;
    const q3Pos = margin.top + ph - (stats.q3 - stats.min) * scale;
    const maxPos = margin.top + ph - (stats.max - stats.min) * scale;

    // Draw box
    ctx.fillStyle = 'rgba(59,130,246,0.3)';
    ctx.fillRect(boxX, q3Pos, boxWidth, q1Pos - q3Pos);
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX, q3Pos, boxWidth, q1Pos - q3Pos);

    // Draw median
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(boxX, medianPos);
    ctx.lineTo(boxX + boxWidth, medianPos);
    ctx.stroke();

    // Draw whiskers
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(boxX + boxWidth/2, q3Pos);
    ctx.lineTo(boxX + boxWidth/2, maxPos);
    ctx.moveTo(boxX + boxWidth/2 - 10, maxPos);
    ctx.lineTo(boxX + boxWidth/2 + 10, maxPos);
    ctx.moveTo(boxX + boxWidth/2, q1Pos);
    ctx.lineTo(boxX + boxWidth/2, minPos);
    ctx.moveTo(boxX + boxWidth/2 - 10, minPos);
    ctx.lineTo(boxX + boxWidth/2 + 10, minPos);
    ctx.stroke();
  };

  const drawScatter = (ctx: CanvasRenderingContext2D, data: number[], margin: any, pw: number, ph: number) => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const xScale = pw / (data.length - 1);
    const yScale = ph / (max - min);

    ctx.fillStyle = 'rgba(59,130,246,0.6)';
    for (let i = 0; i < data.length; i++) {
      const x = margin.left + i * xScale;
      const y = margin.top + ph - (data[i] - min) * yScale;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw trend line
    const n = data.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = data.reduce((sum, y) => sum + y, 0);
    const sumXY = data.reduce((sum, y, i) => sum + i * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = margin.left + i * xScale;
      const y = margin.top + ph - (slope * i + intercept - min) * yScale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

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
        <GlassPanel title="📊 Data Input" accentColor="#14B8A6" className="flex-shrink-0">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wider">
                Data Points (comma-separated)
              </label>
              <textarea
                value={dataInput}
                onChange={e => setDataInput(e.target.value)}
                className="w-full px-3 py-3 text-sm bg-[#0F172A] border border-[#334155] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A620] transition-all resize-none"
                rows={4}
                placeholder="1, 2, 3, 4, 5, 6, 7, 8, 9, 10"
              />
            </div>
            <button
              onClick={parseData}
              className="w-full py-3 rounded-lg text-sm font-semibold transition-all bg-gradient-to-r from-[#14B8A6] to-[#0D9488] text-white hover:from-[#0D9488] hover:to-[#0F766E] focus:outline-none focus:ring-2 focus:ring-[#14B8A620] shadow-lg transform hover:scale-105"
            >
              Analyze Data
            </button>
          </div>
        </GlassPanel>

        <GlassPanel title="📈 Visualization" accentColor="#3B82F6" className="flex-shrink-0">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wider">Chart Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'histogram', label: 'Histogram', icon: '📊' },
                  { id: 'boxplot', label: 'Box Plot', icon: '📦' },
                  { id: 'scatter', label: 'Scatter', icon: '⚡' },
                ].map(chart => (
                  <button
                    key={chart.id}
                    onClick={() => setChartType(chart.id as any)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      chartType === chart.id 
                        ? 'bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white shadow-lg' 
                        : 'bg-[#1E293B] text-[var(--text-secondary)] hover:bg-[#334155] border border-[#334155]'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg">{chart.icon}</div>
                      <div className="text-xs">{chart.label}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-3 text-sm cursor-pointer p-3 rounded-lg transition-all hover:bg-[#3B82F610]">
              <input
                type="checkbox"
                checked={showVisualization}
                onChange={e => setShowVisualization(e.target.checked)}
                className="w-4 h-4 text-[#3B82F6] bg-[#0B0E14] border-[#3B82F630] rounded focus:ring-[#3B82F620] focus:ring-2"
              />
              <span className="text-white font-medium">Show Visualization</span>
            </label>
          </div>
        </GlassPanel>

        {statistics && (
          <GlassPanel title="📋 Statistics Summary" accentColor="#10B981" className="flex-shrink-0">
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[var(--text-muted)]">Mean:</span>
                  <div className="font-mono text-white">{statistics.mean.toFixed(4)}</div>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Median:</span>
                  <div className="font-mono text-white">{statistics.median.toFixed(4)}</div>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Mode:</span>
                  <div className="font-mono text-white">{statistics.mode.toFixed(4)}</div>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Std Dev:</span>
                  <div className="font-mono text-white">{statistics.stdDev.toFixed(4)}</div>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Variance:</span>
                  <div className="font-mono text-white">{statistics.variance.toFixed(4)}</div>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Skewness:</span>
                  <div className="font-mono text-white">{statistics.skewness.toFixed(4)}</div>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Kurtosis:</span>
                  <div className="font-mono text-white">{statistics.kurtosis.toFixed(4)}</div>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Range:</span>
                  <div className="font-mono text-white">{(statistics.max - statistics.min).toFixed(4)}</div>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">IQR:</span>
                  <div className="font-mono text-white">{statistics.iqr.toFixed(4)}</div>
                </div>
                <div>
                  <span className="text-[var(--text-muted)]">Count:</span>
                  <div className="font-mono text-white">{data.length}</div>
                </div>
              </div>
            </div>
          </GlassPanel>
        )}

        <GlassPanel title="🎯 Quick Tests" accentColor="#F59E0B" className="flex-shrink-0">
          <div className="space-y-2">
            {[
              { label: 'Normal Distribution', data: '0.5, 0.8, 1.1, 1.4, 1.7, 2.0, 2.3, 2.6, 2.9, 3.2' },
              { label: 'Uniform Distribution', data: '1, 2, 3, 4, 5, 6, 7, 8, 9, 10' },
              { label: 'Exponential Growth', data: '1, 2, 4, 8, 16, 32, 64, 128, 256, 512' },
              { label: 'Sine Wave', data: '0, 0.5, 0.87, 1, 0.87, 0.5, 0, -0.5, -0.87, -1' },
            ].map(test => (
              <button
                key={test.label}
                onClick={() => {
                  setDataInput(test.data);
                  const parsed = test.data.split(',').map(x => parseFloat(x.trim()));
                  setData(parsed);
                  setStatistics(calculateStatistics(parsed));
                }}
                className="text-left text-xs text-[var(--text-secondary)] hover:text-[#F59E0B] font-mono transition-colors py-1"
              >
                {test.label}
              </button>
            ))}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}

import TheorySection from '../components/ui/TheorySection';

function ProbTheory() {
  const lessons = [
    {
      id: 'probability-intro',
      title: 'Introduction to Probability',
      type: 'video' as const,
      duration: '12:30',
      difficulty: 'beginner' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=uzkc-qNVoOk',
        description: 'Khan Academy introduction to probability explained with independent and dependent events. Master the fundamentals of probability theory.',
        keyPoints: [
          'Probability scale from 0 to 1',
          'Sample spaces and events',
          'Classical vs empirical probability',
          'Independent and dependent events',
          'Basic probability rules'
        ]
      }
    },
    {
      id: 'distributions',
      title: 'Probability Distributions',
      type: 'video' as const,
      duration: '15:45',
      difficulty: 'intermediate' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=uhxtUt_-GyM',
        description: 'Khan Academy introduction to descriptive statistics and central tendency. Learn about mean, median, and mode as foundations for probability distributions.',
        keyPoints: [
          'Measures of central tendency',
          'Normal distribution properties',
          'Standard deviation and variance',
          'Probability density functions',
          'Applications in statistics'
        ]
      }
    },
    {
      id: 'probability-theory',
      title: 'Advanced Probability Theory',
      type: 'text' as const,
      duration: '25 min read',
      difficulty: 'intermediate' as const,
      content: {
        html: `
          <h3>Master Advanced Probability Concepts</h3>
          <p>Probability theory provides the mathematical foundation for reasoning about uncertainty and randomness. These concepts are essential for statistics, machine learning, and many scientific fields.</p>
          
          <h4>Conditional Probability</h4>
          <p>Conditional probability measures the probability of an event occurring given that another event has already occurred:</p>
          <blockquote>P(A|B) = P(A ∩ B) / P(B)</blockquote>
          <p>This concept is fundamental to understanding dependent events and Bayesian reasoning.</p>
          
          <h4>Bayes' Theorem</h4>
          <p>Bayes' Theorem provides a way to update our beliefs based on new evidence:</p>
          <blockquote>P(A|B) = P(B|A) × P(A) / P(B)</blockquote>
          <p>This powerful theorem is the foundation of Bayesian statistics and machine learning algorithms.</p>
          
          <h4>Expected Value and Variance</h4>
          <p>The expected value represents the long-run average outcome:</p>
          <blockquote>E[X] = Σ x × P(x) for discrete variables</blockquote>
          <blockquote>E[X] = ∫ x × f(x) dx for continuous variables</blockquote>
          <p>Variance measures the spread of the distribution:</p>
          <blockquote>Var(X) = E[X²] - (E[X])²</blockquote>
          
          <h4>Common Probability Distributions</h4>
          <ul>
            <li><strong>Normal Distribution:</strong> Bell-shaped curve, ubiquitous in nature</li>
            <li><strong>Uniform Distribution:</strong> Equal probability for all outcomes</li>
            <li><strong>Binomial Distribution:</strong> Number of successes in n trials</li>
            <li><strong>Poisson Distribution:</strong> Models rare events over time</li>
            <li><strong>Exponential Distribution:</strong> Models waiting times between events</li>
          </ul>
          
          <h4>Statistical Inference</h4>
          <p>Using probability to draw conclusions from data:</p>
          <ul>
            <li><strong>Hypothesis Testing:</strong> Testing claims about population parameters</li>
            <li><strong>Confidence Intervals:</strong> Estimating population parameters</li>
            <li><strong>Regression Analysis:</strong> Modeling relationships between variables</li>
            <li><strong>Bayesian Inference:</strong> Updating beliefs with evidence</li>
          </ul>
        `,
        formulas: [
          {
            expression: 'P(A|B) = P(A ∩ B) / P(B)',
            description: 'Conditional Probability Formula'
          },
          {
            expression: 'P(A|B) = P(B|A) × P(A) / P(B)',
            description: 'Bayes\' Theorem'
          },
          {
            expression: 'E[X] = Σ x·P(x)',
            description: 'Expected Value (Discrete)'
          },
          {
            expression: 'f(x) = (1/(σ√(2π)))·e^(-0.5*((x-μ)/σ)²)',
            description: 'Normal Distribution PDF'
          }
        ]
      }
    },
    {
      id: 'statistical-inference',
      title: 'Statistical Inference',
      type: 'video' as const,
      duration: '18:20',
      difficulty: 'advanced' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=uzkc-qNVoOk',
        description: 'Khan Academy inferential statistics covering probability and statistical inference methods for drawing conclusions from data.',
        keyPoints: [
          'Hypothesis testing fundamentals',
          'Confidence intervals and significance',
          'Statistical inference methods',
          'Data analysis techniques',
          'Applications in research'
        ]
      }
    },
    {
      id: 'applications-probability',
      title: 'Real-World Applications',
      type: 'video' as const,
      duration: '14:15',
      difficulty: 'intermediate' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=uzkc-qNVoOk',
        description: 'Khan Academy probability applications in real-world scenarios. See how probability theory transforms our understanding of uncertainty.',
        keyPoints: [
          'Finance: risk assessment and portfolio management',
          'Medicine: clinical trials and diagnosis',
          'Engineering: reliability and quality control',
          'Computer Science: algorithms and AI',
          'Social Sciences: survey analysis and predictions'
        ]
      }
    }
  ];

  return (
    <TheorySection
      moduleId="probability"
      title="Probability Theory & Statistics"
      description="Master the mathematics of uncertainty and randomness. From basic probability concepts to advanced statistical inference, learn how to quantify, analyze, and make predictions under uncertainty."
      lessons={lessons}
      color="#14B8A6"
    />
  );
}
