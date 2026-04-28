import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Video, FileText, CheckCircle, Lock, ChevronRight, ChevronDown } from 'lucide-react';
import GlassPanel from './GlassPanel';
import VideoPlayer from './VideoPlayer';

interface TheoryContent {
  id: string;
  title: string;
  type: 'video' | 'text' | 'interactive';
  duration?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  locked?: boolean;
  completed?: boolean;
  content?: any;
}

interface TheorySectionProps {
  moduleId: string;
  title: string;
  description: string;
  lessons: TheoryContent[];
  color: string;
  onLessonComplete?: (lessonId: string) => void;
  onProgress?: (progress: number) => void;
}

export default function TheorySection({ 
  moduleId, 
  title, 
  description, 
  lessons, 
  color,
  onLessonComplete,
  onProgress 
}: TheorySectionProps) {
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());

  const handleLessonComplete = (lessonId: string) => {
    setCompletedLessons(prev => new Set([...prev, lessonId]));
    onLessonComplete?.(lessonId);
    
    const progress = (completedLessons.size + 1) / lessons.length * 100;
    onProgress?.(progress);
  };

  const toggleLesson = (lessonId: string) => {
    setExpandedLesson(expandedLesson === lessonId ? null : lessonId);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return '#10B981';
      case 'intermediate': return '#F59E0B';
      case 'advanced': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const totalProgress = (completedLessons.size / lessons.length) * 100;

  return (
    <div className="flex-1 overflow-y-auto pr-2">
      {/* Header */}
      <div className="mb-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-6 mb-4"
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{description}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color }}>
                {Math.round(totalProgress)}%
              </div>
              <div className="text-xs text-[var(--text-muted)]">Complete</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-black/30 rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ 
                width: `${totalProgress}%`,
                backgroundColor: color 
              }}
              initial={{ width: 0 }}
              animate={{ width: `${totalProgress}%` }}
            />
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="glass rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-white">{lessons.length}</div>
            <div className="text-xs text-[var(--text-muted)]">Total Lessons</div>
          </div>
          <div className="glass rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-[#10B981]">{completedLessons.size}</div>
            <div className="text-xs text-[var(--text-muted)]">Completed</div>
          </div>
          <div className="glass rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-[#F59E0B]">{lessons.length - completedLessons.size}</div>
            <div className="text-xs text-[var(--text-muted)]">Remaining</div>
          </div>
        </div>
      </div>

      {/* Lessons List */}
      <div className="space-y-4">
        {lessons.map((lesson, index) => {
          const isExpanded = expandedLesson === lesson.id;
          const isCompleted = completedLessons.has(lesson.id);
          const isLocked = lesson.locked && !isCompleted && index > 0 && !completedLessons.has(lessons[index - 1].id);

          return (
            <motion.div
              key={lesson.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div
                className={`glass rounded-xl overflow-hidden transition-all duration-300 ${
                  isLocked ? 'opacity-60' : 'hover:shadow-lg'
                }`}
              >
                {/* Lesson Header */}
                <button
                  onClick={() => !isLocked && toggleLesson(lesson.id)}
                  disabled={isLocked}
                  className={`w-full p-4 text-left transition-colors ${
                    isLocked ? 'cursor-not-allowed' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isCompleted ? 'bg-[#10B981]/20' : 'bg-white/10'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5 text-[#10B981]" />
                        ) : isLocked ? (
                          <Lock className="w-5 h-5 text-[var(--text-muted)]" />
                        ) : lesson.type === 'video' ? (
                          <Video className="w-5 h-5" style={{ color }} />
                        ) : lesson.type === 'interactive' ? (
                          <BookOpen className="w-5 h-5" style={{ color }} />
                        ) : (
                          <FileText className="w-5 h-5" style={{ color }} />
                        )}
                      </div>

                      {/* Title and Meta */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white">{lesson.title}</h3>
                          <span 
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{ 
                              backgroundColor: `${getDifficultyColor(lesson.difficulty)}20`,
                              color: getDifficultyColor(lesson.difficulty)
                            }}
                          >
                            {lesson.difficulty}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                          {lesson.duration && (
                            <span className="flex items-center gap-1">
                              <Video className="w-3 h-3" />
                              {lesson.duration}
                            </span>
                          )}
                          <span>{lesson.type}</span>
                        </div>
                      </div>
                    </div>

                    {/* Expand/Collapse Icon */}
                    <div className="flex items-center gap-2">
                      {isCompleted && (
                        <span className="text-xs text-[#10B981] font-medium">Completed</span>
                      )}
                      {isLocked ? (
                        <Lock className="w-4 h-4 text-[var(--text-muted)]" />
                      ) : (
                        isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                        )
                      )}
                    </div>
                  </div>
                </button>

                {/* Lesson Content */}
                <AnimatePresence>
                  {isExpanded && !isLocked && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 border-t border-[var(--border)]">
                        {renderLessonContent(lesson, color, handleLessonComplete)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function renderLessonContent(
  lesson: TheoryContent, 
  color: string, 
  onComplete: (lessonId: string) => void
) {
  switch (lesson.type) {
    case 'video':
      return (
        <VideoLessonContent lesson={lesson} color={color} onComplete={onComplete} />
      );
    case 'text':
      return (
        <TextLessonContent lesson={lesson} color={color} onComplete={onComplete} />
      );
    case 'interactive':
      return (
        <InteractiveLessonContent lesson={lesson} color={color} onComplete={onComplete} />
      );
    default:
      return <div className="text-[var(--text-secondary)]">Content not available</div>;
  }
}

function VideoLessonContent({ 
  lesson, 
  color, 
  onComplete 
}: { 
  lesson: TheoryContent; 
  color: string; 
  onComplete: (lessonId: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Video Player */}
      <div className="aspect-video rounded-xl overflow-hidden">
        <VideoPlayer
          videoUrl={lesson.content?.videoUrl || ''}
          title={lesson.title}
          description={lesson.content?.description}
          poster={lesson.content?.poster}
          onComplete={() => onComplete(lesson.id)}
        />
      </div>

      {/* Video Information */}
      {lesson.content?.description && (
        <GlassPanel title="About this lesson" accentColor={color}>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {lesson.content.description}
          </p>
        </GlassPanel>
      )}

      {/* Key Points */}
      {lesson.content?.keyPoints && (
        <GlassPanel title="Key Points" accentColor={color}>
          <ul className="space-y-2">
            {lesson.content.keyPoints.map((point: string, index: number) => (
              <li key={index} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: color }} />
                {point}
              </li>
            ))}
          </ul>
        </GlassPanel>
      )}

      {/* Complete Button */}
      <button
        onClick={() => onComplete(lesson.id)}
        className="w-full py-3 rounded-lg font-medium transition-colors"
        style={{ 
          backgroundColor: `${color}20`,
          color: color,
          border: `1px solid ${color}40`
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = `${color}30`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = `${color}20`;
        }}
      >
        Mark as Complete
      </button>
    </div>
  );
}

function TextLessonContent({ 
  lesson, 
  color, 
  onComplete 
}: { 
  lesson: TheoryContent; 
  color: string; 
  onComplete: (lessonId: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Text Content */}
      <div className="prose prose-invert max-w-none">
        <div 
          className="text-[var(--text-secondary)] leading-relaxed"
          dangerouslySetInnerHTML={{ __html: lesson.content?.html || lesson.content?.text || '' }}
        />
      </div>

      {/* Formulas */}
      {lesson.content?.formulas && (
        <GlassPanel title="Important Formulas" accentColor={color}>
          <div className="space-y-3">
            {lesson.content.formulas.map((formula: any, index: number) => (
              <div key={index} className="glass rounded-lg p-3">
                <div className="text-sm font-mono text-[#06B6D4] mb-1">
                  {formula.expression}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {formula.description}
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}

      {/* Complete Button */}
      <button
        onClick={() => onComplete(lesson.id)}
        className="w-full py-3 rounded-lg font-medium transition-colors"
        style={{ 
          backgroundColor: `${color}20`,
          color: color,
          border: `1px solid ${color}40`
        }}
      >
        Mark as Complete
      </button>
    </div>
  );
}

function InteractiveLessonContent({ 
  lesson, 
  color, 
  onComplete 
}: { 
  lesson: TheoryContent; 
  color: string; 
  onComplete: (lessonId: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Interactive Component */}
      <div className="glass rounded-xl p-6">
        <div className="text-center text-[var(--text-secondary)]">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Interactive content coming soon...</p>
        </div>
      </div>

      {/* Instructions */}
      {lesson.content?.instructions && (
        <GlassPanel title="Instructions" accentColor={color}>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {lesson.content.instructions}
          </p>
        </GlassPanel>
      )}

      {/* Complete Button */}
      <button
        onClick={() => onComplete(lesson.id)}
        className="w-full py-3 rounded-lg font-medium transition-colors"
        style={{ 
          backgroundColor: `${color}20`,
          color: color,
          border: `1px solid ${color}40`
        }}
      >
        Mark as Complete
      </button>
    </div>
  );
}
