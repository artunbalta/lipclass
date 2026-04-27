import { useState, useEffect } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useWindowDimensions } from 'react-native';

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    // Unlock orientation so this screen can rotate
    ScreenOrientation.unlockAsync();

    // Check initial orientation
    ScreenOrientation.getOrientationAsync().then((orientation) => {
      const isLandscape = 
        orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
        orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
      setIsFullscreen(isLandscape);
    });

    const subscription = ScreenOrientation.addOrientationChangeListener((evt) => {
      const isLandscape = 
        evt.orientationInfo.orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
        evt.orientationInfo.orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
      setIsFullscreen(isLandscape);
    });

    return () => {
      ScreenOrientation.removeOrientationChangeListener(subscription);
      // Lock back to portrait when leaving the screen
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  const toggleFullscreen = async () => {
    if (isFullscreen) {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      // Optional: unlock after setting to portrait so user can rotate again
      setTimeout(() => {
        ScreenOrientation.unlockAsync();
      }, 500);
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      setTimeout(() => {
        ScreenOrientation.unlockAsync();
      }, 500);
    }
  };

  return { isFullscreen, toggleFullscreen, width, height };
}
