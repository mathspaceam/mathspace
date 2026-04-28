import { useEffect, useRef, useState, useCallback } from 'react';
import TabBar from '../components/ui/TabBar';
import GlassPanel from '../components/ui/GlassPanel';
import { worldToCanvas } from '../utils/math';

const TABS = [{ id: 'practical', label: 'Transformer' }, { id: 'calculator', label: 'Matrix Calculator' }, { id: 'theory', label: 'Theory' }];

function matMul2(A: number[][], v: [number, number]): [number, number] {
  return [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]];
}

function det2(A: number[][]): number {
  return A[0][0] * A[1][1] - A[0][1] * A[1][0];
}

function eigenvalues2(A: number[][]): { re: number; im: number }[] {
  const trace = A[0][0] + A[1][1];
  const d = det2(A);
  const disc = trace * trace - 4 * d;
  if (disc >= 0) {
    const sq = Math.sqrt(disc);
    return [{ re: (trace + sq) / 2, im: 0 }, { re: (trace - sq) / 2, im: 0 }];
  }
  const sq = Math.sqrt(-disc);
  return [{ re: trace / 2, im: sq / 2 }, { re: trace / 2, im: -sq / 2 }];
}

function eigenvectors2(A: number[][], lambda: number): [number, number] {
  const b0 = A[0][0] - lambda, b1 = A[0][1];
  const len = Math.sqrt(b0 * b0 + b1 * b1);
  if (len < 1e-9) return [1, 0];
  return [-b1 / len, b0 / len];
}

// Matrix calculator operations
function addMatrices(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((val, j) => val + B[i][j]));
}

function subtractMatrices(A: number[][], B: number[][]): number[][] {
  return A.map((row, i) => row.map((val, j) => val - B[i][j]));
}

function multiplyMatrices(A: number[][], B: number[][]): number[][] {
  const result: number[][] = [];
  for (let i = 0; i < A.length; i++) {
    result[i] = [];
    for (let j = 0; j < B[0].length; j++) {
      let sum = 0;
      for (let k = 0; k < B.length; k++) {
        sum += A[i][k] * B[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

function inverse2x2(A: number[][]): number[][] | null {
  const det = det2(A);
  if (Math.abs(det) < 1e-10) return null;
  return [
    [A[1][1] / det, -A[0][1] / det],
    [-A[1][0] / det, A[0][0] / det]
  ];
}

function transposeMatrix(A: number[][]): number[][] {
  return A[0].map((_, colIndex) => A.map(row => row[colIndex]));
}

export default function MatricesModule() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState('practical');
  const [matrix, setMatrix] = useState([[1, 0.5], [0.2, 1.2]]);
  const [panOffsetX, setPanOffsetX] = useState(0);
  const [panOffsetY, setPanOffsetY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, w, h);

    const xMin = -3.5 + panOffsetX, xMax = 3.5 + panOffsetX, yMin = -3.5 + panOffsetY, yMax = 3.5 + panOffsetY;
    const A = matrix;

    // Draw original grid (faint)
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i++) {
      const p1 = worldToCanvas(i, -3, xMin, xMax, yMin, yMax, w, h);
      const p2 = worldToCanvas(i, 3, xMin, xMax, yMin, yMax, w, h);
      ctx.beginPath(); ctx.moveTo(p1.cx, p1.cy); ctx.lineTo(p2.cx, p2.cy); ctx.stroke();
      const p3 = worldToCanvas(-3, i, xMin, xMax, yMin, yMax, w, h);
      const p4 = worldToCanvas(3, i, xMin, xMax, yMin, yMax, w, h);
      ctx.beginPath(); ctx.moveTo(p3.cx, p3.cy); ctx.lineTo(p4.cx, p4.cy); ctx.stroke();
    }
    ctx.restore();

    // Draw transformed grid
    ctx.save();
    ctx.strokeStyle = 'rgba(59,130,246,0.25)';
    ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i++) {
      const v1 = matMul2(A, [i, -3]); const v2 = matMul2(A, [i, 3]);
      const p1 = worldToCanvas(v1[0], v1[1], xMin, xMax, yMin, yMax, w, h);
      const p2 = worldToCanvas(v2[0], v2[1], xMin, xMax, yMin, yMax, w, h);
      ctx.beginPath(); ctx.moveTo(p1.cx, p1.cy); ctx.lineTo(p2.cx, p2.cy); ctx.stroke();
      const v3 = matMul2(A, [-3, i]); const v4 = matMul2(A, [3, i]);
      const p3 = worldToCanvas(v3[0], v3[1], xMin, xMax, yMin, yMax, w, h);
      const p4 = worldToCanvas(v4[0], v4[1], xMin, xMax, yMin, yMax, w, h);
      ctx.beginPath(); ctx.moveTo(p3.cx, p3.cy); ctx.lineTo(p4.cx, p4.cy); ctx.stroke();
    }
    ctx.restore();

    // Transformed axes
    const origin = worldToCanvas(0, 0, xMin, xMax, yMin, yMax, w, h);
    const iBasis = matMul2(A, [1, 0]);
    const jBasis = matMul2(A, [0, 1]);
    drawArrow(ctx, origin.cx, origin.cy, worldToCanvas(iBasis[0], iBasis[1], xMin, xMax, yMin, yMax, w, h), '#3B82F6', 2.5);
    drawArrow(ctx, origin.cx, origin.cy, worldToCanvas(jBasis[0], jBasis[1], xMin, xMax, yMin, yMax, w, h), '#10B981', 2.5);

    // Unit square transformation
    const corners: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
    const tCorners = corners.map(c => matMul2(A, c));
    ctx.save();
    ctx.fillStyle = 'rgba(245,158,11,0.15)';
    ctx.strokeStyle = 'rgba(245,158,11,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const p = worldToCanvas(tCorners[i][0], tCorners[i][1], xMin, xMax, yMin, yMax, w, h);
      if (i === 0) {
        ctx.moveTo(p.cx, p.cy);
      } else {
        ctx.lineTo(p.cx, p.cy);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Eigenvectors
    const evs = eigenvalues2(A);
    const evColors = ['#EF4444', '#EC4899'];
    for (let i = 0; i < evs.length; i++) {
      if (Math.abs(evs[i].im) < 1e-6) {
        const ev = eigenvectors2(A, evs[i].re);
        const scale = 3;
        const ep = worldToCanvas(ev[0] * scale, ev[1] * scale, xMin, xMax, yMin, yMax, w, h);
        const en = worldToCanvas(-ev[0] * scale, -ev[1] * scale, xMin, xMax, yMin, yMax, w, h);
        ctx.save();
        ctx.strokeStyle = evColors[i];
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 3]);
        ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.moveTo(en.cx, en.cy); ctx.lineTo(ep.cx, ep.cy); ctx.stroke();
        ctx.restore();
      }
    }

    // Stats overlay
    const d = det2(A);
    ctx.save();
    ctx.fillStyle = 'rgba(15,20,35,0.88)';
    ctx.strokeStyle = 'rgba(59,130,246,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(12, 12, 160, 70, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#8B9CC0';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText(`det(A) = ${d.toFixed(4)}`, 22, 32);
    ctx.fillText(`trace = ${(A[0][0] + A[1][1]).toFixed(4)}`, 22, 50);
    const evStr = evs[0].im !== 0 ? `λ = ${evs[0].re.toFixed(2)} ± ${evs[0].im.toFixed(2)}i` : `λ = ${evs[0].re.toFixed(2)}, ${evs[1].re.toFixed(2)}`;
    ctx.fillText(evStr, 22, 68);
    ctx.restore();
  }, [matrix, panOffsetX, panOffsetY]);

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

  const setEntry = (r: number, c: number, val: string) => {
    // Handle empty input by setting to 0
    if (val === '' || val === '-') {
      setMatrix(prev => prev.map((row, ri) => row.map((cell, ci) => ri === r && ci === c ? 0 : cell)));
      return;
    }
    
    const v = parseFloat(val);
    // Allow NaN to be set to 0 for better user experience
    setMatrix(prev => prev.map((row, ri) => row.map((cell, ci) => ri === r && ci === c ? (isNaN(v) ? 0 : v) : cell)));
  };

  const presets = [
    { label: 'Identity', m: [[1, 0], [0, 1]] },
    { label: 'Rotation 45°', m: [[0.707, -0.707], [0.707, 0.707]] },
    { label: 'Shear', m: [[1, 1], [0, 1]] },
    { label: 'Scale ×2', m: [[2, 0], [0, 2]] },
    { label: 'Reflection', m: [[1, 0], [0, -1]] },
    { label: 'Squeeze', m: [[2, 0], [0, 0.5]] },
  ];

  return (
    <div className="flex flex-col h-full">
      <TabBar tabs={TABS} active={tab} onChange={setTab} color="#10B981" />
      {tab === 'theory' ? <MatrixTheory /> : tab === 'calculator' ? <MatrixCalculator /> : (
        <div className="flex flex-col lg:flex-row flex-1 gap-4 min-h-0">
          <div className="flex-1 relative rounded-xl overflow-hidden min-h-0">
            <canvas ref={canvasRef} className="w-full h-full" style={{ minHeight: 300 }} />
          </div>
          <div className="w-full lg:w-64 flex flex-col gap-3 overflow-y-auto max-h-96 lg:max-h-none">
            <GlassPanel title="Matrix A" accentColor="#10B981">
              <div className="text-xs text-[var(--text-muted)] mb-2">Click values to edit</div>
              <div className="grid grid-cols-2 gap-2">
                {matrix.map((row, r) => row.map((val, c) => (
                  <div key={`${r}-${c}`} className="flex flex-col items-center gap-1">
                    <span className="text-xs text-[var(--text-muted)]">a{r+1}{c+1}</span>
                    <input
                      type="number"
                      step={0.1}
                      value={val}
                      onChange={e => setEntry(r, c, e.target.value)}
                      className="w-full text-center text-sm"
                    />
                  </div>
                )))}
              </div>
            </GlassPanel>

            <GlassPanel title="Presets" accentColor="#06B6D4">
              <div className="grid grid-cols-2 gap-2">
                {presets.map(p => (
                  <button
                    key={p.label}
                    onClick={() => setMatrix(p.m)}
                    className="py-1.5 rounded-lg text-xs font-medium transition-all hover:bg-[#06B6D420] text-[var(--text-secondary)] hover:text-[#06B6D4]"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </GlassPanel>

            <GlassPanel title="Legend" accentColor="#F59E0B">
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-[#3B82F6]" /><span className="text-[var(--text-muted)]">i-basis vector</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-[#10B981]" /><span className="text-[var(--text-muted)]">j-basis vector</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-2 bg-[#F59E0B]/30 border border-[#F59E0B]/60" /><span className="text-[var(--text-muted)]">Transformed unit square</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-[#EF4444]" style={{ borderTop: '2px dashed #EF4444' }} /><span className="text-[var(--text-muted)]">Eigenvectors</span></div>
              </div>
            </GlassPanel>
          </div>
        </div>
      )}
    </div>
  );
}

function MatrixCalculator() {
  const calculatorCanvasRef = useRef<HTMLCanvasElement>(null);
  const [matrixA, setMatrixA] = useState([[2, 1], [3, 4]]);
  const [matrixB, setMatrixB] = useState([[1, 0], [2, 1]]);
  const [operation, setOperation] = useState<'add' | 'subtract' | 'multiply' | 'determinant' | 'inverse' | 'transpose'>('multiply');
  const [result, setResult] = useState<number[][] | number | null>(null);
  const [showVisualization, setShowVisualization] = useState(true);

  const setMatrixEntry = (matrix: 'A' | 'B', r: number, c: number, val: string) => {
    // Handle empty input by setting to 0
    if (val === '' || val === '-') {
      if (matrix === 'A') {
        setMatrixA(prev => prev.map((row, ri) => row.map((cell, ci) => ri === r && ci === c ? 0 : cell)));
      } else {
        setMatrixB(prev => prev.map((row, ri) => row.map((cell, ci) => ri === r && ci === c ? 0 : cell)));
      }
      return;
    }
    
    const v = parseFloat(val);
    // Allow NaN to be set to 0 for better user experience
    if (matrix === 'A') {
      setMatrixA(prev => prev.map((row, ri) => row.map((cell, ci) => ri === r && ci === c ? (isNaN(v) ? 0 : v) : cell)));
    } else {
      setMatrixB(prev => prev.map((row, ri) => row.map((cell, ci) => ri === r && ci === c ? (isNaN(v) ? 0 : v) : cell)));
    }
  };

  const calculateResult = () => {
    switch (operation) {
      case 'add':
        setResult(addMatrices(matrixA, matrixB));
        break;
      case 'subtract':
        setResult(subtractMatrices(matrixA, matrixB));
        break;
      case 'multiply':
        setResult(multiplyMatrices(matrixA, matrixB));
        break;
      case 'determinant':
        setResult(det2(matrixA));
        break;
      case 'inverse':
        setResult(inverse2x2(matrixA));
        break;
      case 'transpose':
        setResult(transposeMatrix(matrixA));
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

    const xMin = -3, xMax = 3, yMin = -3, yMax = 3;

    // Draw grid
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = -3; i <= 3; i++) {
      const p1 = worldToCanvas(i, -3, xMin, xMax, yMin, yMax, w, h);
      const p2 = worldToCanvas(i, 3, xMin, xMax, yMin, yMax, w, h);
      ctx.beginPath(); ctx.moveTo(p1.cx, p1.cy); ctx.lineTo(p2.cx, p2.cy); ctx.stroke();
      const p3 = worldToCanvas(-3, i, xMin, xMax, yMin, yMax, w, h);
      const p4 = worldToCanvas(3, i, xMin, xMax, yMin, yMax, w, h);
      ctx.beginPath(); ctx.moveTo(p3.cx, p3.cy); ctx.lineTo(p4.cx, p4.cy); ctx.stroke();
    }
    ctx.restore();

    // Visualize matrix operation
    const origin = worldToCanvas(0, 0, xMin, xMax, yMin, yMax, w, h);
    
    // Always show Matrix A transformation (blue and green arrows)
    const iBasisA = matMul2(matrixA, [1, 0]);
    const jBasisA = matMul2(matrixA, [0, 1]);
    drawArrow(ctx, origin.cx, origin.cy, worldToCanvas(iBasisA[0], iBasisA[1], xMin, xMax, yMin, yMax, w, h), '#3B82F6', 2.5);
    drawArrow(ctx, origin.cx, origin.cy, worldToCanvas(jBasisA[0], jBasisA[1], xMin, xMax, yMin, yMax, w, h), '#10B981', 2.5);

    // Show Matrix B transformation if operation involves B (orange and red arrows)
    if ((operation === 'add' || operation === 'subtract' || operation === 'multiply') && matrixB) {
      const iBasisB = matMul2(matrixB, [1, 0]);
      const jBasisB = matMul2(matrixB, [0, 1]);
      drawArrow(ctx, origin.cx, origin.cy, worldToCanvas(iBasisB[0], iBasisB[1], xMin, xMax, yMin, yMax, w, h), '#F59E0B', 1.5);
      drawArrow(ctx, origin.cx, origin.cy, worldToCanvas(jBasisB[0], jBasisB[1], xMin, xMax, yMin, yMax, w, h), '#EF4444', 1.5);
    }

    // Show result transformation if we have a result matrix
    if (Array.isArray(result)) {
      const iBasisResult = matMul2(result, [1, 0]);
      const jBasisResult = matMul2(result, [0, 1]);
      drawArrow(ctx, origin.cx, origin.cy, worldToCanvas(iBasisResult[0], iBasisResult[1], xMin, xMax, yMin, yMax, w, h), '#A855F7', 2.0);
      drawArrow(ctx, origin.cx, origin.cy, worldToCanvas(jBasisResult[0], jBasisResult[1], xMin, xMax, yMin, yMax, w, h), '#EC4899', 2.0);
    }

    // Add legend
    ctx.save();
    ctx.fillStyle = 'rgba(15,20,35,0.88)';
    ctx.strokeStyle = 'rgba(59,130,246,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(12, 12, 180, 100, 8);
    ctx.fill(); ctx.stroke();
    
    ctx.fillStyle = '#8B9CC0';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText('Matrix A (blue/green)', 22, 32);
    if ((operation === 'add' || operation === 'subtract' || operation === 'multiply') && matrixB) {
      ctx.fillText('Matrix B (orange/red)', 22, 50);
    }
    if (Array.isArray(result)) {
      ctx.fillText('Result (purple/pink)', 22, 68);
    }
    ctx.fillText(`Operation: ${operation}`, 22, 86);
    ctx.restore();
  }, [matrixA, matrixB, operation, result, showVisualization]);

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

  const MatrixInput = ({ matrix, label, color, matrixId }: { matrix: number[][], label: string, color: string, matrixId: 'A' | 'B' }) => (
    <GlassPanel title={label} accentColor={color} className="flex-shrink-0">
      <div className="grid grid-cols-2 gap-2">
        {matrix.map((row, r) => row.map((val, c) => (
          <div key={`${r}-${c}`} className="flex flex-col items-center gap-1">
            <span className="text-xs text-[var(--text-muted)]">{matrixId}{r+1}{c+1}</span>
            <input
              type="number"
              step={0.1}
              value={val}
              onChange={e => setMatrixEntry(matrixId, r, c, e.target.value)}
              className="w-full text-center text-sm bg-[#0F172A] border border-[#334155] rounded text-white"
            />
          </div>
        )))}
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
              {operation === 'determinant' ? 'Determinant' : 'Scalar Result'}
            </div>
          </div>
        </GlassPanel>
      );
    }
    
    if (Array.isArray(result)) {
      return (
        <GlassPanel title="Result Matrix" accentColor="#10B981" className="flex-shrink-0">
          <div className="grid grid-cols-2 gap-2">
            {result.map((row, r) => row.map((val, c) => (
              <div key={`${r}-${c}`} className="text-center p-2 bg-[#0F172A] border border-[#334155] rounded">
                <span className="text-sm text-white">{val.toFixed(2)}</span>
              </div>
            )))}
          </div>
        </GlassPanel>
      );
    }
    
    return (
      <GlassPanel title="Result" accentColor="#EF4444" className="flex-shrink-0">
        <div className="text-center text-[#EF4444]">
          <div className="text-sm">Cannot compute</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">
            {operation === 'inverse' ? 'Matrix is not invertible' : 'Invalid operation'}
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
        <GlassPanel title="🧮 Matrix Operation" accentColor="#10B981" className="flex-shrink-0">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wider">Operation</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'add', label: 'A + B', icon: '➕' },
                  { id: 'subtract', label: 'A - B', icon: '➖' },
                  { id: 'multiply', label: 'A × B', icon: '✖️' },
                  { id: 'determinant', label: 'det(A)', icon: '🔢' },
                  { id: 'inverse', label: 'A⁻¹', icon: '🔄' },
                  { id: 'transpose', label: 'Aᵀ', icon: '🔀' },
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
              Calculate Result
            </button>
          </div>
        </GlassPanel>

        <MatrixInput matrix={matrixA} label="Matrix A" color="#3B82F6" matrixId="A" />
        {(operation === 'add' || operation === 'subtract' || operation === 'multiply') && (
          <MatrixInput matrix={matrixB} label="Matrix B" color="#06B6D4" matrixId="B" />
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
                <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-[#3B82F6]" /><span className="text-[var(--text-muted)]">Matrix A - i-basis</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-[#10B981]" /><span className="text-[var(--text-muted)]">Matrix A - j-basis</span></div>
                {(operation === 'add' || operation === 'subtract' || operation === 'multiply') && (
                  <>
                    <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-[#F59E0B]" /><span className="text-[var(--text-muted)]">Matrix B - i-basis</span></div>
                    <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-[#EF4444]" /><span className="text-[var(--text-muted)]">Matrix B - j-basis</span></div>
                  </>
                )}
                {Array.isArray(result) && (
                  <>
                    <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-[#A855F7]" /><span className="text-[var(--text-muted)]">Result - i-basis</span></div>
                    <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-[#EC4899]" /><span className="text-[var(--text-muted)]">Result - j-basis</span></div>
                  </>
                )}
              </div>
            )}
          </div>
        </GlassPanel>

        <GlassPanel title="Presets" accentColor="#F59E0B" className="flex-shrink-0">
          {[
            { label: 'Identity A', action: () => setMatrixA([[1, 0], [0, 1]]) },
            { label: 'Identity B', action: () => setMatrixB([[1, 0], [0, 1]]) },
            { label: 'Rotation 45° A', action: () => setMatrixA([[0.707, -0.707], [0.707, 0.707]]) },
            { label: 'Scale 2x B', action: () => setMatrixB([[2, 0], [0, 2]]) },
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

function drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, p2: { cx: number; cy: number }, color: string, width: number) {
  const { cx: x2, cy: y2 } = p2;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 10 * Math.cos(angle - 0.4), y2 - 10 * Math.sin(angle - 0.4));
  ctx.lineTo(x2 - 10 * Math.cos(angle + 0.4), y2 - 10 * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

import TheorySection from '../components/ui/TheorySection';

function MatrixTheory() {
  const lessons = [
    {
      id: 'matrices-intro',
      title: 'Introduction to Matrices',
      type: 'video' as const,
      duration: '10:15',
      difficulty: 'beginner' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=fNk_zzaMoSs',
        description: 'Matrices are powerful mathematical objects that organize data and represent linear transformations. This introduction covers the fundamentals of matrix notation and operations.',
        keyPoints: [
          'Matrix notation and dimensions',
          'Elements, rows, and columns',
          'Types of matrices: square, diagonal, identity',
          'Matrix addition and subtraction',
          'Scalar multiplication'
        ]
      }
    },
    {
      id: 'matrix-operations',
      title: 'Matrix Multiplication',
      type: 'video' as const,
      duration: '14:30',
      difficulty: 'intermediate' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=kYB8IZa5AuE',
        description: 'Matrix multiplication is fundamental to linear algebra. Learn the mechanics of multiplication and understand why it\'s not commutative.',
        keyPoints: [
          'Dot product method for multiplication',
          'Dimension compatibility requirements',
          'Why AB ≠ BA in general',
          'Associative and distributive properties',
          'Computational complexity considerations'
        ]
      }
    },
    {
      id: 'determinants-inverses',
      title: 'Determinants and Inverses',
      type: 'text' as const,
      duration: '20 min read',
      difficulty: 'intermediate' as const,
      content: {
        html: `
          <h3>Determinants and Matrix Inverses</h3>
          <p>Determinants and inverses are crucial concepts in linear algebra that help us understand matrix properties and solve systems of equations.</p>
          
          <h4>Determinants</h4>
          <p>The determinant is a scalar value that provides important information about a matrix:</p>
          <blockquote>For 2×2 matrix A = [[a, b], [c, d]], det(A) = ad - bc</blockquote>
          <p>Key properties of determinants:</p>
          <ul>
            <li>det(A) = 0 means A is singular (non-invertible)</li>
            <li>det(A) ≠ 0 means A is invertible</li>
            <li>det(AB) = det(A) × det(B)</li>
            <li>det(Aᵀ) = det(A)</li>
          </ul>
          
          <h4>Matrix Inverses</h4>
          <p>The inverse of a matrix A, denoted A⁻¹, satisfies A × A⁻¹ = A⁻¹ × A = I (identity matrix).</p>
          <blockquote>For 2×2 matrix A = [[a, b], [c, d]], A⁻¹ = (1/det(A)) × [[d, -b], [-c, a]]</blockquote>
          
          <h4>Finding Inverses</h4>
          <p>Methods for finding matrix inverses:</p>
          <ul>
            <li><strong>2×2 matrices:</strong> Use the formula above</li>
            <li><strong>3×3 matrices:</strong> Use cofactor expansion or row reduction</li>
            <li><strong>Larger matrices:</strong> Use Gaussian elimination or LU decomposition</li>
          </ul>
        `,
        formulas: [
          {
            expression: 'det([[a, b], [c, d]]) = ad - bc',
            description: '2×2 Determinant Formula'
          },
          {
            expression: 'A⁻¹ = (1/det(A)) × adj(A)',
            description: 'General Inverse Formula'
          },
          {
            expression: 'det(AB) = det(A) × det(B)',
            description: 'Multiplicative Property of Determinants'
          }
        ]
      }
    },
    {
      id: 'eigenvalues',
      title: 'Eigenvalues and Eigenvectors',
      type: 'video' as const,
      duration: '16:20',
      difficulty: 'advanced' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=PFDu9oVAE-g',
        description: 'Deep dive into eigenvalues and eigenvectors with 3Blue1Brown\'s signature visual approach. Understand these fundamental concepts that power everything from quantum mechanics to machine learning.',
        keyPoints: [
          'Geometric interpretation of eigenvectors',
          'Characteristic polynomial equation',
          'Complex eigenvalues and rotations',
          'Diagonalization of matrices',
          'Applications in physics and engineering'
        ]
      }
    }
  ];

  return (
    <TheorySection
      moduleId="matrices"
      title="Linear Algebra & Matrix Operations"
      description="Master the fundamentals of linear algebra through matrices. From basic operations to advanced concepts like eigenvalues, learn how matrices transform space and solve complex problems."
      lessons={lessons}
      color="#10B981"
    />
  );
}
