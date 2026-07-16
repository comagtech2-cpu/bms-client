import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Store, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Please confirm your password'),
  role: z.enum(['OWNER', 'STAFF'], { required_error: 'Role is required' }),
  businessName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
}).refine((data) => data.role !== 'OWNER' || (data.businessName && data.businessName.trim().length >= 2), {
  message: "Business name required for owners",
  path: ['businessName'],
});

type FormData = z.infer<typeof schema>;

export default function Register() {
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: 'OWNER',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: FormData) => {
    setError('');
    setLoading(true);
    try {
      const { name, email, password, role, businessName } = data;
      const res = await api.post('/auth/register', { name, email, password, role, businessName });
      login(res.data.token, res.data.user);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo" style={{ overflow: 'hidden' }}>
          <img src="/mylogo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <h1 className="login-title">Create Account</h1>
        <p className="login-subtitle">Sign up to get started</p>

        {error && (
          <div className="alert alert-error mb-16">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-group">
            <label className="form-label" htmlFor="register-name">Full Name</label>
            <input
              id="register-name"
              type="text"
              className="form-control"
              placeholder="Sarah Jenkins"
              autoComplete="name"
              {...register('name')}
            />
            {errors.name && <div className="form-error">{errors.name.message}</div>}
          </div>

          {selectedRole === 'OWNER' && (
            <div className="form-group">
              <label className="form-label" htmlFor="register-business-name">Business Name</label>
              <input
                id="register-business-name"
                type="text"
                className="form-control"
                placeholder="e.g. My Supermarket"
                {...register('businessName')}
              />
              {errors.businessName && <div className="form-error">{errors.businessName.message}</div>}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="register-email">Email Address</label>
            <input
              id="register-email"
              type="email"
              className="form-control"
              placeholder="sarah@comaginventory.com"
              autoComplete="email"
              {...register('email')}
            />
            {errors.email && <div className="form-error">{errors.email.message}</div>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="register-role">Role</label>
            <select
              id="register-role"
              className="form-control"
              style={{ width: '100%', height: '40px', padding: '0 12px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-primary)', outline: 'none' }}
              {...register('role')}
            >
              <option value="OWNER">Owner (Full Access)</option>
              <option value="STAFF">Staff (Limited Access)</option>
            </select>
            {errors.role && <div className="form-error">{errors.role.message}</div>}
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label" htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              className="form-control"
              placeholder="••••••••"
              autoComplete="new-password"
              style={{ paddingRight: 40 }}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute', right: 10, top: 30, background: 'none',
                border: 'none', color: 'var(--text-muted)', cursor: 'pointer'
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            {errors.password && <div className="form-error">{errors.password.message}</div>}
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label" htmlFor="register-confirm-password">Confirm Password</label>
            <input
              id="register-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              className="form-control"
              placeholder="••••••••"
              autoComplete="new-password"
              style={{ paddingRight: 40 }}
              {...register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{
                position: 'absolute', right: 10, top: 30, background: 'none',
                border: 'none', color: 'var(--text-muted)', cursor: 'pointer'
              }}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            {errors.confirmPassword && <div className="form-error">{errors.confirmPassword.message}</div>}
          </div>

          <button
            id="register-submit"
            type="submit"
            className="btn-primary w-full"
            style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14, marginTop: 8 }}
            disabled={loading}
          >
            {loading ? <><span className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />Creating Account...</> : 'Sign Up'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: 600 }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
