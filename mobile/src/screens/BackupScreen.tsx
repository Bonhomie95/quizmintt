import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  TouchableOpacity,
  Vibration,
  ActivityIndicator,
  Keyboard,
  StyleSheet,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '../store/useUser';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import * as ClipboardAPI from 'expo-clipboard';
import axios from '../api/axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import Checkmark from '../assets/lottie/check.json';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import ConfettiCannon from 'react-native-confetti-cannon';

export default function BackupScreen() {
  const isFocused = useIsFocused();
  const [mnemonic, setMnemonic] = useState('');
  const [hasBackup, setHasBackup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showRestoreInput, setShowRestoreInput] = useState(false);
  const [restoreInput, setRestoreInput] = useState('');
  const [restoreMsg, setRestoreMsg] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const { setUser, logout } = useUser(); // ✅ Zustand state update

  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const checkBackupStatus = async () => {
    try {
      const { data } = await axios.get('/auth/me');
      setHasBackup(!!data.backupMnemonicHash);
    } catch {
      Alert.alert('Error', 'Could not check backup status');
    } finally {
      setLoading(false);
    }
  };

  const generateBackup = async () => {
    try {
      const res = await axios.post('/auth/generate-backup');
      setMnemonic(res.data.mnemonic);
      setHasBackup(true);
      Vibration.vibrate(100);
    } catch (err: any) {
      Alert.alert(
        'Error',
        err.response?.data?.message || 'Failed to generate backup'
      );
    }
  };

  const copyToClipboard = async () => {
    await ClipboardAPI.setStringAsync(mnemonic);
    Vibration.vibrate(80);
    Alert.alert('✅ Copied', 'Backup phrase copied to clipboard');
  };

  const handleRestore = async () => {
    Keyboard.dismiss();
    if (!hasBackup) {
      return setRestoreMsg('❌ You must generate a backup first.');
    }

    if (!restoreInput.trim()) {
      return setRestoreMsg('⚠️ Please enter your 24-word phrase');
    }

    try {
      const { data } = await axios.post('/auth/restore', {
        mnemonic: restoreInput,
      });

      await AsyncStorage.clear();
      logout();
      setUser(data.user);

      setRestoreMsg(`✅ Restored as ${data.user.username}`);
      setShowSuccess(true);
      Vibration.vibrate(150);

      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' as keyof RootStackParamList }],
        });
      }, 2000);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Restore failed';
      setRestoreMsg(`❌ ${msg}`);
      Vibration.vibrate([100, 80, 100]);
    }
  };

  useEffect(() => {
    if (isFocused) {
      checkBackupStatus();
      setMnemonic('');
      setRestoreInput('');
      setShowRestoreInput(false);
      setRestoreMsg('');
      setShowSuccess(false);
    }
  }, [isFocused]);

  return (
    <SafeAreaView style={{ padding: 20 }}>
      <Text style={styles.header}>
        🔐 Secure Your Account with a 24-Word Phrase
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#4f46e5" />
      ) : (
        <>
          {!hasBackup ? (
            <TouchableOpacity style={styles.btn} onPress={generateBackup}>
              <Ionicons name="key-outline" size={20} color="#fff" />
              <Text style={styles.btnText}>Generate Backup Phrase</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.header}>
              You already have a backup phrase, try restore
            </Text>
          )}

          {mnemonic && (
            <View style={styles.backupContainer}>
              <Text selectable style={styles.mnemonic}>
                {mnemonic}
              </Text>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={copyToClipboard}
              >
                <Ionicons name="copy-outline" size={18} color="#fff" />
                <Text style={styles.copyText}>Copy Phrase</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, { marginTop: 20, backgroundColor: '#059669' }]}
            onPress={() => setShowRestoreInput(true)}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.btnText}>Restore from Backup</Text>
          </TouchableOpacity>

          {showRestoreInput && (
            <View style={{ marginTop: 20 }}>
              <TextInput
                placeholder="Enter your 24-word phrase"
                multiline
                numberOfLines={3}
                value={restoreInput}
                onChangeText={setRestoreInput}
                style={styles.input}
              />
              <Button title="Restore Now" onPress={handleRestore} />
              {restoreMsg !== '' && (
                <Text
                  style={{
                    color: restoreMsg.includes('✅') ? 'green' : 'red',
                    marginTop: 10,
                    textAlign: 'center',
                  }}
                >
                  {restoreMsg}
                </Text>
              )}
              {showSuccess && (
                <LottieView
                  source={Checkmark}
                  autoPlay
                  loop={false}
                  style={{ width: 100, height: 100, alignSelf: 'center' }}
                />
              )}
              {showSuccess && (
                <ConfettiCannon
                  count={70}
                  origin={{ x: 200, y: -10 }}
                  fadeOut
                />
              )}
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  btn: {
    flexDirection: 'row',
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  backupContainer: {
    marginTop: 20,
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 10,
  },
  mnemonic: {
    fontStyle: 'italic',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
    color: '#1f2937',
  },
  copyBtn: {
    backgroundColor: '#4f46e5',
    flexDirection: 'row',
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  copyText: {
    color: '#fff',
    marginLeft: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    textAlignVertical: 'top',
  },
});
