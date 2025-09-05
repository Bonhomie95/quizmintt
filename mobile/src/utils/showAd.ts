import { Alert } from "react-native";
import {
  InterstitialAd,
  AdEventType,
  TestIds,
} from "react-native-google-mobile-ads";

const PROD_ID = process.env.EXPO_PUBLIC_AD_INTERSTITIAL_ID;
const unitId = __DEV__ ? TestIds.INTERSTITIAL : PROD_ID || TestIds.INTERSTITIAL;

export const showInterstitialAdWithFallback = async (onFinish: () => void) => {
  try {
    const interstitial = InterstitialAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: false,
    });

    const onLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      interstitial.show();
    });
    const onClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      onLoaded();
      onClosed(); // remove listeners
      onFinish();
    });
    const onError = interstitial.addAdEventListener(AdEventType.ERROR, () => {
      onLoaded();
      onClosed();
      Alert.alert("🔕 No ad available", "Continuing…", [
        { text: "OK", onPress: onFinish },
      ]);
    });

    interstitial.load();

    // Hard fallback if nothing loads in ~4s
    setTimeout(() => {
      onLoaded();
      onClosed();
      onError();
      onFinish();
    }, 4000);
  } catch (e) {
    Alert.alert("Ad error", "Continuing…", [{ text: "OK", onPress: onFinish }]);
  }
};
