import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  Linking,
  Share,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../store/useUser';
import { useNavigation } from '@react-navigation/native';
import axios from '../api/axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StreakPreviewModal from '../components/StreakPreviewModal';
import StatsModal from '../components/StatsModal';
import { LinearGradient } from 'expo-linear-gradient';
import SmartAd from '../components/SmartAd';
// import Animated, { BounceIn } from 'react-native-reanimated';

export default function HomeScreen() {
  const { user, setUser } = useUser();
  const navigation = useNavigation();
  const [showPreview, setShowPreview] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const tierName =
    typeof user?.tier === 'string' ? user.tier : user?.tier?.emoji || 'Bronze';

  const fallbackAvatar = 'https://i.pravatar.cc/150?u=guest';
  const fallbackUsername = 'Guest' + Math.floor(Math.random() * 100000);

  // const getTierGradient = (tier: string | undefined): string[] => {
  //   switch (tier) {
  //     case 'Gold':
  //       return ['#FFD700', '#FFB200'];
  //     case 'Silver':
  //       return ['#C0C0C0', '#A9A9A9'];
  //     case 'Bronze':
  //       return ['#CD7F32', '#A0522D'];
  //     case 'Diamond':
  //       return ['#7DF9FF', '#00FFFF'];
  //     default:
  //       return ['#e0e7ff', '#f9fafb']; // Default soft blue gradient
  //   }
  // };

  const avatar = user?.avatar || fallbackAvatar;
  const username = user?.username || fallbackUsername;
  const coins = user?.coins ?? 0;
  const tier = user?.tier?.emoji || 'Bronze';

  const checkForReferral = async () => {
    const url = await Linking.getInitialURL();
    if (url?.includes('?ref=')) {
      const ref = url.split('?ref=')[1];
      await AsyncStorage.setItem('ref_code', ref);
    }
  };

  const bootstrap = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('auth_token');
      if (!storedToken) {
        const ref = await AsyncStorage.getItem('ref_code');
        const endpoint = ref ? `/auth/register?ref=${ref}` : '/auth/register';
        const { data } = await axios.post(endpoint);
        await AsyncStorage.setItem('auth_token', data.token);
        setUser(data.user);
      } else {
        const { data } = await axios.get('/user/me');
        setUser(data.user);
      }
    } catch (err) {
      await AsyncStorage.removeItem('auth_token');
      setUser(null);
    }
  };

  useEffect(() => {
    const checkStreakModal = async () => {
      const today = new Date().toISOString().split('T')[0];
      const lastShown = await AsyncStorage.getItem('last_streak_modal');
      if (user?.streak && lastShown !== today) {
        setShowPreview(true);
        await AsyncStorage.setItem('last_streak_modal', today);
      }
    };
    checkStreakModal();
  }, [user?.streak]);

  useEffect(() => {
    checkForReferral().finally(() => bootstrap());
  }, []);

  const claimStreak = async () => {
    try {
      const { data } = await axios.post('/session/streak');
      setUser({ ...user!, streak: data.streak, coins: data.coins });
      Alert.alert(
        '🎉 Daily Claim',
        `+${data.bonus} coins for Day ${data.streak}`
      );
    } catch (err: any) {
      Alert.alert('Oops', err.response?.data?.message || 'Already claimed');
    }
  };

  const shareApp = async () => {
    const message = `🔥 Play QuizMint & earn crypto!\nUse my invite: https://quizmint.app?ref=${user?._id}`;
    try {
      await Share.share({ message, title: 'Invite your friends!' });
      await axios.post('/user/shared');
      Alert.alert('✅ Invite shared!', 'You may receive bonus coins shortly.');
    } catch (err) {
      console.warn('Sharing error:', err);
    }
  };

  function getTierGradient(tier: string): [string, string] {
    switch (tier) {
      case 'Bronze':
        return ['#f59e0b', '#d97706'];
      case 'Silver':
        return ['#9ca3af', '#6b7280'];
      case 'Gold':
        return ['#facc15', '#fbbf24'];
      case 'Platinum':
        return ['#a78bfa', '#7c3aed'];
      default:
        return ['#f9fafb', '#e5e7eb']; // fallback
    }
  }

  return (
    <LinearGradient
      colors={getTierGradient(tierName) as [string, string]}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ padding: 20 }}>
          {/* 👤 Profile */}
          <TouchableOpacity onPress={() => setShowStatsModal(true)}>
            <Animated.View style={styles.profileCard}>
              <Image source={{ uri: avatar }} style={styles.avatar} />
              <Text style={styles.name}>{username}</Text>
              <Text style={styles.coins}>🪙 {coins} Coins</Text>
              <Text style={styles.coins}>🪙 {tier} Tier</Text>
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cta}
            onPress={() => navigation.navigate('CategorySelect' as never)}
          >
            <Text style={styles.ctaText}>🎮 Start Game</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={claimStreak} style={styles.streakCard}>
            <Text style={styles.streakText}>🔥 Claim Daily Streak</Text>
          </TouchableOpacity>

          <View style={{ marginTop: 30, gap: 14 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Leaderboard' as never)}
              style={styles.glassButtonStyle}
            >
              <Text style={styles.glassText}>📊 View Leaderboard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings' as never)}
              style={styles.glassButtonStyle}
            >
              <Text style={styles.glassText}>⚙️ Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={shareApp}
              style={styles.glassButtonStyle}
            >
              <Text style={styles.glassText}>📨 Invite Friends</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('RewardHistory' as never)}
              style={styles.glassButtonStyle}
            >
              <Text style={styles.glassText}>🪙 Reward History</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowPreview(true)}
              style={{ marginTop: 10 }}
            >
              <Text style={{ color: '#4f46e5', textAlign: 'center' }}>
                📈 View Streak Rewards
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate('MysteryBox' as never)}
              style={styles.glassButtonStyle}
            >
              <Text style={styles.glassText}>🎁 Mystery Box</Text>
            </TouchableOpacity>
          </View>
          <SmartAd />
        </View>
        <StatsModal
          visible={showStatsModal}
          onClose={() => setShowStatsModal(false)}
        />
        <StreakPreviewModal
          visible={showPreview}
          onClose={() => setShowPreview(false)}
          currentDay={user?.streak || 0}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 10,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
  },
  coins: {
    fontSize: 14,
    color: '#6b7280',
  },
  cta: {
    backgroundColor: '#4f46e5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
  },
  ctaText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  streakCard: {
    backgroundColor: '#dcfce7',
    padding: 14,
    borderRadius: 12,
    marginTop: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  streakText: {
    fontSize: 16,
    color: '#166534',
    fontWeight: '600',
  },
  glassButtonStyle: {
    paddingVertical: 14,
    backgroundColor: '#e0e7ff',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  glassText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e3a8a',
  },
});
