import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

export interface DonutSegment {
  value: number;
  color: string;
}

interface Props {
  segments: DonutSegment[];
  /** Outer diameter in px. */
  size?: number;
  /** Ring thickness in px. */
  strokeWidth?: number;
  /** Color of the empty track behind the segments. */
  trackColor?: string;
  /** Surface gap between adjacent segments, in px of arc length. */
  gap?: number;
  /** Centered overlay content (e.g. the total figure). */
  children?: ReactNode;
}

/**
 * A donut/ring chart drawn with react-native-svg (works on web + native). Each
 * segment is a dashed arc of the same circle; a small `gap` of arc is left
 * between segments so adjacent colors read as distinct (dataviz mark spec).
 * Rotated -90° so the ring fills clockwise from the top.
 */
export function DonutChart({
  segments,
  size = 260,
  strokeWidth = 26,
  trackColor = "#e1e3e4",
  gap = 2,
  children,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);

  let start = 0;
  const arcs = total > 0
    ? segments.map((seg, i) => {
        const value = Math.max(0, seg.value);
        if (value <= 0) return null;
        const arc = (value / total) * circumference;
        // Leave a gap at the segment's trailing edge (but never a negative dash).
        const dash = Math.max(0.0001, arc - gap);
        const offset = -start;
        start += arc;
        return (
          <Circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={[dash, circumference - dash]}
            strokeDashoffset={offset}
            strokeLinecap="butt"
          />
        );
      })
    : null;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
          {arcs}
        </G>
      </Svg>
      {children != null && (
        <View style={StyleSheet.absoluteFill} className="items-center justify-center">
          {children}
        </View>
      )}
    </View>
  );
}
