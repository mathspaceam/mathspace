import { evaluate, derivative, parse } from 'mathjs';

export function safeEval(expr: string, scope: Record<string, number>): number | null {
  try {
    const result = evaluate(expr, scope);
    if (typeof result !== 'number' || !isFinite(result) || isNaN(result)) return null;
    return result;
  } catch {
    return null;
  }
}

export function plotFunction(
  expr: string,
  xMin: number,
  xMax: number,
  samples = 500
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const dx = (xMax - xMin) / samples;
  for (let i = 0; i <= samples; i++) {
    const x = xMin + i * dx;
    const y = safeEval(expr, { x });
    if (y !== null) points.push({ x, y });
    else points.push({ x, y: NaN });
  }
  return points;
}

export function computeDerivative(expr: string, order: 1 | 2 | 3 = 1): string | null {
  try {
    let node = parse(expr);
    for (let i = 0; i < order; i++) {
      node = derivative(node, 'x');
    }
    return node.toString();
  } catch {
    return null;
  }
}

export function findRoots(expr: string, xMin: number, xMax: number): number[] {
  const roots: number[] = [];
  const samples = 1000;
  const dx = (xMax - xMin) / samples;
  let prevY = safeEval(expr, { x: xMin });
  for (let i = 1; i <= samples; i++) {
    const x = xMin + i * dx;
    const y = safeEval(expr, { x });
    if (prevY !== null && y !== null && prevY * y < 0) {
      const root = x - dx * y / (y - prevY);
      roots.push(root);
    }
    prevY = y;
  }
  return roots;
}

export function findExtrema(expr: string, xMin: number, xMax: number): { x: number; y: number; type: 'max' | 'min' }[] {
  const result: { x: number; y: number; type: 'max' | 'min' }[] = [];
  const dExpr = computeDerivative(expr, 1);
  if (!dExpr) return result;
  const roots = findRoots(dExpr, xMin, xMax);
  const d2Expr = computeDerivative(expr, 2);
  for (const x of roots) {
    const y = safeEval(expr, { x });
    if (y === null) continue;
    if (d2Expr) {
      const d2 = safeEval(d2Expr, { x });
      if (d2 !== null && d2 > 0) result.push({ x, y, type: 'min' });
      else if (d2 !== null && d2 < 0) result.push({ x, y, type: 'max' });
    }
  }
  return result;
}

export function numericalIntegral(expr: string, a: number, b: number, n: number): number {
  const dx = (b - a) / n;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const xMid = a + (i + 0.5) * dx;
    const y = safeEval(expr, { x: xMid });
    if (y !== null) sum += y * dx;
  }
  return sum;
}

export function worldToCanvas(
  worldX: number,
  worldY: number,
  viewXMin: number,
  viewXMax: number,
  viewYMin: number,
  viewYMax: number,
  canvasW: number,
  canvasH: number
): { cx: number; cy: number } {
  const cx = ((worldX - viewXMin) / (viewXMax - viewXMin)) * canvasW;
  const cy = canvasH - ((worldY - viewYMin) / (viewYMax - viewYMin)) * canvasH;
  return { cx, cy };
}

export function canvasToWorld(
  cx: number,
  cy: number,
  viewXMin: number,
  viewXMax: number,
  viewYMin: number,
  viewYMax: number,
  canvasW: number,
  canvasH: number
): { wx: number; wy: number } {
  const wx = viewXMin + (cx / canvasW) * (viewXMax - viewXMin);
  const wy = viewYMin + ((canvasH - cy) / canvasH) * (viewYMax - viewYMin);
  return { wx, wy };
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  xMin: number, xMax: number, yMin: number, yMax: number,
  w: number, h: number
) {
  ctx.save();
  ctx.strokeStyle = 'rgba(59,130,246,0.08)';
  ctx.lineWidth = 1;

  const xRange = xMax - xMin;
  const yRange = yMax - yMin;
  const gridX = niceStep(xRange / 8);
  const gridY = niceStep(yRange / 8);

  const startX = Math.ceil(xMin / gridX) * gridX;
  for (let x = startX; x <= xMax; x += gridX) {
    const { cx } = worldToCanvas(x, 0, xMin, xMax, yMin, yMax, w, h);
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.stroke();
  }

  const startY = Math.ceil(yMin / gridY) * gridY;
  for (let y = startY; y <= yMax; y += gridY) {
    const { cy } = worldToCanvas(0, y, xMin, xMax, yMin, yMax, w, h);
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1.5;
  const { cx: x0 } = worldToCanvas(0, 0, xMin, xMax, yMin, yMax, w, h);
  const { cy: y0 } = worldToCanvas(0, 0, xMin, xMax, yMin, yMax, w, h);
  ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(w, y0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0, h); ctx.stroke();

  // Axis labels
  ctx.fillStyle = 'rgba(139,156,192,0.7)';
  ctx.font = '10px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  for (let x = Math.ceil(xMin / gridX) * gridX; x <= xMax; x += gridX) {
    if (Math.abs(x) < gridX * 0.01) continue;
    const { cx } = worldToCanvas(x, 0, xMin, xMax, yMin, yMax, w, h);
    const labelY = Math.min(Math.max(y0 + 14, 14), h - 4);
    ctx.fillText(x.toFixed(Math.abs(x) < 1 ? 2 : 1), cx, labelY);
  }
  ctx.textAlign = 'right';
  for (let y = Math.ceil(yMin / gridY) * gridY; y <= yMax; y += gridY) {
    if (Math.abs(y) < gridY * 0.01) continue;
    const { cy } = worldToCanvas(0, y, xMin, xMax, yMin, yMax, w, h);
    const labelX = Math.min(Math.max(x0 - 4, 4), w - 4);
    ctx.fillText(y.toFixed(Math.abs(y) < 1 ? 2 : 1), labelX, cy + 4);
  }

  ctx.restore();
}

function niceStep(roughStep: number): number {
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const residual = roughStep / magnitude;
  if (residual < 1.5) return magnitude;
  if (residual < 3.5) return 2 * magnitude;
  if (residual < 7.5) return 5 * magnitude;
  return 10 * magnitude;
}

// Professional Integral Solver
export interface IntegralStep {
  type: 'rule' | 'substitution' | 'integration' | 'simplification' | 'result';
  description: string;
  expression: string;
  explanation: string;
  highlighted?: boolean;
}

export interface IntegralSolution {
  original: string;
  antiderivative: string;
  definiteValue?: number;
  bounds?: { a: number; b: number };
  steps: IntegralStep[];
  method: string;
  success: boolean;
  error?: string;
}

export interface IntegralResult {
  value: number;
  antiderivative: string;
  method: string;
  steps: string[];
  solution?: IntegralSolution;
  error?: string;
}

export function solveIntegralStepByStep(expr: string, a?: number, b?: number): IntegralSolution {
  const steps: IntegralStep[] = [];
  const originalExpr = expr.trim();

  try {
    // Step 1: Problem Setup
    steps.push({
      type: 'rule',
      description: '📝 Problem Setup',
      expression: `∫ ${originalExpr} dx`,
      explanation: `We need to find the antiderivative (indefinite integral) of the function f(x) = ${originalExpr}. The antiderivative F(x) is a function whose derivative is f(x).`,
      highlighted: true
    });

    // Step 2: Apply integration rules based on function type
    let antiderivative: string;
    let method: string;

    // Handle different function types with PhotoMath-style detailed explanations
    if (originalExpr === 'sin(x)') {
      method = 'Basic Trigonometric Integration';
      
      steps.push({
        type: 'rule',
        description: '🔍 Identify the Function Type',
        expression: 'f(x) = sin(x)',
        explanation: 'This is a basic trigonometric function. We need to recall the derivative rules for trigonometric functions.'
      });
      
      steps.push({
        type: 'rule',
        description: '📚 Recall the Derivative Rule',
        expression: 'd/dx[cos(x)] = -sin(x)',
        explanation: 'We know that the derivative of cos(x) is -sin(x). This means cos(x) is an antiderivative of -sin(x).'
      });
      
      steps.push({
        type: 'integration',
        description: '🔄 Apply the Integration Rule',
        expression: '∫ sin(x) dx = -∫ (-sin(x)) dx = -cos(x) + C',
        explanation: 'Since d/dx[cos(x)] = -sin(x), then d/dx[-cos(x)] = sin(x). Therefore, the integral of sin(x) is -cos(x).'
      });
      
      antiderivative = '-cos(x) + C';
      
      steps.push({
        type: 'result',
        description: '✅ Final Answer',
        expression: '∫ sin(x) dx = -cos(x) + C',
        explanation: 'The antiderivative of sin(x) is -cos(x), where C is the constant of integration representing all possible vertical shifts.',
        highlighted: true
      });
    }
    else if (originalExpr === 'cos(x)') {
      method = 'Basic Trigonometric Integration';
      
      steps.push({
        type: 'rule',
        description: '🔍 Identify the Function Type',
        expression: 'f(x) = cos(x)',
        explanation: 'This is a basic trigonometric function. We need to recall the derivative rules for trigonometric functions.'
      });
      
      steps.push({
        type: 'rule',
        description: '📚 Recall the Derivative Rule',
        expression: 'd/dx[sin(x)] = cos(x)',
        explanation: 'We know that the derivative of sin(x) is cos(x). This means sin(x) is an antiderivative of cos(x).'
      });
      
      steps.push({
        type: 'integration',
        description: '🔄 Apply the Integration Rule',
        expression: '∫ cos(x) dx = sin(x) + C',
        explanation: 'Since d/dx[sin(x)] = cos(x), the integral of cos(x) is sin(x) plus the constant of integration.'
      });
      
      antiderivative = 'sin(x) + C';
      
      steps.push({
        type: 'result',
        description: '✅ Final Answer',
        expression: '∫ cos(x) dx = sin(x) + C',
        explanation: 'The antiderivative of cos(x) is sin(x), where C is the constant of integration.',
        highlighted: true
      });
    }
    else if (originalExpr === 'x') {
      method = 'Power Rule';
      
      steps.push({
        type: 'rule',
        description: '🔍 Identify the Function Type',
        expression: 'f(x) = x = x¹',
        explanation: 'This is a power function with exponent 1. We can use the power rule for integration.'
      });
      
      steps.push({
        type: 'rule',
        description: '📚 Power Rule for Integration',
        expression: '∫ xⁿ dx = x^(n+1)/(n+1) + C, where n ≠ -1',
        explanation: 'The power rule states that to integrate xⁿ, we add 1 to the exponent and divide by the new exponent.'
      });
      
      steps.push({
        type: 'integration',
        description: '🔄 Apply the Power Rule',
        expression: '∫ x¹ dx = x^(1+1)/(1+1) + C = x²/2 + C',
        explanation: 'Here n = 1, so we add 1 to get 2, and divide by 2. The result is x²/2 plus the constant of integration.'
      });
      
      antiderivative = 'x²/2 + C';
      
      steps.push({
        type: 'result',
        description: '✅ Final Answer',
        expression: '∫ x dx = x²/2 + C',
        explanation: 'The antiderivative of x is x²/2, where C is the constant of integration.',
        highlighted: true
      });
    }
    else if (originalExpr === 'x^2') {
      method = 'Power Rule';
      
      steps.push({
        type: 'rule',
        description: '🔍 Identify the Function Type',
        expression: 'f(x) = x²',
        explanation: 'This is a power function with exponent 2. We can use the power rule for integration.'
      });
      
      steps.push({
        type: 'rule',
        description: '📚 Power Rule for Integration',
        expression: '∫ xⁿ dx = x^(n+1)/(n+1) + C, where n ≠ -1',
        explanation: 'The power rule states that to integrate xⁿ, we add 1 to the exponent and divide by the new exponent.'
      });
      
      steps.push({
        type: 'integration',
        description: '🔄 Apply the Power Rule',
        expression: '∫ x² dx = x^(2+1)/(2+1) + C = x³/3 + C',
        explanation: 'Here n = 2, so we add 1 to get 3, and divide by 3. The result is x³/3 plus the constant of integration.'
      });
      
      antiderivative = 'x³/3 + C';
      
      steps.push({
        type: 'result',
        description: '✅ Final Answer',
        expression: '∫ x² dx = x³/3 + C',
        explanation: 'The antiderivative of x² is x³/3, where C is the constant of integration.',
        highlighted: true
      });
    }
    else if (originalExpr === 'x^3') {
      method = 'Power Rule';
      
      steps.push({
        type: 'rule',
        description: '🔍 Identify the Function Type',
        expression: 'f(x) = x³',
        explanation: 'This is a power function with exponent 3. We can use the power rule for integration.'
      });
      
      steps.push({
        type: 'rule',
        description: '📚 Power Rule for Integration',
        expression: '∫ xⁿ dx = x^(n+1)/(n+1) + C, where n ≠ -1',
        explanation: 'The power rule states that to integrate xⁿ, we add 1 to the exponent and divide by the new exponent.'
      });
      
      steps.push({
        type: 'integration',
        description: '🔄 Apply the Power Rule',
        expression: '∫ x³ dx = x^(3+1)/(3+1) + C = x⁴/4 + C',
        explanation: 'Here n = 3, so we add 1 to get 4, and divide by 4. The result is x⁴/4 plus the constant of integration.'
      });
      
      antiderivative = 'x⁴/4 + C';
      
      steps.push({
        type: 'result',
        description: '✅ Final Answer',
        expression: '∫ x³ dx = x⁴/4 + C',
        explanation: 'The antiderivative of x³ is x⁴/4, where C is the constant of integration.',
        highlighted: true
      });
    }
    else if (originalExpr === '1/x') {
      method = 'Logarithmic Integration';
      
      steps.push({
        type: 'rule',
        description: '🔍 Identify the Function Type',
        expression: 'f(x) = 1/x = x^(-1)',
        explanation: 'This is a reciprocal function, which is a special case of power functions where n = -1.'
      });
      
      steps.push({
        type: 'rule',
        description: '⚠️ Special Case Note',
        expression: 'Power rule doesn\'t work for n = -1',
        explanation: 'The power rule ∫ xⁿ dx = x^(n+1)/(n+1) + C doesn\'t work when n = -1 because we would divide by zero.'
      });
      
      steps.push({
        type: 'rule',
        description: '📚 Recall the Logarithmic Rule',
        expression: 'd/dx[ln|x|] = 1/x',
        explanation: 'The derivative of the natural logarithm of |x| is 1/x. This means ln|x| is an antiderivative of 1/x.'
      });
      
      steps.push({
        type: 'integration',
        description: '🔄 Apply the Logarithmic Rule',
        expression: '∫ 1/x dx = ln|x| + C',
        explanation: 'Since d/dx[ln|x|] = 1/x, the integral of 1/x is ln|x| plus the constant of integration. We use |x| because ln(x) is only defined for x > 0.'
      });
      
      antiderivative = 'ln|x| + C';
      
      steps.push({
        type: 'result',
        description: '✅ Final Answer',
        expression: '∫ 1/x dx = ln|x| + C',
        explanation: 'The antiderivative of 1/x is ln|x|, where C is the constant of integration.',
        highlighted: true
      });
    }
    else if (originalExpr === 'exp(x)' || originalExpr === 'e^x') {
      method = 'Exponential Integration';
      
      steps.push({
        type: 'rule',
        description: '🔍 Identify the Function Type',
        expression: 'f(x) = e^x',
        explanation: 'This is the exponential function with base e, which has a special property.'
      });
      
      steps.push({
        type: 'rule',
        description: '📚 Recall the Exponential Property',
        expression: 'd/dx[e^x] = e^x',
        explanation: 'The exponential function e^x is unique because it is its own derivative. This means it is also its own antiderivative.'
      });
      
      steps.push({
        type: 'integration',
        description: '🔄 Apply the Exponential Rule',
        expression: '∫ e^x dx = e^x + C',
        explanation: 'Since d/dx[e^x] = e^x, the integral of e^x is e^x plus the constant of integration.'
      });
      
      antiderivative = 'e^x + C';
      
      steps.push({
        type: 'result',
        description: '✅ Final Answer',
        expression: '∫ e^x dx = e^x + C',
        explanation: 'The antiderivative of e^x is e^x, where C is the constant of integration.',
        highlighted: true
      });
    }
    else if (originalExpr === 'sqrt(x)') {
      method = 'Power Rule with Fractional Exponent';
      
      steps.push({
        type: 'rule',
        description: '🔍 Identify the Function Type',
        expression: 'f(x) = √x',
        explanation: 'This is a square root function. To apply the power rule, we need to rewrite it with a fractional exponent.'
      });
      
      steps.push({
        type: 'simplification',
        description: '🔄 Rewrite with Fractional Exponent',
        expression: '√x = x^(1/2)',
        explanation: 'The square root of x is equivalent to x raised to the power of 1/2.'
      });
      
      steps.push({
        type: 'rule',
        description: '📚 Apply the Power Rule',
        expression: '∫ x^(1/2) dx = x^((1/2)+1)/((1/2)+1) + C',
        explanation: 'Using the power rule with n = 1/2, we add 1 to get 3/2, and divide by 3/2.'
      });
      
      steps.push({
        type: 'integration',
        description: '🧮 Simplify the Result',
        expression: 'x^(3/2)/(3/2) + C = (2/3)x^(3/2) + C',
        explanation: 'Dividing by 3/2 is the same as multiplying by 2/3. The result is (2/3)x^(3/2) plus the constant of integration.'
      });
      
      steps.push({
        type: 'simplification',
        description: '📝 Rewrite in Radical Form',
        expression: '(2/3)x^(3/2) + C = (2/3)x√x + C',
        explanation: 'We can rewrite x^(3/2) as x√x for a more familiar radical form.'
      });
      
      antiderivative = '(2/3)x^(3/2) + C';
      
      steps.push({
        type: 'result',
        description: '✅ Final Answer',
        expression: '∫ √x dx = (2/3)x√x + C',
        explanation: 'The antiderivative of √x is (2/3)x√x, where C is the constant of integration.',
        highlighted: true
      });
    }
    else if (originalExpr.match(/^\d+\*x\^(\d+)$/)) {
      const match = originalExpr.match(/^\d+\*x\^(\d+)$/);
      const parts = originalExpr.split('*');
      const coeff = parseInt(parts[0]);
      const power = parseInt(parts[1].split('^')[1]);
      method = 'Power Rule with Coefficient';
      
      steps.push({
        type: 'rule',
        description: '🔍 Identify the Function Type',
        expression: `f(x) = ${coeff}x^${power}`,
        explanation: 'This is a power function with a constant coefficient. We can factor out the constant and apply the power rule.'
      });
      
      steps.push({
        type: 'rule',
        description: '📚 Constant Multiple Rule',
        expression: `∫ ${coeff}x^${power} dx = ${coeff} ∫ x^${power} dx`,
        explanation: 'Constants can be factored out of integrals. This makes the integration process simpler.'
      });
      
      steps.push({
        type: 'integration',
        description: '🔄 Apply the Power Rule',
        expression: `${coeff} × x^(${power}+1)/(${power}+1) + C`,
        explanation: `Apply the power rule to x^${power}: add 1 to the exponent (${power}+1) and divide by the new exponent.`
      });
      
      antiderivative = `${coeff}*x^${power + 1}/${power + 1} + C`;
      
      steps.push({
        type: 'result',
        description: '✅ Final Answer',
        expression: `∫ ${originalExpr} dx = ${antiderivative}`,
        explanation: `The antiderivative of ${originalExpr} is ${antiderivative}, where C is the constant of integration.`,
        highlighted: true
      });
    }
    else {
      method = 'Advanced Integration Required';
      
      steps.push({
        type: 'rule',
        description: '🔍 Function Analysis',
        expression: `f(x) = ${originalExpr}`,
        explanation: 'This function requires advanced integration techniques such as substitution, integration by parts, or special formulas.'
      });
      
      steps.push({
        type: 'rule',
        description: '📚 Advanced Methods Needed',
        expression: '∫ ' + originalExpr + ' dx',
        explanation: 'For this function, we would need to use techniques like u-substitution, integration by parts, partial fractions, or other advanced methods.'
      });
      
      antiderivative = `∫ ${originalExpr} dx + C`;
      
      steps.push({
        type: 'result',
        description: '⚠️ Result',
        expression: antiderivative,
        explanation: 'This integral requires advanced techniques beyond basic rules. Consider using numerical methods or symbolic computation software.',
        highlighted: true
      });
    }

    // Calculate definite integral if bounds are provided
    if (a !== undefined && b !== undefined) {
      steps.push({
        type: 'rule',
        description: '🎯 Definite Integral Setup',
        expression: `∫[${a}, ${b}] ${originalExpr} dx = F(${b}) - F(${a})`,
        explanation: 'For definite integrals, we use the Fundamental Theorem of Calculus: evaluate the antiderivative at the upper bound and subtract the value at the lower bound.'
      });

      // Calculate numerical value with detailed steps
      const cleanAntideriv = antiderivative.replace('+ C', '');
      const fB = safeEval(cleanAntideriv.replace(/x/g, `(${b})`), {});
      const fA = safeEval(cleanAntideriv.replace(/x/g, `(${a})`), {});
      
      if (fB !== null && fA !== null && isFinite(fB) && isFinite(fA)) {
        const definiteValue = fB - fA;
        
        steps.push({
          type: 'integration',
          description: '🧮 Evaluate at Upper Bound',
          expression: `F(${b}) = ${cleanAntideriv.replace(/x/g, `(${b})`)} = ${fB.toFixed(4)}`,
          explanation: `Substitute x = ${b} into the antiderivative and calculate the result.`
        });
        
        steps.push({
          type: 'integration',
          description: '🧮 Evaluate at Lower Bound',
          expression: `F(${a}) = ${cleanAntideriv.replace(/x/g, `(${a})`)} = ${fA.toFixed(4)}`,
          explanation: `Substitute x = ${a} into the antiderivative and calculate the result.`
        });
        
        steps.push({
          type: 'result',
          description: '✅ Definite Integral Result',
          expression: `∫[${a}, ${b}] ${originalExpr} dx = ${fB.toFixed(4)} - ${fA.toFixed(4)} = ${definiteValue.toFixed(4)}`,
          explanation: `Subtract the lower bound evaluation from the upper bound evaluation to get the definite integral value: ${definiteValue.toFixed(4)}.`,
          highlighted: true
        });

        return {
          original: originalExpr,
          antiderivative,
          definiteValue,
          bounds: { a, b },
          steps,
          method,
          success: true
        };
      } else {
        steps.push({
          type: 'rule',
          description: '⚠️ Evaluation Issue',
          expression: 'Cannot evaluate at bounds',
          explanation: 'The antiderivative cannot be evaluated at the given bounds due to domain restrictions or computational issues.'
        });
      }
    }

    return {
      original: originalExpr,
      antiderivative,
      bounds: a !== undefined && b !== undefined ? { a, b } : undefined,
      steps,
      method,
      success: true
    };

  } catch (error) {
    return {
      original: originalExpr,
      antiderivative: 'Unable to compute',
      steps: [{
        type: 'rule',
        description: '❌ Error',
        expression: originalExpr,
        explanation: 'Unable to solve this integral step by step. The function may be too complex or contain errors.'
      }],
      method: 'Error',
      success: false,
      error: 'Failed to solve integral'
    };
  }
}

export function calculateIntegral(
  expr: string,
  a?: number,
  b?: number,
  method: 'numerical' | 'indefinite' = 'numerical'
): IntegralResult {
  try {
    // Get step-by-step solution
    const solution = solveIntegralStepByStep(expr, a, b);
    
    let value: number;
    let methodName: string;
    let steps: string[] = [];

    // Use the step-by-step solution value if available, otherwise fall back to numerical
    if (solution.definiteValue !== undefined) {
      value = solution.definiteValue;
      methodName = 'Step-by-Step Solution';
      steps = solution.steps.map(step => `${step.description}: ${step.expression}`);
    } else {
      // Numerical integration as fallback
      if (method === 'simpson') {
        value = simpsonRule(expr, a, b, 1000);
        methodName = "Simpson's Rule";
      } else if (method === 'trapezoidal') {
        value = trapezoidalRule(expr, a, b, 1000);
        methodName = "Trapezoidal Rule";
      } else {
        value = numericalIntegral(expr, a, b, 10000);
        methodName = "Numerical Integration";
      }
      steps = [
        `Using ${methodName}`,
        `∫[${a.toFixed(3)}, ${b.toFixed(3)}] ${expr} dx`,
        `Result: ${value.toFixed(6)}`
      ];
    }

    return {
      value,
      antiderivative: solution.antiderivative,
      method: methodName,
      steps,
      solution
    };
  } catch (error) {
    return {
      value: 0,
      antiderivative: 'Unable to compute',
      method: 'Error',
      steps: [],
      error: 'Failed to calculate integral'
    };
  }
}

function simpsonRule(expr: string, a: number, b: number, n: number): number {
  if (n % 2 !== 0) n++; // Simpson's rule requires even number of intervals
  const h = (b - a) / n;
  let sum = safeEval(expr, { x: a }) ?? 0;
  
  for (let i = 1; i < n; i++) {
    const x = a + i * h;
    const y = safeEval(expr, { x }) ?? 0;
    sum += (i % 2 === 0 ? 2 : 4) * y;
  }
  
  sum += safeEval(expr, { x: b }) ?? 0;
  return (h / 3) * sum;
}

function trapezoidalRule(expr: string, a: number, b: number, n: number): number {
  const h = (b - a) / n;
  let sum = (safeEval(expr, { x: a }) ?? 0) + (safeEval(expr, { x: b }) ?? 0);
  
  for (let i = 1; i < n; i++) {
    const x = a + i * h;
    sum += 2 * (safeEval(expr, { x }) ?? 0);
  }
  
  return (h / 2) * sum;
}

function findAntiderivative(expr: string): string {
  // Simple pattern matching for common integrals
  const sinMatch = expr.match(/^sin\(x\)$/);
  if (sinMatch) return '-cos(x) + C';
  
  const cosMatch = expr.match(/^cos\(x\)$/);
  if (cosMatch) return 'sin(x) + C';
  
  const xPowerMatch = expr.match(/^x\^(\d+)$/);
  if (xPowerMatch) {
    const power = parseInt(xPowerMatch[1]);
    return `x^${power + 1}/${power + 1} + C`;
  }
  
  const x2Match = expr.match(/^x\^2$/);
  if (x2Match) return 'x^3/3 + C';
  
  const x3Match = expr.match(/^x\^3$/);
  if (x3Match) return 'x^4/4 + C';
  
  const xMatch = expr.match(/^x$/);
  if (xMatch) return 'x^2/2 + C';
  
  const oneMatch = expr.match(/^1$/);
  if (oneMatch) return 'x + C';
  
  const expMatch = expr.match(/^exp\(x\)$/);
  if (expMatch) return 'exp(x) + C';
  
  const ePowerMatch = expr.match(/^e\^x$/);
  if (ePowerMatch) return 'e^x + C';
  
  const oneOverXMatch = expr.match(/^1\/x$/);
  if (oneOverXMatch) return 'ln|x| + C';
  
  const logMatch = expr.match(/^log\(x\)$/);
  if (logMatch) return 'x*log(x) - x + C';
  
  const sqrtMatch = expr.match(/^sqrt\(x\)$/);
  if (sqrtMatch) return '(2/3)*x^(3/2) + C';
  
  // Try to handle polynomial terms
  const polynomialMatch = expr.match(/^(\d+)\*x\^(\d+)$/);
  if (polynomialMatch) {
    const coeff = parseInt(polynomialMatch[1]);
    const power = parseInt(polynomialMatch[2]);
    return `${coeff}*x^${power + 1}/${power + 1} + C`;
  }

  return '∫' + expr + ' dx + C';
}

export function drawInterval(
  ctx: CanvasRenderingContext2D,
  expr: string,
  start: number,
  end: number,
  color: string,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  w: number,
  h: number
) {
  const points = plotFunction(expr, start, end, 200);
  const { cy: y0 } = worldToCanvas(0, 0, xMin, xMax, yMin, yMax, w, h);

  ctx.save();
  ctx.fillStyle = color + '40'; // Add transparency
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  // Draw the filled area under the curve in the interval
  ctx.beginPath();
  ctx.moveTo(worldToCanvas(start, 0, xMin, xMax, yMin, yMax, w, h).cx, y0);
  
  for (const pt of points) {
    if (isNaN(pt.y) || pt.y < yMin - 5 || pt.y > yMax + 5) continue;
    const { cx, cy } = worldToCanvas(pt.x, pt.y, xMin, xMax, yMin, yMax, w, h);
    ctx.lineTo(cx, cy);
  }
  
  ctx.lineTo(worldToCanvas(end, 0, xMin, xMax, yMin, yMax, w, h).cx, y0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Draw boundary lines
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  
  // Left boundary
  const { cx: ax } = worldToCanvas(start, 0, xMin, xMax, yMin, yMax, w, h);
  ctx.beginPath();
  ctx.moveTo(ax, 0);
  ctx.lineTo(ax, h);
  ctx.stroke();
  
  // Right boundary
  const { cx: bx } = worldToCanvas(end, 0, xMin, xMax, yMin, yMax, w, h);
  ctx.beginPath();
  ctx.moveTo(bx, 0);
  ctx.lineTo(bx, h);
  ctx.stroke();

  ctx.restore();
}

export function drawIntegralArea(
  ctx: CanvasRenderingContext2D,
  expr: string,
  a: number,
  b: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  w: number,
  h: number
) {
  // Draw filled area under the curve
  const points = plotFunction(expr, a, b, 200);
  const { cy: y0 } = worldToCanvas(0, 0, xMin, xMax, yMin, yMax, w, h);

  ctx.save();
  ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
  ctx.lineWidth = 2;

  // Draw the filled area
  ctx.beginPath();
  ctx.moveTo(worldToCanvas(a, 0, xMin, xMax, yMin, yMax, w, h).cx, y0);
  
  for (const pt of points) {
    if (isNaN(pt.y) || pt.y < yMin - 5 || pt.y > yMax + 5) continue;
    const { cx, cy } = worldToCanvas(pt.x, pt.y, xMin, xMax, yMin, yMax, w, h);
    ctx.lineTo(cx, cy);
  }
  
  ctx.lineTo(worldToCanvas(b, 0, xMin, xMax, yMin, yMax, w, h).cx, y0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Draw boundary lines
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  
  // Left boundary
  const { cx: ax } = worldToCanvas(a, 0, xMin, xMax, yMin, yMax, w, h);
  ctx.beginPath();
  ctx.moveTo(ax, 0);
  ctx.lineTo(ax, h);
  ctx.stroke();
  
  // Right boundary
  const { cx: bx } = worldToCanvas(b, 0, xMin, xMax, yMin, yMax, w, h);
  ctx.beginPath();
  ctx.moveTo(bx, 0);
  ctx.lineTo(bx, h);
  ctx.stroke();

  ctx.restore();
}

export function drawIntegralSolution(
  ctx: CanvasRenderingContext2D,
  originalExpr: string,
  antiderivative: string,
  a: number,
  b: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  w: number,
  h: number,
  showAntiderivative: boolean = true
) {
  if (!showAntiderivative) return;

  try {
    // Draw the antiderivative curve
    const cleanAntideriv = antiderivative.replace('+ C', '');
    const antiderivPoints = plotFunction(cleanAntideriv, xMin, xMax, 300);
    
    ctx.save();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#F59E0B';
    ctx.shadowBlur = 8;
    ctx.setLineDash([10, 5]);
    
    ctx.beginPath();
    let penDown = false;
    for (const pt of antiderivPoints) {
      if (isNaN(pt.y) || pt.y < yMin - 10 || pt.y > yMax + 10) { 
        penDown = false; 
        continue; 
      }
      const { cx, cy } = worldToCanvas(pt.x, pt.y, xMin, xMax, yMin, yMax, w, h);
      if (!penDown) { 
        ctx.moveTo(cx, cy); 
        penDown = true; 
      }
      else { 
        ctx.lineTo(cx, cy); 
      }
    }
    ctx.stroke();
    ctx.restore();

    // Draw evaluation points at bounds
    const fB = safeEval(cleanAntideriv.replace(/x/g, `(${b})`), {});
    const fA = safeEval(cleanAntideriv.replace(/x/g, `(${a})`), {});
    
    if (fB !== null && fA !== null && isFinite(fB) && isFinite(fA)) {
      ctx.save();
      
      // Point at b
      const { cx: bx, cy: by } = worldToCanvas(b, fB, xMin, xMax, yMin, yMax, w, h);
      if (by >= 0 && by <= h) {
        ctx.fillStyle = '#F59E0B';
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }
      
      // Point at a
      const { cx: ax, cy: ay } = worldToCanvas(a, fA, xMin, xMax, yMin, yMax, w, h);
      if (ay >= 0 && ay <= h) {
        ctx.fillStyle = '#F59E0B';
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(ax, ay, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }
      
      // Draw difference visualization
      if (by >= 0 && by <= h && ay >= 0 && ay <= h) {
        // Draw vertical difference lines
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 3]);
        ctx.globalAlpha = 0.7;
        
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax, by);
        ctx.moveTo(bx, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
        
        // Draw horizontal difference line
        ctx.beginPath();
        ctx.moveTo(ax, by);
        ctx.lineTo(bx, by);
        ctx.stroke();
        
        ctx.globalAlpha = 1.0;
        
        // Add labels with background
        const diff = fB - fA;
        ctx.font = '11px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        
        // F(b) label
        if (by - 15 > 0) {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
          const textB = `F(${b.toFixed(1)})=${fB.toFixed(2)}`;
          const textBWidth = ctx.measureText(textB).width;
          ctx.fillRect(bx - textBWidth/2 - 4, by - 20, textBWidth + 8, 16);
          ctx.fillStyle = 'white';
          ctx.fillText(textB, bx, by - 8);
        }
        
        // F(a) label
        if (ay - 15 > 0) {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.9)';
          const textA = `F(${a.toFixed(1)})=${fA.toFixed(2)}`;
          const textAWidth = ctx.measureText(textA).width;
          ctx.fillRect(ax - textAWidth/2 - 4, ay - 20, textAWidth + 8, 16);
          ctx.fillStyle = 'white';
          ctx.fillText(textA, ax, ay - 8);
        }
        
        // Difference label
        if (by - 35 > 0) {
          ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
          const textDiff = `Δ=${diff.toFixed(2)}`;
          const textDiffWidth = ctx.measureText(textDiff).width;
          ctx.fillRect((ax + bx)/2 - textDiffWidth/2 - 4, by - 40, textDiffWidth + 8, 16);
          ctx.fillStyle = 'white';
          ctx.fillText(textDiff, (ax + bx)/2, by - 28);
        }
      }
      
      ctx.restore();
    }

    // Add legend with background
    ctx.save();
    ctx.font = '12px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    
    const legendY = 25;
    const legendX = 15;
    
    // Background for legend
    ctx.fillStyle = 'rgba(11, 14, 20, 0.8)';
    ctx.fillRect(legendX - 5, legendY - 15, 250, 45);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX - 5, legendY - 15, 250, 45);
    
    // Original function
    ctx.strokeStyle = '#06B6D4';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(legendX, legendY);
    ctx.lineTo(legendX + 20, legendY);
    ctx.stroke();
    ctx.fillStyle = 'white';
    ctx.fillText(`f(x) = ${originalExpr}`, legendX + 25, legendY + 4);
    
    // Antiderivative
    if (showAntiderivative) {
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(legendX, legendY + 20);
      ctx.lineTo(legendX + 20, legendY + 20);
      ctx.stroke();
      ctx.fillStyle = 'white';
      ctx.fillText(`F(x) = ${cleanAntideriv}`, legendX + 25, legendY + 24);
    }
    
    ctx.restore();
  } catch (error) {
    // Silently fail if antiderivative visualization fails
    console.warn('Failed to draw antiderivative:', error);
  }
}
