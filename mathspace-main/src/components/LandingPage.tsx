import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { ChevronRight, Sigma, Zap, Brain } from 'lucide-react';
import type { ModuleId } from '../types';

interface Props {
  onEnter: (module?: ModuleId) => void;
}

const FLOATING_FORMULAS = [
  { text: "e^{iπ} + 1 = 0", x: 8, y: 12, size: 18, opacity: 0.35 },
  { text: "∇ × E = -∂B/∂t", x: 75, y: 8, size: 14, opacity: 0.25 },
  { text: "∫₋∞^∞ e^{-x²}dx = √π", x: 15, y: 75, size: 16, opacity: 0.3 },
  { text: "F = ma", x: 85, y: 70, size: 20, opacity: 0.2 },
  { text: "∑_{n=0}^∞ xⁿ/n! = eˣ", x: 60, y: 82, size: 13, opacity: 0.28 },
  { text: "det(A) = ad − bc", x: 5, y: 45, size: 15, opacity: 0.22 },
  { text: "c² = a² + b²", x: 78, y: 40, size: 17, opacity: 0.3 },
  { text: "i² = −1", x: 40, y: 5, size: 22, opacity: 0.28 },
  { text: "lim_{x→0} sin(x)/x = 1", x: 35, y: 90, size: 13, opacity: 0.25 },
  { text: "∂²u/∂t² = c²∇²u", x: 88, y: 22, size: 13, opacity: 0.2 },
  { text: "P(A|B) = P(B|A)P(A)/P(B)", x: 2, y: 25, size: 12, opacity: 0.22 },
  { text: "φ = (1+√5)/2", x: 52, y: 18, size: 16, opacity: 0.28 },
];

const FEATURE_CARDS = [
  { icon: Sigma, label: '8 Math Modules', desc: 'From calculus to complex numbers', color: '#3B82F6' },
  { icon: Zap, label: 'Real-Time Compute', desc: 'Powered by math.js engine', color: '#F59E0B' },
  { icon: Brain, label: 'Interactive Physics', desc: 'Drag, zoom, pan every visualization', color: '#10B981' },
];

export default function LandingPage({ onEnter }: Props) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 30, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 30, damping: 20 });
  const [revealed, setRevealed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      const cx = (e.clientX / window.innerWidth - 0.5) * 30;
      const cy = (e.clientY / window.innerHeight - 0.5) * 20;
      mouseX.set(cx);
      mouseY.set(cy);
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, [mouseX, mouseY]);

  const handleEnter = () => {
    setRevealed(true);
    setTimeout(() => onEnter(), 600);
  };

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center"
      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 40%, #0d1525 0%, #0B0E14 60%)' }}
    >
      {/* Animated radial gradient pulse */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 50% 40% at 50% 50%, rgba(59,130,246,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Floating formulas */}
      {FLOATING_FORMULAS.map((f, i) => (
        <motion.div
          key={i}
          className="absolute select-none pointer-events-none font-mono"
          style={{
            left: `${f.x}%`,
            top: `${f.y}%`,
            fontSize: f.size,
            opacity: f.opacity,
            color: '#7BB8FF',
            x: springX,
            y: springY,
            filter: 'blur(0.3px)',
          }}
          animate={{
            y: [0, -14, 6, 0],
            rotate: [0, 1, -0.5, 0],
          }}
          transition={{
            duration: 8 + i * 1.3,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.5,
          }}
        >
          {f.text}
        </motion.div>
      ))}

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Main content */}
      <motion.div
        className="relative z-10 flex flex-col items-center text-center px-6"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        {/* Logo badge */}
        <motion.div
          className="mb-6 flex items-center gap-2 px-4 py-2 rounded-full glass-bright"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="w-2 h-2 rounded-full bg-[#3B82F6] animate-pulse" />
          <span className="text-xs text-[var(--text-secondary)] font-medium tracking-widest uppercase">Interactive Math Laboratory</span>
        </motion.div>

        {/* Title */}
        <motion.h1
          className="text-7xl md:text-9xl font-bold tracking-tight mb-4 leading-none"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
        >
          <span className="text-white">Math</span>
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)' }}
          >
            Space
          </span>
        </motion.h1>

        <motion.p
          className="text-lg md:text-xl text-[var(--text-secondary)] max-w-xl mb-10 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          A high-performance computational engine for students and engineers.
          Explore calculus, linear algebra, and beyond — interactively.
        </motion.p>

        {/* CTA Button */}
        <motion.button
          onClick={handleEnter}
          className="group relative flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg text-white overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #2563EB, #0891B2)',
            boxShadow: '0 0 30px rgba(59,130,246,0.4), 0 4px 20px rgba(0,0,0,0.4)',
          }}
          whileHover={{ scale: 1.04, boxShadow: '0 0 50px rgba(59,130,246,0.6), 0 4px 30px rgba(0,0,0,0.5)' }}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <span>Start Exploring</span>
          <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)',
            }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
          />
        </motion.button>

        {/* Feature cards */}
        <motion.div
          className="flex flex-wrap justify-center gap-4 mt-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          {FEATURE_CARDS.map(({ icon: Icon, label, desc, color }) => (
            <div
              key={label}
              className="glass rounded-xl px-5 py-4 flex items-center gap-3 min-w-[200px]"
              style={{ borderColor: `${color}20` }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}20`, color }}
              >
                <Icon size={18} />
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-white">{label}</div>
                <div className="text-xs text-[var(--text-muted)]">{desc}</div>
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Circular reveal overlay */}
      {revealed && (
        <motion.div
          className="fixed inset-0 z-50 pointer-events-none"
          style={{ background: '#0B0E14' }}
          initial={{ clipPath: 'circle(0% at 50% 50%)' }}
          animate={{ clipPath: 'circle(150% at 50% 50%)' }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
        />
      )}
    </div>
  );
}
