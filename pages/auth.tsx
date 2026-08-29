import AuthScreen from "@/components/AuthScreen";
import { useRouter } from "next/router";

export default function AuthPage() {
  const router = useRouter();

  return (
    <AuthScreen
      onSuccess={() => {
        router.replace("/app");
      }}
    />
  );
}
