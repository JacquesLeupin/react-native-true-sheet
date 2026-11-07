import { useRef, useState } from 'react';
import { Keyboard, Platform, StyleSheet, Text, View, type TextInput } from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';

import { BLUE, DARK, GAP, LIGHT_GRAY, SPACING } from '../utils';
import { Button, Input } from '../components';

// The present hangs only when the keyboard starts in the frame the slide ends, so Run moves
// the focus later each time until the keyboard starts there
const MAX_FOCUS_DELAY = 600;
const FOCUS_DELAY_STEP = 8;
// A present that finishes fires onDidPresent well before this
const DID_PRESENT_TIMEOUT = 2000;
const HUNG_HOLD = 5000;
// The last attempt's keyboard must be gone, or its hide reconfigures the next present
const KEYBOARD_SETTLE = 600;
const MAX_LOGS = 14;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const keyboardHidden = () =>
  new Promise<void>((resolve) => {
    if (!Keyboard.isVisible()) {
      resolve();
      return;
    }
    const subscription = Keyboard.addListener('keyboardDidHide', () => {
      subscription.remove();
      resolve();
    });
  });

export const PresentKeyboardScreen = () => {
  const sheet = useRef<TrueSheet>(null);
  const input = useRef<TextInput>(null);
  const focusDelay = useRef(0);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onPresented = useRef<(() => void) | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [attempt, setAttempt] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const log = (line: string) => {
    console.log(`[present-keyboard] ${line}`);
    setLogs((prev) => [line, ...prev].slice(0, MAX_LOGS));
  };

  // Resolves with the time to onDidPresent, or null when it never comes
  const present = async (delay: number) => {
    focusDelay.current = delay;
    const presented = new Promise<true>((resolve) => {
      onPresented.current = () => resolve(true);
    });
    const start = Date.now();
    sheet.current?.present();
    const didPresent = await Promise.race([presented, wait(DID_PRESENT_TIMEOUT).then(() => false)]);
    onPresented.current = null;
    return didPresent ? Date.now() - start : null;
  };

  const run = async () => {
    setIsRunning(true);
    setLogs([]);

    for (let delay = 0; delay <= MAX_FOCUS_DELAY; delay += FOCUS_DELAY_STEP) {
      setAttempt(`Focus after ${delay} ms`);
      const elapsed = await present(delay);

      if (elapsed === null) {
        log(`focus +${delay} ms: no onDidPresent ❌`);
        await wait(HUNG_HOLD);
        await sheet.current?.dismiss();
        log(`dismissed by the repro after ${HUNG_HOLD / 1000} s`);
        setIsRunning(false);
        return;
      }

      log(`focus +${delay} ms: onDidPresent after ${elapsed} ms`);
      // A focus still pending can't hang this present anymore
      if (focusTimer.current) clearTimeout(focusTimer.current);
      await sheet.current?.dismiss();
      await wait(KEYBOARD_SETTLE);
      await Promise.race([keyboardHidden(), wait(DID_PRESENT_TIMEOUT)]);
    }

    log('Every present finished. Run again.');
    setIsRunning(false);
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.body}>
        Run presents a full-height sheet again and again. Its onWillPresent focuses an input a
        little later each time, so the keyboard starts at a different point of the present slide. On
        Android, when it starts in the frame the slide ends, onDidPresent never fires. Until the
        repro dismisses it, that sheet swallows every tap and back doesn't close it.
      </Text>
      <Button text={isRunning ? 'Running...' : 'Run'} disabled={isRunning} onPress={run} />
      <View style={styles.logs}>
        {logs.map((line, index) => (
          <Text key={index} style={styles.logText} numberOfLines={1}>
            {line}
          </Text>
        ))}
      </View>

      <TrueSheet
        ref={sheet}
        // The keyboard can't raise a full-height sheet, so its reconfigure keeps the slide's stop
        detents={[1]}
        backgroundColor={DARK}
        style={styles.sheet}
        onWillPresent={() => {
          focusTimer.current = setTimeout(() => input.current?.focus(), focusDelay.current);
        }}
        onDidPresent={() => onPresented.current?.()}
      >
        <Text style={styles.attempt} numberOfLines={1}>
          {attempt}
        </Text>
        <Input ref={input} placeholder="Focused from onWillPresent" />
        <Button text="Close" onPress={() => sheet.current?.dismiss()} />
      </TrueSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BLUE,
    padding: SPACING,
    gap: GAP,
  },
  body: {
    lineHeight: 22,
    color: LIGHT_GRAY,
  },
  logs: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: SPACING / 2,
    padding: SPACING / 2,
    gap: 2,
  },
  logText: {
    color: LIGHT_GRAY,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 12,
  },
  sheet: {
    padding: SPACING,
    gap: GAP,
  },
  attempt: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
