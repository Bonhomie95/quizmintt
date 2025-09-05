import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { useUser } from '../store/useUser';
import * as Animatable from 'react-native-animatable';
import Modal from 'react-native-modal';

const screenWidth = Dimensions.get('window').width;

const tierGradients: Record<string, string[]> = {
  bronze: ['#CD7F32', '#a97142'],
  silver: ['#C0C0C0', '#a6a6a6'],
  gold: ['#FFD700', '#e6c200'],
  platinum: ['#87CEEB', '#1E90FF'],
  default: ['#d1d5db', '#9ca3af'],
};

export default function UserHeader() {
  const { user } = useUser();
  const [isModalVisible, setModalVisible] = useState(false);
  const theme = useColorScheme();
  const isDark = theme === 'dark';
  const getTierName = (level: number) => {
    if (level <= 5) return 'Bronze';
    if (level <= 10) return 'Silver';
    if (level <= 20) return 'Gold';
    return 'Platinum';
  };

  if (!user) return null;

  const gradientColors =
    tierGradients[`lv${user.tier?.level || 1}`] || tierGradients.default;

  const toggleModal = () => {
    setModalVisible(!isModalVisible);
  };

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? '#1f2937' : '#f9fafb',
            borderBottomColor: isDark ? '#374151' : '#e5e7eb',
          },
        ]}
      >
        <View style={styles.avatarWrapper}>
          <Pressable onPress={toggleModal}>
            <Animatable.View
              animation="pulse"
              duration={1800}
              iterationCount="infinite"
              style={[
                styles.avatarBorder,
                {
                  backgroundColor: gradientColors[0],
                  shadowColor: gradientColors[1],
                },
              ]}
            >
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
              <Animatable.Text
                animation="bounce"
                iterationCount="infinite"
                duration={2000}
                style={styles.emoji}
              >
                {user.tier?.emoji || '🥚'}
              </Animatable.Text>
            </Animatable.View>
          </Pressable>

          <Text
            style={[styles.username, { color: isDark ? '#f9fafb' : '#1f2937' }]}
          >
            {user.username}{' '}
            <Text style={styles.level}>Lv.{user.tier?.level || 1}</Text>
          </Text>
        </View>
      </View>

      {/* Stats Modal */}
      <Modal
        isVisible={isModalVisible}
        onBackdropPress={toggleModal}
        backdropOpacity={0.5}
        animationIn="zoomIn"
        animationOut="zoomOut"
      >
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: isDark ? '#1e293b' : '#fff',
              shadowColor: isDark ? '#0f172a' : '#000',
            },
          ]}
        >
          <Text style={styles.modalTitle}>📊 Your Stats</Text>
          <Stat label="Username" value={user.username} />
          <Stat
            label="Tier"
            value={`${user.tier?.emoji || ''} lv${user.tier?.level || 1}`}
          />
          <Stat label="Level" value={`Lv.${user.tier?.level || 1}`} />
          <Stat label="High Score" value={user.highScore || 0} />
          <Stat label="All-Time Points" value={user.allTimePoints || 0} />
          <Stat label="Streak" value={user.streak || 0} />
          <Stat
            label="Tier"
            value={`${user.tier?.emoji || ''} ${getTierName(
              user.tier?.level || 1
            )}`}
          />
        </View>
      </Modal>
    </>
  );
}

const Stat = ({ label, value }: { label: string; value: any }) => (
  <View style={styles.statRow}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  avatarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBorder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 6,
  },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
  },
  emoji: {
    position: 'absolute',
    right: -10,
    top: '50%',
    transform: [{ translateY: -12 }],
    fontSize: 24,
  },
  username: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '600',
  },
  level: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6b7280',
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 14,
    textAlign: 'center',
    color: '#10b981',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});
