import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 bg-background">
      <SignIn />
    </main>
  );
}
