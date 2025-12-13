
import React, { useState, useEffect } from 'react';
import { motion as motionOriginal, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { SignInModal, SignUpModal } from '../components/auth';
import { 
  Building2, User, Truck, ArrowRight, Activity, 
  ShieldCheck, Zap, Globe, HeartPulse, MapPin, Smartphone, 
  CheckCircle2, Play
} from 'lucide-react';
import { Role } from '../types';

const motion = motionOriginal as any;

type AuthMode = 'NONE' | 'LOGIN' | 'REGISTER';

// --- Components ---

const Typewriter = ({ text, delay = 0, className, cursorColor = "bg-blue-500", onComplete }: { text: string, delay?: number, className?: string, cursorColor?: string, onComplete?: () => void }) => {
  const [visibleCount, setVisibleCount] = useState(0);
  const [started, setStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      setStarted(true);
      const interval = setInterval(() => {
        setVisibleCount((prev) => {
          if (prev < text.length) {
            return prev + 1;
          }
          clearInterval(interval);
          setIsComplete(true);
          return prev;
        });
      }, 100); // Speed: 100ms per char
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(startTimeout);
  }, [text, delay]);

  // Call onComplete in a separate effect to avoid setState during render
  useEffect(() => {
    if (isComplete && onComplete) {
      onComplete();
    }
  }, [isComplete, onComplete]);

  return (
    <span className={className}>
      {text.slice(0, visibleCount)}
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        className={`inline-block w-[0.1em] h-[1em] ${cursorColor} ml-[0.05em] align-middle rounded-full`}
        style={{ display: visibleCount === text.length && !onComplete ? 'inline-block' : started ? 'inline-block' : 'none' }} 
      />
    </span>
  );
};

const Navbar = ({ onOpenAuth }: { onOpenAuth: () => void }) => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <motion.nav 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 border-b ${scrolled ? 'bg-[#020617]/80 backdrop-blur-md border-white/5 py-4' : 'bg-transparent border-transparent py-6'}`}
        >
            <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
                <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter text-white">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Activity className="text-white" size={20} />
                    </div>
                    LifeLine<span className="text-blue-500">.</span>
                </div>

                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
                    <a href="#features" className="hover:text-white transition-colors">Features</a>
                    <a href="#roles" className="hover:text-white transition-colors">Portals</a>
                    <a href="#mission" className="hover:text-white transition-colors">Mission</a>
                </div>

                <button 
                    onClick={onOpenAuth}
                    className="px-6 py-2.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-blue-50 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                >
                    Get Started
                </button>
            </div>
        </motion.nav>
    );
};

const SectionHeader = ({ badge, title, subtitle }: { badge: string, title: React.ReactNode, subtitle: string }) => (
    <div className="mb-16 md:mb-24">
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-blue-400 mb-6 backdrop-blur-md"
        >
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            {badge}
        </motion.div>
        <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight"
        >
            {title}
        </motion.h2>
        <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-slate-400 max-w-2xl leading-relaxed"
        >
            {subtitle}
        </motion.p>
    </div>
);

const FeatureCard = ({ icon: Icon, title, desc, colSpan = 1, delay = 0, image }: any) => (
    <motion.div 
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 0.5 }}
        className={`group relative overflow-hidden rounded-3xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-colors p-8 flex flex-col ${colSpan === 2 ? 'md:col-span-2' : 'md:col-span-1'}`}
    >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Abstract Image Background for larger cards */}
        {image && (
             <div className="absolute right-0 bottom-0 w-1/2 h-full opacity-20 mask-image-linear-to-l group-hover:scale-105 transition-transform duration-700">
                <img src={image} alt="Feature" className="w-full h-full object-cover grayscale mix-blend-screen" />
            </div>
        )}

        <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400 mb-6 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shadow-lg shadow-black/20">
                <Icon size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed max-w-[90%]">{desc}</p>
        </div>
    </motion.div>
);

const RolePortal = ({ role, title, desc, icon: Icon, color, onClick, delay }: any) => {
    const colors: any = {
        blue: 'from-blue-500/20 hover:border-blue-500/50 text-blue-400',
        rose: 'from-rose-500/20 hover:border-rose-500/50 text-rose-400',
        amber: 'from-amber-500/20 hover:border-amber-500/50 text-amber-400'
    };

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay }}
            onClick={onClick}
            className={`group cursor-pointer relative h-[400px] rounded-[2rem] bg-[#0A0A0A] border border-white/10 p-8 flex flex-col justify-between overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 ${colors[color].replace('text-', 'hover:shadow-')}/20`}
        >
            <div className={`absolute inset-0 bg-gradient-to-b ${colors[color].split(' ')[0]} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
            
            <div className="relative z-10">
                <div className={`w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 transition-colors duration-300 ${colors[color].split(' ').pop()} group-hover:bg-white group-hover:text-black`}>
                    <Icon size={32} />
                </div>
                <h3 className="text-3xl font-bold text-white mb-2">{title}</h3>
                <p className="text-slate-400 leading-relaxed">{desc}</p>
            </div>

            <div className="relative z-10 flex items-center gap-2 font-bold text-sm text-white opacity-60 group-hover:opacity-100 transition-opacity">
                Enter Portal <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </div>

            {/* Decorative Background Noise/Grid */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light pointer-events-none"></div>
        </motion.div>
    );
};


export default function LandingPage() {
  const { isLoadingAuth } = useApp();
  const [authMode, setAuthMode] = useState<AuthMode>('NONE');
  const [targetRole, setTargetRole] = useState<Role>('GUEST');
  
  // Sequencing for Typewriter
  const [showReimagined, setShowReimagined] = useState(false);

  const handleOpenAuth = (role: Role) => {
    setTargetRole(role);
    setAuthMode('LOGIN');
  };

  const handleCloseAuth = () => {
    setAuthMode('NONE');
  };

  const handleSwitchToSignUp = () => {
    setAuthMode('REGISTER');
  };

  const handleSwitchToSignIn = () => {
    setAuthMode('LOGIN');
  };

  const handleAuthSuccess = () => {
    setAuthMode('NONE');
    // The AppContext will handle the redirect via onAuthStateChange
  };

  // Scroll Progress for Hero Parallax
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 200]);
  const opacityHero = useTransform(scrollY, [0, 400], [1, 0]);

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30 selection:text-blue-100 overflow-x-hidden">
      
      <Navbar onOpenAuth={() => document.getElementById('roles')?.scrollIntoView({ behavior: 'smooth' })} />

      {/* --- Global Noise & Gradient Background --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03]"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      {/* --- HERO SECTION --- */}
      <section className="relative z-10 min-h-screen flex flex-col justify-center px-6 pt-20">
         <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center">
             <motion.div style={{ y: y1, opacity: opacityHero }} className="flex flex-col items-start text-left">
                 <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 text-sm font-semibold mb-8"
                 >
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"/> v2.0 Live Network
                 </motion.div>
                 
                 <motion.h1 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="text-6xl md:text-8xl font-bold tracking-tighter leading-[1.1] mb-8"
                 >
                    Emergency <br/>
                    {/* Gradient Typewriter Text */}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-rose-400 animate-gradient">
                        <Typewriter text="Response" delay={800} cursorColor="bg-rose-400" onComplete={() => setShowReimagined(true)} />
                    </span> <br/>
                    
                    {/* Secondary Typewriter Text */}
                    {showReimagined ? (
                        <Typewriter text="Reimagined." delay={100} cursorColor="bg-white" />
                    ) : (
                        <span className="opacity-0">Reimagined.</span>
                    )}
                 </motion.h1>
                 
                 <motion.p 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="text-lg md:text-xl text-slate-400 max-w-lg mb-10 leading-relaxed font-light"
                 >
                    Orchestrating critical care logistics with AI-driven precision. When every second counts, <span className="text-white font-medium">LifeLine delivers</span> zero-latency coordination between hospitals, patients, and fleets.
                 </motion.p>
                 
                 <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="flex flex-row items-center gap-6"
                 >
                    <button 
                        onClick={() => document.getElementById('roles')?.scrollIntoView({ behavior: 'smooth' })}
                        className="h-[56px] px-8 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg transition-all shadow-[0_0_40px_-10px_rgba(37,99,235,0.5)] hover:scale-105 flex items-center justify-center"
                    >
                        Launch App
                    </button>
                    <button className="h-[56px] px-8 rounded-full border border-white/10 hover:bg-white/5 text-white font-semibold text-lg transition-all flex items-center gap-3 group">
                        <Play size={18} className="fill-white group-hover:scale-110 transition-transform" /> Watch Demo
                    </button>
                 </motion.div>
             </motion.div>

             <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.4 }}
                className="relative hidden lg:block"
             >
                 {/* Abstract 3D Representation */}
                 <div className="relative w-full aspect-square">
                     <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" />
                     <img 
                        src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop" 
                        alt="Network" 
                        className="relative z-10 w-full h-full object-cover rounded-[3rem] border border-white/10 opacity-80 mix-blend-lighten mask-image-radial"
                     />
                     
                     {/* Floating Cards */}
                     <motion.div 
                        animate={{ y: [0, -20, 0] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-10 -right-10 z-20 bg-[#0F172A]/90 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl max-w-[200px]"
                     >
                         <div className="flex items-center gap-3 mb-2">
                             <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-500"><HeartPulse size={16}/></div>
                             <div className="text-xs font-bold text-slate-300">Blood Match</div>
                         </div>
                         <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden"><div className="h-full w-[80%] bg-rose-500"/></div>
                     </motion.div>

                     <motion.div 
                        animate={{ y: [0, 20, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                        className="absolute bottom-20 -left-10 z-20 bg-[#0F172A]/90 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl max-w-[220px]"
                     >
                         <div className="flex items-center gap-3 mb-2">
                             <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500"><Truck size={16}/></div>
                             <div>
                                <div className="text-xs font-bold text-white">Ambulance #42</div>
                                <div className="text-[10px] text-slate-400">Arriving in 2 mins</div>
                             </div>
                         </div>
                     </motion.div>
                 </div>
             </motion.div>
         </div>

         {/* Stats Bar */}
         <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="absolute bottom-10 left-0 right-0 flex justify-center gap-8 md:gap-16 text-slate-500 font-medium text-sm md:text-base"
         >
             <div className="flex items-center gap-2"><Globe size={16} /> 100% Uptime</div>
             <div className="flex items-center gap-2"><ShieldCheck size={16} /> HIPAA Compliant</div>
             <div className="flex items-center gap-2"><Zap size={16} /> Sub-ms Latency</div>
         </motion.div>
      </section>

      {/* --- FEATURES BENTO GRID --- */}
      <section id="features" className="relative z-10 py-32 px-6 bg-[#020617]">
          <div className="max-w-7xl mx-auto">
             <SectionHeader 
                badge="Capabilities"
                title={<>Everything you need to <br/> <span className="text-blue-500">save lives.</span></>}
                subtitle="A comprehensive suite of tools designed for the high-stakes environment of emergency response. Fast, reliable, and intuitive."
             />

             <div className="grid md:grid-cols-3 gap-6">
                 <FeatureCard 
                    icon={MapPin}
                    title="Real-Time Fleet Tracking"
                    desc="Live GPS telemetry for every ambulance unit with predictive ETA and traffic optimization."
                    colSpan={2}
                    image="https://images.unsplash.com/photo-1468581264429-2548ef9eb732?q=80&w=2070&auto=format&fit=crop"
                 />
                 <FeatureCard 
                    icon={HeartPulse}
                    title="Blood Inventory"
                    desc="Decentralized database of blood stocks across all registered hospitals. Search and reserve instantly."
                    delay={0.1}
                 />
                 <FeatureCard 
                    icon={Smartphone}
                    title="One-Tap Request"
                    desc="Patients can request emergency assistance in under 5 seconds with auto-location."
                    delay={0.2}
                 />
                 <FeatureCard 
                    icon={ShieldCheck}
                    title="Verified Drivers"
                    desc="Rigorous vetting process and real-time status monitoring for all fleet personnel."
                    delay={0.3}
                 />
                 <FeatureCard 
                    icon={Globe}
                    title="City-Wide Grid"
                    desc="Interconnected mesh network ensuring no signal loss during critical dispatch operations."
                    descColor="text-slate-400"
                    colSpan={1}
                    delay={0.4}
                 />
             </div>
          </div>
      </section>

      {/* --- PORTALS (Auth) SECTION --- */}
      <section id="roles" className="relative z-10 py-32 px-6 bg-[#030712]">
         <div className="max-w-7xl mx-auto">
             <SectionHeader 
                badge="Access Point"
                title="Choose your Portal"
                subtitle="Secure entry points tailored for every stakeholder in the emergency lifecycle."
             />

             <div className="grid md:grid-cols-3 gap-8">
                <RolePortal 
                    role="HOSPITAL"
                    title="Hospital"
                    desc="Manage fleet dispatch, blood inventory, and incoming patient orders."
                    icon={Building2}
                    color="blue"
                    onClick={() => handleOpenAuth('HOSPITAL')}
                />
                <RolePortal 
                    role="USER"
                    title="Patient"
                    desc="Request emergency assistance, track rides, and source blood supplies."
                    icon={User}
                    color="rose"
                    onClick={() => handleOpenAuth('USER')}
                    delay={0.1}
                />
                <RolePortal 
                    role="DRIVER"
                    title="Driver"
                    desc="Accept dispatch requests, navigate optimized routes, and manage duty."
                    icon={Truck}
                    color="amber"
                    onClick={() => handleOpenAuth('DRIVER')}
                    delay={0.2}
                />
             </div>
         </div>
      </section>

      {/* --- MISSION / FOOTER --- */}
      <footer id="mission" className="relative z-10 py-24 px-6 border-t border-white/5 bg-[#020617]">
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
              <div>
                  <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter text-white mb-6">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <Activity className="text-white" size={20} />
                        </div>
                        LifeLine<span className="text-blue-500">.</span>
                  </div>
                  <p className="text-slate-500 max-w-sm mb-8">
                      Our mission is to reduce emergency response times by 50% using decentralized logistics and real-time data.
                  </p>
                  <div className="flex gap-4">
                      <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white hover:text-black transition-colors"><Globe size={18}/></a>
                      <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white hover:text-black transition-colors"><CheckCircle2 size={18}/></a>
                  </div>
              </div>
              <div className="grid grid-cols-2 gap-8 text-sm text-slate-400">
                  <div className="space-y-4">
                      <h4 className="font-bold text-white">Platform</h4>
                      <a href="#" className="block hover:text-blue-400">Solutions</a>
                      <a href="#" className="block hover:text-blue-400">Integration</a>
                      <a href="#" className="block hover:text-blue-400">Pricing</a>
                  </div>
                  <div className="space-y-4">
                      <h4 className="font-bold text-white">Company</h4>
                      <a href="#" className="block hover:text-blue-400">About Us</a>
                      <a href="#" className="block hover:text-blue-400">Careers</a>
                      <a href="#" className="block hover:text-blue-400">Contact</a>
                  </div>
              </div>
          </div>
          <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 text-center text-slate-600 text-sm">
              © 2024 LifeLine Emergency Network. All rights reserved.
          </div>
      </footer>


      {/* --- AUTH MODALS --- */}
      <AnimatePresence mode="wait">
        {authMode === 'LOGIN' && (
          <SignInModal
            key="signin-modal"
            isOpen={true}
            onClose={handleCloseAuth}
            targetRole={targetRole}
            onSwitchToSignUp={handleSwitchToSignUp}
            onSuccess={handleAuthSuccess}
          />
        )}
        {authMode === 'REGISTER' && (
          <SignUpModal
            key="signup-modal"
            isOpen={true}
            onClose={handleCloseAuth}
            targetRole={targetRole}
            onSwitchToSignIn={handleSwitchToSignIn}
            onSuccess={handleAuthSuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
