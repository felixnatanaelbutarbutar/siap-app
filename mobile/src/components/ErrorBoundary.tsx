import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>🚨 TERJADI KESALAHAN</Text>
          <Text style={styles.message}>
            Aplikasi mengalami gangguan tidak terduga. Silakan mulai ulang atau lapor ke Admin.
          </Text>
          <Text style={styles.errorText}>{this.state.error?.message}</Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>COBA LAGI</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#ef4444',
    fontSize: 24,
    fontFamily: 'Outfit-Black',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.8,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 32,
    backgroundColor: 'rgba(239,68,68,0.1)',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  button: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  buttonText: {
    color: '#111111',
    fontFamily: 'Outfit-Black',
    fontSize: 16,
  },
});
