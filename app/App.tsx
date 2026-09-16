import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { NotoSansBengali_400Regular } from '@expo-google-fonts/noto-sans-bengali';

import { useStore } from './src/store/useStore';
import { hydrateStore } from './src/store/persist';
import { initNotifications } from './src/notifications/wire';
import { initRecurrenceSync } from './src/store/recurrenceSync';
import { maybeRunAutoBackup } from './src/backup';
import { colors } from './src/theme';
import { SplashScreen } from './src/screens/SplashScreen';
import { PinScreen } from './src/screens/PinScreen';
import { TourScreen } from './src/screens/TourScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ActivityScreen } from './src/screens/ActivityScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { PlansScreen, ShoppingListDetailScreen } from './src/screens/PlansScreen';
import {
  MoreMenuScreen, AccountsScreen, AccountDetailScreen, CategoriesScreen, ProfilesScreen,
  DebtsAndPeopleScreen, PersonDetailScreen, DebtDetailScreen, BillsScreen, SubscriptionsScreen,
  RecurringScreen, ReportsScreen, NotesScreen, BackupScreen, SettingsScreen,
} from './src/screens/more';
import { BottomNav, FabMenu } from './src/components/Shell';
import { ModalHost } from './src/modals/ModalHost';
import type { DashKey } from './src/store/types';

const DASH_SCREENS: Record<DashKey, React.ComponentType> = {
  home: HomeScreen,
  activity: ActivityScreen,
  search: SearchScreen,
  plans: PlansScreen,
  plansShoppingDetail: ShoppingListDetailScreen,
  more: MoreMenuScreen,
  moreAccounts: AccountsScreen,
  moreAccountDetail: AccountDetailScreen,
  moreCategories: CategoriesScreen,
  moreProfiles: ProfilesScreen,
  moreDebts: DebtsAndPeopleScreen,
  morePersonDetail: PersonDetailScreen,
  moreDebtDetail: DebtDetailScreen,
  moreBills: BillsScreen,
  moreSubscriptions: SubscriptionsScreen,
  moreRecurring: RecurringScreen,
  moreReports: ReportsScreen,
  moreNotes: NotesScreen,
  moreBackup: BackupScreen,
  moreSettings: SettingsScreen,
};

function Dashboard() {
  const dash = useStore((s) => s.dash);
  const Screen = DASH_SCREENS[dash] || HomeScreen;
  return (
    <View style={{ flex: 1 }}>
      <Screen />
      <BottomNav />
      <FabMenu />
      <ModalHost />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, NotoSansBengali_400Regular,
  });
  const [dbReady, setDbReady] = useState(false);
  const screen = useStore((s) => s.screen);

  useEffect(() => {
    hydrateStore().then((isFirstRun) => {
      setDbReady(true);
      initNotifications();
      if (!isFirstRun) {
        initRecurrenceSync();
        maybeRunAutoBackup();
      }
    });
    useStore.getState().checkBiometricAvailability();
  }, []);

  if (!fontsLoaded || !dbReady) {
    return <View style={styles.loading} />;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />
        {screen === 'splash' && <SplashScreen />}
        {screen === 'pin' && <PinScreen />}
        {screen === 'tour' && <TourScreen />}
        {screen === 'dash' && <Dashboard />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, backgroundColor: colors.bg },
});
