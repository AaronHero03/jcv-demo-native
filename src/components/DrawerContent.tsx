import { StyleSheet, Text, View } from "react-native";
import { StackActions } from "@react-navigation/native";
import {
	DrawerContentScrollView,
	DrawerItem,
	DrawerItemList,
	type DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { useAppState } from "../context/AppStateContext";
import { colors } from "../theme/colors";

// Contenido del drawer: encabezado de marca + opciones + cerrar sesión.
export default function DrawerContent(props: DrawerContentComponentProps) {
	const { userMode, userEmail, isTecVerified, logout } = useAppState();
	const subtitle =
		userMode === "user" && userEmail
			? `${userEmail}${isTecVerified ? " · 🎓" : ""}`
			: "Modo invitado";

	return (
		<DrawerContentScrollView
			{...props}
			contentContainerStyle={{ paddingTop: 0 }}
		>
			<View style={styles.head}>
				<View style={styles.logo}>
					<Text style={styles.logoText}>JCV</Text>
				</View>
				<View style={styles.brandCol}>
					<Text style={styles.brand}>Jalisco Cómo Vamos</Text>
					<Text style={styles.sub}>{subtitle}</Text>
				</View>
			</View>
			<DrawerItemList {...props} />
			<DrawerItem
				label="🚪  Cerrar sesión"
				onPress={() => {
					logout();
					props.navigation
						.getParent()
						?.dispatch(StackActions.replace("Welcome"));
				}}
			/>
		</DrawerContentScrollView>
	);
}

const styles = StyleSheet.create({
	head: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		padding: 18,
		paddingTop: 48,
		marginBottom: 8,
		backgroundColor: colors.navy,
	},
	logo: {
		width: 38,
		height: 38,
		borderRadius: 11,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: colors.yellow,
	},
	logoText: { color: colors.navy, fontWeight: "800" },
	brandCol: { flex: 1 },
	brand: { color: colors.white, fontSize: 16, fontWeight: "700" },
	sub: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 },
});
