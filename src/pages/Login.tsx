import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Store, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useAuthStore } from "../store/authStore";
import { useQuery } from "@tanstack/react-query";
import type { BusinessProfile } from "../types";

const schema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password required"),
});

type FormData = z.infer<typeof schema>;

export default function Login() {
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const workspaceSlug = params.get("b");

  const { data: business } = useQuery<BusinessProfile>({
    queryKey: ["business-public", workspaceSlug],
    queryFn: () =>
      api
        .get(
          `/settings/business${workspaceSlug ? `?slug=${encodeURIComponent(workspaceSlug)}` : ""}`,
        )
        .then((r) => r.data),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", data);
      login(res.data.token, res.data.user);
    } catch (err: any) {
      setError(
        err.response?.data?.message ?? "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div
          className="login-logo"
          style={{
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-input)",
          }}
        >
          {business?.logo ? (
            <img
              src={business.logo}
              alt="Logo"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <img
              src="/mylogo.png"
              alt="BMS Logo"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
        </div>
        <h1 className="login-title">
          Welcome to {business?.name ?? "Comag Inventory System"}
        </h1>
        <p className="login-subtitle">Sign in to manage your business</p>

        {error && (
          <div className="alert alert-error mb-16">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              className="form-control"
              placeholder="sarah@comaginventory.com"
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <div className="form-error">{errors.email.message}</div>
            )}
          </div>

          <div className="form-group" style={{ position: "relative" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <label
                className="form-label"
                htmlFor="login-password"
                style={{ marginBottom: 0 }}
              >
                Password
              </label>
              <button
                type="button"
                onClick={() =>
                  alert(
                    "Please contact your business administrator (Owner) to reset your password from the Staff Management settings dashboard.",
                  )
                }
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent-blue)",
                  fontSize: 11,
                  cursor: "pointer",
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                Forgot Password?
              </button>
            </div>
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              className="form-control"
              placeholder="••••••••"
              autoComplete="current-password"
              style={{ paddingRight: 40 }}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: 10,
                top: 30,
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            {errors.password && (
              <div className="form-error">{errors.password.message}</div>
            )}
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn-primary w-full"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "11px",
              fontSize: 14,
              marginTop: 8,
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span
                  className="loading-spinner"
                  style={{ width: 16, height: 16, borderWidth: 2 }}
                />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: 20,
            textAlign: "center",
            fontSize: 13,
            color: "var(--text-muted)",
          }}
        >
          Don't have an account?{" "}
          <Link
            to="/register"
            style={{
              color: "var(--accent-blue)",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
