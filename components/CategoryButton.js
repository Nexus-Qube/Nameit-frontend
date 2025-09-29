import React from 'react';
import { Button, View, StyleSheet } from 'react-native';

export default function CategoryButton({ title, onPress }) {
  return (
    <View style={styles.buttonContainer}>
      <Button title={title} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  buttonContainer: { marginVertical: 10, width: '80%' },
});