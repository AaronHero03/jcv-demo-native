import { useEffect, useRef, useState, type ReactNode } from "react";
import {
	AppState,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { useAppState } from "../context/AppStateContext";
import { confirmOnDevice } from "../lib/deviceConfirmation";
import { colors } from "../theme/colors";

export const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;
const CHECK_INTERVAL_MS = 30 * 1000;

/**
 * Bloqueo por inactividad (MASVS-AUTH-2): tras un periodo sin actividad o en segundo plano,
 * exige re-autenticación local (biometría/PIN del dispositivo) o cierre de sesión.
 */
export default function InactivityLockGate({
	children,
	onLogoutNavigate,
}: {
	children: ReactNode;
	onLogoutNavigate?: () => void;
}) {
	const { userMode, userId, userFirstName, logout } = useAppState();
	const sessionKey = userMode === "user" ? (userId ?? "local") : null;
	const [lockedKey, setLockedKey] = useState<string | null>(null);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const lastActiveRef = useRef<number>(0);
	const backgroundAtRef = useRef<number | null>(null);

	const locked = sessionKey !== null && lockedKey === sessionKey;

	useEffect(() => {
		if (!sessionKey) return;

		lastActiveRef.current = Date.now();
		backgroundAtRef.current = null;

		const sub = AppState.addEventListener("change", (nextState) => {
			if (nextState === "background" || nextState === "inactive") {
				backgroundAtRef.current = Date.now();
			} else if (nextState === "active") {
				const refTime = backgroundAtRef.current ?? lastActiveRef.current;
				if (Date.now() - refTime >= INACTIVITY_TIMEOUT_MS) {
					setLockedKey(sessionKey);
				}
				backgroundAtRef.current = null;
			}
		});

		const timer = setInterval(() => {
			if (Date.now() - lastActiveRef.current >= INACTIVITY_TIMEOUT_MS) {
				setLockedKey(sessionKey);
			}
		}, CHECK_INTERVAL_MS);

		return () => {
			sub.remove();
			clearInterval(timer);
		};
	}, [sessionKey]);

	const touchActivity = () => {
		if (!locked) {
			lastActiveRef.current = Date.now();
		}
	};

	const handleUnlock = async () => {
		if (busy) return;
		setBusy(true);
		setErrorMsg(null);
		try {
			await confirmOnDevice("Confirma tu identidad para reanudar tu sesión");
			lastActiveRef.current = Date.now();
			setLockedKey(null);
		} catch (e) {
			setErrorMsg(
				e instanceof Error
					? e.message
					: "No se pudo verificar tu identidad. Inicia sesión nuevamente.",
			);
		} finally {
			setBusy(false);
		}
	};

	const handleLogout = async () => {
		setLockedKey(null);
		setErrorMsg(null);
		await logout();
		onLogoutNavigate?.();
	};

	return (
		<View
			style={styles.root}
			onTouchStartCapture={touchActivity}
			onPointerDownCapture={touchActivity}
		>
			{children}
			{locked && (
				<View style={styles.overlay} accessibilityViewIsModal>
					<View style={styles.card}>
						<Text style={styles.emoji}>🔒</Text>
						<Text style={styles.title}>Sesión bloqueada por inactividad</Text>
						<Text style={styles.desc}>
							{userFirstName ? `Hola, ${userFirstName}. ` : ""}
							Por tu seguridad, confirma tu identidad con el bloqueo del
							dispositivo para continuar.
						</Text>
						{errorMsg && <Text style={styles.error}>{errorMsg}</Text>}
						{(Platform.OS === "ios" || Platform.OS === "android") && (
							<Pressable
								accessibilityRole="button"
								disabled={busy}
								onPress={handleUnlock}
								style={styles.primaryBtn}
							>
								<Text style={styles.primaryText}>
									{busy ? "Verificando…" : "Desbloquear con biometría / PIN"}
								</Text>
							</Pressable>
						)}
						<Pressable
							accessibilityRole="button"
							disabled={busy}
							onPress={handleLogout}
							style={styles.secondaryBtn}
						>
							<Text style={styles.secondaryText}>Cerrar sesión</Text>
						</Pressable>
					</View>
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1 },
	overlay: {
		position: "absolute",
		top: 0,
		right: 0,
		bottom: 0,
		left: 0,
		backgroundColor: "rgba(0, 32, 68, 0.92)",
		alignItems: "center",
		justifyContent: "center",
		padding: 24,
		zIndex: 999,
	},
	card: {
		width: "100%",
		maxWidth: 380,
		backgroundColor: colors.white,
		borderRadius: 20,
		padding: 24,
		gap: 12,
		alignItems: "center",
	},
	emoji: { fontSize: 36 },
	title: {
		fontSize: 19,
		fontWeight: "800",
		color: colors.navy,
		textAlign: "center",
	},
	desc: {
		fontSize: 14,
		color: colors.muted,
		textAlign: "center",
		lineHeight: 20,
	},
	error: {
		fontSize: 13,
		color: "#B42318",
		fontWeight: "700",
		textAlign: "center",
	},
	primaryBtn: {
		width: "100%",
		minHeight: 48,
		borderRadius: 12,
		backgroundColor: colors.navy,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 16,
	},
	primaryText: { color: colors.white, fontWeight: "700", fontSize: 15 },
	secondaryBtn: {
		width: "100%",
		minHeight: 44,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: colors.border,
		alignItems: "center",
		justifyContent: "center",
	},
	secondaryText: { color: colors.navy, fontWeight: "700", fontSize: 14 },
});
