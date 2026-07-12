import { useEffect } from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface PieSlice {
  name: string;
  value: number;
  color: string;
}

interface Props {
  data: PieSlice[];
  size?: number;
  /** Ring thickness; the hole in the middle keeps the "blank white circle" look. */
  thickness?: number;
  /** Per-slice reveal stagger, ms. */
  stagger?: number;
}

/** One donut segment that fades in after `delay` ms. */
function Segment({
  cx,
  r,
  thickness,
  color,
  dash,
  gap,
  rotation,
  delay,
}: {
  cx: number;
  r: number;
  thickness: number;
  color: string;
  dash: number;
  gap: number;
  rotation: number;
  delay: number;
}) {
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 450 }));
  }, [delay, opacity]);
  const animatedProps = useAnimatedProps(() => ({ opacity: opacity.value }));

  return (
    <AnimatedCircle
      cx={cx}
      cy={cx}
      r={r}
      fill="none"
      stroke={color}
      strokeWidth={thickness}
      strokeDasharray={`${dash} ${gap}`}
      strokeLinecap="butt"
      rotation={rotation}
      origin={`${cx}, ${cx}`}
      animatedProps={animatedProps}
    />
  );
}

/**
 * Animated donut chart. Slices are sized by value and reveal sequentially,
 * mirroring the design's "segments animate into view one by one" behavior.
 * Falls back to equal slices when every value is 0 so it always renders.
 */
export function PieChart({ data, size = 240, thickness = 30, stagger = 400 }: Props) {
  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0);
  const slices =
    total > 0
      ? data.map((d) => ({ ...d, fraction: Math.max(0, d.value) / total }))
      : data.map((d) => ({ ...d, fraction: 1 / data.length }));

  const cx = size / 2;
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;

  let acc = 0;
  const segments = slices.map((s, i) => {
    const dash = s.fraction * circumference;
    // -90 so slices start at the top (12 o'clock) instead of 3 o'clock.
    const rotation = acc * 360 - 90;
    acc += s.fraction;
    return { ...s, dash, gap: circumference - dash, rotation, delay: i * stagger };
  });

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {segments.map((s) => (
          <Segment
            key={s.name}
            cx={cx}
            r={r}
            thickness={thickness}
            color={s.color}
            dash={s.dash}
            gap={s.gap}
            rotation={s.rotation}
            delay={s.delay}
          />
        ))}
      </Svg>
    </View>
  );
}
