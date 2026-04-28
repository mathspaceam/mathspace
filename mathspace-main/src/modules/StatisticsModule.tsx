import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Download, RotateCcw, Play, TrendingUp, BarChart3 } from 'lucide-react';
import GlassPanel from '../components/ui/GlassPanel';
import SliderRow from '../components/ui/SliderRow';
import TabBar from '../components/ui/TabBar';
import ChatBubble from '../components/ChatBubble';

const COLORS = ['#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];
const TABS = [
  { id: 'practical', label: 'Data Analysis' },
  { id: 'theory', label: 'Theory' },
];

interface DataPoint {
  x: number;
  y: number;
  label?: string;
}

interface Dataset {
  name: string;
  data: DataPoint[];
  color: string;
  visible: boolean;
}

export default function StatisticsModule() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tab, setTab] = useState('practical');
  const [datasets, setDatasets] = useState<Dataset[]>([
    {
      name: 'Sample Data',
      data: [
        { x: 1, y: 2 },
        { x: 2, y: 4 },
        { x: 3, y: 3 },
        { x: 4, y: 5 },
        { x: 5, y: 7 },
        { x: 6, y: 6 },
        { x: 7, y: 8 },
        { x: 8, y: 9 }
      ],
      color: COLORS[0],
      visible: true
    }
  ]);
  const [chartType, setChartType] = useState<'scatter' | 'line' | 'bar' | 'histogram'>('scatter');
  const [showRegression, setShowRegression] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [statistics, setStatistics] = useState<any>(null);

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
      ctx.strokeStyle = 'rgba(59,130,246,0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < w; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, h);
        ctx.stroke();
      }
      for (let i = 0; i < h; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(w, i);
        ctx.stroke();
      }
      
      // Axes
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      const margin = 50;
      ctx.beginPath();
      ctx.moveTo(margin, h - margin);
      ctx.lineTo(w - margin, h - margin);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(margin, margin);
      ctx.lineTo(margin, h - margin);
      ctx.stroke();
    }
    
    // Get data bounds
    const allData = datasets.flatMap(d => d.visible ? d.data : []);
    if (allData.length === 0) return;
    
    const xMin = Math.min(...allData.map(d => d.x));
    const xMax = Math.max(...allData.map(d => d.x));
    const yMin = Math.min(...allData.map(d => d.y));
    const yMax = Math.max(...allData.map(d => d.y));
    
    const margin = 50;
    const chartWidth = w - 2 * margin;
    const chartHeight = h - 2 * margin;
    
    // Transform data to canvas coordinates
    const transformX = (x: number) => margin + ((x - xMin) / (xMax - xMin)) * chartWidth;
    const transformY = (y: number) => h - margin - ((y - yMin) / (yMax - yMin)) * chartHeight;
    
    // Draw data based on chart type
    datasets.forEach(dataset => {
      if (!dataset.visible) return;
      
      if (chartType === 'scatter') {
        // Scatter plot
        dataset.data.forEach(point => {
          ctx.save();
          ctx.fillStyle = dataset.color;
          ctx.shadowColor = dataset.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(transformX(point.x), transformY(point.y), 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });
      } else if (chartType === 'line') {
        // Line plot
        ctx.save();
        ctx.strokeStyle = dataset.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = dataset.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        dataset.data.forEach((point, idx) => {
          const x = transformX(point.x);
          const y = transformY(point.y);
          if (idx === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
        ctx.restore();
      } else if (chartType === 'bar') {
        // Bar chart
        const barWidth = chartWidth / (xMax - xMin + 1) * 0.8;
        dataset.data.forEach(point => {
          ctx.save();
          ctx.fillStyle = dataset.color;
          ctx.shadowColor = dataset.color;
          ctx.shadowBlur = 8;
          const x = transformX(point.x - 0.5);
          const y = transformY(point.y);
          const height = transformY(yMin) - y;
          ctx.fillRect(x, y, barWidth, height);
          ctx.restore();
        });
      } else if (chartType === 'histogram') {
        // Histogram
        const bins = 10;
        const binWidth = (xMax - xMin) / bins;
        const histogram = new Array(bins).fill(0);
        
        dataset.data.forEach(point => {
          const binIndex = Math.min(Math.floor((point.x - xMin) / binWidth), bins - 1);
          histogram[binIndex]++;
        });
        
        const maxCount = Math.max(...histogram);
        const barWidth = chartWidth / bins;
        
        histogram.forEach((count, idx) => {
          ctx.save();
          ctx.fillStyle = dataset.color;
          ctx.shadowColor = dataset.color;
          ctx.shadowBlur = 8;
          const x = margin + idx * barWidth;
          const height = (count / maxCount) * chartHeight;
          const y = h - margin - height;
          ctx.fillRect(x, y, barWidth * 0.8, height);
          ctx.restore();
        });
      }
    });
    
    // Draw regression line if enabled
    if (showRegression && chartType !== 'histogram' && datasets[0]?.visible) {
      const dataset = datasets[0];
      const regression = calculateLinearRegression(dataset.data);
      if (regression) {
        ctx.save();
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        ctx.shadowColor = '#F59E0B';
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        const y1 = regression.slope * xMin + regression.intercept;
        const y2 = regression.slope * xMax + regression.intercept;
        ctx.moveTo(transformX(xMin), transformY(y1));
        ctx.lineTo(transformX(xMax), transformY(y2));
        ctx.stroke();
        ctx.restore();
      }
    }
    
    // Draw axis labels
    ctx.fillStyle = '#8B9CC0';
    ctx.font = '10px Inter';
    ctx.textAlign = 'center';
    
    // X-axis labels
    for (let i = 0; i <= 5; i++) {
      const x = xMin + (xMax - xMin) * (i / 5);
      ctx.fillText(x.toFixed(1), transformX(x), h - margin + 20);
    }
    
    // Y-axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const y = yMin + (yMax - yMin) * (i / 5);
      ctx.fillText(y.toFixed(1), margin - 10, transformY(y) + 3);
    }
  }, [datasets, chartType, showRegression, showGrid]);

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
    // Calculate statistics for first visible dataset
    const visibleDataset = datasets.find(d => d.visible);
    if (visibleDataset && visibleDataset.data.length > 0) {
      const stats = calculateStatistics(visibleDataset.data);
      setStatistics(stats);
    } else {
      setStatistics(null);
    }
  }, [datasets]);

  const calculateLinearRegression = (data: DataPoint[]) => {
    if (data.length < 2) return null;
    
    const n = data.length;
    const sumX = data.reduce((sum, p) => sum + p.x, 0);
    const sumY = data.reduce((sum, p) => sum + p.y, 0);
    const sumXY = data.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = data.reduce((sum, p) => sum + p.x * p.x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept, r2: calculateCorrelation(data) };
  };

  const calculateCorrelation = (data: DataPoint[]) => {
    if (data.length < 2) return 0;
    
    const n = data.length;
    const sumX = data.reduce((sum, p) => sum + p.x, 0);
    const sumY = data.reduce((sum, p) => sum + p.y, 0);
    const sumXY = data.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumX2 = data.reduce((sum, p) => sum + p.x * p.x, 0);
    const sumY2 = data.reduce((sum, p) => sum + p.y * p.y, 0);
    
    const r = (n * sumXY - sumX * sumY) / 
      Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return r * r; // Return R²
  };

  const calculateStatistics = (data: DataPoint[]) => {
    const values = data.map(d => d.y);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted.length % 2 === 0 
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    
    return {
      mean,
      median,
      stdDev,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    };
  };

  const addDataset = () => {
    const newDataset: Dataset = {
      name: `Dataset ${datasets.length + 1}`,
      data: Array.from({ length: 8 }, (_, i) => ({
        x: i + 1,
        y: Math.random() * 10
      })),
      color: COLORS[datasets.length % COLORS.length],
      visible: true
    };
    setDatasets(prev => [...prev, newDataset]);
  };

  const removeDataset = (index: number) => {
    setDatasets(prev => prev.filter((_, i) => i !== index));
  };

  const toggleDatasetVisibility = (index: number) => {
    setDatasets(prev => prev.map((ds, i) => 
      i === index ? { ...ds, visible: !ds.visible } : ds
    ));
  };

  const generateNormalDistribution = () => {
    const data: DataPoint[] = [];
    const mean = 5;
    const stdDev = 1.5;
    
    for (let i = 0; i < 100; i++) {
      // Box-Muller transform for normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const value = mean + z0 * stdDev;
      
      data.push({
        x: value,
        y: 1 // For histogram
      });
    }
    
    const newDataset: Dataset = {
      name: 'Normal Distribution',
      data,
      color: COLORS[datasets.length % COLORS.length],
      visible: true
    };
    setDatasets(prev => [...prev, newDataset]);
    setChartType('histogram');
  };

  const exportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'statistics.png';
    a.click();
  };

  return (
    <div className="flex flex-col h-full">
      <TabBar tabs={TABS} active={tab} onChange={setTab} color="#8B5CF6" />

      {tab === 'theory' ? (
        <StatisticsTheorySection />
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
            <GlassPanel title="Chart Type" accentColor="#8B5CF6">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { type: 'scatter', label: 'Scatter', icon: '•' },
                  { type: 'line', label: 'Line', icon: '─' },
                  { type: 'bar', label: 'Bar', icon: '▄' },
                  { type: 'histogram', label: 'Histogram', icon: '▓' },
                ].map(chart => (
                  <button
                    key={chart.type}
                    onClick={() => setChartType(chart.type as any)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      chartType === chart.type
                        ? 'bg-[#8B5CF6] text-white'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    {chart.icon} {chart.label}
                  </button>
                ))}
              </div>
            </GlassPanel>

            <GlassPanel title="Display Options" accentColor="#8B5CF6">
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} className="w-3 h-3" />
                Show Grid
              </label>
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input type="checkbox" checked={showRegression} onChange={e => setShowRegression(e.target.checked)} className="w-3 h-3" />
                Show Regression Line
              </label>
            </GlassPanel>

            <GlassPanel title="Datasets" accentColor="#8B5CF6">
              <div className="space-y-2">
                {datasets.map((dataset, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-[var(--bg-secondary)] rounded">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={dataset.visible}
                        onChange={() => toggleDatasetVisibility(idx)}
                        className="w-3 h-3"
                      />
                      <div className="w-3 h-3 rounded-full" style={{ background: dataset.color }} />
                      <span className="text-xs">{dataset.name}</span>
                    </div>
                    {datasets.length > 1 && (
                      <button onClick={() => removeDataset(idx)} className="text-[var(--text-muted)] hover:text-[#EF4444]">
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={addDataset} className="flex-1 flex items-center justify-center gap-1 text-xs bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded py-1 transition-colors">
                  <Plus size={10} /> Add Dataset
                </button>
                <button onClick={generateNormalDistribution} className="flex-1 flex items-center justify-center gap-1 text-xs bg-[#10B981] hover:bg-[#059669] text-white rounded py-1 transition-colors">
                  <BarChart3 size={10} /> Normal
                </button>
              </div>
            </GlassPanel>

            {statistics && (
              <GlassPanel title="Statistics" accentColor="#F59E0B">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Mean:</span>
                    <span>{statistics.mean.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Median:</span>
                    <span>{statistics.median.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Std Dev:</span>
                    <span>{statistics.stdDev.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Min:</span>
                    <span>{statistics.min.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max:</span>
                    <span>{statistics.max.toFixed(3)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Count:</span>
                    <span>{statistics.count}</span>
                  </div>
                </div>
              </GlassPanel>
            )}

            <GlassPanel title="Quick Datasets" accentColor="#8B5CF6">
              {[
                { label: 'Linear', data: Array.from({ length: 10 }, (_, i) => ({ x: i, y: i * 2 + 1 })) },
                { label: 'Quadratic', data: Array.from({ length: 10 }, (_, i) => ({ x: i, y: i * i })) },
                { label: 'Exponential', data: Array.from({ length: 10 }, (_, i) => ({ x: i, y: Math.exp(i * 0.5) })) },
                { label: 'Sinusoidal', data: Array.from({ length: 20 }, (_, i) => ({ x: i * 0.5, y: Math.sin(i * 0.5) * 5 + 5 })) },
              ].map(preset => (
                <button
                  key={preset.label}
                  onClick={() => {
                    const newDataset: Dataset = {
                      name: preset.label,
                      data: preset.data,
                      color: COLORS[datasets.length % COLORS.length],
                      visible: true
                    };
                    setDatasets(prev => [...prev, newDataset]);
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

function StatisticsTheorySection() {
  const lessons = [
    {
      id: 'statistics-intro',
      title: 'Introduction to Statistics',
      type: 'video' as const,
      duration: '20:15',
      difficulty: 'beginner' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=VXYmHtCWEsk',
        description: 'Statistics is the discipline that concerns the collection, organization, analysis, interpretation, and presentation of data. This introduction covers fundamental concepts and their importance in data science.',
        keyPoints: [
          'Descriptive statistics summarize and describe data characteristics',
          'Inferential statistics make predictions about populations based on samples',
          'Measures of central tendency include mean, median, and mode',
          'Measures of dispersion include variance and standard deviation'
        ]
      }
    },
    {
      id: 'data-visualization',
      title: 'Data Visualization Techniques',
      type: 'text' as const,
      duration: '18 min read',
      difficulty: 'intermediate' as const,
      content: {
        html: `
          <h3>Data Visualization</h3>
          <p>Effective data visualization is crucial for understanding patterns, trends, and relationships in data. Different chart types serve different purposes.</p>
          
          <h4>Common Chart Types</h4>
          <p>Understanding when to use different visualization types is key to effective data communication.</p>
          
          <h4>Scatter Plots</h4>
          <p>Scatter plots are ideal for showing relationships between two continuous variables. Each point represents an observation with x and y values.</p>
          
          <h4>Histograms</h4>
          <p>Histograms show the distribution of a single continuous variable by grouping data into bins and displaying frequencies.</p>
          
          <h4>Line Charts</h4>
          <p>Line charts are perfect for showing trends over time or continuous data with ordered x-values.</p>
        `,
        formulas: [
          {
            expression: 'μ = (Σxi) / n',
            description: 'Mean (average) of a dataset'
          },
          {
            expression: 'σ² = Σ(xi - μ)² / n',
            description: 'Variance measuring spread'
          },
          {
            expression: 'σ = √σ²',
            description: 'Standard deviation'
          }
        ]
      }
    },
    {
      id: 'regression-analysis',
      title: 'Regression Analysis',
      type: 'video' as const,
      duration: '25:30',
      difficulty: 'advanced' as const,
      content: {
        videoUrl: 'https://www.youtube.com/watch?v=aq8YU-h1TYY',
        description: 'Learn about linear regression, correlation, and how to model relationships between variables. Understand how to interpret regression coefficients and assess model fit.',
        keyPoints: [
          'Linear regression finds the best-fit line through data points',
          'Correlation coefficient (R²) measures the strength of linear relationships',
          'Residual analysis helps assess model assumptions',
          'Multiple regression extends to multiple predictor variables'
        ]
      }
    }
  ];

  return (
    <TheorySection
      moduleId="statistics"
      title="Statistics & Data Analysis"
      description="Master statistical concepts including descriptive statistics, data visualization, probability theory, and regression analysis. This comprehensive course covers everything from basic statistics to advanced data analysis techniques used in data science and research."
      lessons={lessons}
      color="#8B5CF6"
    />
  );
}
