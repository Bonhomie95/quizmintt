import React from "react";
import { View } from "react-native";
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from "react-native-google-mobile-ads";

const PROD_ID = process.env.EXPO_PUBLIC_AD_BANNER_ID;
const unitId = __DEV__ ? TestIds.BANNER : PROD_ID || TestIds.BANNER;

export default function SmartAd() {
  return (
    <View style={{ alignItems: "center" }}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} // auto-fits portrait/landscape
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      />
    </View>
  );
}
