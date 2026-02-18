import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg-primary px-8">
      <div className="flex w-full max-w-sm flex-col items-center">
        {/* Logo */}
        <FlaskConical className="size-10 text-text-primary" />
        <h1 className="mt-4 text-[32px] font-extrabold tracking-[6px] text-text-primary">
          PLATE LAB
        </h1>
        <p className="mt-1 text-[14px] text-text-secondary">
          Sample Plate Management
        </p>

        {/* Form */}
        <div className="mt-10 flex w-full flex-col gap-5">
          <div>
            <Label className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium mb-2">
              EMAIL
            </Label>
            <Input
              type="email"
              placeholder="your@email.com"
              className="h-12 rounded-xl"
            />
          </div>
          <div>
            <Label className="text-[11px] uppercase tracking-[2px] text-text-secondary font-medium mb-2">
              PASSWORD
            </Label>
            <Input
              type="password"
              placeholder="Enter your password"
              className="h-12 rounded-xl"
            />
          </div>

          <Button className="h-12 w-full rounded-xl">
            Sign In
          </Button>
        </div>

        {/* OR Divider */}
        <div className="my-6 flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-border-default" />
          <span className="text-[13px] text-text-tertiary">OR</span>
          <div className="h-px flex-1 bg-border-default" />
        </div>

        {/* Google */}
        <Button
          variant="outline"
          className="h-12 w-full rounded-xl"
        >
          Continue with Google
        </Button>

        {/* Create Account */}
        <p className="mt-8 text-[14px] text-text-secondary">
          Don&apos;t have an account?{" "}
          <Link href="#" className="font-semibold text-text-primary underline">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}
