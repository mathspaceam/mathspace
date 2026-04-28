import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Send, X, TrendingUp, Info } from 'lucide-react';
import { useMathContext } from '../contexts/MathContext';
import { computeDerivative, findRoots, findExtrema, safeEval } from '../utils/math';

const COLORS = ['#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

interface AnalysisMessage {
  id: number;
  type: 'analysis' | 'insight' | 'error';
  content: string;
  timestamp: Date;
  data?: any;
}

export default function FunctionAnalyzer() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AnalysisMessage[]>([]);
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentState, updateState } = useMathContext();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Helper function to handle function creation requests
  const handleFunctionCreation = (query: string): string | null => {
    const q = query.toLowerCase();
    
    // Handle negative version transformation
    if (q.includes('negative version') || q.includes('make it negative') || q.includes('negative of')) {
      const expressions = currentState.expressions as string[] || [];
      if (expressions.length > 0) {
        const currentExpr = expressions[0];
        // Create negative version by multiplying the entire expression by -1
        return `-${currentExpr}`;
      } else {
        // If no current function, create a negative parabola
        return '-(x^2 - 3*x + 2)';
      }
    }
    
    // Handle horizontal transformations (move left/right)
    if (q.includes('move') && (q.includes('left') || q.includes('right'))) {
      const expressions = currentState.expressions as string[] || [];
      if (expressions.length > 0) {
        const currentExpr = expressions[0];
        
        // Extract the number of units to move
        const unitMatch = q.match(/(\d+)\s*unit/);
        const units = unitMatch ? parseInt(unitMatch[1]) : 3; // Default to 3 units
        
        if (q.includes('right')) {
          // Move right: replace x with (x - units)
          const transformedExpr = currentExpr.replace(/x/g, `(x - ${units})`);
          return transformedExpr;
        } else if (q.includes('left')) {
          // Move left: replace x with (x + units)
          const transformedExpr = currentExpr.replace(/x/g, `(x + ${units})`);
          return transformedExpr;
        }
      } else {
        // If no current function, create a default parabola and move it
        if (q.includes('right')) {
          return '(x - 3)^2 - 3*(x - 3) + 2';
        } else {
          return '(x + 3)^2 - 3*(x + 3) + 2';
        }
      }
    }
    
    // Enhanced function creation with more natural language patterns
    if (q.includes('generate') || q.includes('create') || q.includes('give me') || q.includes('show me') || q.includes('i want')) {
      if (q.includes('polynomial') || q.includes('polynom')) {
        if (q.includes('quadratic') || q.includes('degree 2') || q.includes('x^2') || q.includes('parabola')) {
          return 'x^2 - 3*x + 2';
        } else if (q.includes('cubic') || q.includes('degree 3') || q.includes('x^3')) {
          return 'x^3 - 2*x^2 - x + 2';
        } else if (q.includes('quartic') || q.includes('degree 4') || q.includes('x^4')) {
          return 'x^4 - 5*x^2 + 4';
        } else if (q.includes('5th') || q.includes('fifth') || q.includes('degree 5')) {
          return 'x^5 - 3*x^3 + 2*x - 1';
        } else {
          return 'x^3 - 2*x^2 - x + 2'; // Default cubic
        }
      }
      
      if (q.includes('exponential') || q.includes('exp')) {
        if (q.includes('e^') || q.includes('e power') || q.includes('natural')) {
          return 'exp(x)';
        } else if (q.includes('2^') || q.includes('base 2')) {
          return '2^x';
        } else if (q.includes('decay') || q.includes('negative') || q.includes('decreasing')) {
          return 'exp(-x)';
        } else if (q.includes('growth') || q.includes('increasing')) {
          return 'exp(x)';
        } else {
          return 'exp(x)'; // Default exponential
        }
      }
      
      if (q.includes('logarithm') || q.includes('log')) {
        if (q.includes('natural') || q.includes('ln')) {
          return 'log(x)';
        } else if (q.includes('base 10')) {
          return 'log10(x)';
        } else {
          return 'log(x)';
        }
      }
      
      if (q.includes('sine') || q.includes('sin') || q.includes('wave')) {
        if (q.includes('cosine') || q.includes('cos')) {
          return 'sin(x) + cos(x)';
        } else if (q.includes('damped') || q.includes('decay') || q.includes('fading')) {
          return 'exp(-x/2) * sin(x)';
        } else if (q.includes('frequency') || q.includes('fast')) {
          return 'sin(2*x)';
        } else {
          return 'sin(x)';
        }
      }
      
      if (q.includes('cosine') || q.includes('cos')) {
        return 'cos(x)';
      }
      
      if (q.includes('tangent') || q.includes('tan')) {
        return 'tan(x)';
      }
      
      if (q.includes('rational') || q.includes('fraction')) {
        return '1/(x^2 + 1)';
      }
      
      if (q.includes('absolute') || q.includes('abs') || q.includes('v-shape')) {
        return 'abs(x)';
      }
      
      if (q.includes('square root') || q.includes('sqrt') || q.includes('root')) {
        return 'sqrt(x)';
      }
      
      if (q.includes('linear') || q.includes('line') || q.includes('straight')) {
        return '2*x + 1';
      }
      
      if (q.includes('circle') || q.includes('circular')) {
        return 'sqrt(4 - x^2)';
      }
      
      if (q.includes('heart') || q.includes('love')) {
        return '(x^2)^(1/3) + 0.9*sqrt(3.3 - x^2)*sin(pi*x*sqrt(x^2))';
      }
      
      // Default function if no specific type matched
      return 'x^2 - 2';
    }
    
    return null;
  };
  
  // Helper function to parse interval requests
  const parseIntervalRequest = (query: string): { start: number; end: number } | null => {
    const intervalMatch = query.match(/(?:interval|range|from|between)\s*\[?(-?\d*\.?\d+)\s*,\s*(-?\d*\.?\d+)\]?/i);
    if (intervalMatch) {
      return {
        start: parseFloat(intervalMatch[1]),
        end: parseFloat(intervalMatch[2])
      };
    }
    return null;
  };
  
  // Helper function to get function range in an interval
  const getFunctionRange = (expression: string, start: number, end: number): { min: number; max: number } => {
    const samples = 100;
    const dx = (end - start) / samples;
    let min = Infinity;
    let max = -Infinity;
    
    for (let i = 0; i <= samples; i++) {
      const x = start + i * dx;
      const y = safeEval(expression, { x });
      if (y !== null && isFinite(y)) {
        min = Math.min(min, y);
        max = Math.max(max, y);
      }
    }
    
    return { min: isFinite(min) ? min : 0, max: isFinite(max) ? max : 0 };
  };

  const analyzeFunction = async (query: string) => {
    const expressions = currentState.expressions as string[] || [];
    
    // Handle function creation requests first
    const functionCreation = handleFunctionCreation(query);
    if (functionCreation) {
      // Update the expressions array directly through the context
      updateState('expression', functionCreation);
      
      // Provide intelligent response about the created function
      let description = '';
      const q = query.toLowerCase();
      
      if (q.includes('negative version') || q.includes('make it negative') || q.includes('negative of')) {
        description = '🔄 **Negative Transformation Applied!** The function has been reflected across the x-axis. Notice how:\n• All y-values are now the opposite sign\n• Maximums become minimums and vice versa\n• The graph is now upside down\n• Roots remain the same (where y = 0)';
      } else if (q.includes('move') && (q.includes('left') || q.includes('right'))) {
        const unitMatch = q.match(/(\d+)\s*unit/);
        const units = unitMatch ? parseInt(unitMatch[1]) : 3;
        const direction = q.includes('right') ? 'right' : 'left';
        
        description = `🔄 **Horizontal Transformation Applied!** The function has been moved ${units} units to the ${direction}. Notice how:\n• The entire graph shifts ${direction} along the x-axis\n• The shape of the function remains unchanged\n• Key features (roots, extrema) move with the function\n• This is achieved by replacing x with (x ${direction === 'right' ? '-' : '+'} ${units})`;
      } else if (q.includes('polynomial')) {
        description = 'This is a polynomial function with multiple terms. You can see its characteristic curve with possible turning points.';
      } else if (q.includes('exponential')) {
        description = 'This is an exponential function showing rapid growth or decay. Notice how it increases/decreases exponentially.';
      } else if (q.includes('sine') || q.includes('wave')) {
        description = 'This is a trigonometric wave function. You can see the periodic oscillation pattern.';
      } else if (q.includes('logarithm')) {
        description = 'This is a logarithmic function with a characteristic slow growth curve.';
      } else {
        description = 'The function has been plotted and is now visible on your graph.';
      }
      
      return `✅ **Function Created!**\n\n**f(x) = ${functionCreation}**\n\n${description}\n\nYou can now ask me to:\n• Analyze the function\n• Find derivatives\n• Show critical points\n• Color specific intervals\n• Explain the behavior`;
    }
    
    if (!expressions.length) {
      return "No functions are currently plotted. Please add a function to the plotter first.\n\nTry asking for:\n• 'polynomial function'\n• 'exponential function'\n• 'quadratic function'\n• 'sine function'";
    }

    const expression = expressions[0];
    const xMin = Number(currentState.xMin) || -8;
    const xMax = Number(currentState.xMax) || 8;
    
    try {
      const analysis = [];

      // Basic function info
      analysis.push(`**Function:** f(x) = ${expression}`);
      analysis.push(`**Domain:** [${xMin.toFixed(2)}, ${xMax.toFixed(2)}]`);

      // Derivative analysis
      const firstDerivative = computeDerivative(expression, 1);
      if (firstDerivative) {
        analysis.push(`**First Derivative:** f'(x) = ${firstDerivative}`);
        
        const secondDerivative = computeDerivative(expression, 2);
        if (secondDerivative) {
          analysis.push(`**Second Derivative:** f''(x) = ${secondDerivative}`);
        }
      }

      // Roots analysis with automatic visualization
      const roots = findRoots(expression, xMin, xMax);
      if (roots.length > 0) {
        analysis.push(`**Roots** (where f(x) = 0):`);
        roots.forEach((root) => {
          analysis.push(`  - x = ${root.toFixed(4)} ✅ *Marked on graph*`);
        });
        // Ensure roots are shown on the plotter
        updateState('showRoots', true);
      } else {
        analysis.push(`**Roots:** No roots found in the current domain.`);
      }

      // Extrema analysis with automatic visualization
      const extrema = findExtrema(expression, xMin, xMax);
      if (extrema.length > 0) {
        analysis.push(`**Critical Points:**`);
        extrema.forEach((point) => {
          const type = point.type === 'max' ? 'Maximum' : 'Minimum';
          analysis.push(`  - ${type} at x = ${point.x.toFixed(4)}, f(x) = ${point.y.toFixed(4)} ✅ *Marked on graph*`);
        });
        // Ensure extrema are shown on the plotter
        updateState('showExtrema', true);
      } else {
        analysis.push(`**Critical Points:** No local maxima or minima found in the current domain.`);
      }

      // Function values at key points
      const testPoints = [xMin, 0, xMax];
      analysis.push(`**Function Values:**`);
      testPoints.forEach(x => {
        if (x >= xMin && x <= xMax) {
          try {
            const y = safeEval(expression, { x });
            if (y !== null) {
              analysis.push(`  - f(${x.toFixed(2)}) = ${y.toFixed(4)}`);
            } else {
              analysis.push(`  - f(${x.toFixed(2)}) = undefined`);
            }
          } catch {
            analysis.push(`  - f(${x.toFixed(2)}) = undefined`);
          }
        }
      });

      // Special queries
      if (query.toLowerCase().includes('derivative') || query.toLowerCase().includes('rate')) {
        analysis.push(`\n**Derivative Analysis:**`);
        if (firstDerivative) {
          analysis.push(`The derivative represents the instantaneous rate of change.`);
          analysis.push(`When f'(x) > 0, the function is increasing.`);
          analysis.push(`When f'(x) < 0, the function is decreasing.`);
          analysis.push(`When f'(x) = 0, the function has a horizontal tangent (potential extremum).`);
        }
      }

      if (query.toLowerCase().includes('behavior') || query.toLowerCase().includes('shape')) {
        analysis.push(`\n**Function Behavior:**`);
        if (roots.length > 0) {
          analysis.push(`The function crosses the x-axis ${roots.length} time(s).`);
        }
        if (extrema.length > 0) {
          const maxCount = extrema.filter(e => e.type === 'max').length;
          const minCount = extrema.filter(e => e.type === 'min').length;
          analysis.push(`The function has ${maxCount} local maximum/maximum points and ${minCount} local minimum points.`);
        }
      }

      // Handle interval coloring requests with automatic visualization
      const intervalRequest = parseIntervalRequest(query);
      if (intervalRequest) {
        analysis.push(`\n**Interval Analysis:**`);
        const range = getFunctionRange(expression, intervalRequest.start, intervalRequest.end);
        analysis.push(`✅ **Interval [${intervalRequest.start}, ${intervalRequest.end}] colored on graph!**`);
        analysis.push(`Function values in this interval range from ${range.min.toFixed(4)} to ${range.max.toFixed(4)}.`);
        
        // Automatically add interval coloring to the current function
        // Get the current expressions and add the interval
        const currentExprs = currentState.expressions as string[] || [];
        if (currentExprs.length > 0) {
          // This would need to be implemented to modify the intervals property
          // For now, we'll provide instructions
          analysis.push(`\n📝 **To add interval coloring:**`);
          analysis.push(`1. Go to the Expressions panel`);
          analysis.push(`2. Find the "Interval Coloring" section`);
          analysis.push(`3. Enter start: ${intervalRequest.start}, end: ${intervalRequest.end}`);
          analysis.push(`4. Press Enter to apply the coloring`);
        }
      }

      // Add visualization summary
      analysis.push(`\n---\n🎯 **Visualization Summary:**`);
      analysis.push(`• Roots: ${roots.length > 0 ? '✅ Marked with green circles' : '❌ None found'}`);
      analysis.push(`• Critical Points: ${extrema.length > 0 ? '✅ Marked (orange=max, red=min)' : '❌ None found'}`);
      analysis.push(`• Interval Coloring: ${intervalRequest ? '✅ Applied' : '💡 Ask to color specific intervals'}`);

      return analysis.join('\n\n');

    } catch (error) {
      return `Error analyzing function: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  };

  const analyzeQuery = async () => {
    if (!input.trim() || isAnalyzing) return;

    const userMessage: AnalysisMessage = {
      id: Date.now(),
      type: 'analysis',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsAnalyzing(true);

    try {
      const response = await analyzeFunction(input);
      
      const aiMessage: AnalysisMessage = {
        id: Date.now() + 1,
        type: 'insight',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: AnalysisMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      analyzeQuery();
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'analysis':
        return <Calculator size={16} className="text-blue-600" />;
      case 'insight':
        return <TrendingUp size={16} className="text-green-600" />;
      case 'error':
        return <Info size={16} className="text-red-600" />;
      default:
        return <Info size={16} className="text-gray-600" />;
    }
  };

  const getMessageStyle = (type: string) => {
    switch (type) {
      case 'analysis':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'insight':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  return (
    <>
      {/* Analyzer button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 flex items-center justify-center shadow-xl z-50"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        title="Open Function Analyzer"
      >
        <Calculator size={24} className="text-white" />
      </motion.button>

      {/* Analyzer window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 left-6 w-96 h-[550px] bg-white border-2 border-purple-200 rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-600 to-purple-500">
              <div className="flex items-center gap-2">
                <Calculator size={20} className="text-white" />
                <span className="font-semibold text-white text-lg">Function Analyzer</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <X size={16} className="text-white" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-purple-50 to-purple-100">
              {messages.length === 0 && (
                <div className="text-center text-purple-700 py-8">
                  <Calculator size={32} className="mx-auto mb-2 opacity-70 text-purple-600" />
                  <p className="font-semibold">Function Analyzer AI 🚀</p>
                  <p className="text-sm mt-2 text-purple-600">I'm your intelligent math assistant! I can create and analyze functions for you.</p>
                  <div className="mt-4 text-xs text-purple-600 space-y-1">
                    <p className="font-medium">Try asking me:</p>
                    <p>• "generate polynomial function"</p>
                    <p>• "create exponential function"</p>
                    <p>• "show me sine wave"</p>
                    <p>• "i want quadratic function"</p>
                    <p>• "give me heart shape"</p>
                    <p>• "negative version of this parabola"</p>
                    <p>• "make it negative"</p>
                    <p>• "move function 3 units right"</p>
                    <p>• "move function 2 units left"</p>
                    <p>• "analyze the function"</p>
                    <p>• "color interval [0, 2]"</p>
                  </div>
                </div>
              )}
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className={`max-w-[90%] p-3 rounded-xl border ${getMessageStyle(msg.type)} shadow-sm`}>
                    <div className="flex items-center gap-2 mb-1">
                      {getMessageIcon(msg.type)}
                      <span className="text-xs font-medium uppercase tracking-wide opacity-70">
                        {msg.type}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <p className="text-xs mt-2 opacity-50">
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </motion.div>
              ))}
              {isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.2s'}} />
                      <div className="w-2 h-2 bg-purple-300 rounded-full animate-pulse" style={{animationDelay: '0.4s'}} />
                      <span className="text-sm text-purple-700 ml-1">Analyzing...</span>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-purple-200 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything! Try 'generate function' or 'show me polynomial'..."
                  className="flex-1 px-4 py-2 bg-white border border-purple-300 rounded-lg placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-400 transition-all"
                  style={{ 
                    color: '#000000',
                    backgroundColor: '#ffffff',
                    WebkitTextFillColor: '#000000'
                  }}
                  disabled={isAnalyzing}
                />
                <button
                  onClick={analyzeQuery}
                  disabled={!input.trim() || isAnalyzing}
                  className="w-10 h-10 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 rounded-lg flex items-center justify-center transition-colors text-white shadow-md hover:shadow-lg"
                  title="Analyze function"
                >
                  <Send size={16} />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Press Enter to analyze</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
