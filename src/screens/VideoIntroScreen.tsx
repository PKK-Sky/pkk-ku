import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

interface VideoIntroScreenProps {
  onFinish: () => void;
}

export default function VideoIntroScreen({ onFinish }: VideoIntroScreenProps) {
  const videoRef = useRef<Video>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const playVideo = async () => {
      if (videoRef.current) {
        await videoRef.current.playAsync();
      }
    };

    if (isReady) {
      playVideo();
    }
  }, [isReady]);

  const handlePlaybackStatusUpdate = (status: any) => {
    if (status.didJustFinish) {
      onFinish();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Video
        ref={videoRef}
        source={require('../../assets/videos/splash-intro.mp4')}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay={false}
        isLooping={false}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
        onLoad={() => setIsReady(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e0f7fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: width,
    height: height,
  },
});
