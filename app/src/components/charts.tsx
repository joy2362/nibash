import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Polyline, G } from 'react-native-svg';
import { colors } from '../theme';
import { resolveColor } from './primitives';

export function Donut({ legend, size = 88 }: { legend: { name: string; color: string; pct: number }[]; size?: number }) {
  const r = size / 2 - 8;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  let offsetAcc = 0;
  const segs = legend.length
    ? legend
    : [{ name: 'None', color: 'neutral800', pct: 100 }];
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={c} cy={c} r={r} stroke={colors.neutral800} strokeWidth={16} fill="none" />
      {segs.map((seg, i) => {
        const len = (seg.pct / 100) * circumference;
        const dasharray = `${len} ${circumference - len}`;
        const dashoffset = -offsetAcc;
        offsetAcc += len;
        return (
          <Circle
            key={i}
            cx={c}
            cy={c}
            r={r}
            stroke={resolveColor(seg.color)}
            strokeWidth={16}
            fill="none"
            strokeDasharray={dasharray}
            strokeDashoffset={dashoffset}
            transform={`rotate(-90 ${c} ${c})`}
          />
        );
      })}
    </Svg>
  );
}

export function Sparkline({ values, width = 280, height = 90 }: { values: number[]; width?: number; height?: number }) {
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => [i * (width / (values.length - 1)), height * 0.95 - (v / max) * (height * 0.8)]);
  const line = pts.map((p) => p.join(',')).join(' ');
  const area = `M0,${height} L${pts.map((p) => p.join(',')).join(' L')} L${width},${height} Z`;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <Path d={area} fill={colors.accent800} opacity={0.5} />
      <Polyline points={line} fill="none" stroke={colors.accent} strokeWidth={2} />
    </Svg>
  );
}

export function BarChart({ bars, height = 90 }: { bars: { h: number; label: string }[]; height?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, height }}>
      {bars.map((b, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
          <View style={{ width: '100%', height: `${Math.max(2, b.h)}%`, backgroundColor: colors.accent500, borderRadius: 3 }} />
        </View>
      ))}
    </View>
  );
}
