import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';

import { BLUE, DARK, DARK_BLUE, GAP, LIGHT_GRAY, SPACING } from '../utils';
import { Button, Input } from '../components';

const MAX_LOGS = 10;

interface ProbeButtonProps {
  label: string;
  onLog: (line: string) => void;
}

// Logs what Pressability compares: the page origin `measure()` reports when the
// press starts, and the page coordinates that arrive with the touch.
const ProbeButton = ({ label, onLog }: ProbeButtonProps) => {
  const ref = useRef<View>(null);
  const moved = useRef(false);

  return (
    <Pressable
      ref={ref}
      style={({ pressed }) => [styles.probe, pressed && styles.probePressed]}
      onTouchStart={(e) => {
        moved.current = false;
        onLog(`${label} touchStart  pageY ${e.nativeEvent.pageY.toFixed(1)}`);
      }}
      onTouchMove={(e) => {
        // The first move is the one that matters; later ones would flood the log.
        if (moved.current) return;
        moved.current = true;
        onLog(`${label} touchMove   pageY ${e.nativeEvent.pageY.toFixed(1)}`);
      }}
      onPressIn={() => {
        onLog(`${label} pressIn`);
        ref.current?.measure((_x, _y, _w, h, _px, py) =>
          onLog(`${label} measure     pageY ${py.toFixed(1)} height ${h.toFixed(1)}`)
        );
      }}
      onPressOut={() => onLog(`${label} pressOut`)}
      onPress={() => onLog(`${label} onPress ✅`)}
    >
      <Text style={styles.probeText}>{label}</Text>
    </Pressable>
  );
};

export const FooterKeyboardPressScreen = () => {
  const sheet = useRef<TrueSheet>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const log = (line: string) => setLogs((prev) => [line, ...prev].slice(0, MAX_LOGS));

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Footer press with keyboard open</Text>
      <Text style={styles.body}>
        Open the sheet and focus the input so the footer rises above the keyboard. Press FOOTER,
        drag a few pixels, then release: it logs pressIn and pressOut but never onPress, and
        measure() puts the button about a keyboard height below the touch. A still tap works, and so
        does the same drag with the keyboard closed.
      </Text>
      <Button text="Open sheet" onPress={() => sheet.current?.present()} />
      <Text style={styles.body}>Platform: {Platform.OS}</Text>

      <TrueSheet
        ref={sheet}
        name="footer-keyboard-press"
        detents={[0.7]}
        backgroundColor={DARK}
        style={styles.sheet}
        footerStyle={styles.footer}
        footerOptions={{ position: 'absolute' }}
        footer={<ProbeButton label="FOOTER " onLog={log} />}
      >
        <Input placeholder="Focus me to open the keyboard" />
        <View style={styles.logs}>
          {logs.length === 0 && <Text style={styles.logText}>No events yet.</Text>}
          {logs.map((line, index) => (
            <Text key={`${line}-${index}`} style={styles.logText} numberOfLines={1}>
              {line}
            </Text>
          ))}
        </View>
        <Button text="Clear log" onPress={() => setLogs([])} />
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
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  body: {
    color: LIGHT_GRAY,
    fontSize: 13,
    lineHeight: 18,
  },
  sheet: {
    padding: SPACING,
    gap: GAP,
  },
  footer: {
    backgroundColor: DARK_BLUE,
    padding: SPACING,
  },
  probe: {
    height: SPACING * 3,
    borderRadius: SPACING,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  probePressed: {
    opacity: 0.6,
  },
  probeText: {
    color: '#fff',
    fontWeight: '600',
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
    fontSize: 11,
  },
});
