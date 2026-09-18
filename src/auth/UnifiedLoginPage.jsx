import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { ForgotPasswordModal } from "../components/ForgotPasswordModal";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { API_BASE_URL } from "../config";
import { getLandingPath, resolveAppRoleFromAuthPayload } from "./roleUtils";
import cybersquadLogo from "../frontdesk/assets/cybersquad-logo.png";
import cybersquadLightLogo from "../frontdesk/assets/cybersquad black.png";
import loginBackground from "../frontdesk/assets/logini.png";

export function getRoleFromApiResult(responseData) {
  return resolveAppRoleFromAuthPayload(responseData);
}

export { getLandingPath };

export default function UnifiedLoginPage() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  const activeLogo = isDark ? cybersquadLogo : cybersquadLightLogo;

  useEffect(() => {
    let mounted = true;
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const payload = JSON.parse(userStr);
        if (payload?.access) {
          const role = getRoleFromApiResult(payload);
          if (role) {
            const landingPath = getLandingPath(role);
            navigate(landingPath, { replace: true });
            return;
          }

          localStorage.removeItem("user");
          localStorage.removeItem("auth_token");
        }
      }
    } catch (err) {
      console.error("Error checking existing auth:", err);
    } finally {
      if (mounted) {
        setAuthChecked(true);
      }
    }
    return () => { mounted = false; };
  }, [navigate]);

  useEffect(() => {
    document.body.classList.add("frontdesk-theme");
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => {
      document.body.classList.remove("frontdesk-theme");
      observer.disconnect();
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: email.trim(),
          password,
        }),
      });

      const responseData = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(responseData.detail || "Incorrect username or password");
        }
        throw new Error(responseData.detail || "Login failed. Please try again later.");
      }

      if (!responseData?.access || !responseData?.refresh) {
        throw new Error("Invalid response from server - missing tokens");
      }

      const role = getRoleFromApiResult(responseData);
      if (!role) {
        throw new Error("Login succeeded but this account does not have a supported dashboard role.");
      }

      localStorage.setItem("user", JSON.stringify(responseData));
      localStorage.setItem("auth_token", responseData.access);

      const landingPath = getLandingPath(role);
      navigate(landingPath, { replace: true });
    } catch (loginError) {
      console.error("Unified login error:", loginError);
      setError(
        loginError instanceof Error
          ? loginError.message
          : "An unexpected error occurred during sign in.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div className="frontdesk-theme min-h-screen flex">
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-end justify-center bg-muted">
          <img
            src={loginBackground}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="relative z-10 p-12 max-w-md text-center">
            <p className="text-base text-white leading-normal">
              Streamline your device repair workflow. From intake to quality check,
              manage every ticket, part, and customer in one place.
            </p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-sm animate-fade-in">
            <div className="mb-8">
              <img src={activeLogo} alt="Cybersquad" className="h-6 w-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-1">Welcome back</h2>
              <p className="text-muted-foreground">Sign in to your account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" onChange={() => setError("")}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@cybersquad.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-secondary border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-secondary border-border"
                />
                <div className="text-right">
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-sm"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Forgot password?
                  </Button>
                </div>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
                {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </form>
          </div>
        </div>
      </div>

      <ForgotPasswordModal open={showForgotPassword} onOpenChange={setShowForgotPassword} />
    </>
  );
}
