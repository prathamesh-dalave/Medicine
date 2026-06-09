'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pill, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUpView, setIsSignUpView] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!email || !password || (isSignUpView && !fullName)) {
        setError('Please fill in all fields.');
        return;
      }

      setLoading(true);
      setError('');
      setSuccess('');
      
      let authResponse;
      
      if (isSignUpView) {
        authResponse = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { full_name: fullName }
          }
        });
      } else {
        authResponse = await supabase.auth.signInWithPassword({ email, password });
      }

      const { data, error: authError } = authResponse;

      if (authError) throw authError;
      
      // If sign up requires email confirmation, session will be null
      if (isSignUpView && !data.session) {
        setSuccess('Registration successful! Please check your email to verify your account.');
        return;
      }

      if (data.user) {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error('Google login failed: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative">
      <Link href="/" className="absolute top-8 left-8 flex items-center text-slate-500 hover:text-slate-900 transition-colors font-medium">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
      </Link>
      
      <Card className="w-full max-w-md border-slate-200 shadow-xl">
        <CardContent className="pt-8 pb-8 px-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Pill className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isSignUpView ? 'Create an Account' : 'Welcome to MedRemind'}
            </h1>
            <p className="text-slate-500 mt-2">
              {isSignUpView ? 'Enter your details to get started' : 'Enter your details to continue'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm mb-6 border border-emerald-100">
              {success}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUpView && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input 
                  id="fullName" 
                  type="text" 
                  placeholder="John Doe" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="pt-4 space-y-3">
              <Button 
                type="submit"
                className="w-full h-12 text-md rounded-xl" 
                disabled={loading}
              >
                {loading ? 'Please wait...' : (isSignUpView ? 'Sign Up' : 'Sign In')}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-slate-500">Or continue with</span>
                </div>
              </div>

              <Button 
                type="button" 
                variant="outline" 
                className="w-full h-12 text-md rounded-xl text-slate-700 bg-white border-slate-200 hover:bg-slate-50" 
                onClick={handleGoogleLogin}
              >
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5 mr-3" alt="Google" />
                Google
              </Button>
              
              <div className="text-center text-sm text-slate-500 mt-4">
                {isSignUpView ? (
                  <>
                    Already have an account?{' '}
                    <button type="button" onClick={() => setIsSignUpView(false)} className="text-primary font-medium hover:underline">
                      Sign In
                    </button>
                  </>
                ) : (
                  <>
                    Don't have an account?{' '}
                    <button type="button" onClick={() => setIsSignUpView(true)} className="text-primary font-medium hover:underline">
                      Create Account
                    </button>
                  </>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
