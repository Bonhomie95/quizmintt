import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Animated,
  Share,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import * as ScreenOrientation from "expo-screen-orientation";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useRoute,
  useNavigation,
  RouteProp,
  useFocusEffect,
} from "@react-navigation/native";
import { Audio } from "expo-av";
import LottieView from "lottie-react-native";
import ConfettiCannonLib from "react-native-confetti-cannon";
import ModalLib from "react-native-modal";
import * as Haptics from "expo-haptics";
import axios from "../api/axios";
import { useUser } from "../store/useUser";
import { RootStackParamList } from "../types/navigation";
import { Question } from "../types/question";
import UserHeader from "../components/UserHeader";

// ✅ Google Mobile Ads (SDK-compliant)
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from "react-native-google-mobile-ads";

// If you prefer keeping ads separate, you can swap this inline banner for your SmartAd component.
// import SmartAd from "../components/SmartAd";

const ConfettiCannon = ConfettiCannonLib as any;
const Modal = ModalLib as any;

const categoryEmojis: Record<string, string> = {
  Geography: "🗺️",
  History: "🏛️",
  Puzzle: "🧩",
  Science: "🔬",
  Logic: "🧠",
};

type QuizRouteProp = RouteProp<RootStackParamList, "Quiz">;

export default function QuizScreen() {
  const route = useRoute<QuizRouteProp>();
  const navigation = useNavigation();
  const { category } = route.params;
  const { user, setUser } = useUser();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [selected, setSelected] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [coinAnim] = useState(new Animated.Value(0));
  const [loadingQuestion, setLoadingQuestion] = useState(true);
  const [totalPoints, setTotalPoints] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showWrongAlert, setShowWrongAlert] = useState(false);
  const [showTimeUpAlert, setShowTimeUpAlert] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);

  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // 🔒 Lock to LANDSCAPE only while this screen is focused
  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      return () => {
        ScreenOrientation.unlockAsync(); // back to default (portrait allowed elsewhere)
      };
    }, [])
  );

  // 🧠 Load Questions (unique per session)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setHintsUsed(0);
        const { data } = await axios.post("/quiz/generate", { category });
        if (!mounted) return;
        setQuestions(data.questions);
        setLoadingQuestion(false);
        setTimeLeft(10);
      } catch {
        Alert.alert("❌ Error", "Could not load questions");
        navigation.goBack();
      }
    })();
    return () => {
      mounted = false;
    };
  }, [category, navigation]);

  // ⏳ Timer Logic
  useEffect(() => {
    if (loadingQuestion || showModal || !questions.length) return;

    if (timeLeft === 0 && !selected && !showTimeUpAlert) {
      setShowTimeUpAlert(true);
      Alert.alert("⏱️ Time’s Up!", "Game Over", [
        { text: "Return Home", onPress: endGame },
      ]);
      return;
    }

    timerRef.current = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    timeLeft,
    loadingQuestion,
    showModal,
    questions.length,
    selected,
    showTimeUpAlert,
  ]);

  // Reset timer when a new question becomes active
  useEffect(() => {
    if (!loadingQuestion && questions.length) {
      setTimeLeft(10);
    }
  }, [loadingQuestion, currentIndex, questions.length]);

  // 🎯 Anim for +1
  const animateCoin = () => {
    coinAnim.setValue(0);
    Animated.timing(coinAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  };

  const selectAnswer = async (option: string) => {
    if (selected || showWrongAlert || showTimeUpAlert) return;

    setSelected(option);
    const correct = questions[currentIndex].answer;
    const isCorrect = option === correct;

    if (isCorrect) {
      setScore((s) => s + 1);
      animateCoin();
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(nextQuestion, 700);
    } else {
      setShowWrongAlert(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => {
        Alert.alert("💥 Wrong Answer", "Game Over!", [
          { text: "Return Home", onPress: endGame },
        ]);
      }, 400);
    }
  };

  const nextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((i) => i + 1);
      setTimeLeft(10);
      setShowHint(false);
      setSelected("");
      setShowWrongAlert(false);
    } else {
      finishQuiz();
    }
  };

  const saveQuizSession = async (finalScore: number) => {
    if (sessionSaved) return;
    setSessionSaved(true);

    try {
      const { data } = await axios.post("/session/save", {
        category,
        score: finalScore,
        total: questions.length,
        usedHints: hintsUsed, // total hints used this session
      });

      setTotalPoints(data.totalPoints);
      setUser({
        ...user!,
        allTimePoints: data.updatedPoints,
        coins: data.coins,
        tier: data.tier,
      });
    } catch (err) {
      console.warn("Session save failed:", err);
    }
  };

  const finishQuiz = async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowConfetti(true);
    setShowModal(true);
    await saveQuizSession(score);
  };

  const endGame = async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (soundRef.current) await soundRef.current.stopAsync();
    await saveQuizSession(score);
    setShowModal(false);

    // If you've added the new interstitial util, uncomment below:
    // import { showInterstitialAdWithFallback } from "../utils/showAd";
    // showInterstitialAdWithFallback(() =>
    //   navigation.reset({ index: 0, routes: [{ name: "Home" }] })
    // );

    navigation.reset({ index: 0, routes: [{ name: "Home" }] });
  };

  const useHint = async () => {
    if (showHint) return;
    if (hintsUsed >= 2) {
      Alert.alert(
        "⚠️ Hint Limit Reached",
        "You can only use 2 hints per session"
      );
      return;
    }

    try {
      const { data } = await axios.post("/session/hint");
      setShowHint(true);
      setHintsUsed((prev) => prev + 1);
      setUser({ ...user!, coins: data.coins });
    } catch {
      Alert.alert("❌ Not enough coins for hint");
    }
  };

  const shareScore = async () => {
    const message = `🎉 I just scored ${score}/${questions.length} in ${category} on QuizMint!\nJoin me 👉 https://quizmint.app?ref=${user?.uuid}`;
    try {
      await Share.share({ message });
      await axios.post("/user/shared");
      Alert.alert("✅ Shared!", "You may receive bonus coins for sharing.");
    } catch (err) {
      console.warn("Sharing error:", err);
    }
  };

  const q = questions[currentIndex] || null;

  // ✅ Choose banner unit ID (test in dev)
  const bannerUnitId = __DEV__
    ? TestIds.BANNER
    : process.env.EXPO_PUBLIC_AD_BANNER_ID || TestIds.BANNER;

  return (
    <SafeAreaView
      style={[
        styles.container,
        isLandscape && {
          flexDirection: "row",
          paddingTop: 16,
          paddingHorizontal: 16,
        },
      ]}
    >
      {/* LEFT: Header + Progress + Question */}
      <View
        style={[styles.leftPane, isLandscape && { flex: 1, paddingRight: 8 }]}
      >
        <UserHeader />

        {loadingQuestion ? (
          <View style={styles.centerFill}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${
                      ((currentIndex + 1) / Math.max(questions.length, 1)) * 100
                    }%`,
                  },
                ]}
              />
            </View>

            <Text style={styles.timer}>⏱️ {timeLeft}s</Text>
            <Text style={styles.categoryTitle}>
              {categoryEmojis[category] || "❓"} {category} — {currentIndex + 1}
              /{questions.length}
            </Text>

            <Text style={styles.questionText}>{q?.question}</Text>

            {showHint && q?.hint && (
              <Text style={styles.hintText}>💡 {q.hint}</Text>
            )}

            {!showHint && q?.hint && (
              <>
                <TouchableOpacity
                  onPress={useHint}
                  style={[
                    styles.hintButton,
                    hintsUsed >= 2 && { backgroundColor: "#e5e7eb" },
                  ]}
                  disabled={hintsUsed >= 2}
                >
                  <Text style={{ color: hintsUsed >= 2 ? "#9ca3af" : "#000" }}>
                    💡 Use Hint (-50 coins)
                  </Text>
                </TouchableOpacity>

                <Text style={styles.hintUsageText}>
                  Hints Used: {hintsUsed}/2
                </Text>
              </>
            )}

            {!q?.hint && (
              <Text style={styles.hintUsageText}>
                Hints Used: {hintsUsed}/2
              </Text>
            )}
          </>
        )}
      </View>

      {/* RIGHT: Options + Banner */}
      <View
        style={[styles.rightPane, isLandscape && { flex: 1, paddingLeft: 8 }]}
      >
        {!loadingQuestion && !!q && (
          <>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
              }}
            >
              {q?.options.map((opt) => {
                const isCorrect = selected && opt === q.answer;
                const isWrong = selected === opt && opt !== q.answer;
                return (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => selectAnswer(opt)}
                    style={[
                      styles.optionButton,
                      isCorrect && { backgroundColor: "#bbf7d0" },
                      isWrong && { backgroundColor: "#fecaca" },
                      { width: isLandscape ? "48%" : "100%" },
                    ]}
                  >
                    <Text style={styles.optionText}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Inline Banner (adaptive for landscape/portrait) */}
            <View style={styles.bannerWrap}>
              <BannerAd
                unitId={bannerUnitId}
                size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                requestOptions={{ requestNonPersonalizedAdsOnly: false }}
              />
            </View>
          </>
        )}
      </View>

      {/* +1 animation */}
      <Animated.Text
        style={{
          position: "absolute",
          top: 64,
          alignSelf: "flex-end",
          right: 20,
          fontSize: 22,
          color: "#10b981",
          opacity: coinAnim,
          transform: [
            {
              translateY: coinAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -40],
              }),
            },
          ],
        }}
      >
        +1 🧠
      </Animated.Text>

      {/* Confetti & Modal */}
      {showConfetti && (
        <>
          <View style={styles.dimBackground} />
          <ConfettiCannon count={120} origin={{ x: width / 2, y: 0 }} />
        </>
      )}

      <Modal isVisible={showModal}>
        <View style={styles.modalBox}>
          <Text style={styles.modalTitle}>🎉 Quiz Complete!</Text>
          <Text style={styles.modalScore}>
            Score: {score} / {questions.length}
          </Text>
          {totalPoints !== null && (
            <Text style={{ fontSize: 18, marginTop: 8, color: "#22c55e" }}>
              +{totalPoints} Points Earned!
            </Text>
          )}
          <TouchableOpacity style={styles.shareButton} onPress={shareScore}>
            <Text style={{ color: "#1f2937", textAlign: "center" }}>
              📤 Share Score
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backButton} onPress={endGame}>
            <Text style={{ color: "white", textAlign: "center" }}>
              🔙 Back to Home
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {showModal && (
        <LottieView
          autoPlay
          loop={false}
          source={require("../assets/lottie/coin.json")}
          style={styles.lottieStyle}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  leftPane: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  rightPane: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  progressBar: {
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressFill: {
    backgroundColor: "#4f46e5",
    height: "100%",
  },
  timer: { textAlign: "right", color: "gray", marginVertical: 4 },
  categoryTitle: { fontSize: 18, color: "#555", marginBottom: 8 },
  questionText: { fontSize: 22, fontWeight: "600", marginVertical: 10 },
  optionButton: {
    padding: 15,
    backgroundColor: "#e0e7ff",
    borderRadius: 10,
    marginVertical: 6,
  },
  optionText: { fontSize: 18 },
  hintButton: {
    backgroundColor: "#fef08a",
    padding: 12,
    borderRadius: 8,
    marginVertical: 5,
    alignSelf: "flex-start",
  },
  hintText: { fontStyle: "italic", color: "gray", marginBottom: 10 },
  hintUsageText: {
    marginTop: 4,
    marginBottom: 8,
    color: "#6b7280",
    fontSize: 14,
  },
  dimBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 10,
  },
  modalBox: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  modalTitle: { fontSize: 22, marginBottom: 10 },
  modalScore: { fontSize: 18, color: "gray" },
  backButton: {
    marginTop: 20,
    backgroundColor: "#4f46e5",
    padding: 12,
    borderRadius: 8,
    width: "100%",
  },
  shareButton: {
    marginTop: 10,
    backgroundColor: "#dbeafe",
    padding: 12,
    borderRadius: 8,
    width: "100%",
  },
  lottieStyle: {
    width: 150,
    height: 150,
    alignSelf: "center",
    position: "absolute",
    bottom: 20,
  },
  bannerWrap: {
    marginTop: 12,
    alignItems: "center",
  },
});
