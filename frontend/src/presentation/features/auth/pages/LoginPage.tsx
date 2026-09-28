import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/infrastructure/api/endpoints/auth.js';
import { queryKeys } from '@/application/query-keys.js';
import { useServers } from '@/application/queries/index.js';
import logoUrl from '@/assets/logo.png';
import { Alert, AlertIcon, AlertTitle } from '@/presentation/components/ui/alert.js';
import { Button } from '@/presentation/components/ui/button.js';
import { Card, CardContent } from '@/presentation/components/ui/card.js';
import { Input, InputWrapper } from '@/presentation/components/ui/input.js';
import { Label } from '@/presentation/components/ui/label.js';

const loginSchema = z.object({
  server: z.coerce.number().int().min(0),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const serversQuery = useServers();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { server: 0 } });

  const onSubmit = async (values: LoginForm) => {
    setSubmitError(null);
    try {
      await authApi.login(values.server, values.username, values.password);
      await queryClient.invalidateQueries({ queryKey: queryKeys.session.info });
      const next = params.get('next');
      navigate(next ?? `/databases?database=${params.get('database') ?? 'postgres'}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  return (
    <Card className="w-full max-w-[400px]">
      <CardContent className="space-y-6 p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center overflow-hidden rounded-2xl shadow-sm">
            <img src={logoUrl} alt="TableForge" className="size-14" />
          </div>
          <div className="space-y-1">
            <h1 className="text-foreground text-2xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-muted-foreground mx-auto max-w-xs text-sm">
              Sign in with your <span className="text-foreground font-medium">PostgreSQL</span>{' '}
              credentials to continue.
            </p>
          </div>
        </div>

        {submitError ? (
          <Alert
            variant="destructive"
            appearance="light"
            close
            onClose={() => {
              setSubmitError(null);
            }}
          >
            <AlertIcon />
            <AlertTitle>{submitError}</AlertTitle>
          </Alert>
        ) : null}

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="server">Server</Label>
            {serversQuery.data && serversQuery.data.length > 0 ? (
              <select
                id="server"
                {...register('server')}
                className="border-input bg-background text-foreground focus-visible:ring-ring/30 flex h-8.5 w-full rounded-md border px-3 text-[0.8125rem] focus-visible:ring-[3px] focus-visible:outline-none"
              >
                {serversQuery.data.map((srv, i) => (
                  <option key={`${srv.desc}-${i}`} value={i}>
                    {srv.desc} — {srv.host || 'socket'}:{srv.port}
                  </option>
                ))}
              </select>
            ) : (
              <Input id="server" type="number" {...register('server')} />
            )}
            {errors.server?.message ? (
              <p className="text-destructive text-xs">{errors.server.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" autoComplete="username" autoFocus {...register('username')} />
            {errors.username?.message ? (
              <p className="text-destructive text-xs">{errors.username.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <InputWrapper>
              <Input
                id="password"
                type={passwordVisible ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                {...register('password')}
              />
              <Button
                type="button"
                variant="ghost"
                mode="icon"
                onClick={() => {
                  setPasswordVisible((v) => !v);
                }}
                aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                className="hover:bg-transparent"
              >
                {passwordVisible ? (
                  <EyeOff className="text-muted-foreground size-4" />
                ) : (
                  <Eye className="text-muted-foreground size-4" />
                )}
              </Button>
            </InputWrapper>
            {errors.password?.message ? (
              <p className="text-destructive text-xs">{errors.password.message}</p>
            ) : null}
          </div>

          <Button type="submit" className="w-full gap-2" loading={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
            {!isSubmitting ? <ArrowRight className="size-4" /> : null}
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-xs">
          Credentials are verified directly against PostgreSQL and never stored in the browser.
        </p>
      </CardContent>
    </Card>
  );
}
