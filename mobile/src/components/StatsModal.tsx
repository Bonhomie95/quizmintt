import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
} from 'react-native';
import { useUser } from '../store/useUser';

export default function StatsModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { user } = useUser();

  if (!user) return null;

  const allTime = user?.allTimePoints || 0;
  const weekly = user?.weeklyPoints || 0;
  const monthly = user?.monthlyPoints || 0;
  const tier =
    typeof user.tier === 'string' ? user.tier : user.tier?.emoji || 'Bronze';
  const emoji = typeof user.tier === 'object' ? user.tier.emoji : '🥉';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <Text style={styles.title}>📊 Your Stats</Text>

          <View style={styles.statRow}>
            <Text style={styles.label}>🏅 Tier:</Text>
            <Text style={styles.value}>
              {emoji} {tier}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.label}>📆 Monthly Points:</Text>
            <Text style={styles.value}>{monthly}</Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.label}>📅 Weekly Points:</Text>
            <Text style={styles.value}>{weekly}</Text>
          </View>

          <View style={styles.statRow}>
            <Text style={styles.label}>🌟 All Time Points:</Text>
            <Text style={styles.value}>{allTime}</Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              Vibration.vibrate(80);
              onClose();
            }}
            style={styles.closeBtn}
          >
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    elevation: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontWeight: '600',
    fontSize: 16,
  },
  value: {
    fontSize: 16,
    color: '#4f46e5',
    fontWeight: '700',
  },
  closeBtn: {
    marginTop: 20,
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    borderRadius: 10,
  },
  closeText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
});
