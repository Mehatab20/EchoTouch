import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/authSlice';
import { RootState } from '../../store/store';
import { logExplainability } from '../../store/accessibilitySlice';
import * as SecureStore from 'expo-secure-store';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Button } from '../../components/Button';
import { BalanceCard } from '../../components/BalanceCard';
import { TransactionCard, TransactionType } from '../../components/TransactionCard';
import { useLogoutMutation } from '../../services/authApi';
import { useGetWalletQuery, useGetTransactionsQuery, useCreditWalletMutation } from '../../services/walletApi';
import { FlashList } from '@shopify/flash-list';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScreenIdentity, useFocusManager, TactileElement } from '../../services/navigation/NavigationEngine';
import { RecoveryEngine, PaymentCheckpoint } from '../../services/wallet/RecoveryEngine';
import { AccessibilityManager } from '../../services/accessibilityManager';
import * as Haptics from 'expo-haptics';
import { HapticEngine } from '../../services/braille/HapticEngine';

export default function DashboardScreen() {
  const dispatch = useDispatch();
  const router = useRouter();
  const [logoutApi, { isLoading: isLoggingOut }] = useLogoutMutation();
  const [creditWallet, { isLoading: isCrediting }] = useCreditWalletMutation();
  const { setScreenName } = useFocusManager();

  const accessibility = useSelector((state: RootState) => state.accessibility);
  const [activeCheckpoint, setActiveCheckpoint] = React.useState<PaymentCheckpoint | null>(null);
  const [recoveryMessage, setRecoveryMessage] = React.useState<string>("");

  useFocusEffect(
    React.useCallback(() => {
      const checkPin = async () => {
        try {
          const pin = await SecureStore.getItemAsync('transaction_pin');
          if (!pin) {
            router.replace('/(app)/pin-setup');
          }
        } catch (e) {
          console.error('Failed to check pin', e);
        }
      };
      
      const checkRecovery = async () => {
        const checkpoint = await RecoveryEngine.loadCheckpoint();
        if (checkpoint) {
          setActiveCheckpoint(checkpoint);
          
          // AI Cognitive Recovery Logic
          const timeElapsedStr = Math.floor((Date.now() - checkpoint.timestamp) / 1000); // seconds
          
          let msg = "";
          if (timeElapsedStr < 30) {
            msg = `Resume payment to ${checkpoint.recipient} for $${checkpoint.amount}.`;
          } else if (timeElapsedStr < 600) {
            msg = `You have an unfinished payment to ${checkpoint.recipient} for $${checkpoint.amount} from a few minutes ago. Resume?`;
          } else {
            msg = `We saved your session! You were sending $${checkpoint.amount} to ${checkpoint.recipient}. Double tap to resume.`;
          }
          setRecoveryMessage(msg);
          
          if (accessibility.capabilities.needsVoice) {
            AccessibilityManager.speak(msg);
          } else if (accessibility.capabilities.needsHaptics) {
            // Immediate rumble alert so Deaf-Blind users know there is a pending action at the top of the screen
            HapticEngine.playFeedback(Haptics.NotificationFeedbackType.Warning, 500);
            HapticEngine.playFeedback(Haptics.NotificationFeedbackType.Warning);
          }
        } else {
          setActiveCheckpoint(null);
        }
      };

      checkPin();
      checkRecovery();
    }, [router, accessibility.capabilities.needsVoice])
  );
  const { capabilities, profile } = accessibility;

  React.useEffect(() => {
    setScreenName('dashboard');
    ScreenIdentity.announce('dashboard');
    
    // XAI Guided Onboarding for Elderly
    if (accessibility.profile === 'elderly') {
      dispatch(logExplainability({
        context: 'XAI: AIR SIMPLIFIED MODE',
        reasoning: 'Welcome. I have enlarged the buttons and simplified the menus to make navigation easier and reduce cognitive overload.'
      }));
    }
  }, [setScreenName, accessibility.profile, dispatch]);

  const { data: walletData, isLoading: isWalletLoading, refetch: refetchWallet } = useGetWalletQuery(undefined, {
    refetchOnMountOrArgChange: true
  });
  
  const { data: txData, isLoading: isTxLoading, refetch: refetchTx } = useGetTransactionsQuery(undefined, {
    refetchOnMountOrArgChange: true
  });

  const { totalBrailleAttempts, correctBrailleAttempts, pinEntryTimes, learnedDigits } = accessibility;
  const accuracy = totalBrailleAttempts === 0 ? 0 : Math.round((correctBrailleAttempts / totalBrailleAttempts) * 100);
  const avgTime = pinEntryTimes.length === 0 ? '0.0' : (pinEntryTimes.reduce((a, b) => a + b, 0) / pinEntryTimes.length).toFixed(1);
  const trainingProgress = Math.round((learnedDigits.length / 10) * 100);

  const handleLogout = async () => {
    try {
      const refresh = await SecureStore.getItemAsync('refresh_token');
      if (refresh) await logoutApi(refresh).unwrap();
    } catch (e) {
      console.error("Logout API failed", e);
    } finally {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
      await RecoveryEngine.clearCheckpoint();
      dispatch(logout());
    }
  };

  const handleRefresh = () => {
    refetchWallet();
    refetchTx();
  };

  const handleTopUp = async () => {
    try {
      await creditWallet({ amount: '100.00', pin: '0000', description: 'Top Up' }).unwrap();
    } catch (e) {
      console.error("Top Up failed", e);
    }
  };

  if (capabilities.needsSimpleDashboard) {
    return (
      <ScreenWrapper>
        <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40, paddingTop: 20 }}>
          <Text accessibilityRole="header" className="text-4xl font-bold text-text mb-6">Dashboard</Text>
          
          <BalanceCard balance={walletData?.balance || '0.00'} isLoading={isWalletLoading} />
          
          <View className="mt-8 space-y-4">
            <TactileElement id="simple_send" label="Send Money" description="Transfer money" type="button" priority={1} onPress={() => router.push('/(app)/send')} className="w-full bg-primary rounded-3xl h-32 justify-center items-center mb-4 border-4 border-[#333]">
              <Text className="text-[#121212] font-bold text-3xl">SEND MONEY</Text>
            </TactileElement>

            <TactileElement id="simple_scan" label="Scan and Pay" description="Scan QR Code" type="button" priority={2} onPress={() => router.push('/(app)/scan')} className="w-full bg-[#4ade80] rounded-3xl h-32 justify-center items-center mb-4 border-4 border-[#333]">
              <Text className="text-[#121212] font-bold text-3xl">SCAN & PAY</Text>
            </TactileElement>
            
            <TactileElement id="simple_topup" label="Top Up Wallet" description="Add one hundred dollars" type="button" priority={3} onPress={handleTopUp} className="w-full bg-secondary rounded-3xl h-32 justify-center items-center mb-4 border-4 border-[#333]">
              {isCrediting ? <ActivityIndicator size="large" color="#121212" /> : <Text className="text-[#121212] font-bold text-3xl">TOP UP</Text>}
            </TactileElement>

            {capabilities.needsVoice && (
              <TactileElement id="simple_ai" label="AI Assistant" description="Voice control" type="button" priority={3} onPress={() => router.push('/(app)/assistant')} className="w-full bg-[#2A2A2A] rounded-3xl h-32 justify-center items-center mb-4 border-4 border-[#FFD700]/30">
                <Text className="text-text font-bold text-3xl">🎙️ ASSISTANT</Text>
              </TactileElement>
            )}

            <TactileElement id="simple_settings" label="Settings" description="Open application settings" type="button" priority={4} onPress={() => router.push('/(app)/settings')} className="w-full bg-surface rounded-3xl h-32 justify-center items-center mb-4 border-4 border-[#333]">
              <Text className="text-text font-bold text-3xl">⚙️ SETTINGS</Text>
            </TactileElement>
            
            <TactileElement id="simple_logout" label="Logout" description="Log out" type="danger" priority={5} onPress={handleLogout} className="w-full bg-[#3A1A1A] rounded-3xl h-24 justify-center items-center mt-4 border-4 border-[#ff4444]">
               {isLoggingOut ? <ActivityIndicator size="large" color="#ff4444" /> : <Text className="text-[#ff4444] font-bold text-2xl">LOGOUT</Text>}
            </TactileElement>
          </View>
        </ScrollView>
      </ScreenWrapper>
    );
  }

  if (profile === 'sighted' || profile === 'deaf') {
    return (
      <ScreenWrapper>
        <ScrollView className="flex-1 bg-[#0A0A0A]" contentContainerStyle={{ paddingBottom: 60 }}>
          {/* Header */}
          <View className="px-6 pt-10 pb-4 flex-row justify-between items-center">
            <View>
              <Text className="text-textMuted font-medium text-sm tracking-widest uppercase">Welcome Back</Text>
              <Text className="text-text font-bold text-3xl mt-1">Echo Wallet</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(app)/settings')} className="w-12 h-12 rounded-full bg-[#1A1A1A] items-center justify-center border border-[#333]">
              <Text className="text-xl">⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* Premium Glassmorphic Balance Card */}
          <View className="px-6 my-4">
            <View className="bg-[#1A1A1A] rounded-[32px] p-6 overflow-hidden border border-[#333] relative" style={{ shadowColor: '#FFD700', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 }}>
              <View className="absolute -top-16 -right-16 w-40 h-40 bg-primary/10 rounded-full" />
              <View className="absolute -bottom-16 -left-16 w-40 h-40 bg-secondary/10 rounded-full" />
              
              <Text className="text-textMuted font-medium text-sm mb-2">Total Balance</Text>
              {isWalletLoading ? (
                <ActivityIndicator size="small" color="#FFD700" />
              ) : (
                <Text className="text-text font-bold text-5xl tracking-tight">${walletData?.balance || '0.00'}</Text>
              )}
              
              <View className="flex-row items-center mt-6">
                <Text className="text-[#10B981] font-bold text-sm bg-[#10B981]/20 px-3 py-1 rounded-full">+2.4% Today</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions (Circular Pills) */}
          <View className="px-6 my-6 flex-row justify-between">
            <View className="items-center">
              <TouchableOpacity onPress={() => router.push('/(app)/send')} className="w-16 h-16 rounded-full bg-primary/20 items-center justify-center mb-2 border border-primary/50" style={{ shadowColor: '#FFD700', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 }}>
                <Text className="text-2xl">💸</Text>
              </TouchableOpacity>
              <Text className="text-textMuted font-medium text-xs">Send</Text>
            </View>
            <View className="items-center">
              <TouchableOpacity onPress={() => router.push('/(app)/scan')} className="w-16 h-16 rounded-full bg-[#4ade80]/20 items-center justify-center mb-2 border border-[#4ade80]/50" style={{ shadowColor: '#4ade80', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 }}>
                <Text className="text-2xl">📷</Text>
              </TouchableOpacity>
              <Text className="text-textMuted font-medium text-xs">Scan</Text>
            </View>
            <View className="items-center">
              <TouchableOpacity onPress={handleTopUp} disabled={isCrediting} className="w-16 h-16 rounded-full bg-secondary/20 items-center justify-center mb-2 border border-secondary/50" style={{ shadowColor: '#FF8C00', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 }}>
                {isCrediting ? <ActivityIndicator size="small" color="#FFD700" /> : <Text className="text-2xl">➕</Text>}
              </TouchableOpacity>
              <Text className="text-textMuted font-medium text-xs">Top Up</Text>
            </View>
            
            {profile === 'deaf' && (
              <View className="items-center">
                <TouchableOpacity onPress={() => router.push('/(app)/emoassist')} className="w-16 h-16 rounded-full bg-blue-500/20 items-center justify-center mb-2 border border-blue-500/50" style={{ shadowColor: '#3B82F6', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 }}>
                  <Text className="text-2xl">💬</Text>
                </TouchableOpacity>
                <Text className="text-textMuted font-medium text-xs">EmoAssist</Text>
              </View>
            )}

            {profile !== 'deaf' && (
              <View className="items-center">
                <TouchableOpacity onPress={() => router.push('/(app)/assistant')} className="w-16 h-16 rounded-full bg-purple-500/20 items-center justify-center mb-2 border border-purple-500/50" style={{ shadowColor: '#8B5CF6', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 }}>
                  <Text className="text-2xl">🎙️</Text>
                </TouchableOpacity>
                <Text className="text-textMuted font-medium text-xs">Voice AI</Text>
              </View>
            )}

            <View className="items-center">
              <TouchableOpacity onPress={() => router.push('/(app)/learn-braille')} className="w-16 h-16 rounded-full bg-[#333] items-center justify-center mb-2 border border-[#555]">
                <Text className="text-2xl">📚</Text>
              </TouchableOpacity>
              <Text className="text-textMuted font-medium text-xs">Learn</Text>
            </View>
          </View>

          {/* Recent Transactions */}
          <View className="px-6 mt-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-text font-bold text-xl">Transactions</Text>
              <Text className="text-primary font-medium text-sm">View All</Text>
            </View>
            
            {isTxLoading ? (
              <ActivityIndicator size="large" color="#FFD700" className="mt-8" />
            ) : txData && txData.length > 0 ? (
              <View className="space-y-3">
                {txData.slice(0, 5).map((tx: any) => (
                  <View key={tx.id} className="bg-[#1A1A1A] p-4 rounded-2xl border border-[#333] flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center">
                      <View className="w-12 h-12 rounded-full bg-[#2A2A2A] items-center justify-center mr-4 border border-[#444]">
                        <Text className="text-xl">{tx.type === 'CREDIT' ? '⬇️' : '⬆️'}</Text>
                      </View>
                      <View>
                        <Text className="text-text font-bold text-base">{tx.description || (tx.type === 'CREDIT' ? 'Received' : 'Sent')}</Text>
                        <Text className="text-textMuted text-xs mt-1">{new Date(tx.created_at).toLocaleDateString()}</Text>
                      </View>
                    </View>
                    <Text className={`font-bold text-lg ${tx.type === 'CREDIT' ? 'text-[#10B981]' : 'text-text'}`}>
                      {tx.type === 'CREDIT' ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View className="items-center justify-center py-10 bg-[#1A1A1A] rounded-3xl border border-[#333]">
                <Text className="text-2xl mb-2">🍃</Text>
                <Text className="text-textMuted font-medium">No recent transactions</Text>
              </View>
            )}
          </View>
          
          {/* Logout Button */}
          <View className="px-6 mt-12 mb-8">
             <TouchableOpacity onPress={handleLogout} className="bg-[#FF4444]/10 py-4 rounded-2xl items-center justify-center border border-[#FF4444]/30">
               {isLoggingOut ? <ActivityIndicator size="small" color="#FF4444" /> : <Text className="text-[#FF4444] font-bold text-base">Logout Securely</Text>}
             </TouchableOpacity>
          </View>
        </ScrollView>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View className="flex-1">
        
        {/* Header */}
        <View className="mb-6 mt-4">
          <Text accessibilityRole="header" className="text-4xl font-bold text-text mb-6">Dashboard</Text>
          <View className="flex-row justify-between w-full">
            <View className="flex-1 mr-2">
              <TactileElement id="nav_learn" label="Learn Braille" description="Open the Braille training module" type="button" priority={1} onPress={() => router.push('/(app)/learn-braille')}>
                <View className="bg-surface py-3 rounded-xl border border-[#333] items-center justify-center w-full">
                  <Text className="text-primary font-bold text-base">📚 Learn</Text>
                </View>
              </TactileElement>
            </View>
            <View className="flex-1 mx-1">
              <TactileElement id="nav_settings" label="Settings" description="Open application settings" type="button" priority={2} onPress={() => router.push('/(app)/settings')}>
                <View className="bg-surface py-3 rounded-xl border border-[#333] items-center justify-center w-full">
                  <Text className="text-text font-bold text-base">⚙️ Settings</Text>
                </View>
              </TactileElement>
            </View>
            <View className="flex-1 ml-2">
              <TactileElement id="nav_logout" label="Logout" description="Log out of your account" type="danger" priority={3} onPress={handleLogout}>
                <View className="bg-surface py-3 rounded-xl border border-[#333] items-center justify-center w-full">
                  {isLoggingOut ? (
                    <ActivityIndicator size="small" color="#FFD700" />
                  ) : (
                    <Text className="text-error font-bold text-base">Logout</Text>
                  )}
                </View>
              </TactileElement>
            </View>
          </View>
        </View>

        {/* Scrollable Content via FlashList */}
        <View className="flex-1">
          <FlashList
            data={txData ? (txData as TransactionType[]) : []}
            renderItem={({ item }) => <TransactionCard transaction={item} />}
            // @ts-ignore: estimatedItemSize is required by FlashList but types might be outdated
            estimatedItemSize={80}
            onRefresh={handleRefresh}
            refreshing={isTxLoading || isWalletLoading}
            contentContainerStyle={{ paddingBottom: 40 }}
            ListHeaderComponent={
              <View className="pb-4">
                {/* Interruption Recovery Engine Block */}
                {activeCheckpoint && (
                  <TactileElement id="recovery_resume" label="Resume Unfinished Payment" description={recoveryMessage} type="button" priority={0.5} onPress={() => {
                    // Navigate to send.tsx with the saved parameters
                    router.push({
                      pathname: '/(app)/send',
                      params: {
                        step: activeCheckpoint.step,
                        recipient: activeCheckpoint.recipient,
                        amount: activeCheckpoint.amount.toString()
                      }
                    });
                  }} className="mb-4 bg-[#FFD700]/20 rounded-2xl border-2 border-[#FFD700] p-4 flex-row items-center">
                    <View className="w-12 h-12 rounded-full bg-[#FFD700]/30 items-center justify-center mr-4">
                      <Text className="text-2xl">🔄</Text>
                    </View>
                    <View className="flex-1 mr-2">
                      <Text className="text-primary font-bold text-lg">Unfinished Payment</Text>
                      <Text className="text-text font-medium text-sm mt-1">{recoveryMessage}</Text>
                      <Text className="text-textMuted text-xs mt-2">Tap to safely resume without restarting.</Text>
                    </View>
                  </TactileElement>
                )}

                {/* Balance */}
                <BalanceCard 
                  balance={walletData?.balance || '0.00'} 
                  isLoading={isWalletLoading} 
                />

                {/* Adaptive Action Buttons */}
                {capabilities.needsLargeUI ? (
                  <View className="mb-6 mt-2">
                    <TactileElement id="lg_send" label="Send Money" description="Transfer money to another user" type="button" priority={4} onPress={() => router.push('/(app)/send')} className="w-full bg-primary rounded-3xl h-32 justify-center items-center mb-4 border-4 border-[#333]">
                      <Text className="text-[#121212] font-bold text-3xl">SEND MONEY</Text>
                    </TactileElement>
                    <TactileElement id="lg_topup" label="Top Up" description="Add one hundred dollars to wallet" type="button" priority={5} onPress={handleTopUp} className="w-full bg-secondary rounded-3xl h-32 justify-center items-center border-4 border-[#333]">
                      {isCrediting ? <ActivityIndicator size="large" color="#121212" /> : <Text className="text-[#121212] font-bold text-3xl">TOP UP</Text>}
                    </TactileElement>
                  </View>
                ) : (
                  <View className="flex-col mb-4 mt-2">
                    <View className="flex-row mb-2">
                      <View className="flex-1 mr-2">
                        <TactileElement id="btn_nav_send" label="Send Money" description="Transfer money to another user" type="button" priority={4} onPress={() => router.push('/(app)/send')}>
                          <Button 
                            title="Send Money" 
                            onPress={() => router.push('/(app)/send')} 
                            id="btn_nav_send_inner" 
                            className="py-3 min-h-[50px] mb-0"
                          />
                        </TactileElement>
                      </View>
                      <View className="flex-1 ml-2">
                        <TactileElement id="btn_nav_topup" label="Top Up" description="Add one hundred dollars to wallet" type="button" priority={5} onPress={handleTopUp}>
                          <Button 
                            title="Top Up (+$100)" 
                            onPress={handleTopUp} 
                            variant="secondary"
                            id="btn_nav_topup_inner" 
                            isLoading={isCrediting}
                            className="py-3 min-h-[50px] mb-0"
                          />
                        </TactileElement>
                      </View>
                    </View>
                    
                    <TactileElement id="btn_nav_scan" label="Scan & Pay" description="Scan a QR code to pay" type="button" priority={5.5} onPress={() => router.push('/(app)/scan')}>
                      <Button 
                        title="📷 Scan & Pay" 
                        onPress={() => router.push('/(app)/scan')} 
                        id="btn_nav_scan_inner" 
                        className="py-3 min-h-[50px] mb-0"
                        style={{ backgroundColor: '#4ade80' }}
                        textStyle={{ color: '#121212' }}
                      />
                    </TactileElement>
                  </View>
                )}

                {/* AI Assistant Button */}
                {capabilities.needsVoice && (
                  <TactileElement id="ai_assistant" label="AI Assistant" description="Use your voice to control the app" type="button" priority={6} onPress={() => router.push('/(app)/assistant')} className="bg-[#2A2A2A] rounded-2xl p-4 flex-row items-center border border-[#FFD700]/30 mb-6">
                    <View className="w-12 h-12 rounded-full bg-primary/20 items-center justify-center mr-4">
                      <Text className="text-2xl">🎙️</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-text font-bold text-lg">AI Accessibility Assistant</Text>
                      <Text className="text-textMuted text-sm">Use your voice to control the app</Text>
                    </View>
                  </TactileElement>
                )}

                {/* EmoAssist Button */}
                {profile === 'deaf-blind' && (
                  <TactileElement id="emo_assist" label="EmoAssist Hub" description="Multimodal Conversational Hub" type="button" priority={6} onPress={() => router.push('/(app)/emoassist')} className="bg-[#1A2A3A] rounded-2xl p-4 flex-row items-center border border-[#3B82F6]/30 mb-6">
                    <View className="w-12 h-12 rounded-full bg-[#3B82F6]/20 items-center justify-center mr-4">
                      <Text className="text-2xl">💬</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-text font-bold text-lg">EmoAssist Hub</Text>
                      <Text className="text-textMuted text-sm">Live Tone & Transcription</Text>
                    </View>
                  </TactileElement>
                )}

                {/* Accessibility Analytics */}
                <Text className="text-xl font-bold text-text mb-4">Accessibility Analytics</Text>
                <View className="bg-surface rounded-2xl p-4 border border-[#333] flex-row justify-between mb-8">
                  <View className="items-center flex-1">
                     <Text className="text-primary font-bold text-2xl">{accuracy}%</Text>
                     <Text className="text-textMuted text-xs text-center mt-1">Braille Accuracy</Text>
                  </View>
                  <View className="w-[1px] bg-[#333] h-full" />
                  <View className="items-center flex-1">
                     <Text className="text-primary font-bold text-2xl">{avgTime}s</Text>
                     <Text className="text-textMuted text-xs text-center mt-1">Avg PIN Time</Text>
                  </View>
                  <View className="w-[1px] bg-[#333] h-full" />
                  <View className="items-center flex-1">
                     <Text className="text-primary font-bold text-2xl">{trainingProgress}%</Text>
                     <Text className="text-textMuted text-xs text-center mt-1">Training Pgrs</Text>
                  </View>
                </View>

                {/* Transactions Title */}
                <Text className="text-xl font-bold text-text mb-4">Recent Transactions</Text>
                
                {isTxLoading && (
                  <ActivityIndicator size="large" color="#FFD700" className="mt-4" />
                )}
                
                {!isTxLoading && txData && txData.length === 0 && (
                  <View className="items-center justify-center py-6">
                    <Text className="text-textMuted text-lg">No transactions yet.</Text>
                  </View>
                )}
              </View>
            }
          />
        </View>
      </View>
    </ScreenWrapper>
  );
}
