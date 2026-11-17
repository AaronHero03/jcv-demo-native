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
		<View style={[styles.hero, { backgroundColor: color }]}>
			<View style={styles.titleRow}>
				<View style={styles.emojiBox}>
					<Text style={styles.emoji}>{page.emoji}</Text>
				</View>
				<Text style={[styles.title, { color: ink }]} numberOfLines={2}>
					{page.title}
				</Text>
			</View>
			<Text style={[styles.text, { color: ink }]}>{page.text}</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	hero: {
		paddingVertical: 18,
		paddingHorizontal: 18,
		borderRadius: 20,
		gap: 10,
		marginBottom: 4,
	},
	titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
	emojiBox: {
		width: 40,
		height: 40,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(255,255,255,0.85)",
	},
	emoji: { fontSize: 20 },
	title: { flex: 1, fontSize: 22, fontWeight: "800" },
	text: { fontSize: 14, lineHeight: 20, opacity: 0.9 },
});
