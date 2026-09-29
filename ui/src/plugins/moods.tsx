'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, 
  AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { groupBy, countBy, mean } from 'lodash';
import { EMOTIONS, MoodColor } from '@/lib/moodUtils';

interface MoodEntry {
  id: string;
  date: string;
  mood: string;
  description: string;
  energy: 'high' | 'low';
  pleasant: boolean;
  color: MoodColor;
  content: string;
  transcript?: string;
  intensity?: number;
}

interface MoodsPluginProps {
  files: {
    name: string;
    path: string;
    content?: string;
    transcript?: string;
  }[];
}

interface RadarDataPoint {
  emotion: string;
  count: number;
  category: string;
}

interface TimelineDataPoint {
  date: string;
  entries: MoodEntry[];
  intensity: number;
  red: number;
  yellow: number;
  green: number;
  blue: number;
}

// Color utility functions
const MOOD_COLORS = {
  red: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
    dot: 'bg-red-500 dark:bg-red-400',
    hover: 'hover:bg-red-100 dark:hover:bg-red-900/30',
    button: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800',
    hex: {
      fill: '#EF4444',    // red-500
      stroke: '#DC2626',  // red-600
      text: '#DC2626'     // red-600
    }
  },
  yellow: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500 dark:bg-amber-400',
    hover: 'hover:bg-amber-100 dark:hover:bg-amber-900/30',
    button: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800',
    hex: {
      fill: '#F59E0B',    // amber-500
      stroke: '#D97706',  // amber-600
      text: '#D97706'     // amber-600
    }
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500 dark:bg-blue-400',
    hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/30',
    button: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800',
    hex: {
      fill: '#3B82F6',    // blue-500
      stroke: '#2563EB',  // blue-600
      text: '#2563EB'     // blue-600
    }
  },
  green: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
    hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/30',
    button: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800',
    hex: {
      fill: '#10B981',    // emerald-500
      stroke: '#059669',  // emerald-600
      text: '#059669'     // emerald-600
    }
  }
} as const;

const getMoodColor = (color: string) => {
  return MOOD_COLORS[color as keyof typeof MOOD_COLORS] || MOOD_COLORS.blue;
};

const EmotionalText: React.FC<{ text: string }> = ({ text }) => {
  const parts: { text: string; color?: MoodColor }[] = [];
  let currentIndex = 0;

  // Create a map of all emotions with their colors
  const emotionMap = Object.entries(EMOTIONS).reduce((acc, [color, category]) => {
    Object.keys(category.emotions).forEach(emotion => {
      acc[emotion.toLowerCase()] = color as MoodColor;
    });
    return acc;
  }, {} as Record<string, MoodColor>);

  // Sort emotions by length (longest first)
  const sortedEmotions = Object.keys(emotionMap).sort((a, b) => b.length - a.length);

  // Find all emotion matches
  const matches: { start: number; end: number; color: MoodColor; text: string }[] = [];
  sortedEmotions.forEach(emotion => {
    const regex = new RegExp(`\\b${emotion}\\b`, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        color: emotionMap[emotion.toLowerCase()],
        text: match[0]
      });
    }
  });

  // Sort matches by start position
  matches.sort((a, b) => a.start - b.start);

  // Build parts array
  matches.forEach(match => {
    if (match.start > currentIndex) {
      parts.push({ text: text.slice(currentIndex, match.start) });
    }
    parts.push({ text: match.text, color: match.color });
    currentIndex = match.end;
  });

  if (currentIndex < text.length) {
    parts.push({ text: text.slice(currentIndex) });
  }

  return (
    <>
      {parts.map((part, i) => {
        if (part.color) {
          const colorClasses = getMoodColor(part.color);
          return (
            <span key={i} className={`${colorClasses.text} font-medium`}>
              {part.text}
            </span>
          );
        }
        return part.text;
      })}
    </>
  );
};

// Add proper types for the formatter functions
type TooltipFormatter = (value: number, name: string, props: { payload?: { category: string; emotion: string } }) => [React.ReactElement, React.ReactElement];
type LabelFormatter = (label: string) => string;

const extractTopEmotions = (content: string, topN: number = 3): { topEmotion: string; allEmotions: string } => {
  const emotionCounts: Record<string, number> = {};
  const lowerContent = content.toLowerCase();

  Object.entries(EMOTIONS).forEach(([, category]) => {
    Object.keys(category.emotions).forEach(emotion => {
      const regex = new RegExp(`\\b${emotion.toLowerCase()}\\b`, 'gi');
      const matches = (lowerContent.match(regex) || []).length;
      if (matches > 0) {
        emotionCounts[emotion] = matches;
      }
    });
  });

  const sortedEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1]);

  return {
    topEmotion: sortedEmotions[0]?.[0] || '',
    allEmotions: sortedEmotions
      .slice(0, topN)
      .map(([emotion]) => emotion)
      .join(', ')
  };
};

const MoodsPlugin: React.FC<MoodsPluginProps> = ({ files }) => {
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<MoodEntry | null>(null);
  const [filter, setFilter] = useState<MoodColor | 'all'>('all');
  const [timeRange] = useState<{ start: Date; end: Date }>(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return { start: sevenDaysAgo, end: now };
  });

  // Process data for timeline
  const timelineData = useMemo<TimelineDataPoint[]>(() => {
    const groupedByDate = groupBy(moodEntries, (entry: MoodEntry) => 
      new Date(entry.date).toISOString().split('T')[0]
    );

    return Object.entries(groupedByDate).map(([date, entries]) => {
      const typedEntries = entries as MoodEntry[];
      const colorCounts = countBy(typedEntries, 'color');
      const avgIntensity = mean(typedEntries.map(e => e.intensity || 0));
      
      return {
        date,
        entries: typedEntries,
        intensity: avgIntensity || 0,
        red: colorCounts.red || 0,
        yellow: colorCounts.yellow || 0,
        green: colorCounts.green || 0,
        blue: colorCounts.blue || 0
      };
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [moodEntries]);

  // Process radar data
  const radarData = useMemo<RadarDataPoint[]>(() => {
    const emotionTotals: Record<string, number> = {};
    moodEntries
      .filter(entry => new Date(entry.date) >= timeRange.start)
      .forEach(entry => {
        const lowerContent = entry.content.toLowerCase();
        Object.entries(EMOTIONS).forEach(([, category]) => {
          Object.entries(category.emotions).forEach(([emotion]) => {
            const regex = new RegExp(`\\b${emotion}\\b`, 'gi');
            const matches = (lowerContent.match(regex) || []).length;
            if (matches > 0) {
              emotionTotals[emotion] = (emotionTotals[emotion] || 0) + matches;
            }
          });
        });
      });

    return Object.entries(emotionTotals)
      .map(([emotion, count]) => ({
        emotion,
        count,
        category: Object.entries(EMOTIONS).find(([, category]) => 
          Object.keys(category.emotions).includes(emotion)
        )?.[0] || ''
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [moodEntries, timeRange.start]);

  // Fix tooltip formatter types
  const tooltipFormatter: TooltipFormatter = (value, name, props) => {
    const color = props.payload?.category;
    const colorClass = color === 'red' ? 'text-red-400' :
                      color === 'yellow' ? 'text-amber-400' :
                      color === 'green' ? 'text-emerald-400' :
                      'text-blue-400';
    return [
      <span key="value" className={colorClass}>{`Count: ${value}`}</span>,
      <span key="name" className={colorClass}>{props.payload?.emotion}</span>
    ];
  };

  const timelineTooltipFormatter = (value: number, name: string) => {
    const color = name.toLowerCase();
    return [
      <span key="value" className={getMoodColor(color).text}>{`Count: ${value}`}</span>,
      <span key="name" className={getMoodColor(color).text}>{name}</span>
    ];
  };

  const labelFormatter: LabelFormatter = (date) => new Date(date).toLocaleDateString();

  useEffect(() => {
    // Process mood files
    const entries: MoodEntry[] = [];
    
    console.log('Processing files with transcripts:', files.map(f => ({
      name: f.name,
      hasTranscript: !!f.transcript,
      transcriptLength: f.transcript?.length
    })));
    
    files.forEach(file => {
      if (!file.content) return;
      
      const content = file.content;
      const fileName = file.name;
      
      console.log('Processing file:', { fileName, hasTranscript: !!file.transcript });
      
      // Extract date from filename (format: YYYYMMDD_HHMMSS.txt)
      const dateMatch = fileName.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
      if (!dateMatch) return;
      
      const [, year, month, day, hour, minute, second] = dateMatch;
      const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);

      // Analyze content to determine mood category
      const lowerContent = content.toLowerCase();
      
      // Track emotion matches by category
      const emotionMatches = {
        yellow: 0, // high energy pleasant
        green: 0,  // low energy pleasant
        red: 0,    // high energy unpleasant
        blue: 0    // low energy unpleasant
      };
      
      let dominantEmotion = '';
      let maxMatches = 0;
      
      // Count matches for each emotion category
      Object.entries(EMOTIONS).forEach(([categoryColor, category]) => {
        Object.keys(category.emotions).forEach(emotion => {
          const regex = new RegExp(`\\b${emotion}\\b`, 'gi');
          const matches = (lowerContent.match(regex) || []).length;
          emotionMatches[categoryColor as MoodColor] += matches;
          
          // Track the most frequently mentioned individual emotion
          if (matches > 0 && matches > maxMatches) {
            maxMatches = matches;
            dominantEmotion = emotion;
          }
        });
      });

      // Determine overall pleasantness and energy level
      const pleasantCount = emotionMatches.yellow + emotionMatches.green;
      const unpleasantCount = emotionMatches.red + emotionMatches.blue;
      const highEnergyCount = emotionMatches.yellow + emotionMatches.red;
      const lowEnergyCount = emotionMatches.green + emotionMatches.blue;
      
      const isPleasant = pleasantCount > unpleasantCount;
      const isHighEnergy = highEnergyCount > lowEnergyCount;
      
      // Determine color based on the quadrant with most matches
      let color: MoodColor;
      if (isPleasant && isHighEnergy) color = 'yellow';
      else if (isPleasant && !isHighEnergy) color = 'green';
      else if (!isPleasant && isHighEnergy) color = 'red';
      else color = 'blue';
      
      entries.push({
        id: fileName,
        date: date.toISOString(),
        mood: dominantEmotion || 'Unknown',
        description: content.split('\n')[0]?.trim() || 'No description',
        energy: isHighEnergy ? 'high' : 'low',
        pleasant: isPleasant,
        color,
        content,
        transcript: file.transcript
      });
    });
    
    // Sort by date (newest first)
    entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setMoodEntries(entries);
  }, [files]);

  useEffect(() => {
    if (selectedEntry) {
      console.log('Selected entry details:', {
        id: selectedEntry.id,
        hasTranscript: !!selectedEntry.transcript,
        transcript: selectedEntry.transcript
      });
    }
  }, [selectedEntry]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    const timeFormat = { hour: 'numeric', minute: 'numeric' } as const;
    
    if (isToday) {
      return date.toLocaleTimeString('en-US', timeFormat);
    }
    
    if (isYesterday) {
      return `Yesterday ${date.toLocaleTimeString('en-US', timeFormat)}`;
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  const filteredEntries = filter === 'all' 
    ? moodEntries 
    : moodEntries.filter(entry => entry.color === filter);

  const renderContent = (content: string, isMarkdown: boolean = true) => {
    // Replace mood color words at the start with Pleasant/Unpleasant
    let processedContent = content.replace(/^(Blue|Red|Yellow|Green)/, 
      selectedEntry?.pleasant ? 'Pleasant' : 'Unpleasant'
    );

    // Filter out empty lines starting with ":" and "None present" lines
    processedContent = processedContent
      .split('\n')
      .filter(line => {
        const trimmedLine = line.trim();
        return !(
          trimmedLine === ':' || 
          trimmedLine.startsWith(': None present in this transcript') ||
          trimmedLine.match(/^:\s*$/)
        );
      })
      .join('\n');

    if (!isMarkdown) {
      // For non-markdown content, just highlight emotions
      return (
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
          <EmotionalText text={processedContent} />
        </div>
      );
    }

    // For markdown content, use ReactMarkdown with our custom components
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown
          components={{
            p: ({children}) => {
              const text = React.Children.toArray(children)
                .map(child => (typeof child === 'string' ? child : ''))
                .join('');
              return (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  <EmotionalText text={text} />
                </div>
              );
            },
            ul: ({children}) => (
              <div className="list-disc list-inside mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                {children}
              </div>
            ),
            ol: ({children}) => (
              <div className="list-decimal list-inside mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                {children}
              </div>
            ),
            li: ({children}) => {
              const text = React.Children.toArray(children)
                .map(child => (typeof child === 'string' ? child : ''))
                .join('');
              return (
                <div className="mt-1">
                  <EmotionalText text={text} />
                </div>
              );
            }
          }}
        >
          {processedContent}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Timeline Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={timelineData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 10 }}
                >
                  <defs>
                    {Object.keys(MOOD_COLORS).map((color) => (
                      <linearGradient key={color} id={`color${color}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={getMoodColor(color).hex.fill} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={getMoodColor(color).hex.fill} stopOpacity={0}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.15} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6B7280"
                    fontSize={10}
                    tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    tickMargin={8}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="#6B7280"
                    fontSize={10}
                    tickFormatter={(value: number) => Math.round(value).toString()}
                    tickMargin={8}
                    axisLine={false}
                    tickLine={false}
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '12px',
                      color: '#F3F4F6'
                    }}
                    formatter={timelineTooltipFormatter}
                    labelFormatter={labelFormatter}
                  />
                  {Object.keys(MOOD_COLORS).map((color) => (
                    <Area
                      key={color}
                      type="monotone"
                      dataKey={color}
                      name={color.charAt(0).toUpperCase() + color.slice(1)}
                      stroke={getMoodColor(color).hex.stroke}
                      fillOpacity={1}
                      fill={`url(#color${color})`}
                      stackId="1"
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Radar Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="90%" data={radarData}>
                  <PolarGrid stroke="#374151" strokeOpacity={0.15} strokeDasharray="3 3" />
                  <PolarAngleAxis 
                    dataKey="emotion"
                    tick={(props) => {
                      const { x, y, payload, cx = 0 } = props;
                      const matchingEmotion = radarData.find(d => d.emotion === payload.value);
                      const color = matchingEmotion?.category ? getMoodColor(matchingEmotion.category).hex.text : '#6B7280';
                      return (
                        <text
                          x={x}
                          y={y}
                          textAnchor={x > cx ? 'start' : 'end'}
                          fill={color}
                          fontSize={10}
                          fillOpacity={0.85}
                          dy={1}
                        >
                          {payload.value}
                        </text>
                      );
                    }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 'auto']}
                    tick={{ 
                      fill: '#6B7280',
                      fontSize: 8,
                      fillOpacity: 0.7
                    }}
                    axisLine={false}
                    tickLine={false}
                    tickCount={4}
                  />
                  <Radar
                    name="Emotions"
                    dataKey="count"
                    stroke={getMoodColor(radarData[0]?.category || 'blue').hex.stroke}
                    fill={getMoodColor(radarData[0]?.category || 'blue').hex.fill}
                    fillOpacity={0.3}
                    strokeWidth={2}
                    type="monotone"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: 'none',
                      borderRadius: '0.375rem',
                      fontSize: '12px',
                      color: '#F3F4F6'
                    }}
                    formatter={tooltipFormatter}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${filter === 'all' 
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
          >
            All Moods
          </button>
          {Object.keys(MOOD_COLORS).map((color) => (
            <button
              key={color}
              onClick={() => setFilter(color as MoodColor)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${filter === color 
                  ? getMoodColor(color).button
                  : `${getMoodColor(color).bg} ${getMoodColor(color).text}`
                }`}
            >
              <span className="block leading-tight">
                {color === 'yellow' && (
                  <>
                    <span className="block">High Energy</span>
                    <span className="block">Pleasant</span>
                  </>
                )}
                {color === 'green' && (
                  <>
                    <span className="block">Low Energy</span>
                    <span className="block">Pleasant</span>
                  </>
                )}
                {color === 'blue' && (
                  <>
                    <span className="block">Low Energy</span>
                    <span className="block">Unpleasant</span>
                  </>
                )}
                {color === 'red' && (
                  <>
                    <span className="block">High Energy</span>
                    <span className="block">Unpleasant</span>
                  </>
                )}
              </span>
            </button>
          ))}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Timeline */}
        <div className="md:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow overflow-y-auto max-h-[70vh]">
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredEntries.map(entry => {
              const colorClasses = getMoodColor(entry.color);
              return (
                <div
                  key={entry.id}
                  onClick={() => setSelectedEntry(entry)}
                  className={`p-3 cursor-pointer transition-colors
                    ${colorClasses.hover} ${selectedEntry?.id === entry.id ? colorClasses.bg : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${colorClasses.dot}`} />
                      <span className={`text-sm font-medium ${colorClasses.text}`}>
                        {extractTopEmotions(entry.content).topEmotion || (entry.pleasant ? 'Pleasant' : 'Unpleasant')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatDateTime(entry.date)}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1">
                    {extractTopEmotions(entry.content).allEmotions || 'No emotions detected'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Detail view */}
        <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow">
          {selectedEntry ? (
            <div className="p-4 h-full overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${getMoodColor(selectedEntry.color).dot}`} />
                  <span className={`text-sm font-medium ${getMoodColor(selectedEntry.color).text}`}>
                    {selectedEntry.pleasant ? 'Pleasant' : 'Unpleasant'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {EMOTIONS[selectedEntry.color].emotions[selectedEntry.mood]}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {formatDateTime(selectedEntry.date)}
                </div>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
                {selectedEntry.transcript && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Full Transcript</h3>
                    {renderContent(selectedEntry.transcript, false)}
                  </div>
                )}
                <div className={selectedEntry.transcript ? "border-t dark:border-gray-700 pt-4" : ""}>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Analysis</h3>
                  {renderContent(selectedEntry.content)}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-gray-500 p-4">
              <p>Select a mood entry to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MoodsPlugin; 