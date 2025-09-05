import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Vibration,
  useColorScheme,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from '../api/axios';
import { useUser } from '../store/useUser';
import UserHeader from '../components/UserHeader';
import LottieView from 'lottie-react-native';
import CheckAnimation from '../assets/lottie/check.json';
import * as Animatable from 'react-native-animatable';
import { useNavigation } from '@react-navigation/native';
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from 'react-native-confirmation-code-field';

const CELL_COUNT = 6;

export default function SetPinScreen() {
  const { user, setUser } = useUser();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [msg, setMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const confirmShakeRef = useRef(null);
  const navigation = useNavigation();

  const refNew = useBlurOnFulfill({ value: newPin, cellCount: CELL_COUNT });
  const [propsNew, getNewPinLayoutHandler] = useClearByFocusCell({
    value: newPin,
    setValue: setNewPin,
  });

  const refConfirm = useBlurOnFulfill({
    value: confirmPin,
    cellCount: CELL_COUNT,
  });
  const [propsConfirm, getConfirmPinLayoutHandler] = useClearByFocusCell({
    value: confirmPin,
    setValue: setConfirmPin,
  });

  const refOld = useBlurOnFulfill({ value: oldPin, cellCount: CELL_COUNT });
  const [propsOld, getOldPinLayoutHandler] = useClearByFocusCell({
    value: oldPin,
    setValue: setOldPin,
  });

  const isValid6DigitPin = (pin: string) => /^\d{6}$/.test(pin);
  const isWeakPin = (pin: string) =>
    /^(\d)\1{5}$/.test(pin) ||
    '0123456789'.includes(pin) ||
    '9876543210'.includes(pin);

  useEffect(() => {
    const checkIfUserHasPin = async () => {
      try {
        const { data } = await axios.get('/auth/has-pin');
        setHasPin(data.hasPin);
      } catch (err) {
        console.warn('❌ Failed to check PIN status');
        setHasPin(false); // fallback to false
      }
    };
    checkIfUserHasPin();
  }, []);

  const submitPin = async () => {
    if (loading) return;

    if (!isValid6DigitPin(newPin) || !isValid6DigitPin(confirmPin)) {
      Vibration.vibrate(100);
      return Alert.alert('❌ Invalid PIN', 'PIN must be exactly 6 digits');
    }

    if (newPin !== confirmPin) {
      Vibration.vibrate(200);
      //@ts-ignore
      confirmShakeRef.current?.shake(500);
      return Alert.alert('❌ PIN Mismatch', "New and confirm PIN don't match");
    }

    if (isWeakPin(newPin)) {
      Vibration.vibrate(150);
      return Alert.alert('❌ Weak PIN', 'Choose a stronger PIN');
    }

    if (hasPin && !isValid6DigitPin(oldPin)) {
      return Alert.alert('❌ Old PIN Required', 'Please enter your old PIN');
    }

    try {
      setLoading(true);
      const body = hasPin ? { pin: newPin, oldPin } : { pin: newPin };
      const { data } = await axios.post('/auth/set-pin', body);

      Vibration.vibrate(100);
      setSuccess(true);
      setMsg(data.message);
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
      setAttempts(0);
      setUser({ ...user!, hasPin: true });
    } catch (err: any) {
      Vibration.vibrate(250);
      const errorMsg = err.response?.data?.message || 'Failed to update PIN';
      setMsg(errorMsg);
      setSuccess(false);
      setAttempts((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const renderCodeInput = (
    value: string,
    setValue: any,
    ref: any,
    props: any,
    getLayout: any,
    label: string
  ) => (
    <>
      <Text style={[styles.label, isDark && { color: '#ddd' }]}>{label}</Text>
      <CodeField
        ref={ref}
        {...props}
        value={value}
        onChangeText={setValue}
        cellCount={CELL_COUNT}
        rootStyle={styles.codeFieldRoot}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        renderCell={({ index, symbol, isFocused }: any) => (
          <Text
            key={index}
            style={[
              styles.cell,
              isFocused && styles.focusCell,
              isDark && { borderColor: '#999', color: '#eee' },
            ]}
            onLayout={getLayout(index)}
          >
            {symbol || (isFocused ? <Cursor /> : null)}
          </Text>
        )}
      />
    </>
  );

  if (hasPin === null)
    return <ActivityIndicator size="large" style={{ marginTop: 50 }} />;

  return (
    <SafeAreaView
      style={{
        flex: 1,
        padding: 20,
        backgroundColor: isDark ? '#111827' : '#f9fafb',
      }}
    >
      <UserHeader />
      <Text style={[styles.header, isDark && { color: '#eee' }]}>
        {hasPin ? '🔐 Update Wallet PIN' : '🔐 Set Wallet PIN'}
      </Text>

      {hasPin &&
        renderCodeInput(
          oldPin,
          setOldPin,
          refOld,
          propsOld,
          getOldPinLayoutHandler,
          'Old PIN'
        )}
      {renderCodeInput(
        newPin,
        setNewPin,
        refNew,
        propsNew,
        getNewPinLayoutHandler,
        'New PIN'
      )}
      <Animatable.View ref={confirmShakeRef}>
        {renderCodeInput(
          confirmPin,
          setConfirmPin,
          refConfirm,
          propsConfirm,
          getConfirmPinLayoutHandler,
          'Confirm New PIN'
        )}
      </Animatable.View>

      <View style={{ marginTop: 20 }}>
        {loading ? (
          <ActivityIndicator size="large" color="#4f46e5" />
        ) : (
          <Animatable.View animation="fadeInUp">
            <Text
              style={[
                styles.submitBtn,
                { backgroundColor: attempts >= 5 ? '#aaa' : '#4f46e5' },
              ]}
              onPress={submitPin}
            >
              {hasPin ? 'Update PIN' : 'Set PIN'}
            </Text>
            {hasPin && (
              <TouchableOpacity
                onPress={() => navigation.navigate('ForgotPin' as never)}
              >
                <Text style={{ color: '#4f46e5', marginTop: 6 }}>
                  ❓ Forgot PIN?
                </Text>
              </TouchableOpacity>
            )}
          </Animatable.View>
        )}
      </View>

      {msg ? (
        <Animatable.Text
          animation={success ? 'bounceIn' : 'shake'}
          style={[styles.message, { color: success ? '#16a34a' : '#dc2626' }]}
        >
          {msg}
        </Animatable.Text>
      ) : null}

      {success && (
        <LottieView
          source={CheckAnimation}
          autoPlay
          loop={false}
          style={{
            width: 100,
            height: 100,
            alignSelf: 'center',
            marginTop: 10,
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 20,
    fontWeight: '700',
    marginVertical: 16,
  },
  label: {
    fontSize: 14,
    marginTop: 14,
    marginBottom: 6,
  },
  codeFieldRoot: {
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  cell: {
    width: 40,
    height: 50,
    lineHeight: 48,
    fontSize: 22,
    borderWidth: 1,
    borderColor: '#ccc',
    textAlign: 'center',
    borderRadius: 8,
    color: '#1f2937',
  },
  focusCell: {
    borderColor: '#4f46e5',
  },
  submitBtn: {
    paddingVertical: 14,
    textAlign: 'center',
    borderRadius: 8,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
});
