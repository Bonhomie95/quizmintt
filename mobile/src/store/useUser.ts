import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist } from 'zustand/middleware';
import { User } from '../types/user';

type UserState = {
  user: User | null;
  setUser: (u: User) => void;
  logout: () => void;
};

const fallbackUsername = 'Guest' + Math.floor(100000 + Math.random() * 900000);
const fallbackAvatar = 'https://i.pravatar.cc/150?u=' + fallbackUsername;

export const useUser = create<UserState>()(
  persist(
    (set) => ({
      user: {
        username: fallbackUsername,
        avatar: fallbackAvatar,
        coins: 0,
        streak: 0,
        highScore: 0,
        allTimePoints: 0,
        uuid: '',
        weeklyPoints: 0,
        monthlyPoints: 0,
        tier: {
          level: 0,
          emoji: '🥉',
          color: '#CD7F32',
        },
      },
      setUser: (user) =>
        set({
          user: {
            ...user,
            hasPin: !!user.pinHash,
          },
        }),
      logout: () => set({ user: null }),
    }),
    {
      name: 'quizmint-user',
      storage: AsyncStorage, 
    }
  )
);
