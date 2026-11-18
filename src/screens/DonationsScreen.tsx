import { useState } from "react";
import {
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import Hero from "../components/Hero";
import { colors, tabTheme } from "../theme/colors";

const PRESET_AMOUNTS = [30, 50, 100, 500];
type PaymentMethod = "spei" | "apple_pay";

export default function DonationsScreen() {
	const theme = tabTheme.drawer;
	const [selectedAmount, setSelectedAmount] = useState<number>(250);
	const [customAmount, setCustomAmount] = useState<string>("");
	const [method, setMethod] = useState<PaymentMethod>("spei");
	const [feedback, setFeedback] = useState<string | null>(null);

	const effectiveAmount = customAmount.trim()
		? Number(customAmount.replace(/[^0-9]/g, "")) || 0
		: selectedAmount;

	const handleSelectPreset = (amount: number) => {
		setSelectedAmount(amount);
		setCustomAmount("");
		setFeedback(null);
	};

	const handleMockAction = (actionText: string) => {
		if (effectiveAmount <= 0) {
			setFeedback("Selecciona o ingresa un monto mayor a $0 MXN.");
			return;
		}
		setFeedback(actionText);
	};

	return (
		<ScrollView style={styles.screen} contentContainerStyle={styles.content}>
			<Hero
				page={{
					emoji: "💛",
					title: "Donativos",
					text: "Tu apoyo impulsa el análisis ciudadano independiente en Jalisco.",
				}}
				color={theme.color}
				ink={theme.ink}
			/>

			<View style={styles.card}>
				<Text style={styles.cardTitle}>¿Para qué sirve tu donación?</Text>
				<Text style={styles.bullet}>
					• <Text style={styles.bold}>Encuestas ciudadanas:</Text> financia el
					levantamiento en campo de estudios como Bienestar de Jóvenes.
				</Text>
				<Text style={styles.bullet}>
					• <Text style={styles.bold}>Datos abiertos:</Text> mantiene gratuitos
					los indicadores y comparativas por municipio del AMG.
				</Text>
				<Text style={styles.bullet}>
					• <Text style={styles.bold}>Independencia:</Text> garantiza análisis
					imparciales sin financiamiento partidista.
				</Text>
			</View>

			<View style={styles.card}>
				<Text style={styles.cardTitle}>1. Elige un monto (MXN)</Text>
				<View style={styles.amountGrid}>
					{PRESET_AMOUNTS.map((amt) => {
						const active = !customAmount.trim() && selectedAmount === amt;
						return (
							<Pressable
								key={amt}
								onPress={() => handleSelectPreset(amt)}
								style={[styles.amountPill, active && styles.amountPillActive]}
							>
								<Text
									style={[styles.amountText, active && styles.amountTextActive]}
								>
									${amt}
								</Text>
							</Pressable>
						);
					})}
				</View>
				<TextInput
					value={customAmount}
					onChangeText={(text) => {
						setCustomAmount(text.replace(/[^0-9]/g, ""));
						setFeedback(null);
					}}
					placeholder="Otro monto en MXN (ej. 350)"
					placeholderTextColor={colors.muted}
					keyboardType="numeric"
					style={styles.input}
				/>
			</View>

			<View style={styles.card}>
				<Text style={styles.cardTitle}>2. Método de pago (vista previa)</Text>
				<View style={styles.methodRow}>
					<Pressable
						onPress={() => {
							setMethod("spei");
							setFeedback(null);
						}}
						style={[
							styles.methodTab,
							method === "spei" && styles.methodTabActive,
						]}
					>
						<Text
							style={[
								styles.methodText,
								method === "spei" && styles.methodTextActive,
							]}
						>
							🏦 SPEI
						</Text>
					</Pressable>
					<Pressable
						onPress={() => {
							setMethod("apple_pay");
							setFeedback(null);
						}}
						style={[
							styles.methodTab,
							method === "apple_pay" && styles.methodTabActive,
						]}
					>
						<Text
							style={[
								styles.methodText,
								method === "apple_pay" && styles.methodTextActive,
							]}
						>
							 Apple Pay
						</Text>
					</Pressable>
				</View>

				{method === "spei" ? (
					<View style={styles.speiBox}>
						<Text style={styles.speiLine}>
							<Text style={styles.bold}>Beneficiario:</Text> Jalisco Cómo Vamos
							A.C.
						</Text>
						<Text style={styles.speiLine}>
							<Text style={styles.bold}>CLABE (demo):</Text> 0123 4567 8901 2345
							67
						</Text>
						<Text style={styles.speiLine}>
							<Text style={styles.bold}>Concepto:</Text> DONATIVO JCV
						</Text>
						<Text style={styles.speiLine}>
							<Text style={styles.bold}>Monto sugerido:</Text> $
							{effectiveAmount} MXN
						</Text>
						<Pressable
							onPress={() =>
								handleMockAction(
									`CLABE copiada (simulación). Monto registrado: $${effectiveAmount} MXN vía SPEI.`,
								)
							}
							style={styles.speiBtn}
						>
							<Text style={styles.speiBtnText}>
								Copiar CLABE y confirmar (mockup)
							</Text>
						</Pressable>
					</View>
				) : (
					<View style={styles.appleBox}>
						<Text style={styles.appleNote}>
							Donativo único por{" "}
							<Text style={styles.bold}>${effectiveAmount} MXN</Text> a Jalisco
							Cómo Vamos.
						</Text>
						<Pressable
							onPress={() =>
								handleMockAction(
									`Simulación de Apple Pay completada por $${effectiveAmount} MXN. ¡Gracias por tu apoyo!`,
								)
							}
							style={styles.applePayBtn}
						>
							<Text style={styles.applePayText}>
								 Pay · Donar ${effectiveAmount} MXN
							</Text>
						</Pressable>
					</View>
				)}

				{feedback && (
					<View style={styles.feedbackBox}>
						<Text style={styles.feedbackText}>{feedback}</Text>
					</View>
				)}
			</View>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.background },
	content: { padding: 16, gap: 12, paddingBottom: 36 },
	card: {
		padding: 16,
		borderRadius: 18,
		backgroundColor: colors.white,
		borderWidth: 1,
		borderColor: "#E1E5E8",
		gap: 10,
	},
	cardTitle: { fontSize: 16, fontWeight: "800", color: colors.navy },
	bullet: { fontSize: 14, color: colors.navy, lineHeight: 20 },
	bold: { fontWeight: "800" },
	amountGrid: { flexDirection: "row", gap: 8 },
	amountPill: {
		flex: 1,
		paddingVertical: 10,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#E1E5E8",
		backgroundColor: colors.background,
		alignItems: "center",
	},
	amountPillActive: {
		backgroundColor: colors.yellow,
		borderColor: colors.yellow,
	},
	amountText: { fontSize: 14, fontWeight: "800", color: colors.navy },
	amountTextActive: { color: colors.navy },
	input: {
		height: 46,
		borderRadius: 12,
		paddingHorizontal: 14,
		backgroundColor: colors.background,
		borderWidth: 1,
		borderColor: "#E1E5E8",
		fontSize: 14,
		color: colors.navy,
	},
	methodRow: { flexDirection: "row", gap: 8 },
	methodTab: {
		flex: 1,
		paddingVertical: 11,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#E1E5E8",
		backgroundColor: colors.background,
		alignItems: "center",
	},
	methodTabActive: { backgroundColor: colors.navy, borderColor: colors.navy },
	methodText: { fontSize: 14, fontWeight: "800", color: colors.navy },
	methodTextActive: { color: colors.white },
	speiBox: {
		padding: 14,
		borderRadius: 14,
		backgroundColor: "#F4F7FA",
		gap: 6,
	},
	speiLine: { fontSize: 13, color: colors.navy },
	speiBtn: {
		marginTop: 6,
		paddingVertical: 12,
		borderRadius: 12,
		backgroundColor: colors.navy,
		alignItems: "center",
	},
	speiBtnText: { fontSize: 14, fontWeight: "800", color: colors.white },
	appleBox: {
		padding: 14,
		borderRadius: 14,
		backgroundColor: "#F4F7FA",
		gap: 10,
	},
	appleNote: { fontSize: 13, color: colors.navy },
	applePayBtn: {
		paddingVertical: 13,
		borderRadius: 12,
		backgroundColor: "#111111",
		alignItems: "center",
	},
	applePayText: { fontSize: 15, fontWeight: "700", color: colors.white },
	feedbackBox: {
		padding: 12,
		borderRadius: 12,
		backgroundColor: "#FFF9E6",
		borderWidth: 1,
		borderColor: colors.yellow,
	},
	feedbackText: { fontSize: 13, fontWeight: "700", color: colors.navy },
});
