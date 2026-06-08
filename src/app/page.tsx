import Link from 'next/link';
import { Pill, Clock, ShieldCheck, Users, AlertCircle, Heart, ArrowRight, BarChart2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold text-xl">
            <Pill className="w-6 h-6" />
            MedRemind
          </div>
          <div className="hidden md:flex items-center gap-8 font-medium text-slate-600">
            <a href="#features" className="hover:text-primary transition-colors">Features</a>
            <a href="#awareness" className="hover:text-primary transition-colors">Awareness</a>
            <Link href="/login" className="hover:text-primary transition-colors">Login</Link>
            <Link href="/login" className={buttonVariants({ variant: "default" })}>
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 max-w-4xl mx-auto text-center mt-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-8">
          <ShieldCheck className="w-4 h-4" /> Trusted by 10,000+ families
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
          Never Miss Your <span className="text-primary">Medicine</span> Again
        </h1>
        <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
          A smart medicine reminder system designed for elderly users and families. Track doses, get alerts, and keep your loved ones safe — all in one simple app.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/login" className={buttonVariants({ size: "lg", className: "w-full sm:w-auto h-14 px-8 text-lg rounded-full" })}>
            Get Started Free <ArrowRight className="w-5 h-5 ml-2" />
          </Link>
          <a href="#features" className={buttonVariants({ size: "lg", variant: "outline", className: "w-full sm:w-auto h-14 px-8 text-lg rounded-full" })}>
            See Features
          </a>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-primary font-semibold tracking-wider text-sm uppercase mb-3">Features</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-slate-900">Everything You Need to Stay on Track</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                  <Clock className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-3">Smart Reminders</h4>
                <p className="text-slate-600 leading-relaxed">Get timely notifications for every dose. Never forget a medicine with our intelligent alert system.</p>
              </CardContent>
            </Card>
            <Card className="border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6">
                  <BarChart2 className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-3">Dose Tracking</h4>
                <p className="text-slate-600 leading-relaxed">Track every dose taken or missed. View your complete medication history at a glance.</p>
              </CardContent>
            </Card>
            <Card className="border-slate-100 shadow-sm hover:shadow-md transition-all duration-300">
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-6">
                  <Users className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-3">Family Monitoring</h4>
                <p className="text-slate-600 leading-relaxed">Add family members as caregivers. Monitor your loved ones&apos; medication schedule remotely.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Awareness Section */}
      <section id="awareness" className="py-20 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-16 h-16 mx-auto bg-red-100 text-red-500 rounded-2xl flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">Why Taking Medicines on Time Matters</h2>
          <p className="text-lg text-slate-600 mb-12">Missing a single dose can have serious consequences. Understanding the risks helps protect your health.</p>
          
          <div className="grid md:grid-cols-2 gap-6 text-left mb-12">
            <Card className="border-none shadow-sm">
              <CardContent className="p-6">
                <h4 className="font-bold text-slate-900 text-xl mb-2 flex items-center gap-2">
                  <span className="text-red-500">50%</span>
                </h4>
                <p className="text-slate-600">of patients forget their medicines regularly.</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardContent className="p-6">
                <h4 className="font-bold text-slate-900 text-xl mb-2 flex items-center gap-2">
                  <span className="text-red-500">125K+</span>
                </h4>
                <p className="text-slate-600">deaths annually due to non-adherence.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-primary font-bold">
            <Pill className="w-5 h-5" /> MedRemind
          </div>
          <p className="text-slate-500 text-sm flex items-center gap-1">
            Made with <Heart className="w-4 h-4 text-red-500" /> for families everywhere
          </p>
          <p className="text-slate-400 text-sm">© 2026 All rights reserved</p>
        </div>
      </footer>
    </div>
  );
}
