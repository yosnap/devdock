// Colored pill showing a project's health score
// green >= 80, yellow >= 50, red < 50

import { View, Text, StyleSheet } from 'react-native';

interface Props {
  score: number;
}

function getColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 50) return '#eab308';
  return '#ef4444';
}

export function HealthScoreBadge({ score }: Props) {
  const color = getColor(score);
  return (
    <View style={[styles.pill, { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{score}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '600' },
});
