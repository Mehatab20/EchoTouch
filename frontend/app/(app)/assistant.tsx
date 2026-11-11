import React, { useState } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Button } from '../../components/Button';
import { AccessibilityManager } from '../../services/accessibilityManager';
import { HapticEngine } from '../../services/braille/HapticEngine';
import { NLPEngine } from '../../services/nlpEngine';
import { router } from 'expo-router';
import { useGetTransactionsQuery } from '../../services/walletApi';

export default function AssistantScreen() {
  const [command, setCommand] = useState('');
  const [response, setResponse] = useState('How can I help you today?');
  const { data: transactions } = useGetTransactionsQuery(undefined);

  const processCommand = async () => {
    if (!command.trim()) return;

    HapticEngine.tap();
    setResponse('Processing...');
    
    const intent = await NLPEngine.parseCommand(command);

    if (intent.action === 'CHECK_BALANCE') {
      const msg = 'For your security, your wallet balance will not be read aloud. It is displayed on your dashboard.';
      setResponse(msg);
      AccessibilityManager.speak(msg);
      setTimeout(() => router.back(), 3000);
    } 
    else if (intent.action === 'TOP_UP') {
      const msg = 'Navigating to Top Up.';
      setResponse(msg);
      AccessibilityManager.speak(msg);
      // In a real app we might route to a specific top up screen
      setTimeout(() => router.back(), 2000);
    } 
    else if (intent.action === 'SEND_MONEY') {
      const amtText = intent.amount ? `${intent.amount} dollars` : 'money';
      const recText = intent.recipient ? ` to ${intent.recipient}` : '';
      const msg = `Preparing transfer of ${amtText}${recText}. Please enter your secure PIN to confirm.`;
      
      setResponse(msg);
      AccessibilityManager.speak(msg);

      setTimeout(() => {
        router.push({
          pathname: '/(app)/send',
          params: { amount: intent.amount, recipient: intent.recipient }
        });
      }, 2500);
    } 
    else if (intent.action === 'TRANSACTION_HISTORY') {
      const count = intent.count || 3;
      
      if (!transactions || transactions.length === 0) {
        const msg = 'You have no recent transactions.';
        setResponse(msg);
        AccessibilityManager.speak(msg);
      } else {
        const recent = transactions.slice(0, count);
        const textParts = recent.map((t: any) => {
          const typeStr = t.transaction_type === 'DEBIT' ? 'Sent' : 'Received';
          const desc = t.description ? t.description.replace('Payment to ', '') : 'payment';
          return `${typeStr} ${t.amount} dollars ${t.transaction_type === 'DEBIT' ? 'to' : 'from'} ${desc}`;
        });
        
        const msg = `Here are your last ${recent.length} payments. ${textParts.join('. ')}`;
        setResponse(msg);
        AccessibilityManager.speak(msg);
      }
    } 
    else {
      const msg = 'I did not understand that command. Try saying "Pay Ravi 50 dollars".';
      setResponse(msg);
      HapticEngine.error();
      AccessibilityManager.speak(msg);
    }

    setCommand('');
  };

  return (
    <ScreenWrapper>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingVertical: 20 }} keyboardShouldPersistTaps="handled">
          <View className="mb-6 flex-row justify-between items-center">
             <Text accessibilityRole="header" className="text-3xl font-bold text-text">AI Assistant</Text>
             <TouchableOpacity onPress={() => router.back()} className="px-5 py-2 bg-surface rounded-full border border-primary/50">
               <Text className="text-primary font-bold text-base">Close</Text>
             </TouchableOpacity>
          </View>

          <View className="bg-surface p-6 rounded-2xl border border-[#333] mb-8 min-h-[150px] justify-center items-center">
            <Text className="text-xl text-primary text-center font-bold">
              {response}
            </Text>
          </View>

          <View className="mt-auto">
            <Text className="text-textMuted mb-2">Type or dictate a command:</Text>
            <TextInput
              className="bg-surface text-text border border-[#444] rounded-xl px-4 py-4 text-lg mb-4"
              placeholder="e.g. Pay Ravi 50 dollars"
              placeholderTextColor="#666"
              value={command}
              onChangeText={setCommand}
              onSubmitEditing={processCommand}
              returnKeyType="send"
            />
            <Button title="Process Command" onPress={processCommand} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}
