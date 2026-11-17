import { Pressable, Text } from "react-native";
import { DrawerActions, useNavigation } from "@react-navigation/native";

export default function MenuButton({ color }: { color: string }) {
	const navigation = useNavigation();
	return (
		<Pressable
			onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
			accessibilityLabel="Abrir menú"
			hitSlop={12}
			style={{ paddingHorizontal: 8 }}
		>
			<Text style={{ color, fontSize: 24 }}>☰</Text>
		</Pressable>
	);
}
