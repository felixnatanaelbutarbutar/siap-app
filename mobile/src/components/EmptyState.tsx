import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface EmptyStateProps {
  title: string;
  message: string;
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.graphicBox}>
        <Text style={styles.graphicText}>?</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  graphicBox: {
    width: 80,
    height: 80,
    borderWidth: 4,
    borderColor: '#404040',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  graphicText: {
    fontFamily: 'Outfit-Black',
    fontSize: 48,
    color: '#404040',
  },
  title: {
    fontFamily: 'Outfit-Black',
    fontSize: 20,
    color: '#161d16',
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  message: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: '#3d4a3d',
    textAlign: 'center',
  },
});
