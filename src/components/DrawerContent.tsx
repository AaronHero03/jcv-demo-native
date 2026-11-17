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
	const { logout } = useAppState();
	return (
		<DrawerContentScrollView
			{...props}
			contentContainerStyle={{ paddingTop: 0 }}
		>
			<View style={styles.head}>
				<View style={styles.logo}>
					<Text style={styles.logoText}>JCV</Text>
				</View>
				<Text style={styles.brand}>Jalisco Cómo Vamos</Text>
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
	brand: { color: colors.white, fontSize: 16, fontWeight: "700" },
});
