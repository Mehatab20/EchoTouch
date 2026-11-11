import React, { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { ScreenWrapper } from '../../components/ScreenWrapper';
import { QRScanner } from '../../components/QRScanner';
import { ScreenIdentity, useFocusManager } from '../../services/navigation/NavigationEngine';

export default function ScanScreen() {
  const { setScreenName } = useFocusManager();

  useEffect(() => {
    setScreenName('scan');
    // We reuse the learn pattern or a unique scan pattern to identify this screen
    ScreenIdentity.announce('learn');
  }, [setScreenName]);

  const handleScanSuccess = (data: string) => {
    let merchantName = data;

    // Parse UPI URLs (e.g. from PhonePe, GPay, Paytm)
    // Format: upi://pay?pa=merchant@upi&pn=Merchant%20Name
    if (data.toLowerCase().startsWith('upi://')) {
      try {
        // React Native's URLSearchParams can be unreliable with deep links, so we use regex
        const pnMatch = data.match(/[?&]pn=([^&]+)/);
        const paMatch = data.match(/[?&]pa=([^&]+)/);
        
        const payeeName = pnMatch ? pnMatch[1] : null;
        const payeeAddress = paMatch ? paMatch[1] : null;
        
        if (payeeName) {
          // Replace + with space if they exist, then decode URI components
          merchantName = decodeURIComponent(payeeName.replace(/\+/g, '%20'));
        } else if (payeeAddress) {
          merchantName = payeeAddress;
        } else {
          merchantName = "UPI Merchant";
        }
      } catch (e) {
        console.warn("Failed to parse UPI URL", e);
        merchantName = "UPI Merchant";
      }
    }

    router.replace({ pathname: '/(app)/send', params: { recipient: merchantName, fromQR: 'true' } });
  };

  const handleCancel = () => {
    router.replace('/(app)/dashboard');
  };

  return (
    <ScreenWrapper>
      <View style={{ flex: 1 }}>
        <QRScanner 
          onScanSuccess={handleScanSuccess} 
          onCancel={handleCancel} 
        />
      </View>
    </ScreenWrapper>
  );
}
