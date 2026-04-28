import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Download, RotateCcw, Play } from 'lucide-react';
import GlassPanel from '../components/ui/GlassPanel';
import SliderRow from '../components/ui/SliderRow';
import TabBar from '../components/ui/TabBar';
import ChatBubble from '../components/ChatBubble';

const COLORS = ['#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];
const TABS = [
  { id: 'practical', label: 'Matrix Calculator' },
  { id: 'theory', label: 'Theory' },
];

interface Matrix {
  data: number[][];
  rows: number;
  cols: number;
}

interface Vector2D {
  x: number;
  y: number;
}

export default function LinearAlgebraModule() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState('practical');
  const [matrixA, setMatrixA] = useState<Matrix>({
    data: [[2, 1], [1, 3]],
    rows: 2,
    cols: 2
  });
  const [matrixB, setMatrixB] = useState<Matrix>({
    data: [[1, 2], [3, 4]],
    rows: 2,
    cols: 2
  });
  const [vectors, setVectors] = useState<Vector2D[]>([
    { x: 1, y: 2 },
    { x: 3, y: 1 }
  ]);
  const [operation, setOperation] = useState('multiply');
  const [result, setResult] = useState<Matrix | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showBasis, setShowBasis] = useState(true);

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
    
    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(59,130,246,0.1)';
      ctx.lineWidth = 1;
      const centerX = w / 2;
      const centerY = h / 2;
      const scale = 40;
      
      for (let i = -10; i <= 10; i++) {
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(centerX + i * scale, 0);
        ctx.lineTo(centerX + i * scale, h);
        ctx.stroke();
        
        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(0, centerY + i * scale);
        ctx.lineTo(w, centerY + i * scale);
        ctx.stroke();
      }
      
      // Axes
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(w, centerY);
      ctx.stroke();
    }
    
    // Draw basis vectors
    if (showBasis) {
      const centerX = w / 2;
      const centerY = h / 2;
      const scale = 40;
      
      // i-hat (1, 0)
      ctx.save();
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#3B82F6';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + scale, centerY);
      ctx.stroke();
      ctx.fillStyle = '#3B82F6';
      ctx.font = 'bold 14px Inter';
      ctx.fillText('i', centerX + scale + 5, centerY - 5);
      ctx.restore();
      
      // j-hat (0, 1)
      ctx.save();
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#10B981';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX, centerY - scale);
      ctx.stroke();
      ctx.fillStyle = '#10B981';
      ctx.font = 'bold 14px Inter';
      ctx.fillText('j', centerX + 5, centerY - scale - 5);
      ctx.restore();
    }
    
    // Draw vectors
    const centerX = w / 2;
    const centerY = h / 2;
    const scale = 40;
    
    vectors.forEach((vector, idx) => {
      ctx.save();
      ctx.strokeStyle = COLORS[idx % COLORS.length];
      ctx.lineWidth = 3;
      ctx.shadowColor = COLORS[idx % COLORS.length];
      ctx.shadowBlur = 10;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + vector.x * scale, centerY - vector.y * scale);
      ctx.stroke();
      
      // Arrowhead
      const angle = Math.atan2(-vector.y, vector.x);
      const arrowLength = 10;
      ctx.beginPath();
      ctx.moveTo(centerX + vector.x * scale, centerY - vector.y * scale);
      ctx.lineTo(
        centerX + vector.x * scale - arrowLength * Math.cos(angle - Math.PI / 6),
        centerY - vector.y * scale + arrowLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(centerX + vector.x * scale, centerY - vector.y * scale);
      ctx.lineTo(
        centerX + vector.x * scale - arrowLength * Math.cos(angle + Math.PI / 6),
        centerY - vector.y * scale + arrowLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
      
      // Label
      ctx.fillStyle = COLORS[idx % COLORS.length];
      ctx.font = 'bold 12px Inter';
      ctx.fillText(`v${idx + 1}`, centerX + vector.x * scale + 5, centerY - vector.y * scale - 5);
      ctx.restore();
    });
    
    // Draw matrix multiplication visualization
    if (operation === 'multiply' && matrixA.rows === 2 && matrixA.cols === 2) {
      const centerX = w - 150;
      const centerY = h / 2;
      
      // Draw matrix A
      ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
      ctx.strokeStyle = '#8B5CF6';
      ctx.lineWidth = 2;
      ctx.fillRect(centerX - 80, centerY - 60, 60, 60);
      ctx.strokeRect(centerX - 80, centerY - 60, 60, 60);
      
      ctx.fillStyle = '#fff';
      ctx.font = '12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('A', centerX - 50, centerY - 70);
      
      // Matrix values
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          ctx.fillText(
            matrixA.data[i][j].toString(),
            centerX - 50 + j * 25,
            centerY - 35 + i * 25
          );
        }
      }
      
      // Draw matrix B
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 2;
      ctx.fillRect(centerX - 10, centerY - 60, 60, 60);
      ctx.strokeRect(centerX - 10, centerY - 60, 60, 60);
      
      ctx.fillStyle = '#fff';
      ctx.fillText('B', centerX + 20, centerY - 70);
      
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          ctx.fillText(
            matrixB.data[i][j].toString(),
            centerX + 20 + j * 25,
            centerY - 35 + i * 25
          );
        }
      }
      
      // Draw result
      if (result) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2;
        ctx.fillRect(centerX + 60, centerY - 60, 60, 60);
        ctx.strokeRect(centerX + 60, centerY - 60, 60, 60);
        
        ctx.fillStyle = '#fff';
        ctx.fillText('A×B', centerX + 90, centerY - 70);
        
        for (let i = 0; i < 2; i++) {
          for (let j = 0; j < 2; j++) {
            ctx.fillText(
              result.data[i][j].toFixed(1),
              centerX + 90 + j * 25,
              centerY - 35 + i * 25
            );
          }
        }
      }
    }
  }, [vectors, matrixA, matrixB, operation, result, showGrid, showBasis]);

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

  const performOperation = () => {
    if (operation === 'multiply' && matrixA.cols === matrixB.rows) {
      const resultData: number[][] = [];
      for (let i = 0; i < matrixA.rows; i++) {
        const row: number[] = [];
        for (let j = 0; j < matrixB.cols; j++) {
          let sum = 0;
          for (let k = 0; k < matrixA.cols; k++) {
            sum += matrixA.data[i][k] * matrixB.data[k][j];
          }
          row.push(sum);
        }
        resultData.push(row);
      }
      setResult({ data: resultData, rows: matrixA.rows, cols: matrixB.cols });
    } else if (operation === 'add' && matrixA.rows === matrixB.rows && matrixA.cols === matrixB.cols) {
      const resultData: number[][] = [];
      for (let i = 0; i < matrixA.rows; i++) {
        const row: number[] = [];
        for (let j = 0; j < matrixA.cols; j++) {
          row.push(matrixA.data[i][j] + matrixB.data[i][j]);
        }
        resultData.push(row);
      }
      setResult({ data: resultData, rows: matrixA.rows, cols: matrixA.cols });
    } else if (operation === 'determinant' && matrixA.rows === matrixA.cols) {
      const det = calculateDeterminant(matrixA);
      setResult({ data: [[det]], rows: 1, cols: 1 });
    }
  };

  const calculateDeterminant = (matrix: Matrix): number => {
    if (matrix.rows === 1) return matrix.data[0][0];
    if (matrix.rows === 2) {
      return matrix.data[0][0] * matrix.data[1][1] - matrix.data[0][1] * matrix.data[1][0];
    }
    // For larger matrices, would need recursive implementation
    return 0;
  };

  const applyMatrixToVectors = () => {
    if (matrixA.rows === 2 && matrixA.cols === 2) {
      const transformedVectors = vectors.map(v => ({
        x: matrixA.data[0][0] * v.x + matrixA.data[0][1] * v.y,
        y: matrixA.data[1][0] * v.x + matrixA.data[1][1] * v.y
      }));
      setVectors(transformedVectors);
    }
  };

  const resetVectors = () => {
    setVectors([
      { x: 1, y: 2 },
      { x: 3, y: 1 }
    ]);
  };

  const addVector = () => {
    setVectors(prev => [...prev, { x: Math.random() * 4 - 2, y: Math.random() * 4 - 2 }]);
  };

  const removeVector = (index: number) => {
    setVectors(prev => prev.filter((_, i) => i !== index));
  };

  const updateMatrixValue = (matrix: 'A' | 'B', row: number, col: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    if (matrix === 'A') {
      const newData = [...matrixA.data];
      newData[row][col] = numValue;
      setMatrixA({ ...matrixA, data: newData });
    } else {
      const newData = [...matrixB.data];
      newData[row][col] = numValue;
      setMatrixB({ ...matrixB, data: newData });
    }
  };

  const exportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'linear-algebra.png';
    a.click();
  };

  return (
    <div className="flex flex-col h-full">
      <TabBar tabs={TABS} active={tab} onChange={setTab} color="#8B5CF6" />

      {tab === 'theory' ? (
        <LinearAlgebraTheorySection />
      ) : (
        <div className="flex flex-1 gap-4 min-h-0">
          {/* Canvas */}
          <div className="flex-1 relative rounded-xl overflow-hidden">
            <canvas ref={canvasRef} className="w-full h-full" style={{ minHeight: 300 }} />
            <button
              onClick={exportPNG}
              className="absolute top-3 right-3 glass px-3 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <Download size={12} /> Export PNG
            </button>
          </div>

          {/* Controls */}
          <div className="w-80 flex flex-col gap-3 overflow-y-auto">
            <GlassPanel title="Vector Controls" accentColor="#8B5CF6">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button onClick={addVector} className="flex-1 flex items-center justify-center gap-1 text-xs bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded py-1 transition-colors">
                    <Plus size={10} /> Add Vector
                  </button>
                  <button onClick={resetVectors} className="flex-1 flex items-center justify-center gap-1 text-xs bg-[#06B6D4] hover:bg-[#0891B2] text-white rounded py-1 transition-colors">
                    <RotateCcw size={10} /> Reset
                  </button>
                </div>
                <button onClick={applyMatrixToVectors} className="w-full flex items-center justify-center gap-1 text-xs bg-[#10B981] hover:bg-[#059669] text-white rounded py-1 transition-colors">
                  <Play size={10} /> Apply Matrix A
                </button>
              </div>
              <div className="space-y-1">
                {vectors.map((vector, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: COLORS[idx % COLORS.length] }} />
                      <span>v{idx + 1}: ({vector.x.toFixed(2)}, {vector.y.toFixed(2)})</span>
                    </div>
                    {vectors.length > 1 && (
                      <button onClick={() => removeVector(idx)} className="text-[var(--text-muted)] hover:text-[#EF4444]">
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </GlassPanel>

            <GlassPanel title="Display Options" accentColor="#8B5CF6">
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} className="w-3 h-3" />
                Show Grid
              </label>
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input type="checkbox" checked={showBasis} onChange={e => setShowBasis(e.target.checked)} className="w-3 h-3" />
                Show Basis Vectors
              </label>
            </GlassPanel>

            <GlassPanel title="Matrix A" accentColor="#8B5CF6">
              <div className="grid grid-cols-2 gap-1">
                {matrixA.data.map((row, i) => 
                  row.map((val, j) => (
                    <input
                      key={`a-${i}-${j}`}
                      type="number"
                      value={val}
                      onChange={(e) => updateMatrixValue('A', i, j, e.target.value)}
                      className="w-full px-1 py-0.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-center"
                    />
                  ))
                )}
              </div>
            </GlassPanel>

            <GlassPanel title="Matrix B" accentColor="#10B981">
              <div className="grid grid-cols-2 gap-1">
                {matrixB.data.map((row, i) => 
                  row.map((val, j) => (
                    <input
                      key={`b-${i}-${j}`}
                      type="number"
                      value={val}
                      onChange={(e) => updateMatrixValue('B', i, j, e.target.value)}
                      className="w-full px-1 py-0.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-center"
                    />
                  ))
                )}
              </div>
            </GlassPanel>

            <GlassPanel title="Operations" accentColor="#8B5CF6">
              <select
                value={operation}
                onChange={(e) => setOperation(e.target.value)}
                className="w-full px-2 py-1 text-xs bg-[var(--bg-secondary)] border border-[var(--border)] rounded"
              >
                <option value="multiply">Multiply (A × B)</option>
                <option value="add">Add (A + B)</option>
                <option value="determinant">Determinant (A)</option>
              </select>
              <button
                onClick={performOperation}
                className="w-full flex items-center justify-center gap-2 text-xs bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded py-2 transition-colors"
              >
                <Play size={12} /> Calculate
              </button>
            </GlassPanel>

            {result && (
              <GlassPanel title="Result" accentColor="#F59E0B">
                <div className="grid grid-cols-2 gap-1">
                  {result.data.map((row, i) => 
                    row.map((val, j) => (
                      <div key={`r-${i}-${j}`} className="px-1 py-0.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-center">
                        {val.toFixed(2)}
                      </div>
                    ))
                  )}
                </div>
              </GlassPanel>
            )}

            <GlassPanel title="Quick Matrices" accentColor="#8B5CF6">
              {[
                { label: 'Identity', A: [[1, 0], [0, 1]], B: [[1, 0], [0, 1]] },
                { label: 'Rotation 90°', A: [[0, -1], [1, 0]], B: [[1, 0], [0, 1]] },
                { label: 'Scale 2x', A: [[2, 0], [0, 2]], B: [[1, 0], [0, 1]] },
                { label: 'Shear X', A: [[1, 0.5], [0, 1]], B: [[1, 0], [0, 1]] },
              ].map(preset => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setMatrixA({ data: preset.A, rows: 2, cols: 2 });
                    setMatrixB({ data: preset.B, rows: 2, cols: 2 });
                    setResult(null);
                  }}
                  className="text-left text-xs text-[var(--text-secondary)] hover:text-[#8B5CF6] transition-colors py-0.5"
                >
                  {preset.label}
                </button>
              ))}
            </GlassPanel>
          </div>
        </div>
      )}
      <ChatBubble />
    </div>
  );
}

import TheorySection from '../components/ui/TheorySection';

function LinearAlgebraTheorySection() {
  const lessons = [
    {
      id: 'linear-algebra-intro',
      title: 'Introduction to Linear Algebra',
      type: 'video' as const,
      duration: '18:30',
      difficulty: 'beginner' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=fNk_zzaMoSs',
        description: 'Linear algebra is the branch of mathematics concerning linear equations, linear maps, and their representations in vector spaces and through matrices. This introduction covers vectors, matrices, and fundamental operations.',
        keyPoints: [
          'Vectors represent magnitude and direction in space',
          'Matrices are rectangular arrays of numbers representing linear transformations',
          'Matrix multiplication combines linear transformations',
          'Determinants indicate whether a matrix is invertible'
        ]
      }
    },
    {
      id: 'matrix-operations',
      title: 'Matrix Operations and Transformations',
      type: 'text' as const,
      duration: '25 min read',
      difficulty: 'intermediate' as const,
      content: {
        html: `
          <h3>Matrix Operations</h3>
          <p>Matrix operations are fundamental to linear algebra and have applications in computer graphics, machine learning, and engineering.</p>
          
          <h4>Matrix Multiplication</h4>
          <p>Matrix multiplication is defined as the dot product of rows and columns. For matrices A (m×n) and B (n×p), the product C = AB is an m×p matrix.</p>
          <blockquote>C[i][j] = Σ(A[i][k] × B[k][j]) for k = 1 to n</blockquote>
          
          <h4>Determinant</h4>
          <p>The determinant is a scalar value that can be computed from the elements of a square matrix. It provides important information about the matrix.</p>
          <blockquote>For 2×2 matrix [[a, b], [c, d]]: det = ad - bc</blockquote>
          
          <h4>Linear Transformations</h4>
          <p>Matrices represent linear transformations that map vectors to vectors. Common transformations include rotation, scaling, and shearing.</p>
        `,
        formulas: [
          {
            expression: '[cos(θ) -sin(θ); sin(θ) cos(θ)]',
            description: '2D rotation matrix by angle θ'
          },
          {
            expression: '[sx 0; 0 sy]',
            description: '2D scaling matrix with factors sx and sy'
          },
          {
            expression: '[1 k; 0 1]',
            description: '2D shear matrix in x-direction with factor k'
          }
        ]
      }
    },
    {
      id: 'vector-spaces',
      title: 'Vector Spaces and Basis',
      type: 'video' as const,
      duration: '22:15',
      difficulty: 'advanced' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=kjBOesZCoqc',
        description: 'Explore the concept of vector spaces, basis vectors, and linear independence. Understand how these concepts form the foundation of linear algebra.',
        keyPoints: [
          'Vector spaces are sets of vectors closed under addition and scalar multiplication',
          'Basis vectors span the entire space and are linearly independent',
          'Any vector can be expressed as a linear combination of basis vectors',
          'Dimension is the number of vectors in a basis'
        ]
      }
    }
  ];

  return (
    <TheorySection
      moduleId="linear-algebra"
      title="Linear Algebra & Matrices"
      description="Master linear algebra concepts including vectors, matrices, transformations, and their applications. This comprehensive course covers everything from basic matrix operations to advanced topics like eigenvalues and eigenvectors."
      lessons={lessons}
      color="#8B5CF6"
    />
  );
}
