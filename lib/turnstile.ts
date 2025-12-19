export async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    if (process.env.NODE_ENV === "production") {
       console.error("TURNSTILE_SECRET_KEY is not defined in production.");
       return false;
    }
    // In development, if no key is set, we might want to bypass or warn.
    // But usually we want to test it. If the user hasn't set it, this will fail.
    // Let's assume user will set it.
    console.warn("TURNSTILE_SECRET_KEY is missing.");
    return false;
  }

  try {
    const formData = new FormData();
    formData.append("secret", secretKey);
    formData.append("response", token);

    const result = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
      }
    );

    const outcome = await result.json();
    if (!outcome.success) {
        console.error("Turnstile verification failed:", outcome);
    }
    return outcome.success;
  } catch (e) {
    console.error("Turnstile verification error:", e);
    return false;
  }
}
