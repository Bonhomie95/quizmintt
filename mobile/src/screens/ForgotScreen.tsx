import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from '../api/axios';
import LottieView from 'lottie-react-native';
import SuccessAnim from '../assets/lottie/check.json';
import * as Animatable from 'react-native-animatable';

export default function ForgotPinScreen() {
  const [backup, setBackup] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    Keyboard.dismiss();
    if (newPin !== confirm) {
      setErrorMsg('❌ PINs do not match');
      return;
    }
    try {
      setLoading(true);
      const { data } = await axios.post('/auth/forgot-pin', {
        backupPhrase: backup,
        newPin,
      });
      setSuccess(true);
      Alert.alert('✅ Success', data.message || 'PIN reset successful');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Invalid backup code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🔐 Reset Your PIN</Text>
      <Text style={styles.desc}>
        Enter your 24-word backup code and new PIN
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Enter your backup phrase"
        value={backup}
        onChangeText={setBackup}
        multiline
        numberOfLines={4}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="New 6-digit PIN"
        value={newPin}
        onChangeText={setNewPin}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
      />

      <TextInput
        style={styles.input}
        placeholder="Confirm new PIN"
        value={confirm}
        onChangeText={setConfirm}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
      />

      {errorMsg ? (
        <Animatable.Text animation="shake" style={styles.error}>
          {errorMsg}
        </Animatable.Text>
      ) : null}

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={submit}
        disabled={loading}
      >
        <Text style={styles.buttonText}>🔄 Reset PIN</Text>
      </TouchableOpacity>

      {success && (
        <LottieView
          source={SuccessAnim}
          autoPlay
          loop={false}
          style={styles.successAnim}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f9fafb' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 10 },
  desc: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#4f46e5',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#dc2626', textAlign: 'center', marginBottom: 10 },
  successAnim: { width: 100, height: 100, alignSelf: 'center', marginTop: 20 },
});
