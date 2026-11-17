import { StyleSheet, Text, View } from "react-native";
import type { Page } from "../data/pages";

export default function Hero({
	page,
	color,
	ink,
}: {
	page: Page;
	color: string;
	ink: string;
}) {
	return (
		<View style={[styles.hero, { backgroundColor: color, shadowColor: color }]}>
			<View style={styles.emojiBox}>
				<Text style={styles.emoji}>{page.emoji}</Text>
			</View>
			<Text style={[styles.title, { color: ink }]}>{page.title}</Text>
			<Text style={[styles.text, { color: ink }]}>{page.text}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	hero: {
		padding: 22,
		borderRadius: 24,
		marginBottom: 8,
		shadowOpacity: 0.35,
		shadowRadius: 14,
		shadowOffset: { width: 0, height: 8 },
		elevation: 6,
	},
	emojiBox: {
		width: 54,
		height: 54,
		borderRadius: 16,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(255,255,255,0.85)",
	},
	emoji: { fontSize: 28 },
	title: { fontSize: 28, fontWeight: "800", marginTop: 12 },
	text: { fontSize: 15, marginTop: 4, opacity: 0.9 },
});
