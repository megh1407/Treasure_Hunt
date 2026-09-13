import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGameStore } from "@/store/gameStore";
import { VALID_BRANCHES, type Branch } from "@/services/types";

const title = "Player Registration — Core Quest Finder";
const description =
  "Register your student credentials to join the Core Quest Finder virtual 3D treasure hunt.";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: RegisterPage,
});

interface FormFieldErrors {
  playerName?: string;
  enrollmentNumber?: string;
  email?: string;
  contactNumber?: string;
  branch?: string;
}

function RegisterPage() {
  const navigate = useNavigate();
  const register = useGameStore((s) => s.register);
  const [form, setForm] = useState({
    playerName: "",
    enrollmentNumber: "",
    email: "",
    contactNumber: "",
    branch: "" as Branch | "",
  });
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const validate = () => {
    const errors: FormFieldErrors = {};

    // 1. Name validation
    const trimmedName = form.playerName.trim();
    if (!trimmedName) {
      errors.playerName = "Name is required";
    } else if (trimmedName.length > 100) {
      errors.playerName = "Name must not exceed 100 characters";
    } else if (!/^[A-Za-z]+(?: [A-Za-z]+)*$/.test(trimmedName)) {
      errors.playerName = "Name must contain alphabetic characters and spaces only";
    }

    // 2. Enrollment number validation
    const trimmedEnrollment = form.enrollmentNumber.trim().toUpperCase();
    if (!trimmedEnrollment) {
      errors.enrollmentNumber = "Enrollment number is required";
    } else if (!/^[A-Za-z0-9]{11}$/.test(trimmedEnrollment)) {
      errors.enrollmentNumber =
        "Enrollment number must be exactly 11 alphanumeric characters (e.g. AB123456789)";
    }

    // 3. Email validation
    const trimmedEmail = form.email.trim();
    if (!trimmedEmail) {
      errors.email = "Email ID is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) || trimmedEmail.length > 255) {
      errors.email = "Please enter a valid email address (e.g. user@example.com)";
    }

    // 4. Contact number validation
    const trimmedContact = form.contactNumber.trim();
    if (!trimmedContact) {
      errors.contactNumber = "Contact number is required";
    } else if (!/^\d{10}$/.test(trimmedContact)) {
      errors.contactNumber =
        "Contact number must be exactly 10 digits (no spaces, punctuation or +91)";
    }

    // 5. Branch validation
    if (!form.branch) {
      errors.branch = "Please select your department branch";
    } else if (!VALID_BRANCHES.includes(form.branch as Branch)) {
      errors.branch = "Invalid branch selection";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validate()) {
      return;
    }

    setBusy(true);
    try {
      await register({
        playerName: form.playerName.trim(),
        enrollmentNumber: form.enrollmentNumber.trim().toUpperCase(),
        email: form.email.trim().toLowerCase(),
        contactNumber: form.contactNumber.trim(),
        branch: form.branch as Branch,
        team: form.branch as Branch,
      });
      void navigate({ to: "/play" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed. Please try again.";
      setGeneralError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="holo-grid flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <form onSubmit={submit} className="holo-panel w-full max-w-lg rounded-2xl p-8 shadow-2xl border border-primary/30">
        <p className="font-display text-[11px] tracking-[0.4em] text-primary">UPDATES 2K26</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground text-glow">
          PLAYER REGISTRATION
        </h1>
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
          Enter your official student credentials to initialize your operative profile.
        </p>

        <div className="mt-6 space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="playerName" className="text-xs uppercase tracking-widest text-muted-foreground">
              Full Name
            </Label>
            <Input
              id="playerName"
              value={form.playerName}
              placeholder="e.g. Rahul Patel"
              onChange={(e) => {
                setForm({ ...form, playerName: e.target.value });
                if (fieldErrors.playerName) setFieldErrors({ ...fieldErrors, playerName: "" });
              }}
              className={fieldErrors.playerName ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {fieldErrors.playerName && (
              <p className="text-xs text-destructive font-medium">{fieldErrors.playerName}</p>
            )}
          </div>

          {/* Enrollment Number */}
          <div className="space-y-1.5">
            <Label htmlFor="enrollmentNumber" className="text-xs uppercase tracking-widest text-muted-foreground">
              Enrollment Number (Exactly 11 characters)
            </Label>
            <Input
              id="enrollmentNumber"
              value={form.enrollmentNumber}
              maxLength={11}
              placeholder="e.g. AB123456789"
              onChange={(e) => {
                setForm({ ...form, enrollmentNumber: e.target.value.toUpperCase() });
                if (fieldErrors.enrollmentNumber) setFieldErrors({ ...fieldErrors, enrollmentNumber: "" });
              }}
              className={fieldErrors.enrollmentNumber ? "border-destructive focus-visible:ring-destructive font-mono" : "font-mono"}
            />
            {fieldErrors.enrollmentNumber && (
              <p className="text-xs text-destructive font-medium">{fieldErrors.enrollmentNumber}</p>
            )}
          </div>

          {/* Email ID */}
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs uppercase tracking-widest text-muted-foreground">
              Email ID
            </Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              placeholder="e.g. rahul@example.com"
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
                if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: "" });
              }}
              className={fieldErrors.email ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            {fieldErrors.email && (
              <p className="text-xs text-destructive font-medium">{fieldErrors.email}</p>
            )}
          </div>

          {/* Contact Number */}
          <div className="space-y-1.5">
            <Label htmlFor="contactNumber" className="text-xs uppercase tracking-widest text-muted-foreground">
              Contact Number (10 digits)
            </Label>
            <Input
              id="contactNumber"
              type="tel"
              maxLength={10}
              value={form.contactNumber}
              placeholder="e.g. 9876543210"
              onChange={(e) => {
                setForm({ ...form, contactNumber: e.target.value });
                if (fieldErrors.contactNumber) setFieldErrors({ ...fieldErrors, contactNumber: "" });
              }}
              className={fieldErrors.contactNumber ? "border-destructive focus-visible:ring-destructive font-mono" : "font-mono"}
            />
            {fieldErrors.contactNumber && (
              <p className="text-xs text-destructive font-medium">{fieldErrors.contactNumber}</p>
            )}
          </div>

          {/* Branch Dropdown */}
          <div className="space-y-1.5">
            <Label htmlFor="branch" className="text-xs uppercase tracking-widest text-muted-foreground">
              Branch / Department
            </Label>
            <select
              id="branch"
              value={form.branch}
              onChange={(e) => {
                setForm({ ...form, branch: e.target.value as Branch });
                if (fieldErrors.branch) setFieldErrors({ ...fieldErrors, branch: "" });
              }}
              className={`w-full rounded-md border bg-background/80 px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-primary ${
                fieldErrors.branch ? "border-destructive focus:ring-destructive" : "border-input"
              }`}
            >
              <option value="" disabled>
                -- Select Your Branch --
              </option>
              {VALID_BRANCHES.map((b) => (
                <option key={b} value={b} className="bg-background text-foreground">
                  {b}
                </option>
              ))}
            </select>
            {fieldErrors.branch && (
              <p className="text-xs text-destructive font-medium">{fieldErrors.branch}</p>
            )}
          </div>
        </div>

        {generalError && (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {generalError}
          </div>
        )}

        <Button type="submit" className="mt-6 w-full font-display tracking-widest" disabled={busy}>
          {busy ? "Registering Operative…" : "INITIALIZE MISSION"}
        </Button>
      </form>
    </main>
  );
}
