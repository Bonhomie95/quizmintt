import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  RefreshControl,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import axios from '../api/axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Animatable from 'react-native-animatable';
import UserHeader from '../components/UserHeader';
import { useLeaderboard } from '../store/useLeaderboard';
import { useFocusEffect } from '@react-navigation/native';

interface Player {
  username: string;
  avatar: string;
  totalScore: number;
  sessionCount: number;
  rank: number;
}

const medalIcons = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen() {
  const [range, setRange] = useState<'weekly' | 'monthly'>('weekly');
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);
  const { weekly, monthly, setLeaderboard } = useLeaderboard();
  const [refreshing, setRefreshing] = useState(false);
  const {clearLeaderboard} = useLeaderboard();

  const fetchLeaderboard = async (isManual = false) => {
    try {
      if (!isManual) setLoading(true);
      else setRefreshing(true);

      const { data } = await axios.get(`/leaderboard?range=${range}`);
      setPlayers(data.topPlayers);
      setCurrentUser(data.currentUser || null);
      setLeaderboard(range, data.topPlayers);
      setLastUpdated(new Date());
    } catch (err) {
      console.warn('❌ Failed to fetch leaderboard. Using cache...');
      const cached = range === 'weekly' ? weekly : monthly;
      setPlayers(cached);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      clearLeaderboard(); // Clear leaderboard cache on focus
      fetchLeaderboard();

      // ✅ Set interval to refresh every 120s
      if (refreshTimer.current) clearInterval(refreshTimer.current);
      refreshTimer.current = setInterval(fetchLeaderboard, 120_000);

      return () => {
        if (refreshTimer.current) clearInterval(refreshTimer.current);
      };
    }, [range])
  );

  const Tab = ({
    label,
    value,
  }: {
    label: string;
    value: 'weekly' | 'monthly';
  }) => (
    <TouchableOpacity
      onPress={() => setRange(value)}
      style={[
        styles.tab,
        {
          backgroundColor: range === value ? '#4f46e5' : '#f3f4f6',
        },
      ]}
    >
      <Text
        style={{
          color: range === value ? '#fff' : '#111827',
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item, index }: { item: Player; index: number }) => {
    const isTop10 = item.rank <= 10;
    const isTop50 = item.rank <= 50;

    return (
      <Animatable.View
        animation="fadeInUp"
        delay={index * 80}
        style={[
          styles.card,
          isTop10 && styles.top10,
          !isTop10 && isTop50 && styles.top50,
        ]}
      >
        <Text style={styles.rank}>{medalIcons[index] || item.rank}</Text>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.username}>{item.username}</Text>
          <Text style={styles.sessions}>Sessions: {item.sessionCount}</Text>
        </View>
        <Text style={styles.points}>{item.totalScore} pts</Text>
      </Animatable.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <UserHeader />
      <Text style={styles.title}>🏆 Leaderboard</Text>

      <View style={styles.tabContainer}>
        <Tab label="Weekly" value="weekly" />
        <Tab label="Monthly" value="monthly" />
      </View>

      {lastUpdated && (
        <Text style={styles.updatedAt}>
          🔄 Updated: {lastUpdated.toLocaleTimeString()}
        </Text>
      )}

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#4f46e5"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={players}
          keyExtractor={(item, index) => `${item.username}-${index}`}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchLeaderboard(true)}
              colors={['#4f46e5']}
              tintColor="#4f46e5"
            />
          }
        />
      )}

      {currentUser && (
        <>
          <View
            style={{
              height: 1,
              backgroundColor: '#d1d5db',
              marginVertical: 10,
            }}
          />
          <Text style={{ textAlign: 'center', fontSize: 12, color: '#6b7280' }}>
            Your Rank
          </Text>
          <Animatable.View
            animation="pulse"
            iterationCount="infinite"
            duration={2500}
          >
            <View style={[styles.card, { backgroundColor: '#fef9c3' }]}>
              <Text style={styles.rank}>{currentUser.rank}</Text>
              <Image
                source={{ uri: currentUser.avatar }}
                style={styles.avatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.username}>{currentUser.username}</Text>
                <Text style={styles.sessions}>
                  Sessions: {currentUser.sessionCount}
                </Text>
              </View>
              <Text style={styles.points}>{currentUser.totalScore} pts</Text>
            </View>
          </Animatable.View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#111827',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  updatedAt: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 12,
    marginBottom: 10,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginHorizontal: 6,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  rank: {
    width: 32,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4b5563',
    textAlign: 'center',
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginHorizontal: 10,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  sessions: {
    fontSize: 12,
    color: '#6b7280',
  },
  points: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  top10: {
    backgroundColor: '#fef9c3',
    borderLeftWidth: 5,
    borderLeftColor: '#facc15',
  },
  top50: {
    backgroundColor: '#e0f2fe',
  },
});
