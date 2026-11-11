import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity, TextInput, AppState } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { Button } from '../../components/Button';
import { PinEntry } from '../../components/PinEntry';
import { useProcessPaymentMutation } from '../../services/walletApi';
import { AccessibilityManager } from '../../services/accessibilityManager';
import { HapticEngine } from '../../services/braille/HapticEngine';
import { router, useLocalSearchParams } from 'expo-router';
import { ScreenIdentity, useFocusManager, TactileElement } from '../../services/navigation/NavigationEngine';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { RecoveryEngine } from '../../services/wallet/RecoveryEngine';
import { ContactService, AppContact } from '../../services/contacts/ContactService';
import { BrailleKeyboard } from '../../components/BrailleKeyboard';

type Step = 'VERIFY_MERCHANT' | 'RECIPIENT' | 'AMOUNT' | 'PIN' | 'CONFIRM' | 'SUCCESS';

const FAVORITES = ['Mom', 'Dad', 'Rahul'];
const RECENTS = ['Priya', 'Anitha', 'Ravi'];

export default function SendMoneyScreen() {
  const accessibility = useSelector((state: RootState) => state.accessibility);
  const params = useLocalSearchParams<{ step?: Step; amount?: string; recipient?: string; fromQR?: string }>();
  
  const [step, setStep] = useState<Step>(params.step || (params.fromQR ? 'VERIFY_MERCHANT' : 'RECIPIENT'));
  const [amount, setAmount] = useState<number>(params.amount ? parseFloat(params.amount) : 0);
  const [recipient, setRecipient] = useState<string>(params.recipient || '');
  const [pin, setPin] = useState('');
  
  const [isBrailleKeyboardOpen, setIsBrailleKeyboardOpen] = useState(false);
  const [activeKeyboardMode, setActiveKeyboardMode] = useState<'alpha' | 'numeric'>('alpha');
  const [searchName, setSearchName] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [contacts, setContacts] = useState<AppContact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<AppContact[]>([]);
  
  const { setScreenName, setNavState, navState } = useFocusManager();
  const [processPayment, { isLoading }] = useProcessPaymentMutation();
  const searchInputNameRef = useRef<any>(null);
  const searchInputPhoneRef = useRef<any>(null);
  const appState = useRef(AppState.currentState);
  const hasHandledParams = useRef(false);

  // Initial params handling for normal flows (e.g. from QR Scanner)
  useEffect(() => {
    if (params.recipient && !params.step && !hasHandledParams.current) {
      hasHandledParams.current = true;
      setRecipient(params.recipient);
      if (params.fromQR) {
        setStep('VERIFY_MERCHANT');
      } else {
        setStep('AMOUNT');
      }
    }
  }, [params]);

  // Interruption Recovery Engine: AppState Listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current?.match(/active/) &&
        nextAppState.match(/inactive|background/)
      ) {
        // App went to background (e.g. phone call). Save checkpoint securely!
        if (step !== 'SUCCESS') {
          RecoveryEngine.saveCheckpoint({
            step,
            recipient,
            amount,
          });
          // Explicitly wipe PIN from memory for security
          setPin('');
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [step, recipient, amount]);

  useEffect(() => {
    if (step === 'RECIPIENT') {
      setScreenName('sendMoney');
      ScreenIdentity.announce('sendMoney');
    } else if (step === 'VERIFY_MERCHANT') {
      setScreenName('verifyMerchant');
      if (accessibility.capabilities.needsVoice) {
        AccessibilityManager.speak(`Verify Merchant. You are paying ${recipient}. Double tap to confirm.`);
      }
      if (accessibility.profile === 'deaf-blind') {
         // Optionally, we could trigger SBRE to automatically spell the merchant name
      }
    } else if (step === 'AMOUNT') {
      setScreenName('amountBuilder');
      if (accessibility.capabilities.needsVoice) {
        AccessibilityManager.speak(`Selected ${recipient}. Build amount.`);
      }
    } else if (step === 'PIN') {
      setScreenName('pin');
      ScreenIdentity.announce('pin');
      if (accessibility.capabilities.needsVoice) {
        AccessibilityManager.speak(`Enter PIN to send ${amount} dollars to ${recipient}.`);
      } else if (accessibility.capabilities.needsHaptics) {
        // Enqueue a spatial reminder sequence (e.g. 3 distinct taps meaning "Security Check")
        HapticEngine.enqueue(async () => {
          await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Heavy, 300);
          await HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Light, 300);
        }, 'pin_context_alert');
      }
    } else if (step === 'CONFIRM') {
      setScreenName('confirmPayment');
      if (accessibility.capabilities.needsVoice) {
        AccessibilityManager.speak(`Are you sure you want to send ${amount} dollars to ${recipient}? Double tap confirm to proceed.`);
      }
    }
  }, [step, setScreenName, recipient, accessibility.capabilities.needsVoice]);

  useEffect(() => {
    if (pin.length === accessibility.pinLength && step === 'PIN') {
      if (accessibility.capabilities.needsExtraConfirmation && accessibility.primaryInputMethod !== 'braille') {
        setStep('CONFIRM');
      } else {
        handlePayment();
      }
    }
  }, [pin, accessibility.pinLength, accessibility.capabilities.needsExtraConfirmation, accessibility.primaryInputMethod, step]);

  useEffect(() => {
    if (params.amount) setAmount(Number(params.amount));
    if (params.recipient && !hasHandledParams.current) {
      // Handled by the first useEffect
    }
  }, [params.amount, params.recipient]);

  useEffect(() => {
    const fetchContacts = async () => {
      const fetched = await ContactService.getContacts();
      setContacts(fetched);
    };
    fetchContacts();
  }, []);

  const handleSearchName = (text: string) => {
    setSearchName(text);
    if (text.length > 0) {
      const filtered = contacts.filter(c => 
        c.name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredContacts(filtered);
    } else {
      setFilteredContacts([]);
    }
  };

  const handleSearchPhone = (text: string) => {
    setSearchPhone(text);
    if (text.length > 0) {
      const filtered = contacts.filter(c => 
        (c.phoneNumber && c.phoneNumber.includes(text))
      );
      setFilteredContacts(filtered);
    } else {
      setFilteredContacts([]);
    }
  };

  const handleSelectRecipient = (nameOrNumber: string) => {
    // Validate if it's a raw number being entered manually
    const isNumeric = /^\d+$/.test(nameOrNumber.replace(/\D/g, ''));
    if (isNumeric && nameOrNumber.replace(/\D/g, '').length < 10 && contacts.findIndex(c => c.name === nameOrNumber) === -1) {
      if (accessibility.profile === 'deaf-blind') {
        HapticEngine.longError();
      }
      if (accessibility.capabilities.needsVoice) {
        AccessibilityManager.speak('The entered mobile number is invalid.');
      }
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    
    HapticEngine.tap();
    setRecipient(nameOrNumber);
    setStep('AMOUNT');
  };
  
  const handleAmountChange = (change: number) => {
    if (navState === 'PROCESSING') return;
    setAmount(prev => {
      const newAmount = Math.max(0, prev + change);
      
      if (accessibility.capabilities.needsVoice) {
        AccessibilityManager.speak(`${newAmount} Dollars`);
      }
      if (accessibility.capabilities.needsHaptics) {
        HapticEngine.playFeedback(Haptics.ImpactFeedbackStyle.Light);
      }
      
      return newAmount;
    });
  };

  const handleNextToPin = () => {
    if (navState === 'PROCESSING') return;
    HapticEngine.tap();
    if (amount <= 0) {
      HapticEngine.error();
      if (accessibility.capabilities.needsVoice) {
        AccessibilityManager.speak('Amount must be greater than zero.');
      }
      return;
    }
    setStep('PIN');
    if (accessibility.capabilities.needsVoice) {
      AccessibilityManager.speak(`Enter PIN to confirm payment of ${amount} dollars`);
    }
  };

  const handlePayment = async () => {
    if (navState === 'PROCESSING' || isLoading) return;
    HapticEngine.confirmPulse();
    if (pin.length !== accessibility.pinLength) {
      HapticEngine.error();
      if (accessibility.capabilities.needsVoice) {
        AccessibilityManager.speak(`Please enter your ${accessibility.pinLength} digit PIN.`);
      }
      return;
    }
    
    setNavState('PROCESSING');
    
    // Verify PIN against SecureStore
    try {
      const savedPin = await SecureStore.getItemAsync('transaction_pin');
      if (pin !== savedPin) {
        if (accessibility.profile === 'deaf-blind') {
          HapticEngine.longError();
        }
        if (accessibility.capabilities.needsVoice) {
          AccessibilityManager.speak('Wrong PIN entered. Payment denied.');
        }
        Alert.alert('Payment Failed', 'Wrong PIN entered.');
        setPin('');
        setNavState('INPUT');
        return; // Reject payment
      }
    } catch (e) {
      console.error('Failed to verify PIN', e);
    }
    
    let heartbeatInterval: any = null;

    try {
      if (accessibility.capabilities.needsVoice) {
        AccessibilityManager.speak('Processing Payment...');
      }
      if (accessibility.profile === 'deaf-blind') {
        HapticEngine.heartbeat();
        // Set up active loop: pulse heartbeat every 2 seconds
        heartbeatInterval = setInterval(() => {
          HapticEngine.heartbeat();
        }, 2000);
      }

      await processPayment({
        amount: amount.toString(),
        description: `Payment to ${recipient}`,
        pin
      }).unwrap();
      
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      
      // Payment successful, clear the recovery checkpoint
      RecoveryEngine.clearCheckpoint();

      setStep('SUCCESS');
      setNavState('NAVIGATION');
      
      // Success Confirmation: Trigger the unique "Success Melody" (Buzz -> Pause -> Buzz Buzz)
      if (accessibility.profile === 'deaf-blind') {
        HapticEngine.successMelody();
      }
      if (accessibility.capabilities.needsVoice) {
        AccessibilityManager.speak(`Payment successful. ${amount} dollars sent.`);
      }
    } catch (err: any) {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      setNavState('INPUT');
      if (accessibility.profile === 'deaf-blind') {
        HapticEngine.longError();
      }
      const errorMsg = err?.data?.error || 'An error occurred during payment.';
      if (accessibility.capabilities.needsVoice) {
        AccessibilityManager.speak(`Payment failed. ${errorMsg}`);
      }
      Alert.alert('Payment Failed', errorMsg);
      setPin('');
      setStep('PIN');
    }
  };

  if (step === 'SUCCESS') {
    return (
      <ScreenWrapper>
        <View className="flex-1 justify-center items-center px-4">
          <View className="w-24 h-24 rounded-full bg-primary items-center justify-center mb-8">
            <Text className="text-5xl">✓</Text>
          </View>
          <Text accessibilityRole="header" className="text-4xl font-bold text-text mb-4 text-center">Payment Successful!</Text>
          <Text className="text-textMuted text-lg mb-8 text-center">
            ${amount.toFixed(2)} sent securely to {recipient}.
          </Text>
          <TactileElement id="btn_back_dashboard" label="Back to Dashboard" description="Return to main menu" type="button" priority={1} onPress={() => { setNavState('NAVIGATION'); router.replace('/(app)/dashboard'); }} className="w-full">
            <Button title="Back to Dashboard" onPress={() => { setNavState('NAVIGATION'); router.replace('/(app)/dashboard'); }} />
          </TactileElement>
        </View>
      </ScreenWrapper>
    );
  }

  if (step === 'VERIFY_MERCHANT') {
    return (
      <ScreenWrapper>
        <View className="flex-1 px-4">
          <View className="mb-6 mt-4 flex-row justify-between items-center">
             <Text accessibilityRole="header" className="text-3xl font-bold text-text">Verify Merchant</Text>
             <TactileElement id="btn_verify_cancel" label="Cancel" description="Go back to Dashboard" type="button" priority={1} onPress={() => { HapticEngine.tap(); router.replace('/(app)/dashboard'); }}>
               <TouchableOpacity onPress={() => router.replace('/(app)/dashboard')} className="px-5 py-2 bg-surface rounded-full border border-primary/50">
                 <Text className="text-primary font-bold text-base">Cancel</Text>
               </TouchableOpacity>
             </TactileElement>
          </View>
          
          <View className="flex-1 justify-center items-center">
            <View className="bg-surface rounded-3xl p-8 border-2 border-primary mb-12 items-center w-full shadow-lg shadow-primary/20">
              <View className="w-20 h-20 rounded-full bg-primary/20 items-center justify-center mb-6">
                <Text className="text-4xl">🏪</Text>
              </View>
              <Text className="text-textMuted text-xl mb-4 text-center">Paying to Merchant</Text>
              <Text className="text-4xl font-bold text-primary mb-2 text-center">{recipient}</Text>
              {accessibility.profile === 'deaf-blind' && (
                 <Text className="text-textMuted text-center mt-4">Review name using SBRE then double tap to proceed.</Text>
              )}
            </View>

            <TactileElement id="btn_verify_confirm" label={`Confirm Merchant ${recipient}`} description="Proceed to Amount" type="button" priority={2} onPress={() => {
               HapticEngine.confirmPulse();
               setStep('AMOUNT');
            }} className="w-full">
              <TouchableOpacity onPress={() => { HapticEngine.confirmPulse(); setStep('AMOUNT'); }} className="w-full bg-primary py-5 rounded-2xl items-center shadow-lg shadow-primary/30">
                <Text className="text-[#121212] font-bold text-2xl">Confirm Merchant</Text>
              </TouchableOpacity>
            </TactileElement>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  if (step === 'CONFIRM') {
    return (
      <ScreenWrapper>
        <View className="flex-1 px-4">
          <View className="mb-6 mt-4 flex-row justify-between items-center">
             <Text accessibilityRole="header" className="text-3xl font-bold text-text">Review</Text>
             <TactileElement id="btn_confirm_cancel" label="Cancel" description="Go back to PIN entry" type="button" priority={1} onPress={() => { if (navState === 'PROCESSING') return; HapticEngine.tap(); setPin(''); setStep('PIN'); }}>
               <TouchableOpacity disabled={navState === 'PROCESSING'} onPress={() => { if (navState === 'PROCESSING') return; setPin(''); setStep('PIN'); }} className={`px-5 py-2 bg-surface rounded-full border border-primary/50 ${navState === 'PROCESSING' ? 'opacity-50' : ''}`}>
                 <Text className="text-primary font-bold text-base">Cancel</Text>
               </TouchableOpacity>
             </TactileElement>
          </View>
          
          <View className="flex-1 justify-center">
            <View className="bg-surface rounded-3xl p-6 border-4 border-primary mb-8 items-center">
              <Text className="text-textMuted text-xl mb-4">You are sending</Text>
              <Text className="text-6xl font-bold text-primary mb-6">${amount}</Text>
              <Text className="text-textMuted text-xl mb-2">to</Text>
              <Text className="text-3xl font-bold text-text">{recipient}</Text>
            </View>

            <TactileElement id="btn_final_confirm" label="Confirm Payment" description="Finalize the transaction" type="button" priority={2} onPress={handlePayment} className="w-full">
              <TouchableOpacity disabled={navState === 'PROCESSING'} onPress={handlePayment} className={`w-full bg-primary py-5 rounded-2xl items-center shadow-lg shadow-primary/30 ${navState === 'PROCESSING' ? 'opacity-50' : ''}`}>
                <Text className="text-[#121212] font-bold text-2xl">Confirm & Send</Text>
              </TouchableOpacity>
            </TactileElement>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  if (step === 'PIN') {
    return (
      <ScreenWrapper>
        <View className="flex-1">
          {accessibility.primaryInputMethod !== 'braille' && (
            <>
              <View className="mb-6 mt-4 flex-row justify-between items-center px-4">
                 <Text accessibilityRole="header" className="text-3xl font-bold text-text">Enter PIN</Text>
                 <TactileElement id="btn_pin_back" label="Back" description="Change amount" type="button" priority={1} onPress={() => { if (navState === 'PROCESSING') return; HapticEngine.tap(); setPin(''); setStep('AMOUNT'); }}>
                   <TouchableOpacity disabled={navState === 'PROCESSING'} onPress={() => { if (navState === 'PROCESSING') return; setPin(''); setStep('AMOUNT'); }} className={`px-5 py-2 bg-surface rounded-full border border-primary/50 ${navState === 'PROCESSING' ? 'opacity-50' : ''}`}>
                     <Text className="text-primary font-bold text-base">Back</Text>
                   </TouchableOpacity>
                 </TactileElement>
              </View>
              
              <Text className="text-textMuted text-lg mb-8 text-center">
                Confirm payment of ${amount.toFixed(2)} to {recipient}
              </Text>
            </>
          )}
          
          <View className="flex-1 w-full">
            <PinEntry pin={pin} onPinChange={setPin} maxLength={accessibility.pinLength} onBack={() => { if (navState !== 'PROCESSING') { setPin(''); setStep('AMOUNT'); } }} />
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  const handleAmountBack = () => {
    HapticEngine.tap();
    if (params.recipient) {
      router.replace('/(app)/dashboard');
    } else {
      setStep('RECIPIENT');
    }
  };

  if (step === 'AMOUNT') {
    return (
      <ScreenWrapper>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingVertical: 20 }} scrollEnabled={!accessibility.capabilities.needsSimplifiedNavigation}>
          <View className="mb-6 flex-row justify-between items-center px-4">
             <Text accessibilityRole="header" className="text-3xl font-bold text-text">Amount</Text>
             <TactileElement id="btn_amt_back" label="Back" description="Change recipient or exit" type="button" priority={1} onPress={handleAmountBack}>
               <TouchableOpacity onPress={handleAmountBack} className="px-5 py-2 bg-surface rounded-full border border-primary/50">
                 <Text className="text-primary font-bold text-base">Back</Text>
               </TouchableOpacity>
             </TactileElement>
          </View>

          <View className="items-center justify-center my-8">
            <Text className="text-textMuted text-lg mb-2">Sending to {recipient}</Text>
            <Text className="text-6xl font-bold text-primary">${amount}</Text>
          </View>

          <View className="px-4">
            <View className="flex-row justify-between mb-4">
              <View className="flex-1 mr-2">
                <TactileElement id="btn_add_10" label="Add 10" description="Increase amount" type="button" priority={2} onPress={() => handleAmountChange(10)}>
                  <Button title="+$10" onPress={() => handleAmountChange(10)} className="mb-0" />
                </TactileElement>
              </View>
              <View className="flex-1 ml-2">
                <TactileElement id="btn_sub_10" label="Subtract 10" description="Decrease amount" type="button" priority={3} onPress={() => handleAmountChange(-10)}>
                  <Button title="-$10" onPress={() => handleAmountChange(-10)} variant="outline" className="mb-0" />
                </TactileElement>
              </View>
            </View>

            <View className="flex-row justify-between mb-4">
              <View className="flex-1 mr-2">
                <TactileElement id="btn_add_50" label="Add 50" description="Increase amount" type="button" priority={4} onPress={() => handleAmountChange(50)}>
                  <Button title="+$50" onPress={() => handleAmountChange(50)} className="mb-0" />
                </TactileElement>
              </View>
              <View className="flex-1 ml-2">
                <TactileElement id="btn_sub_50" label="Subtract 50" description="Decrease amount" type="button" priority={5} onPress={() => handleAmountChange(-50)}>
                  <Button title="-$50" onPress={() => handleAmountChange(-50)} variant="outline" className="mb-0" />
                </TactileElement>
              </View>
            </View>

            <View className="flex-row justify-between mb-8">
              <View className="flex-1 mr-2">
                <TactileElement id="btn_add_100" label="Add 100" description="Increase amount" type="button" priority={6} onPress={() => handleAmountChange(100)}>
                  <Button title="+$100" onPress={() => handleAmountChange(100)} className="mb-0" />
                </TactileElement>
              </View>
              <View className="flex-1 ml-2">
                <TactileElement id="btn_sub_100" label="Subtract 100" description="Decrease amount" type="button" priority={7} onPress={() => handleAmountChange(-100)}>
                  <Button title="-$100" onPress={() => handleAmountChange(-100)} variant="outline" className="mb-0" />
                </TactileElement>
              </View>
            </View>

            <TactileElement id="btn_amt_next" label="Next" description="Proceed to PIN" type="button" priority={8} onPress={handleNextToPin}>
              <Button title="Next" onPress={handleNextToPin} disabled={amount <= 0} />
            </TactileElement>
          </View>
        </ScrollView>
      </ScreenWrapper>
    );
  }

  if (isBrailleKeyboardOpen) {
    return (
      <ScreenWrapper>
        <BrailleKeyboard 
          text={activeKeyboardMode === 'alpha' ? searchName : searchPhone} 
          onChangeText={activeKeyboardMode === 'alpha' ? handleSearchName : handleSearchPhone} 
          onClose={() => setIsBrailleKeyboardOpen(false)} 
          placeholder={activeKeyboardMode === 'alpha' ? "Search contacts by name..." : "Enter phone number..."}
          mode={activeKeyboardMode}
        />
      </ScreenWrapper>
    );
  }

  // RECIPIENT Step (Default)
  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingVertical: 20 }} scrollEnabled={!accessibility.capabilities.needsSimplifiedNavigation}>
        <View className="mb-6 flex-row justify-between items-center px-4">
           <Text accessibilityRole="header" className="text-3xl font-bold text-text">Select Recipient</Text>
           <TactileElement id="btn_nav_back" label="Back" description="Go to Dashboard" type="button" priority={1} onPress={() => { HapticEngine.tap(); router.replace('/(app)/dashboard'); }}>
             <TouchableOpacity onPress={() => router.replace('/(app)/dashboard')} className="px-5 py-2 bg-surface rounded-full border border-primary/50">
               <Text className="text-primary font-bold text-base">Back</Text>
             </TouchableOpacity>
           </TactileElement>
        </View>

        <View className="px-4 mb-3">
          <TactileElement id="input_search_name" label="Search by Name" description="Use Braille Keyboard in Alphabet mode" type="input" priority={2} onPress={() => { 
            HapticEngine.tap(); 
            setActiveKeyboardMode('alpha');
            if (accessibility.primaryInputMethod === 'braille') {
              setIsBrailleKeyboardOpen(true);
            } else {
              searchInputNameRef.current?.focus(); 
            }
          }}>
            <TextInput
              ref={searchInputNameRef}
              className="w-full bg-surface border border-[#333] rounded-xl px-4 py-4 text-text text-xl"
              placeholder="Search by Name..."
              placeholderTextColor="#666"
              value={searchName}
              onChangeText={handleSearchName}
              keyboardType="default"
              accessibilityLabel="Search contacts by name"
              accessibilityHint="Double tap to open keyboard"
            />
          </TactileElement>
        </View>

        <View className="px-4 mb-6">
          <TactileElement id="input_search_phone" label="Search by Phone Number" description="Use Braille Keyboard in Numeric mode" type="input" priority={2.5} onPress={() => { 
            HapticEngine.tap(); 
            setActiveKeyboardMode('numeric');
            if (accessibility.primaryInputMethod === 'braille') {
              setIsBrailleKeyboardOpen(true);
            } else {
              searchInputPhoneRef.current?.focus(); 
            }
          }}>
            <TextInput
              ref={searchInputPhoneRef}
              className="w-full bg-surface border border-[#333] rounded-xl px-4 py-4 text-text text-xl"
              placeholder="Enter Phone Number..."
              placeholderTextColor="#666"
              value={searchPhone}
              onChangeText={handleSearchPhone}
              keyboardType="phone-pad"
              accessibilityLabel="Search by phone number"
              accessibilityHint="Double tap to open keyboard"
            />
          </TactileElement>
        </View>

        <View className="px-4">
          {searchName.length > 0 || searchPhone.length > 0 ? (
            <>
              <Text className="text-xl font-bold text-primary mb-4 mt-2">Search Results</Text>
              
              {/* Allow Manual Phone Number Entry if numeric */}
              {searchPhone.length > 0 && /^\d+$/.test(searchPhone.replace(/\D/g, '')) && (
                <TactileElement id="btn_manual_number" label={`Pay ${searchPhone}`} description="Send to manual number" type="button" priority={3} onPress={() => handleSelectRecipient(searchPhone)} className="bg-primary/20 p-4 rounded-xl border border-primary/50 mb-3">
                  <Text className="text-primary font-bold text-xl">Pay: {searchPhone}</Text>
                </TactileElement>
              )}

              {filteredContacts.map((contact, index) => (
                <TactileElement key={`contact_${contact.id}`} id={`contact_${contact.id}`} label={contact.name} description={contact.phoneNumber || 'Contact'} type="listItem" priority={4 + index} onPress={() => handleSelectRecipient(contact.name)} className="bg-surface p-4 rounded-xl border border-[#333] mb-3">
                  <Text className="text-text font-bold text-xl">{contact.name}</Text>
                  {contact.phoneNumber && <Text className="text-textMuted mt-1">{contact.phoneNumber}</Text>}
                </TactileElement>
              ))}
              {filteredContacts.length === 0 && !/^\d+$/.test(searchPhone.replace(/\D/g, '')) && (
                <Text className="text-textMuted text-center mt-4 text-lg">No contacts found.</Text>
              )}
            </>
          ) : (
            <>
              <Text className="text-xl font-bold text-textMuted mb-4">Recent Contacts</Text>
              {RECENTS.map((contact, index) => (
                <TactileElement key={`rec_${contact}`} id={`rec_${contact}`} label={contact} description="Recent contact" type="listItem" priority={10 + index} onPress={() => handleSelectRecipient(contact)} className="bg-[#1a1a1a] p-4 rounded-xl border border-[#222] mb-3">
                  <Text className="text-text text-lg">{contact}</Text>
                </TactileElement>
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
