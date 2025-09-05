import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import RootNavigator from "./src/navigation/RootNavigator";

// NEW:
import mobileAds, { MaxAdContentRating } from "react-native-google-mobile-ads";

export default function App() {
  useEffect(() => {
    mobileAds()
      .setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.T, // safe-ish
        tagForChildDirectedTreatment: false,
        testDeviceIdentifiers: __DEV__ ? ["EMULATOR"] : [],
      })
      .then(() => mobileAds().initialize());
  }, []);

  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}
