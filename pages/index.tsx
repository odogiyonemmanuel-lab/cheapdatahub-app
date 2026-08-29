import LandingPage from "@/components/LandingPage";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  return (
    <LandingPage
      onGetStarted={() => {
        router.push("/auth");
      }}
    />
  );
}
