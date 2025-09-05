import React, { useEffect, useState } from 'react';
import {
  Text,
  TextInput,
  View,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Vibration,
} from 'react-native';
import axios from '../api/axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import UserHeader from '../components/UserHeader';
import LottieView from 'lottie-react-native';
import Check from '../assets/lottie/check.json';
import Cross from '../assets/lottie/error.json';

const usdtOptions = ['TRC20', 'ERC20', 'BEP20'];

export default function WalletScreen() {
  const [wallet, setWallet] = useState('');
  const [pin, setPin] = useState('');
  const [usdtType, setUsdtType] = useState('TRC20');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'success' | 'error' | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const validateWallet = () => {
    if (usdtType === 'TRC20') return /^T[a-zA-Z0-9]{33}$/.test(wallet);
    if (usdtType === 'ERC20' || usdtType === 'BEP20')
      return /^0x[a-fA-F0-9]{40}$/.test(wallet);
    return false;
  };

  const updateWallet = async () => {
    if (!pin || pin.length !== 6) return Alert.alert('PIN must be 6 digits');
    if (!validateWallet()) return Alert.alert(`Invalid ${usdtType} address`);

    setLoading(true);
    try {
      const { data } = await axios.post('/auth/update-wallet', {
        wallet,
        pin,
        usdtType,
      });
      Vibration.vibrate(100);
      setStatus('success');
      Alert.alert('✅ Success', 'Wallet updated successfully');
    } catch (err: any) {
      console.error('Update wallet error:', err);
      Vibration.vibrate(500);
      setStatus('error');
      Alert.alert(
        '❌ Error',
        err.response?.data?.message || 'Something went wrong'
      );
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(null), 2500);
    }
  };

  const fetchWallet = async () => {
    try {
      const { data } = await axios.get('/auth/me');
      if (data.wallet) setWallet(data.wallet);
      if (data.usdtType && usdtOptions.includes(data.usdtType)) {
        setUsdtType(data.usdtType);
      }
    } catch (err) {
      console.warn('Could not load wallet info');
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, padding: 20 }}>
      <UserHeader />
      {initialLoading ? (
        <ActivityIndicator size="large" color="#4f46e5" />
      ) : (
        <>
          <Text style={styles.label}>
            Payment will be sent to wallet address saved by Saturday
          </Text>

          <Text style={styles.label}>💳 Select USDT Type</Text>
          <View style={styles.dropdown}>
            {usdtOptions.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.option,
                  usdtType === type && styles.selectedOption,
                ]}
                onPress={() => setUsdtType(type)}
              >
                <Text
                  style={
                    usdtType === type ? styles.selectedText : styles.optionText
                  }
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>📬 Wallet Address</Text>
          <TextInput
            value={wallet}
            onChangeText={setWallet}
            placeholder={`Enter ${usdtType} wallet`}
            autoCapitalize="none"
            style={styles.input}
          />

          <Text style={styles.label}>🔐 Enter PIN</Text>
          <TextInput
            value={pin}
            onChangeText={setPin}
            secureTextEntry
            keyboardType="number-pad"
            maxLength={6}
            placeholder="Enter 6-digit PIN"
            style={styles.input}
          />

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.6 }]}
            disabled={loading}
            onPress={updateWallet}
          >
            <Text style={styles.buttonText}>💾 Update Wallet</Text>
          </TouchableOpacity>

          {loading && (
            <ActivityIndicator color="#4f46e5" style={{ marginTop: 10 }} />
          )}
          {status === 'success' && (
            <LottieView
              source={Check}
              autoPlay
              loop={false}
              style={styles.anim}
            />
          )}
          {status === 'error' && (
            <LottieView
              source={Cross}
              autoPlay
              loop={false}
              style={styles.anim}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    marginTop: 20,
    marginBottom: 6,
    fontWeight: '600',
  },
  dropdown: {
    flexDirection: 'row',
    gap: 12,
  },
  option: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
  },
  selectedOption: {
    backgroundColor: '#4f46e5',
  },
  optionText: {
    color: '#1f2937',
  },
  selectedText: {
    color: '#fff',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  anim: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginTop: 16,
  },
});
