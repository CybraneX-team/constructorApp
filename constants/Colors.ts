/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const newtintColorLight = '#000';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    new: newtintColorLight,
    icon: '#000',
    tabIconDefault: '#000',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#000',
    background: '#000',
    tint: tintColorDark,
    icon: '#000',
    tabIconDefault: '#000',
    tabIconSelected: tintColorDark,
  },
};
